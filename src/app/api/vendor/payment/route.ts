import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accessCode, amount } = body

    if (!accessCode) {
      return NextResponse.json({ error: 'Access code is required' }, { status: 400 })
    }

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid payment amount' }, { status: 400 })
    }

    // Find vendor
    const vendor = await prisma.vendorRegistration.findUnique({
      where: { accessCode },
      include: {
        event: {
          include: {
            organization: {
              select: {
                stripeAccountId: true,
                stripeFeePassthrough: true,
              },
            },
          },
        },
      },
    })

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    if (vendor.status !== 'approved') {
      return NextResponse.json({ error: 'Vendor not approved for payment' }, { status: 403 })
    }

    // Check balance
    const totalDue = vendor.invoiceTotal ? Number(vendor.invoiceTotal) : 0
    const amountPaid = Number(vendor.amountPaid || 0)
    const balance = totalDue - amountPaid

    if (amount > balance) {
      return NextResponse.json(
        { error: `Payment amount cannot exceed balance of $${balance.toFixed(2)}` },
        { status: 400 }
      )
    }

    // Get Stripe configuration
    const stripeAccountId = vendor.event.organization.stripeAccountId
    if (!stripeAccountId) {
      return NextResponse.json(
        { error: 'Payment processing is not configured for this organization' },
        { status: 400 }
      )
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-12-18.acacia',
    })

    // Calculate fees if passthrough is enabled
    const stripeFeePassthrough = vendor.event.organization.stripeFeePassthrough
    let finalAmount = amount
    let processingFee = 0

    if (stripeFeePassthrough) {
      // Stripe fee is 2.9% + $0.30
      processingFee = Math.ceil(amount * 0.029 + 30) / 100
      finalAmount = amount + processingFee * 100
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: Math.round(finalAmount),
        currency: 'usd',
        metadata: {
          vendorId: vendor.id,
          vendorName: vendor.businessName,
          eventId: vendor.eventId,
          type: 'vendor_payment',
        },
        description: `Vendor booth payment - ${vendor.businessName} for ${vendor.event.name}`,
      },
      {
        stripeAccount: stripeAccountId,
      }
    )

    // Update vendor with payment intent ID
    await prisma.vendorRegistration.update({
      where: { id: vendor.id },
      data: { stripePaymentIntentId: paymentIntent.id },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      stripeAccountId,
      paymentAmount: amount / 100,
      processingFee,
      totalAmount: finalAmount / 100,
    })
  } catch (error) {
    console.error('Error creating vendor payment intent:', error)
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    )
  }
}

// Handle payment confirmation webhook or manual confirmation
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { accessCode, paymentIntentId } = body

    if (!accessCode || !paymentIntentId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Find vendor
    const vendor = await prisma.vendorRegistration.findUnique({
      where: { accessCode },
      include: {
        event: {
          include: {
            organization: {
              select: { stripeAccountId: true },
            },
          },
        },
      },
    })

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    const stripeAccountId = vendor.event.organization.stripeAccountId
    if (!stripeAccountId) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 400 })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-12-18.acacia',
    })

    // Retrieve payment intent to get the amount
    const paymentIntent = await stripe.paymentIntents.retrieve(
      paymentIntentId,
      { stripeAccount: stripeAccountId }
    )

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 })
    }

    // Calculate new amount paid
    const paymentAmount = paymentIntent.amount / 100
    const newAmountPaid = Number(vendor.amountPaid || 0) + paymentAmount
    const totalDue = vendor.invoiceTotal ? Number(vendor.invoiceTotal) : 0

    // Determine payment status
    let paymentStatus: 'unpaid' | 'partial' | 'paid' = 'partial'
    if (newAmountPaid >= totalDue) {
      paymentStatus = 'paid'
    }

    // Update vendor
    await prisma.vendorRegistration.update({
      where: { id: vendor.id },
      data: {
        amountPaid: newAmountPaid,
        paymentStatus,
        paidAt: paymentStatus === 'paid' ? new Date() : vendor.paidAt,
      },
    })

    return NextResponse.json({
      success: true,
      amountPaid: newAmountPaid,
      paymentStatus,
    })
  } catch (error) {
    console.error('Error confirming vendor payment:', error)
    return NextResponse.json(
      { error: 'Failed to confirm payment' },
      { status: 500 }
    )
  }
}
