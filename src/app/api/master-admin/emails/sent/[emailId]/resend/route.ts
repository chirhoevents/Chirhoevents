import { NextRequest, NextResponse } from 'next/server'
// The raw SDK client, not '@/lib/resend': this route records the copy itself
// so it can link it back to the original via resentFromId.
import { Resend } from 'resend'
import { prisma } from '@/lib/prisma'
import { recordOutboundEmail } from '@/lib/outbound-email-log'
import { logEmail } from '@/lib/email-logger'
import { resolveReplyTo } from '@/lib/email-reply-to'
import { parseRecipients, requireMasterAdminApi } from '@/lib/master-admin-api-auth'

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * Resend a previously sent email, unchanged, to the original recipient or to
 * any address(es) the master admin types in.
 *
 * Body: { source: 'outbound' | 'log', to: string | string[] }
 *   outbound — a row from OutboundEmail (everything sent since logging began)
 *   log      — a row from the older per-registration EmailLog
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ emailId: string }> }
) {
  try {
    const auth = await requireMasterAdminApi(request)
    if ('response' in auth) return auth.response

    const { emailId } = await params
    const body = await request.json().catch(() => ({}))
    const source = body?.source === 'log' ? 'log' : 'outbound'
    const to = parseRecipients(body?.to)
    if (!to) {
      return NextResponse.json(
        { error: 'Enter between 1 and 10 valid email addresses.' },
        { status: 400 }
      )
    }

    if (source === 'outbound') {
      const original = await prisma.outboundEmail.findUnique({ where: { id: emailId } })
      if (!original) {
        return NextResponse.json({ error: 'Email not found' }, { status: 404 })
      }
      if (!original.htmlBody && !original.textBody) {
        return NextResponse.json({ error: 'This email has no saved content to resend.' }, { status: 400 })
      }

      const payload = {
        from: original.fromAddress,
        to,
        subject: original.subject,
        ...(original.replyTo ? { reply_to: original.replyTo.split(', ') } : {}),
        ...(original.htmlBody ? { html: original.htmlBody } : { text: original.textBody! }),
        ...(original.htmlBody && original.textBody ? { text: original.textBody } : {}),
      }
      const response = await resend.emails.send(payload)
      await recordOutboundEmail(payload, { response }, { resentFromId: original.id })
      if (response.error) {
        return NextResponse.json({ error: response.error.message || 'Resend failed' }, { status: 502 })
      }
      return NextResponse.json({
        success: true,
        sentTo: to,
        attachmentsSkipped: original.attachmentNames.length,
      })
    }

    const original = await prisma.emailLog.findUnique({ where: { id: emailId } })
    if (!original) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 })
    }

    // EmailLog doesn't store Reply-To; rebuild it the same way the original
    // send did so replies still reach the event organizer.
    const [event, organization] = await Promise.all([
      original.eventId
        ? prisma.event.findUnique({
            where: { id: original.eventId },
            select: { settings: { select: { contactEmail: true } } },
          })
        : null,
      prisma.organization.findUnique({
        where: { id: original.organizationId },
        select: { contactEmail: true },
      }),
    ])

    const payload = {
      from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
      to,
      reply_to: resolveReplyTo(event?.settings, organization),
      subject: original.subject,
      html: original.htmlContent,
    }
    const response = await resend.emails.send(payload)
    await recordOutboundEmail(payload, { response })
    if (response.error) {
      return NextResponse.json({ error: response.error.message || 'Resend failed' }, { status: 502 })
    }

    // Keep the organization's per-registration history in step.
    for (const recipient of to) {
      await logEmail({
        organizationId: original.organizationId,
        eventId: original.eventId ?? undefined,
        registrationId: original.registrationId ?? undefined,
        registrationType: original.registrationType ?? undefined,
        recipientEmail: recipient,
        recipientName: recipient === original.recipientEmail.toLowerCase() ? original.recipientName ?? undefined : undefined,
        emailType: original.emailType,
        subject: original.subject,
        htmlContent: original.htmlContent,
        metadata: { resentFromEmailLogId: original.id, resentBy: 'master_admin' },
      })
    }

    return NextResponse.json({ success: true, sentTo: to, attachmentsSkipped: 0 })
  } catch (error) {
    console.error('Resend email error:', error)
    return NextResponse.json({ error: 'Failed to resend email' }, { status: 500 })
  }
}
