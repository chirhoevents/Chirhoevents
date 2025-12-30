import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

// Get subscription details for an organization
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
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

    const { orgId } = await params

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        billingCycle: true,
        monthlyFee: true,
        monthlyPrice: true,
        annualPrice: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        subscriptionStartedAt: true,
        subscriptionRenewsAt: true,
      },
    })

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // If there's a Stripe subscription, get latest details
    let stripeSubscription = null
    if (org.stripeSubscriptionId) {
      try {
        stripeSubscription = await stripe.subscriptions.retrieve(org.stripeSubscriptionId)
      } catch {
        // Subscription may have been deleted
        stripeSubscription = null
      }
    }

    return NextResponse.json({
      subscription: {
        ...org,
        stripeDetails: stripeSubscription
          ? {
              status: stripeSubscription.status,
              currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
              currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
              cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
              canceledAt: stripeSubscription.canceled_at
                ? new Date(stripeSubscription.canceled_at * 1000)
                : null,
            }
          : null,
      },
    })
  } catch (error) {
    console.error('Get subscription error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    )
  }
}

// Update subscription (cancel, resume, change tier)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
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

    const { orgId } = await params
    const body = await request.json()
    const { action, reason } = body

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        stripeSubscriptionId: true,
        subscriptionStatus: true,
      },
    })

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    if (!org.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'Organization does not have an active subscription' },
        { status: 400 }
      )
    }

    let activityDescription = ''

    switch (action) {
      case 'cancel': {
        // Cancel at end of billing period
        await stripe.subscriptions.update(org.stripeSubscriptionId, {
          cancel_at_period_end: true,
          metadata: {
            cancelReason: reason || 'Cancelled by admin',
          },
        })

        activityDescription = `Scheduled subscription cancellation${reason ? `: ${reason}` : ''}`
        break
      }

      case 'cancel_immediately': {
        // Cancel immediately
        await stripe.subscriptions.cancel(org.stripeSubscriptionId)

        await prisma.organization.update({
          where: { id: org.id },
          data: {
            subscriptionStatus: 'suspended',
            cancelledAt: new Date(),
          },
        })

        activityDescription = `Cancelled subscription immediately${reason ? `: ${reason}` : ''}`
        break
      }

      case 'resume': {
        // Resume a cancelled subscription
        await stripe.subscriptions.update(org.stripeSubscriptionId, {
          cancel_at_period_end: false,
        })

        await prisma.organization.update({
          where: { id: org.id },
          data: {
            subscriptionStatus: 'active',
          },
        })

        activityDescription = 'Resumed subscription'
        break
      }

      case 'pause': {
        // Pause subscription (Stripe doesn't have native pause, so we cancel)
        await stripe.subscriptions.update(org.stripeSubscriptionId, {
          pause_collection: {
            behavior: 'void',
          },
        })

        await prisma.organization.update({
          where: { id: org.id },
          data: {
            subscriptionStatus: 'suspended',
          },
        })

        activityDescription = `Paused subscription${reason ? `: ${reason}` : ''}`
        break
      }

      case 'unpause': {
        // Unpause subscription
        await stripe.subscriptions.update(org.stripeSubscriptionId, {
          pause_collection: '',
        })

        await prisma.organization.update({
          where: { id: org.id },
          data: {
            subscriptionStatus: 'active',
          },
        })

        activityDescription = 'Unpaused subscription'
        break
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Log activity
    await prisma.platformActivityLog.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        activityType: 'subscription_updated',
        description: activityDescription,
      },
    })

    return NextResponse.json({
      success: true,
      message: activityDescription,
    })
  } catch (error) {
    console.error('Update subscription error:', error)
    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    )
  }
}
