import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

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

export async function DELETE(request: NextRequest) {
  try {
    let clerkUserId: string | null = null

    const authResult = await auth()
    clerkUserId = authResult.userId

    if (!clerkUserId) {
      const authHeader = request.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        const payload = decodeJwtPayload(token)
        if (payload?.sub) {
          clerkUserId = payload.sub
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
