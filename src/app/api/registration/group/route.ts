import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateAccessCode } from '@/lib/access-code'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
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
      paymentMethod = 'card', // 'card' or 'check'
    } = body

    if (!eventId || !groupName || !groupLeaderName || !groupLeaderEmail || !groupLeaderPhone || !housingType) {
      console.error('Validation failed:', {
        eventId: !!eventId,
        groupName: !!groupName,
        groupLeaderName: !!groupLeaderName,
        groupLeaderEmail: !!groupLeaderEmail,
        groupLeaderPhone: !!groupLeaderPhone,
        housingType: !!housingType,
        receivedBody: body,
      })
      return NextResponse.json(
        {
          error: 'Missing required fields',
          details: {
            eventId: !eventId ? 'missing' : 'ok',
            groupName: !groupName ? 'missing' : 'ok',
            groupLeaderName: !groupLeaderName ? 'missing' : 'ok',
            groupLeaderEmail: !groupLeaderEmail ? 'missing' : 'ok',
            groupLeaderPhone: !groupLeaderPhone ? 'missing' : 'ok',
            housingType: !housingType ? 'missing' : 'ok',
          }
        },
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

    // Calculate total participants
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

    // Check for early bird pricing
    const now = new Date()
    const earlyBirdDeadline = event.pricing.earlyBirdDeadline
      ? new Date(event.pricing.earlyBirdDeadline)
      : null
    const isEarlyBird = earlyBirdDeadline && now <= earlyBirdDeadline

    const youthPrice = isEarlyBird
      ? Number(event.pricing.youthEarlyBirdPrice || event.pricing.youthRegularPrice)
      : Number(event.pricing.youthRegularPrice)

    const chaperonePrice = isEarlyBird
      ? Number(event.pricing.chaperoneEarlyBirdPrice || event.pricing.chaperoneRegularPrice)
      : Number(event.pricing.chaperoneRegularPrice)

    const priestPrice = Number(event.pricing.priestPrice)

    // Calculate totals
    const youthTotal =
      youthCountMaleU18 + youthCountFemaleU18 + youthCountMaleO18 + youthCountFemaleO18
    const chaperoneTotal = chaperoneCountMale + chaperoneCountFemale

    const totalAmount =
      youthTotal * youthPrice +
      chaperoneTotal * chaperonePrice +
      priestCount * priestPrice

    // Calculate deposit based on settings
    let depositAmount = 0
    if (event.pricing.requireFullPayment) {
      // Option 3: Full payment required
      depositAmount = totalAmount
    } else if (event.pricing.depositPercentage !== null) {
      // Option 1: Percentage-based deposit
      depositAmount = (totalAmount * Number(event.pricing.depositPercentage)) / 100
    } else if (event.pricing.depositAmount !== null) {
      // Option 2: Fixed deposit amount
      depositAmount = Number(event.pricing.depositAmount)
    }
    // else Option 4: No deposit required (depositAmount = 0)

    const balanceRemaining = totalAmount - depositAmount

    // Generate unique access code
    const accessCode = generateAccessCode(event.name, groupName)

    // Determine registration status based on payment method
    const registrationStatus =
      paymentMethod === 'check' ? 'pending_payment' : 'incomplete'

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
        registrationStatus,
      },
    })

    // Create payment balance record
    const paymentBalanceStatus =
      paymentMethod === 'check' ? 'pending_check_payment' : 'unpaid'

    await prisma.paymentBalance.create({
      data: {
        organizationId: event.organizationId,
        eventId: event.id,
        registrationId: registration.id,
        registrationType: 'group',
        totalAmountDue: totalAmount,
        amountPaid: 0,
        amountRemaining: totalAmount,
        lateFeesApplied: 0,
        paymentStatus: paymentBalanceStatus,
      },
    })

    // Handle payment method
    if (paymentMethod === 'check') {
      // Check payment - create pending payment record
      await prisma.payment.create({
        data: {
          organizationId: event.organizationId,
          registrationId: registration.id,
          registrationType: 'group',
          eventId: event.id,
          amount: depositAmount,
          paymentType: 'deposit',
          paymentMethod: 'check',
          paymentStatus: 'pending',
        },
      })

      // Return without Stripe checkout URL
      return NextResponse.json({
        success: true,
        registrationId: registration.id,
        accessCode: registration.accessCode,
        checkoutUrl: null,
        totalAmount,
        depositAmount,
        balanceRemaining,
        paymentMethod: 'check',
      })
    } else {
      // Credit card payment - create Stripe checkout session
      const checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${event.name} - Group Registration`,
                description: `${event.pricing.requireFullPayment ? 'Full payment' : 'Deposit'} for ${groupName} (${totalParticipants} participants)`,
              },
              unit_amount: Math.round(depositAmount * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/registration/confirmation/${registration.id}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/events/${eventId}/register-group/review?cancelled=true`,
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
          organizationId: event.organizationId,
          registrationId: registration.id,
          registrationType: 'group',
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
        paymentMethod: 'card',
      })
    }
  } catch (error) {
    console.error('Group registration error:', error)
    return NextResponse.json(
      { error: 'Failed to process registration. Please try again.' },
      { status: 500 }
    )
  }
}
