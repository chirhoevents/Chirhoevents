import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    // Check if eventId is a UUID or a slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId)

    const event = await prisma.event.findUnique({
      where: isUuid ? { id: eventId } : { slug: eventId },
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

    // Fetch depositPerPerson directly via raw query (Prisma client may not have this field)
    const depositPerPersonResult = await prisma.$queryRaw<Array<{ deposit_per_person: boolean | null }>>`
      SELECT deposit_per_person FROM event_pricing WHERE event_id = ${event.id}::uuid LIMIT 1
    `
    const depositPerPerson = depositPerPersonResult[0]?.deposit_per_person ?? true

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
        youthEarlyBirdPrice: event.pricing?.youthEarlyBirdPrice ? Number(event.pricing.youthEarlyBirdPrice) : null,
        chaperoneRegularPrice: Number(event.pricing?.chaperoneRegularPrice || 0),
        chaperoneEarlyBirdPrice: event.pricing?.chaperoneEarlyBirdPrice ? Number(event.pricing.chaperoneEarlyBirdPrice) : null,
        priestPrice: Number(event.pricing?.priestPrice || 0),
        earlyBirdDeadline: event.pricing?.earlyBirdDeadline || null,
        depositAmount: event.pricing?.depositAmount ? Number(event.pricing.depositAmount) : null,
        depositPercentage: event.pricing?.depositPercentage ? Number(event.pricing.depositPercentage) : null,
        depositPerPerson: depositPerPerson,
        requireFullPayment: event.pricing?.requireFullPayment || false,
        onCampusYouthPrice: event.pricing?.onCampusYouthPrice ? Number(event.pricing.onCampusYouthPrice) : undefined,
        offCampusYouthPrice: event.pricing?.offCampusYouthPrice ? Number(event.pricing.offCampusYouthPrice) : undefined,
        dayPassYouthPrice: event.pricing?.dayPassYouthPrice ? Number(event.pricing.dayPassYouthPrice) : undefined,
        onCampusChaperonePrice: event.pricing?.onCampusChaperonePrice ? Number(event.pricing.onCampusChaperonePrice) : undefined,
        offCampusChaperonePrice: event.pricing?.offCampusChaperonePrice ? Number(event.pricing.offCampusChaperonePrice) : undefined,
        dayPassChaperonePrice: event.pricing?.dayPassChaperonePrice ? Number(event.pricing.dayPassChaperonePrice) : undefined,
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
