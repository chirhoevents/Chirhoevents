import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'
import { Resend } from 'resend'
import QRCode from 'qrcode'
import { generateStaffPorosCode } from '@/lib/access-code'
import { logEmail, logEmailFailure } from '@/lib/email-logger'

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
      role,
      tshirtSize,
      dietaryRestrictions,
      isVendorStaff,
      vendorCode,
      price,
    } = body

    if (!eventId || !firstName || !lastName || !email || !phone || !role || !tshirtSize) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Fetch event and settings
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        settings: true,
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

    if (!event || !event.settings) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Check if staff registration is enabled
    if (!event.settings.staffRegistrationEnabled) {
      return NextResponse.json(
        { error: 'Staff registration is not enabled for this event' },
        { status: 400 }
      )
    }

    // Validate vendor code if vendor staff
    let vendorRegistration = null
    if (isVendorStaff) {
      if (!vendorCode) {
        return NextResponse.json(
          { error: 'Vendor code is required for vendor staff registration' },
          { status: 400 }
        )
      }

      vendorRegistration = await prisma.vendorRegistration.findFirst({
        where: {
          vendorCode: vendorCode.toUpperCase(),
          eventId,
          status: 'approved',
        },
      })

      if (!vendorRegistration) {
        return NextResponse.json(
          { error: 'Invalid or unapproved vendor code' },
          { status: 400 }
        )
      }
    }

    // Calculate price
    const totalAmount = isVendorStaff
      ? Number(event.settings.vendorStaffPrice || 0)
      : Number(event.settings.staffVolunteerPrice || 0)

    // Generate QR code
    const qrCodeData = `STAFF-${eventId}-${Date.now()}`
    const qrCode = await QRCode.toDataURL(qrCodeData)

    // Generate Poros access code if liability forms are enabled
    let porosAccessCode: string | null = null
    if (event.settings.liabilityFormsRequiredGroup) {
      const eventYear = event.name.match(/\d{4}/)?.[0] || new Date().getFullYear().toString()
      porosAccessCode = generateStaffPorosCode(eventYear)

      // Ensure uniqueness
      let attempts = 0
      while (attempts < 5) {
        const existing = await prisma.staffRegistration.findUnique({
          where: { porosAccessCode },
        })
        if (!existing) break
        porosAccessCode = generateStaffPorosCode(eventYear)
        attempts++
      }
    }

    // Create staff registration
    const registration = await prisma.staffRegistration.create({
      data: {
        eventId: event.id,
        organizationId: event.organizationId,
        firstName,
        lastName,
        email,
        phone,
        role,
        tshirtSize,
        dietaryRestrictions: dietaryRestrictions || null,
        isVendorStaff: isVendorStaff || false,
        vendorCode: isVendorStaff ? vendorCode.toUpperCase() : null,
        vendorRegistrationId: vendorRegistration?.id || null,
        pricePaid: totalAmount,
        paymentStatus: totalAmount > 0 ? 'pending' : 'paid',
        porosAccessCode,
        qrCode,
      },
    })

    // If payment required, create Stripe checkout session
    if (totalAmount > 0) {
      if (!event.organization.stripeAccountId || !event.organization.stripeChargesEnabled) {
        return NextResponse.json(
          { error: 'Payment processing is not configured for this organization' },
          { status: 400 }
        )
      }

      const platformFeePercentage = Number(event.organization.platformFeePercentage || 1)
      const platformFeeAmount = Math.round(totalAmount * 100 * platformFeePercentage / 100)

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${isVendorStaff ? 'Vendor Booth' : ''} Staff Registration - ${event.name}`,
                description: `${firstName} ${lastName} - ${role}`,
              },
              unit_amount: Math.round(totalAmount * 100),
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          application_fee_amount: platformFeeAmount,
          transfer_data: {
            destination: event.organization.stripeAccountId,
          },
          metadata: {
            registrationId: registration.id,
            registrationType: 'staff',
            eventId: event.id,
          },
        },
        success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/events/${eventId}/register-staff/success?id=${registration.id}`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/events/${eventId}/register-staff?cancelled=true`,
        metadata: {
          registrationId: registration.id,
          registrationType: 'staff',
        },
      })

      return NextResponse.json({
        registration,
        checkoutUrl: session.url,
      })
    }

    // Free registration - send confirmation email
    try {
      const emailContent = `
        <h2>Staff Registration Confirmed!</h2>
        <p>Hi ${firstName},</p>
        <p>Thank you for registering as a ${isVendorStaff ? 'vendor booth staff member' : 'staff/volunteer'} for <strong>${event.name}</strong>.</p>

        <h3>Registration Details:</h3>
        <ul>
          <li><strong>Name:</strong> ${firstName} ${lastName}</li>
          <li><strong>Role:</strong> ${role}</li>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>T-Shirt Size:</strong> ${tshirtSize}</li>
          ${isVendorStaff && vendorRegistration ? `<li><strong>Vendor Booth:</strong> ${vendorRegistration.businessName}</li>` : ''}
        </ul>

        ${porosAccessCode ? `
        <h3>Liability Form</h3>
        <p>Please complete your liability form using the following access code:</p>
        <p style="font-size: 18px; font-weight: bold; background: #f0f0f0; padding: 10px; text-align: center;">${porosAccessCode}</p>
        <p>Visit the liability form portal and enter this code to complete your form.</p>
        ` : ''}

        <p>We look forward to seeing you at the event!</p>
      `

      await resend.emails.send({
        from: 'ChiRho Events <noreply@chirhoevents.com>',
        to: email,
        subject: `Staff Registration Confirmed - ${event.name}`,
        html: emailContent,
      })

      await logEmail({
        organizationId: event.organizationId,
        eventId: event.id,
        registrationId: registration.id,
        registrationType: 'staff',
        recipientEmail: email,
        recipientName: `${firstName} ${lastName}`,
        emailType: 'staff_registration_confirmation',
        subject: `Staff Registration Confirmed - ${event.name}`,
        htmlContent: emailContent,
      })
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError)
      await logEmailFailure({
        organizationId: event.organizationId,
        eventId: event.id,
        registrationId: registration.id,
        registrationType: 'staff',
        recipientEmail: email,
        recipientName: `${firstName} ${lastName}`,
        emailType: 'staff_registration_confirmation',
        subject: `Staff Registration Confirmed - ${event.name}`,
        htmlContent: '',
        errorMessage: emailError instanceof Error ? emailError.message : 'Unknown error',
      })
    }

    return NextResponse.json({ registration })
  } catch (error) {
    console.error('Staff registration error:', error)
    return NextResponse.json(
      { error: 'Failed to process registration' },
      { status: 500 }
    )
  }
}
