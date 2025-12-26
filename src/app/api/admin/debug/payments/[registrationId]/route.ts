import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

// Debug endpoint to see ALL payments for a registration
export async function GET(
  request: NextRequest,
  { params }: { params: { registrationId: string } }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const registrationId = params.registrationId

    // Get ALL payments for this registration, no filters
    const allPayments = await prisma.payment.findMany({
      where: { registrationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        registrationId: true,
        registrationType: true,
        amount: true,
        paymentMethod: true,
        paymentStatus: true,
        paymentType: true,
        createdAt: true,
        updatedAt: true,
        processedAt: true,
        notes: true,
      },
    })

    // Get payment balance
    const paymentBalance = await prisma.paymentBalance.findUnique({
      where: { registrationId },
    })

    // Calculate what the balance SHOULD be
    const succeededPayments = allPayments.filter(p => p.paymentStatus === 'succeeded')
    const calculatedTotal = succeededPayments.reduce((sum, p) => sum + Number(p.amount), 0)

    return NextResponse.json({
      registrationId,
      totalPaymentsInDB: allPayments.length,
      succeededPaymentsCount: succeededPayments.length,
      calculatedTotalFromSucceeded: calculatedTotal,
      currentBalanceAmountPaid: paymentBalance ? Number(paymentBalance.amountPaid) : null,
      currentBalanceTotalDue: paymentBalance ? Number(paymentBalance.totalAmountDue) : null,
      discrepancy: paymentBalance ? Number(paymentBalance.amountPaid) - calculatedTotal : null,
      allPayments: allPayments.map(p => ({
        ...p,
        amount: Number(p.amount),
      })),
      paymentBalance: paymentBalance ? {
        id: paymentBalance.id,
        totalAmountDue: Number(paymentBalance.totalAmountDue),
        amountPaid: Number(paymentBalance.amountPaid),
        amountRemaining: Number(paymentBalance.amountRemaining),
        paymentStatus: paymentBalance.paymentStatus,
      } : null,
    })
  } catch (error) {
    console.error('Debug payments error:', error)
    return NextResponse.json({ error: 'Failed to fetch debug info' }, { status: 500 })
  }
}
