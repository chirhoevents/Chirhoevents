import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    // Find waitlist entry by token
    const entry = await prisma.waitlistEntry.findFirst({
      where: { registrationToken: token },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            slug: true,
            startDate: true,
            endDate: true,
            locationName: true,
            capacityRemaining: true,
            organization: {
              select: {
                name: true,
              },
            },
            settings: {
              select: {
                groupRegistrationEnabled: true,
                individualRegistrationEnabled: true,
              },
            },
          },
        },
      },
    })

    if (!entry) {
      return NextResponse.json(
        {
          valid: false,
          error: 'Invalid or expired invitation link',
          reason: 'not_found'
        },
        { status: 404 }
      )
    }

    // Check if already registered
    if (entry.status === 'registered') {
      return NextResponse.json(
        {
          valid: false,
          error: 'You have already registered for this event',
          reason: 'already_registered'
        },
        { status: 400 }
      )
    }

    // Check if invitation has expired
    if (entry.invitationExpires && new Date() > entry.invitationExpires) {
      return NextResponse.json(
        {
          valid: false,
          error: 'This invitation has expired',
          reason: 'expired',
          expiredAt: entry.invitationExpires,
        },
        { status: 400 }
      )
    }

    // Check if status is 'contacted' (valid for registration)
    if (entry.status !== 'contacted') {
      return NextResponse.json(
        {
          valid: false,
          error: 'This invitation is no longer valid',
          reason: 'invalid_status',
          status: entry.status,
        },
        { status: 400 }
      )
    }

    // Calculate time remaining
    const timeRemaining = entry.invitationExpires
      ? Math.max(0, entry.invitationExpires.getTime() - Date.now())
      : null

    const hoursRemaining = timeRemaining
      ? Math.floor(timeRemaining / (1000 * 60 * 60))
      : null

    const minutesRemaining = timeRemaining
      ? Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60))
      : null

    // What was asked for vs what's actually being offered. When the admin
    // sends a counter-offer the two differ; the invitee page shows both
    // side-by-side so they know what they're accepting.
    const requested = {
      partySize: entry.partySize,
      youthCount: entry.youthCount,
      chaperoneCount: entry.chaperoneCount,
      priestCount: entry.priestCount,
      housingType: entry.preferredHousingType,
      roomType: entry.preferredRoomType,
      dayPassOptionId: entry.preferredDayPassOptionId,
    }
    const offered = {
      partySize: entry.reservedSpots ?? entry.partySize,
      youthCount: entry.reservedYouthCount ?? entry.youthCount,
      chaperoneCount: entry.reservedChaperoneCount ?? entry.chaperoneCount,
      priestCount: entry.reservedPriestCount ?? entry.priestCount,
      housingType: entry.reservedHousingType ?? entry.preferredHousingType,
      roomType: entry.reservedRoomType ?? entry.preferredRoomType,
      dayPassOptionId: entry.reservedDayPassOptionId ?? entry.preferredDayPassOptionId,
    }
    const isCounterOffer =
      requested.partySize !== offered.partySize ||
      requested.youthCount !== offered.youthCount ||
      requested.chaperoneCount !== offered.chaperoneCount ||
      requested.priestCount !== offered.priestCount ||
      requested.housingType !== offered.housingType ||
      requested.roomType !== offered.roomType ||
      requested.dayPassOptionId !== offered.dayPassOptionId

    return NextResponse.json({
      valid: true,
      isCounterOffer,
      requested,
      offered,
      entry: {
        id: entry.id,
        name: entry.name,
        email: entry.email,
        partySize: offered.partySize,
        registrationType: entry.registrationType,
        invitedAt: entry.notifiedAt,
        expiresAt: entry.invitationExpires,
        timeRemaining: {
          hours: hoursRemaining,
          minutes: minutesRemaining,
        },
      },
      event: {
        id: entry.event.id,
        name: entry.event.name,
        slug: entry.event.slug,
        startDate: entry.event.startDate,
        endDate: entry.event.endDate,
        locationName: entry.event.locationName,
        organizationName: entry.event.organization.name,
        spotsAvailable: entry.event.capacityRemaining,
        groupRegistrationEnabled: entry.event.settings?.groupRegistrationEnabled ?? true,
        individualRegistrationEnabled: entry.event.settings?.individualRegistrationEnabled ?? true,
      },
    })
  } catch (error) {
    console.error('Error validating waitlist token:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Mark waitlist entry as registered after successful registration
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    // Find and update waitlist entry
    const entry = await prisma.waitlistEntry.findFirst({
      where: { registrationToken: token },
    })

    if (!entry) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 404 }
      )
    }

    // Check if already registered
    if (entry.status === 'registered') {
      return NextResponse.json(
        { error: 'Already registered' },
        { status: 400 }
      )
    }

    // Check if expired
    if (entry.invitationExpires && new Date() > entry.invitationExpires) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      )
    }

    // Update status to registered
    const updatedEntry = await prisma.waitlistEntry.update({
      where: { id: entry.id },
      data: {
        status: 'registered',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Waitlist entry marked as registered',
      entry: {
        id: updatedEntry.id,
        status: updatedEntry.status,
      },
    })
  } catch (error) {
    console.error('Error marking waitlist entry as registered:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
