import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import {
  buildVendorInvoiceEmail,
  findVendorForAdmin,
  logVendorActivity,
  sendVendorEmail,
  toCents,
} from '@/lib/vendor-admin'

/**
 * Email the vendor their invoice (`type: 'invoice'`) or a balance-due
 * reminder (`type: 'reminder'`), with an optional personal message.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; vendorId: string }> }
) {
  const { eventId, vendorId } = await params
  const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
    requireAdmin: true,
    logPrefix: '[Vendor Send Invoice]',
  })
  if (error) return error
  if (!user || !effectiveOrgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const vendor = await findVendorForAdmin(eventId, vendorId, effectiveOrgId)
  if (!vendor) {
    return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
  }
  if (vendor.status !== 'approved' || vendor.invoiceTotal == null) {
    return NextResponse.json({ error: 'This vendor has no invoice yet. Approve them first.' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const type: 'invoice' | 'reminder' = body.type === 'reminder' ? 'reminder' : 'invoice'

  const balance = toCents(Number(vendor.invoiceTotal) - Number(vendor.amountPaid || 0))
  if (type === 'reminder' && balance <= 0) {
    return NextResponse.json({ error: 'This vendor has no balance due.' }, { status: 400 })
  }

  const { subject, html } = buildVendorInvoiceEmail(vendor, type, body.message)
  const sent = await sendVendorEmail({
    vendor,
    subject,
    html,
    emailType: type === 'reminder' ? 'vendor_payment_reminder' : 'vendor_invoice',
  })
  if (!sent) {
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }

  await logVendorActivity({
    vendorId: vendor.id,
    organizationId: effectiveOrgId,
    userId: user.id,
    editType: 'info_updated',
    action: type === 'reminder' ? 'reminder_sent' : 'invoice_sent',
    details: { balance },
    emailSent: true,
  })

  return NextResponse.json({ success: true })
}
