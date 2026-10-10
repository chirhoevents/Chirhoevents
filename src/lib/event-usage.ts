import { prisma } from '@/lib/prisma'

/**
 * eventsPerYearLimit resets on the anniversary of the org's subscription
 * start (or account creation, for orgs with no recorded subscription start),
 * not on a calendar-year boundary. This finds the start of the current
 * period relative to `now`.
 */
export function getUsagePeriodStart(anchor: Date, now: Date = new Date()): Date {
  const periodStart = new Date(anchor)
  periodStart.setFullYear(now.getFullYear())
  if (periodStart.getTime() > now.getTime()) {
    periodStart.setFullYear(now.getFullYear() - 1)
  }
  return periodStart
}

/**
 * Live count of non-draft events created in the org's current usage period.
 * Used instead of trusting the stored `eventsUsed` counter, which historically
 * only ever incremented and never reset across periods.
 *
 * mode 'full' (the default) counts Events portal events against
 * eventsPerYearLimit; mode 'simple' counts Lux simple events against the
 * plan's Lux limit. Neither counts against the other.
 */
export async function countEventsUsedInCurrentPeriod(
  organizationId: string,
  anchor: Date,
  now: Date = new Date(),
  mode: 'full' | 'simple' = 'full'
): Promise<number> {
  const periodStart = getUsagePeriodStart(anchor, now)
  return prisma.event.count({
    where: {
      organizationId,
      mode,
      status: { not: 'draft' },
      createdAt: { gte: periodStart },
    },
  })
}
