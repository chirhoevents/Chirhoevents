import { Resend } from '@/lib/resend'
import {
  sendMasterAdminNotification,
  renderMasterAdminNotificationHtml,
} from '@/lib/master-admin-notify'

/**
 * Emails for payments organizations make to ChiRho itself (setup fees,
 * subscriptions, platform invoices) — not event registration payments.
 *
 * Every function here logs and swallows failures: a payment is already
 * recorded by the time these run, and an email failure must never turn a
 * webhook or admin action into an error.
 */

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'
const fromAddress = () =>
  `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`

const INVOICE_TYPE_LABELS: Record<string, string> = {
  setup_fee: 'Setup Fee',
  subscription: 'Subscription',
  reactivation_fee: 'Reactivation Fee',
  custom: 'Invoice',
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  credit_card: 'Credit Card',
  card: 'Credit Card',
  card_manual: 'Credit Card',
  check: 'Check',
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  ach: 'Bank Transfer (ACH)',
  other: 'Other',
}

export function invoiceTypeLabel(type: string | null | undefined): string {
  if (!type) return 'Payment'
  return INVOICE_TYPE_LABELS[type] || type
}

export function paymentMethodLabel(method: string | null | undefined): string {
  if (!method) return 'Credit Card'
  return PAYMENT_METHOD_LABELS[method] || method
}

function formatAmount(amount: number): string {
  return `$${amount.toFixed(2)}`
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function receiptShell(banner: string, body: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; padding: 20px 0; background-color: #1E3A5F;">
        <img src="${appUrl()}/logo-horizontal.png" alt="ChiRho Events" style="max-width: 200px; height: auto;" />
      </div>

      <div style="padding: 30px 20px;">
        ${banner}
        ${body}
        <p>Best regards,<br><strong>ChirhoEvents Team</strong></p>
      </div>

      <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} ChirhoEvents. All rights reserved.</p>
      </div>
    </div>
  `
}

function detailsBox(rows: { label: string; value: string }[]): string {
  return `
    <div style="background-color: #F5F5F5; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      ${rows
        .map(
          (r) =>
            `<p style="margin: 5px 0;"><strong>${escapeHtml(r.label)}:</strong> ${escapeHtml(r.value)}</p>`
        )
        .join('')}
    </div>
  `
}

/** Receipt sent to the organization after it pays ChiRho. */
export async function sendOrgPaymentReceipt(args: {
  to: string
  invoiceNumber?: number | null
  amount: number
  paymentMethod?: string | null
  description?: string | null
  paidAt?: Date | null
  checkNumber?: string | null
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[platform-payment-emails] RESEND_API_KEY not set — skipping receipt')
    return
  }

  const rows: { label: string; value: string }[] = []
  if (args.invoiceNumber) rows.push({ label: 'Invoice #', value: String(args.invoiceNumber) })
  if (args.description) rows.push({ label: 'For', value: args.description })
  rows.push({ label: 'Amount Paid', value: formatAmount(args.amount) })
  rows.push({ label: 'Payment Method', value: paymentMethodLabel(args.paymentMethod) })
  if (args.checkNumber) rows.push({ label: 'Check #', value: args.checkNumber })
  rows.push({ label: 'Date', value: formatDate(args.paidAt ?? new Date()) })

  const banner = `
    <div style="background-color: #D4EDDA; padding: 20px; border-left: 4px solid #28A745; margin-bottom: 20px;">
      <h2 style="color: #155724; margin-top: 0;">Payment Received!</h2>
      <p style="margin: 0; color: #155724;">Thank you for your payment.</p>
    </div>
  `
  const body = `
    ${detailsBox(rows)}
    <p>This email serves as your receipt. If you have any questions, please contact us at support@chirhoevents.com.</p>
  `

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: fromAddress(),
      reply_to: 'support@chirhoevents.com',
      to: args.to,
      subject: args.invoiceNumber
        ? `Payment Received - Invoice #${args.invoiceNumber}`
        : 'Payment Received - ChiRho Events',
      html: receiptShell(banner, body),
    })
    if (error) console.error('[platform-payment-emails] receipt send failed', error)
    else console.log('✅ Payment receipt sent to:', args.to)
  } catch (err) {
    console.error('[platform-payment-emails] receipt send failed', err)
  }
}

