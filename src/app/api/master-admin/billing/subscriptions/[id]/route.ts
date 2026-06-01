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
        setupFeeAmount: Number(organization.setupFeeAmount) || 349,
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
      select: { id: true, name: true, contactEmail: true, subscriptionStatus: true, stripeSubscriptionId: true, stripeCustomerId: true, billingCycle: true, subscriptionTier: true },
    })

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    let updatedOrg

    switch (action) {
      case 'pause': {
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
        try {
          const pauseAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'
          await resend.emails.send({
            from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
            reply_to: 'support@chirhoevents.com',
            to: organization.contactEmail,
            subject: 'Your ChiRho Events subscription has been suspended',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1E3A5F;">
                <div style="background: #1E3A5F; padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0;">ChiRho Events</h1>
                </div>
                <div style="padding: 30px; background: #F5F5F5;">
                  <h2>Your subscription has been suspended</h2>
                  <p>Hi ${organization.name},</p>
                  <p>Your ChiRho Events subscription has been temporarily suspended.</p>
                  ${pauseReasonNote ? `<p><strong>Reason:</strong> ${pauseReasonNote}</p>` : ''}
                  <p>During this time you will not be able to create new events or accept registrations. Your existing data is safe and will be restored when your subscription is reactivated.</p>
                  <p>If you have questions or believe this was done in error, please contact us at <a href="mailto:support@chirhoevents.com" style="color: #1E3A5F;">support@chirhoevents.com</a>.</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${pauseAppUrl}/dashboard" style="background: #9C8466; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                      View Your Account
                    </a>
                  </div>
                </div>
              </div>
            `,
          })
        } catch (emailErr) {
          console.error('Failed to send pause email:', emailErr)
        }
        break
      }

      case 'resume': {
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
        try {
          const resumeAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'
          await resend.emails.send({
            from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
            reply_to: 'support@chirhoevents.com',
            to: organization.contactEmail,
            subject: 'Your ChiRho Events subscription is active again',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1E3A5F;">
                <div style="background: #1E3A5F; padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0;">ChiRho Events</h1>
                </div>
                <div style="padding: 30px; background: #F5F5F5;">
                  <h2>Your subscription has been reactivated!</h2>
                  <p>Hi ${organization.name},</p>
                  <p>Great news — your ChiRho Events subscription is now active again. You have full access to create events and manage registrations.</p>
                  <p>If you have any questions, contact us at <a href="mailto:support@chirhoevents.com" style="color: #1E3A5F;">support@chirhoevents.com</a>.</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${resumeAppUrl}/dashboard" style="background: #9C8466; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                      Go to Your Dashboard
                    </a>
                  </div>
                </div>
              </div>
            `,
          })
        } catch (emailErr) {
          console.error('Failed to send resume email:', emailErr)
        }
        break
      }

      case 'cancel': {
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
        try {
          await resend.emails.send({
            from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
            reply_to: 'support@chirhoevents.com',
            to: organization.contactEmail,
            subject: 'Your ChiRho Events subscription has been cancelled',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1E3A5F;">
                <div style="background: #1E3A5F; padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0;">ChiRho Events</h1>
                </div>
                <div style="padding: 30px; background: #F5F5F5;">
                  <h2>Your subscription has been cancelled</h2>
                  <p>Hi ${organization.name},</p>
                  <p>Your ChiRho Events subscription has been cancelled. Access to your account has been removed.</p>
                  <p>If you believe this was done in error or would like to reactivate your account in the future, please contact us at <a href="mailto:support@chirhoevents.com" style="color: #1E3A5F;">support@chirhoevents.com</a>.</p>
                  <p>Thank you for using ChiRho Events.</p>
                </div>
              </div>
            `,
          })
        } catch (emailErr) {
          console.error('Failed to send cancellation email:', emailErr)
        }
        break
      }

      case 'upgrade':
        const { newTier, newBillingCycle } = updateData
        const targetBillingCycle = newBillingCycle || organization.billingCycle || 'monthly'
        const newPriceId = getSubscriptionPriceId(newTier, targetBillingCycle)

        if (!newPriceId) {
          return NextResponse.json(
            { error: `No Stripe price configured for ${newTier} ${targetBillingCycle}. Check your STRIPE_PRICE_* environment variables.` },
            { status: 400 }
          )
        }

        // Find the Stripe subscription — either by stored ID or by looking up the customer
        let stripeSubId = organization.stripeSubscriptionId
        if (!stripeSubId && organization.stripeCustomerId) {
          const customerSubs = await stripe.subscriptions.list({
            customer: organization.stripeCustomerId,
            status: 'active',
            limit: 1,
          })
          if (customerSubs.data.length > 0) {
            stripeSubId = customerSubs.data[0].id
            // Save it so we don't have to look it up again
            await prisma.organization.update({
              where: { id },
              data: { stripeSubscriptionId: stripeSubId },
            })
          }
        }

        if (!stripeSubId) {
          return NextResponse.json(
            { error: 'No active Stripe subscription found for this organization. Use "Start Subscription" first.' },
            { status: 400 }
          )
        }

        // Update the subscription in Stripe — automatic proration
        const stripeSub = await stripe.subscriptions.retrieve(stripeSubId)
        const currentItemId = stripeSub.items.data[0]?.id
        if (!currentItemId) {
          return NextResponse.json({ error: 'Could not find subscription item in Stripe' }, { status: 400 })
        }

        await stripe.subscriptions.update(stripeSubId, {
          items: [{ id: currentItemId, price: newPriceId }],
          proration_behavior: 'create_prorations',
          metadata: { organizationId: id },
        })

        const tierLabels: Record<string, string> = {
          chapel: 'Chapel', starter: 'Chapel', parish: 'Parish', cathedral: 'Cathedral', shrine: 'Shrine', basilica: 'Basilica',
        }

        // Update the database
        updatedOrg = await prisma.organization.update({
          where: { id },
          data: {
            subscriptionTier: newTier,
            billingCycle: targetBillingCycle as 'monthly' | 'annual',
            stripeSubscriptionId: stripeSubId,
          },
        })

        // Send upgrade notification email to the org
        const tierLabel = tierLabels[newTier] || newTier
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'
        try {
          await resend.emails.send({
            from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
            reply_to: 'support@chirhoevents.com',
            to: organization.contactEmail,
            subject: `Your ChiRho Events subscription has been upgraded to ${tierLabel}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1E3A5F;">
                <div style="background: #1E3A5F; padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0;">ChiRho Events</h1>
                </div>
                <div style="padding: 30px; background: #F5F5F5;">
                  <h2>Your subscription has been upgraded!</h2>
                  <p>Hi ${organization.name},</p>
                  <p>Your ChiRho Events subscription has been upgraded to the <strong>${tierLabel}</strong> plan (${targetBillingCycle === 'annual' ? 'Annual' : 'Monthly'} billing).</p>
                  <p>Stripe will automatically prorate any difference — you&apos;ll only be charged for the remaining days in your current billing period at the new rate.</p>
                  <p>If you have any questions, reply to this email or contact us at <a href="mailto:support@chirhoevents.com" style="color: #1E3A5F;">support@chirhoevents.com</a>.</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${appUrl}/dashboard" style="background: #9C8466; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                      Go to Your Dashboard
                    </a>
                  </div>
                </div>
              </div>
            `,
          })
        } catch (emailErr) {
          console.error('Failed to send upgrade email:', emailErr)
          // Non-fatal
        }

        await prisma.platformActivityLog.create({
          data: {
            organizationId: id,
            userId: user.id,
            activityType: 'subscription_upgraded',
            description: `Subscription upgraded to ${newTier} (${targetBillingCycle}) for ${organization.name} — Stripe subscription updated`,
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
