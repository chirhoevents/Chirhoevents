import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: params.eventId },
      include: {
        pricing: true,
        settings: true,
      },
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Check if registration is open
    const now = new Date()
    const registrationOpen = event.registrationOpenDate && now >= new Date(event.registrationOpenDate)
    const registrationClosed = event.registrationCloseDate && now >= new Date(event.registrationCloseDate)

    if (!registrationOpen || registrationClosed) {
      return NextResponse.json(
        { error: 'Registration is not currently open for this event' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      id: event.id,
      name: event.name,
      slug: event.slug,
      description: event.description,
      startDate: event.startDate,
      endDate: event.endDate,
      locationName: event.locationName,
      capacityRemaining: event.capacityRemaining,
      pricing: {
        youthRegularPrice: Number(event.pricing?.youthRegularPrice || 0),
        chaperoneRegularPrice: Number(event.pricing?.chaperoneRegularPrice || 0),
        priestPrice: Number(event.pricing?.priestPrice || 0),
        depositAmount: Number(event.pricing?.depositAmount || 25),
      },
      settings: event.settings,
    })
  } catch (error) {
    console.error('Error fetching event:', error)
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    )
  }
}
