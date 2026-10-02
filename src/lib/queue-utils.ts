import type { EventQueueSettings } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export type QueueRegistrationType = 'group' | 'individual'
export type QueueStatus = 'waiting' | 'active' | 'completed' | 'expired' | 'abandoned'

export interface QueueCheckResult {
  allowed: boolean
  sessionId: string
  status: QueueStatus
  queuePosition?: number
  estimatedWaitMinutes?: number
  expiresAt?: Date
  extensionAllowed?: boolean
  extensionUsed?: boolean
  waitingRoomMessage?: string
  queueNotEnabled?: boolean
}

export interface QueueSettings {
  queueEnabled: boolean
  maxConcurrentGroup: number
  maxConcurrentIndividual: number
  groupSessionTimeout: number
  individualSessionTimeout: number
  allowTimeExtension: boolean
  extensionDuration: number
  queueStartTime: Date | null
  queueEndTime: Date | null
  waitingRoomMessage: string | null
}

export interface QueueStats {
  activeGroupSessions: number
  activeIndividualSessions: number
  waitingGroupUsers: number
  waitingIndividualUsers: number
  maxConcurrentGroup: number
  maxConcurrentIndividual: number
}

/**
 * Check if queue should be active based on settings and time
 */
export function isQueueActive(settings: QueueSettings | null): boolean {
  if (!settings || !settings.queueEnabled) {
    return false
  }

  const now = new Date()

  // Check if we're within the queue time window
  if (settings.queueStartTime && now < settings.queueStartTime) {
    return false
  }
  if (settings.queueEndTime && now > settings.queueEndTime) {
    return false
  }

  return true
}

/**
 * Mark an event's active sessions whose time has run out as expired. Run
 * inline on every check rather than relying on the cleanup cron alone, so an
 * expired session is never treated as still holding (or re-earning) a spot
 * in the window before the cron next fires — or if the cron isn't running.
 */
async function expireStaleSessions(eventId: string): Promise<void> {
  await prisma.registrationQueue.updateMany({
    where: {
      eventId,
      status: 'active',
      expiresAt: { lt: new Date() }
    },
    data: { status: 'expired' }
  })
}

/**
 * If a spot is open and nobody who has waited longer is ahead of this
 * session, admit it with a fresh timer. Returns the new expiry, or null when
 * the session has to keep waiting.
 */
async function tryAdmitSession(
  eventId: string,
  sessionId: string,
  registrationType: QueueRegistrationType,
  settings: EventQueueSettings,
  waitingAhead: number
): Promise<Date | null> {
  const maxConcurrent = registrationType === 'group'
    ? settings.maxConcurrentGroup
    : settings.maxConcurrentIndividual

  const activeSessions = await prisma.registrationQueue.count({
    where: {
      eventId,
      registrationType,
      status: 'active',
      expiresAt: { gt: new Date() }
    }
  })

  // Open spots go to whoever has waited longest — a newcomer (or someone
  // whose timer just ran out) can't jump ahead of people already in line.
  if (waitingAhead >= maxConcurrent - activeSessions) {
    return null
  }

  const timeout = registrationType === 'group'
    ? settings.groupSessionTimeout
    : settings.individualSessionTimeout

  const expiresAt = new Date(Date.now() + timeout * 1000)

  await prisma.registrationQueue.update({
    where: { sessionId },
    data: {
      status: 'active',
      admittedAt: new Date(),
      expiresAt,
      queuePosition: null,
      extensionUsed: false,
    }
  })

  return expiresAt
}

function estimateWaitMinutes(
  registrationType: QueueRegistrationType,
  settings: EventQueueSettings,
  position: number
): number {
  const maxConcurrent = registrationType === 'group'
    ? settings.maxConcurrentGroup
    : settings.maxConcurrentIndividual

  const sessionTimeout = registrationType === 'group'
    ? settings.groupSessionTimeout
    : settings.individualSessionTimeout

  // Estimate: position * (average session time / concurrent slots)
  return Math.ceil(position * (sessionTimeout / 60 / maxConcurrent))
}

/**
 * Get or create a queue session for a user.
 *
 * A session whose timer has run out is NOT silently re-admitted: it comes
 * back as `expired` so the registration page can send the user out to the
 * waiting room. Only an explicit `rejoin` (the waiting room does this) puts
 * them back in line — at the back, behind everyone already waiting.
 */
