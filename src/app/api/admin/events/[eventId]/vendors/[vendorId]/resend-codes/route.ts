import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from '@/lib/resend'
import { verifyEventAccess } from '@/lib/api-auth'
import { wrapEmail } from '@/lib/email-templates'
import { vendorCodesGuideHtml } from '@/lib/vendor-code-emails'
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

  const supportEmail = resolveReplyTo(vendor.event.settings, vendor.event.organization)

  const html = wrapEmail(
    `
      <h1>Your Vendor Codes &amp; Next Steps</h1>
      <p>Hi ${vendor.contactFirstName},</p>
      <p>Here is a reminder of the codes for <strong>${vendor.businessName}</strong> at <strong>${vendor.event.name}</strong>, and what each one is for.</p>

      ${vendorCodesGuideHtml({
        baseUrl,
        eventSlug: vendor.event.slug,
        eventName: vendor.event.name,
        vendorCode: vendor.vendorCode,
        accessCode: vendor.accessCode,
        porosAccessCode: vendor.porosAccessCode,
        supportEmail,
      })}

      <p style="font-size: 14px; color: #666;">Questions? Just reply to this email.</p>
    `,
    {
      organizationName: vendor.event.organization.name,
      preheader: `Your vendor codes for ${vendor.event.name}`,
      supportEmail,
    }
  )

  try {
    await resend.emails.send({
      from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
      reply_to: resolveReplyTo(vendor.event.settings, vendor.event.organization),
      to: vendor.email,
      subject: `Your Vendor Codes & Next Steps - ${vendor.event.name}`,
      html,
    })
  } catch (e) {
    console.error('[Vendor Resend Codes] Failed to send email:', e)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
