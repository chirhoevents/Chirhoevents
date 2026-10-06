import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'
import { Resend } from '@/lib/resend'
import { generateIndividualRegistrationQr } from '@/lib/individual-qr'
import { randomUUID } from 'crypto'
import { calculatePlatformFeeCents } from '@/lib/stripe-fees'
import { CARD_PAYMENT_DISABLED_MESSAGE, CARD_PAYMENT_DISABLED_TITLE } from '@/lib/event-card-payment-disabled'
import { logEmail, logEmailFailure } from '@/lib/email-logger'
import { generateIndividualConfirmationCode } from '@/lib/access-code'
import { resolveReplyTo } from '@/lib/email-reply-to'
import { getRegistrationStatus } from '@/lib/registration-status'
import {
  checkOptionCapacity,
  decrementOptionCapacity,
  incrementOptionCapacity,
  reserveOptionCapacity,
  checkDayPassOptionCapacity,
  decrementDayPassOptionCapacity,
  incrementDayPassOptionCapacity,
  reserveDayPassOptionCapacity,
  type HousingType,
  type RoomType
} from '@/lib/option-capacity'
import { deleteRegistrationPermanently } from '@/lib/registration-cleanup'
import {
  markWaitlistAsRegistered,
  markWaitlistAsRegisteredByToken,
  validateWaitlistToken,
} from '@/lib/waitlist-utils'
import {
  calculateIndividualPrice,
  eventOffersHousing,
  individualAttendanceLines,
  individualLiabilityEmailBlock,
  individualLiabilityFormUrl,
  individualHousingOptions,
  individualParentTokenExpiry,
  organizerMessageBlock,
} from '@/lib/individual-registration'
import { buildIndividualConfirmedEmail } from '@/lib/individual-confirmation-email'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

const resend = new Resend(process.env.RESEND_API_KEY!)

// Stripe's smallest card charge in USD
const STRIPE_MINIMUM_CHARGE_CENTS = 50
// How long an unpaid Stripe checkout holds its spot before Stripe expires it
// and the checkout.session.expired webhook gives the spot back (Stripe allows 30 min to 24 h)
const CHECKOUT_HOLD_SECONDS = 60 * 60

