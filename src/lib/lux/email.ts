/**
 * Lux emails: confirmations, receipts, reminders and family links for
 * parishes using Lux. They're sent as Lux (lux@chirhoevents.com by default)
 * with the parish's name in the From line, and replies go to the parish.
 * Account, billing and support emails keep coming from ChiRho Events.
 */

import { Resend } from '@/lib/resend'
import { logEmail, logEmailFailure } from '@/lib/email-logger'
import { escapeHtml, formatEventDate, formatMoney, formatTimeRange } from '@/lib/lux/format'

const resend = new Resend(process.env.RESEND_API_KEY!)

export const LUX_FROM_EMAIL = process.env.RESEND_LUX_FROM_EMAIL || 'lux@chirhoevents.com'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'

export function appUrl(path = ''): string {
  return `${APP_URL}${path}`
}

/** "St. Mary's Parish via Lux <lux@chirhoevents.com>" */
export function luxFrom(organizationName: string): string {
  const name = organizationName.replace(/["<>\r\n]/g, '').trim().slice(0, 60)
  return name ? `"${name} via Lux" <${LUX_FROM_EMAIL}>` : `Lux <${LUX_FROM_EMAIL}>`
}

export interface SendLuxEmailOptions {
  organizationId: string
  organizationName: string
  to: string
  subject: string
  html: string
  replyTo?: string | null
  emailType: string
  recipientName?: string
  eventId?: string
  registrationId?: string
  registrationType?: 'individual' | 'lux_order'
  metadata?: Record<string, unknown>
  // Family-link emails contain a sign-in link; don't keep a readable copy of
  // it in the organization's email history
  redactFromLog?: boolean
}

export async function sendLuxEmail(options: SendLuxEmailOptions): Promise<boolean> {
  const log = {
    organizationId: options.organizationId,
    eventId: options.eventId,
    registrationId: options.registrationId,
    registrationType: options.registrationType,
    recipientEmail: options.to,
    recipientName: options.recipientName,
    emailType: options.emailType,
    subject: options.subject,
    htmlContent: options.redactFromLog ? '<p>(Contains a private sign-in link; not stored.)</p>' : options.html,
  }
  try {
    const response = await resend.emails.send({
      from: luxFrom(options.organizationName),
      to: options.to,
      reply_to: options.replyTo || undefined,
      subject: options.subject,
      html: options.html,
    })
    if (response.error) throw new Error(response.error.message)
    await logEmail({ ...log, metadata: options.metadata })
    return true
  } catch (error) {
    console.error(`[Lux email] ${options.emailType} to ${options.to} failed:`, error)
    await logEmailFailure(log, error instanceof Error ? error.message : 'Unknown error')
    return false
  }
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export function luxEmailLayout(content: string, options: { organizationName: string; preheader?: string }): string {
  const org = escapeHtml(options.organizationName)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${org}</title>
  <style>
    body { margin: 0; padding: 0; background: #F5F1E8; }
    body, td { font-family: 'Segoe UI', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; }
    h1 { font-family: Georgia, 'Times New Roman', serif; font-size: 24px; font-weight: 600; color: #1E3A5F; margin: 0 0 16px 0; }
    h2 { font-size: 18px; font-weight: 600; color: #1E3A5F; margin: 24px 0 8px 0; }
    p { margin: 0 0 14px 0; }
    a { color: #8A6D2F; }
    @media screen and (max-width: 600px) { .container { width: 100% !important; } .content { padding: 24px 18px !important; } }
  </style>
</head>
<body>
  ${options.preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(options.preheader)}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F1E8;">
    <tr><td align="center" style="padding:24px 8px;">
      <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #E8E2D4;">
        <tr><td style="padding:24px 32px;border-bottom:3px solid #C8A24A;background:#FFFDF8;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="font-family:Georgia,'Times New Roman',serif;font-size:26px;color:#1E3A5F;">
              <span style="color:#C8A24A;">&#9728;</span>&nbsp;Lux
            </td>
            <td align="right" style="font-size:14px;color:#6B5B3E;font-weight:600;">${org}</td>
          </tr></table>
        </td></tr>
        <tr><td class="content" style="padding:32px;">${content}</td></tr>
        <tr><td style="padding:20px 32px;background:#FAF8F3;border-top:1px solid #E8E2D4;font-size:13px;color:#6B6B6B;text-align:center;">
          <p style="margin:0 0 6px 0;">Sent by Lux on behalf of <strong>${org}</strong>. Questions? Just reply to this email.</p>
          <p style="margin:0;font-size:12px;color:#9A9A9A;">Lux is part of ChiRho Events.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function button(href: string, label: string): string {
  return `<p style="margin:24px 0;"><a href="${escapeHtml(href)}" style="background:#1E3A5F;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;display:inline-block;font-weight:600;">${escapeHtml(label)}</a></p>`
}

function infoBox(html: string, tone: 'info' | 'warn' | 'success' = 'info'): string {
  const colors = { info: ['#F5F1E8', '#C8A24A'], warn: ['#FFF7E6', '#E0A030'], success: ['#EEF7EE', '#4A9A5B'] }[tone]
  return `<div style="background:${colors[0]};border-left:4px solid ${colors[1]};padding:14px 16px;border-radius:6px;margin:18px 0;">${html}</div>`
}

function table(rows: Array<[string, string]>, totalRow?: [string, string]): string {
  const body = rows
    .map(([a, b]) => `<tr><td style="padding:8px 0;border-bottom:1px solid #EEE;">${a}</td><td align="right" style="padding:8px 0;border-bottom:1px solid #EEE;white-space:nowrap;">${b}</td></tr>`)
    .join('')
  const total = totalRow
    ? `<tr><td style="padding:10px 0;font-weight:700;">${totalRow[0]}</td><td align="right" style="padding:10px 0;font-weight:700;">${totalRow[1]}</td></tr>`
    : ''
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0 4px 0;">${body}${total}</table>`
}

function paragraphs(text: string): string {
  return escapeHtml(text)
    .split(/\n{2,}/)
    .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('')
}

// ---------------------------------------------------------------------------
// Simple events
// ---------------------------------------------------------------------------

export function simpleEventConfirmationEmail(data: {
  organizationName: string
  firstName: string
  confirmationCode: string
  event: {
    name: string
    startDate: Date
    endDate: Date
    startTime: string | null
    endTime: string | null
    locationName: string | null
    locationAddress: string | null
    slug: string
  }
  lines: Array<{ name: string; quantity: number; unitPrice: number; amount: number }>
  total: number
  payment: 'paid' | 'free' | 'office'
  receiptUrl?: string | null
  officeInstructions?: string
  confirmationMessage?: string
}): { subject: string; html: string } {
  const e = data.event
  const sameDay = e.startDate.toISOString().slice(0, 10) === e.endDate.toISOString().slice(0, 10)
  const when = sameDay
    ? `${formatEventDate(e.startDate)}${formatTimeRange(e.startTime, e.endTime) ? `, ${formatTimeRange(e.startTime, e.endTime)}` : ''}`
    : `${formatEventDate(e.startDate)} – ${formatEventDate(e.endDate)}`
  const where = [e.locationName, e.locationAddress].filter(Boolean).map(escapeHtml).join('<br>')

  const ticketRows = data.lines.map(l => [
    `${escapeHtml(l.name)} × ${l.quantity}`,
    l.unitPrice > 0 ? formatMoney(l.amount) : 'Free',
  ] as [string, string])

  const paymentBlock =
    data.payment === 'paid'
      ? infoBox(`<strong>Paid in full.</strong> Thank you!${data.receiptUrl ? ` <a href="${escapeHtml(data.receiptUrl)}">View your card receipt</a>.` : ''}`, 'success')
      : data.payment === 'office'
        ? infoBox(`<strong>Amount due: ${formatMoney(data.total)}.</strong> Please pay at the parish office.${data.officeInstructions ? `<br>${escapeHtml(data.officeInstructions)}` : ''}`, 'warn')
        : ''

  const html = luxEmailLayout(
    `<h1>You're registered!</h1>
    <p>Hi ${escapeHtml(data.firstName)},</p>
    <p>Thank you for registering for <strong>${escapeHtml(e.name)}</strong>. Here are your details.</p>
    ${table([
      ['<strong>When</strong>', escapeHtml(when)],
      ...(where ? [['<strong>Where</strong>', where] as [string, string]] : []),
      ['<strong>Confirmation #</strong>', escapeHtml(data.confirmationCode)],
    ])}
    <h2>Tickets</h2>
    ${table(ticketRows, data.total > 0 ? ['Total', formatMoney(data.total)] : undefined)}
    ${paymentBlock}
    ${data.confirmationMessage ? paragraphs(data.confirmationMessage) : ''}
    ${button(appUrl(`/events/${e.slug}`), 'View event details')}
    <p>We look forward to seeing you!</p>`,
    { organizationName: data.organizationName, preheader: `You're registered for ${e.name}` }
  )
  return { subject: `You're registered: ${e.name}`, html }
}

// ---------------------------------------------------------------------------
// Faith formation
// ---------------------------------------------------------------------------

export function programOrderEmail(data: {
  organizationName: string
  guardianFirstName: string
  confirmationCode: string
  children: Array<{ childName: string; programName: string; amount: number }>
  breakdown: { subtotal: number; siblingDiscount: number; familyCapAdjustment: number; total: number }
  amountDue: number
  state: 'paid' | 'free' | 'office' | 'assistance_requested' | 'card_pending'
  receiptUrl?: string | null
  officeInstructions?: string
  documentsNeeded: Array<{ childName: string; label: string }>
  familyUrl: string
  payUrl?: string
  confirmationMessages?: string[]
}): { subject: string; html: string } {
  const rows: Array<[string, string]> = data.children.map(c => [
    `<strong>${escapeHtml(c.childName)}</strong><br><span style="color:#6B6B6B;font-size:14px;">${escapeHtml(c.programName)}</span>`,
    formatMoney(c.amount),
  ])
  if (data.breakdown.siblingDiscount > 0) rows.push(['Sibling discount (included above)', `−${formatMoney(data.breakdown.siblingDiscount)}`])
  if (data.breakdown.familyCapAdjustment > 0) rows.push(['Family maximum applied', `−${formatMoney(data.breakdown.familyCapAdjustment)}`])

  let paymentBlock = ''
  if (data.state === 'paid') {
    paymentBlock = infoBox(`<strong>Paid in full.</strong> Thank you!${data.receiptUrl ? ` <a href="${escapeHtml(data.receiptUrl)}">View your card receipt</a>.` : ''}`, 'success')
  } else if (data.state === 'office') {
    paymentBlock = infoBox(
      `<strong>Amount due: ${formatMoney(data.amountDue)}.</strong> Please pay at the parish office.` +
      (data.officeInstructions ? `<br>${escapeHtml(data.officeInstructions)}` : '') +
      (data.payUrl ? `<br>Prefer to pay by card? <a href="${escapeHtml(data.payUrl)}">Pay online</a>.` : ''),
      'warn'
    )
  } else if (data.state === 'assistance_requested') {
    paymentBlock = infoBox(
      '<strong>Fee assistance requested.</strong> Your children are registered. The parish will review your request privately and let you know what, if anything, is owed. Nothing is due right now.',
      'info'
    )
  } else if (data.state === 'card_pending' && data.payUrl) {
    paymentBlock = infoBox(`<strong>Amount due: ${formatMoney(data.amountDue)}.</strong> <a href="${escapeHtml(data.payUrl)}">Finish paying online</a>.`, 'warn')
  }

  const docs = data.documentsNeeded.length
    ? `<h2>Documents still needed</h2>
       <ul style="padding-left:20px;margin:8px 0 16px 0;">${data.documentsNeeded.map(d => `<li>${escapeHtml(d.label)} for ${escapeHtml(d.childName)}</li>`).join('')}</ul>
       <p>You can upload them any time from your family page.</p>`
    : ''

  const html = luxEmailLayout(
    `<h1>Registration received</h1>
    <p>Hi ${escapeHtml(data.guardianFirstName)},</p>
    <p>Thank you for registering with ${escapeHtml(data.organizationName)}. Here's what we received.</p>
    ${table(rows, ['Total', formatMoney(data.breakdown.total)])}
    <p style="color:#6B6B6B;font-size:14px;">Confirmation #${escapeHtml(data.confirmationCode)}</p>
    ${paymentBlock}
    ${docs}
    ${(data.confirmationMessages || []).filter(Boolean).map(paragraphs).join('')}
    ${button(data.familyUrl, 'Open your family page')}
    <p style="color:#6B6B6B;font-size:14px;">This link signs you in to your family page without a password. It works once and expires in 7 days; you can always request a new one from the parish registration page.</p>`,
    { organizationName: data.organizationName, preheader: 'Your faith formation registration' }
  )
  return { subject: `Registration received – ${data.organizationName}`, html }
}

function linkLifetime(minutes: number): string {
  if (minutes >= 1440) {
    const days = Math.round(minutes / 1440)
    return `${days} day${days === 1 ? '' : 's'}`
  }
  return `${minutes} minutes`
}

export function familyLinkEmail(data: {
  organizationName: string
  guardianFirstName: string
  link: string
  expiresMinutes: number
}): { subject: string; html: string } {
  const html = luxEmailLayout(
    `<h1>Your family page</h1>
    <p>Hi ${escapeHtml(data.guardianFirstName)},</p>
    <p>Use the button below to open your family page for ${escapeHtml(data.organizationName)}. From there you can update your information, register your children for this year, and upload any documents that are still needed.</p>
    ${button(data.link, 'Open my family page')}
    <p style="color:#6B6B6B;font-size:14px;">This link works once and expires in ${linkLifetime(data.expiresMinutes)}. If you didn't ask for it, you can ignore this email.</p>`,
    { organizationName: data.organizationName, preheader: 'Your sign-in link' }
  )
  return { subject: `Your family page link – ${data.organizationName}`, html }
}

export function documentReminderEmail(data: {
  organizationName: string
  guardianFirstName: string
  items: Array<{ childName: string; programName: string; label: string; note?: string | null; needsResubmission?: boolean }>
  link: string
}): { subject: string; html: string } {
  const html = luxEmailLayout(
    `<h1>Documents still needed</h1>
    <p>Hi ${escapeHtml(data.guardianFirstName)},</p>
    <p>${escapeHtml(data.organizationName)} is still waiting on the following:</p>
    <ul style="padding-left:20px;margin:8px 0 16px 0;">${data.items.map(i =>
      `<li><strong>${escapeHtml(i.label)}</strong> for ${escapeHtml(i.childName)} (${escapeHtml(i.programName)})${i.needsResubmission ? ' – please upload a new copy' : ''}${i.note ? `<br><span style="color:#6B6B6B;font-size:14px;">${escapeHtml(i.note)}</span>` : ''}</li>`
    ).join('')}</ul>
    ${button(data.link, 'Upload documents')}
    <p style="color:#6B6B6B;font-size:14px;">This link signs you in to your family page without a password. It works once and expires in 7 days.</p>`,
    { organizationName: data.organizationName, preheader: 'A few documents are still needed' }
  )
  return { subject: `Documents needed – ${data.organizationName}`, html }
}

export function paymentRecordedEmail(data: {
  organizationName: string
  firstName: string
  amount: number
  method: string
  description: string
  remaining: number
}): { subject: string; html: string } {
  const html = luxEmailLayout(
    `<h1>Payment received</h1>
    <p>Hi ${escapeHtml(data.firstName)},</p>
    <p>${escapeHtml(data.organizationName)} recorded your payment of <strong>${formatMoney(data.amount)}</strong> (${escapeHtml(data.method)}) for ${escapeHtml(data.description)}.</p>
    ${data.remaining > 0
      ? infoBox(`Remaining balance: <strong>${formatMoney(data.remaining)}</strong>.`, 'warn')
      : infoBox('<strong>You are paid in full.</strong> Thank you!', 'success')}`,
    { organizationName: data.organizationName, preheader: `Payment of ${formatMoney(data.amount)} received` }
  )
  return { subject: `Payment received – ${data.organizationName}`, html }
}

export function feeAssistanceDecisionEmail(data: {
  organizationName: string
  guardianFirstName: string
  decision: 'approved' | 'waived' | 'denied'
  amountDue: number
  payUrl: string
  officeInstructions?: string
  staffNote?: string | null
}): { subject: string; html: string } {
  const message =
    data.decision === 'waived'
      ? infoBox('<strong>Your fees have been waived.</strong> Nothing is owed. God bless your family!', 'success')
      : data.decision === 'approved'
        ? infoBox(`<strong>Your fee assistance request was approved.</strong> The amount due is now ${formatMoney(data.amountDue)}.`, 'success')
        : infoBox(`The parish reviewed your request. The amount due remains ${formatMoney(data.amountDue)}. Please reach out if you'd like to talk about it.`, 'info')
  const html = luxEmailLayout(
    `<h1>About your registration fees</h1>
    <p>Hi ${escapeHtml(data.guardianFirstName)},</p>
    ${message}
    ${data.staffNote ? paragraphs(data.staffNote) : ''}
    ${data.amountDue > 0
      ? `${button(data.payUrl, `Pay ${formatMoney(data.amountDue)} online`)}${data.officeInstructions ? `<p style="color:#6B6B6B;font-size:14px;">Or pay at the parish office. ${escapeHtml(data.officeInstructions)}</p>` : '<p style="color:#6B6B6B;font-size:14px;">You can also pay at the parish office.</p>'}`
      : ''}`,
    { organizationName: data.organizationName, preheader: 'An update on your registration fees' }
  )
  return { subject: `Your registration fees – ${data.organizationName}`, html }
}
