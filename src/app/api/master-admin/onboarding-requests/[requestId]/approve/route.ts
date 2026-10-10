import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from '@/lib/resend'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'
import Stripe from 'stripe'
import crypto from 'crypto'
import { SUBSCRIPTION_TIERS, getTier } from '@/lib/subscription-tiers'
import { generateOrgAdminOnboardingEmail, type OnboardingBilling } from '@/emails/org-admin-onboarding'

const ORG_TYPES = ['diocese', 'archdiocese', 'parish', 'seminary', 'retreat_center', 'other']

/** The applicant asked for Lux (alone or with larger events) on the Get Started form */
function wantsLux(needs: unknown): boolean {
  const kind = needs && typeof needs === 'object' ? (needs as { kind?: unknown }).kind : null
  return kind === 'lux' || kind === 'both'
}

const resend = new Resend(process.env.RESEND_API_KEY!)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

// Helper function to get next invoice number
// (pass the transaction client when called inside one)
async function getNextInvoiceNumber(db: Pick<typeof prisma, 'invoice'> = prisma): Promise<number> {
  const lastInvoice = await db.invoice.findFirst({
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
      select: { id: true, role: true, firstName: true, lastName: true },
    })

    if (!masterAdmin || masterAdmin.role !== 'master_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { requestId } = await params

    // Options chosen in the approval dialog. All optional, so an empty body
    // approves with the defaults below.
    const body = await request.json().catch(() => ({}))
    const welcomeMessage: string | null =
      typeof body.welcomeMessage === 'string' && body.welcomeMessage.trim() ? body.welcomeMessage.trim() : null
    const billingNote: string | null =
      typeof body.billingNote === 'string' && body.billingNote.trim() ? body.billingNote.trim() : null

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

    // Tier pricing — sourced from centralized SUBSCRIPTION_TIERS so this
    // matches the landing page and master admin org creator.
    const tierPricing: Record<string, { monthly: number; annual: number; setupFee: number; eventsLimit: number; registrationsLimit: number; storageLimit: number }> =
      Object.fromEntries(
        Object.values(SUBSCRIPTION_TIERS).map(tier => [
          tier.key,
          {
            monthly: tier.monthlyPrice,
            annual: tier.annualPrice ?? tier.monthlyPrice * 12,
            // setupFee=null (Basilica) defaults to 0 here — set the real
            // custom amount manually on the org.
            setupFee: tier.setupFee ?? 0,
            eventsLimit: tier.eventsPerYear ?? -1,
            registrationsLimit: tier.maxPeoplePerYear ?? -1,
            storageLimit: tier.storageGb,
          },
        ])
      )

    const requestedTier = onboardingRequest.requestedTier || 'shrine'
    const pricing = { ...(tierPricing[requestedTier] || tierPricing.shrine) }

    // 'online' emails a link to pay the setup fee by card, after which the
    // Stripe subscription starts on its own. 'manual' means the master admin
    // invoices this org by hand (e.g. an annual check), so nothing Stripe-related
    // is created or sent.
    const billingMode: 'online' | 'manual' =
      body.billingMode === 'online' || body.billingMode === 'manual'
        ? body.billingMode
        : onboardingRequest.paymentMethodPreference === 'check'
          ? 'manual'
          : 'online'

    let billingCycle: 'monthly' | 'annual' =
      body.billingCycle === 'monthly' || body.billingCycle === 'annual'
        ? body.billingCycle
        : onboardingRequest.billingCyclePreference || 'annual'
    // Online payment starts a Stripe subscription, which only exists for the
    // cycles the tier offers. Manual billing can use either cycle.
    const tierBillingOptions = getTier(requestedTier)?.billingOptions
    if (billingMode === 'online' && tierBillingOptions && !tierBillingOptions.includes(billingCycle)) {
      billingCycle = tierBillingOptions[0]
    }

    // Manual billing can carry a negotiated price for the chosen cycle
    const customPrice = Number(body.subscriptionPrice)
    if (billingMode === 'manual' && Number.isFinite(customPrice) && customPrice > 0) {
      if (billingCycle === 'annual') pricing.annual = customPrice
      else pricing.monthly = customPrice
    }

    // The setup fee invoice is always created for online billing (the email
    // links to it). For manual billing it's optional and never emailed.
    const createSetupInvoice = billingMode === 'online' || body.createSetupInvoice !== false

    // Self-serve tiers (Chapel, Parish) charge "Basic Access Fee" instead of "Setup Fee"
    const isSelfServeTier = requestedTier === 'chapel' || requestedTier === 'starter' || requestedTier === 'parish'
    const feeLabel = isSelfServeTier ? 'Basic Access Fee' : 'Setup Fee'

    // The applicant may already have a ChiRho login: anyone who signs up on
    // the site gets a user record, and emails are unique. Reuse that record
    // unless it already belongs to an organization.
    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: onboardingRequest.contactEmail, mode: 'insensitive' } },
      include: { organization: { select: { name: true } } },
    })
    if (existingUser?.role === 'master_admin') {
      return NextResponse.json(
        { error: `${onboardingRequest.contactEmail} belongs to a master admin, so it can't be this organization's admin. Ask the applicant for a different email address.` },
        { status: 409 }
      )
    }
    if (existingUser?.organizationId) {
      return NextResponse.json(
        { error: `${onboardingRequest.contactEmail} already has a ChiRho login for ${existingUser.organization?.name ?? 'another organization'}. Ask the applicant for a different email address before approving.` },
        { status: 409 }
      )
    }

    // An approval that failed partway used to create the organization and
    // then stop, leaving an empty copy that blocks every retry (contact emails
    // are unique). Pick that copy up instead of creating a new one. Any other
    // organization using this contact email is a real conflict.
    const orgWithContactEmail = await prisma.organization.findFirst({
      where: { contactEmail: { equals: onboardingRequest.contactEmail, mode: 'insensitive' } },
      select: {
        id: true,
        name: true,
        createdAt: true,
        stripeCustomerId: true,
        _count: { select: { users: true, events: true, invoices: true } },
      },
    })
    const isLeftoverFromFailedApproval =
      !!orgWithContactEmail &&
      orgWithContactEmail.createdAt >= onboardingRequest.createdAt &&
      orgWithContactEmail._count.users === 0 &&
      orgWithContactEmail._count.events === 0 &&
      orgWithContactEmail._count.invoices === 0
    if (orgWithContactEmail && !isLeftoverFromFailedApproval) {
      return NextResponse.json(
        { error: `${orgWithContactEmail.name} already uses ${onboardingRequest.contactEmail} as its contact email. Ask the applicant for a different email address, or change that organization's contact email first.` },
        { status: 409 }
      )
    }
    const reusedOrg = isLeftoverFromFailedApproval ? orgWithContactEmail : null

    // Create Stripe customer first so we can link it to the org. Manually
    // billed orgs skip this: invoice checkout falls back to the contact email,
    // and without a customer the Stripe webhook won't auto-start a card
    // subscription if they ever pay a setup fee online.
    let stripeCustomerId: string | null = null
    if (billingMode === 'online') {
      stripeCustomerId = reusedOrg?.stripeCustomerId ?? null
      if (!stripeCustomerId) {
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
      }
    }

    const organizationData = {
      name: onboardingRequest.organizationName,
      // The form also offers ministry and school, which organizations store as "other"
      type: (ORG_TYPES.includes(onboardingRequest.organizationType ?? '')
        ? onboardingRequest.organizationType
        : onboardingRequest.organizationType ? 'other' : 'parish') as 'diocese' | 'archdiocese' | 'parish' | 'seminary' | 'retreat_center' | 'other',
      contactName: `${onboardingRequest.contactFirstName} ${onboardingRequest.contactLastName}`,
      contactEmail: onboardingRequest.contactEmail,
      contactPhone: onboardingRequest.contactPhone,
      address: onboardingRequest.billingAddress ? { street: onboardingRequest.billingAddress } : undefined,
      subscriptionTier: requestedTier as 'chapel' | 'parish' | 'shrine' | 'cathedral' | 'basilica',
      subscriptionStatus: 'active' as const,
      status: 'active' as const,
      billingCycle,
      monthlyFee: billingCycle === 'monthly' ? pricing.monthly : Math.round(pricing.annual / 12),
      monthlyPrice: pricing.monthly,
      annualPrice: pricing.annual,
      eventsPerYearLimit: pricing.eventsLimit === -1 ? null : pricing.eventsLimit,
      registrationsLimit: pricing.registrationsLimit === -1 ? null : pricing.registrationsLimit,
      storageLimitGb: pricing.storageLimit,
      setupFeePaid: false,
      setupFeeAmount: pricing.setupFee,
      paymentMethodPreference: billingMode === 'manual' ? 'check' as const : onboardingRequest.paymentMethodPreference || 'credit_card' as const,
      legalEntityName: onboardingRequest.legalEntityName,
      taxId: onboardingRequest.taxId,
      website: onboardingRequest.website,
      primaryColor: '#1E3A5F',
      secondaryColor: '#9C8466',
      // Access comes from the plan's defaults. Someone who asked for Lux on a
      // larger plan (where it's off by default) gets it turned on. The master
      // admin can change modules per org from the master admin board.
      modulesEnabled: wantsLux(onboardingRequest.needs) && !getTier(requestedTier)?.features.lux ? { lux: true } : {},
      createdByUserId: masterAdmin.id,
      subscriptionStartedAt: new Date(),
      subscriptionRenewsAt: new Date(Date.now() + (billingCycle === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000),
      stripeCustomerId,
    }

    // Display labels for tier keys (used in invoice description).
    const tierLabels: Record<string, string> = {
      chapel: 'Chapel',
      starter: 'Chapel', // legacy tier key
      parish: 'Parish',
      shrine: 'Shrine',
      cathedral: 'Cathedral',
      basilica: 'Basilica',
    }

    // Online billing gets a secure payment token for the link in the welcome
    // email; manual billing leaves it off (Send Invoice adds one later if the
    // master admin wants it). Basilica's setup fee is custom (pricing.setupFee
    // falls back to 0 from SUBSCRIPTION_TIERS) — skip auto-invoicing in that
    // case so the master admin can issue a custom invoice manually.
    const setupFeePaymentToken = crypto.randomBytes(32).toString('hex')
    const setupFeeAmount = pricing.setupFee

    // All or nothing, so a failure can't leave a half-approved organization
    const { organization, orgAdminUser, invoice } = await prisma.$transaction(async (tx) => {
      const organization = reusedOrg
        ? await tx.organization.update({ where: { id: reusedOrg.id }, data: organizationData })
        : await tx.organization.create({ data: organizationData })

      const orgAdminUser = existingUser
        ? await tx.user.update({
            where: { id: existingUser.id },
            data: {
              role: 'org_admin',
              organizationId: organization.id,
              firstName: existingUser.firstName || onboardingRequest.contactFirstName,
              lastName: existingUser.lastName || onboardingRequest.contactLastName,
              phone: existingUser.phone || onboardingRequest.contactPhone,
            },
          })
        : await tx.user.create({
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

      await tx.organizationOnboardingRequest.update({
        where: { id: requestId },
        data: {
          status: 'approved',
          approvedByUserId: masterAdmin.id,
          approvedAt: new Date(),
          createdOrganizationId: organization.id,
        },
      })

      await tx.platformActivityLog.create({
        data: {
          organizationId: organization.id,
          userId: masterAdmin.id,
          activityType: 'org_approved',
          description: `Organization "${organization.name}" approved from application`,
        },
      })

      const invoice = createSetupInvoice && setupFeeAmount > 0
        ? await tx.invoice.create({
            data: {
              organizationId: organization.id,
              invoiceNumber: await getNextInvoiceNumber(tx),
              invoiceType: 'setup_fee',
              amount: setupFeeAmount,
              description: `One-time ${feeLabel.toLowerCase()} for ChiRho Events platform (${tierLabels[requestedTier] || requestedTier})`,
              status: 'pending',
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
              paymentToken: billingMode === 'online' ? setupFeePaymentToken : null,
              createdByUserId: masterAdmin.id,
            },
          })
        : null

      return { organization, orgAdminUser, invoice }
    })

    // Tag the Stripe customer with the org ID now that we have it
    if (stripeCustomerId) {
      await stripe.customers.update(stripeCustomerId, {
        metadata: { organizationId: organization.id },
      }).catch((err: unknown) => console.error('Failed to update Stripe customer metadata:', err))
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'

    let billing: OnboardingBilling
    if (billingMode === 'online' && invoice) {
      billing = {
        mode: 'online',
        amount: setupFeeAmount,
        label: feeLabel,
        payUrl: `${appUrl}/pay/invoice/${setupFeePaymentToken}`,
      }
    } else if (billingMode === 'online') {
      billing = {
        mode: 'manual',
        note: billingNote ?? 'Your plan includes custom setup work. Our team will reach out to scope it with you and send your first invoice.',
      }
    } else {
      billing = { mode: 'manual', note: billingNote }
    }

    const welcomeEmailHtml = generateOrgAdminOnboardingEmail({
      orgName: organization.name,
      orgAdminFirstName: orgAdminUser.firstName,
      orgAdminEmail: orgAdminUser.email,
      inviteLink: `${appUrl}/invite/${orgAdminUser.id}`,
      organizationId: organization.id,
      // They already have a login, so step 1 tells them to sign in
      hasAccount: !!orgAdminUser.clerkUserId,
      tierKey: requestedTier,
      billingCycle,
      planPrice: billingCycle === 'annual' ? pricing.annual : pricing.monthly,
      modulesEnabled: organization.modulesEnabled,
      personalMessage: welcomeMessage,
      personalMessageFrom: `${masterAdmin.firstName} ${masterAdmin.lastName}`.trim(),
      billing,
    })

    // The Resend SDK reports most failures in `error` rather than throwing,
    // so check both and tell the master admin what happened.
    let emailError: string | null = null
    try {
      const { error } = await resend.emails.send({
        from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
        reply_to: 'support@chirhoevents.com',
        to: orgAdminUser.email,
        subject: `Welcome to ChiRho Events: ${organization.name} is approved`,
        html: welcomeEmailHtml,
      })
      if (error) emailError = error.message
    } catch (sendError) {
      emailError = sendError instanceof Error ? sendError.message : 'Unknown error'
    }
    if (emailError) {
      console.error('Failed to send welcome email:', emailError)
      // Don't fail the approval if email fails; it can be resent from the org page
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
      invoice: invoice
        ? {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
          }
        : null,
      emailSent: !emailError,
      emailError,
      sentTo: orgAdminUser.email,
      usedExistingLogin: !!orgAdminUser.clerkUserId,
      reusedOrganization: !!reusedOrg,
    })
  } catch (error) {
    console.error('Approve request error:', error)
    return NextResponse.json(
      {
        error: 'Failed to approve request',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
