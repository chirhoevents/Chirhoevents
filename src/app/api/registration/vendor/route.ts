import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { generateVendorCode, generateVendorAccessCode } from '@/lib/access-code'
import { logEmail, logEmailFailure } from '@/lib/email-logger'
import { wrapEmail, emailInfoBox } from '@/lib/email-templates'

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

    console.log('Vendor registration request:', {
      eventId: event.id,
      organizationId: event.organizationId,
      selectedTier,
      vendorTiers: vendorTiers ? vendorTiers.length : 'null',
      tierPrice,
    })

    const tier = vendorTiers?.find(t => t.id === selectedTier)
    const tierName = tier?.name || selectedTier || 'Custom'
    const price = Number(tierPrice || tier?.price || 0)

    // Create vendor registration
    let registration
    try {
      registration = await prisma.vendorRegistration.create({
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
    } catch (dbError) {
      console.error('Database error creating vendor registration:', dbError)
      throw dbError
    }

    // Send confirmation email
    try {
      const emailContent = wrapEmail(`
        <h1>Vendor Application Received!</h1>

        <p>Hi ${contactFirstName},</p>

        <p>We're excited that <strong>${businessName}</strong> has applied for a vendor booth at <strong>${event.name}</strong>!</p>

        ${emailInfoBox(`
          <strong>Application Status:</strong> Pending Review<br>
          Our team will review your application and get back to you soon.
        `, 'info')}

        <h2>Application Details</h2>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0; background: #f9f9f9; border-radius: 8px; padding: 20px;">
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; color: #666666; font-size: 14px;">Business Name</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; text-align: right; font-weight: 600; color: #1E3A5F;">${businessName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; color: #666666; font-size: 14px;">Contact</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; text-align: right; font-weight: 600; color: #1E3A5F;">${contactFirstName} ${contactLastName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; color: #666666; font-size: 14px;">Email</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; text-align: right; font-weight: 600; color: #1E3A5F;">${email}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; color: #666666; font-size: 14px;">Booth Type</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; text-align: right; font-weight: 600; color: #1E3A5F;">${tierName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #666666; font-size: 14px;">Base Price</td>
                  <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #1E3A5F;">${price > 0 ? `$${price.toFixed(2)}` : 'To be determined'}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <h2>What Happens Next?</h2>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0;">
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
                <tr>
                  <td width="40" valign="top" style="padding-right: 12px;">
                    <div style="width: 32px; height: 32px; background: #1E3A5F; border-radius: 50%; color: white; font-weight: bold; text-align: center; line-height: 32px;">1</div>
                  </td>
                  <td valign="top">
                    <p style="margin: 0; font-weight: bold; color: #1E3A5F;">Application Review</p>
                    <p style="margin: 4px 0 0 0; font-size: 14px; color: #666;">Our team will review your application within a few business days.</p>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
                <tr>
                  <td width="40" valign="top" style="padding-right: 12px;">
                    <div style="width: 32px; height: 32px; background: #1E3A5F; border-radius: 50%; color: white; font-weight: bold; text-align: center; line-height: 32px;">2</div>
                  </td>
                  <td valign="top">
                    <p style="margin: 0; font-weight: bold; color: #1E3A5F;">Approval & Invoice</p>
                    <p style="margin: 4px 0 0 0; font-size: 14px; color: #666;">Once approved, you'll receive your vendor code and invoice for booth payment.</p>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
                <tr>
                  <td width="40" valign="top" style="padding-right: 12px;">
                    <div style="width: 32px; height: 32px; background: #1E3A5F; border-radius: 50%; color: white; font-weight: bold; text-align: center; line-height: 32px;">3</div>
                  </td>
                  <td valign="top">
                    <p style="margin: 0; font-weight: bold; color: #1E3A5F;">Staff Registration</p>
                    <p style="margin: 4px 0 0 0; font-size: 14px; color: #666;">After payment, share your vendor code with booth staff so they can register.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <p>Thank you for your interest in being a vendor at our event. We look forward to working with you!</p>

        <p style="font-size: 14px; color: #666;">
          If you have any questions, please contact the event organizers.
        </p>
      `, { organizationName: event.organization?.name || 'ChiRho Events', preheader: `Vendor application received for ${event.name}` })

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
    // Return more detailed error for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to process application', details: errorMessage },
      { status: 500 }
    )
  }
}
