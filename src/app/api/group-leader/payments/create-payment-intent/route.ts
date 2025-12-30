import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { amount, notes, eventId } = body

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      )
    }

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
            organization: {
              select: {
                id: true,
                stripeAccountId: true,
                stripeChargesEnabled: true,
                platformFeePercentage: true,
              },
            },
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

    const org = groupRegistration.event.organization
    const amountInCents = Math.round(amount * 100)

    // Calculate platform fee (default 1%)
    const platformFeePercentage = Number(org.platformFeePercentage) || 1
    const platformFeeAmount = Math.round(amountInCents * (platformFeePercentage / 100))

    // Build payment intent config
    const paymentIntentConfig: any = {
      amount: amountInCents,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        registrationId: groupRegistration.id,
        registrationType: 'group',
        groupName: groupRegistration.groupName,
        eventId: groupRegistration.eventId,
        eventName: groupRegistration.event.name,
        organizationId: groupRegistration.event.organizationId,
        notes: notes || '',
        platformFeeAmount: platformFeeAmount.toString(),
      },
    }

    // If organization has Stripe Connect enabled, use destination charges with platform fee
    if (org.stripeAccountId && org.stripeChargesEnabled) {
      paymentIntentConfig.application_fee_amount = platformFeeAmount
      paymentIntentConfig.transfer_data = {
        destination: org.stripeAccountId,
      }
    }

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentConfig)

    // Create Payment record in database
    await prisma.payment.create({
      data: {
        organizationId: groupRegistration.event.organizationId,
        eventId: groupRegistration.eventId,
        registrationId: groupRegistration.id,
        registrationType: 'group',
        amount: amount,
        paymentType: 'balance',
        paymentMethod: 'card',
        paymentStatus: 'pending',
        stripePaymentIntentId: paymentIntent.id,
        platformFeeAmount: platformFeeAmount / 100, // Store in dollars
        notes: notes || null,
      },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    })
  } catch (error) {
    console.error('Error creating payment intent:', error)
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}
