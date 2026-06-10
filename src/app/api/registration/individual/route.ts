import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'
import { Resend } from 'resend'
import QRCode from 'qrcode'
import { logEmail, logEmailFailure } from '@/lib/email-logger'
import { generateIndividualConfirmationCode } from '@/lib/access-code'
import { resolveReplyTo } from '@/lib/email-reply-to'
import {
  checkOptionCapacity,
  decrementOptionCapacity,
  checkDayPassOptionCapacity,
  decrementDayPassOptionCapacity,
  type HousingType,
  type RoomType
} from '@/lib/option-capacity'
import { markWaitlistAsRegistered } from '@/lib/waitlist-utils'

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
      firstName,
      lastName,
      email,
      phone,
      housingType,
      emergencyContact1Name,
      emergencyContact1Phone,
      emergencyContact1Relation,
      paymentMethod = 'card', // 'card' or 'check'
      couponCode = '',
    } = body

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
            contactEmail: true,
            contactPhone: true,
            website: true,
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

    // Fix #1 (individual): Guard — org must have Stripe onboarding complete before accepting card payments
    if (!event.organization.stripeAccountId || !event.organization.stripeChargesEnabled) {
      return NextResponse.json(
        { error: 'This organization has not completed payment setup. Registration cannot be processed at this time. Please contact the event organizer.' },
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
    }

    // Check option-level capacity (housing type and room type)
    const optionCapacityCheck = checkOptionCapacity(
      event.settings,
      housingType as HousingType,
      (body.roomType || null) as RoomType | null,
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

    // Check day pass option capacity (if applicable)
    if (body.ticketType === 'day_pass' && body.dayPassOptionId) {
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

    // Calculate price for individual registration based on housing type, early bird, and add-ons
    let totalAmount = 0

    // Check for early bird pricing
    const now = new Date()
    const earlyBirdDeadline = event.pricing.earlyBirdDeadline ? new Date(event.pricing.earlyBirdDeadline) : null
    const isEarlyBird = earlyBirdDeadline && now <= earlyBirdDeadline

    // Base price by housing type (with early bird support for default)
    if (housingType === 'on_campus' && event.pricing.individualBasePrice) {
      // For on-campus, use individual base price (early bird is typically for base registration)
      totalAmount = isEarlyBird
        ? Number(event.pricing.individualEarlyBirdPrice || event.pricing.individualBasePrice)
        : Number(event.pricing.individualBasePrice)
    } else if (housingType === 'off_campus' && event.pricing.individualOffCampusPrice) {
      totalAmount = Number(event.pricing.individualOffCampusPrice)
    } else if (housingType === 'day_pass') {
      // FIX 4.8: Use DayPassOption.price when a specific option is selected;
      // fall back to the legacy flat event.pricing.individualDayPassPrice
      if (body.dayPassOptionId) {
        const dayPassOpt = await prisma.dayPassOption.findUnique({
          where: { id: body.dayPassOptionId },
          select: { price: true },
        })
        if (dayPassOpt) {
          totalAmount = Number(dayPassOpt.price)
        } else if (event.pricing.individualDayPassPrice) {
          totalAmount = Number(event.pricing.individualDayPassPrice)
        }
      } else if (event.pricing.individualDayPassPrice) {
        totalAmount = Number(event.pricing.individualDayPassPrice)
      }
    } else {
      // Fallback to early bird price if applicable, then individual base price or youth price
      totalAmount = isEarlyBird
        ? Number(event.pricing.individualEarlyBirdPrice || event.pricing.individualBasePrice || event.pricing.youthRegularPrice)
        : Number(event.pricing.individualBasePrice || event.pricing.youthRegularPrice)
    }

    // Add room type pricing (for on-campus housing)
    if (housingType === 'on_campus' && body.roomType) {
      const roomType = body.roomType as string
      if (roomType === 'single' && event.pricing.singleRoomPrice) {
        totalAmount += Number(event.pricing.singleRoomPrice)
      } else if (roomType === 'double' && event.pricing.doubleRoomPrice) {
        totalAmount += Number(event.pricing.doubleRoomPrice)
      } else if (roomType === 'triple' && event.pricing.tripleRoomPrice) {
        totalAmount += Number(event.pricing.tripleRoomPrice)
      } else if (roomType === 'quad' && event.pricing.quadRoomPrice) {
        totalAmount += Number(event.pricing.quadRoomPrice)
      }
    }

    // Add meal package if included
    if (body.includeMealPackage && event.pricing.individualMealPackagePrice) {
      totalAmount += Number(event.pricing.individualMealPackagePrice)
    }

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
          // NOTE: usageCount is incremented after confirmed payment (webhook for card, here for check)
        }
      }
    }

    // Determine registration status based on payment method
    const registrationStatus =
      paymentMethod === 'check' ? 'pending_payment' : 'incomplete'

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
        housingType: housingType || null,
        roomType: body.roomType || null,
        preferredRoommate: body.preferredRoommate || null,
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

    // Increment organization's registration counter
    await prisma.organization.update({
      where: { id: event.organizationId },
      data: {
        registrationsUsed: {
          increment: 1,
        },
      },
    })

    // Generate QR code containing registration data
    const qrData = JSON.stringify({
      registration_id: registration.id,
      event_id: event.id,
      type: 'individual',
      name: `${firstName} ${lastName}`,
    })

    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 300,
    })

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

    // Create liability form if required for individuals
    const liabilityFormsRequired = event.settings?.liabilityFormsRequiredIndividual ?? false
    if (liabilityFormsRequired) {
      // Determine form type based on age (if provided)
      let formType: 'youth_u18' | 'youth_o18_chaperone' | 'clergy' = 'youth_o18_chaperone' // Default for adults
      if (body.age && body.age < 18) {
        formType = 'youth_u18'
      }

      await prisma.liabilityForm.create({
        data: {
          organizationId: event.organizationId,
          eventId: event.id,
          individualRegistrationId: registration.id,
          formType: formType,
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
        },
      })
    }

    // Create payment balance record
    const paymentBalanceStatus =
      paymentMethod === 'check' ? 'pending_check_payment' : 'unpaid'

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

    // Update event capacity if capacity tracking is enabled (individual = 1 participant)
    if (event.capacityTotal !== null && event.capacityRemaining !== null) {
      await prisma.event.update({
        where: { id: event.id },
        data: {
          capacityRemaining: Math.max(0, event.capacityRemaining - 1),
        },
      })
    }

    // Update option-level capacity (housing type and room type)
    // Only decrement housing capacity for general admission (day pass doesn't use housing)
    if (body.ticketType !== 'day_pass') {
      await decrementOptionCapacity(
        event.id,
        housingType as HousingType,
        (body.roomType || null) as RoomType | null,
        1 // Individual registration = 1 person
      )
    }

    // Update day pass option capacity (if applicable)
    if (body.ticketType === 'day_pass' && body.dayPassOptionId) {
      await decrementDayPassOptionCapacity(
        body.dayPassOptionId,
        1 // Individual registration = 1 person
      )
    }

    // If this person was on the waitlist (status='contacted' after admin invite),
    // flip their entry to 'registered' so the admin dashboard reflects reality
    // and the conversion analytics work. No-op if they registered normally.
    await markWaitlistAsRegistered(event.id, email)

    // Handle payment method
    if (paymentMethod === 'check') {
      // Check payment - create pending payment record
      await prisma.payment.create({
        data: {
          organizationId: event.organizationId,
          registrationId: registration.id,
          registrationType: 'individual',
          eventId: event.id,
          amount: totalAmount,
          paymentType: 'balance',
          paymentMethod: 'check',
          paymentStatus: 'pending',
        },
      })

      // Fetch event settings for check payment details
      const eventSettings = await prisma.eventSettings.findUnique({
        where: { eventId: event.id },
      })

      // Prepare email content
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
                <h2 style="color: #9C8466; margin-top: 0;">Your QR Code</h2>
                <img src="${qrCodeDataUrl}" alt="Registration QR Code" style="max-width: 200px; height: auto;" />
                <p style="font-size: 14px; color: #666; margin-top: 10px;">
                  Save this QR code! You'll need it for check-in at the event.
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
                <p style="margin: 5px 0;"><strong>Housing Type:</strong> ${housingType.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</p>
                ${body.roomType ? `<p style="margin: 5px 0;"><strong>Room Type:</strong> ${body.roomType}</p>` : ''}
                <p style="margin: 5px 0;"><strong>Total Cost:</strong> $${totalAmount.toFixed(2)}</p>
                <p style="margin: 5px 0;"><strong>Payment Method:</strong> Check (Pending)</p>
              </div>

              <h3 style="color: #1E3A5F;">Next Steps:</h3>
              <ol>
                <li><strong>Mail Your Check:</strong> Send your check using the instructions above.</li>
                ${liabilityFormsRequired ? `
                <li><strong>Complete Your Liability Form:</strong> Click the button below to complete your required liability form.</li>
                ` : ''}
                <li><strong>Wait for Confirmation:</strong> We'll email you once your check is received and processed.</li>
                <li><strong>Check-In:</strong> Bring your QR code (save this email or download the QR code) to check in at the event.</li>
              </ol>

              ${liabilityFormsRequired ? `
              <div style="background-color: #FEF3C7; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #F59E0B;">
                <h3 style="color: #92400E; margin-top: 0;">📋 Liability Form Required</h3>
                <p style="color: #92400E; margin-bottom: 15px;">
                  ${body.age && body.age < 18
                    ? 'Since you are under 18, a parent or guardian must complete and sign your liability form.'
                    : 'Please complete your liability form before the event.'}
                </p>
                <div style="text-align: center;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'}/poros/${confirmationCode}"
                     style="display: inline-block; background-color: #1E3A5F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    Complete Liability Form
                  </a>
                </div>
                <p style="color: #78716C; font-size: 12px; margin-top: 15px; text-align: center;">
                  Or copy this link: ${process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'}/poros/${confirmationCode}
                </p>
              </div>
              ` : ''}

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
                © 2025 ChiRho Events. All rights reserved.
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
        confirmationCode,
        qrCode: qrCodeDataUrl,
        checkoutUrl: null,
        totalAmount,
        paymentMethod: 'check',
      })
    } else {
      // Credit card payment - create Stripe checkout session
      const totalAmountCents = Math.round(totalAmount * 100)

      // Calculate platform fee (default 1%)
      const platformFeePercentage = Number(event.organization.platformFeePercentage) || 1
      const platformFeeAmount = Math.round(totalAmountCents * (platformFeePercentage / 100))

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
    return NextResponse.json(
      { error: 'Failed to process registration. Please try again.' },
      { status: 500 }
    )
  }
}
