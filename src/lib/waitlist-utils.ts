import { prisma } from '@/lib/prisma'
import {
  incrementOptionCapacity,
  incrementDayPassOptionCapacity,
  type HousingType,
  type RoomType,
} from '@/lib/option-capacity'

/**
 * Release the option-level reservation held by a waitlist entry (if any) back
 * to its pools. Idempotent — no-op when the entry has no option reservation.
 * Does NOT touch event.capacityRemaining; the callers handle that separately
 * (some paths — like status → registered — consume the event seat rather than
 * releasing it, while option pools follow the same rule).
 */
export async function releaseWaitlistOptionReservation(entry: {
  eventId: string
  reservedSpots: number | null
  reservedHousingType: HousingType | null
  reservedRoomType: RoomType | null
  reservedDayPassOptionId: string | null
}): Promise<void> {
  const spots = entry.reservedSpots ?? 0
  if (spots <= 0) return

  if (entry.reservedHousingType) {
    await incrementOptionCapacity(
      entry.eventId,
      entry.reservedHousingType,
      entry.reservedRoomType,
      spots
    )
  }
  if (entry.reservedDayPassOptionId) {
    await incrementDayPassOptionCapacity(entry.reservedDayPassOptionId, spots)
  }
}

/**
 * Mark a waitlist entry as registered after successful registration
 * This should be called when a registration is completed (after payment if applicable)
 *
 * @param eventId - The event ID
 * @param email - The email of the person who registered
 * @returns The updated waitlist entry, or null if not found
 */
export async function markWaitlistAsRegistered(
  eventId: string,
  email: string
): Promise<{ success: boolean; entryId?: string }> {
  try {
    // Find a waitlist entry with 'contacted' status for this event and email
    const entry = await prisma.waitlistEntry.findFirst({
      where: {
        eventId,
        email: email.toLowerCase(),
        status: 'contacted',
      },
    })

    if (!entry) {
      // No waitlist entry found - that's okay, they may have registered normally
      return { success: true }
    }

    // Update the entry to registered
    await prisma.waitlistEntry.update({
      where: { id: entry.id },
      data: {
        status: 'registered',
      },
    })

    console.log(`[Waitlist] Marked entry ${entry.id} as registered for ${email}`)
    return { success: true, entryId: entry.id }
  } catch (error) {
    console.error('Error marking waitlist entry as registered:', error)
    return { success: false }
  }
}

/**
 * Mark a waitlist entry as registered by token
 * This is useful when the registration page passes the waitlist token
 *
 * @param token - The registration token from the waitlist invitation
 * @returns The updated waitlist entry, or error info
 */
export async function markWaitlistAsRegisteredByToken(
  token: string
): Promise<{ success: boolean; entryId?: string; error?: string }> {
  try {
    const entry = await prisma.waitlistEntry.findFirst({
      where: { registrationToken: token },
    })

    if (!entry) {
      return { success: false, error: 'Token not found' }
    }

    if (entry.status === 'registered') {
      return { success: true, entryId: entry.id } // Already registered
    }

    // Check if token has expired
    if (entry.invitationExpires && new Date() > entry.invitationExpires) {
      return { success: false, error: 'Token expired' }
    }

    // Update to registered. Also null out all reservation fields — the
    // reservation has been consumed by the actual registration, so subsequent
    // status flips shouldn't try to release it back to capacity.
    await prisma.waitlistEntry.update({
      where: { id: entry.id },
      data: {
        status: 'registered',
        reservedSpots: null,
        reservedHousingType: null,
        reservedRoomType: null,
        reservedDayPassOptionId: null,
      },
    })

    console.log(`[Waitlist] Marked entry ${entry.id} as registered via token`)
    return { success: true, entryId: entry.id }
  } catch (error) {
    console.error('Error marking waitlist entry as registered by token:', error)
    return { success: false, error: 'Internal error' }
  }
}

/**
 * Validate a waitlist registration token
 *
 * @param token - The registration token to validate
 * @returns Validation result with entry and event details if valid
 */
export async function validateWaitlistToken(token: string): Promise<{
  valid: boolean
  error?: string
  reason?: 'not_found' | 'expired' | 'already_registered' | 'invalid_status'
  entry?: {
    id: string
    name: string
    email: string
    partySize: number
    eventId: string
    reservedSpots: number | null
    preferredHousingType: HousingType | null
    preferredRoomType: RoomType | null
    preferredDayPassOptionId: string | null
    reservedHousingType: HousingType | null
    reservedRoomType: RoomType | null
    reservedDayPassOptionId: string | null
    effectiveHousingType: HousingType | null
    effectiveRoomType: RoomType | null
    effectiveDayPassOptionId: string | null
  }
}> {
  try {
    const entry = await prisma.waitlistEntry.findFirst({
      where: { registrationToken: token },
    })

    if (!entry) {
      return { valid: false, error: 'Invalid token', reason: 'not_found' }
    }

    if (entry.status === 'registered') {
      return { valid: false, error: 'Already registered', reason: 'already_registered' }
    }

    if (entry.invitationExpires && new Date() > entry.invitationExpires) {
      return { valid: false, error: 'Token expired', reason: 'expired' }
    }

    if (entry.status !== 'contacted') {
      return { valid: false, error: 'Invalid status', reason: 'invalid_status' }
    }

    // "Effective" values represent the actual offer: reserved_* if the admin
    // stored a reservation (normal invite OR counter-offer), otherwise the
    // entry's preferred_* fields. Callers should match the incoming
    // registration against these effective values, not raw preferred_*.
    const reservedHousingType = ((entry as any).reservedHousingType as HousingType | null) ?? null
    const reservedRoomType = ((entry as any).reservedRoomType as RoomType | null) ?? null
    const reservedDayPassOptionId = (entry as any).reservedDayPassOptionId ?? null
    const preferredHousingType = ((entry as any).preferredHousingType as HousingType | null) ?? null
    const preferredRoomType = ((entry as any).preferredRoomType as RoomType | null) ?? null
    const preferredDayPassOptionId = (entry as any).preferredDayPassOptionId ?? null

    return {
      valid: true,
      entry: {
        id: entry.id,
        name: entry.name,
        email: entry.email,
        partySize: entry.partySize,
        eventId: entry.eventId,
        reservedSpots: (entry as any).reservedSpots ?? null,
        preferredHousingType,
        preferredRoomType,
        preferredDayPassOptionId,
        reservedHousingType,
        reservedRoomType,
        reservedDayPassOptionId,
        // Effective values — what the invitee is actually being offered.
        effectiveHousingType: reservedHousingType ?? preferredHousingType,
        effectiveRoomType: reservedRoomType ?? preferredRoomType,
        effectiveDayPassOptionId: reservedDayPassOptionId ?? preferredDayPassOptionId,
      },
    }
  } catch (error) {
    console.error('Error validating waitlist token:', error)
    return { valid: false, error: 'Internal error' }
  }
}
