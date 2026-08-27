import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { verifyEventAccess } from '@/lib/api-auth'
import { wrapEmail, emailInfoBox } from '@/lib/email-templates'
import { resolveReplyTo } from '@/lib/email-reply-to'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; vendorId: string }> }
) {
  const { eventId, vendorId } = await params

  const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
    requireAdmin: true,
    logPrefix: '[Vendor Resend Codes]',
  })
  if (error) return error
  if (!user || !effectiveOrgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const vendor = await prisma.vendorRegistration.findFirst({
    where: { id: vendorId, eventId, organizationId: effectiveOrgId },
    include: {
      event: {
        include: {
          organization: { select: { name: true, contactEmail: true } },
          settings: { select: { contactEmail: true } },
        },
      },
    },
  })

  if (!vendor) {
    return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
  }

  if (vendor.status !== 'approved') {
    return NextResponse.json(
      { error: 'Codes are only issued once a vendor is approved.' },
      { status: 400 }
    )
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    'https://chirhoevents.com'

  const portalUrl = `${baseUrl}/vendor-dashboard?code=${vendor.accessCode}`

  const html = wrapEmail(
    `
      <h1>Your Vendor Codes</h1>
      <p>Hi ${vendor.contactFirstName},</p>
      <p>Here are your codes for <strong>${vendor.event.name}</strong> — save these somewhere safe.</p>

      ${emailInfoBox(
        `
        <strong>Vendor Code (share with your booth staff):</strong>
        <div style="font-size:24px;letter-spacing:3px;color:#1E3A5F;margin-top:6px;">${vendor.vendorCode}</div>
      `,
        'info'
      )}

      ${emailInfoBox(
        `
        <strong>Portal Access Code (for you):</strong>
        <div style="font-size:24px;letter-spacing:3px;color:#1E3A5F;margin-top:6px;">${vendor.accessCode}</div>
      `,
        'info'
      )}

      <p><a href="${portalUrl}" style="color:#1E3A5F;">Open your vendor portal</a></p>

      ${
        vendor.porosAccessCode
          ? emailInfoBox(
              `
        <strong>Liability Form Access Code:</strong>
        <div style="font-size:24px;letter-spacing:3px;color:#1E3A5F;margin-top:6px;">${vendor.porosAccessCode}</div>
        <p style="margin:8px 0 0 0;font-size:13px;color:#666;">Complete at: <a href="${baseUrl}/poros?code=${vendor.porosAccessCode}" style="color:#1E3A5F;">${baseUrl}/poros?code=${vendor.porosAccessCode}</a></p>
      `,
              'warning'
            )
          : ''
      }
    `,
    {
      organizationName: vendor.event.organization.name,
      preheader: `Your vendor codes for ${vendor.event.name}`,
      supportEmail: resolveReplyTo(vendor.event.settings, vendor.event.organization),
    }
  )

  try {
    await resend.emails.send({
      from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
      reply_to: resolveReplyTo(vendor.event.settings, vendor.event.organization),
      to: vendor.email,
      subject: `Your Vendor Codes - ${vendor.event.name}`,
      html,
    })
  } catch (e) {
    console.error('[Vendor Resend Codes] Failed to send email:', e)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
