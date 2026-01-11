import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateAccessCode } from '@/lib/access-code'
import Stripe from 'stripe'
import { Resend } from 'resend'
import QRCode from 'qrcode'
import { logEmail, logEmailFailure } from '@/lib/email-logger'
import { generateGroupRegistrationConfirmationEmail } from '@/lib/email-templates'

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
      alternativeContact1Name,
      alternativeContact1Email,
      alternativeContact1Phone,
      youthCount = 0,
      chaperoneCount = 0,
      priestCount = 0,
      housingType,
      specialRequests = '',
      paymentMethod = 'card', // 'card' or 'check'
    } = body

    if (!eventId || !groupName || !groupLeaderName || !groupLeaderEmail || !groupLeaderPhone || !housingType || !alternativeContact1Name || !alternativeContact1Email || !alternativeContact1Phone) {
      console.error('Validation failed:', {
        eventId: !!eventId,
        groupName: !!groupName,
        groupLeaderName: !!groupLeaderName,
        groupLeaderEmail: !!groupLeaderEmail,
        groupLeaderPhone: !!groupLeaderPhone,
        alternativeContact1Name: !!alternativeContact1Name,
        alternativeContact1Email: !!alternativeContact1Email,
        alternativeContact1Phone: !!alternativeContact1Phone,
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
            alternativeContact1Name: !alternativeContact1Name ? 'missing' : 'ok',
            alternativeContact1Email: !alternativeContact1Email ? 'missing' : 'ok',
            alternativeContact1Phone: !alternativeContact1Phone ? 'missing' : 'ok',
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
        organization: {
          select: {
            id: true,
            name: true,
            stripeAccountId: true,
            stripeChargesEnabled: true,
            platformFeePercentage: true,
          },
        },
      },
    })

    if (!event || !event.pricing) {
      return NextResponse.json(
        { error: 'Event not found or pricing not configured' },
        { status: 404 }
      )
    }

    // Fetch depositPerPerson directly via raw query (Prisma client may not have this field)
    const depositPerPersonResult = await prisma.$queryRaw<Array<{ deposit_per_person: boolean | null }>>`
      SELECT deposit_per_person FROM event_pricing WHERE event_id = ${eventId}::uuid LIMIT 1
    `
    const depositPerPerson = depositPerPersonResult[0]?.deposit_per_person ?? true

    // Calculate total participants
    const totalParticipants = youthCount + chaperoneCount + priestCount

    if (totalParticipants === 0) {
      return NextResponse.json(
        { error: 'At least one participant is required' },
        { status: 400 }
      )
    }

    // Check capacity before allowing registration
    if (event.capacityTotal !== null && event.capacityRemaining !== null) {
      if (event.capacityRemaining <= 0) {
        return NextResponse.json(
          { error: 'Event is at full capacity. Please join the waitlist if available.' },
          { status: 400 }
        )
      }
      if (event.capacityRemaining < totalParticipants) {
        return NextResponse.json(
          {
            error: `Not enough spots available. Only ${event.capacityRemaining} spot${event.capacityRemaining === 1 ? '' : 's'} remaining, but ${totalParticipants} requested.`,
            spotsRemaining: event.capacityRemaining
          },
          { status: 400 }
        )
      }
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
      // Option 2: Fixed deposit amount (per person or total)
      const baseDepositAmount = Number(event.pricing.depositAmount)
      depositAmount = depositPerPerson
        ? baseDepositAmount * totalParticipants
        : baseDepositAmount
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
        alternativeContact1Name,
        alternativeContact1Email,
        alternativeContact1Phone,
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

    // Generate QR code for check-in (contains access code for SALVE)
    const qrData = JSON.stringify({
      registration_id: registration.id,
      event_id: event.id,
      type: 'group',
      group_name: groupName,
      access_code: accessCode,
    })

    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 300,
    })

    // Store QR code in database
    await prisma.groupRegistration.update({
      where: { id: registration.id },
      data: { qrCode: qrCodeDataUrl },
    })

    // Increment organization's registration counter
    await prisma.organization.update({
      where: { id: event.organizationId },
      data: {
        registrationsUsed: {
          increment: totalParticipants,
        },
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

    // Update event capacity if capacity tracking is enabled
    if (event.capacityTotal !== null && event.capacityRemaining !== null) {
      await prisma.event.update({
        where: { id: event.id },
        data: {
          capacityRemaining: Math.max(0, event.capacityRemaining - totalParticipants),
        },
      })
    }

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

      // Build URLs for email
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'
      const porosLiabilityUrl = `${appUrl}/poros/liability?code=${accessCode}`
      const groupLeaderPortalUrl = `${appUrl}/dashboard/group-leader`
      const confirmationPageUrl = `${appUrl}/registration/confirmation/${registration.id}`

      // Prepare email content using new template
      const emailSubject = `Registration Received - ${event.name}`
      const emailHtml = generateGroupRegistrationConfirmationEmail({
        groupName,
        groupLeaderName,
        eventName: event.name,
        accessCode: registration.accessCode,
        confirmationPageUrl,
        totalParticipants,
        totalAmount,
        depositAmount,
        balanceRemaining,
        paymentMethod: 'check',
        checkPayableTo: eventSettings?.checkPaymentPayableTo || event.organization.name,
        checkMailingAddress: eventSettings?.checkPaymentAddress || undefined,
        registrationInstructions: eventSettings?.registrationInstructions || undefined,
        customMessage: eventSettings?.confirmationEmailMessage || undefined,
        organizationName: event.organization.name,
        porosLiabilityUrl,
        groupLeaderPortalUrl,
      })

      // Send confirmation email for check payment
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'hello@chirhoevents.com',
          to: groupLeaderEmail,
          subject: emailSubject,
          html: emailHtml,
        })

        // Log the email
        await logEmail({
          organizationId: event.organizationId,
          eventId: event.id,
          registrationId: registration.id,
          registrationType: 'group',
          recipientEmail: groupLeaderEmail,
          recipientName: groupLeaderName,
          emailType: 'group_check_payment_confirmation',
          subject: emailSubject,
          htmlContent: emailHtml,
          metadata: {
            groupName,
            totalParticipants,
            totalAmount,
            depositAmount,
            balanceRemaining,
            housingType,
          },
        })
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError)
        await logEmailFailure(
          {
            organizationId: event.organizationId,
            eventId: event.id,
            registrationId: registration.id,
            registrationType: 'group',
            recipientEmail: groupLeaderEmail,
            recipientName: groupLeaderName,
            emailType: 'group_check_payment_confirmation',
            subject: emailSubject,
            htmlContent: emailHtml,
          },
          emailError instanceof Error ? emailError.message : 'Unknown error'
        )
      }

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
      const depositAmountCents = Math.round(depositAmount * 100)

      // Calculate platform fee (default 1%)
      const platformFeePercentage = Number(event.organization.platformFeePercentage) || 1
      const platformFeeAmount = Math.round(depositAmountCents * (platformFeePercentage / 100))

      // Build checkout session config
      const checkoutConfig: any = {
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${event.name} - Group Registration`,
                description: `${event.pricing.requireFullPayment ? 'Full payment' : 'Deposit'} for ${groupName} (${totalParticipants} participants)`,
              },
              unit_amount: depositAmountCents,
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
          platformFeeAmount: platformFeeAmount.toString(),
        },
        customer_email: groupLeaderEmail,
      }

      // If organization has Stripe Connect enabled, use destination charges with platform fee
      // Platform fee goes to ChiRho Events, rest transfers to connected org account
      if (event.organization.stripeAccountId) {
        checkoutConfig.payment_intent_data = {
          application_fee_amount: platformFeeAmount,
          transfer_data: {
            destination: event.organization.stripeAccountId,
          },
        }
        console.log(`[Stripe Connect] Applying platform fee: $${(platformFeeAmount / 100).toFixed(2)} to org ${event.organization.id}`)
      } else {
        console.log(`[Stripe Connect] No connected account for org ${event.organization.id} - processing without platform fee`)
      }

      const checkoutSession = await stripe.checkout.sessions.create(checkoutConfig)

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
          platformFeeAmount: platformFeeAmount / 100, // Store in dollars
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
