import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { verifyEventAccess } from '@/lib/api-auth'
import { wrapEmail } from '@/lib/email-templates'
import { resolveReplyTo } from '@/lib/email-reply-to'

const resend = new Resend(process.env.RESEND_API_KEY!)

interface BulkEmailBody {
  subject: string
  message: string
  audience: 'all' | 'general' | 'vendor'
  roles?: string[]
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params

  const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
    requireAdmin: true,
    logPrefix: '[Staff Bulk Email]',
  })
  if (error) return error
  if (!user || !effectiveOrgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as BulkEmailBody
  const { subject, message, audience, roles } = body

  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 })
  }

  const audienceFilter =
    audience === 'general'
      ? { isVendorStaff: false }
      : audience === 'vendor'
      ? { isVendorStaff: true }
      : {}

  const roleFilter = roles && roles.length > 0 ? { role: { in: roles } } : {}

  const staff = await prisma.staffRegistration.findMany({
    where: {
      eventId,
      organizationId: effectiveOrgId,
      ...audienceFilter,
      ...roleFilter,
    },
    select: { id: true, firstName: true, lastName: true, email: true, role: true },
  })

  if (staff.length === 0) {
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
  const orgName = event.organization.name

  // Convert plain-text message to HTML paragraphs (preserving line breaks)
  const messageHtml = message
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/\n/g, '<br>').replace(/</g, '&lt;')}</p>`)
    .join('\n')

  let sent = 0
  let failed = 0

  for (const s of staff) {
    const html = wrapEmail(
      `
        <p>Hi ${s.firstName},</p>
        ${messageHtml}
        <p style="margin-top:24px;font-size:13px;color:#666;">
          Sent to you as a ${s.role} at <strong>${event.name}</strong>.
        </p>
      `,
      {
        organizationName: orgName,
        preheader: subject,
        supportEmail,
      }
    )

    try {
      await resend.emails.send({
        from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
        reply_to: supportEmail,
        to: s.email,
        subject,
        html,
      })
      sent++
    } catch (err) {
      console.error('[Staff Bulk Email] Failed to send to', s.email, err)
      failed++
    }
  }

  return NextResponse.json({ success: true, sent, failed, total: staff.length })
}
