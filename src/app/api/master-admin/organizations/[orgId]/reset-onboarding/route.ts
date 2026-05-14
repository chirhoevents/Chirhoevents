import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'

// Resets Stripe Connect onboarding for an organization so they can reconnect
// with a different account (e.g. a different person in finance).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const clerkUserId = await getClerkUserIdFromRequest(request)

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify master admin
    const currentUser = await prisma.user.findFirst({
      where: { clerkUserId },
      select: { id: true, role: true },
    })

    if (!currentUser || currentUser.role !== 'master_admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Master Admin access required' },
        { status: 403 }
      )
    }

    const { orgId } = await params

    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        stripeAccountId: true,
        stripeOnboardingCompleted: true,
      },
    })

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    const previousStripeAccountId = organization.stripeAccountId

    // Clear all Stripe Connect fields so the org can start fresh
    await prisma.organization.update({
      where: { id: orgId },
      data: {
        stripeAccountId: null,
        stripeAccountStatus: 'not_connected',
        stripeOnboardingCompleted: false,
        stripeChargesEnabled: false,
        stripePayoutsEnabled: false,
        stripeConnectedAt: null,
      },
    })

    // Log activity
    await prisma.platformActivityLog.create({
      data: {
        organizationId: orgId,
        userId: currentUser.id,
        activityType: 'stripe_onboarding_reset',
        description: `Stripe Connect onboarding reset for ${organization.name}`,
        metadata: {
          previousStripeAccountId,
          wasOnboardingCompleted: organization.stripeOnboardingCompleted,
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Stripe onboarding reset. The organization can now reconnect Stripe from their Settings page.',
    })
  } catch (error) {
    console.error('Error resetting Stripe onboarding:', error)
    return NextResponse.json(
      { error: 'Failed to reset Stripe onboarding' },
      { status: 500 }
    )
  }
}
