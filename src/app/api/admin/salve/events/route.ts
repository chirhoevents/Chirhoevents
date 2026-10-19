import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const overrideUserId = await getClerkUserIdFromHeader(request)
    const user = await getCurrentUser(overrideUserId)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admins plus SALVE-only staff (SALVE coordinators, check-in users)
    const hasSalveAccess = hasPermission(user.role, 'salve.access') ||
      user.permissions?.['salve.access'] === true ||
      user.permissions?.['portals.salve.view'] === true
    if (!isAdmin(user) && !hasSalveAccess) {
      return NextResponse.json({ error: 'Access denied - SALVE portal access required' }, { status: 403 })
    }

    const organizationId = await getEffectiveOrgId(user)

    // Get events with their settings, then filter for Salve enabled
    const allEvents = await prisma.event.findMany({
      where: {
        organizationId,
        archivedAt: null,
        status: {
          in: ['published', 'registration_open', 'registration_closed', 'in_progress'],
        },
      },
      include: {
        settings: true,
        _count: {
          select: {
            groupRegistrations: { where: { cancelledAt: null } },
            individualRegistrations: { where: { cancelledAt: null } },
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    })

    // Filter for events with SALVE Check-in enabled
    const events = allEvents.filter(event => event.settings?.salveCheckinEnabled === true)

    // Get check-in stats for each event
    type EventRecord = typeof events[number]
    const eventsWithStats = await Promise.all(
      events.map(async (event: EventRecord) => {
        // Get participants count
        const participantCount = await prisma.participant.count({
          where: {
            groupRegistration: {
              eventId: event.id,
            },
          },
        })

        const individualCount = await prisma.individualRegistration.count({
          where: {
            eventId: event.id,
          },
        })

        // Get checked-in counts
        const checkedInParticipants = await prisma.participant.count({
          where: {
            groupRegistration: {
              eventId: event.id,
            },
            checkedIn: true,
          },
        })

        const checkedInIndividuals = await prisma.individualRegistration.count({
          where: {
            eventId: event.id,
            checkedIn: true,
          },
        })

        return {
          id: event.id,
          name: event.name,
          startDate: event.startDate.toISOString(),
          endDate: event.endDate?.toISOString() || null,
          status: event.status,
          locationName: event.locationName,
          salveCheckinEnabled: true,
          stats: {
            totalParticipants: participantCount + individualCount,
            totalRegistrations: event._count.groupRegistrations + event._count.individualRegistrations,
            checkedIn: checkedInParticipants + checkedInIndividuals,
          },
        }
      })
    )

    return NextResponse.json(eventsWithStats)
  } catch (error) {
    console.error('Failed to fetch SALVE events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    )
  }
}
