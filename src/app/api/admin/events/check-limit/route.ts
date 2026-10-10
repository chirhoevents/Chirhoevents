import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'
import { countEventsUsedInCurrentPeriod } from '@/lib/event-usage'
import { getTier, getTierDisplayName, migrateOldTierKey } from '@/lib/subscription-tiers'

// Limits and prices come from the plan definitions so this check can't drift
// from what the pricing page and onboarding say. null eventsPerYear = unlimited.
function tierEventLimit(tierKey: string): number {
  const events = getTier(tierKey)?.eventsPerYear
  return events === null || events === undefined ? 999 : events
}

function getUpgradeTiers(currentTier: string) {
  const tierOrder = ['chapel', 'parish', 'cathedral', 'shrine', 'basilica']
  // Normalize legacy tier keys to current keys before indexing.
  const normalizedTier = migrateOldTierKey(currentTier)
  const currentIndex = tierOrder.indexOf(normalizedTier)

  if (currentIndex === -1 || currentIndex >= tierOrder.length - 1) {
    return []
  }

  return tierOrder.slice(currentIndex + 1).map(tier => ({
    id: tier,
    name: getTierDisplayName(tier),
    events: tierEventLimit(tier),
    monthlyPrice: getTier(tier)?.monthlyPrice ?? 0,
  }))
}

export async function GET(request: NextRequest) {
  try {
    // Try to get userId from JWT token in Authorization header
    const overrideUserId = await getClerkUserIdFromHeader(request)
    const user = await getCurrentUser(overrideUserId)

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // Get the effective org ID (handles impersonation)
    const organizationId = await getEffectiveOrgId(user as any)

    // Get organization with event usage info
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        subscriptionStartedAt: true,
        eventsPerYearLimit: true,
        subscriptionTier: true,
      },
    })

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    const limit = organization.eventsPerYearLimit ?? tierEventLimit(organization.subscriptionTier)
    const used = await countEventsUsedInCurrentPeriod(
      organizationId,
      organization.subscriptionStartedAt ?? organization.createdAt
    )
    const atLimit = used >= limit
    const remaining = Math.max(0, limit - used)

    if (atLimit) {
      // Calculate overage cost ($50 per extra event)
      const overageCost = 50

      // Get upgrade options
      const upgradeTiers = getUpgradeTiers(organization.subscriptionTier)

      return NextResponse.json({
        atLimit: true,
        currentUsage: used,
        limit: limit,
        remaining: 0,
        tier: organization.subscriptionTier,
        tierLabel: getTierDisplayName(organization.subscriptionTier),
        options: {
          overage: {
            available: true,
            cost: overageCost,
            description: `Pay $${overageCost} to create one additional event`,
          },
          upgrade: {
            available: upgradeTiers.length > 0,
            tiers: upgradeTiers,
            description: 'Upgrade your plan for more events',
          },
        },
      })
    }

    return NextResponse.json({
      atLimit: false,
      currentUsage: used,
      limit: limit,
      remaining: remaining,
      tier: organization.subscriptionTier,
      tierLabel: getTierDisplayName(organization.subscriptionTier),
    })
  } catch (error) {
    console.error('Error checking event limit:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
