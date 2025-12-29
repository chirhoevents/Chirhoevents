import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
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
      starter: { monthly: 49, annual: 490, eventsLimit: 3, registrationsLimit: 500, storageLimit: 5 },
      small_diocese: { monthly: 99, annual: 990, eventsLimit: 5, registrationsLimit: 1000, storageLimit: 10 },
      growing: { monthly: 149, annual: 1490, eventsLimit: 10, registrationsLimit: 3000, storageLimit: 25 },
      conference: { monthly: 249, annual: 2490, eventsLimit: 25, registrationsLimit: 8000, storageLimit: 100 },
      enterprise: { monthly: 499, annual: 4990, eventsLimit: -1, registrationsLimit: -1, storageLimit: 500 },
    }

    const requestedTier = onboardingRequest.requestedTier || 'growing'
    const pricing = tierPricing[requestedTier] || tierPricing.growing
    const billingCycle = onboardingRequest.billingCyclePreference || 'annual'

    // Create organization
    const organization = await prisma.organization.create({
      data: {
        name: onboardingRequest.organizationName,
        type: (onboardingRequest.organizationType as 'diocese' | 'archdiocese' | 'parish' | 'seminary' | 'ministry' | 'retreat_center' | 'school' | 'other') || 'parish',
        contactName: `${onboardingRequest.contactFirstName} ${onboardingRequest.contactLastName}`,
        contactEmail: onboardingRequest.contactEmail,
        contactPhone: onboardingRequest.contactPhone,
        address: onboardingRequest.billingAddress ? { street: onboardingRequest.billingAddress } : null,
        subscriptionTier: requestedTier as 'starter' | 'small_diocese' | 'growing' | 'conference' | 'enterprise',
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
      },
    })

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

    // TODO: Send welcome email with login info
    // TODO: Send Stripe onboarding email if card payment
    // TODO: Generate setup fee invoice

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
    })
  } catch (error) {
    console.error('Approve request error:', error)
    return NextResponse.json(
      { error: 'Failed to approve request' },
      { status: 500 }
    )
  }
}
