import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { generateOrgAdminOnboardingEmail } from '@/emails/org-admin-onboarding'

const resend = new Resend(process.env.RESEND_API_KEY)

// Decode JWT payload to extract user ID when cookies aren't available
function decodeJwtPayload(token: string): { sub?: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = Buffer.from(parts[1], 'base64').toString('utf-8')
    return JSON.parse(payload)
  } catch {
    return null
  }
}

// Helper to get clerk user ID from auth or JWT token
async function getClerkUserId(request: NextRequest): Promise<string | null> {
  // Try to get userId from Clerk's auth (works when cookies are established)
  const authResult = await auth()
  if (authResult.userId) {
    return authResult.userId
  }

  // Fallback: try to get userId from Authorization header (JWT token)
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const payload = decodeJwtPayload(token)
    if (payload?.sub) {
      return payload.sub
    }
  }

  return null
}

export async function GET(request: NextRequest) {
  try {
    const clerkUserId = await getClerkUserId(request)

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
        billingCycle: true,
        annualPrice: true,
        stripeAccountId: true,
        stripeOnboardingCompleted: true,
        createdAt: true,
        users: {
          where: { role: 'org_admin' },
          take: 1,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            clerkUserId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      organizations: organizations.map((org) => {
        const orgAdmin = org.users[0]
        return {
          ...org,
          monthlyFee: Number(org.monthlyFee),
          annualPrice: Number(org.annualPrice) || 0,
          orgAdmin: orgAdmin
            ? {
                id: orgAdmin.id,
                firstName: orgAdmin.firstName,
                lastName: orgAdmin.lastName,
                email: orgAdmin.email,
                isOnboarded: !!orgAdmin.clerkUserId,
              }
            : null,
          users: undefined, // Remove users array from response
        }
      }),
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
    const clerkUserId = await getClerkUserId(request)

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

    // Create or update org admin user
    let orgAdminUser
    try {
      // Check if user with this email already exists
      const existingUser = await prisma.user.findFirst({
        where: { email: contactEmail },
      })

      if (existingUser) {
        // Update existing user to be org admin for this org
        orgAdminUser = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            organizationId: organization.id,
            role: existingUser.role === 'master_admin' ? 'master_admin' : 'org_admin',
          },
        })
        console.log(`Updated existing user ${contactEmail} to org ${organization.id}`)
      } else {
        // Create new user
        orgAdminUser = await prisma.user.create({
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
      }
    } catch (userError) {
      console.error('Error creating/updating org admin user:', userError)
      // Continue anyway - org was created
      orgAdminUser = { id: null, email: contactEmail }
    }

    // Log activity (non-blocking)
    try {
      await prisma.platformActivityLog.create({
        data: {
          organizationId: organization.id,
          userId: masterAdmin.id,
          activityType: 'org_created',
          description: `Organization "${name}" created by Master Admin`,
          metadata: { tier: subscriptionTier, billingCycle },
        },
      })
    } catch (logError) {
      console.error('Error logging activity:', logError)
      // Continue anyway
    }

    // Send onboarding email if requested and user was created
    let emailSent = false
    if (sendWelcomeEmail && orgAdminUser && orgAdminUser.id) {
      try {
        const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'}/invite/${orgAdminUser.id}`

        const emailHtml = generateOrgAdminOnboardingEmail({
          orgName: organization.name,
          orgAdminFirstName: contactFirstName,
          orgAdminEmail: contactEmail,
          inviteLink,
          organizationId: organization.id,
        })

        await resend.emails.send({
          from: 'ChiRho Events <noreply@chirhoevents.com>',
          to: contactEmail,
          subject: `Welcome to ChiRho Events - ${organization.name}`,
          html: emailHtml,
        })

        emailSent = true
        console.log('Onboarding email sent to:', contactEmail)
      } catch (emailError) {
        console.error('Failed to send onboarding email:', emailError)
        // Don't fail the org creation if email fails - we can resend later
      }
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
      emailSent,
    }, { status: 201 })
  } catch (error) {
    console.error('Create organization error:', error)
    return NextResponse.json(
      { error: 'Failed to create organization' },
      { status: 500 }
    )
  }
}