export async function checkRegistrationQueue(
  eventId: string,
  sessionId: string,
  registrationType: QueueRegistrationType,
  userId?: string,
  ipAddress?: string,
  userAgent?: string,
  options?: { rejoin?: boolean }
): Promise<QueueCheckResult> {
  // Callers (e.g. the waitlist invitation flow) can pass the event's public
  // slug instead of its UUID — resolve it here rather than letting every
  // `{ eventId }` lookup below crash on a Postgres UUID-cast error.
  const isEventIdUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId)
  if (!isEventIdUuid) {
    const event = await prisma.event.findUnique({ where: { slug: eventId }, select: { id: true } })
    // Unresolvable event — nothing to queue against; let the actual
    // registration endpoint be the one to report "event not found".
    if (!event) {
      return { allowed: true, sessionId, status: 'active', queueNotEnabled: true }
    }
    eventId = event.id
  }

  // Get queue settings for the event
  const queueSettings = await prisma.eventQueueSettings.findUnique({
    where: { eventId }
  })

  // If queue not enabled or not active, allow through immediately
  if (!isQueueActive(queueSettings)) {
    return {
      allowed: true,
      sessionId,
      status: 'active',
      queueNotEnabled: true,
    }
  }
  const settings = queueSettings!

  await expireStaleSessions(eventId)

  // Check if user already has a session
  let existingEntry = await prisma.registrationQueue.findUnique({
    where: { sessionId }
  })

  if (existingEntry) {
    // Still inside their time window — let them through
    if (existingEntry.status === 'active') {
      return {
        allowed: true,
        sessionId,
        status: 'active',
        expiresAt: existingEntry.expiresAt ?? undefined,
        extensionAllowed: settings.allowTimeExtension && !existingEntry.extensionUsed,
        extensionUsed: existingEntry.extensionUsed,
      }
    }

    // If they completed registration, let them through
    if (existingEntry.status === 'completed') {
      return {
        allowed: true,
        sessionId,
        status: 'completed',
      }
    }

    // Time ran out (or they left). Kick them out until they explicitly
    // rejoin from the waiting room.
    if (existingEntry.status === 'expired' || existingEntry.status === 'abandoned') {
      if (!options?.rejoin) {
        return {
          allowed: false,
          sessionId,
          status: existingEntry.status,
        }
      }

      // Rejoin at the back of the line
      existingEntry = await prisma.registrationQueue.update({
        where: { sessionId },
        data: {
          status: 'waiting',
          enteredQueueAt: new Date(),
          queuePosition: null,
          admittedAt: null,
          expiresAt: null,
          extensionUsed: false,
        }
      })
    }
  } else {
    existingEntry = await prisma.registrationQueue.create({
      data: {
        eventId,
        sessionId,
        userId,
        registrationType,
        status: 'waiting',
        ipAddress,
        userAgent,
      }
    })
  }

  // The entry is now 'waiting' — see whether it's their turn
  const waitingAhead = await prisma.registrationQueue.count({
    where: {
      eventId,
      registrationType,
      status: 'waiting',
      enteredQueueAt: { lt: existingEntry.enteredQueueAt },
      sessionId: { not: sessionId },
    }
  })

  const expiresAt = await tryAdmitSession(eventId, sessionId, registrationType, settings, waitingAhead)
  if (expiresAt) {
    return {
      allowed: true,
      sessionId,
      status: 'active',
      expiresAt,
      extensionAllowed: settings.allowTimeExtension,
      extensionUsed: false,
    }
  }

  const position = waitingAhead + 1

  await prisma.registrationQueue.update({
    where: { sessionId },
    data: { queuePosition: position }
  })

  return {
    allowed: false,
    sessionId,
    status: 'waiting',
    queuePosition: position,
    estimatedWaitMinutes: estimateWaitMinutes(registrationType, settings, position),
    waitingRoomMessage: settings.waitingRoomMessage || undefined,
  }
}

/**
 * Get current queue status for a session. A waiting session whose turn has
 * come is admitted here too, so the line keeps moving between cron runs.
 */
