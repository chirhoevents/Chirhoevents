import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'

// Tier limits and pricing
const TIER_LIMITS: Record<string, { events: number; monthlyPrice: number }> = {
  starter: { events: 3, monthlyPrice: 25 },
  parish: { events: 5, monthlyPrice: 45 },
  cathedral: { events: 10, monthlyPrice: 89 },
  shrine: { events: 25, monthlyPrice: 120 },
  basilica: { events: 999, monthlyPrice: 200 },
  // Legacy tier names for backward compatibility
  small_diocese: { events: 5, monthlyPrice: 45 },
  growing: { events: 10, monthlyPrice: 89 },
  conference: { events: 25, monthlyPrice: 120 },
  enterprise: { events: 999, monthlyPrice: 200 },
  test: { events: 999, monthlyPrice: 0 },
}

const TIER_LABELS: Record<string, string> = {
  starter: 'Starter',
  parish: 'Parish',
  cathedral: 'Cathedral',
  shrine: 'Shrine',
  basilica: 'Basilica',
  // Legacy tier names for backward compatibility
  small_diocese: 'Parish',
  growing: 'Cathedral',
  conference: 'Shrine',
  enterprise: 'Basilica',
  test: 'Test',
}

function getUpgradeTiers(currentTier: string) {
  const tierOrder = ['starter', 'parish', 'cathedral', 'shrine', 'basilica']
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

export async function GET(request: NextRequest) {
  try {
    // Try to get userId from JWT token in Authorization header
    const overrideUserId = getClerkUserIdFromHeader(request)
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
