import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateAccessCode } from '@/lib/access-code'
import Stripe from 'stripe'
import { Resend } from 'resend'
import { logger } from '@/lib/logger'
import QRCode from 'qrcode'
import { logEmail, logEmailFailure } from '@/lib/email-logger'
import { generateGroupRegistrationConfirmationEmail } from '@/lib/email-templates'
import { getRegistrationStatus } from '@/lib/registration-status'
import { resolveReplyTo } from '@/lib/email-reply-to'
import {
  checkOptionCapacity,
  decrementOptionCapacity,
  incrementOptionCapacity,
  checkDayPassOptionCapacity,
  decrementDayPassOptionCapacity,
  incrementDayPassOptionCapacity,
  type HousingType
} from '@/lib/option-capacity'

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
      couponCode = '',
    } = body

    if (!eventId || !groupName || !groupLeaderName || !groupLeaderEmail || !groupLeaderPhone || !alternativeContact1Name || !alternativeContact1Email || !alternativeContact1Phone) {
      logger.warn({
        eventId,
        missingFields: {
          eventId: !eventId,
          groupName: !groupName,
          groupLeaderName: !groupLeaderName,
          groupLeaderPhone: !groupLeaderPhone,
          alternativeContact1Name: !alternativeContact1Name,
        },
      }, 'Group registration validation failed - missing required fields')
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
        settings: true,
        organization: {
          select: {
            id: true,
            name: true,
            status: true,
            stripeAccountId: true,
            stripeChargesEnabled: true,
            platformFeePercentage: true,
            contactEmail: true,
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

    // Fix #10: Guard — org must be active before accepting registrations
    if (event.organization.status !== 'active') {
      return NextResponse.json(
        { error: 'This organization is not currently accepting registrations.' },
        { status: 400 }
      )
    }

    // Fix #C1: Use the same gate the public-page CTA uses, applied at the API.
    // This honors the registration window (registrationOpenDate / registrationCloseDate),
    // manual status overrides (registration_open / registration_closed), capacity,
    // and the event-ended check. isPublished is intentionally NOT checked here so
    // admins can still test registration on an unpublished event — see
    // registration-status.ts:62-64.
    const regStatus = getRegistrationStatus({
      status: event.status,
      closedMessage: event.settings?.registrationClosedMessage,
      startDate: event.startDate,
      endDate: event.endDate,
      registrationOpenDate: event.registrationOpenDate,
      registrationCloseDate: event.registrationCloseDate,
      capacityTotal: event.capacityTotal,
      capacityRemaining: event.capacityRemaining,
      enableWaitlist: event.enableWaitlist,
      settings: {
        countdownBeforeOpen: event.settings?.countdownBeforeOpen ?? true,
        countdownBeforeClose: event.settings?.countdownBeforeClose ?? true,
        waitlistEnabled: event.settings?.waitlistEnabled ?? event.enableWaitlist,
      },
    })

    if (!regStatus.allowRegistration) {
      return NextResponse.json(
        { error: regStatus.message || 'Registration is not currently open for this event.' },
        { status: 400 }
      )
    }

    // Fix #1: Guard — org must have Stripe onboarding complete before accepting card payments
    if (!event.organization.stripeAccountId || !event.organization.stripeChargesEnabled) {
      return NextResponse.json(
        { error: 'This organization has not completed payment setup. Registration cannot be processed at this time. Please contact the event organizer.' },
        { status: 400 }
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

    // Group registrations must include both an adult supervisor (chaperone OR priest)
    // and at least one youth. Solo or adult-only signups belong in the individual
    // registration flow — this guard prevents a "group of one" from coming through
    // the group endpoint.
    const hasAdultSupervisor = chaperoneCount >= 1 || priestCount >= 1
    const hasYouth = youthCount >= 1
    if (!hasAdultSupervisor || !hasYouth) {
      return NextResponse.json(
        {
          error:
            'Group registrations must include at least one youth and at least one chaperone or priest. If you are registering only one person, please use the individual registration option.',
        },
        { status: 400 }
      )
    }

    // Enforce per-group spot limit if configured
    const groupSpotLimit = event.settings?.groupSpotLimit ?? null
    if (groupSpotLimit !== null && totalParticipants > groupSpotLimit) {
      return NextResponse.json(
        {
          error: `This event limits each group to ${groupSpotLimit} participant${groupSpotLimit === 1 ? '' : 's'}. Your group has ${totalParticipants}.`,
          groupSpotLimit,
        },
        { status: 400 }
      )
    }

    // Fix #4: Atomic capacity check+decrement to prevent TOCTOU race conditions.
    // Do this BEFORE creating any records so we don't need to roll back on failure.
    if (event.capacityTotal !== null && event.capacityRemaining !== null) {
      const capacityResult = await prisma.$executeRaw`
        UPDATE events
        SET capacity_remaining = capacity_remaining - ${totalParticipants}
        WHERE id = ${event.id}::uuid
          AND capacity_remaining >= ${totalParticipants}
      `
      if (capacityResult === 0) {
        // Re-fetch to give accurate remaining count in the error message
        const freshEvent = await prisma.event.findUnique({
          where: { id: event.id },
          select: { capacityRemaining: true },
        })
        const spotsRemaining = freshEvent?.capacityRemaining ?? 0
        return NextResponse.json(
          {
            error: spotsRemaining <= 0
              ? 'Event is at full capacity. Please join the waitlist if available.'
              : `Not enough spots available. Only ${spotsRemaining} spot${spotsRemaining === 1 ? '' : 's'} remaining, but ${totalParticipants} requested.`,
            spotsRemaining,
          },
          { status: 400 }
        )
      }
    }

    // Check option-level capacity (housing type for group registrations)
    // housingType is empty for one-day events — skip the check entirely
    if (housingType) {
      const optionCapacityCheck = checkOptionCapacity(
        event.settings,
        housingType as HousingType,
        null, // Groups don't have room type selection
        totalParticipants
      )

      if (!optionCapacityCheck.hasCapacity) {
        return NextResponse.json(
          {
            error: optionCapacityCheck.error,
            housingRemaining: optionCapacityCheck.housingRemaining,
          },
          { status: 400 }
        )
      }
    }

    // Check day pass option capacity (if applicable)
    if (body.ticketType === 'day_pass' && body.dayPassOptionId) {
      const dayPassCapacityCheck = await checkDayPassOptionCapacity(
        body.dayPassOptionId,
        totalParticipants
      )

      if (!dayPassCapacityCheck.hasCapacity) {
        return NextResponse.json(
          {
            error: dayPassCapacityCheck.error,
            dayPassRemaining: dayPassCapacityCheck.remaining,
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

    // Calculate total amount before coupon
    let totalAmount =
      youthCount * youthPrice +
      chaperoneCount * chaperonePrice +
      priestCount * priestPrice

    // Validate and apply coupon if provided
    let appliedCoupon: { id: string; code: string; discountAmount: number } | null = null

    if (couponCode) {
      // Check if coupons are enabled
      const eventSettings = await prisma.eventSettings.findUnique({
        where: { eventId: event.id },
        select: { couponsEnabled: true },
      })

      if (eventSettings?.couponsEnabled) {
        const coupon = await prisma.coupon.findFirst({
          where: {
            eventId: event.id,
            code: couponCode.toUpperCase(),
            active: true,
          },
        })

        if (coupon) {
          // Check expiration
          const isExpired = coupon.expirationDate && new Date(coupon.expirationDate) < new Date()

          // Check usage limits
          let hasUsesLeft = true
          if (coupon.usageLimitType === 'single_use' && coupon.usageCount >= 1) {
            hasUsesLeft = false
          } else if (coupon.usageLimitType === 'limited' && coupon.maxUses && coupon.usageCount >= coupon.maxUses) {
            hasUsesLeft = false
          }

          // Check email restriction
          let emailAllowed = true
          if (coupon.restrictToEmail) {
            emailAllowed = coupon.restrictToEmail.toLowerCase() === groupLeaderEmail.toLowerCase()
          }

          if (!isExpired && hasUsesLeft && emailAllowed) {
            // Calculate discount
            let discountAmount = 0
            if (coupon.discountType === 'percentage') {
              discountAmount = (totalAmount * Number(coupon.discountValue)) / 100
            } else {
              discountAmount = Math.min(Number(coupon.discountValue), totalAmount)
            }

            // Apply discount
            totalAmount = Math.max(0, totalAmount - discountAmount)

            appliedCoupon = {
              id: coupon.id,
              code: coupon.code,
              discountAmount,
            }
            // NOTE: usageCount is incremented after confirmed payment (webhook for card, here for check)
          }
        }
      }
    }

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

    // Ensure deposit doesn't exceed total (important when coupon applied)
    depositAmount = Math.min(depositAmount, totalAmount)

    const balanceRemaining = totalAmount - depositAmount

    // Generate unique access code
    const accessCode = generateAccessCode(event.name, groupName)

    // Determine registration status based on payment method
    const registrationStatus =
      paymentMethod === 'check' ? 'pending_payment' : 'incomplete'

    // Determine initial inventory counts based on housing type
    const initialOnCampusYouth = housingType === 'on_campus' ? youthCount : 0
    const initialOnCampusChaperones = housingType === 'on_campus' ? chaperoneCount : 0
    const initialOffCampusYouth = housingType === 'off_campus' ? youthCount : 0
    const initialOffCampusChaperones = housingType === 'off_campus' ? chaperoneCount : 0
    const initialDayPassYouth = housingType === 'day_pass' ? youthCount : 0
    const initialDayPassChaperones = housingType === 'day_pass' ? chaperoneCount : 0

    // Generate QR code before the transaction (CPU-bound, no side effects)
    const qrData = JSON.stringify({
      registration_id: 'pending', // will be updated inside tx
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

    // Fix #5: Wrap all DB writes in a transaction so partial failures roll back cleanly.
    // Stripe checkout session creation happens AFTER this transaction commits.
    const paymentBalanceStatus =
      paymentMethod === 'check' ? 'pending_check_payment' : 'unpaid'

    // Fix #M3: Hoist custom answers so we can save them inside the same transaction
    // as the registration row. Previously this ran AFTER the tx committed, so a DB
    // blip between commit and insert left the registration with no answers.
    const customAnswers: Array<{ questionId: string; answerText: string }> = body.customAnswers ?? []

    const registration = await prisma.$transaction(async (tx) => {
      // Create group registration
      const reg = await tx.groupRegistration.create({
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
          ticketType: body.ticketType || 'general_admission',
          dayPassOptionId: body.dayPassOptionId || null,
          housingType: housingType || null,
          onCampusYouth: initialOnCampusYouth > 0 ? initialOnCampusYouth : null,
          onCampusChaperones: initialOnCampusChaperones > 0 ? initialOnCampusChaperones : null,
          offCampusYouth: initialOffCampusYouth > 0 ? initialOffCampusYouth : null,
          offCampusChaperones: initialOffCampusChaperones > 0 ? initialOffCampusChaperones : null,
          dayPassYouth: initialDayPassYouth > 0 ? initialDayPassYouth : null,
          dayPassChaperones: initialDayPassChaperones > 0 ? initialDayPassChaperones : null,
          specialRequests,
          registrationStatus,
          qrCode: qrCodeDataUrl,
        },
      })

      // Create payment balance record inside transaction
      await tx.paymentBalance.create({
        data: {
          organizationId: event.organizationId,
          eventId: event.id,
          registrationId: reg.id,
          registrationType: 'group',
          totalAmountDue: totalAmount,
          amountPaid: 0,
          amountRemaining: totalAmount,
          lateFeesApplied: 0,
          paymentStatus: paymentBalanceStatus,
        },
      })

      // Increment organization's registration counter inside transaction
      await tx.organization.update({
        where: { id: event.organizationId },
        data: { registrationsUsed: { increment: totalParticipants } },
      })

      // Save custom question answers atomically with the registration (Fix #M3).
      if (customAnswers.length > 0) {
        await tx.customRegistrationAnswer.createMany({
          data: customAnswers.map(({ questionId, answerText }) => ({
            questionId,
            registrationId: reg.id,
            registrationType: 'group' as const,
            answerText,
          })),
          skipDuplicates: true,
        })
      }

      return reg
    })

    // NOTE: Capacity was already atomically decremented above (Fix #4) — no second decrement here.

    // Update option-level capacity (housing type for group registrations)
    // Only decrement housing capacity for general admission (day pass doesn't use housing)
    if (body.ticketType !== 'day_pass') {
      await decrementOptionCapacity(
        event.id,
        housingType as HousingType,
        null, // Groups don't have room type selection
        totalParticipants
      )
    }

    // Update day pass option capacity (if applicable)
    if (body.ticketType === 'day_pass' && body.dayPassOptionId) {
      await decrementDayPassOptionCapacity(
        body.dayPassOptionId,
        totalParticipants
      )
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
      const porosLiabilityUrl = `${appUrl}/poros?code=${accessCode}`
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
          from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
          reply_to: resolveReplyTo(event.settings, event.organization),
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

      // For check payments, increment coupon usage now (no Stripe webhook will fire)
      if (appliedCoupon) {
        await prisma.coupon.update({
          where: { id: appliedCoupon.id },
          data: { usageCount: { increment: 1 } },
        })
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
        success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/registration/confirmation/${registration.id}?session_id={CHECKOUT_SESSION_ID}&access_code=${encodeURIComponent(accessCode)}&group_name=${encodeURIComponent(groupName)}&participants=${totalParticipants}&amount_paid=${depositAmount}&housing=${encodeURIComponent(housingType)}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/events/${eventId}/register-group/review?cancelled=true`,
        metadata: {
          registrationId: registration.id,
          eventId: event.id,
          groupName,
          accessCode,
          platformFeeAmount: platformFeeAmount.toString(),
          couponId: appliedCoupon?.id || '',
        },
        customer_email: groupLeaderEmail,
      }

      // Use destination charges — org Stripe account is guaranteed by guard above
      checkoutConfig.payment_intent_data = {
        application_fee_amount: platformFeeAmount,
        transfer_data: {
          destination: event.organization.stripeAccountId,
        },
      }
      logger.info({ organizationId: event.organization.id, eventId: event.id, platformFeeAmount }, 'Stripe checkout session: applying platform fee')

      // Fix #M2: Wrap Stripe call so a checkout-creation failure doesn't leak
      // capacity. On failure, undo every side effect (capacity decrements, registration
      // row, payment balance, custom answers, org counter) and return 503.
      let checkoutSession: Stripe.Checkout.Session
      try {
        checkoutSession = await stripe.checkout.sessions.create(checkoutConfig)
      } catch (stripeError) {
        logger.error(
          { err: String(stripeError), registrationId: registration.id, eventId: event.id },
          'Stripe checkout session creation failed - rolling back group registration'
        )

        try {
          // Re-increment housing/day-pass capacity that was decremented earlier
          if (body.ticketType !== 'day_pass' && housingType) {
            await incrementOptionCapacity(
              event.id,
              housingType as HousingType,
              null,
              totalParticipants
            )
          }
          if (body.ticketType === 'day_pass' && body.dayPassOptionId) {
            await incrementDayPassOptionCapacity(body.dayPassOptionId, totalParticipants)
          }

          // Re-increment event capacity, decrement org counter, delete the registration
          await prisma.$transaction([
            prisma.$executeRaw`
              UPDATE events
              SET capacity_remaining = capacity_remaining + ${totalParticipants}
              WHERE id = ${event.id}::uuid AND capacity_remaining IS NOT NULL
            `,
            prisma.organization.update({
              where: { id: event.organizationId },
              data: { registrationsUsed: { decrement: totalParticipants } },
            }),
            prisma.customRegistrationAnswer.deleteMany({
              where: { registrationId: registration.id, registrationType: 'group' as const },
            }),
            prisma.paymentBalance.delete({ where: { registrationId: registration.id } }),
            prisma.groupRegistration.delete({ where: { id: registration.id } }),
          ])
        } catch (rollbackError) {
          logger.error(
            { err: String(rollbackError), registrationId: registration.id, eventId: event.id },
            'Failed to fully roll back group registration after Stripe failure - manual cleanup may be required'
          )
        }

        return NextResponse.json(
          { error: 'Payment processing is temporarily unavailable. Please try again in a moment.' },
          { status: 503 }
        )
      }

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
          stripePaymentIntentId: checkoutSession.payment_intent as string,
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
    logger.error({ error: String(error) }, 'Group registration error')
    return NextResponse.json(
      { error: 'Failed to process registration. Please try again.' },
      { status: 500 }
    )
  }
}
