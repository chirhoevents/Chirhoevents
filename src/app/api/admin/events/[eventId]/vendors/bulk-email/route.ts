import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from '@/lib/resend'
import { verifyEventAccess } from '@/lib/api-auth'
import { wrapEmail, formatPlainTextForEmail } from '@/lib/email-templates'
import { resolveReplyTo } from '@/lib/email-reply-to'
import { logEmail } from '@/lib/email-logger'
import { escapeHtml } from '@/lib/vendor-admin'

const resend = new Resend(process.env.RESEND_API_KEY!)

interface Body {
  subject: string
  message: string
  status?: 'all' | 'approved' | 'pending' | 'unpaid'
  /** Send only to these vendors (single vendor or table selection). */
  vendorIds?: string[]
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params

  const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
    requireAdmin: true,
    logPrefix: '[Vendor Bulk Email]',
  })
  if (error) return error
  if (!user || !effectiveOrgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as Body
  const { subject, message, status = 'approved', vendorIds } = body

  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 })
  }

  // Explicit vendorIds win over the status group. "unpaid" = approved
  // vendors who still owe something (unpaid or partial).
  const filter =
    Array.isArray(vendorIds) && vendorIds.length > 0
      ? { id: { in: vendorIds.map(String) } }
      : status === 'all'
        ? {}
        : status === 'unpaid'
          ? { status: 'approved' as const, paymentStatus: { in: ['unpaid' as const, 'partial' as const] } }
          : { status }

  const vendors = await prisma.vendorRegistration.findMany({
    where: { eventId, organizationId: effectiveOrgId, ...filter },
    select: {
      id: true,
      businessName: true,
      contactFirstName: true,
      contactLastName: true,
      email: true,
    },
  })

  if (vendors.length === 0) {
    return NextResponse.json({ error: 'No recipients match the filter' }, { status: 400 })
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      organization: { select: { name: true, contactEmail: true } },
      settings: { select: { contactEmail: true } },
    },
  })
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const supportEmail = resolveReplyTo(event.settings, event.organization)
  const messageHtml = formatPlainTextForEmail(message)

  let sent = 0
  let failed = 0

  for (const v of vendors) {
    const html = wrapEmail(
      `
        <p>Hi ${escapeHtml(v.contactFirstName)},</p>
        ${messageHtml}
        <p style="margin-top:24px;font-size:13px;color:#666;">
          Sent to <strong>${escapeHtml(v.businessName)}</strong> as a vendor at <strong>${escapeHtml(event.name)}</strong>.
        </p>
      `,
      {
        organizationName: event.organization.name,
        preheader: subject,
        supportEmail,
      }
    )

    try {
      await resend.emails.send({
        from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
        reply_to: supportEmail,
        to: v.email,
        subject,
        html,
      })
      sent++
      await logEmail({
        organizationId: event.organizationId,
        eventId,
        registrationId: v.id,
        registrationType: 'vendor',
        recipientEmail: v.email,
        recipientName: `${v.contactFirstName} ${v.contactLastName}`,
        emailType: 'vendor_custom_message',
        subject,
        htmlContent: html,
      })
    } catch (err) {
      console.error('[Vendor Bulk Email] Failed to send to', v.email, err)
      failed++
    }
  }

  return NextResponse.json({ success: true, sent, failed, total: vendors.length })
}