export async function getQueueStatus(
  eventId: string,
  sessionId: string,
  registrationType: QueueRegistrationType
): Promise<QueueCheckResult | null> {
  const queueEntry = await prisma.registrationQueue.findUnique({
    where: { sessionId }
  })

  if (!queueEntry || queueEntry.eventId !== eventId) {
    return null
  }

  const queueSettings = await prisma.eventQueueSettings.findUnique({
    where: { eventId }
  })

  // Queue was turned off (or its window ended) while they waited
  if (!isQueueActive(queueSettings)) {
    return {
      allowed: true,
      sessionId,
      status: 'active',
      queueNotEnabled: true,
    }
  }
  const settings = queueSettings!

  // If entry is active and not expired
  if (queueEntry.status === 'active' && queueEntry.expiresAt && queueEntry.expiresAt > new Date()) {
    return {
      allowed: true,
      sessionId,
      status: 'active',
      expiresAt: queueEntry.expiresAt,
      extensionAllowed: settings.allowTimeExtension && !queueEntry.extensionUsed,
      extensionUsed: queueEntry.extensionUsed,
    }
  }

  await expireStaleSessions(eventId)

  // If waiting, admit them if it's their turn, otherwise recalculate position
  if (queueEntry.status === 'waiting') {
    const waitingAhead = await prisma.registrationQueue.count({
      where: {
        eventId,
        registrationType,
        status: 'waiting',
        enteredQueueAt: { lt: queueEntry.enteredQueueAt },
        sessionId: { not: sessionId },
      }
    })

    const expiresAt = await tryAdmitSession(eventId, sessionId, registrationType, settings, waitingAhead)
    if (expiresAt) {
      return {
        allowed: true,
        sessionId,
        status: 'active',
        expiresAt,
        extensionAllowed: settings.allowTimeExtension,
        extensionUsed: false,
      }
    }

    const position = waitingAhead + 1

    // Update position if changed
    if (queueEntry.queuePosition !== position) {
      await prisma.registrationQueue.update({
        where: { sessionId },
        data: { queuePosition: position }
      })
    }

    return {
      allowed: false,
      sessionId,
      status: 'waiting',
      queuePosition: position,
      estimatedWaitMinutes: estimateWaitMinutes(registrationType, settings, position),
      waitingRoomMessage: settings.waitingRoomMessage || undefined,
    }
  }

  // For completed, expired, or abandoned status (an 'active' entry reaching
  // here has run out of time and was just marked expired above)
  return {
    allowed: queueEntry.status === 'completed',
    sessionId,
    status: queueEntry.status === 'active' ? 'expired' : queueEntry.status as QueueStatus,
  }
}

/**
 * Extend a user's session time (one-time extension)
 */
export async function extendQueueSession(
  sessionId: string
): Promise<{ success: boolean; newExpiresAt?: Date; error?: string }> {
  const queueEntry = await prisma.registrationQueue.findUnique({
    where: { sessionId }
  })

  if (!queueEntry) {
    return { success: false, error: 'Session not found' }
  }

  if (queueEntry.status !== 'active') {
    return { success: false, error: 'Session is not active' }
  }

  if (queueEntry.extensionUsed) {
    return { success: false, error: 'Extension already used' }
  }

  const queueSettings = await prisma.eventQueueSettings.findUnique({
    where: { eventId: queueEntry.eventId }
  })

  if (!queueSettings?.allowTimeExtension) {
    return { success: false, error: 'Extensions not allowed for this event' }
  }

  // Calculate new expiration time
  const currentExpires = queueEntry.expiresAt || new Date()
  const newExpiresAt = new Date(Math.max(currentExpires.getTime(), Date.now()) + queueSettings.extensionDuration * 1000)

  await prisma.registrationQueue.update({
    where: { sessionId },
    data: {
      expiresAt: newExpiresAt,
      extensionUsed: true,
    }
  })

  return { success: true, newExpiresAt }
}

/**
 * Mark a session as completed (after successful registration)
 */
export async function markQueueSessionComplete(sessionId: string): Promise<void> {
  await prisma.registrationQueue.update({
    where: { sessionId },
    data: {
      status: 'completed',
      completedAt: new Date(),
    }
  }).catch(() => {
    // Session might not exist if queue wasn't enabled
  })
}

