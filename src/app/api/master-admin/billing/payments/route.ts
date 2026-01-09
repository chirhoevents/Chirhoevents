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

    // Get summary stats
    const stats = {
      total: payments.length,
      succeeded: payments.filter((p) => p.paymentStatus === 'succeeded').length,
      pending: payments.filter((p) => p.paymentStatus === 'pending').length,
      failed: payments.filter((p) => p.paymentStatus === 'failed').length,
      totalAmount: payments
        .filter((p) => p.paymentStatus === 'succeeded')
        .reduce((sum, p) => sum + Number(p.amount), 0),
      totalPlatformFees: payments
        .filter((p) => p.paymentStatus === 'succeeded' && p.platformFeeAmount)
        .reduce((sum, p) => sum + Number(p.platformFeeAmount || 0), 0),
    }

    return NextResponse.json({
      payments: payments.map((p) => ({
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
      })),
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
