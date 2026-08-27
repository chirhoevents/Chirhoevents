import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { verifyEventAccess } from '@/lib/api-auth'
import { wrapEmail, formatPlainTextForEmail } from '@/lib/email-templates'
import { resolveReplyTo } from '@/lib/email-reply-to'

const resend = new Resend(process.env.RESEND_API_KEY!)

interface Body {
  subject: string
  message: string
  status?: 'all' | 'approved' | 'pending'
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
  const { subject, message, status = 'approved' } = body

  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 })
  }

  const statusFilter = status === 'all' ? {} : { status }

  const vendors = await prisma.vendorRegistration.findMany({
    where: { eventId, organizationId: effectiveOrgId, ...statusFilter },
    select: {
      id: true,
      businessName: true,
      contactFirstName: true,
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
        <p>Hi ${v.contactFirstName},</p>
        ${messageHtml}
        <p style="margin-top:24px;font-size:13px;color:#666;">
          Sent to <strong>${v.businessName}</strong> as a vendor at <strong>${event.name}</strong>.
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
    } catch (err) {
      console.error('[Vendor Bulk Email] Failed to send to', v.email, err)
      failed++
    }
  }

  return NextResponse.json({ success: true, sent, failed, total: vendors.length })
}
