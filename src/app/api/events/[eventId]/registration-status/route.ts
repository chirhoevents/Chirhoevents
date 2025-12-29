import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRegistrationStatus, getSpotsRemainingMessage } from '@/lib/registration-status'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    // Check if eventId is a UUID (id) or a slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId)

    // Fetch event
    const event = await prisma.event.findUnique({
      where: isUuid ? { id: eventId } : { slug: eventId },
      select: {
        id: true,
        name: true,
        slug: true,
        startDate: true,
        endDate: true,
        registrationOpenDate: true,
        registrationCloseDate: true,
        capacityTotal: true,
        capacityRemaining: true,
        enableWaitlist: true,
        settings: {
          select: {
            countdownBeforeOpen: true,
            countdownBeforeClose: true,
            showAvailability: true,
            availabilityThreshold: true,
          },
        },
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Get registration status
    const status = getRegistrationStatus({
      startDate: event.startDate,
      endDate: event.endDate,
      registrationOpenDate: event.registrationOpenDate,
      registrationCloseDate: event.registrationCloseDate,
      capacityTotal: event.capacityTotal,
      capacityRemaining: event.capacityRemaining,
      enableWaitlist: event.enableWaitlist,
      settings: {
        countdownBeforeOpen: event.settings?.countdownBeforeOpen ?? true,
        countdownBeforeClose: event.settings?.countdownBeforeClose ?? true,
      },
    })

    // Get spots message
    const spotsMessage = getSpotsRemainingMessage(
      status.spotsRemaining,
      event.settings?.availabilityThreshold ?? 20
    )

    return NextResponse.json({
      event: {
        id: event.id,
        name: event.name,
        slug: event.slug,
      },
      status: status.status,
      message: status.message,
      showCountdown: status.showCountdown,
      countdownTarget: status.countdownTarget,
      allowRegistration: status.allowRegistration,
      allowWaitlist: status.allowWaitlist,
      spotsRemaining: status.spotsRemaining,
      spotsMessage,
      urgentStyle: status.urgentStyle,
    })
  } catch (error) {
    console.error('Error fetching registration status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
