import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'
    const tier = searchParams.get('tier') || 'all'
    const billingCycle = searchParams.get('billingCycle') || 'all'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      status: { in: ['active', 'pending', 'suspended'] },
    }

    if (status !== 'all') {
      if (status === 'past_due') {
        // Find orgs with overdue invoices
        const orgsWithOverdueInvoices = await prisma.invoice.findMany({
          where: { status: 'overdue' },
          select: { organizationId: true },
          distinct: ['organizationId'],
        })
        where.id = { in: orgsWithOverdueInvoices.map((inv) => inv.organizationId) }
      } else {
        where.subscriptionStatus = status
      }
    }

    if (tier !== 'all') {
      where.subscriptionTier = tier
    }

    if (billingCycle !== 'all') {
      where.billingCycle = billingCycle
    }

    const organizations = await prisma.organization.findMany({
      where,
      select: {
        id: true,
        name: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        billingCycle: true,
        monthlyFee: true,
        monthlyPrice: true,
        annualPrice: true,
        subscriptionStartedAt: true,
        subscriptionRenewsAt: true,
        setupFeePaid: true,
        setupFeeAmount: true,
        paymentMethodPreference: true,
        eventsUsed: true,
        eventsPerYearLimit: true,
        registrationsUsed: true,
        registrationsLimit: true,
        storageUsedGb: true,
        storageLimitGb: true,
        notes: true,
        status: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    })

    // Get payment history for each organization
    const subscriptionsWithPayments = await Promise.all(
      organizations.map(async (org) => {
        const payments = await prisma.payment.findMany({
          where: { organizationId: org.id },
          select: {
            id: true,
            amount: true,
            paymentType: true,
            paymentMethod: true,
            paymentStatus: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        })

        const invoices = await prisma.invoice.findMany({
          where: { organizationId: org.id },
          select: {
            id: true,
            invoiceNumber: true,
            amount: true,
            status: true,
            invoiceType: true,
            dueDate: true,
            paidAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        })

        // Check if they have any overdue invoices
        const hasOverdueInvoices = invoices.some((inv) => inv.status === 'overdue')

        // Calculate annual amount
        let annualAmount = 0
        if (org.billingCycle === 'annual') {
          annualAmount = Number(org.annualPrice) || 0
        } else {
          annualAmount = (Number(org.monthlyFee) || Number(org.monthlyPrice) || 0) * 12
        }

        return {
          ...org,
          monthlyFee: Number(org.monthlyFee) || Number(org.monthlyPrice) || 0,
          annualPrice: Number(org.annualPrice) || 0,
          annualAmount,
          hasOverdueInvoices,
          recentPayments: payments.map((p) => ({
            ...p,
            amount: Number(p.amount),
          })),
          recentInvoices: invoices.map((inv) => ({
            ...inv,
            amount: Number(inv.amount),
          })),
        }
      })
    )

    return NextResponse.json({ subscriptions: subscriptionsWithPayments })
  } catch (error) {
    console.error('List subscriptions error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions' },
      { status: 500 }
    )
  }
}
