import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'

export async function GET(request: NextRequest) {
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

    // Get active subscriptions for MRR calculation
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
        subscriptionStartedAt: true,
        subscriptionRenewsAt: true,
      },
    })

    type OrgType = (typeof organizations)[0]

    // Calculate current MRR
    let currentMRR = 0
    const tierBreakdown: Record<string, { count: number; amount: number }> = {}

    organizations.forEach((org: OrgType) => {
      let monthlyAmount = 0
      if (org.billingCycle === 'monthly') {
        monthlyAmount = Number(org.monthlyFee) || Number(org.monthlyPrice) || 0
      } else {
        monthlyAmount = Math.round((Number(org.annualPrice) || 0) / 12)
      }
      currentMRR += monthlyAmount

      const tier = org.subscriptionTier || 'growing'
      if (!tierBreakdown[tier]) {
        tierBreakdown[tier] = { count: 0, amount: 0 }
      }
      tierBreakdown[tier].count++
      tierBreakdown[tier].amount += monthlyAmount
    })

    // Get last month's MRR for comparison (30 days ago)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const orgsLastMonth = await prisma.organization.findMany({
      where: {
        status: 'active',
        subscriptionStatus: 'active',
        subscriptionStartedAt: { lte: thirtyDaysAgo },
      },
      select: {
        billingCycle: true,
        monthlyFee: true,
        monthlyPrice: true,
        annualPrice: true,
      },
    })

    let lastMonthMRR = 0
    orgsLastMonth.forEach((org) => {
      if (org.billingCycle === 'monthly') {
        lastMonthMRR += Number(org.monthlyFee) || Number(org.monthlyPrice) || 0
      } else {
        lastMonthMRR += Math.round((Number(org.annualPrice) || 0) / 12)
      }
    })

    const mrrGrowth = currentMRR - lastMonthMRR

    // Get pending invoices
    const pendingInvoices = await prisma.invoice.findMany({
      where: {
        status: { in: ['pending', 'overdue'] },
      },
      include: {
        organization: {
          select: { id: true, name: true },
        },
      },
      orderBy: { dueDate: 'asc' },
    })

    const pendingTotal = pendingInvoices.reduce(
      (sum, inv) => sum + Number(inv.amount),
      0
    )

    // This month's revenue calculation
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const endOfMonth = new Date(startOfMonth)
    endOfMonth.setMonth(endOfMonth.getMonth() + 1)

    // Subscription revenue this month (from paid invoices)
    const subscriptionInvoicesPaidThisMonth = await prisma.invoice.findMany({
      where: {
        invoiceType: 'subscription',
        status: 'paid',
        paidAt: {
          gte: startOfMonth,
          lt: endOfMonth,
        },
      },
    })
    const subscriptionRevenue = subscriptionInvoicesPaidThisMonth.reduce(
      (sum, inv) => sum + Number(inv.amount),
      0
    )

    // Setup fees this month
    const setupFeeInvoicesPaidThisMonth = await prisma.invoice.findMany({
      where: {
        invoiceType: 'setup_fee',
        status: 'paid',
        paidAt: {
          gte: startOfMonth,
          lt: endOfMonth,
        },
      },
    })
    const setupFeeRevenue = setupFeeInvoicesPaidThisMonth.reduce(
      (sum, inv) => sum + Number(inv.amount),
      0
    )

    // Platform fees this month (from event payments)
    const paymentsThisMonth = await prisma.payment.findMany({
      where: {
        paymentStatus: 'succeeded',
        platformFeeAmount: { not: null },
        createdAt: {
          gte: startOfMonth,
          lt: endOfMonth,
        },
      },
    })
    const platformFeeRevenue = paymentsThisMonth.reduce(
      (sum, p) => sum + Number(p.platformFeeAmount || 0),
      0
    )

    // Calculate overage charges (if any exist - placeholder for now)
    const overageCharges = 0

    const totalMonthlyRevenue =
      subscriptionRevenue + setupFeeRevenue + platformFeeRevenue + overageCharges

    // Recent activity - last 5 payments
    const recentPayments = await prisma.payment.findMany({
      where: {
        paymentStatus: 'succeeded',
      },
      include: {
        organization: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    // Last 5 invoices created
    const recentInvoices = await prisma.invoice.findMany({
      include: {
        organization: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    // Recent subscription changes (organizations that changed status recently)
    const recentSubscriptionChanges = await prisma.organization.findMany({
      where: {
        subscriptionStartedAt: { not: null },
      },
      select: {
        id: true,
        name: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        subscriptionStartedAt: true,
      },
      orderBy: { subscriptionStartedAt: 'desc' },
      take: 5,
    })

    return NextResponse.json({
      mrr: {
        current: currentMRR,
        growth: mrrGrowth,
        activeSubscriptions: organizations.length,
        tierBreakdown,
      },
      pendingInvoices: {
        count: pendingInvoices.length,
        total: pendingTotal,
        items: pendingInvoices.slice(0, 5).map((inv) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          amount: Number(inv.amount),
          dueDate: inv.dueDate,
          status: inv.status,
          organizationName: inv.organization?.name || 'Unknown',
        })),
      },
      thisMonthRevenue: {
        subscriptions: subscriptionRevenue,
        setupFees: setupFeeRevenue,
        platformFees: platformFeeRevenue,
        overageCharges,
        total: totalMonthlyRevenue,
      },
      recentActivity: {
        payments: recentPayments.map((p) => ({
          id: p.id,
          amount: Number(p.amount),
          type: p.paymentType,
          method: p.paymentMethod,
          organizationName: p.organization?.name || 'Unknown',
          date: p.createdAt,
        })),
        invoices: recentInvoices.map((inv) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          amount: Number(inv.amount),
          type: inv.invoiceType,
          status: inv.status,
          organizationName: inv.organization?.name || 'Unknown',
          date: inv.createdAt,
        })),
        subscriptionChanges: recentSubscriptionChanges.map((org) => ({
          id: org.id,
          name: org.name,
          tier: org.subscriptionTier,
          status: org.subscriptionStatus,
          date: org.subscriptionStartedAt,
        })),
      },
    })
  } catch (error) {
    console.error('Billing overview error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch billing overview' },
      { status: 500 }
    )
  }
}
