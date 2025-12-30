import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify master admin
    const user = await prisma.user.findFirst({
      where: { clerkUserId },
      select: { role: true },
    })

    if (!user || user.role !== 'master_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const tier = searchParams.get('tier')

    const where: Record<string, unknown> = {}
    if (status && status !== 'all') {
      where.status = status
    }
    if (tier && tier !== 'all') {
      where.subscriptionTier = tier
    }

    const organizations = await prisma.organization.findMany({
      where,
      select: {
        id: true,
        name: true,
        type: true,
        contactName: true,
        contactEmail: true,
        contactPhone: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        status: true,
        eventsUsed: true,
        eventsPerYearLimit: true,
        registrationsUsed: true,
        registrationsLimit: true,
        monthlyFee: true,
        stripeAccountId: true,
        stripeOnboardingCompleted: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      organizations: organizations.map((org: typeof organizations[0]) => ({
        ...org,
        monthlyFee: Number(org.monthlyFee),
      })),
    })
  } catch (error) {
    console.error('Organizations list error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organizations' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()

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

    const body = await request.json()
    const {
      name,
      type,
      contactFirstName,
      contactLastName,
      contactEmail,
      contactPhone,
      subscriptionTier,
      billingCycle,
      paymentMethod,
      setupFeeWaived,
      setupFeePaid,
      legalEntityName,
      taxId,
      billingAddress,
      website,
      primaryColor,
      secondaryColor,
      modulesEnabled,
      notes,
      sendWelcomeEmail,
      sendStripeOnboarding,
    } = body

    // Tier pricing
    const tierPricing: Record<string, { monthly: number; annual: number; eventsLimit: number; registrationsLimit: number; storageLimit: number }> = {
      starter: { monthly: 49, annual: 490, eventsLimit: 3, registrationsLimit: 500, storageLimit: 5 },
      small_diocese: { monthly: 99, annual: 990, eventsLimit: 5, registrationsLimit: 1000, storageLimit: 10 },
      growing: { monthly: 149, annual: 1490, eventsLimit: 10, registrationsLimit: 3000, storageLimit: 25 },
      conference: { monthly: 249, annual: 2490, eventsLimit: 25, registrationsLimit: 8000, storageLimit: 100 },
      enterprise: { monthly: 499, annual: 4990, eventsLimit: -1, registrationsLimit: -1, storageLimit: 500 },
      test: { monthly: 0, annual: 0, eventsLimit: 3, registrationsLimit: 100, storageLimit: 1 },
    }

    const pricing = tierPricing[subscriptionTier] || tierPricing.starter

    // Create organization
    const organization = await prisma.organization.create({
      data: {
        name,
        type: type || 'parish',
        contactName: `${contactFirstName} ${contactLastName}`,
        contactEmail,
        contactPhone,
        address: billingAddress ? { street: billingAddress } : undefined,
        subscriptionTier: subscriptionTier || 'starter',
        subscriptionStatus: 'active',
        status: 'active',
        billingCycle: billingCycle || 'annual',
        monthlyFee: billingCycle === 'monthly' ? pricing.monthly : Math.round(pricing.annual / 12),
        monthlyPrice: pricing.monthly,
        annualPrice: pricing.annual,
        eventsPerYearLimit: pricing.eventsLimit === -1 ? null : pricing.eventsLimit,
        registrationsLimit: pricing.registrationsLimit === -1 ? null : pricing.registrationsLimit,
        storageLimitGb: pricing.storageLimit,
        setupFeePaid: setupFeeWaived || setupFeePaid || false,
        setupFeeAmount: setupFeeWaived ? 0 : 250,
        paymentMethodPreference: paymentMethod || 'credit_card',
        legalEntityName,
        taxId,
        website,
        primaryColor: primaryColor || '#1E3A5F',
        secondaryColor: secondaryColor || '#9C8466',
        modulesEnabled: modulesEnabled || { poros: true, salve: true, rapha: true },
        notes,
        createdByUserId: masterAdmin.id,
        subscriptionStartedAt: new Date(),
        subscriptionRenewsAt: new Date(Date.now() + (billingCycle === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000),
      },
    })

    // Create org admin user
    const orgAdminUser = await prisma.user.create({
      data: {
        firstName: contactFirstName,
        lastName: contactLastName,
        email: contactEmail,
        phone: contactPhone,
        role: 'org_admin',
        organizationId: organization.id,
        createdBy: masterAdmin.id,
      },
    })

    // Log activity
    await prisma.platformActivityLog.create({
      data: {
        organizationId: organization.id,
        userId: masterAdmin.id,
        activityType: 'org_created',
        description: `Organization "${name}" created by Master Admin`,
        metadata: { tier: subscriptionTier, billingCycle },
      },
    })

    // TODO: Send welcome email if sendWelcomeEmail is true
    // TODO: Send Stripe onboarding email if sendStripeOnboarding is true

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
    }, { status: 201 })
  } catch (error) {
    console.error('Create organization error:', error)
    return NextResponse.json(
      { error: 'Failed to create organization' },
      { status: 500 }
    )
  }
}
