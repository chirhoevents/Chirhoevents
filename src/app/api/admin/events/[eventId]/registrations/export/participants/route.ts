import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// GET /api/admin/events/[eventId]/registrations/export/participants
// Export participants in a format compatible with re-importing
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[Participants Export]',
    })
    if (error) return error

    // Require poros or reports access
    if (!hasPermission(user!.role, 'poros.access') && !hasPermission(user!.role, 'reports.view')) {
      return NextResponse.json(
        { message: 'Forbidden - Poros or Reports access required' },
        { status: 403 }
      )
    }

    // Get all participants with their group and liability form info
    const participants = await prisma.participant.findMany({
      where: {
        groupRegistration: { eventId },
      },
      include: {
        groupRegistration: {
          select: {
            groupName: true,
            parishName: true,
          },
        },
        liabilityForms: {
          where: { completed: true },
          orderBy: { completedAt: 'desc' },
          take: 1,
          select: {
            participantAge: true,
            allergies: true,
            medications: true,
            medicalConditions: true,
            dietaryRestrictions: true,
            adaAccommodations: true,
            emergencyContact1Name: true,
            emergencyContact1Phone: true,
            emergencyContact1Relation: true,
            emergencyContact2Name: true,
            emergencyContact2Phone: true,
            emergencyContact2Relation: true,
          },
        },
      },
      orderBy: [
        { groupRegistration: { groupName: 'asc' } },
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    })

    // Build CSV header - matches import template format
    const headers = [
      'group_id',
      'first_name',
      'last_name',
      'preferred_name',
      'age',
      'gender',
      'participant_type',
      'email',
      'parent_email',
      't_shirt_size',
      'emergency_contact_1_name',
      'emergency_contact_1_phone',
      'emergency_contact_1_relation',
      'emergency_contact_2_name',
      'emergency_contact_2_phone',
      'emergency_contact_2_relation',
      'allergies',
      'medications',
      'medical_conditions',
      'dietary_restrictions',
      'ada_requirements',
      // Extra columns for reference (not used in import)
      'group_name',
      'parish_name',
    ]

    const csvRows: string[] = [headers.join(',')]

    for (const p of participants) {
      // Extract group_id from groupName like "Parish Name [123]"
      const groupIdMatch = p.groupRegistration.groupName.match(/\[([^\]]+)\]$/)
      const groupId = groupIdMatch ? groupIdMatch[1] : ''

      // Get liability form data if available
      const form = p.liabilityForms[0]

      // Use age from participant record, or from liability form as fallback
      const age = p.age || form?.participantAge || 0

      const row = [
        escapeCSV(groupId),
        escapeCSV(p.firstName),
        escapeCSV(p.lastName),
        escapeCSV(p.preferredName),
        age,
        escapeCSV(p.gender),
        escapeCSV(p.participantType),
        escapeCSV(p.email),
        escapeCSV(p.parentEmail),
        escapeCSV(p.tShirtSize),
        escapeCSV(form?.emergencyContact1Name),
        escapeCSV(form?.emergencyContact1Phone),
        escapeCSV(form?.emergencyContact1Relation),
        escapeCSV(form?.emergencyContact2Name),
        escapeCSV(form?.emergencyContact2Phone),
        escapeCSV(form?.emergencyContact2Relation),
        escapeCSV(form?.allergies),
        escapeCSV(form?.medications),
        escapeCSV(form?.medicalConditions),
        escapeCSV(form?.dietaryRestrictions),
        escapeCSV(form?.adaAccommodations),
        escapeCSV(p.groupRegistration.groupName),
        escapeCSV(p.groupRegistration.parishName),
      ]

      csvRows.push(row.join(','))
    }

    const csvContent = csvRows.join('\n')
    const safeName = event!.name.replace(/[^a-zA-Z0-9]/g, '-')

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="participants-${safeName}.csv"`,
      },
    })
  } catch (error) {
    console.error('Participant export error:', error)
    return NextResponse.json(
      { error: 'Export failed. Please try again.' },
      { status: 500 }
    )
  }
}