/**
 * Mark a session as abandoned (user left without completing)
 */
export async function markQueueSessionAbandoned(sessionId: string): Promise<void> {
  await prisma.registrationQueue.update({
    where: { sessionId },
    data: {
      status: 'abandoned',
    }
  }).catch(() => {
    // Session might not exist
  })
}

/**
 * Clean up expired sessions and admit next in line
 * This should be called periodically (e.g., every minute via cron)
 */
export async function cleanupAndAdmitQueue(): Promise<{
  expiredCount: number
  admittedCount: number
}> {
  let expiredCount = 0
  let admittedCount = 0

  // Mark all expired active sessions
  const expiredResult = await prisma.registrationQueue.updateMany({
    where: {
      status: 'active',
      expiresAt: { lt: new Date() }
    },
    data: { status: 'expired' }
  })
  expiredCount = expiredResult.count

  // Get all events with queue enabled
  const eventsWithQueue = await prisma.eventQueueSettings.findMany({
    where: { queueEnabled: true }
  })

  for (const settings of eventsWithQueue) {
    // Check if queue is within active time window
    const now = new Date()
    if (settings.queueStartTime && now < settings.queueStartTime) continue
    if (settings.queueEndTime && now > settings.queueEndTime) continue

    // Process each registration type
    for (const regType of ['group', 'individual'] as const) {
      const maxConcurrent = regType === 'group'
        ? settings.maxConcurrentGroup
        : settings.maxConcurrentIndividual

      const sessionTimeout = regType === 'group'
        ? settings.groupSessionTimeout
        : settings.individualSessionTimeout

      // Count current active sessions
      const activeSessions = await prisma.registrationQueue.count({
        where: {
          eventId: settings.eventId,
          registrationType: regType,
          status: 'active',
          expiresAt: { gt: new Date() }
        }
      })

      const spotsAvailable = maxConcurrent - activeSessions

      if (spotsAvailable > 0) {
        // Get next people in line
        const nextInLine = await prisma.registrationQueue.findMany({
          where: {
            eventId: settings.eventId,
            registrationType: regType,
            status: 'waiting'
          },
          orderBy: { enteredQueueAt: 'asc' },
          take: spotsAvailable
        })

        // Admit them
        const expiresAt = new Date(Date.now() + sessionTimeout * 1000)

        for (const entry of nextInLine) {
          await prisma.registrationQueue.update({
            where: { id: entry.id },
            data: {
              status: 'active',
              admittedAt: new Date(),
              expiresAt,
              queuePosition: null,
            }
          })
          admittedCount++
        }
      }
    }
  }

  return { expiredCount, admittedCount }
}

/**
 * Get queue statistics for an event
 */
export async function getQueueStats(eventId: string): Promise<QueueStats | null> {
  const settings = await prisma.eventQueueSettings.findUnique({
    where: { eventId }
  })

  if (!settings) {
    return null
  }

  const [activeGroup, activeIndividual, waitingGroup, waitingIndividual] = await Promise.all([
    prisma.registrationQueue.count({
      where: {
        eventId,
        registrationType: 'group',
        status: 'active',
        expiresAt: { gt: new Date() }
      }
    }),
    prisma.registrationQueue.count({
      where: {
        eventId,
        registrationType: 'individual',
        status: 'active',
        expiresAt: { gt: new Date() }
      }
    }),
    prisma.registrationQueue.count({
      where: {
        eventId,
        registrationType: 'group',
        status: 'waiting'
      }
    }),
    prisma.registrationQueue.count({
      where: {
        eventId,
        registrationType: 'individual',
        status: 'waiting'
      }
    }),
  ])

  return {
    activeGroupSessions: activeGroup,
    activeIndividualSessions: activeIndividual,
    waitingGroupUsers: waitingGroup,
    waitingIndividualUsers: waitingIndividual,
    maxConcurrentGroup: settings.maxConcurrentGroup,
    maxConcurrentIndividual: settings.maxConcurrentIndividual,
  }
}

/**
 * Clear all stuck/abandoned sessions for an event (admin action)
 */
