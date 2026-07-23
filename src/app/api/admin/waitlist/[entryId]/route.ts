import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin, canAccessOrganization } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'
import { releaseWaitlistOptionReservation } from '@/lib/waitlist-utils'
import type { HousingType, RoomType } from '@/lib/option-capacity'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    // Try to get userId from JWT token in Authorization header
    const overrideUserId = getClerkUserIdFromHeader(request)
    // Check admin access
    const user = await getCurrentUser(overrideUserId)
    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const { entryId } = await params

    // Fetch waitlist entry with event
    const entry = await prisma.waitlistEntry.findUnique({
      where: { id: entryId },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            organizationId: true,
          },
        },
      },
    })

    if (!entry) {
      return NextResponse.json(
        { error: 'Waitlist entry not found' },
        { status: 404 }
      )
    }

    // Verify event belongs to user's organization
    if (!canAccessOrganization(user, entry.event.organizationId)) {
      return NextResponse.json(
        { error: 'Unauthorized - Entry belongs to different organization' },
        { status: 403 }
      )
    }

    // If this entry was holding reserved seats (contacted with unused reservation),
    // release them back to event capacity AND the option pool before deleting.
    const reservedSpots = (entry as any).reservedSpots as number | null
    if (entry.status === 'contacted' && reservedSpots && reservedSpots > 0) {
      await prisma.$executeRaw`
        UPDATE events
        SET capacity_remaining = capacity_remaining + ${reservedSpots}
        WHERE id = ${entry.event.id}::uuid
      `
      await releaseWaitlistOptionReservation({
        eventId: entry.event.id,
        reservedSpots,
        reservedHousingType: ((entry as any).reservedHousingType as HousingType | null) ?? null,
        reservedRoomType: ((entry as any).reservedRoomType as RoomType | null) ?? null,
        reservedDayPassOptionId: (entry as any).reservedDayPassOptionId ?? null,
      })
    }

    // Delete the entry
    await prisma.waitlistEntry.delete({
      where: { id: entryId },
    })

    return NextResponse.json({
      success: true,
      message: 'Waitlist entry removed successfully',
    })
  } catch (error) {
    console.error('Error deleting waitlist entry:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    // Try to get userId from JWT token in Authorization header
    const overrideUserId = getClerkUserIdFromHeader(request)
    // Check admin access
    const user = await getCurrentUser(overrideUserId)
    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const { entryId } = await params

    // Fetch waitlist entry with event
    const entry = await prisma.waitlistEntry.findUnique({
      where: { id: entryId },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            organizationId: true,
          },
        },
      },
    })

    if (!entry) {
      return NextResponse.json(
        { error: 'Waitlist entry not found' },
        { status: 404 }
      )
    }

    // Verify event belongs to user's organization
    if (!canAccessOrganization(user, entry.event.organizationId)) {
      return NextResponse.json(
        { error: 'Unauthorized - Entry belongs to different organization' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      entry: {
        id: entry.id,
        name: entry.name,
        email: entry.email,
        phone: entry.phone,
        partySize: entry.partySize,
        notes: entry.notes,
        status: entry.status,
        notifiedAt: entry.notifiedAt,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        event: entry.event,
      },
    })
  } catch (error) {
    console.error('Error fetching waitlist entry:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Edit a pending waitlist entry. Admin can change what the request looks like
 * — party size, mix, preferences, notes — before contacting.
 *
 * Contacted entries are not editable through this route: they already hold
 * a real reservation and an already-sent invite is a promise. To adjust one
 * of those, move it back to pending first (which releases the reservation)
 * and then edit.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const overrideUserId = getClerkUserIdFromHeader(request)
    const user = await getCurrentUser(overrideUserId)
    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const { entryId } = await params
    const body = await request.json()

    const entry = await prisma.waitlistEntry.findUnique({
      where: { id: entryId },
      include: {
        event: {
          select: {
            id: true,
            organizationId: true,
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
      return NextResponse.json({ error: 'Waitlist entry not found' }, { status: 404 })
    }

    if (!canAccessOrganization(user, entry.event.organizationId)) {
      return NextResponse.json(
        { error: 'Unauthorized - Entry belongs to different organization' },
        { status: 403 }
      )
    }

    if (entry.status !== 'pending') {
      return NextResponse.json(
        {
          error:
            'Only pending waitlist entries can be edited. Move this entry back to pending first, then edit it.',
        },
        { status: 400 }
      )
    }

    // Read fields with the same shape the public join API uses.
    const {
      name,
      phone,
      notes,
      partySize,
      registrationType,
      youthCount,
      chaperoneCount,
      priestCount,
      preferredTicketType,
      preferredHousingType,
      preferredRoomType,
      preferredDayPassOptionId,
    } = body

    const groupEnabled = entry.event.settings?.groupRegistrationEnabled ?? true
    const individualEnabled = entry.event.settings?.individualRegistrationEnabled ?? true

    const nextRegistrationType: 'group' | 'individual' | null =
      registrationType === 'group' || registrationType === 'individual'
        ? registrationType
        : entry.registrationType

    if (nextRegistrationType === 'group' && !groupEnabled) {
      return NextResponse.json(
        { error: 'This event does not accept group registrations.' },
        { status: 400 }
      )
    }
    if (nextRegistrationType === 'individual' && !individualEnabled) {
      return NextResponse.json(
        { error: 'This event does not accept individual registrations.' },
        { status: 400 }
      )
    }

    const parsedYouth = typeof youthCount === 'number' ? youthCount : parseInt(youthCount ?? '') || 0
    const parsedChaperone = typeof chaperoneCount === 'number' ? chaperoneCount : parseInt(chaperoneCount ?? '') || 0
    const parsedPriest = typeof priestCount === 'number' ? priestCount : parseInt(priestCount ?? '') || 0
    const parsedPartySize = typeof partySize === 'number' ? partySize : parseInt(partySize ?? '') || entry.partySize

    if (parsedPartySize < 1 || parsedPartySize > 100) {
      return NextResponse.json({ error: 'Party size must be between 1 and 100.' }, { status: 400 })
    }

    if (nextRegistrationType === 'group') {
      const mixTotal = parsedYouth + parsedChaperone + parsedPriest
      if (mixTotal <= 0) {
        return NextResponse.json(
          { error: 'Group entries need at least one youth, chaperone, or priest.' },
          { status: 400 }
        )
      }
      if (mixTotal !== parsedPartySize) {
        return NextResponse.json(
          {
            error: `Party size (${parsedPartySize}) doesn't match youth (${parsedYouth}) + chaperones (${parsedChaperone}) + priests (${parsedPriest}) = ${mixTotal}.`,
          },
          { status: 400 }
        )
      }
    }

    if (nextRegistrationType === 'individual' && parsedPartySize !== 1) {
      return NextResponse.json(
        { error: 'Individual entries can only reserve one spot at a time.' },
        { status: 400 }
      )
    }

    const updated = await prisma.waitlistEntry.update({
      where: { id: entryId },
      data: {
        ...(typeof name === 'string' && name.length > 0 ? { name } : {}),
        ...(phone !== undefined ? { phone: phone || null } : {}),
        ...(notes !== undefined ? { notes: notes || null } : {}),
        partySize: parsedPartySize,
        registrationType: nextRegistrationType,
        youthCount: nextRegistrationType === 'group' ? parsedYouth : null,
        chaperoneCount: nextRegistrationType === 'group' ? parsedChaperone : null,
        priestCount: nextRegistrationType === 'group' ? parsedPriest : null,
        ...(preferredTicketType !== undefined
          ? { preferredTicketType: preferredTicketType || null }
          : {}),
        ...(preferredHousingType !== undefined
          ? { preferredHousingType: (preferredHousingType || null) as HousingType | null }
          : {}),
        ...(preferredRoomType !== undefined
          ? { preferredRoomType: (preferredRoomType || null) as RoomType | null }
          : {}),
        ...(preferredDayPassOptionId !== undefined
          ? { preferredDayPassOptionId: preferredDayPassOptionId || null }
          : {}),
      },
    })

    return NextResponse.json({ success: true, entry: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Error editing waitlist entry:', message, error)
    return NextResponse.json(
      { error: `Internal server error: ${message}` },
      { status: 500 }
    )
  }
}
