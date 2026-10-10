import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { verifyClerkSessionToken } from '@/lib/jwt-auth-helper'

export async function DELETE(request: NextRequest) {
  try {
    let clerkUserId: string | null = null

    const authResult = await auth()
    clerkUserId = authResult.userId

    if (!clerkUserId) {
      const authHeader = request.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        const verifiedUserId = await verifyClerkSessionToken(token)
        if (verifiedUserId) {
          clerkUserId = verifiedUserId
        }
      }
    }

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findFirst({
      where: { clerkUserId },
      select: { role: true },
    })

    if (!user || user.role !== 'master_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete PaymentBalance records first (FK dependency), then Payments
    const deletedBalances = await prisma.paymentBalance.deleteMany({})
    const deletedPayments = await prisma.payment.deleteMany({})

    return NextResponse.json({
      success: true,
      deleted: {
        payments: deletedPayments.count,
        paymentBalances: deletedBalances.count,
      },
      message: `Cleared ${deletedPayments.count} payment record(s) and ${deletedBalances.count} payment balance record(s).`,
    })
  } catch (error) {
    console.error('Clear test data error:', error)
    return NextResponse.json(
      { error: 'Failed to clear test data' },
      { status: 500 }
    )
  }
}
