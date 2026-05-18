import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

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

// Get single subscription details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clerkUserId = await getClerkUserIdFromRequest(request)

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

    const { id } = await params

    const organization = await prisma.organization.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        billingCycle: true,
        monthlyFee: true,
        monthlyPrice: true,
        annualPrice: true,
        subscriptionStartedAt: true,
        subscriptionRenewsAt: true,
        setupFeePaid: true,
        setupFeeAmount: true,
        paymentMethodPreference: true,
        eventsUsed: true,
        eventsPerYearLimit: true,
        registrationsUsed: true,
        registrationsLimit: true,
        storageUsedGb: true,
        storageLimitGb: true,
        notes: true,
        status: true,
        contactName: true,
        contactEmail: true,
        createdAt: true,
        pauseReason: true,
        pauseReasonNote: true,
        pausedAt: true,
      },
    })

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get all payments for this org
    const payments = await prisma.payment.findMany({
      where: { organizationId: id },
      orderBy: { createdAt: 'desc' },
    })

    // Get all invoices for this org
    const invoices = await prisma.invoice.findMany({
      where: { organizationId: id },
      orderBy: { createdAt: 'desc' },
    })

    // Get billing notes
    const billingNotes = await prisma.billingNote.findMany({
      where: { organizationId: id },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Type definitions for map operations
    type PaymentType = typeof payments[number]
    type InvoiceType = typeof invoices[number]
    type BillingNoteType = typeof billingNotes[number]

    return NextResponse.json({
      subscription: {
        ...organization,
        monthlyFee: Number(organization.monthlyFee) || Number(organization.monthlyPrice) || 0,
        annualPrice: Number(organization.annualPrice) || 0,
        setupFeeAmount: Number(organization.setupFeeAmount) || 250,
        storageUsedGb: Number(organization.storageUsedGb) || 0,
      },
      payments: payments.map((p: PaymentType) => ({
        ...p,
        amount: Number(p.amount),
        platformFeeAmount: p.platformFeeAmount ? Number(p.platformFeeAmount) : null,
      })),
      invoices: invoices.map((inv: InvoiceType) => ({
        ...inv,
        amount: Number(inv.amount),
      })),
      billingNotes: billingNotes.map((note: BillingNoteType) => ({
        ...note,
        createdByName: `${note.createdBy.firstName} ${note.createdBy.lastName}`,
      })),
    })
  } catch (error) {
    console.error('Get subscription error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    )
  }
}

// Update subscription
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clerkUserId = await getClerkUserIdFromRequest(request)

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

    const { id } = await params
    const body = await request.json()
    const { action, ...updateData } = body

    const organization = await prisma.organization.findUnique({
      where: { id },
      select: { id: true, name: true, subscriptionStatus: true, stripeSubscriptionId: true, billingCycle: true },
    })

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    let updatedOrg

    switch (action) {
      case 'pause':
        const { pauseReason, pauseReasonNote } = updateData
        updatedOrg = await prisma.organization.update({
          where: { id },
          data: {
            subscriptionStatus: 'suspended',
            pauseReason: pauseReason || 'other',
            pauseReasonNote: pauseReasonNote || null,
            pausedAt: new Date(),
          },
        })
        await prisma.platformActivityLog.create({
          data: {
            organizationId: id,
            userId: user.id,
            activityType: 'subscription_paused',
            description: `Subscription paused for ${organization.name}. Reason: ${pauseReason || 'other'}${pauseReasonNote ? ` - ${pauseReasonNote}` : ''}`,
          },
        })
        break

      case 'resume':
        updatedOrg = await prisma.organization.update({
          where: { id },
          data: {
            subscriptionStatus: 'active',
            pauseReason: null,
            pauseReasonNote: null,
            pausedAt: null,
          },
        })
        await prisma.platformActivityLog.create({
          data: {
            organizationId: id,
            userId: user.id,
            activityType: 'subscription_resumed',
            description: `Subscription resumed for ${organization.name}`,
          },
        })
        break

      case 'cancel':
        updatedOrg = await prisma.organization.update({
          where: { id },
          data: {
            subscriptionStatus: 'archived',
            status: 'cancelled',
            cancelledAt: new Date(),
          },
        })
        await prisma.platformActivityLog.create({
          data: {
            organizationId: id,
            userId: user.id,
            activityType: 'subscription_cancelled',
            description: `Subscription cancelled for ${organization.name}`,
          },
        })
        break

      case 'upgrade':
        const { newTier, newBillingCycle } = updateData
        const targetBillingCycle = newBillingCycle || organization.billingCycle || 'monthly'
        const newPriceId = getSubscriptionPriceId(newTier, targetBillingCycle)

        // Update in Stripe if the org has an active subscription
        if (organization.stripeSubscriptionId && newPriceId) {
          const stripeSub = await stripe.subscriptions.retrieve(organization.stripeSubscriptionId)
          const currentItemId = stripeSub.items.data[0]?.id

          if (currentItemId) {
            // Update subscription item — Stripe prorates automatically
            await stripe.subscriptions.update(organization.stripeSubscriptionId, {
              items: [{ id: currentItemId, price: newPriceId }],
              proration_behavior: 'create_prorations',
              metadata: { organizationId: id },
            })
          }
        }

        updatedOrg = await prisma.organization.update({
          where: { id },
          data: {
            subscriptionTier: newTier,
            billingCycle: targetBillingCycle as 'monthly' | 'annual',
          },
        })
        await prisma.platformActivityLog.create({
          data: {
            organizationId: id,
            userId: user.id,
            activityType: 'subscription_upgraded',
            description: `Subscription upgraded to ${newTier} (${targetBillingCycle}) for ${organization.name}`,
          },
        })
        break

      case 'update':
        // General update
        updatedOrg = await prisma.organization.update({
          where: { id },
          data: {
            ...(updateData.notes !== undefined && { notes: updateData.notes }),
            ...(updateData.billingCycle && { billingCycle: updateData.billingCycle }),
            ...(updateData.subscriptionRenewsAt && {
              subscriptionRenewsAt: new Date(updateData.subscriptionRenewsAt),
            }),
          },
        })
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      subscription: updatedOrg,
    })
  } catch (error) {
    console.error('Update subscription error:', error)
    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    )
  }
}
