import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'
import Stripe from 'stripe'
import crypto from 'crypto'

const resend = new Resend(process.env.RESEND_API_KEY!)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

// Helper function to get next invoice number
async function getNextInvoiceNumber(): Promise<number> {
  const lastInvoice = await prisma.invoice.findFirst({
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true },
  })
  return (lastInvoice?.invoiceNumber || 1000) + 1
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const clerkUserId = await getClerkUserIdFromRequest(request)

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify master admin
    const masterAdmin = await prisma.user.findFirst({
      where: { clerkUserId },
      select: { id: true, role: true },
    })

    if (!masterAdmin || masterAdmin.role !== 'master_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { requestId } = await params

    // Get the onboarding request
    const onboardingRequest = await prisma.organizationOnboardingRequest.findUnique({
      where: { id: requestId },
    })

    if (!onboardingRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    if (onboardingRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Request has already been processed' },
        { status: 400 }
      )
    }

    // Tier pricing
    const tierPricing: Record<string, { monthly: number; annual: number; eventsLimit: number; registrationsLimit: number; storageLimit: number }> = {
      starter: { monthly: 29, annual: 290, eventsLimit: 3, registrationsLimit: 500, storageLimit: 5 },
      small_diocese: { monthly: 49, annual: 490, eventsLimit: 5, registrationsLimit: 1000, storageLimit: 10 },
      growing: { monthly: 89, annual: 900, eventsLimit: 10, registrationsLimit: 2000, storageLimit: 25 },
      conference: { monthly: 120, annual: 1200, eventsLimit: 20, registrationsLimit: 4000, storageLimit: 100 },
      enterprise: { monthly: 199, annual: 1990, eventsLimit: -1, registrationsLimit: -1, storageLimit: 500 },
    }

    const requestedTier = onboardingRequest.requestedTier || 'shrine'
    const pricing = tierPricing[requestedTier] || tierPricing.shrine
    const billingCycle = onboardingRequest.billingCyclePreference || 'annual'

    // Create Stripe customer first so we can link it to the org
    let stripeCustomerId: string | undefined
    try {
      const customer = await stripe.customers.create({
        email: onboardingRequest.contactEmail,
        name: onboardingRequest.organizationName,
        metadata: { contact: `${onboardingRequest.contactFirstName} ${onboardingRequest.contactLastName}` },
      })
      stripeCustomerId = customer.id
    } catch (stripeError) {
      console.error('Failed to create Stripe customer:', stripeError)
      // Non-fatal — approval continues without Stripe customer
    }

    // Create organization
    const organization = await prisma.organization.create({
      data: {
        name: onboardingRequest.organizationName,
        type: (onboardingRequest.organizationType as 'diocese' | 'archdiocese' | 'parish' | 'seminary' | 'retreat_center' | 'other') || 'parish',
        contactName: `${onboardingRequest.contactFirstName} ${onboardingRequest.contactLastName}`,
        contactEmail: onboardingRequest.contactEmail,
        contactPhone: onboardingRequest.contactPhone,
        address: onboardingRequest.billingAddress ? { street: onboardingRequest.billingAddress } : undefined,
        subscriptionTier: requestedTier as 'starter' | 'parish' | 'shrine' | 'cathedral' | 'basilica',
        subscriptionStatus: 'active',
        status: 'active',
        billingCycle: billingCycle as 'monthly' | 'annual',
        monthlyFee: billingCycle === 'monthly' ? pricing.monthly : Math.round(pricing.annual / 12),
        monthlyPrice: pricing.monthly,
        annualPrice: pricing.annual,
        eventsPerYearLimit: pricing.eventsLimit === -1 ? null : pricing.eventsLimit,
        registrationsLimit: pricing.registrationsLimit === -1 ? null : pricing.registrationsLimit,
        storageLimitGb: pricing.storageLimit,
        setupFeePaid: false,
        setupFeeAmount: 250,
        paymentMethodPreference: onboardingRequest.paymentMethodPreference || 'credit_card',
        legalEntityName: onboardingRequest.legalEntityName,
        taxId: onboardingRequest.taxId,
        website: onboardingRequest.website,
        primaryColor: '#1E3A5F',
        secondaryColor: '#9C8466',
        modulesEnabled: { poros: true, salve: true, rapha: true },
        createdByUserId: masterAdmin.id,
        subscriptionStartedAt: new Date(),
        subscriptionRenewsAt: new Date(Date.now() + (billingCycle === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000),
        stripeCustomerId: stripeCustomerId,
      },
    })

    // Tag the Stripe customer with the org ID now that we have it
    if (stripeCustomerId) {
      await stripe.customers.update(stripeCustomerId, {
        metadata: { organizationId: organization.id },
      }).catch((err: unknown) => console.error('Failed to update Stripe customer metadata:', err))
    }

    // Create org admin user
    const orgAdminUser = await prisma.user.create({
      data: {
        firstName: onboardingRequest.contactFirstName,
        lastName: onboardingRequest.contactLastName,
        email: onboardingRequest.contactEmail,
        phone: onboardingRequest.contactPhone,
        role: 'org_admin',
        organizationId: organization.id,
        createdBy: masterAdmin.id,
      },
    })

    // Update onboarding request
    await prisma.organizationOnboardingRequest.update({
      where: { id: requestId },
      data: {
        status: 'approved',
        approvedByUserId: masterAdmin.id,
        approvedAt: new Date(),
        createdOrganizationId: organization.id,
      },
    })

    // Log activity
    await prisma.platformActivityLog.create({
      data: {
        organizationId: organization.id,
        userId: masterAdmin.id,
        activityType: 'org_approved',
        description: `Organization "${organization.name}" approved from application`,
      },
    })

    // Generate setup fee invoice with a secure payment token for the direct payment link
    const setupFeePaymentToken = crypto.randomBytes(32).toString('hex')
    const invoice = await prisma.invoice.create({
      data: {
        organizationId: organization.id,
        invoiceNumber: await getNextInvoiceNumber(),
        invoiceType: 'setup_fee',
        amount: 250,
        description: 'One-time setup fee for ChiRho Events platform',
        status: 'pending',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        paymentToken: setupFeePaymentToken,
      },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'
    const setupFeePaymentUrl = `${appUrl}/pay/invoice/${setupFeePaymentToken}`

    // Send welcome email
    const tierLabels: Record<string, string> = {
      starter: 'Starter',
      parish: 'Parish',
      shrine: 'Shrine',
      cathedral: 'Cathedral',
      basilica: 'Basilica',
    }

    const welcomeEmailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #1E3A5F; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: #1E3A5F; color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { padding: 30px; background: #F5F5F5; }
            .welcome-box { background: white; border: 2px solid #9C8466; border-radius: 8px; padding: 25px; margin: 20px 0; }
            .cta-button { display: inline-block; background: #9C8466; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 0; }
            .info-row { padding: 10px 0; border-bottom: 1px solid #E5E7EB; }
            .info-row:last-child { border-bottom: none; }
            .footer { text-align: center; padding: 20px; color: #6B7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to ChiRho Events!</h1>
            </div>

            <div class="content">
              <p>Dear ${onboardingRequest.contactFirstName},</p>

              <p>Great news! Your organization <strong>${organization.name}</strong> has been approved and your ChiRho Events account is now active.</p>

              <div class="welcome-box">
                <h2 style="color: #1E3A5F; margin-top: 0;">Your Account Details</h2>

                <div class="info-row">
                  <strong>Organization:</strong> ${organization.name}
                </div>
                <div class="info-row">
                  <strong>Subscription Plan:</strong> ${tierLabels[requestedTier] || requestedTier}
                </div>
                <div class="info-row">
                  <strong>Billing Cycle:</strong> ${billingCycle === 'annual' ? 'Annual' : 'Monthly'}
                </div>
                <div class="info-row">
                  <strong>Admin Email:</strong> ${onboardingRequest.contactEmail}
                </div>
              </div>

              <h3 style="color: #1E3A5F;">Next Steps:</h3>
              <ol>
                <li><strong>Pay your setup fee:</strong> Click the button below to pay the one-time $250 setup fee. Your monthly subscription will start automatically after payment.</li>
                <li><strong>Set up your password:</strong> Sign in to create your account password and access your dashboard.</li>
                <li><strong>Connect Stripe:</strong> Set up your payment processing to accept registrations.</li>
                <li><strong>Create your first event:</strong> Start building your event and accepting registrations!</li>
              </ol>

              <div style="background: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <strong>Setup Fee:</strong> A $250 one-time setup fee is due within 30 days. After you pay, your ${tierLabels[requestedTier] || requestedTier} subscription ($${pricing.monthly}/month) will begin automatically — no further action needed.
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${setupFeePaymentUrl}" class="cta-button">
                  Pay $250 Setup Fee
                </a>
              </div>

              <div style="text-align: center; margin: 10px 0;">
                <a href="${appUrl}/sign-in" style="color: #1E3A5F; font-size: 14px;">
                  Or sign in to your dashboard →
                </a>
              </div>

              <p>If you have any questions, our support team is here to help. Just reply to this email or submit a support ticket from your dashboard.</p>

              <p>
                Welcome aboard!<br>
                <strong>The ChiRho Events Team</strong>
              </p>
            </div>

            <div class="footer">
              <p>ChiRho Events - Event Management for Faith Communities</p>
              <p>www.chirhoevents.com | support@chirhoevents.com</p>
            </div>
          </div>
        </body>
      </html>
    `

    try {
      await resend.emails.send({
        from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
        reply_to: 'support@chirhoevents.com',
        to: onboardingRequest.contactEmail,
        subject: `Welcome to ChiRho Events - ${organization.name} Account Approved!`,
        html: welcomeEmailHtml,
      })
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError)
      // Don't fail the approval if email fails
    }

    return NextResponse.json({
      success: true,
      organization: {
        id: organization.id,
        name: organization.name,
      },
      user: {
        id: orgAdminUser.id,
        email: orgAdminUser.email,
      },
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
      },
    })
  } catch (error) {
    console.error('Approve request error:', error)
    return NextResponse.json(
      { error: 'Failed to approve request' },
      { status: 500 }
    )
  }
}
