import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEventAccess } from '@/lib/api-auth'
import { Resend } from 'resend'
import { logEmail, logEmailFailure } from '@/lib/email-logger'

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

    // Update vendor
    const updatedVendor = await prisma.vendorRegistration.update({
      where: { id: vendorId },
      data: {
        status: 'approved',
        approvedAt: new Date(),
        invoiceLineItems: invoiceLineItems || null,
        invoiceTotal,
        invoiceNotes: invoiceNotes || null,
      },
    })

    // Send approval email
    try {
      const portalUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/vendor?code=${vendor.accessCode}`
      const staffRegUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/events/${vendor.event.slug}/register-staff`

      const emailContent = `
        <h2>Vendor Application Approved!</h2>
        <p>Hi ${vendor.contactFirstName},</p>
        <p>Great news! Your vendor booth application for <strong>${vendor.event.name}</strong> has been approved!</p>

        <h3>Your Vendor Code</h3>
        <p style="font-size: 24px; font-weight: bold; background: #f0f0f0; padding: 15px; text-align: center; letter-spacing: 2px;">
          ${vendor.vendorCode}
        </p>
        <p>Share this code with everyone who will be working at your booth so they can register.</p>

        <h3>Staff Registration Link</h3>
        <p>Your booth staff should register using this link:</p>
        <p><a href="${staffRegUrl}">${staffRegUrl}</a></p>
        <p>They will need to enter the vendor code above during registration.</p>

        <h3>Invoice Details</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          ${(invoiceLineItems || []).map((item: { description: string; amount: number }) => `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.description}</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${Number(item.amount).toFixed(2)}</td>
            </tr>
          `).join('')}
          <tr style="font-weight: bold;">
            <td style="padding: 8px; border-top: 2px solid #333;">Total</td>
            <td style="padding: 8px; border-top: 2px solid #333; text-align: right;">$${invoiceTotal.toFixed(2)}</td>
          </tr>
        </table>
        ${invoiceNotes ? `<p><strong>Notes:</strong> ${invoiceNotes}</p>` : ''}

        <h3>Vendor Portal</h3>
        <p>Access your vendor portal to pay your invoice, upload your logo, and see your registered booth staff:</p>
        <p><a href="${portalUrl}" style="display: inline-block; background: #1E3A5F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Access Vendor Portal</a></p>

        <p>We look forward to having you at the event!</p>
      `

      await resend.emails.send({
        from: 'ChiRho Events <noreply@chirhoevents.com>',
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
      await logEmailFailure({
        organizationId: vendor.event.organizationId,
        eventId: vendor.eventId,
        registrationId: vendor.id,
        registrationType: 'vendor',
        recipientEmail: vendor.email,
        recipientName: `${vendor.contactFirstName} ${vendor.contactLastName}`,
        emailType: 'vendor_approved',
        subject: `Vendor Application Approved - ${vendor.event.name}`,
        htmlContent: '',
        errorMessage: emailError instanceof Error ? emailError.message : 'Unknown error',
      })
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
