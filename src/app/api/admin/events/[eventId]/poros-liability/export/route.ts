import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

function escapeCSV(value: string | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const { eventId } = await Promise.resolve(params)
    const { searchParams } = new URL(request.url)
    const exportType = searchParams.get('type') || 'all'

    // Verify event belongs to user's organization
    const event = await prisma.event.findUnique({
      where: {
        id: eventId,
        organizationId: user.organizationId,
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (exportType === 'medical') {
      // Export medical information for Rapha
      const forms = await prisma.liabilityForm.findMany({
        where: {
          eventId,
          completed: true,
          formStatus: 'approved',
        },
        include: {
          groupRegistration: {
            select: {
              groupName: true,
              parishName: true,
            },
          },
        },
        orderBy: [
          { groupRegistration: { groupName: 'asc' } },
          { participantLastName: 'asc' },
        ],
      })

      // Build CSV
      let csv =
        'Group,Parish,First Name,Last Name,Age,Gender,Allergies,Medications,Medical Conditions,Dietary Restrictions,Emergency Contact,Emergency Phone\n'

      for (const f of forms) {
        csv += `${escapeCSV(f.groupRegistration?.groupName)},${escapeCSV(f.groupRegistration?.parishName)},${escapeCSV(f.participantFirstName)},${escapeCSV(f.participantLastName)},${f.participantAge || ''},${escapeCSV(f.participantGender)},${escapeCSV(f.allergies)},${escapeCSV(f.medications)},${escapeCSV(f.medicalConditions)},${escapeCSV(f.dietaryRestrictions)},${escapeCSV(f.emergencyContact1Name)},${escapeCSV(f.emergencyContact1Phone)}\n`
      }

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="medical-info-${eventId}.csv"`,
        },
      })
    } else if (exportType === 'certificates') {
      // Export Safe Environment certificates - filter through participant's group registration
      const certs = await prisma.safeEnvironmentCertificate.findMany({
        where: {
          organizationId: user.organizationId,
          participant: {
            groupRegistration: {
              eventId,
            },
          },
        },
        include: {
          participant: {
            select: {
              firstName: true,
              lastName: true,
              groupRegistration: {
                select: {
                  groupName: true,
                  parishName: true,
                },
              },
            },
          },
          verifiedBy: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { uploadedAt: 'desc' },
      })

      let csv =
        'Holder Name,Group,Parish,Program Name,Completion Date,Expiration Date,Status,Verified By,Verified Date\n'

      for (const c of certs) {
        const holderName = c.participant
          ? `${c.participant.firstName} ${c.participant.lastName}`
          : 'Unknown'
        const groupName = c.participant?.groupRegistration?.groupName || ''
        const parishName = c.participant?.groupRegistration?.parishName || ''
        csv += `${escapeCSV(holderName)},${escapeCSV(groupName)},${escapeCSV(parishName)},${escapeCSV(c.programName)},${c.completionDate ? c.completionDate.toISOString().split('T')[0] : ''},${c.expirationDate ? c.expirationDate.toISOString().split('T')[0] : ''},${escapeCSV(c.status)},${c.verifiedBy ? `${c.verifiedBy.firstName} ${c.verifiedBy.lastName}` : ''},${c.verifiedAt ? c.verifiedAt.toISOString().split('T')[0] : ''}\n`
      }

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="safe-env-certs-${eventId}.csv"`,
        },
      })
    } else {
      // Export ALL data
      const forms = await prisma.liabilityForm.findMany({
        where: {
          eventId,
          completed: true,
        },
        include: {
          groupRegistration: {
            select: {
              groupName: true,
              parishName: true,
              accessCode: true,
            },
          },
          approvedBy: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: [
          { groupRegistration: { groupName: 'asc' } },
          { participantLastName: 'asc' },
        ],
      })

      let csv =
        'Group,Parish,Access Code,First Name,Last Name,Age,Gender,DOB,Email,Phone,Allergies,Medications,Medical Conditions,Dietary Restrictions,Emergency Contact,Emergency Phone,Shirt Size,Form Status,Approved By,Approved Date,Submitted Date\n'

      for (const f of forms) {
        csv += `${escapeCSV(f.groupRegistration?.groupName)},${escapeCSV(f.groupRegistration?.parishName)},${escapeCSV(f.groupRegistration?.accessCode)},${escapeCSV(f.participantFirstName)},${escapeCSV(f.participantLastName)},${f.participantAge || ''},${escapeCSV(f.participantGender)},,${escapeCSV(f.participantEmail)},${escapeCSV(f.participantPhone)},${escapeCSV(f.allergies)},${escapeCSV(f.medications)},${escapeCSV(f.medicalConditions)},${escapeCSV(f.dietaryRestrictions)},${escapeCSV(f.emergencyContact1Name)},${escapeCSV(f.emergencyContact1Phone)},${escapeCSV(f.tShirtSize)},${escapeCSV(f.formStatus)},${f.approvedBy ? `${f.approvedBy.firstName} ${f.approvedBy.lastName}` : ''},${f.approvedAt ? f.approvedAt.toISOString().split('T')[0] : ''},${f.completedAt ? f.completedAt.toISOString().split('T')[0] : ''}\n`
      }

      const safeName = event.name.replace(/[^a-zA-Z0-9]/g, '-')
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="liability-forms-${safeName}.csv"`,
        },
      })
    }
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