export async function clearStuckSessions(eventId: string): Promise<number> {
  // Mark all active sessions that are expired as 'expired'
  const result = await prisma.registrationQueue.updateMany({
    where: {
      eventId,
      status: 'active',
      expiresAt: { lt: new Date() }
    },
    data: { status: 'expired' }
  })

  return result.count
}

/**
 * Get or create queue settings for an event
 */
export async function getOrCreateQueueSettings(eventId: string): Promise<QueueSettings> {
  const existing = await prisma.eventQueueSettings.findUnique({
    where: { eventId }
  })

  if (existing) {
    return {
      queueEnabled: existing.queueEnabled,
      maxConcurrentGroup: existing.maxConcurrentGroup,
      maxConcurrentIndividual: existing.maxConcurrentIndividual,
      groupSessionTimeout: existing.groupSessionTimeout,
      individualSessionTimeout: existing.individualSessionTimeout,
      allowTimeExtension: existing.allowTimeExtension,
      extensionDuration: existing.extensionDuration,
      queueStartTime: existing.queueStartTime,
      queueEndTime: existing.queueEndTime,
      waitingRoomMessage: existing.waitingRoomMessage,
    }
  }

  // Create default settings
  const created = await prisma.eventQueueSettings.create({
    data: {
      eventId,
      queueEnabled: false,
      maxConcurrentGroup: 10,
      maxConcurrentIndividual: 40,
      groupSessionTimeout: 600,
      individualSessionTimeout: 420,
      allowTimeExtension: true,
      extensionDuration: 300,
    }
  })

  return {
    queueEnabled: created.queueEnabled,
    maxConcurrentGroup: created.maxConcurrentGroup,
    maxConcurrentIndividual: created.maxConcurrentIndividual,
    groupSessionTimeout: created.groupSessionTimeout,
    individualSessionTimeout: created.individualSessionTimeout,
    allowTimeExtension: created.allowTimeExtension,
    extensionDuration: created.extensionDuration,
    queueStartTime: created.queueStartTime,
    queueEndTime: created.queueEndTime,
    waitingRoomMessage: created.waitingRoomMessage,
  }
}

/**
 * Update queue settings for an event
 */
export async function updateQueueSettings(
  eventId: string,
  settings: Partial<QueueSettings>
): Promise<QueueSettings> {
  const updated = await prisma.eventQueueSettings.upsert({
    where: { eventId },
    create: {
      eventId,
      queueEnabled: settings.queueEnabled ?? false,
      maxConcurrentGroup: settings.maxConcurrentGroup ?? 10,
      maxConcurrentIndividual: settings.maxConcurrentIndividual ?? 40,
      groupSessionTimeout: settings.groupSessionTimeout ?? 600,
      individualSessionTimeout: settings.individualSessionTimeout ?? 420,
      allowTimeExtension: settings.allowTimeExtension ?? true,
      extensionDuration: settings.extensionDuration ?? 300,
      queueStartTime: settings.queueStartTime,
      queueEndTime: settings.queueEndTime,
      waitingRoomMessage: settings.waitingRoomMessage,
    },
    update: {
      queueEnabled: settings.queueEnabled,
      maxConcurrentGroup: settings.maxConcurrentGroup,
      maxConcurrentIndividual: settings.maxConcurrentIndividual,
      groupSessionTimeout: settings.groupSessionTimeout,
      individualSessionTimeout: settings.individualSessionTimeout,
      allowTimeExtension: settings.allowTimeExtension,
      extensionDuration: settings.extensionDuration,
      queueStartTime: settings.queueStartTime,
      queueEndTime: settings.queueEndTime,
      waitingRoomMessage: settings.waitingRoomMessage,
    }
  })

  return {
    queueEnabled: updated.queueEnabled,
    maxConcurrentGroup: updated.maxConcurrentGroup,
    maxConcurrentIndividual: updated.maxConcurrentIndividual,
    groupSessionTimeout: updated.groupSessionTimeout,
    individualSessionTimeout: updated.individualSessionTimeout,
    allowTimeExtension: updated.allowTimeExtension,
    extensionDuration: updated.extensionDuration,
    queueStartTime: updated.queueStartTime,
    queueEndTime: updated.queueEndTime,
    waitingRoomMessage: updated.waitingRoomMessage,
  }
}
