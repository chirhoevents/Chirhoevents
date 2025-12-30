import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const { userId: clerkUserId } = await auth()

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

    // Get all active organizations
    const organizations = await prisma.organization.findMany({
      where: {
        status: 'active',
        subscriptionStatus: 'active',
      },
      select: {
        id: true,
        name: true,
        subscriptionTier: true,
        billingCycle: true,
        monthlyFee: true,
        monthlyPrice: true,
        annualPrice: true,
        setupFeePaid: true,
        setupFeeAmount: true,
        subscriptionStartedAt: true,
        createdAt: true,
      },
    })

    type OrgType = typeof organizations[0]

    // Calculate MRR
    let mrr = 0
    organizations.forEach((org: OrgType) => {
      if (org.billingCycle === 'monthly') {
        mrr += Number(org.monthlyFee) || Number(org.monthlyPrice) || 0
      } else {
        // For annual, convert to monthly equivalent
        mrr += Math.round((Number(org.annualPrice) || 0) / 12)
      }
    })

    // Calculate ARR
    const arr = mrr * 12

    // Revenue by tier
    const tierRevenue: Record<string, { count: number; mrr: number }> = {
      starter: { count: 0, mrr: 0 },
      small_diocese: { count: 0, mrr: 0 },
      growing: { count: 0, mrr: 0 },
      conference: { count: 0, mrr: 0 },
      enterprise: { count: 0, mrr: 0 },
    }

    organizations.forEach((org: OrgType) => {
      const tier = org.subscriptionTier || 'growing'
      if (tierRevenue[tier]) {
        tierRevenue[tier].count++
        if (org.billingCycle === 'monthly') {
          tierRevenue[tier].mrr += Number(org.monthlyFee) || Number(org.monthlyPrice) || 0
        } else {
          tierRevenue[tier].mrr += Math.round((Number(org.annualPrice) || 0) / 12)
        }
      }
    })

    // Billing cycle breakdown
    const monthlyCount = organizations.filter((o: OrgType) => o.billingCycle === 'monthly').length
    const annualCount = organizations.filter((o: OrgType) => o.billingCycle === 'annual').length

    // Setup fees collected
    const setupFeesPaid = organizations.filter((o: OrgType) => o.setupFeePaid).length
    const setupFeesOwed = organizations.filter((o: OrgType) => !o.setupFeePaid).length
    const setupFeesCollected = organizations
      .filter((o: OrgType) => o.setupFeePaid)
      .reduce((sum: number, o: OrgType) => sum + (Number(o.setupFeeAmount) || 250), 0)
    const setupFeesOutstanding = organizations
      .filter((o: OrgType) => !o.setupFeePaid)
      .reduce((sum: number, o: OrgType) => sum + (Number(o.setupFeeAmount) || 250), 0)

    // Get monthly signups for the last 6 months
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const allOrgsWithDates = await prisma.organization.findMany({
      where: {
        createdAt: { gte: sixMonthsAgo },
      },
      select: {
        createdAt: true,
        subscriptionTier: true,
      },
    })

    type OrgWithDate = typeof allOrgsWithDates[0]

    const monthlySignups: { month: string; count: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthStr = date.toLocaleString('default', { month: 'short', year: 'numeric' })

      const count = allOrgsWithDates.filter((org: OrgWithDate) => {
        const orgDate = new Date(org.createdAt)
        return (
          orgDate.getMonth() === date.getMonth() &&
          orgDate.getFullYear() === date.getFullYear()
        )
      }).length

      monthlySignups.push({ month: monthStr, count })
    }

    // Get invoice stats
    const invoices = await prisma.invoice.findMany({
      select: {
        amount: true,
        status: true,
        invoiceType: true,
      },
    })

    type InvoiceType = typeof invoices[0]

    const invoiceStats = {
      total: invoices.length,
      paid: invoices.filter((i: InvoiceType) => i.status === 'paid').length,
      pending: invoices.filter((i: InvoiceType) => i.status === 'pending').length,
      overdue: invoices.filter((i: InvoiceType) => i.status === 'overdue').length,
      totalCollected: invoices.filter((i: InvoiceType) => i.status === 'paid').reduce((sum: number, i: InvoiceType) => sum + Number(i.amount), 0),
      totalOutstanding: invoices.filter((i: InvoiceType) => ['pending', 'overdue'].includes(i.status)).reduce((sum: number, i: InvoiceType) => sum + Number(i.amount), 0),
    }

    // Recent organizations
    const recentOrgs = await prisma.organization.findMany({
      where: { status: 'active' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        subscriptionTier: true,
        billingCycle: true,
        monthlyFee: true,
        createdAt: true,
      },
    })

    // Get platform fees from payments (1% on event registrations)
    const paymentsWithPlatformFees = await prisma.payment.findMany({
      where: {
        platformFeeAmount: { not: null },
        paymentStatus: 'succeeded',
      },
      select: {
        id: true,
        amount: true,
        platformFeeAmount: true,
        createdAt: true,
        organization: {
          select: { id: true, name: true },
        },
        event: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    type PaymentWithFee = typeof paymentsWithPlatformFees[0]

    const platformFees = {
      totalCollected: paymentsWithPlatformFees.reduce(
        (sum: number, p: PaymentWithFee) => sum + Number(p.platformFeeAmount || 0),
        0
      ),
      totalPaymentsProcessed: paymentsWithPlatformFees.reduce(
        (sum: number, p: PaymentWithFee) => sum + Number(p.amount || 0),
        0
      ),
      transactionCount: paymentsWithPlatformFees.length,
      recentTransactions: paymentsWithPlatformFees.slice(0, 10).map((p: PaymentWithFee) => ({
        id: p.id,
        amount: Number(p.amount),
        platformFee: Number(p.platformFeeAmount),
        organizationName: p.organization?.name || 'Unknown',
        eventName: p.event?.name || 'Unknown',
        date: p.createdAt,
      })),
    }

    // Get setup fee invoices
    const setupFeeInvoices = await prisma.invoice.findMany({
      where: { invoiceType: 'setup_fee' },
      select: {
        id: true,
        invoiceNumber: true,
        amount: true,
        status: true,
        createdAt: true,
        paidAt: true,
        organization: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    type SetupFeeInvoice = typeof setupFeeInvoices[0]

    const setupFeeDetails = {
      invoices: setupFeeInvoices.map((inv: SetupFeeInvoice) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        amount: Number(inv.amount),
        status: inv.status,
        organizationName: inv.organization?.name || 'Unknown',
        createdAt: inv.createdAt,
        paidAt: inv.paidAt,
      })),
    }

    // Get subscription invoices
    const subscriptionInvoices = await prisma.invoice.findMany({
      where: { invoiceType: 'subscription' },
      select: {
        id: true,
        invoiceNumber: true,
        amount: true,
        status: true,
        createdAt: true,
        paidAt: true,
        periodStart: true,
        periodEnd: true,
        organization: {
          select: { id: true, name: true, subscriptionTier: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    type SubInvoice = typeof subscriptionInvoices[0]

    const subscriptionDetails = {
      invoices: subscriptionInvoices.map((inv: SubInvoice) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        amount: Number(inv.amount),
        status: inv.status,
        organizationName: inv.organization?.name || 'Unknown',
        tier: inv.organization?.subscriptionTier || 'unknown',
        createdAt: inv.createdAt,
        paidAt: inv.paidAt,
        periodStart: inv.periodStart,
        periodEnd: inv.periodEnd,
      })),
    }

    return NextResponse.json({
      mrr,
      arr,
      totalActiveOrgs: organizations.length,
      tierRevenue,
      billingCycleBreakdown: {
        monthly: monthlyCount,
        annual: annualCount,
      },
      setupFees: {
        paid: setupFeesPaid,
        owed: setupFeesOwed,
        collected: setupFeesCollected,
        outstanding: setupFeesOutstanding,
      },
      monthlySignups,
      invoiceStats,
      recentOrgs,
      // New platform fee data
      platformFees,
      setupFeeDetails,
      subscriptionDetails,
    })
  } catch (error) {
    console.error('Revenue data error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch revenue data' },
      { status: 500 }
    )
  }
}
