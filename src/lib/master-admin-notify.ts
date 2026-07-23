import { Resend } from 'resend'
import { wrapEmail, emailInfoBox } from '@/lib/email-templates'

const DEFAULT_RECIPIENT = 'chirhoevents@gmail.com'

/**
 * Recipients that receive real-time master-admin notifications
 * (new support tickets, new onboarding requests, etc.).
 *
 * Reads MASTER_ADMIN_NOTIFY_EMAILS (comma-separated) at call time; falls
 * back to chirhoevents@gmail.com so notifications always land somewhere
 * even before the env var is configured.
 */
export function getMasterAdminNotifyEmails(): string[] {
  const raw = process.env.MASTER_ADMIN_NOTIFY_EMAILS
  if (!raw) return [DEFAULT_RECIPIENT]
  const parsed = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.includes('@'))
  return parsed.length > 0 ? parsed : [DEFAULT_RECIPIENT]
}

/**
 * Send a one-off notification email to the master-admin recipient list.
 * Failures are logged, not thrown — a notification failure must never
 * roll back the ticket / onboarding-request that triggered it.
 */
export async function sendMasterAdminNotification(args: {
  subject: string
  html: string
  replyTo?: string
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[master-admin-notify] RESEND_API_KEY not set — skipping notification')
    return
  }
  const recipients = getMasterAdminNotifyEmails()
  if (recipients.length === 0) return

  const resend = new Resend(apiKey)
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'

  try {
    await resend.emails.send({
      from: `ChiRho Events <${fromEmail}>`,
      to: recipients,
      reply_to: args.replyTo,
      subject: args.subject,
      html: args.html,
    })
  } catch (err) {
    console.error('[master-admin-notify] send failed', err)
  }
}

const SPAM_KEYWORDS = [
  'viagra',
  'cialis',
  'sex',
  'porn',
  'crypto',
  'bitcoin',
  'nft',
  'forex',
  'casino',
  'lottery',
  'loan',
  'seo services',
  'seo agency',
  'backlinks',
  'web design services',
  'web development services',
  'guest post',
  'inheritance',
  'prince',
  'wire transfer',
]

const SPAM_FROM_PATTERNS = [
  /noreply@/i,
  /no-reply@/i,
  /mailer-daemon@/i,
  /postmaster@/i,
]

/**
 * Very light heuristic used to skip master-admin notifications for the
 * obvious junk that lands in the support inbox. It is NOT a full spam
 * filter — the ticket is still created either way. It only decides
 * whether we bother the admin's inbox about it.
 */
export function isLikelySpamInbound(args: {
  subject?: string | null
  message?: string | null
  fromEmail?: string | null
}): boolean {
  const from = (args.fromEmail || '').toLowerCase()
  if (SPAM_FROM_PATTERNS.some((re) => re.test(from))) return true

  const haystack = `${args.subject ?? ''} \n ${args.message ?? ''}`.toLowerCase()
  if (!haystack.trim()) return true

  for (const kw of SPAM_KEYWORDS) {
    if (haystack.includes(kw)) return true
  }
  return false
}

/**
 * Render a small notification body used across every master-admin
 * notification so the emails read consistently. `rows` is a
 * label → value list rendered as a two-column table.
 */
export function renderMasterAdminNotificationHtml(args: {
  title: string
  intro?: string
  rows: { label: string; value: string }[]
  bodyLabel?: string
  bodyText?: string | null
  ctaLabel?: string
  ctaUrl?: string
  footerNote?: string
}): string {
  const rowsHtml = args.rows
    .map(
      (r) => `
        <tr>
          <td style="padding: 8px 12px; color: #6b7280; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; width: 40%;">${escapeHtml(r.label)}</td>
          <td style="padding: 8px 12px; color: #1f2937; font-size: 15px;">${escapeHtml(r.value)}</td>
        </tr>
      `,
    )
    .join('')

  const bodySection =
    args.bodyText != null && args.bodyText.trim().length > 0
      ? `
        <h3 style="margin-top: 24px;">${escapeHtml(args.bodyLabel ?? 'Message')}</h3>
        <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; padding: 16px; white-space: pre-wrap; color: #1f2937; font-size: 14px;">
${escapeHtml(args.bodyText)}
        </div>
      `
      : ''

  const cta =
    args.ctaLabel && args.ctaUrl
      ? `
        <p style="margin: 24px 0;">
          <a href="${args.ctaUrl}" style="display: inline-block; background: #1E3A5F; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
            ${escapeHtml(args.ctaLabel)}
          </a>
        </p>
      `
      : ''

  const footer = args.footerNote
    ? emailInfoBox(escapeHtml(args.footerNote), 'info')
    : ''

  return wrapEmail(`
    <h1>${escapeHtml(args.title)}</h1>
    ${args.intro ? `<p>${escapeHtml(args.intro)}</p>` : ''}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden; margin-top: 8px;">
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    ${bodySection}
    ${cta}
    ${footer}
  `)
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
