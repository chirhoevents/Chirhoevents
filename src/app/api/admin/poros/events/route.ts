import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const user = await requireAdmin()
    const organizationId = await getEffectiveOrgId(user)

    // Get events with their settings, then filter for Poros enabled
    const allEvents = await prisma.event.findMany({
      where: {
        organizationId,
        status: {
          in: ['published', 'registration_open', 'registration_closed', 'in_progress'],
        },
      },
      include: {
        settings: true,
        _count: {
          select: {
            groupRegistrations: true,
            individualRegistrations: true,
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    })

    // Show events where Poros is enabled (master toggle), falling back to any poros
    // feature being on for backwards-compatibility with events created before the
    // master toggle existed
    const events = allEvents.filter(event =>
      event.settings?.porosEnabled ||
      event.settings?.porosHousingEnabled ||
      event.settings?.porosPublicPortalEnabled ||
      event.settings?.porosSeatingEnabled ||
      event.settings?.porosSmallGroupEnabled
    )

    // Get housing stats for each event
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

        // Get room assignment counts
        const roomAssignments = await prisma.roomAssignment.count({
          where: {
            room: {
              building: {
                eventId: event.id,
              },
            },
          },
        })

        // Get building count for this event
        const buildingCount = await prisma.building.count({
          where: {
            eventId: event.id,
          },
        })

        return {
          id: event.id,
          name: event.name,
          startDate: event.startDate.toISOString(),
          endDate: event.endDate?.toISOString() || null,
          status: event.status,
          locationName: event.locationName,
          porosHousingEnabled: event.settings?.porosHousingEnabled ?? false,
          stats: {
            totalParticipants: participantCount + individualCount,
            totalRegistrations: event._count.groupRegistrations + event._count.individualRegistrations,
            roomAssignments,
            buildingCount,
          },
        }
      })
    )

    return NextResponse.json(eventsWithStats)
  } catch (error) {
    console.error('Failed to fetch Poros events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    )
  }
}
