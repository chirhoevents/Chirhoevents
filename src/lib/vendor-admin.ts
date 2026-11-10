import { prisma } from '@/lib/prisma'
import { Resend } from '@/lib/resend'
import { logEmail, logEmailFailure } from '@/lib/email-logger'
import { wrapEmail, emailButton, emailInfoBox } from '@/lib/email-templates'
import { resolveReplyTo } from '@/lib/email-reply-to'

const resend = new Resend(process.env.RESEND_API_KEY!)

export interface InvoiceLineItem {
  description: string
  amount: number
}

export function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    'https://chirhoevents.com'
  )
}

export function escapeHtml(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Round to cents so float math never leaves a vendor $0.0000001 short. */
export function toCents(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Payment status from what's owed vs. what's been paid. A $0 invoice (fee
 * waived) counts as paid.
 */
export function deriveVendorPaymentStatus(
  invoiceTotal: number,
  amountPaid: number
): 'unpaid' | 'partial' | 'paid' {
  if (amountPaid >= invoiceTotal) return 'paid'
  if (amountPaid > 0) return 'partial'
  return 'unpaid'
}

/** Validate and normalize invoice line items coming from the admin UI. */
export function parseLineItems(raw: unknown): InvoiceLineItem[] | null {
  if (!Array.isArray(raw)) return null
  const items: InvoiceLineItem[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null
    const description = String((item as { description?: unknown }).description ?? '').trim()
    const amount = Number((item as { amount?: unknown }).amount)
    if (!description || !Number.isFinite(amount) || amount < 0) return null
    items.push({ description, amount: toCents(amount) })
  }
  return items
}

/** Load a vendor scoped to the event + org, with what emails need. */
export async function findVendorForAdmin(eventId: string, vendorId: string, organizationId: string) {
  return prisma.vendorRegistration.findFirst({
    where: { id: vendorId, eventId, organizationId },
    include: {
      event: {
        select: {
          id: true,
          name: true,
          slug: true,
          organizationId: true,
          organization: { select: { name: true, contactEmail: true } },
          settings: { select: { contactEmail: true } },
        },
      },
    },
  })
}

export type AdminVendor = NonNullable<Awaited<ReturnType<typeof findVendorForAdmin>>>

/** Record an entry in the vendor's activity history. Never throws. */
export async function logVendorActivity(params: {
  vendorId: string
  organizationId: string
  userId: string
  editType: 'info_updated' | 'payment_updated' | 'payment_processed'
  action: string
  details?: Record<string, unknown>
  note?: string | null
  oldTotal?: number | null
  newTotal?: number | null
  emailSent?: boolean
}) {
  try {
    await prisma.registrationEdit.create({
      data: {
        registrationId: params.vendorId,
        registrationType: 'vendor',
        organizationId: params.organizationId,
        editedByUserId: params.userId,
        editType: params.editType,
        changesMade: { action: params.action, ...(params.details || {}) } as object,
        oldTotal: params.oldTotal ?? null,
        newTotal: params.newTotal ?? null,
        difference:
          params.oldTotal != null && params.newTotal != null
            ? toCents(params.newTotal - params.oldTotal)
            : null,
        adminNotes: params.note ?? null,
        emailSent: params.emailSent ?? false,
      },
    })
  } catch (err) {
    console.error('[Vendor Activity] Failed to log activity:', err)
  }
}

/** Send an email to the vendor contact and log it. Returns success. */
export async function sendVendorEmail(params: {
  vendor: Pick<AdminVendor, 'id' | 'email' | 'contactFirstName' | 'contactLastName' | 'eventId'> & {
    event: AdminVendor['event']
  }
  subject: string
  html: string
  emailType: string
}): Promise<boolean> {
  const { vendor, subject, html, emailType } = params
  const replyTo = resolveReplyTo(vendor.event.settings, vendor.event.organization)
  const logData = {
    organizationId: vendor.event.organizationId,
    eventId: vendor.eventId,
    registrationId: vendor.id,
    registrationType: 'vendor' as const,
    recipientEmail: vendor.email,
    recipientName: `${vendor.contactFirstName} ${vendor.contactLastName}`,
    emailType,
    subject,
    htmlContent: html,
  }
  try {
    await resend.emails.send({
      from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
      reply_to: replyTo,
      to: vendor.email,
      subject,
      html,
    })
    await logEmail(logData)
    return true
  } catch (err) {
    console.error(`[Vendor Email] Failed to send ${emailType} to`, vendor.email, err)
    await logEmailFailure({ ...logData, htmlContent: '' }, err instanceof Error ? err.message : 'Unknown error')
    return false
  }
}

function invoiceTableHtml(lineItems: InvoiceLineItem[], total: number, amountPaid: number): string {
  const balance = toCents(total - amountPaid)
  const rows = lineItems
    .map(
      (item) => `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; color: #666666; font-size: 14px;">${escapeHtml(item.description)}</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; text-align: right; font-weight: 600; color: #1E3A5F;">$${Number(item.amount).toFixed(2)}</td>
      </tr>`
    )
    .join('')
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0; background: #f9f9f9; border-radius: 8px; padding: 20px;">
      <tr><td>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${rows}
          <tr>
            <td style="padding: 12px 0 4px 0; font-weight: 700; color: #1E3A5F;">Invoice Total</td>
            <td style="padding: 12px 0 4px 0; text-align: right; font-weight: 700; color: #1E3A5F;">$${total.toFixed(2)}</td>
          </tr>
          ${
            amountPaid > 0
              ? `<tr>
            <td style="padding: 4px 0; color: #666666; font-size: 14px;">Paid to date</td>
            <td style="padding: 4px 0; text-align: right; color: #15803d; font-size: 14px;">-$${amountPaid.toFixed(2)}</td>
          </tr>`
              : ''
          }
          <tr>
            <td style="padding: 8px 0; font-weight: 700; font-size: 16px; color: #1E3A5F;">Balance Due</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 700; font-size: 18px; color: #1E3A5F;">$${Math.max(0, balance).toFixed(2)}</td>
          </tr>
        </table>
      </td></tr>
    </table>`
}

/**
 * Invoice / reminder email for a vendor.
 * - invoice: the current invoice (used for "resend invoice" and after edits)
 * - reminder: a nudge about the outstanding balance
 */
export function buildVendorInvoiceEmail(
  vendor: AdminVendor,
  kind: 'invoice' | 'updated' | 'reminder',
  customMessage?: string | null
): { subject: string; html: string } {
  const lineItems = (vendor.invoiceLineItems as InvoiceLineItem[] | null) || []
  const total = Number(vendor.invoiceTotal || 0)
  const amountPaid = Number(vendor.amountPaid || 0)
  const balance = Math.max(0, toCents(total - amountPaid))
  const portalUrl = `${appBaseUrl()}/vendor-dashboard?code=${encodeURIComponent(vendor.accessCode)}`
  const eventName = escapeHtml(vendor.event.name)

  const heading =
    kind === 'reminder'
      ? 'Payment Reminder'
      : kind === 'updated'
        ? 'Your Invoice Has Been Updated'
        : 'Your Vendor Invoice'

  const intro =
    kind === 'reminder'
      ? `This is a friendly reminder that your vendor booth for <strong>${eventName}</strong> has a balance of <strong>$${balance.toFixed(2)}</strong> due.`
      : kind === 'updated'
        ? `The invoice for your vendor booth at <strong>${eventName}</strong> has been updated. Here are the current details:`
        : `Here is the invoice for your vendor booth at <strong>${eventName}</strong>:`

  const subject =
    kind === 'reminder'
      ? `Payment Reminder - ${vendor.event.name}`
      : kind === 'updated'
        ? `Updated Vendor Invoice - ${vendor.event.name}`
        : `Vendor Invoice - ${vendor.event.name}`

  const custom = customMessage?.trim()
    ? `<p>${escapeHtml(customMessage.trim()).replace(/\n/g, '<br>')}</p>`
    : ''

  const html = wrapEmail(
    `
      <h1>${heading}</h1>
      <p>Hi ${escapeHtml(vendor.contactFirstName)},</p>
      <p>${intro}</p>
      ${custom}
      ${invoiceTableHtml(lineItems, total, amountPaid)}
      ${vendor.invoiceNotes ? `<p style="font-size: 14px; color: #666;"><strong>Notes:</strong> ${escapeHtml(vendor.invoiceNotes)}</p>` : ''}
      ${
        balance > 0
          ? `<p>You can pay your balance online through your vendor portal:</p>
             ${emailButton('Pay in Vendor Portal', portalUrl, 'primary')}`
          : emailInfoBox('<strong>Paid in full.</strong> Thank you!', 'success')
      }
      <p style="font-size: 14px; color: #666;">Business: <strong>${escapeHtml(vendor.businessName)}</strong></p>
    `,
    {
      organizationName: vendor.event.organization?.name || 'ChiRho Events',
      preheader: kind === 'reminder' ? `Balance due: $${balance.toFixed(2)}` : `Your invoice for ${vendor.event.name}`,
      supportEmail: resolveReplyTo(vendor.event.settings, vendor.event.organization),
    }
  )

  return { subject, html }
}
