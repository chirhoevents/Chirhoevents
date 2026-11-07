import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from '@/lib/resend'
import { wrapEmail } from '@/lib/email-templates'
import { findVendorByCode, leadAccessBlockedReason } from '@/lib/vendor-leads-server'
import {
  buildLeadEmailContent,
  buildLeadRecipients,
  formatVendorMessageHtml,
  isLeadMessagingOpen,
  leadMessagingClosesAt,
  MAX_LEAD_MESSAGE_LENGTH,
  MAX_LEAD_MESSAGES_PER_DAY,
  MAX_LEAD_SUBJECT_LENGTH,
  vendorLeadsFrom,
} from '@/lib/vendor-leads'

export const maxDuration = 300

const resend = new Resend(process.env.RESEND_API_KEY!)
const MAX_RECIPIENTS_PER_SEND = 1000

/**
 * POST /api/vendor/leads/message  { code, subject, message, leadIds? }
 *
 * Email the vendor's leads through ChiRho (all leads, or just leadIds).
 * Sent from the dedicated vendor sender, Reply-To the vendor. Minors'
 * messages go to their group leader / registration contact, one email per
 * leader. Vendor contact (access code) only; open until 30 days after the
 * event; at most MAX_LEAD_MESSAGES_PER_DAY sends per day.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const found = await findVendorByCode(body.code)
    if (!found) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    if (found.role !== 'owner') {
      return NextResponse.json({ error: 'Only the main vendor contact can email leads.' }, { status: 403 })
    }
    const { vendor } = found

    const blocked = leadAccessBlockedReason(vendor)
    if (blocked) return NextResponse.json({ error: blocked }, { status: 403 })

    if (!isLeadMessagingOpen(vendor.event)) {
      const closed = leadMessagingClosesAt(vendor.event).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
      })
      return NextResponse.json(
        { error: `Emailing leads closed on ${closed} (30 days after the event). You can still download your CSV.` },
        { status: 403 }
      )
    }

    const subject = typeof body.subject === 'string' ? body.subject.replace(/[\r\n]+/g, ' ').trim() : ''
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    if (!subject || !message) {
      return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 })
    }
    if (subject.length > MAX_LEAD_SUBJECT_LENGTH) {
      return NextResponse.json({ error: `Subject must be ${MAX_LEAD_SUBJECT_LENGTH} characters or fewer` }, { status: 400 })
    }
    if (message.length > MAX_LEAD_MESSAGE_LENGTH) {
      return NextResponse.json({ error: `Message must be ${MAX_LEAD_MESSAGE_LENGTH} characters or fewer` }, { status: 400 })
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const sentToday = await prisma.vendorLeadMessage.count({
      where: { vendorRegistrationId: vendor.id, createdAt: { gte: since } },
    })
    if (sentToday >= MAX_LEAD_MESSAGES_PER_DAY) {
      return NextResponse.json(
        { error: `You can send up to ${MAX_LEAD_MESSAGES_PER_DAY} messages a day. Try again tomorrow.` },
        { status: 429 }
      )
    }

    const requestedIds: string[] | null = Array.isArray(body.leadIds)
      ? body.leadIds.filter((id: unknown): id is string => typeof id === 'string').slice(0, 5000)
      : null

    const leads = await prisma.vendorLead.findMany({
      where: {
        vendorRegistrationId: vendor.id,
        ...(requestedIds ? { id: { in: requestedIds } } : {}),
      },
      select: {
        id: true, firstName: true, lastName: true, email: true, isMinor: true,
        contactName: true, contactEmail: true, unsubscribedAt: true, unsubscribeToken: true,
      },
    })

    const { recipients, skipped } = buildLeadRecipients(leads)
    if (recipients.length === 0) {
      return NextResponse.json({ error: 'None of the selected leads can be emailed (no email on file or unsubscribed).' }, { status: 400 })
    }
    if (recipients.length > MAX_RECIPIENTS_PER_SEND) {
      return NextResponse.json(
        { error: `You can email up to ${MAX_RECIPIENTS_PER_SEND} people at a time. Select fewer leads.` },
        { status: 400 }
      )
    }

    // Record the send first so it counts toward the daily limit even if two
    // sends are started at once.
    const record = await prisma.vendorLeadMessage.create({
      data: {
        vendorRegistrationId: vendor.id,
        eventId: vendor.eventId,
        organizationId: vendor.organizationId,
        subject,
        body: message,
        leadIds: recipients.flatMap((r) => r.leadIds),
      },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'
    const messageHtml = formatVendorMessageHtml(message)
    const from = vendorLeadsFrom(vendor.businessName)

    let sent = 0
    let failed = 0
    for (const recipient of recipients) {
      const unsubscribeUrl = `${appUrl}/vendor-leads/unsubscribe/${recipient.unsubscribeToken}`
      const html = wrapEmail(
        buildLeadEmailContent({
          recipient,
          messageHtml,
          businessName: vendor.businessName,
          eventName: vendor.event.name,
          unsubscribeUrl,
        }),
        { organizationName: vendor.businessName, preheader: subject, supportEmail: vendor.email }
      )
      try {
        const result = await resend.emails.send({
          from,
          reply_to: vendor.email,
          to: recipient.email,
          subject,
          html,
          headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>` },
        })
        if ((result as any)?.error) {
          console.error('[Vendor Lead Message] Resend error for', recipient.email, (result as any).error)
          failed++
        } else {
          sent++
        }
      } catch (err) {
        console.error('[Vendor Lead Message] Failed to send to', recipient.email, err)
        failed++
      }
    }

    await prisma.vendorLeadMessage.update({
      where: { id: record.id },
      data: { emailsSent: sent, emailsFailed: failed },
    })

    return NextResponse.json({ success: true, sent, failed, skipped, total: recipients.length })
  } catch (error) {
    console.error('[Vendor Lead Message] Error:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
