import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'
import { Resend } from 'resend'
import QRCode from 'qrcode'

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
        organization: true,
      },
    })

    if (!event || !event.pricing) {
      return NextResponse.json(
        { error: 'Event not found or pricing not configured' },
        { status: 404 }
      )
    }

    // Calculate price based on housing type
    let totalAmount = Number(event.pricing.youthRegularPrice)

    if (housingType === 'on_campus' && event.pricing.onCampusYouthPrice) {
      totalAmount = Number(event.pricing.onCampusYouthPrice)
    } else if (housingType === 'off_campus' && event.pricing.offCampusYouthPrice) {
      totalAmount = Number(event.pricing.offCampusYouthPrice)
    } else if (housingType === 'day_pass' && event.pricing.dayPassYouthPrice) {
      totalAmount = Number(event.pricing.dayPassYouthPrice)
    }

    // Determine registration status based on payment method
    const registrationStatus =
      paymentMethod === 'check' ? 'pending_payment' : 'incomplete'

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
        address: body.address || null,
        age: body.age || null,
        gender: body.gender || null,
        housingType,
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

      // Send confirmation email for check payment
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'hello@chirhoevents.com',
        to: email,
        subject: `Registration Received - ${event.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <!-- ChiRho Events Logo Header -->
            <div style="text-align: center; padding: 20px 0; background-color: #1E3A5F;">
              <img src="${process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'}/logo-horizontal.png" alt="ChiRho Events" style="max-width: 200px; height: auto;" />
            </div>

            <div style="padding: 30px 20px;">
              <h1 style="color: #1E3A5F; margin-top: 0;">Registration Received!</h1>

              <p>Thank you for registering for ${event.name}, ${firstName}!</p>

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
                <p style="margin: 5px 0;"><strong>Write on check memo:</strong> ${firstName} ${lastName}</p>
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
                <li><strong>Complete Your Liability Form:</strong> You'll receive a separate email with instructions to complete your liability form.</li>
                <li><strong>Wait for Confirmation:</strong> We'll email you once your check is received and processed.</li>
                <li><strong>Check-In:</strong> Bring your QR code (save this email or download the QR code) to check in at the event.</li>
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
        qrCode: qrCodeDataUrl,
        checkoutUrl: null,
        totalAmount,
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
                name: `${event.name} - Individual Registration`,
                description: `Registration for ${firstName} ${lastName}`,
              },
              unit_amount: Math.round(totalAmount * 100), // Convert to cents
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
        },
        customer_email: email,
      })

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
          stripePaymentIntentId: checkoutSession.id,
        },
      })

      return NextResponse.json({
        success: true,
        registrationId: registration.id,
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
