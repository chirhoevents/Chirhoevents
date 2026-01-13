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
 * Get or create a queue session for a user
 */
export async function checkRegistrationQueue(
  eventId: string,
  sessionId: string,
  registrationType: QueueRegistrationType,
  userId?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<QueueCheckResult> {
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
    }
  }

  // Check if user already has a session
  const existingEntry = await prisma.registrationQueue.findUnique({
    where: { sessionId }
  })

  // If user has an active session that hasn't expired, let them through
  if (existingEntry) {
    if (existingEntry.status === 'active' && existingEntry.expiresAt && existingEntry.expiresAt > new Date()) {
      return {
        allowed: true,
        sessionId,
        status: 'active',
        expiresAt: existingEntry.expiresAt,
        extensionAllowed: queueSettings?.allowTimeExtension && !existingEntry.extensionUsed,
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

    // If expired or abandoned, they need to re-queue
    if (existingEntry.status === 'expired' || existingEntry.status === 'abandoned') {
      // Reset their status to waiting
      await prisma.registrationQueue.update({
        where: { sessionId },
        data: {
          status: 'waiting',
          queuePosition: null,
          admittedAt: null,
          expiresAt: null,
          extensionUsed: false,
        }
      })
    }
  }

  // Count current active sessions for this registration type
  const maxConcurrent = registrationType === 'group'
    ? queueSettings!.maxConcurrentGroup
    : queueSettings!.maxConcurrentIndividual

  const activeSessions = await prisma.registrationQueue.count({
    where: {
      eventId,
      registrationType,
      status: 'active',
      expiresAt: { gt: new Date() }
    }
  })

  // If under limit, admit user
  if (activeSessions < maxConcurrent) {
    const timeout = registrationType === 'group'
      ? queueSettings!.groupSessionTimeout
      : queueSettings!.individualSessionTimeout

    const expiresAt = new Date(Date.now() + timeout * 1000)

    await prisma.registrationQueue.upsert({
      where: { sessionId },
      create: {
        eventId,
        sessionId,
        userId,
        registrationType,
        status: 'active',
        admittedAt: new Date(),
        expiresAt,
        ipAddress,
        userAgent,
      },
      update: {
        status: 'active',
        admittedAt: new Date(),
        expiresAt,
        queuePosition: null,
        extensionUsed: false,
      }
    })

    return {
      allowed: true,
      sessionId,
      status: 'active',
      expiresAt,
      extensionAllowed: queueSettings?.allowTimeExtension,
      extensionUsed: false,
    }
  }

  // Calculate queue position
  const waitingAhead = await prisma.registrationQueue.count({
    where: {
      eventId,
      registrationType,
      status: 'waiting',
      enteredQueueAt: existingEntry ? { lt: existingEntry.enteredQueueAt } : undefined
    }
  })

  const position = waitingAhead + 1

  // Calculate estimated wait time
  const sessionTimeout = registrationType === 'group'
    ? queueSettings!.groupSessionTimeout
    : queueSettings!.individualSessionTimeout

  // Estimate: position * (average session time / concurrent slots)
  const estimatedWaitMinutes = Math.ceil(position * (sessionTimeout / 60 / maxConcurrent))

  // Add to queue or update position
  await prisma.registrationQueue.upsert({
    where: { sessionId },
    create: {
      eventId,
      sessionId,
      userId,
      registrationType,
      status: 'waiting',
      queuePosition: position,
      ipAddress,
      userAgent,
    },
    update: {
      status: 'waiting',
      queuePosition: position,
    }
  })

  return {
    allowed: false,
    sessionId,
    status: 'waiting',
    queuePosition: position,
    estimatedWaitMinutes,
    waitingRoomMessage: queueSettings?.waitingRoomMessage || undefined,
  }
}

/**
 * Get current queue status for a session
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

  // If entry is active and not expired
  if (queueEntry.status === 'active' && queueEntry.expiresAt && queueEntry.expiresAt > new Date()) {
    return {
      allowed: true,
      sessionId,
      status: 'active',
      expiresAt: queueEntry.expiresAt,
      extensionAllowed: queueSettings?.allowTimeExtension && !queueEntry.extensionUsed,
      extensionUsed: queueEntry.extensionUsed,
    }
  }

  // If waiting, recalculate position
  if (queueEntry.status === 'waiting') {
    const waitingAhead = await prisma.registrationQueue.count({
      where: {
        eventId,
        registrationType,
        status: 'waiting',
        enteredQueueAt: { lt: queueEntry.enteredQueueAt }
      }
    })

    const position = waitingAhead + 1

    // Update position if changed
    if (queueEntry.queuePosition !== position) {
      await prisma.registrationQueue.update({
        where: { sessionId },
        data: { queuePosition: position }
      })
    }

    const maxConcurrent = registrationType === 'group'
      ? queueSettings!.maxConcurrentGroup
      : queueSettings!.maxConcurrentIndividual

    const sessionTimeout = registrationType === 'group'
      ? queueSettings!.groupSessionTimeout
      : queueSettings!.individualSessionTimeout

    const estimatedWaitMinutes = Math.ceil(position * (sessionTimeout / 60 / maxConcurrent))

    return {
      allowed: false,
      sessionId,
      status: 'waiting',
      queuePosition: position,
      estimatedWaitMinutes,
      waitingRoomMessage: queueSettings?.waitingRoomMessage || undefined,
    }
  }

  // For completed, expired, or abandoned status
  return {
    allowed: queueEntry.status === 'completed',
    sessionId,
    status: queueEntry.status as QueueStatus,
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
