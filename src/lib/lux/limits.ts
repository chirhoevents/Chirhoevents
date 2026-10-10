import { prisma } from '@/lib/prisma'
import { countEventsUsedInCurrentPeriod, getUsagePeriodStart } from '@/lib/event-usage'
import { getTierDisplayName, luxSimpleEventLimit } from '@/lib/subscription-tiers'

export interface SimpleEventUsage {
  limit: number | null // null = unlimited
  used: number
  remaining: number | null
  periodStart: Date
  periodEnd: Date
}

/**
 * How many Lux simple events this org has published in its current
 * subscription year, against its plan's (or master-admin override's) limit.
 * Drafts don't count until they're published. Faith formation programs are
 * never counted.
 */
export async function getSimpleEventUsage(organizationId: string): Promise<SimpleEventUsage> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { subscriptionStartedAt: true, createdAt: true, luxSettings: true, subscriptionTier: true },
  })
  if (!org) throw new Error('Organization not found')

  const anchor = org.subscriptionStartedAt ?? org.createdAt
  const periodStart = getUsagePeriodStart(anchor)
  const periodEnd = new Date(periodStart)
  periodEnd.setFullYear(periodEnd.getFullYear() + 1)

  const limit = luxSimpleEventLimit(org.luxSettings, org.subscriptionTier)
  const used = await countEventsUsedInCurrentPeriod(organizationId, anchor, new Date(), 'simple')
  return {
    limit,
    used,
    remaining: limit === null ? null : Math.max(0, limit - used),
    periodStart,
    periodEnd,
  }
}

/** Message when publishing one more simple event would go over the limit, or null if allowed */
export async function simpleEventLimitMessage(organizationId: string, tierKey: string): Promise<string | null> {
  const usage = await getSimpleEventUsage(organizationId)
  if (usage.limit === null || usage.used < usage.limit) return null
  const renews = usage.periodEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  return `You've published ${usage.used} of the ${usage.limit} simple events included in your ${getTierDisplayName(tierKey)} plan this year. ` +
    `Your count resets on ${renews}. To add more now, contact ChiRho Events support about upgrading.`
}
