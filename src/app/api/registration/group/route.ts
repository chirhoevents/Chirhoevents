import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateAccessCode } from '@/lib/access-code'
import Stripe from 'stripe'
import { Resend } from 'resend'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

const resend = new Resend(process.env.RESEND_API_KEY!)

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
      youthCount = 0,
      chaperoneCount = 0,
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
    const totalParticipants = youthCount + chaperoneCount + priestCount

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

    // Determine youth price - housing-specific pricing overrides early bird
    let youthPrice = isEarlyBird
      ? Number(event.pricing.youthEarlyBirdPrice || event.pricing.youthRegularPrice)
      : Number(event.pricing.youthRegularPrice)

    if (housingType === 'on_campus' && event.pricing.onCampusYouthPrice) {
      youthPrice = Number(event.pricing.onCampusYouthPrice)
    } else if (housingType === 'off_campus' && event.pricing.offCampusYouthPrice) {
      youthPrice = Number(event.pricing.offCampusYouthPrice)
    } else if (housingType === 'day_pass' && event.pricing.dayPassYouthPrice) {
      youthPrice = Number(event.pricing.dayPassYouthPrice)
    }

    // Determine chaperone price - housing-specific pricing overrides early bird
    let chaperonePrice = isEarlyBird
      ? Number(event.pricing.chaperoneEarlyBirdPrice || event.pricing.chaperoneRegularPrice)
      : Number(event.pricing.chaperoneRegularPrice)

    if (housingType === 'on_campus' && event.pricing.onCampusChaperonePrice) {
      chaperonePrice = Number(event.pricing.onCampusChaperonePrice)
    } else if (housingType === 'off_campus' && event.pricing.offCampusChaperonePrice) {
      chaperonePrice = Number(event.pricing.offCampusChaperonePrice)
    } else if (housingType === 'day_pass' && event.pricing.dayPassChaperonePrice) {
      chaperonePrice = Number(event.pricing.dayPassChaperonePrice)
    }

    const priestPrice = Number(event.pricing.priestPrice)

    // Calculate total amount
    const totalAmount =
      youthCount * youthPrice +
      chaperoneCount * chaperonePrice +
      priestCount * priestPrice

    // Calculate deposit based on settings
    let depositAmount = 0
    if (event.pricing.requireFullPayment) {
      // Option 3: Full payment required
      depositAmount = totalAmount
    } else if (event.pricing.depositPercentage != null) {
      // Option 1: Percentage-based deposit
      depositAmount = (totalAmount * Number(event.pricing.depositPercentage)) / 100
    } else if (event.pricing.depositAmount != null) {
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
        groupLeaderStreet: body.groupLeaderStreet || null,
        groupLeaderCity: body.groupLeaderCity || null,
        groupLeaderState: body.groupLeaderState || null,
        groupLeaderZip: body.groupLeaderZip || null,
        alternativeContact1Name: body.alternativeContact1Name || null,
        alternativeContact1Email: body.alternativeContact1Email || null,
        alternativeContact1Phone: body.alternativeContact1Phone || null,
        alternativeContact2Name: body.alternativeContact2Name || null,
        alternativeContact2Email: body.alternativeContact2Email || null,
        alternativeContact2Phone: body.alternativeContact2Phone || null,
        accessCode,
        youthCount,
        chaperoneCount,
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

      // Fetch event settings for check payment details
      const eventSettings = await prisma.eventSettings.findUnique({
        where: { eventId: event.id },
      })

      // Send confirmation email for check payment
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'hello@chirhoevents.com',
        to: groupLeaderEmail,
        subject: `Registration Received - ${event.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <!-- ChiRho Events Logo Header -->
            <div style="text-align: center; padding: 20px 0; background-color: #1E3A5F;">
              <img src="${process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'}/logo-horizontal.png" alt="ChiRho Events" style="max-width: 200px; height: auto;" />
            </div>

            <div style="padding: 30px 20px;">
              <h1 style="color: #1E3A5F; margin-top: 0;">Registration Received!</h1>

            <p>Thank you for registering <strong>${groupName}</strong> for ${event.name}!</p>

            <div style="background-color: #F5F1E8; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #9C8466; margin-top: 0;">Your Access Code</h2>
              <p style="font-size: 24px; font-weight: bold; color: #1E3A5F; font-family: monospace; letter-spacing: 2px;">
                ${registration.accessCode}
              </p>
              <p style="font-size: 14px; color: #666;">
                Save this code! You'll need it to complete liability forms and access your group portal.
              </p>
            </div>

            <div style="background-color: #FFF3CD; padding: 20px; border-left: 4px solid #FFC107; margin: 20px 0;">
              <h3 style="color: #856404; margin-top: 0;">⚠️ Payment Required</h3>
              <p style="color: #856404; margin: 0;">
                <strong>Your registration is PENDING until we receive your check payment.</strong>
              </p>
            </div>

            <div style="background-color: #E8F4F8; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1E3A5F; margin-top: 0;">Check Payment Instructions</h3>
              <p style="margin: 5px 0;"><strong>Make check payable to:</strong> ${eventSettings?.checkPaymentPayableTo || event.organization.name}</p>
              <p style="margin: 5px 0;"><strong>Amount:</strong> $${depositAmount.toFixed(2)} (deposit) or $${totalAmount.toFixed(2)} (full payment)</p>
              <p style="margin: 5px 0;"><strong>Write on check memo:</strong> ${groupName}</p>
              ${eventSettings?.checkPaymentAddress ? `
                <p style="margin: 10px 0 5px 0;"><strong>Mail to:</strong></p>
                <p style="margin: 0; white-space: pre-line;">${eventSettings.checkPaymentAddress}</p>
              ` : ''}
            </div>

            <h3 style="color: #1E3A5F;">Registration Summary</h3>
            <div style="background-color: #F5F5F5; padding: 15px; border-radius: 8px;">
              <p style="margin: 5px 0;"><strong>Group:</strong> ${groupName}</p>
              <p style="margin: 5px 0;"><strong>Participants:</strong> ${totalParticipants}</p>
              <p style="margin: 5px 0;"><strong>Total Cost:</strong> $${totalAmount.toFixed(2)}</p>
              <p style="margin: 5px 0;"><strong>Deposit Amount:</strong> $${depositAmount.toFixed(2)}</p>
              <p style="margin: 5px 0;"><strong>Balance Remaining:</strong> $${balanceRemaining.toFixed(2)}</p>
              <p style="margin: 5px 0;"><strong>Payment Method:</strong> Check (Pending)</p>
            </div>

            <h3 style="color: #1E3A5F;">Next Steps:</h3>
            <ol>
              <li><strong>Mail Your Check:</strong> Send your check using the instructions above.</li>
              <li><strong>Complete Liability Forms:</strong> Each participant must complete their liability form using your access code.</li>
              <li><strong>Wait for Confirmation:</strong> We'll email you once your check is received and processed.</li>
              <li><strong>Check-In:</strong> Bring your access code to check in at the event.</li>
            </ol>

            ${eventSettings?.registrationInstructions ? `
              <div style="background-color: #F0F8FF; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1E3A5F; margin-top: 0;">Important Information</h3>
                <p style="white-space: pre-line;">${eventSettings.registrationInstructions}</p>
              </div>
            ` : ''}

            <p>Questions? Reply to this email or contact the event organizer.</p>

            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              © 2025 ChiRho Events. All rights reserved.
            </p>
            </div>
          </div>
        `,
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
