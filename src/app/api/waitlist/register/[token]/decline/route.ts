import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { releaseWaitlistOptionReservation } from '@/lib/waitlist-utils'
import type { HousingType, RoomType } from '@/lib/option-capacity'

/**
 * Invitee declines the offer. Releases the reservation, flips the entry back
 * to 'pending', and clears the token so the invite can't be reused. The next
 * time the admin looks at the waitlist page, the sweep will show it as
 * pending; no separate notification pipeline yet — the status change is
 * the record.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const entry = await prisma.waitlistEntry.findFirst({
      where: { registrationToken: token },
      select: {
        id: true,
        eventId: true,
        status: true,
        reservedSpots: true,
        reservedHousingType: true,
        reservedRoomType: true,
        reservedDayPassOptionId: true,
      },
    })

    if (!entry) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
    }

    if (entry.status === 'registered') {
      return NextResponse.json(
        { error: 'You already registered — the offer can no longer be declined.' },
        { status: 400 }
      )
    }

    if (entry.status !== 'contacted') {
      // Already reverted / expired — nothing to release, treat as success.
      return NextResponse.json({ success: true, alreadyReleased: true })
    }

    // Release the reservation back to the pools if there was one.
    const reservedSpots = entry.reservedSpots ?? 0
    if (reservedSpots > 0) {
      await prisma.$executeRaw`
        UPDATE events
        SET capacity_remaining = capacity_remaining + ${reservedSpots}
        WHERE id = ${entry.eventId}::uuid
      `
      await releaseWaitlistOptionReservation({
        eventId: entry.eventId,
        reservedSpots,
        reservedHousingType: (entry.reservedHousingType as HousingType | null) ?? null,
        reservedRoomType: (entry.reservedRoomType as RoomType | null) ?? null,
        reservedDayPassOptionId: entry.reservedDayPassOptionId,
      })
    }

    // Flip back to pending, clear reservation + token + expiry so a
    // re-invite starts fresh and the same URL can't be reused.
    await prisma.waitlistEntry.update({
      where: { id: entry.id },
      data: {
        status: 'pending',
        registrationToken: null,
        invitationExpires: null,
        notifiedAt: null,
        reservedSpots: null,
        reservedHousingType: null,
        reservedRoomType: null,
        reservedDayPassOptionId: null,
        reservedYouthCount: null,
        reservedChaperoneCount: null,
        reservedPriestCount: null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Error declining waitlist offer:', message, error)
    return NextResponse.json(
      { error: `Internal server error: ${message}` },
      { status: 500 }
    )
  }
}
