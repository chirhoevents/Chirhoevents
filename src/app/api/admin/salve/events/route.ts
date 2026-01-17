import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const user = await requireAdmin()
    const organizationId = await getEffectiveOrgId(user)

    // Get events with SALVE Check-in enabled
    const events = await prisma.event.findMany({
      where: {
        organizationId,
        status: {
          in: ['published', 'registration_open', 'registration_closed', 'in_progress'],
        },
        settings: {
          salveCheckinEnabled: true,
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
