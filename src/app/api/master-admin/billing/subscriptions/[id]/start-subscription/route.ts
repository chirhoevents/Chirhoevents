import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'
import Stripe from 'stripe'
import { Resend } from 'resend'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })
const resend = new Resend(process.env.RESEND_API_KEY!)

function getSubscriptionPriceId(tier: string, billingCycle: string): string | null {
  const priceMap: Record<string, string | undefined> = {
    starter_monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY,
    parish_monthly: process.env.STRIPE_PRICE_PARISH_MONTHLY,
    small_diocese_monthly: process.env.STRIPE_PRICE_PARISH_MONTHLY,
    cathedral_monthly: process.env.STRIPE_PRICE_CATHEDRAL_MONTHLY,
    cathedral_annual: process.env.STRIPE_PRICE_CATHEDRAL_ANNUAL,
    growing_monthly: process.env.STRIPE_PRICE_CATHEDRAL_MONTHLY,
    growing_annual: process.env.STRIPE_PRICE_CATHEDRAL_ANNUAL,
    shrine_monthly: process.env.STRIPE_PRICE_SHRINE_MONTHLY,
    shrine_annual: process.env.STRIPE_PRICE_SHRINE_ANNUAL,
    conference_monthly: process.env.STRIPE_PRICE_SHRINE_MONTHLY,
    conference_annual: process.env.STRIPE_PRICE_SHRINE_ANNUAL,
  }
  return priceMap[`${tier}_${billingCycle}`] ?? null
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clerkUserId = await getClerkUserIdFromRequest(request)
    if (!clerkUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findFirst({
      where: { clerkUserId },
      select: { id: true, role: true },
    })
    if (!user || user.role !== 'master_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: orgId } = await params

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        contactEmail: true,
        subscriptionTier: true,
        billingCycle: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    })

    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

    if (org.stripeSubscriptionId) {
      // Verify it's still active in Stripe before rejecting
      try {
        const existing = await stripe.subscriptions.retrieve(org.stripeSubscriptionId)
        if (existing.status === 'active' || existing.status === 'trialing') {
          return NextResponse.json({ error: 'Organization already has an active subscription' }, { status: 400 })
        }
      } catch {
        // Subscription no longer exists in Stripe — allow creating a new one
      }
    }

    const priceId = getSubscriptionPriceId(org.subscriptionTier, org.billingCycle ?? 'monthly')
    if (!priceId) {
      return NextResponse.json(
        { error: `No Stripe price configured for ${org.subscriptionTier} ${org.billingCycle}. Check your STRIPE_PRICE_* environment variables.` },
        { status: 400 }
      )
    }

    // Ensure the org has a Stripe customer
    let stripeCustomerId = org.stripeCustomerId
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: org.contactEmail,
        name: org.name,
        metadata: { organizationId: org.id },
      })
      stripeCustomerId = customer.id
      await prisma.organization.update({
        where: { id: org.id },
        data: { stripeCustomerId },
      })
    }

    // Check if the customer already has a default payment method
    const customer = await stripe.customers.retrieve(stripeCustomerId) as Stripe.Customer
    const defaultPaymentMethod = customer.invoice_settings?.default_payment_method

    if (defaultPaymentMethod) {
      // Card on file — start subscription immediately
      const subscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: priceId }],
        default_payment_method: typeof defaultPaymentMethod === 'string' ? defaultPaymentMethod : defaultPaymentMethod.id,
        metadata: { organizationId: org.id },
      })

      await prisma.organization.update({
        where: { id: org.id },
        data: {
          stripeSubscriptionId: subscription.id,
          subscriptionStatus: 'active',
          subscriptionStartedAt: new Date(subscription.created * 1000),
          subscriptionRenewsAt: new Date(subscription.current_period_end * 1000),
        },
      })

      await prisma.platformActivityLog.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          activityType: 'subscription_started',
          description: `Subscription manually started for ${org.name} by master admin`,
        },
      })

      const tierLabels: Record<string, string> = {
        starter: 'Chapel', parish: 'Parish', cathedral: 'Cathedral', shrine: 'Shrine', basilica: 'Basilica',
      }
      const tierLabel = tierLabels[org.subscriptionTier] || org.subscriptionTier
      const startAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'
      try {
        await resend.emails.send({
          from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
          reply_to: 'support@chirhoevents.com',
          to: org.contactEmail,
          subject: 'Your ChiRho Events subscription is now active',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1E3A5F;">
              <div style="background: #1E3A5F; padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">ChiRho Events</h1>
              </div>
              <div style="padding: 30px; background: #F5F5F5;">
                <h2>Your subscription is active!</h2>
                <p>Hi ${org.name},</p>
                <p>Your ChiRho Events <strong>${tierLabel}</strong> subscription (${(org.billingCycle ?? 'monthly') === 'annual' ? 'Annual' : 'Monthly'} billing) is now active. You have full access to create and manage events.</p>
                <p>If you have any questions, contact us at <a href="mailto:support@chirhoevents.com" style="color: #1E3A5F;">support@chirhoevents.com</a>.</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${startAppUrl}/dashboard" style="background: #9C8466; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    Go to Your Dashboard
                  </a>
                </div>
              </div>
            </div>
          `,
        })
      } catch (emailErr) {
        console.error('Failed to send subscription start email:', emailErr)
      }

      return NextResponse.json({
        success: true,
        mode: 'immediate',
        message: `Subscription started immediately using saved card.`,
        subscriptionId: subscription.id,
      })
    }

    // No card on file — generate a Stripe Checkout link so they can pay and start the subscription
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard/master-admin/billing?subscription_started=true`,
      cancel_url: `${appUrl}/dashboard/master-admin/billing`,
      metadata: { organizationId: org.id, type: 'subscription_start' },
      subscription_data: {
        metadata: { organizationId: org.id },
      },
    })

    await prisma.platformActivityLog.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        activityType: 'subscription_link_generated',
        description: `Subscription payment link generated for ${org.name} by master admin`,
      },
    })

    return NextResponse.json({
      success: true,
      mode: 'checkout',
      message: 'No card on file. Send this link to the organization to start their subscription.',
      checkoutUrl: session.url,
    })
  } catch (error) {
    console.error('Start subscription error:', error)
    return NextResponse.json({ error: 'Failed to start subscription' }, { status: 500 })
  }
}
