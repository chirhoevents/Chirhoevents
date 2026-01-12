import { prisma } from '@/lib/prisma'

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
    const entry = await prisma.waitlistEntry.findUnique({
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

    // Update to registered
    await prisma.waitlistEntry.update({
      where: { id: entry.id },
      data: {
        status: 'registered',
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
  }
}> {
  try {
    const entry = await prisma.waitlistEntry.findUnique({
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

    return {
      valid: true,
      entry: {
        id: entry.id,
        name: entry.name,
        email: entry.email,
        partySize: entry.partySize,
        eventId: entry.eventId,
      },
    }
  } catch (error) {
    console.error('Error validating waitlist token:', error)
    return { valid: false, error: 'Internal error' }
  }
}
