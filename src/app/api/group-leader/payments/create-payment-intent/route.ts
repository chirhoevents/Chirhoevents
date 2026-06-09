import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export async function POST(req: NextRequest) {
  try {
    const userId = await getClerkUserIdFromRequest(req)

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
      whereClause.eventId = eventId // Fix #6: was incorrectly whereClause.id
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
                status: true,
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

    // Fix #10: Guard — org must be active before accepting payments
    if (org.status !== 'active') {
      return NextResponse.json(
        { error: 'This organization is not currently accepting registrations.' },
        { status: 400 }
      )
    }

    // Fix #1: Guard — org must have Stripe onboarding complete before accepting payments
    if (!org.stripeAccountId || !org.stripeChargesEnabled) {
      return NextResponse.json(
        { error: 'This organization has not completed payment setup. Registration cannot be processed at this time. Please contact the event organizer.' },
        { status: 400 }
      )
    }

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

    // Use destination charges — org Stripe account is guaranteed by guard above.
    // on_behalf_of makes the connected account the merchant of record so Stripe's
    // processing fees (2.9% + $0.30) are deducted from their share, not the platform's.
    paymentIntentConfig.application_fee_amount = platformFeeAmount
    paymentIntentConfig.on_behalf_of = org.stripeAccountId
    paymentIntentConfig.transfer_data = {
      destination: org.stripeAccountId,
    }
    console.log(`[Stripe Connect] Applying platform fee: $${(platformFeeAmount / 100).toFixed(2)} to org ${org.id}`)

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
