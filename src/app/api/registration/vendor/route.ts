import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { generateVendorCode, generateVendorAccessCode } from '@/lib/access-code'
import { logEmail, logEmailFailure } from '@/lib/email-logger'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    const {
      eventId,
      businessName,
      contactFirstName,
      contactLastName,
      email,
      phone,
      boothDescription,
      selectedTier,
      additionalNeeds,
      tierPrice,
    } = body

    if (!eventId || !businessName || !contactFirstName || !contactLastName ||
        !email || !phone || !boothDescription || !selectedTier) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if eventId is a UUID or a slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId)

    // Fetch event and settings
    const event = await prisma.event.findUnique({
      where: isUuid ? { id: eventId } : { slug: eventId },
      include: {
        settings: true,
        organization: {
          select: {
            id: true,
            name: true,
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

    // Check if vendor registration is enabled
    if (!event.settings.vendorRegistrationEnabled) {
      return NextResponse.json(
        { error: 'Vendor registration is not enabled for this event' },
        { status: 400 }
      )
    }

    // Generate unique vendor code
    let vendorCode = generateVendorCode()
    let attempts = 0
    while (attempts < 5) {
      const existing = await prisma.vendorRegistration.findUnique({
        where: { vendorCode },
      })
      if (!existing) break
      vendorCode = generateVendorCode()
      attempts++
    }

    // Generate unique access code
    let accessCode = generateVendorAccessCode()
    attempts = 0
    while (attempts < 5) {
      const existing = await prisma.vendorRegistration.findUnique({
        where: { accessCode },
      })
      if (!existing) break
      accessCode = generateVendorAccessCode()
      attempts++
    }

    // Get tier info
    const vendorTiers = event.settings.vendorTiers as Array<{
      id: string
      name: string
      price: string
      description: string
    }> | null
    const tier = vendorTiers?.find(t => t.id === selectedTier)
    const tierName = tier?.name || 'Custom'
    const price = Number(tierPrice || tier?.price || 0)

    // Create vendor registration
    const registration = await prisma.vendorRegistration.create({
      data: {
        eventId: event.id,
        organizationId: event.organizationId,
        businessName,
        contactFirstName,
        contactLastName,
        email,
        phone,
        boothDescription,
        selectedTier: tierName,
        tierPrice: price,
        additionalNeeds: additionalNeeds || null,
        status: 'pending',
        vendorCode,
        accessCode,
        paymentStatus: 'unpaid',
        amountPaid: 0,
      },
    })

    // Send confirmation email
    try {
      const emailContent = `
        <h2>Vendor Application Received!</h2>
        <p>Hi ${contactFirstName},</p>
        <p>We're excited that <strong>${businessName}</strong> has applied for a vendor booth at <strong>${event.name}</strong>!</p>

        <h3>Application Details:</h3>
        <ul>
          <li><strong>Business Name:</strong> ${businessName}</li>
          <li><strong>Contact:</strong> ${contactFirstName} ${contactLastName}</li>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Booth Type:</strong> ${tierName}</li>
          <li><strong>Base Price:</strong> ${price > 0 ? `$${price.toFixed(2)}` : 'To be determined'}</li>
        </ul>

        <h3>What happens next?</h3>
        <ol>
          <li>Our team will review your application</li>
          <li>Once approved, you will receive an email with:
            <ul>
              <li>Your vendor code for booth staff registration</li>
              <li>Access to your vendor portal</li>
              <li>Your invoice for booth payment</li>
            </ul>
          </li>
          <li>After payment, you can share your vendor code with your booth staff</li>
        </ol>

        <p>Thank you for your interest in being a vendor at our event. We will be in touch soon!</p>

        <p style="color: #666; font-size: 12px;">
          If you have any questions, please contact the event organizers.
        </p>
      `

      await resend.emails.send({
        from: 'ChiRho Events <noreply@chirhoevents.com>',
        to: email,
        subject: `Vendor Application Received - ${event.name}`,
        html: emailContent,
      })

      await logEmail({
        organizationId: event.organizationId,
        eventId: event.id,
        registrationId: registration.id,
        registrationType: 'vendor',
        recipientEmail: email,
        recipientName: `${contactFirstName} ${contactLastName}`,
        emailType: 'vendor_application_received',
        subject: `Vendor Application Received - ${event.name}`,
        htmlContent: emailContent,
      })
    } catch (emailError) {
      console.error('Failed to send vendor application email:', emailError)
      await logEmailFailure(
        {
          organizationId: event.organizationId,
          eventId: event.id,
          registrationId: registration.id,
          registrationType: 'vendor',
          recipientEmail: email,
          recipientName: `${contactFirstName} ${contactLastName}`,
          emailType: 'vendor_application_received',
          subject: `Vendor Application Received - ${event.name}`,
          htmlContent: '',
        },
        emailError instanceof Error ? emailError.message : 'Unknown error'
      )
    }

    return NextResponse.json({ registration })
  } catch (error) {
    console.error('Vendor registration error:', error)
    return NextResponse.json(
      { error: 'Failed to process application' },
      { status: 500 }
    )
  }
}
