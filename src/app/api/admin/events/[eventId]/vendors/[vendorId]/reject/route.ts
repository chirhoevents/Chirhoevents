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
      logPrefix: '[Reject Vendor]',
    })

    if (error) return error
    if (!user || !effectiveOrgId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }
    const body = await request.json()
    const { reason } = body

    // Fetch vendor and event
    const vendor = await prisma.vendorRegistration.findUnique({
      where: { id: vendorId },
      include: {
        event: {
          select: {
            id: true,
            name: true,
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

    // Update vendor
    const updatedVendor = await prisma.vendorRegistration.update({
      where: { id: vendorId },
      data: {
        status: 'rejected',
        rejectionReason: reason || null,
      },
    })

    // Send rejection email
    try {
      const emailContent = `
        <h2>Vendor Application Update</h2>
        <p>Hi ${vendor.contactFirstName},</p>
        <p>Thank you for your interest in being a vendor at <strong>${vendor.event.name}</strong>.</p>

        <p>After careful review, we regret to inform you that your vendor booth application was not approved at this time.</p>

        ${reason ? `
        <h3>Reason</h3>
        <p>${reason}</p>
        ` : ''}

        <p>If you have any questions, please feel free to contact the event organizers.</p>

        <p>We appreciate your understanding and hope to work with you in the future.</p>
      `

      await resend.emails.send({
        from: 'ChiRho Events <noreply@chirhoevents.com>',
        to: vendor.email,
        subject: `Vendor Application Update - ${vendor.event.name}`,
        html: emailContent,
      })

      await logEmail({
        organizationId: vendor.event.organizationId,
        eventId: vendor.eventId,
        registrationId: vendor.id,
        registrationType: 'vendor',
        recipientEmail: vendor.email,
        recipientName: `${vendor.contactFirstName} ${vendor.contactLastName}`,
        emailType: 'vendor_rejected',
        subject: `Vendor Application Update - ${vendor.event.name}`,
        htmlContent: emailContent,
      })
    } catch (emailError) {
      console.error('Failed to send vendor rejection email:', emailError)
      await logEmailFailure({
        organizationId: vendor.event.organizationId,
        eventId: vendor.eventId,
        registrationId: vendor.id,
        registrationType: 'vendor',
        recipientEmail: vendor.email,
        recipientName: `${vendor.contactFirstName} ${vendor.contactLastName}`,
        emailType: 'vendor_rejected',
        subject: `Vendor Application Update - ${vendor.event.name}`,
        htmlContent: '',
        errorMessage: emailError instanceof Error ? emailError.message : 'Unknown error',
      })
    }

    return NextResponse.json({ vendor: updatedVendor })
  } catch (error) {
    console.error('Error rejecting vendor:', error)
    return NextResponse.json(
      { error: 'Failed to reject vendor' },
      { status: 500 }
    )
  }
}
