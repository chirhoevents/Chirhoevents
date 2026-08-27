import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEventAccess } from '@/lib/api-auth'
import { Resend } from 'resend'
import { logEmail, logEmailFailure } from '@/lib/email-logger'
import { wrapEmail, emailButton, emailInfoBox } from '@/lib/email-templates'
import { resolveReplyTo } from '@/lib/email-reply-to'
import { generateVendorPorosCode } from '@/lib/access-code'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; vendorId: string }> }
) {
  try {
    const { eventId, vendorId } = await params

    // Verify event access
    const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[Approve Vendor]',
    })

    if (error) return error
    if (!user || !effectiveOrgId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }
    const body = await request.json()
    const { invoiceLineItems, invoiceNotes } = body

    // Fetch vendor and event
    const vendor = await prisma.vendorRegistration.findUnique({
      where: { id: vendorId },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            slug: true,
            organizationId: true,
            organization: { select: { name: true, contactEmail: true } },
            settings: {
              select: {
                contactEmail: true,
                liabilityFormsRequiredGroup: true,
                liabilityFormsRequiredIndividual: true,
              },
            },
          },
        },
      },
    })

    if (!vendor || vendor.eventId !== eventId) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    if (vendor.status !== 'pending') {
      return NextResponse.json({ error: 'Vendor already processed' }, { status: 400 })
    }

    // Calculate invoice total
    const invoiceTotal = (invoiceLineItems || []).reduce(
      (sum: number, item: { amount: number }) => sum + Number(item.amount),
      0
    )

    // If the event requires liability forms for any registration type,
    // issue a Poros access code so the vendor contact can complete the
    // same liability + Safe Environment flow as staff.
    let porosAccessCode: string | null = vendor.porosAccessCode
    const needsLiabilityForm =
      !porosAccessCode &&
      (vendor.event.settings?.liabilityFormsRequiredGroup ||
        vendor.event.settings?.liabilityFormsRequiredIndividual)

    if (needsLiabilityForm) {
      const eventYear = vendor.event.name.match(/\d{4}/)?.[0] || new Date().getFullYear().toString()
      let candidate = generateVendorPorosCode(eventYear)
      for (let attempt = 0; attempt < 5; attempt++) {
        const existing = await prisma.vendorRegistration.findUnique({
          where: { porosAccessCode: candidate },
        })
        if (!existing) break
        candidate = generateVendorPorosCode(eventYear)
      }
      porosAccessCode = candidate
    }

    // Update vendor
    const updatedVendor = await prisma.vendorRegistration.update({
      where: { id: vendorId },
      data: {
        status: 'approved',
        approvedAt: new Date(),
        invoiceLineItems: invoiceLineItems || null,
        invoiceTotal,
        invoiceNotes: invoiceNotes || null,
        porosAccessCode,
      },
    })

    // Send approval email
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.NEXT_PUBLIC_BASE_URL ||
        'https://chirhoevents.com'
      const portalUrl = `${baseUrl}/vendor-dashboard?code=${vendor.accessCode}`
      const staffRegUrl = `${baseUrl}/events/${vendor.event.slug}/register-staff`
      const liabilityUrl = porosAccessCode ? `${baseUrl}/poros?code=${porosAccessCode}` : null
      const supportEmail = resolveReplyTo(vendor.event.settings, vendor.event.organization)

      const emailContent = wrapEmail(`
        <h1>Vendor Application Approved!</h1>

        <p>Hi ${vendor.contactFirstName},</p>

        <p>Great news! Your vendor booth application for <strong>${vendor.event.name}</strong> has been approved!</p>

        ${emailInfoBox(`
          <strong>Application Status:</strong> Approved<br>
          You're all set to be a vendor at this event!
        `, 'success')}

        <h2>Your Vendor Code</h2>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0; background: #e8f4fd; border-radius: 8px; padding: 20px; text-align: center;">
          <tr>
            <td>
              <p style="margin: 0; font-size: 14px; color: #666;">Share this code with your booth staff</p>
              <p style="margin: 8px 0 0 0; font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1E3A5F;">${vendor.vendorCode}</p>
            </td>
          </tr>
        </table>

        <h2>Staff Registration</h2>
        <p>Your booth staff should register using this link and enter the vendor code above:</p>
        ${emailButton('Register Booth Staff', staffRegUrl, 'secondary')}
        <p style="font-size: 14px; color: #666; text-align: center;">
          Or copy this link: <a href="${staffRegUrl}">${staffRegUrl}</a>
        </p>

        <h2>Invoice Details</h2>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0; background: #f9f9f9; border-radius: 8px; padding: 20px;">
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${(invoiceLineItems || []).map((item: { description: string; amount: number }) => `
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; color: #666666; font-size: 14px;">${item.description}</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; text-align: right; font-weight: 600; color: #1E3A5F;">$${Number(item.amount).toFixed(2)}</td>
                </tr>
                `).join('')}
                <tr>
                  <td style="padding: 12px 0; font-weight: 700; font-size: 16px; color: #1E3A5F;">Total Due</td>
                  <td style="padding: 12px 0; text-align: right; font-weight: 700; font-size: 18px; color: #1E3A5F;">$${invoiceTotal.toFixed(2)}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        ${invoiceNotes ? `<p style="font-size: 14px; color: #666;"><strong>Notes:</strong> ${invoiceNotes}</p>` : ''}

        <h2>Vendor Portal</h2>
        <p>Access your vendor portal to pay your invoice, upload your logo, and see your registered booth staff:</p>
        ${emailButton('Access Vendor Portal', portalUrl, 'primary')}

        ${liabilityUrl && porosAccessCode ? `
        <h2>Liability Form &amp; Safe Environment Required</h2>
        ${emailInfoBox('<strong>Action Required:</strong> This event requires all vendors to complete a liability form and provide a Safe Environment certificate.', 'warning')}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0; background: #e8f4fd; border-radius: 8px; padding: 20px; text-align: center;">
          <tr>
            <td>
              <p style="margin: 0; font-size: 14px; color: #666;">Your Liability Form Access Code</p>
              <p style="margin: 8px 0 0 0; font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1E3A5F;">${porosAccessCode}</p>
            </td>
          </tr>
        </table>
        ${emailButton('Complete Liability Form', liabilityUrl, 'primary')}
        <p style="font-size: 13px; color: #666; text-align: center; margin-top: 8px;">
          Don't have your Safe Environment certificate handy? You can email a copy to
          <a href="mailto:${supportEmail}" style="color: #1E3A5F;">${supportEmail}</a>
          and we'll upload it to your record for you.
        </p>
        ` : ''}

        <p>We look forward to having you at the event!</p>

        <p style="font-size: 14px; color: #666;">
          If you have any questions, please contact the event organizers.
        </p>
      `, { preheader: `Your vendor application for ${vendor.event.name} has been approved!`, organizationName: vendor.event.organization?.name || 'ChiRho Events', supportEmail: resolveReplyTo(vendor.event.settings, vendor.event.organization) })

      await resend.emails.send({
        from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
        reply_to: resolveReplyTo(vendor.event.settings, vendor.event.organization),
        to: vendor.email,
        subject: `Vendor Application Approved - ${vendor.event.name}`,
        html: emailContent,
      })

      await logEmail({
        organizationId: vendor.event.organizationId,
        eventId: vendor.eventId,
        registrationId: vendor.id,
        registrationType: 'vendor',
        recipientEmail: vendor.email,
        recipientName: `${vendor.contactFirstName} ${vendor.contactLastName}`,
        emailType: 'vendor_approved',
        subject: `Vendor Application Approved - ${vendor.event.name}`,
        htmlContent: emailContent,
      })
    } catch (emailError) {
      console.error('Failed to send vendor approval email:', emailError)
      await logEmailFailure(
        {
          organizationId: vendor.event.organizationId,
          eventId: vendor.eventId,
          registrationId: vendor.id,
          registrationType: 'vendor',
          recipientEmail: vendor.email,
          recipientName: `${vendor.contactFirstName} ${vendor.contactLastName}`,
          emailType: 'vendor_approved',
          subject: `Vendor Application Approved - ${vendor.event.name}`,
          htmlContent: '',
        },
        emailError instanceof Error ? emailError.message : 'Unknown error'
      )
    }

    return NextResponse.json({ vendor: updatedVendor })
  } catch (error) {
    console.error('Error approving vendor:', error)
    return NextResponse.json(
      { error: 'Failed to approve vendor' },
      { status: 500 }
    )
  }
}
