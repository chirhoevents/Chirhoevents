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

    const {
      name,
      email,
      phone,
      partySize,
      notes,
      registrationType,         // 'group' or 'individual'
      preferredHousingType,     // 'on_campus', 'off_campus' (for general admission)
      preferredRoomType,        // 'single', 'double', 'triple', 'quad' (for individual)
      preferredTicketType,      // 'general_admission', 'day_pass'
      preferredDayPassOptionId, // UUID of specific day pass option
    } = body

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
            onCampusCapacity: true,
            onCampusRemaining: true,
            offCampusCapacity: true,
            offCampusRemaining: true,
            dayPassCapacity: true,
            dayPassRemaining: true,
            singleRoomCapacity: true,
            singleRoomRemaining: true,
            doubleRoomCapacity: true,
            doubleRoomRemaining: true,
            tripleRoomCapacity: true,
            tripleRoomRemaining: true,
            quadRoomCapacity: true,
            quadRoomRemaining: true,
          },
        },
        dayPassOptions: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            capacity: true,
            remaining: true,
          },
        },
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

    // Check capacity and generate warnings (but still allow joining)
    const warnings: string[] = []
    const requestedPartySize = parseInt(partySize)

    // Check overall event capacity
    if (event.capacityTotal !== null && requestedPartySize > event.capacityTotal) {
      warnings.push(`Your party size (${requestedPartySize}) exceeds the total event capacity (${event.capacityTotal}). You may need to reduce your group size.`)
    } else if (event.capacityRemaining !== null && requestedPartySize > event.capacityRemaining) {
      warnings.push(`Only ${event.capacityRemaining} spot${event.capacityRemaining === 1 ? '' : 's'} remaining for this event. Your party of ${requestedPartySize} may need to wait for cancellations.`)
    }

    // Check housing type capacity if preference specified
    if (preferredHousingType && event.settings) {
      let optionCapacity: number | null = null
      let optionRemaining: number | null = null
      let optionLabel = ''

      if (preferredHousingType === 'on_campus') {
        optionCapacity = event.settings.onCampusCapacity
        optionRemaining = event.settings.onCampusRemaining
        optionLabel = 'on-campus housing'
      } else if (preferredHousingType === 'off_campus') {
        optionCapacity = event.settings.offCampusCapacity
        optionRemaining = event.settings.offCampusRemaining
        optionLabel = 'off-campus housing'
      } else if (preferredHousingType === 'day_pass') {
        optionCapacity = event.settings.dayPassCapacity
        optionRemaining = event.settings.dayPassRemaining
        optionLabel = 'day pass'
      }

      if (optionCapacity !== null && requestedPartySize > optionCapacity) {
        warnings.push(`Your party size (${requestedPartySize}) exceeds the total ${optionLabel} capacity (${optionCapacity}). You may need to select a different housing option or split your group.`)
      } else if (optionRemaining !== null && requestedPartySize > optionRemaining) {
        warnings.push(`Only ${optionRemaining} ${optionLabel} spot${optionRemaining === 1 ? '' : 's'} remaining. Your party of ${requestedPartySize} may need to consider alternative housing options.`)
      }
    }

    // Check room type capacity if preference specified (for individual registration)
    if (preferredRoomType && event.settings) {
      let roomCapacity: number | null = null
      let roomRemaining: number | null = null
      let roomLabel = ''

      if (preferredRoomType === 'single') {
        roomCapacity = event.settings.singleRoomCapacity
        roomRemaining = event.settings.singleRoomRemaining
        roomLabel = 'single room'
      } else if (preferredRoomType === 'double') {
        roomCapacity = event.settings.doubleRoomCapacity
        roomRemaining = event.settings.doubleRoomRemaining
        roomLabel = 'double room'
      } else if (preferredRoomType === 'triple') {
        roomCapacity = event.settings.tripleRoomCapacity
        roomRemaining = event.settings.tripleRoomRemaining
        roomLabel = 'triple room'
      } else if (preferredRoomType === 'quad') {
        roomCapacity = event.settings.quadRoomCapacity
        roomRemaining = event.settings.quadRoomRemaining
        roomLabel = 'quad room'
      }

      if (roomCapacity !== null && requestedPartySize > roomCapacity) {
        warnings.push(`Your party size (${requestedPartySize}) exceeds the total ${roomLabel} capacity (${roomCapacity}). You may need to select a different room type.`)
      } else if (roomRemaining !== null && requestedPartySize > roomRemaining) {
        warnings.push(`Only ${roomRemaining} ${roomLabel} spot${roomRemaining === 1 ? '' : 's'} remaining. You may need to consider alternative room types.`)
      }
    }

    // Check day pass option capacity if preference specified
    if (preferredTicketType === 'day_pass' && preferredDayPassOptionId && event.dayPassOptions) {
      const selectedOption = event.dayPassOptions.find((opt: { id: string }) => opt.id === preferredDayPassOptionId)
      if (selectedOption) {
        // capacity === 0 means unlimited
        if (selectedOption.capacity > 0) {
          if (requestedPartySize > selectedOption.capacity) {
            warnings.push(`Your party size (${requestedPartySize}) exceeds the total capacity for ${selectedOption.name} (${selectedOption.capacity}). You may need to select a different day pass option.`)
          } else if (requestedPartySize > selectedOption.remaining) {
            warnings.push(`Only ${selectedOption.remaining} spot${selectedOption.remaining === 1 ? '' : 's'} remaining for ${selectedOption.name}. Your party of ${requestedPartySize} may need to consider other day pass options.`)
          }
        }
      }
    }

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
        registrationType: registrationType || null,
        preferredHousingType: preferredHousingType || null,
        preferredRoomType: preferredRoomType || null,
        preferredTicketType: preferredTicketType || null,
        preferredDayPassOptionId: preferredDayPassOptionId || null,
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
        message: warnings.length > 0
          ? 'Successfully joined waitlist (with capacity warnings)'
          : 'Successfully joined waitlist',
        warnings: warnings.length > 0 ? warnings : undefined,
        entry: {
          id: waitlistEntry.id,
          name: waitlistEntry.name,
          email: waitlistEntry.email,
          partySize: waitlistEntry.partySize,
          status: waitlistEntry.status,
          position,
          registrationType: waitlistEntry.registrationType,
          preferredHousingType: waitlistEntry.preferredHousingType,
          preferredRoomType: waitlistEntry.preferredRoomType,
          preferredTicketType: waitlistEntry.preferredTicketType,
          preferredDayPassOptionId: waitlistEntry.preferredDayPassOptionId,
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
