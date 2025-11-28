import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateAccessCode } from '@/lib/access-code'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    const {
      eventId,
      groupName,
      groupLeaderName,
      groupLeaderEmail,
      groupLeaderPhone,
      youthCountMaleU18 = 0,
      youthCountFemaleU18 = 0,
      youthCountMaleO18 = 0,
      youthCountFemaleO18 = 0,
      chaperoneCountMale = 0,
      chaperoneCountFemale = 0,
      priestCount = 0,
      housingType,
      specialRequests = '',
      couponCode = '',
    } = body

    if (!eventId || !groupName || !groupLeaderName || !groupLeaderEmail || !groupLeaderPhone || !housingType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Fetch event and pricing
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        pricing: true,
        organization: true,
      },
    })

    if (!event || !event.pricing) {
      return NextResponse.json(
        { error: 'Event not found or pricing not configured' },
        { status: 404 }
      )
    }

    // Calculate total participants and pricing
    const totalParticipants =
      youthCountMaleU18 +
      youthCountFemaleU18 +
      youthCountMaleO18 +
      youthCountFemaleO18 +
      chaperoneCountMale +
      chaperoneCountFemale +
      priestCount

    if (totalParticipants === 0) {
      return NextResponse.json(
        { error: 'At least one participant is required' },
        { status: 400 }
      )
    }

    const youthTotal =
      youthCountMaleU18 + youthCountFemaleU18 + youthCountMaleO18 + youthCountFemaleO18
    const chaperoneTotal = chaperoneCountMale + chaperoneCountFemale

    const totalAmount =
      youthTotal * Number(event.pricing.youthRegularPrice) +
      chaperoneTotal * Number(event.pricing.chaperoneRegularPrice) +
      priestCount * Number(event.pricing.priestPrice)

    const depositPercentage = Number(event.pricing.depositAmount) // 25
    const depositAmount = (totalAmount * depositPercentage) / 100
    const balanceRemaining = totalAmount - depositAmount

    // Generate unique access code
    const accessCode = generateAccessCode(event.name, groupName)

    // Create group registration
    const registration = await prisma.groupRegistration.create({
      data: {
        eventId: event.id,
        organizationId: event.organizationId,
        groupName,
        parishName: body.parishName || null,
        dioceseName: body.dioceseName || null,
        groupLeaderName,
        groupLeaderEmail,
        groupLeaderPhone,
        accessCode,
        youthCountMaleU18,
        youthCountFemaleU18,
        youthCountMaleO18,
        youthCountFemaleO18,
        chaperoneCountMale,
        chaperoneCountFemale,
        priestCount,
        totalParticipants,
        housingType,
        specialRequests,
        registrationStatus: 'pending_payment',
      },
    })

    // Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${event.name} - Group Registration`,
              description: `Deposit for ${groupName} (${totalParticipants} participants)`,
            },
            unit_amount: Math.round(depositAmount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/registration/confirmation/${registration.id}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/events/${eventId}/register-group?cancelled=true`,
      metadata: {
        registrationId: registration.id,
        eventId: event.id,
        groupName,
        accessCode,
      },
      customer_email: groupLeaderEmail,
    })

    // Create payment record
    await prisma.payment.create({
      data: {
        groupRegistrationId: registration.id,
        eventId: event.id,
        amount: depositAmount,
        paymentType: 'deposit',
        paymentMethod: 'card',
        paymentStatus: 'pending',
        stripePaymentIntentId: checkoutSession.id,
      },
    })

    return NextResponse.json({
      success: true,
      registrationId: registration.id,
      accessCode: registration.accessCode,
      checkoutUrl: checkoutSession.url,
      totalAmount,
      depositAmount,
      balanceRemaining,
    })
  } catch (error: any) {
    console.error('Group registration error:', error)
    return NextResponse.json(
      { error: error.message || 'Registration failed' },
      { status: 500 }
    )
  }
}
