import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    })
  : null

export async function POST(request: NextRequest) {
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

    const {
      registrationId,
      registrationType,
      refundAmount,
      refundMethod,
      refundReason,
      notes,
    } = await request.json()

    // Validate input
    if (!registrationId || !registrationType || !refundAmount || !refundMethod || !refundReason) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get the registration and verify ownership
    const registration =
      registrationType === 'group'
        ? await prisma.groupRegistration.findUnique({
            where: { id: registrationId },
          })
        : await prisma.individualRegistration.findUnique({
            where: { id: registrationId },
          })

    if (!registration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      )
    }

    if (registration.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get payment balance
    const paymentBalance = await prisma.paymentBalance.findUnique({
      where: {
        registrationId: registrationId,
      },
    })

    // Get the most recent successful payment with Stripe
    const lastPayment = await prisma.payment.findFirst({
      where: {
        registrationId: registrationId,
        registrationType: registrationType,
        paymentStatus: 'succeeded',
        stripePaymentIntentId: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Validate refund amount
    const amountPaid = paymentBalance?.amountPaid || 0
    if (refundAmount > amountPaid) {
      return NextResponse.json(
        { error: 'Refund amount exceeds amount paid' },
        { status: 400 }
      )
    }

    let stripeRefundId: string | null = null
    let refundStatus: 'pending' | 'completed' | 'failed' = 'pending'

    // Process Stripe refund if method is stripe
    if (refundMethod === 'stripe') {
      if (!stripe) {
        return NextResponse.json(
          { error: 'Stripe is not configured' },
          { status: 500 }
        )
      }

      try {
        if (!lastPayment || !lastPayment.stripePaymentIntentId) {
          return NextResponse.json(
            { error: 'No Stripe payment found to refund' },
            { status: 400 }
          )
        }

        // Create the refund in Stripe
        const refund = await stripe.refunds.create({
          payment_intent: lastPayment.stripePaymentIntentId,
          amount: Math.round(refundAmount * 100), // Convert to cents
          reason: 'requested_by_customer',
          metadata: {
            registrationId,
            registrationType,
            refundReason,
            processedBy: user.email,
          },
        })

        stripeRefundId = refund.id
        refundStatus = 'completed'
      } catch (stripeError) {
        console.error('Stripe refund error:', stripeError)
        refundStatus = 'failed'
        return NextResponse.json(
          {
            error: 'Failed to process Stripe refund',
            details: stripeError instanceof Error ? stripeError.message : 'Unknown error',
          },
          { status: 500 }
        )
      }
    } else {
      // Manual refund - mark as pending
      refundStatus = 'pending'
    }

    // Create refund record
    const refund = await prisma.refund.create({
      data: {
        registrationId,
        registrationType,
        refundAmount,
        refundMethod,
        refundReason,
        notes: notes || null,
        processedByUserId: user.id,
        stripeRefundId,
        status: refundStatus,
      },
    })

    // Update payment balance
    if (paymentBalance) {
      await prisma.paymentBalance.update({
        where: { id: paymentBalance.id },
        data: {
          amountPaid: {
            decrement: refundAmount,
          },
          amountRemaining: {
            increment: refundAmount,
          },
          paymentStatus: 'partial', // Will need to recalculate actual status
        },
      })
    }

    // Create audit trail entry
    await prisma.registrationEdit.create({
      data: {
        registrationId,
        registrationType,
        editedByUserId: user.id,
        editType: 'refund_processed',
        changesMade: {
          refundAmount,
          refundMethod,
          refundReason,
          refundId: refund.id,
        },
        oldTotal: registration.paymentBalance?.totalAmountDue || 0,
        newTotal: registration.paymentBalance?.totalAmountDue || 0,
        difference: -refundAmount,
        adminNotes: notes || null,
      },
    })

    return NextResponse.json({
      success: true,
      refund,
      message:
        refundMethod === 'stripe'
          ? 'Refund processed successfully via Stripe'
          : 'Manual refund recorded. Please process manually.',
    })
  } catch (error) {
    console.error('Error processing refund:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
