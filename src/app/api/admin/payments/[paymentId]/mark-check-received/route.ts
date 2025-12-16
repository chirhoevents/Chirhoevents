import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database to verify org admin role
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      include: { organization: true },
    })

    if (!user || user.role !== 'org_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const paymentId = params.paymentId
    const { checkNumber } = await request.json()

    // Get the payment
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    })

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    // Verify the payment is a check payment
    if (payment.paymentMethod !== 'check') {
      return NextResponse.json(
        { error: 'Payment is not a check payment' },
        { status: 400 }
      )
    }

    // Update the payment to mark as received
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        paymentStatus: 'succeeded',
        checkReceivedDate: new Date(),
        processedAt: new Date(),
        checkNumber: checkNumber || payment.checkNumber,
      },
    })

    return NextResponse.json({
      success: true,
      payment: updatedPayment,
      message: 'Check marked as received successfully',
    })
  } catch (error) {
    console.error('Error marking check as received:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
