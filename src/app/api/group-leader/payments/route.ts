import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const { userId } = auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Find the group registration linked to this Clerk user
    const groupRegistration = await prisma.groupRegistration.findFirst({
      where: { clerkUserId: userId },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            organizationId: true,
          },
        },
      },
    })

    if (!groupRegistration) {
      return NextResponse.json(
        { error: 'No group registration found' },
        { status: 404 }
      )
    }

    // Fetch payment balance
    const paymentBalance = await prisma.paymentBalance.findUnique({
      where: {
        registrationId: groupRegistration.id,
      },
    })

    // Fetch all payment transactions
    const payments = await prisma.payment.findMany({
      where: {
        registrationId: groupRegistration.id,
        registrationType: 'group',
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({
      balance: paymentBalance
        ? {
            totalAmountDue: paymentBalance.totalAmountDue,
            amountPaid: paymentBalance.amountPaid,
            amountRemaining: paymentBalance.amountRemaining,
            lateFeesApplied: paymentBalance.lateFeesApplied,
            lastPaymentDate: paymentBalance.lastPaymentDate,
            paymentStatus: paymentBalance.paymentStatus,
          }
        : null,
      payments: payments.map((payment) => ({
        id: payment.id,
        amount: payment.amount,
        paymentType: payment.paymentType,
        paymentMethod: payment.paymentMethod,
        paymentStatus: payment.paymentStatus,
        receiptUrl: payment.receiptUrl,
        checkNumber: payment.checkNumber,
        checkReceivedDate: payment.checkReceivedDate,
        notes: payment.notes,
        processedAt: payment.processedAt,
        createdAt: payment.createdAt,
      })),
    })
  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
