import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permissions'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const overrideUserId = getClerkUserIdFromHeader(request)
    const user = await getCurrentUser(overrideUserId)
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    const organizationId = await getEffectiveOrgId(user as any)
    const { eventId } = await params
    const { searchParams } = new URL(request.url)

    // Check Rapha access permission
    if (!hasPermission(user.role, 'rapha.access')) {
      return NextResponse.json(
        { message: 'Access denied. Rapha access required.' },
        { status: 403 }
      )
    }

    // Verify event exists and belongs to user's org
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        organizationId: organizationId,
      },
    })

    if (!event) {
      return NextResponse.json(
        { message: 'Event not found' },
        { status: 404 }
      )
    }

    // Parse filters
    const search = searchParams.get('search') || ''
    const filter = searchParams.get('filter') || 'all' // all, allergies, medications, conditions, dietary, ada, severe
    const sortBy = searchParams.get('sortBy') || 'name' // name, age, severity, group

    // Get all participants with their liability form medical info
    const liabilityForms = await prisma.liabilityForm.findMany({
      where: {
        eventId,
        completed: true,
        ...(search
          ? {
              OR: [
                { participantFirstName: { contains: search, mode: 'insensitive' } },
                { participantLastName: { contains: search, mode: 'insensitive' } },
                { allergies: { contains: search, mode: 'insensitive' } },
                { medicalConditions: { contains: search, mode: 'insensitive' } },
                { medications: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
        // Apply filters
        ...(filter === 'allergies' ? { allergies: { not: null }, NOT: { allergies: '' } } : {}),
        ...(filter === 'medications' ? { medications: { not: null }, NOT: { medications: '' } } : {}),
        ...(filter === 'conditions' ? { medicalConditions: { not: null }, NOT: { medicalConditions: '' } } : {}),
        ...(filter === 'dietary' ? { dietaryRestrictions: { not: null }, NOT: { dietaryRestrictions: '' } } : {}),
        ...(filter === 'ada' ? { adaAccommodations: { not: null }, NOT: { adaAccommodations: '' } } : {}),
        ...(filter === 'severe' ? { allergies: { contains: 'epi', mode: 'insensitive' } } : {}),
        ...(filter === 'medical'
          ? {
              OR: [
                { allergies: { not: null }, NOT: { allergies: '' } },
                { medicalConditions: { not: null }, NOT: { medicalConditions: '' } },
                { medications: { not: null }, NOT: { medications: '' } },
              ],
            }
          : {}),
      },
      include: {
        groupRegistration: {
          select: {
            id: true,
            groupName: true,
            parishName: true,
          },
        },
        participant: {
          select: {
            id: true,
            checkedIn: true,
          },
        },
      },
      orderBy:
        sortBy === 'name'
          ? [{ participantLastName: 'asc' }, { participantFirstName: 'asc' }]
          : sortBy === 'age'
            ? [{ participantAge: 'asc' }]
            : [{ participantLastName: 'asc' }],
    })

    // Get room assignments for participants
    const participantIds = liabilityForms
      .map((f: any) => f.participantId)
      .filter((id: any): id is string => id !== null)

    const roomAssignments = await prisma.roomAssignment.findMany({
      where: {
        participantId: { in: participantIds },
      },
      include: {
        room: {
          include: {
            building: {
              select: { name: true },
            },
          },
        },
      },
    })

    const roomMap = new Map(
      roomAssignments.map((ra: any) => [
        ra.participantId,
        `${ra.room.building.name} ${ra.room.roomNumber}`,
      ])
    )

    // Get incident counts for participants
    const incidentCounts = await prisma.medicalIncident.groupBy({
      by: ['participantId'],
      where: {
        eventId,
        participantId: { in: participantIds },
      },
      _count: { id: true },
    })

    const incidentMap = new Map(
      incidentCounts.map((ic: any) => [ic.participantId, ic._count.id])
    )

    // Transform and calculate severity
    const participants = liabilityForms.map((form: any) => {
      const hasSevereAllergy =
        form.allergies?.toLowerCase().includes('epi') ||
        form.allergies?.toLowerCase().includes('severe') ||
        form.allergies?.toLowerCase().includes('anaphyl')

      const hasAllergies = form.allergies && form.allergies.trim() !== ''
      const hasMedications = form.medications && form.medications.trim() !== ''
      const hasConditions = form.medicalConditions && form.medicalConditions.trim() !== ''
      const hasDietary = form.dietaryRestrictions && form.dietaryRestrictions.trim() !== ''
      const hasAda = form.adaAccommodations && form.adaAccommodations.trim() !== ''

      let alertLevel: 'none' | 'low' | 'medium' | 'high' = 'none'
      if (hasSevereAllergy) {
        alertLevel = 'high'
      } else if (hasAllergies || hasConditions) {
        alertLevel = 'medium'
      } else if (hasMedications || hasDietary || hasAda) {
        alertLevel = 'low'
      }

      return {
        id: form.id,
        participantId: form.participantId,
        firstName: form.participantFirstName,
        lastName: form.participantLastName,
        preferredName: form.participantPreferredName,
        age: form.participantAge,
        gender: form.participantGender,
        email: form.participantEmail,
        phone: form.participantPhone,
        participantType: form.participantType,
        checkedIn: form.participant?.checkedIn || false,
        groupId: form.groupRegistrationId,
        groupName: form.groupRegistration?.groupName || 'Individual',
        parishName: form.groupRegistration?.parishName,
        roomAssignment: form.participantId ? roomMap.get(form.participantId) : null,
        incidentCount: form.participantId ? incidentMap.get(form.participantId) || 0 : 0,
        alertLevel,
        medical: {
          allergies: form.allergies,
          hasSevereAllergy,
          medicalConditions: form.medicalConditions,
          medications: form.medications,
          dietaryRestrictions: form.dietaryRestrictions,
          adaAccommodations: form.adaAccommodations,
        },
        emergency: {
          contact1Name: form.emergencyContact1Name,
          contact1Phone: form.emergencyContact1Phone,
          contact1Relation: form.emergencyContact1Relation,
          contact2Name: form.emergencyContact2Name,
          contact2Phone: form.emergencyContact2Phone,
          contact2Relation: form.emergencyContact2Relation,
        },
        insurance: {
          provider: form.insuranceProvider,
          policyNumber: form.insurancePolicyNumber,
          groupNumber: form.insuranceGroupNumber,
        },
        parentEmail: form.parentEmail,
        formCompletedAt: form.completedAt,
      }
    })

    // Sort by severity if requested
    if (sortBy === 'severity') {
      const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2, none: 3 }
      participants.sort((a: any, b: any) => severityOrder[a.alertLevel] - severityOrder[b.alertLevel])
    }

    // Log access for HIPAA compliance
    await prisma.medicalAccessLog.create({
      data: {
        eventId,
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        action: 'view_participants_list',
        resourceType: 'participants',
        details: `Viewed ${participants.length} participants with filter: ${filter}`,
      },
    })

    return NextResponse.json({
      participants,
      totalCount: participants.length,
      filters: {
        search,
        filter,
        sortBy,
      },
    })
  } catch (error) {
    console.error('Failed to get Rapha participants:', error)
    return NextResponse.json(
      { message: 'Failed to get participants' },
      { status: 500 }
    )
  }
}
