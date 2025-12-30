import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

// Subscription tier to Stripe price mapping
// These should be set up in your Stripe dashboard
const TIER_PRICES: Record<string, { monthly: string | null; annual: string | null }> = {
  starter: {
    monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || null,
    annual: process.env.STRIPE_PRICE_STARTER_ANNUAL || null,
  },
  small_diocese: {
    monthly: process.env.STRIPE_PRICE_SMALL_DIOCESE_MONTHLY || null,
    annual: process.env.STRIPE_PRICE_SMALL_DIOCESE_ANNUAL || null,
  },
  growing: {
    monthly: process.env.STRIPE_PRICE_GROWING_MONTHLY || null,
    annual: process.env.STRIPE_PRICE_GROWING_ANNUAL || null,
  },
  conference: {
    monthly: process.env.STRIPE_PRICE_CONFERENCE_MONTHLY || null,
    annual: process.env.STRIPE_PRICE_CONFERENCE_ANNUAL || null,
  },
  enterprise: {
    monthly: null, // Enterprise is custom pricing
    annual: null,
  },
}

// Create or sync a Stripe subscription for an organization
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findFirst({
      where: { clerkUserId },
      select: { id: true, role: true },
    })

    if (!user || user.role !== 'master_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { organizationId, billingCycle } = body

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Get organization
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        contactEmail: true,
        subscriptionTier: true,
        billingCycle: true,
        monthlyPrice: true,
        annualPrice: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    })

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const cycle = billingCycle || org.billingCycle || 'monthly'
    const tier = org.subscriptionTier

    // Get price ID for tier
    const tierPrices = TIER_PRICES[tier]
    const priceId = cycle === 'annual' ? tierPrices?.annual : tierPrices?.monthly

    if (!priceId) {
      return NextResponse.json(
        { error: `No Stripe price configured for ${tier} ${cycle}. Configure in environment variables.` },
        { status: 400 }
      )
    }

    // Create or get Stripe customer
    let customerId = org.stripeCustomerId

    if (!customerId) {
      const customer = await stripe.customers.create({
        name: org.name,
        email: org.contactEmail,
        metadata: {
          organizationId: org.id,
        },
      })
      customerId = customer.id

      // Save customer ID
      await prisma.organization.update({
        where: { id: org.id },
        data: { stripeCustomerId: customerId },
      })
    }

    // If subscription already exists, update it
    if (org.stripeSubscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(org.stripeSubscriptionId)

      if (subscription.status === 'active' || subscription.status === 'trialing') {
        // Update the subscription with new price
        await stripe.subscriptions.update(org.stripeSubscriptionId, {
          items: [
            {
              id: subscription.items.data[0].id,
              price: priceId,
            },
          ],
          proration_behavior: 'create_prorations',
        })

        // Update org billing cycle
        await prisma.organization.update({
          where: { id: org.id },
          data: { billingCycle: cycle as 'monthly' | 'annual' },
        })

        // Log activity
        await prisma.platformActivityLog.create({
          data: {
            organizationId: org.id,
            userId: user.id,
            activityType: 'subscription_updated',
            description: `Updated subscription to ${tier} ${cycle}`,
          },
        })

        return NextResponse.json({
          success: true,
          message: 'Subscription updated',
          subscriptionId: org.stripeSubscriptionId,
        })
      }
    }

    // Create new subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      metadata: {
        organizationId: org.id,
        tier,
        billingCycle: cycle,
      },
    })

    // Update organization with subscription ID
    await prisma.organization.update({
      where: { id: org.id },
      data: {
        stripeSubscriptionId: subscription.id,
        billingCycle: cycle as 'monthly' | 'annual',
        subscriptionStatus: 'active',
        subscriptionStartedAt: new Date(),
        subscriptionRenewsAt: new Date(subscription.current_period_end * 1000),
      },
    })

    // Log activity
    await prisma.platformActivityLog.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        activityType: 'subscription_created',
        description: `Created ${tier} ${cycle} subscription`,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Subscription created',
      subscriptionId: subscription.id,
    })
  } catch (error) {
    console.error('Create subscription error:', error)
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    )
  }
}

// List subscriptions (for dashboard)
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findFirst({
      where: { clerkUserId },
      select: { id: true, role: true },
    })

    if (!user || user.role !== 'master_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {
      stripeSubscriptionId: { not: null },
    }

    if (status) {
      where.subscriptionStatus = status
    }

    const subscriptions = await prisma.organization.findMany({
      where,
      select: {
        id: true,
        name: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        billingCycle: true,
        monthlyFee: true,
        stripeSubscriptionId: true,
        subscriptionStartedAt: true,
        subscriptionRenewsAt: true,
      },
      orderBy: { subscriptionStartedAt: 'desc' },
    })

    return NextResponse.json({ subscriptions })
  } catch (error) {
    console.error('List subscriptions error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions' },
      { status: 500 }
    )
  }
}
