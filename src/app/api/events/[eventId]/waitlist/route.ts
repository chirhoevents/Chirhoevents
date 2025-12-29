import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const body = await request.json()

    const { name, email, phone, partySize, notes } = body

    // Validate required fields
    if (!name || !email || !partySize) {
      return NextResponse.json(
        { error: 'Name, email, and party size are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Validate party size
    if (partySize < 1 || partySize > 100) {
      return NextResponse.json(
        { error: 'Party size must be between 1 and 100' },
        { status: 400 }
      )
    }

    // Check if event exists and has waitlist enabled
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        enableWaitlist: true,
        capacityTotal: true,
        capacityRemaining: true,
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (!event.enableWaitlist) {
      return NextResponse.json(
        { error: 'Waitlist is not enabled for this event' },
        { status: 400 }
      )
    }

    // Check if user is already on waitlist for this event
    const existingEntry = await prisma.waitlistEntry.findFirst({
      where: {
        eventId,
        email: email.toLowerCase(),
        status: {
          in: ['pending', 'contacted'],
        },
      },
    })

    if (existingEntry) {
      return NextResponse.json(
        { error: 'You are already on the waitlist for this event' },
        { status: 409 }
      )
    }

    // Create waitlist entry
    const waitlistEntry = await prisma.waitlistEntry.create({
      data: {
        eventId,
        name,
        email: email.toLowerCase(),
        phone: phone || null,
        partySize: parseInt(partySize),
        notes: notes || null,
        status: 'pending',
      },
    })

    // TODO: Send confirmation email to user

    return NextResponse.json(
      {
        success: true,
        message: 'Successfully joined waitlist',
        entry: {
          id: waitlistEntry.id,
          name: waitlistEntry.name,
          email: waitlistEntry.email,
          partySize: waitlistEntry.partySize,
          status: waitlistEntry.status,
          createdAt: waitlistEntry.createdAt,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating waitlist entry:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
