import { NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'

// Tier limits and pricing
const TIER_LIMITS: Record<string, { events: number; monthlyPrice: number }> = {
  starter: { events: 2, monthlyPrice: 49 },
  small_diocese: { events: 5, monthlyPrice: 99 },
  growing: { events: 10, monthlyPrice: 149 },
  conference: { events: 25, monthlyPrice: 249 },
  enterprise: { events: 999, monthlyPrice: 499 },
  test: { events: 999, monthlyPrice: 0 },
}

const TIER_LABELS: Record<string, string> = {
  starter: 'Starter',
  small_diocese: 'Small Diocese',
  growing: 'Growing',
  conference: 'Conference',
  enterprise: 'Enterprise',
  test: 'Test',
}

function getUpgradeTiers(currentTier: string) {
  const tierOrder = ['starter', 'small_diocese', 'growing', 'conference', 'enterprise']
  const currentIndex = tierOrder.indexOf(currentTier)

  if (currentIndex === -1 || currentIndex >= tierOrder.length - 1) {
    return []
  }

  return tierOrder.slice(currentIndex + 1).map(tier => ({
    id: tier,
    name: TIER_LABELS[tier],
    events: TIER_LIMITS[tier].events,
    monthlyPrice: TIER_LIMITS[tier].monthlyPrice,
  }))
}

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // Get the effective org ID (handles impersonation)
    const organizationId = await getEffectiveOrgId(user)

    // Get organization with event usage info
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        eventsPerYearLimit: true,
        eventsUsed: true,
        subscriptionTier: true,
      },
    })

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    const limit = organization.eventsPerYearLimit ?? TIER_LIMITS[organization.subscriptionTier]?.events ?? 2
    const used = organization.eventsUsed
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
        tierLabel: TIER_LABELS[organization.subscriptionTier] || organization.subscriptionTier,
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
      tierLabel: TIER_LABELS[organization.subscriptionTier] || organization.subscriptionTier,
    })
  } catch (error) {
    console.error('Error checking event limit:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
