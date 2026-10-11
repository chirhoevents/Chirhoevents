import { prisma } from '@/lib/prisma'

// Fallback when an event has no settings row yet (matches the column default).
export const DEFAULT_CHAPERONE_RATIO = 10

/**
 * Max youth per same-gender chaperone for an event (10 means 10:1). Set per
 * event because safe-environment rules vary by diocese. Used for reporting
 * only — registration is never blocked on it.
 */
export async function getEventChaperoneRatio(eventId: string): Promise<number> {
  const settings = await prisma.eventSettings.findUnique({
    where: { eventId },
    select: { chaperoneRatio: true },
  })
  return settings?.chaperoneRatio ?? DEFAULT_CHAPERONE_RATIO
}