export async function POST(request: NextRequest) {
  // Undo steps for what this request has taken so far (capacity, the saved
  // registration, a Stripe session). If anything fails part-way, they run in
  // reverse so a failed registration doesn't keep holding a spot.
  const rollback: Array<() => Promise<unknown>> = []
  const runRollback = async () => {
    for (const undo of rollback.splice(0).reverse()) {
      await undo().catch(err => console.error('[Individual registration] Rollback step failed:', err))
    }
  }

  try {
    const body = await request.json()

    // Validate required fields
    const {
      eventId,
      firstName,
      lastName,
      email,
      phone,
      housingType: requestedHousingType,
      emergencyContact1Name,
      emergencyContact1Phone,
      emergencyContact1Relation,
      paymentMethod = 'card', // 'card' or 'check'
      couponCode = '',
      waitlistToken = null,
    } = body
    // Adjusted below to the event's housing rules
    let housingType: string = requestedHousingType
    let roomType: string | null = body.roomType || null

    if (!eventId || !firstName || !lastName || !email || !phone || !housingType ||
        !emergencyContact1Name || !emergencyContact1Phone || !emergencyContact1Relation) {
      console.error('Validation failed:', {
        eventId: !!eventId,
        firstName: !!firstName,
        lastName: !!lastName,
        email: !!email,
        phone: !!phone,
        housingType: !!housingType,
        emergencyContact1Name: !!emergencyContact1Name,
        emergencyContact1Phone: !!emergencyContact1Phone,
        emergencyContact1Relation: !!emergencyContact1Relation,
        receivedBody: body,
      })
      return NextResponse.json(
        {
          error: 'Missing required fields',
          details: {
            eventId: !eventId ? 'missing' : 'ok',
            firstName: !firstName ? 'missing' : 'ok',
            lastName: !lastName ? 'missing' : 'ok',
            email: !email ? 'missing' : 'ok',
            phone: !phone ? 'missing' : 'ok',
            housingType: !housingType ? 'missing' : 'ok',
            emergencyContact1Name: !emergencyContact1Name ? 'missing' : 'ok',
            emergencyContact1Phone: !emergencyContact1Phone ? 'missing' : 'ok',
            emergencyContact1Relation: !emergencyContact1Relation ? 'missing' : 'ok',
          }
        },
        { status: 400 }
      )
    }

    if (!['on_campus', 'off_campus', 'day_pass'].includes(housingType)) {
      return NextResponse.json({ error: 'Invalid housing type' }, { status: 400 })
    }

    // Accept the event's UUID or its public slug, like group registration does
    // (a shared /events/<slug>/register-individual link posts the slug)
    const isEventIdUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId)

    // Fetch event and pricing
    const event = await prisma.event.findUnique({
      where: isEventIdUuid ? { id: eventId } : { slug: eventId },
      include: {
        pricing: true,
        organization: {
          select: {
            id: true,
            name: true,
            status: true,
            stripeAccountId: true,
            stripeChargesEnabled: true,
            platformFeePercentage: true,
            contactEmail: true,
            contactPhone: true,
            website: true,
            logoUrl: true,
          },
        },
        settings: true,
      },
    })

    if (!event || !event.pricing) {
      return NextResponse.json(
        { error: 'Event not found or pricing not configured' },
        { status: 404 }
      )
    }

    // Same guards as group registration: the org must be active, and the
    // event must accept individual registrations
    if (event.organization.status !== 'active') {
      return NextResponse.json(
        { error: 'This organization is not currently accepting registrations.' },
        { status: 400 }
      )
    }
    if (event.settings?.individualRegistrationEnabled === false) {
      return NextResponse.json(
        { error: 'Individual registration is not available for this event.' },
        { status: 400 }
      )
    }

    // The same open/close gate the public page and group registration use:
    // registration window, manual open/closed override, capacity, event ended.
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

    // Waitlist-token bypass: a valid token from an admin invite lets this
    // registration through the capacity gates below (event + option + day pass).
    // The whole point of the waitlist invite is that the admin has approved
    // this registration past capacity. If the token has a live reservation
    // from Contact, we also skip the capacity decrement so we don't double-count.
    // Strict match: option (housing/room/day pass) must match what was reserved.
    let waitlistBypass = false
    let waitlistReservedSpots = 0
    let waitlistOptionReserved = false
    let waitlistDayPassReserved = false
    if (waitlistToken) {
      const tokenCheck = await validateWaitlistToken(waitlistToken)
      if (!tokenCheck.valid || !tokenCheck.entry) {
        return NextResponse.json(
          { error: `Waitlist invitation is not valid: ${tokenCheck.error || 'unknown reason'}` },
          { status: 400 }
        )
      }
      if (tokenCheck.entry.eventId !== event.id) {
        return NextResponse.json(
          { error: 'Waitlist invitation is for a different event.' },
          { status: 400 }
        )
      }

      const wl = tokenCheck.entry
      const requestedHousing = (housingType || null) as HousingType | null
      const requestedRoom = (roomType as RoomType | null)
      const requestedDayPassOptionId = (body.dayPassOptionId || null) as string | null

      // Match against effective_* values so a counter-offer wins over the
      // original request. Falls back to preferred_* if no reservation was set.
      const expectedHousing = wl.effectiveHousingType
      const expectedRoom = wl.effectiveRoomType
      const expectedDayPassOptionId = wl.effectiveDayPassOptionId

      if (expectedHousing && requestedHousing && expectedHousing !== requestedHousing) {
        return NextResponse.json(
          {
            error: `Your waitlist invitation was for ${expectedHousing.replace('_', ' ')} housing, but this registration is for ${requestedHousing.replace('_', ' ')}. Please register for ${expectedHousing.replace('_', ' ')} or contact the organizer to change your option.`,
          },
          { status: 400 }
        )
      }
      if (expectedRoom && requestedRoom && expectedRoom !== requestedRoom) {
        return NextResponse.json(
          {
            error: `Your waitlist invitation was for a ${expectedRoom} room, but this registration is for a ${requestedRoom} room. Please register for the room type you waitlisted for, or contact the organizer.`,
          },
          { status: 400 }
        )
      }
      if (expectedDayPassOptionId && requestedDayPassOptionId && expectedDayPassOptionId !== requestedDayPassOptionId) {
        return NextResponse.json(
          {
            error: 'Your waitlist invitation was for a different day pass option. Please register for the option you waitlisted for, or contact the organizer to change it.',
          },
          { status: 400 }
        )
      }

      waitlistBypass = true
      waitlistReservedSpots = wl.reservedSpots ?? 0
      waitlistOptionReserved = !!wl.reservedHousingType
      waitlistDayPassReserved = !!wl.reservedDayPassOptionId
    }

    if (!regStatus.allowRegistration) {
      const bypassable =
        waitlistBypass && (regStatus.status === 'at_capacity' || regStatus.status === 'closed')
      if (!bypassable) {
        return NextResponse.json(
          { error: regStatus.message || 'Registration is not currently open for this event.' },
          { status: 400 }
        )
      }
    }

    // Day passes must be offered for this event, and the option must be one of its own
    const isDayPass = body.ticketType === 'day_pass' || housingType === 'day_pass'
    if (isDayPass && event.settings?.allowDayPass === false) {
      return NextResponse.json(
        { error: 'Day passes are not available for this event.' },
        { status: 400 }
      )
    }
    const dayPassOption = isDayPass && body.dayPassOptionId
      ? await prisma.dayPassOption.findFirst({
          where: { id: body.dayPassOptionId, eventId: event.id },
          select: { price: true, name: true },
        })
      : null
    if (isDayPass && body.dayPassOptionId && !dayPassOption) {
      return NextResponse.json(
        { error: 'That day pass option is not available for this event.' },
        { status: 400 }
      )
    }

    // The event's housing rules, the same ones the form shows: no housing at
    // all means off-campus; otherwise the chosen option and room type must be
    // ones the organizer allows
    if (!isDayPass) {
      const housingOffered = eventOffersHousing(event.settings, event.startDate, event.endDate)
      const housingOptions = individualHousingOptions(event.settings)
      if (!housingOffered) {
        housingType = 'off_campus'
      } else if (housingType === 'on_campus') {
        if (!housingOptions.onCampusAllowed) {
          return NextResponse.json({ error: 'On-campus housing is not offered for this event.' }, { status: 400 })
        }
        if (roomType && !housingOptions.rooms.some(room => room.value === roomType)) {
          return NextResponse.json({ error: 'That room type is not offered for this event.' }, { status: 400 })
        }
      } else if (!housingOptions.offCampusAllowed) {
        return NextResponse.json(
          { error: 'This event requires on-campus housing. Please go back and choose a room.' },
          { status: 400 }
        )
      }
      if (housingType !== 'on_campus') roomType = null
    }

    // Optional meal package add-on, only when the organizer offers it
    const includeMealPackage =
      !!body.includeMealPackage &&
      !!event.settings?.individualMealsEnabled &&
      event.pricing.individualMealPackagePrice != null

    // Check capacity before allowing registration
    if (!waitlistBypass && event.capacityTotal !== null && event.capacityRemaining !== null) {
      if (event.capacityRemaining <= 0) {
        return NextResponse.json(
          { error: 'Event is at full capacity. Please join the waitlist if available.' },
          { status: 400 }
        )
      }
    }

    // Check option-level capacity (housing type and room type)
    if (!waitlistBypass) {
      const optionCapacityCheck = checkOptionCapacity(
        event.settings,
        housingType as HousingType,
        roomType as RoomType | null,
        1 // Individual registration = 1 person
      )

      if (!optionCapacityCheck.hasCapacity) {
        return NextResponse.json(
          {
            error: optionCapacityCheck.error,
            housingRemaining: optionCapacityCheck.housingRemaining,
            roomRemaining: optionCapacityCheck.roomRemaining,
          },
          { status: 400 }
        )
      }
    }

    // Check day pass option capacity (if applicable)
    if (!waitlistBypass && body.ticketType === 'day_pass' && body.dayPassOptionId) {
      const dayPassCapacityCheck = await checkDayPassOptionCapacity(
        body.dayPassOptionId,
        1 // Individual registration = 1 person
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

    // Price for this registration (same rules the form and review page show)
    const toPrice = (value: unknown) => (value == null ? null : Number(value))
    let totalAmount = calculateIndividualPrice(
      {
        individualBasePrice: toPrice(event.pricing.individualBasePrice),
        individualEarlyBirdPrice: toPrice(event.pricing.individualEarlyBirdPrice),
        individualOffCampusPrice: toPrice(event.pricing.individualOffCampusPrice),
        individualDayPassPrice: toPrice(event.pricing.individualDayPassPrice),
        youthRegularPrice: toPrice(event.pricing.youthRegularPrice),
        singleRoomPrice: toPrice(event.pricing.singleRoomPrice),
        doubleRoomPrice: toPrice(event.pricing.doubleRoomPrice),
        tripleRoomPrice: toPrice(event.pricing.tripleRoomPrice),
        quadRoomPrice: toPrice(event.pricing.quadRoomPrice),
        individualMealPackagePrice: toPrice(event.pricing.individualMealPackagePrice),
        earlyBirdDeadline: event.pricing.earlyBirdDeadline,
      },
      {
        housingType,
        roomType,
        dayPassOptionPrice: dayPassOption ? Number(dayPassOption.price) : null,
        includeMealPackage,
      }
    )

    // Validate and apply coupon if provided
    let appliedCoupon: { id: string; code: string; discountAmount: number } | null = null

    if (couponCode && event.settings?.couponsEnabled) {
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
          emailAllowed = coupon.restrictToEmail.toLowerCase() === email.toLowerCase()
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
          // The use is claimed below, atomically, once the registration goes ahead
        }
      }
    }

    // Nothing to pay (a free event, or a coupon covering everything): no
    // Stripe and no check, so the registration is complete right away
    const isFree = totalAmount <= 0
    const requestedMethod = paymentMethod === 'check' ? 'check' : 'card'

    // An event can have card payments turned off entirely ("financial
    // restrictions this year, checks only"); force those onto the check path.
    const forcedCheckDueToCardDisabled =
      !isFree && requestedMethod === 'card' && !!event.settings?.cardPaymentDisabled
    const effectivePaymentMethod: 'free' | 'check' | 'card' = isFree
      ? 'free'
      : forcedCheckDueToCardDisabled ? 'check' : requestedMethod

    if (effectivePaymentMethod === 'card') {
      // Fix #1 (individual): org must have Stripe onboarding complete before
      // accepting card payments. Not needed when there's nothing to pay or the
      // event takes checks only.
      if (!event.organization.stripeAccountId || !event.organization.stripeChargesEnabled) {
        return NextResponse.json(
          { error: 'This organization has not completed payment setup. Registration cannot be processed at this time. Please contact the event organizer.' },
          { status: 400 }
        )
      }
      // Stripe can't charge a card less than $0.50 (e.g. after a large coupon)
      if (Math.round(totalAmount * 100) < STRIPE_MINIMUM_CHARGE_CENTS) {
        return NextResponse.json(
          { error: `The total after discounts ($${totalAmount.toFixed(2)}) is below the $0.50 minimum for card payments. Please contact the event organizer.` },
          { status: 400 }
        )
      }
    }

    // Determine registration status based on payment method
    const registrationStatus =
      effectivePaymentMethod === 'free'
        ? 'complete'
        : effectivePaymentMethod === 'check' ? 'pending_payment' : 'incomplete'

    // Take the spot now, in one atomic step, so two people registering at the
    // same moment can't both get the last one. Each spot taken gets a rollback
    // step in case anything below fails.
    // Event capacity: a waitlist invite may go over capacity (so it's not
    // conditional), and a seat already reserved for the invite isn't taken twice.
    const skipCapacityDecrement = waitlistBypass && waitlistReservedSpots > 0
    if (event.capacityTotal !== null && event.capacityRemaining !== null && !skipCapacityDecrement) {
      const taken = waitlistBypass
        ? await prisma.$executeRaw`
            UPDATE events SET capacity_remaining = capacity_remaining - 1
            WHERE id = ${event.id}::uuid
          `
        : await prisma.$executeRaw`
            UPDATE events SET capacity_remaining = capacity_remaining - 1
            WHERE id = ${event.id}::uuid AND capacity_remaining >= 1
          `
      if (taken === 0) {
        return NextResponse.json(
          { error: 'Sorry, the event just filled up. Please join the waitlist if available.' },
          { status: 400 }
        )
      }
      rollback.push(() => prisma.$executeRaw`
        UPDATE events SET capacity_remaining = LEAST(capacity_total, capacity_remaining + 1)
        WHERE id = ${event.id}::uuid AND capacity_remaining IS NOT NULL
      `)
    }

    // Housing / room capacity (day passes don't use housing). Skipped if the
    // waitlist invite already reserved this option.
    const roomTypeForCapacity = roomType as RoomType | null
    if (!isDayPass && !waitlistOptionReserved && event.settings) {
      if (waitlistBypass) {
        await decrementOptionCapacity(event.id, housingType as HousingType, roomTypeForCapacity, 1)
      } else if (!(await reserveOptionCapacity(event.id, housingType as HousingType, roomTypeForCapacity, 1))) {
        await runRollback()
        return NextResponse.json(
          { error: 'Sorry, that housing or room option just filled up. Please go back and choose another option.' },
          { status: 400 }
        )
      }
      rollback.push(() => incrementOptionCapacity(event.id, housingType as HousingType, roomTypeForCapacity, 1))
    }

    // Day pass capacity. Skipped if the waitlist invite already reserved it.
    if (isDayPass && body.dayPassOptionId && !waitlistDayPassReserved) {
      if (waitlistBypass) {
        await decrementDayPassOptionCapacity(body.dayPassOptionId, 1)
      } else if (!(await reserveDayPassOptionCapacity(body.dayPassOptionId, 1))) {
        await runRollback()
        return NextResponse.json(
          { error: 'Sorry, that day pass just sold out. Please go back and choose another option.' },
          { status: 400 }
        )
      }
      rollback.push(() => incrementDayPassOptionCapacity(body.dayPassOptionId, 1))
    }

    // Claim the coupon use now (not after payment), in one atomic step, so a
    // single-use or limited code can't be used by several people while their
    // checkouts are still open. Given back if this registration is released.
    if (appliedCoupon) {
      const couponId = appliedCoupon.id
      const claimed = await prisma.$executeRaw`
        UPDATE coupons SET usage_count = usage_count + 1
        WHERE id = ${couponId}::uuid AND active = true AND (
          usage_limit_type = 'unlimited'
          OR (usage_limit_type = 'single_use' AND usage_count < 1)
          OR (usage_limit_type = 'limited' AND (max_uses IS NULL OR usage_count < max_uses))
        )
      `
      if (claimed === 0) {
        await runRollback()
        return NextResponse.json(
          { error: 'That coupon code has just been used up. Please go back and remove it or try another code.' },
          { status: 400 }
        )
      }
      rollback.push(() => prisma.$executeRaw`
        UPDATE coupons SET usage_count = GREATEST(0, usage_count - 1) WHERE id = ${couponId}::uuid
      `)
    }

    // Generate unique confirmation code
    const eventYear = event.name.match(/\d{4}/)?.[0] || new Date().getFullYear().toString()
    let confirmationCode = generateIndividualConfirmationCode(eventYear)

    // Ensure uniqueness (try up to 5 times)
    let attempts = 0
    while (attempts < 5) {
      const existingCode = await prisma.individualRegistration.findUnique({
        where: { confirmationCode },
      })
      if (!existingCode) break
      confirmationCode = generateIndividualConfirmationCode(eventYear)
      attempts++
    }

    // Create individual registration
    const registration = await prisma.individualRegistration.create({
      data: {
        eventId: event.id,
        organizationId: event.organizationId,
        firstName,
        lastName,
        preferredName: body.preferredName || null,
        email,
        phone,
        street: body.street || null,
        city: body.city || null,
        state: body.state || null,
        zip: body.zip || null,
        age: body.age || null,
        gender: body.gender || null,
        ticketType: body.ticketType || 'general_admission',
        dayPassOptionId: body.dayPassOptionId || null,
        housingType: (housingType || null) as HousingType | null,
        roomType: roomType as RoomType | null,
        includesMealPackage: includeMealPackage,
        preferredRoommate: housingType === 'on_campus' ? body.preferredRoommate || null : null,
        tShirtSize: body.tShirtSize || null,
        dietaryRestrictions: body.dietaryRestrictions || null,
        adaAccommodations: body.adaAccommodations || null,
        emergencyContact1Name,
        emergencyContact1Phone,
        emergencyContact1Relation,
        emergencyContact2Name: body.emergencyContact2Name || null,
        emergencyContact2Phone: body.emergencyContact2Phone || null,
        emergencyContact2Relation: body.emergencyContact2Relation || null,
        registrationStatus,
        confirmationCode,
      },
    })
    rollback.push(() => deleteRegistrationPermanently('individual', registration.id))

    // Which coupon this registration used, so a release can give the use back
    if (appliedCoupon) {
      await prisma.couponRedemption.create({
        data: {
          couponId: appliedCoupon.id,
          registrationId: registration.id,
          registrationType: 'individual',
          discountApplied: appliedCoupon.discountAmount,
        },
      })
    }

    // Increment organization's registration counter
    await prisma.organization.update({
      where: { id: event.organizationId },
      data: {
        registrationsUsed: {
          increment: 1,
        },
      },
    })
    rollback.push(() => prisma.organization.update({
      where: { id: event.organizationId },
      data: { registrationsUsed: { decrement: 1 } },
    }))

    // Generate QR code containing registration data
    const qrCodeDataUrl = await generateIndividualRegistrationQr(registration)

    // Update registration with QR code
    await prisma.individualRegistration.update({
      where: { id: registration.id },
      data: { qrCode: qrCodeDataUrl },
    })

    // Save custom question answers
    const customAnswers: Array<{ questionId: string; answerText: string }> = body.customAnswers ?? []
    if (customAnswers.length > 0) {
      await prisma.customRegistrationAnswer.createMany({
        data: customAnswers.map(({ questionId, answerText }) => ({
          questionId,
          registrationId: registration.id,
          registrationType: 'individual' as const,
          answerText,
        })),
        skipDuplicates: true,
      })
    }

    // Create liability form if required for individuals (youth events)
    const liabilityFormsRequired = event.settings?.liabilityFormsRequiredIndividual ?? false
    const isMinor = !!body.age && Number(body.age) < 18
    let parentToken: string | null = null
    if (liabilityFormsRequired) {
      // Adults complete the 18+ form themselves from their confirmation email.
      // For a minor, this registration is step 1 of the youth form: their
      // details are copied over and the confirmation email takes a parent
      // straight to step 2 (medical, insurance, signature).
      parentToken = isMinor ? randomUUID() : null

      await prisma.liabilityForm.create({
        data: {
          organizationId: event.organizationId,
          eventId: event.id,
          individualRegistrationId: registration.id,
          formType: isMinor ? 'youth_u18' : 'youth_o18_chaperone',
          participantFirstName: firstName,
          participantLastName: lastName,
          participantPreferredName: body.preferredName || null,
          participantAge: body.age || null,
          participantGender: body.gender || null,
          participantEmail: email,
          participantPhone: phone,
          tShirtSize: body.tShirtSize || null,
          dietaryRestrictions: body.dietaryRestrictions || null,
          adaAccommodations: body.adaAccommodations || null,
          signatureData: {},
          completed: false,
          ...(isMinor
            ? {
                participantType: 'youth_u18' as const,
                parentEmail: email,
                parentToken,
                parentTokenExpiresAt: individualParentTokenExpiry(event.endDate),
                emergencyContact1Name,
                emergencyContact1Phone,
                emergencyContact1Relation,
                emergencyContact2Name: body.emergencyContact2Name || null,
                emergencyContact2Phone: body.emergencyContact2Phone || null,
                emergencyContact2Relation: body.emergencyContact2Relation || null,
              }
            : {}),
        },
      })
    }

    // Create payment balance record
    const paymentBalanceStatus =
      effectivePaymentMethod === 'free'
        ? 'paid_full'
        : effectivePaymentMethod === 'check' ? 'pending_check_payment' : 'unpaid'

    await prisma.paymentBalance.create({
      data: {
        organizationId: event.organizationId,
        eventId: event.id,
        registrationId: registration.id,
        registrationType: 'individual',
        totalAmountDue: totalAmount,
        amountPaid: 0,
        amountRemaining: totalAmount,
        lateFeesApplied: 0,
        paymentStatus: paymentBalanceStatus,
      },
    })

    // If this person was on the waitlist (status='contacted' after admin invite),
    // flip their entry to 'registered' so the admin dashboard reflects reality
    // and the conversion analytics work. When a waitlist token was used, match
    // by token instead of email — email matching is fragile (case/whitespace/
    // different address at registration time) and would leave the entry stuck
    // in 'contacted' forever. No-op if they registered normally. Called once the
    // registration has gone through, so a failed attempt doesn't flip it.
    const markWaitlistRegistered = () =>
      waitlistToken
        ? markWaitlistAsRegisteredByToken(waitlistToken)
        : markWaitlistAsRegistered(event.id, email)

    // Nothing to pay: confirmed now, same email as a paid card registration
    if (effectivePaymentMethod === 'free') {
      await markWaitlistRegistered()

      const confirmedEmail = buildIndividualConfirmedEmail({
        registration: {
          ...registration,
          dayPassName: dayPassOption?.name,
          parentToken,
        },
        event,
        payment: { method: 'free' },
      })
      const emailLog = {
        organizationId: event.organizationId,
        eventId: event.id,
        registrationId: registration.id,
        registrationType: 'individual' as const,
        recipientEmail: email,
        recipientName: `${firstName} ${lastName}`,
        emailType: 'individual_free_registration_confirmation',
        subject: confirmedEmail.subject,
        htmlContent: confirmedEmail.html,
      }
      try {
        await resend.emails.send({
          from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
          reply_to: resolveReplyTo(event.settings, event.organization),
          to: email,
          subject: confirmedEmail.subject,
          html: confirmedEmail.html,
        })
        await logEmail({ ...emailLog, metadata: { totalAmount, housingType, confirmationCode } })
      } catch (emailError) {
        console.error('Error sending free registration confirmation email:', emailError)
        await logEmailFailure(emailLog, emailError instanceof Error ? emailError.message : 'Unknown error')
      }

      return NextResponse.json({
        success: true,
        registrationId: registration.id,
        confirmationCode,
        qrCode: qrCodeDataUrl,
        checkoutUrl: null,
        totalAmount,
        paymentMethod: 'free',
      })
    }

    // Handle payment method
    if (effectivePaymentMethod === 'check') {
      // Pay later / by check: no Payment row is created here. The full amount
      // already shows as the balance due (status pending_check_payment); a
      // payment is recorded only when the check actually arrives.

      // Fetch event settings for check payment details
      const eventSettings = await prisma.eventSettings.findUnique({
        where: { eventId: event.id },
      })

      // Prepare email content
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'
      const attendanceLines = individualAttendanceLines({
        ticketType: body.ticketType,
        housingType,
        roomType,
        housingOffered: eventOffersHousing(event.settings, event.startDate, event.endDate),
        dayPassName: dayPassOption?.name,
        settings: event.settings,
        includesMealPackage: includeMealPackage,
      })
      const emailSubject = `Registration Received - ${event.name}`
      const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <!-- ChiRho Events Logo Header -->
            <div style="text-align: center; padding: 20px 0; background-color: #1E3A5F;">
              <img src="${process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'}/logo-horizontal.png" alt="ChiRho Events" style="max-width: 200px; height: auto;" />
            </div>

            <div style="padding: 30px 20px;">
              <h1 style="color: #1E3A5F; margin-top: 0;">Registration Received!</h1>

              <p>Thank you for registering for ${event.name}, ${firstName}!</p>

              ${organizerMessageBlock(eventSettings?.confirmationEmailMessage)}

              <div style="background-color: #E8F4F8; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #1E3A5F;">
                <h2 style="color: #1E3A5F; margin-top: 0;">Your Confirmation Code</h2>
                <div style="background-color: white; padding: 15px; border-radius: 5px; display: inline-block; margin: 10px 0;">
                  <span style="font-size: 28px; font-weight: bold; color: #1E3A5F; letter-spacing: 2px; font-family: 'Courier New', monospace;">${confirmationCode}</span>
                </div>
                <p style="font-size: 14px; color: #666; margin-top: 10px;">
                  Keep this code safe! You'll need it for payments and to look up your registration.
                </p>
              </div>

              <div style="background-color: #F5F1E8; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <h2 style="color: #9C8466; margin-top: 0;">Your Check-In QR Code</h2>
                <a href="${appUrl}/registration/confirmation/individual/${registration.id}"
                   style="display: inline-block; background-color: #1E3A5F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 0;">
                  View My QR Code
                </a>
                <p style="font-size: 14px; color: #666; margin-top: 10px;">
                  Save this QR code! You'll need it for check-in at the event.
                </p>
              </div>

              <div style="background-color: #FFF3CD; padding: 20px; border-left: 4px solid #FFC107; margin: 20px 0;">
                <h3 style="color: #856404; margin-top: 0;">⚠️ Payment Required</h3>
                ${forcedCheckDueToCardDisabled ? `
                <p style="color: #856404; margin: 0 0 4px 0;"><strong>${CARD_PAYMENT_DISABLED_TITLE}</strong></p>
                <p style="color: #856404; margin: 0 0 10px 0;">${CARD_PAYMENT_DISABLED_MESSAGE}</p>
                ` : ''}
                <p style="color: #856404; margin: 0;">
                  <strong>Your registration is PENDING until we receive your check payment.</strong>
                </p>
              </div>

              <div style="background-color: #E8F4F8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1E3A5F; margin-top: 0;">Check Payment Instructions</h3>
                <p style="margin: 5px 0;"><strong>Make check payable to:</strong> ${eventSettings?.checkPaymentPayableTo || event.organization.name}</p>
                <p style="margin: 5px 0;"><strong>Amount:</strong> $${totalAmount.toFixed(2)}</p>
                <p style="margin: 5px 0;"><strong>Write on check memo:</strong> ${confirmationCode} - ${firstName} ${lastName}</p>
                ${eventSettings?.checkPaymentAddress ? `
                  <p style="margin: 10px 0 5px 0;"><strong>Mail to:</strong></p>
                  <p style="margin: 0; white-space: pre-line;">${eventSettings.checkPaymentAddress}</p>
                ` : ''}
              </div>

              <h3 style="color: #1E3A5F;">Registration Summary</h3>
              <div style="background-color: #F5F5F5; padding: 15px; border-radius: 8px;">
                <p style="margin: 5px 0;"><strong>Name:</strong> ${firstName} ${lastName}</p>
                ${attendanceLines.map(line => `<p style="margin: 5px 0;"><strong>${line.label}:</strong> ${line.value}</p>`).join('')}
                <p style="margin: 5px 0;"><strong>Total Cost:</strong> $${totalAmount.toFixed(2)}</p>
                <p style="margin: 5px 0;"><strong>Payment Method:</strong> Check (Pending)</p>
              </div>

              <h3 style="color: #1E3A5F;">Next Steps:</h3>
              <ol>
                <li><strong>Mail Your Check:</strong> Send your check using the instructions above.</li>
                ${liabilityFormsRequired ? `
                <li><strong>${isMinor ? 'Parent/Guardian Completes the Liability Form' : 'Complete Your Liability Form'}:</strong> Use the button below${isMinor ? ` — a parent or guardian must fill out and sign ${firstName}'s form` : ''}.</li>
                ` : ''}
                <li><strong>Payment Confirmed:</strong> Your registration is confirmed once the organizer receives your check.</li>
                <li><strong>Check-In:</strong> Bring your QR code (on your phone or printed) to check in at the event.</li>
              </ol>

              ${liabilityFormsRequired ? individualLiabilityEmailBlock({
                url: individualLiabilityFormUrl(appUrl, confirmationCode, parentToken),
                isMinor,
                participantFirstName: firstName,
              }) : ''}

              ${eventSettings?.registrationInstructions ? `
                <div style="background-color: #F0F8FF; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #1E3A5F; margin-top: 0;">Important Information</h3>
                  <p style="white-space: pre-line;">${eventSettings.registrationInstructions}</p>
                </div>
              ` : ''}

              <!-- FIX 3.14: Org contact info block -->
              <div style="background-color: #E8F4FD; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1E3A5F;">
                <h3 style="color: #1E3A5F; margin-top: 0;">Need to Make Changes?</h3>
                <p style="color: #333; margin-bottom: 8px;">
                  Individual registrations are managed by <strong>${event.organization.name}</strong>.
                  Please contact the organizer directly:
                </p>
                ${event.organization.contactEmail ? `<p style="margin: 4px 0;">📧 <a href="mailto:${event.organization.contactEmail}" style="color: #1E3A5F;">${event.organization.contactEmail}</a></p>` : ''}
                ${event.organization.contactPhone ? `<p style="margin: 4px 0;">📞 <a href="tel:${event.organization.contactPhone}" style="color: #1E3A5F;">${event.organization.contactPhone}</a></p>` : ''}
                ${event.organization.website ? `<p style="margin: 4px 0;">🌐 <a href="${event.organization.website}" style="color: #1E3A5F;">${event.organization.website}</a></p>` : ''}
              </div>

              <p style="color: #666; font-size: 12px; margin-top: 30px;">
                © ${new Date().getFullYear()} ChiRho Events. All rights reserved.
              </p>
            </div>
          </div>
        `

      // Send confirmation email for check payment
      try {
        await resend.emails.send({
          from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
          reply_to: resolveReplyTo(event.settings, event.organization),
          to: email,
          subject: emailSubject,
          html: emailHtml,
        })

        // Log the email
        await logEmail({
          organizationId: event.organizationId,
          eventId: event.id,
          registrationId: registration.id,
          registrationType: 'individual',
          recipientEmail: email,
          recipientName: `${firstName} ${lastName}`,
          emailType: 'individual_check_payment_confirmation',
          subject: emailSubject,
          htmlContent: emailHtml,
          metadata: {
            totalAmount,
            housingType,
            confirmationCode,
          },
        })
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError)
        await logEmailFailure(
          {
            organizationId: event.organizationId,
            eventId: event.id,
            registrationId: registration.id,
            registrationType: 'individual',
            recipientEmail: email,
            recipientName: `${firstName} ${lastName}`,
            emailType: 'individual_check_payment_confirmation',
            subject: emailSubject,
            htmlContent: emailHtml,
          },
          emailError instanceof Error ? emailError.message : 'Unknown error'
        )
      }

      await markWaitlistRegistered()

      // Return without Stripe checkout URL
      return NextResponse.json({
        success: true,
        registrationId: registration.id,
        confirmationCode,
        qrCode: qrCodeDataUrl,
        checkoutUrl: null,
        totalAmount,
        paymentMethod: 'check',
      })
    } else {
      // Credit card payment - create Stripe checkout session
      const totalAmountCents = Math.round(totalAmount * 100)

      // Calculate platform fee — includes Stripe processing fee passthrough so the
      // platform nets its configured margin instead of going negative on every charge.
      const platformFeePercentage = Number(event.organization.platformFeePercentage) || 1
      const platformFeeAmount = calculatePlatformFeeCents(totalAmountCents, platformFeePercentage)

      // Build checkout session config
      const checkoutConfig: any = {
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${event.name} - Individual Registration`,
                description: `Registration for ${firstName} ${lastName}`,
              },
              unit_amount: totalAmountCents,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        // Give the spot back if they don't pay within the hold window
        expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_HOLD_SECONDS,
        success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/registration/confirmation/individual/${registration.id}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/events/${eventId}/register-individual/review?cancelled=true`,
        metadata: {
          registrationId: registration.id,
          eventId: event.id,
          registrationType: 'individual',
          participantName: `${firstName} ${lastName}`,
          platformFeeAmount: platformFeeAmount.toString(),
          couponId: appliedCoupon?.id || '',
        },
        customer_email: email,
      }

      // Fix #1 (individual): Always use destination charges — guard above ensures stripeAccountId is present.
      // on_behalf_of makes the connected account the merchant of record so Stripe's
      // processing fees (2.9% + $0.30) are deducted from their share, not the platform's.
      checkoutConfig.payment_intent_data = {
        application_fee_amount: platformFeeAmount,
        on_behalf_of: event.organization.stripeAccountId,
        transfer_data: {
          destination: event.organization.stripeAccountId,
        },
      }
      console.log(`[Stripe Connect] Applying platform fee: $${(platformFeeAmount / 100).toFixed(2)} to org ${event.organization.id}`)

      const checkoutSession = await stripe.checkout.sessions.create(checkoutConfig)
      rollback.push(() => stripe.checkout.sessions.expire(checkoutSession.id))

      // Create payment record
      await prisma.payment.create({
        data: {
          organizationId: event.organizationId,
          registrationId: registration.id,
          registrationType: 'individual',
          eventId: event.id,
          amount: totalAmount,
          paymentType: 'balance',
          paymentMethod: 'card',
          paymentStatus: 'pending',
          // Stripe Checkout in mode='payment' does NOT create the PaymentIntent
          // until the customer pays, so checkoutSession.payment_intent is null
          // here. Store the session id (cs_...) and let the webhook swap it for
          // the real pi_... on checkout.session.completed.
          stripePaymentIntentId: checkoutSession.id,
          platformFeeAmount: platformFeeAmount / 100, // Store in dollars
        },
      })

      await markWaitlistRegistered()

      return NextResponse.json({
        success: true,
        registrationId: registration.id,
        confirmationCode,
        qrCode: qrCodeDataUrl,
        checkoutUrl: checkoutSession.url,
        totalAmount,
        paymentMethod: 'card',
      })
    }
  } catch (error) {
    console.error('Individual registration error:', error)
    await runRollback()
    return NextResponse.json(
      { error: 'Failed to process registration. Please try again.' },
      { status: 500 }
    )
  }
}
