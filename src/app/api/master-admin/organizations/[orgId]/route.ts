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

    const organization = await prisma.organization.update({
      where: { id: orgId },
      data: {
        name: body.name,
        type: body.type,
        contactName: body.contactName,
        contactEmail: body.contactEmail,
        contactPhone: body.contactPhone,
        subscriptionTier: body.subscriptionTier,
        billingCycle: body.billingCycle,
        monthlyFee: body.monthlyFee,
        monthlyPrice: body.monthlyPrice,
        annualPrice: body.annualPrice,
        eventsPerYearLimit: body.eventsLimit,
        registrationsLimit: body.registrationsLimit,
        storageLimitGb: body.storageLimitGb,
        setupFeePaid: body.setupFeePaid,
        setupFeeAmount: body.setupFeeAmount,
        status: body.status,
        primaryColor: body.primaryColor,
        secondaryColor: body.secondaryColor,
        modulesEnabled: body.modulesEnabled,
        notes: body.notes,
        legalEntityName: body.legalEntityName,
        taxId: body.taxId,
        website: body.website,
        paymentMethodPreference: body.paymentMethod,
      },
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
    return NextResponse.json(
      { error: 'Failed to update organization' },
      { status: 500 }
    )
  }
}
