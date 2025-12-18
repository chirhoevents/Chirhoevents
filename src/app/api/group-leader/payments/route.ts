import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get eventId from query parameters
    const searchParams = request.nextUrl.searchParams
    const eventId = searchParams.get('eventId')

    // Build where clause - filter by eventId if provided
    const whereClause: any = { clerkUserId: userId }
    if (eventId) {
      whereClause.id = eventId
    }

    // Find the group registration linked to this Clerk user
    const groupRegistration = await prisma.groupRegistration.findFirst({
      where: whereClause,
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
            totalAmountDue: Number(paymentBalance.totalAmountDue),
            amountPaid: Number(paymentBalance.amountPaid),
            amountRemaining: Number(paymentBalance.amountRemaining),
            lateFeesApplied: Number(paymentBalance.lateFeesApplied),
            lastPaymentDate: paymentBalance.lastPaymentDate,
            paymentStatus: paymentBalance.paymentStatus,
          }
        : null,
      payments: payments.map((payment: any) => ({
        id: payment.id,
        amount: Number(payment.amount),
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
