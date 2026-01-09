import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permissions'
import { verifyEventAccess } from '@/lib/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    // Verify user has access to this event (with organization check)
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[Rapha Stats]',
    })

    if (error) {
      return error
    }

    // Check Rapha access permission
    if (!hasPermission(user!.role, 'rapha.access')) {
      console.log('[Rapha Stats] ❌ User lacks rapha.access permission')
      return NextResponse.json(
        { message: 'Access denied. Rapha access required.' },
        { status: 403 }
      )
    }

    console.log('[Rapha Stats] ✅ Access verified, fetching stats...')

    // Fetch full event with settings
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { settings: true },
    })

    // Get participant counts with medical info from liability forms
    const [
      totalParticipants,
      participantsWithAllergies,
      participantsWithMedications,
      participantsWithConditions,
      participantsWithDietary,
      participantsWithAda,
      severeAllergies,
      activeIncidents,
      monitoringIncidents,
      resolvedTodayIncidents,
      totalIncidents,
    ] = await Promise.all([
      // Total participants
      prisma.participant.count({
        where: {
          groupRegistration: { eventId },
        },
      }),
      // Participants with allergies
      prisma.liabilityForm.count({
        where: {
          eventId,
          completed: true,
          allergies: { not: null },
          NOT: { allergies: '' },
        },
      }),
      // Participants with medications
      prisma.liabilityForm.count({
        where: {
          eventId,
          completed: true,
          medications: { not: null },
          NOT: { medications: '' },
        },
      }),
      // Participants with medical conditions
      prisma.liabilityForm.count({
        where: {
          eventId,
          completed: true,
          medicalConditions: { not: null },
          NOT: { medicalConditions: '' },
        },
      }),
      // Participants with dietary restrictions
      prisma.liabilityForm.count({
        where: {
          eventId,
          completed: true,
          dietaryRestrictions: { not: null },
          NOT: { dietaryRestrictions: '' },
        },
      }),
      // Participants with ADA accommodations
      prisma.liabilityForm.count({
        where: {
          eventId,
          completed: true,
          adaAccommodations: { not: null },
          NOT: { adaAccommodations: '' },
        },
      }),
      // Severe allergies (containing EpiPen or epipen or severe)
      prisma.liabilityForm.count({
        where: {
          eventId,
          completed: true,
          allergies: {
            contains: 'epi',
            mode: 'insensitive',
          },
        },
      }),
      // Active incidents
      prisma.medicalIncident.count({
        where: {
          eventId,
          status: 'active',
        },
      }),
      // Monitoring incidents
      prisma.medicalIncident.count({
        where: {
          eventId,
          status: 'monitoring',
        },
      }),
      // Resolved today
      prisma.medicalIncident.count({
        where: {
          eventId,
          status: 'resolved',
          resolvedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      // Total incidents
      prisma.medicalIncident.count({
        where: {
          eventId,
        },
      }),
    ])

    // Get upcoming follow-ups
    const upcomingFollowUps = await prisma.medicalIncident.findMany({
      where: {
        eventId,
        followUpRequired: true,
        status: { not: 'resolved' },
        nextCheckTime: { not: null },
      },
      orderBy: {
        nextCheckTime: 'asc',
      },
      take: 5,
      select: {
        id: true,
        participantId: true,
        nextCheckTime: true,
        incidentType: true,
        severity: true,
      },
    })

    // Get participant names for follow-ups
    const participantIds = upcomingFollowUps
      .map((f: any) => f.participantId)
      .filter((id: any): id is string => id !== null)

    const participants = await prisma.participant.findMany({
      where: { id: { in: participantIds } },
      select: { id: true, firstName: true, lastName: true },
    })

    const participantMap = new Map<string, { id: string; firstName: string; lastName: string }>(participants.map((p: any) => [p.id, p]))

    const followUpsWithNames = upcomingFollowUps.map((f: any) => ({
      ...f,
      participantName: f.participantId
        ? `${participantMap.get(f.participantId)?.firstName || ''} ${participantMap.get(f.participantId)?.lastName || ''}`.trim()
        : 'Unknown',
    }))

    return NextResponse.json({
      event: event ? {
        id: event.id,
        name: event.name,
        startDate: event.startDate,
        endDate: event.endDate,
      } : null,
      stats: {
        totalParticipants,
        participantsWithMedicalNeeds:
          participantsWithAllergies +
          participantsWithMedications +
          participantsWithConditions,
        severeAllergies,
        allergies: participantsWithAllergies,
        medications: participantsWithMedications,
        conditions: participantsWithConditions,
        dietaryRestrictions: participantsWithDietary,
        adaAccommodations: participantsWithAda,
        activeIncidents,
        monitoringIncidents,
        resolvedTodayIncidents,
        totalIncidents,
      },
      upcomingFollowUps: followUpsWithNames,
    })
  } catch (error) {
    console.error('Failed to get Rapha stats:', error)
    return NextResponse.json(
      { message: 'Failed to get medical statistics' },
      { status: 500 }
    )
  }
}
