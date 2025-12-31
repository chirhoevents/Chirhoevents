import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
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

    const { orgId } = await params

    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        users: {
          where: { role: 'org_admin' },
          take: 1,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        events: {
          select: {
            id: true,
            name: true,
            status: true,
            startDate: true,
            endDate: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: {
          select: {
            events: true,
            groupRegistrations: true,
            individualRegistrations: true,
            payments: true,
          },
        },
      },
    })

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get payment totals
    const paymentTotal = await prisma.payment.aggregate({
      where: {
        organizationId: orgId,
        paymentStatus: 'succeeded',
      },
      _sum: { amount: true },
    })

    return NextResponse.json({
      organization: {
        ...organization,
        monthlyFee: Number(organization.monthlyFee),
        monthlyPrice: Number(organization.monthlyPrice || 0),
        annualPrice: Number(organization.annualPrice || 0),
        setupFeeAmount: Number(organization.setupFeeAmount),
        platformFeePercentage: Number(organization.platformFeePercentage),
        reactivationFee: Number(organization.reactivationFee),
        storageUsedGb: Number(organization.storageUsedGb),
        totalPayments: Number(paymentTotal._sum.amount || 0),
        totalRegistrations: organization._count.groupRegistrations + organization._count.individualRegistrations,
      },
    })
  } catch (error) {
    console.error('Organization detail error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organization' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
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

    const { orgId } = await params
    const body = await request.json()

    // Helper to convert empty strings to null for optional fields
    const toNullable = (value: string | null | undefined): string | null => {
      if (value === undefined || value === null || value === '') return null
      return value
    }

    // Build update data, only including defined fields
    const updateData: Record<string, unknown> = {}

    if (body.name !== undefined) updateData.name = body.name
    if (body.type !== undefined) updateData.type = body.type
    if (body.contactName !== undefined) updateData.contactName = toNullable(body.contactName)
    if (body.contactEmail !== undefined) updateData.contactEmail = body.contactEmail
    if (body.contactPhone !== undefined) updateData.contactPhone = toNullable(body.contactPhone)
    if (body.subscriptionTier !== undefined) updateData.subscriptionTier = body.subscriptionTier
    if (body.billingCycle !== undefined) updateData.billingCycle = body.billingCycle
    if (body.monthlyFee !== undefined) updateData.monthlyFee = body.monthlyFee
    if (body.monthlyPrice !== undefined) updateData.monthlyPrice = body.monthlyPrice
    if (body.annualPrice !== undefined) updateData.annualPrice = body.annualPrice
    if (body.eventsLimit !== undefined) {
      // Handle -1 as unlimited (null in DB)
      updateData.eventsPerYearLimit = body.eventsLimit === -1 ? null : body.eventsLimit
    }
    if (body.registrationsLimit !== undefined) {
      // Handle -1 as unlimited (null in DB)
      updateData.registrationsLimit = body.registrationsLimit === -1 ? null : body.registrationsLimit
    }
    if (body.storageLimitGb !== undefined) updateData.storageLimitGb = body.storageLimitGb
    if (body.setupFeePaid !== undefined) updateData.setupFeePaid = body.setupFeePaid
    if (body.setupFeeAmount !== undefined) updateData.setupFeeAmount = body.setupFeeAmount
    if (body.status !== undefined) updateData.status = body.status
    if (body.primaryColor !== undefined) updateData.primaryColor = toNullable(body.primaryColor)
    if (body.secondaryColor !== undefined) updateData.secondaryColor = toNullable(body.secondaryColor)
    if (body.modulesEnabled !== undefined) updateData.modulesEnabled = body.modulesEnabled
    if (body.notes !== undefined) updateData.notes = toNullable(body.notes)
    if (body.legalEntityName !== undefined) updateData.legalEntityName = toNullable(body.legalEntityName)
    if (body.taxId !== undefined) updateData.taxId = toNullable(body.taxId)
    if (body.website !== undefined) updateData.website = toNullable(body.website)
    if (body.paymentMethod !== undefined) updateData.paymentMethodPreference = body.paymentMethod
    if (body.platformFeePercentage !== undefined) updateData.platformFeePercentage = body.platformFeePercentage

    const organization = await prisma.organization.update({
      where: { id: orgId },
      data: updateData,
    })

    // Log activity
    await prisma.platformActivityLog.create({
      data: {
        organizationId: orgId,
        userId: masterAdmin.id,
        activityType: 'org_updated',
        description: `Organization "${organization.name}" updated by Master Admin`,
      },
    })

    return NextResponse.json({ success: true, organization })
  } catch (error) {
    console.error('Update organization error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to update organization', details: errorMessage },
      { status: 500 }
    )
  }
}
