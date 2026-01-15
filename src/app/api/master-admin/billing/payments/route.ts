import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'

// Get all payments
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

    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')
    const method = searchParams.get('method')
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: Record<string, unknown> = {}

    if (orgId) {
      where.organizationId = orgId
    }

    if (method && method !== 'all') {
      where.paymentMethod = method
    }

    if (status && status !== 'all') {
      where.paymentStatus = status
    }

    if (type && type !== 'all') {
      where.paymentType = type
    }

    if (startDate) {
      where.createdAt = {
        ...(where.createdAt || {}),
        gte: new Date(startDate),
      }
    }

    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      where.createdAt = {
        ...(where.createdAt || {}),
        lte: end,
      }
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        organization: {
          select: { id: true, name: true },
        },
        processedBy: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 500, // Limit for performance
    })

    // Also fetch paid platform invoices (these don't create Payment records)
    const invoiceWhere: Record<string, unknown> = {
      status: 'paid',
      paidAt: { not: null },
    }

    if (orgId) {
      invoiceWhere.organizationId = orgId
    }

    // Only include invoice payments when not filtering by method (or filtering for card)
    const includeInvoicePayments = !method || method === 'all' || method === 'card'

    const paidInvoices = includeInvoicePayments
      ? await prisma.invoice.findMany({
          where: invoiceWhere,
          select: {
            id: true,
            invoiceNumber: true,
            amount: true,
            invoiceType: true,
            paymentMethod: true,
            paidAt: true,
            stripePaymentIntentId: true,
            stripeCheckoutSessionId: true,
            organization: {
              select: { id: true, name: true },
            },
          },
          orderBy: { paidAt: 'desc' },
          take: 100,
        })
      : []

    // Type definition for payment operations
    type PaymentType = typeof payments[number]
    type PaidInvoiceType = typeof paidInvoices[number]

    // Convert paid invoices to payment-like records
    const invoicePayments = paidInvoices.map((inv: PaidInvoiceType) => ({
      id: inv.id,
      amount: Number(inv.amount),
      paymentType: `Invoice #${inv.invoiceNumber}`,
      paymentMethod: inv.paymentMethod || 'credit_card',
      paymentStatus: 'succeeded',
      checkNumber: null,
      checkDate: null,
      cardLast4: null,
      cardBrand: null,
      authorizationCode: null,
      transactionReference: inv.stripePaymentIntentId,
      platformFeeAmount: null,
      notes: `Platform invoice payment - ${inv.invoiceType}`,
      processedVia: 'stripe',
      processedAt: inv.paidAt,
      createdAt: inv.paidAt,
      organizationId: inv.organization?.id || '',
      organizationName: inv.organization?.name || 'Unknown',
      processedByName: null,
      isInvoicePayment: true, // Flag to identify invoice payments
    }))

    // Map regular payments
    const regularPayments = payments.map((p: PaymentType) => ({
      id: p.id,
      amount: Number(p.amount),
      paymentType: p.paymentType,
      paymentMethod: p.paymentMethod,
      paymentStatus: p.paymentStatus,
      checkNumber: p.checkNumber,
      checkDate: p.checkDate,
      cardLast4: p.cardLast4,
      cardBrand: p.cardBrand,
      authorizationCode: p.authorizationCode,
      transactionReference: p.transactionReference,
      platformFeeAmount: p.platformFeeAmount ? Number(p.platformFeeAmount) : null,
      notes: p.notes,
      processedVia: p.processedVia,
      processedAt: p.processedAt,
      createdAt: p.createdAt,
      organizationId: p.organizationId,
      organizationName: p.organization?.name || 'Unknown',
      processedByName: p.processedBy
        ? `${p.processedBy.firstName} ${p.processedBy.lastName}`
        : null,
      isInvoicePayment: false,
    }))

    // Combine and sort by date
    const allPayments = [...regularPayments, ...invoicePayments]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Get summary stats (including invoice payments)
    const stats = {
      total: allPayments.length,
      succeeded: allPayments.filter((p) => p.paymentStatus === 'succeeded').length,
      pending: payments.filter((p: PaymentType) => p.paymentStatus === 'pending').length,
      failed: payments.filter((p: PaymentType) => p.paymentStatus === 'failed').length,
      totalAmount: allPayments
        .filter((p) => p.paymentStatus === 'succeeded')
        .reduce((sum: number, p) => sum + Number(p.amount), 0),
      totalPlatformFees: payments
        .filter((p: PaymentType) => p.paymentStatus === 'succeeded' && p.platformFeeAmount)
        .reduce((sum: number, p: PaymentType) => sum + Number(p.platformFeeAmount || 0), 0),
    }

    return NextResponse.json({
      payments: allPayments,
      stats,
    })
  } catch (error) {
    console.error('List payments error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}
