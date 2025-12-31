import { NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the effective org ID (handles impersonation)
    const organizationId = await getEffectiveOrgId(user)

    // Get organization with subscription and usage data
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        subscriptionTier: true,
        subscriptionStatus: true,
        billingCycle: true,
        monthlyPrice: true,
        annualPrice: true,
        monthlyFee: true,
        subscriptionStartedAt: true,
        subscriptionRenewsAt: true,
        eventsUsed: true,
        eventsPerYearLimit: true,
        registrationsUsed: true,
        registrationsLimit: true,
        storageUsedGb: true,
        storageLimitGb: true,
      },
    })

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get invoices for this organization
    const invoices = await prisma.invoice.findMany({
      where: { organizationId: organizationId },
      select: {
        id: true,
        invoiceNumber: true,
        invoiceType: true,
        amount: true,
        status: true,
        dueDate: true,
        paidAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20, // Last 20 invoices
    })

    return NextResponse.json({
      subscription: {
        tier: organization.subscriptionTier,
        status: organization.subscriptionStatus,
        billingCycle: organization.billingCycle || 'annual',
        monthlyPrice: Number(organization.monthlyPrice) || Number(organization.monthlyFee) || 0,
        annualPrice: Number(organization.annualPrice) || 0,
        startedAt: organization.subscriptionStartedAt,
        renewsAt: organization.subscriptionRenewsAt,
      },
      usage: {
        eventsUsed: organization.eventsUsed,
        eventsLimit: organization.eventsPerYearLimit,
        registrationsUsed: organization.registrationsUsed,
        registrationsLimit: organization.registrationsLimit,
        storageUsedGb: Number(organization.storageUsedGb),
        storageLimitGb: organization.storageLimitGb,
      },
      invoices: invoices.map((inv: typeof invoices[0]) => ({
        ...inv,
        amount: Number(inv.amount),
      })),
    })
  } catch (error) {
    console.error('Billing data error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch billing data' },
      { status: 500 }
    )
  }
}