/** Notice sent to the organization when an automatic subscription charge fails. */
export async function sendOrgPaymentFailedEmail(args: {
  to: string
  amount: number
  attemptCount?: number | null
  nextAttemptAt?: Date | null
  updatePaymentUrl?: string | null
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[platform-payment-emails] RESEND_API_KEY not set — skipping failed-payment email')
    return
  }

  const rows: { label: string; value: string }[] = [
    { label: 'Amount Due', value: formatAmount(args.amount) },
  ]
  if (args.nextAttemptAt) rows.push({ label: 'Next Retry', value: formatDate(args.nextAttemptAt) })

  const banner = `
    <div style="background-color: #FFF3CD; padding: 20px; border-left: 4px solid #F59E0B; margin-bottom: 20px;">
      <h2 style="color: #92400E; margin-top: 0;">Subscription Payment Failed</h2>
      <p style="margin: 0; color: #92400E;">We weren't able to charge the card on file for your ChiRho Events subscription.</p>
    </div>
  `
  const cta = args.updatePaymentUrl
    ? `
      <p style="margin: 24px 0;">
        <a href="${args.updatePaymentUrl}" style="display: inline-block; background: #1E3A5F; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
          Pay Now / Update Card
        </a>
      </p>
    `
    : ''
  const body = `
    ${detailsBox(rows)}
    <p>Please update your payment method to keep your account active. If the payment can't be collected, your account may be suspended.</p>
    ${cta}
    <p>If you have any questions, please contact us at support@chirhoevents.com.</p>
  `

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: fromAddress(),
      reply_to: 'support@chirhoevents.com',
      to: args.to,
      subject: 'Action Needed: Subscription Payment Failed - ChiRho Events',
      html: receiptShell(banner, body),
    })
    if (error) console.error('[platform-payment-emails] failed-payment send failed', error)
  } catch (err) {
    console.error('[platform-payment-emails] failed-payment send failed', err)
  }
}

/** Internal heads-up to the master-admin inbox that an organization paid ChiRho. */
export async function notifyMasterAdminPaymentReceived(args: {
  organizationId: string
  organizationName: string
  amount: number
  invoiceNumber?: number | null
  invoiceType?: string | null
  description?: string | null
  source: string
}): Promise<void> {
  const rows: { label: string; value: string }[] = [
    { label: 'Organization', value: args.organizationName },
    { label: 'Amount', value: formatAmount(args.amount) },
    { label: 'Type', value: invoiceTypeLabel(args.invoiceType) },
  ]
  if (args.invoiceNumber) rows.push({ label: 'Invoice #', value: String(args.invoiceNumber) })
  if (args.description) rows.push({ label: 'Description', value: args.description })
  rows.push({ label: 'Paid Via', value: args.source })
  rows.push({ label: 'Date', value: formatDate(new Date()) })

  await sendMasterAdminNotification({
    subject: `💰 Payment received: ${formatAmount(args.amount)} from ${args.organizationName}`,
    html: renderMasterAdminNotificationHtml({
      title: 'Payment Received',
      intro: `${args.organizationName} just paid ChiRho Events.`,
      rows,
      ctaLabel: 'View Organization',
      ctaUrl: `${appUrl()}/dashboard/master-admin/organizations/${args.organizationId}`,
    }),
  })
}

/** Internal alert to the master-admin inbox that a subscription charge failed. */
export async function notifyMasterAdminPaymentFailed(args: {
  organizationId: string
  organizationName: string
  amount: number
  attemptCount?: number | null
  nextAttemptAt?: Date | null
}): Promise<void> {
  const rows: { label: string; value: string }[] = [
    { label: 'Organization', value: args.organizationName },
    { label: 'Amount Due', value: formatAmount(args.amount) },
  ]
  if (args.attemptCount) rows.push({ label: 'Attempt', value: String(args.attemptCount) })
  rows.push({
    label: 'Next Retry',
    value: args.nextAttemptAt ? formatDate(args.nextAttemptAt) : 'None scheduled',
  })

  await sendMasterAdminNotification({
    subject: `⚠️ Subscription payment failed: ${args.organizationName}`,
    html: renderMasterAdminNotificationHtml({
      title: 'Subscription Payment Failed',
      intro: `Stripe couldn't charge ${args.organizationName} for their subscription. The organization has been emailed.`,
      rows,
      ctaLabel: 'View Organization',
      ctaUrl: `${appUrl()}/dashboard/master-admin/organizations/${args.organizationId}`,
    }),
  })
}
