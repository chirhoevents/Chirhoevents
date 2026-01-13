import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { generateWaitlistConfirmationEmail } from '@/lib/email-templates'

const resend = new Resend(process.env.RESEND_API_KEY!)

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

    // Check if eventId is a UUID or a slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId)

    // Check if event exists and has waitlist enabled
    const event = await prisma.event.findUnique({
      where: isUuid ? { id: eventId } : { slug: eventId },
      select: {
        id: true,
        name: true,
        slug: true,
        enableWaitlist: true,
        capacityTotal: true,
        capacityRemaining: true,
        organization: {
          select: {
            name: true,
          },
        },
        settings: {
          select: {
            waitlistEnabled: true,
          },
        },
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check if waitlist is enabled (settings takes precedence over event field)
    const waitlistEnabled = event.settings?.waitlistEnabled ?? event.enableWaitlist
    if (!waitlistEnabled) {
      return NextResponse.json(
        { error: 'Waitlist is not enabled for this event' },
        { status: 400 }
      )
    }

    // Check if user is already on waitlist for this event
    const existingEntry = await prisma.waitlistEntry.findFirst({
      where: {
        eventId: event.id,
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

    // Calculate position (count of pending entries before this one + 1)
    const pendingCount = await prisma.waitlistEntry.count({
      where: {
        eventId: event.id,
        status: 'pending',
      },
    })
    const position = pendingCount + 1

    // Create waitlist entry
    const waitlistEntry = await prisma.waitlistEntry.create({
      data: {
        eventId: event.id,
        name,
        email: email.toLowerCase(),
        phone: phone || null,
        partySize: parseInt(partySize),
        notes: notes || null,
        status: 'pending',
      },
    })

    // Send confirmation email
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'
    const eventUrl = `${APP_URL}/events/${event.slug}`

    try {
      const emailHtml = generateWaitlistConfirmationEmail({
        name,
        eventName: event.name,
        position,
        partySize: parseInt(partySize),
        organizationName: event.organization.name,
        eventUrl,
      })

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'hello@chirhoevents.com',
        to: email.toLowerCase(),
        subject: `You're on the Waitlist - ${event.name}`,
        html: emailHtml,
      })

      console.log(`[Waitlist] Confirmation email sent to ${email} for event ${event.name}`)
    } catch (emailError) {
      // Log but don't fail the request if email fails
      console.error('Error sending waitlist confirmation email:', emailError)
    }

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
          position,
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
