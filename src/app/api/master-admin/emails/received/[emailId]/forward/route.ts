import { NextRequest, NextResponse } from 'next/server'
import { Resend } from '@/lib/resend'
import { prisma } from '@/lib/prisma'
import {
  buildForwardedEmailHtml,
  extractEmailAddress,
  findOrganizerForSender,
} from '@/lib/inbound-organizer-routing'
import { parseRecipients, requireMasterAdminApi } from '@/lib/master-admin-api-auth'

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * Forward-dialog data: the organizer the sender is registered with (if any)
 * plus every organization's contact, for picking someone else.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ emailId: string }> }
) {
  try {
    const auth = await requireMasterAdminApi(request)
    if ('response' in auth) return auth.response

    const { emailId } = await params
    const email = await prisma.receivedEmail.findUnique({
      where: { id: emailId },
      select: { fromAddress: true },
    })
    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 })
    }

    const [suggestion, organizations] = await Promise.all([
      findOrganizerForSender(extractEmailAddress(email.fromAddress)).catch(() => null),
      prisma.organization.findMany({
        select: { id: true, name: true, contactEmail: true },
        orderBy: { name: 'asc' },
      }),
    ])

    return NextResponse.json({ suggestion, organizations })
  } catch (error) {
    console.error('Forward options error:', error)
    return NextResponse.json({ error: 'Failed to load forward options' }, { status: 500 })
  }
}

/**
 * Forward a received email. Body: { to: string | string[], note?: string }.
 * Reply-To is the original sender, so the recipient can answer them directly.
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
    const to = parseRecipients(body?.to)
    if (!to) {
      return NextResponse.json(
        { error: 'Enter between 1 and 10 valid email addresses.' },
        { status: 400 }
      )
    }
    const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 5000) : ''

    const email = await prisma.receivedEmail.findUnique({ where: { id: emailId } })
    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 })
    }

    const subject = email.subject || '(No Subject)'
    const attachmentCount = Array.isArray(email.attachments) ? email.attachments.length : 0

    const { error } = await resend.emails.send({
      from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
      reply_to: email.fromAddress,
      to,
      subject: `Fwd: ${subject}`,
      html: buildForwardedEmailHtml({
        intro: 'This message was sent to ChiRho Events and we\'re forwarding it to you.',
        note,
        from: email.fromAddress,
        to: email.toAddresses,
        receivedAt: email.createdAt,
        subject,
        htmlBody: email.htmlBody,
        textBody: email.textBody,
        attachmentCount,
      }),
    })

    if (error) {
      return NextResponse.json({ error: error.message || 'Forward failed' }, { status: 502 })
    }

    return NextResponse.json({ success: true, sentTo: to })
  } catch (error) {
    console.error('Forward email error:', error)
    return NextResponse.json({ error: 'Failed to forward email' }, { status: 500 })
  }
}
