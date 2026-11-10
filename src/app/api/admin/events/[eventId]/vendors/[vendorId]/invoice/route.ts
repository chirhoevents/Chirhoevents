import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEventAccess } from '@/lib/api-auth'
import {
  buildVendorInvoiceEmail,
  deriveVendorPaymentStatus,
  findVendorForAdmin,
  logVendorActivity,
  parseLineItems,
  sendVendorEmail,
  toCents,
} from '@/lib/vendor-admin'

/**
 * Edit an approved vendor's invoice (line items + notes). Payment status is
 * recomputed against what they've already paid. Pass `waive: true` to comp
 * the booth (invoice becomes a single $0 "Fee waived" line).
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; vendorId: string }> }
) {
  const { eventId, vendorId } = await params
  const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
    requireAdmin: true,
    logPrefix: '[Vendor Invoice Edit]',
  })
  if (error) return error
  if (!user || !effectiveOrgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const vendor = await findVendorForAdmin(eventId, vendorId, effectiveOrgId)
  if (!vendor) {
    return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
  }
  if (vendor.status !== 'approved') {
    return NextResponse.json(
      { error: 'Invoices can only be edited for approved vendors. Use Review to approve first.' },
      { status: 400 }
    )
  }

  const body = await request.json()
  const waive = body.waive === true
  const sendEmail = body.sendEmail === true

  const lineItems = waive
    ? [{ description: body.waiveReason?.trim() || 'Booth fee waived', amount: 0 }]
    : parseLineItems(body.lineItems)
  if (!lineItems || lineItems.length === 0) {
    return NextResponse.json(
      { error: 'Add at least one line item with a description and a non-negative amount.' },
      { status: 400 }
    )
  }

  const newTotal = toCents(lineItems.reduce((sum, i) => sum + i.amount, 0))
  const oldTotal = Number(vendor.invoiceTotal || 0)
  const amountPaid = Number(vendor.amountPaid || 0)
  const paymentStatus = deriveVendorPaymentStatus(newTotal, amountPaid)
  const invoiceNotes =
    body.invoiceNotes === undefined ? vendor.invoiceNotes : String(body.invoiceNotes || '').trim() || null

  const updated = await prisma.vendorRegistration.update({
    where: { id: vendor.id },
    data: {
      invoiceLineItems: lineItems,
      invoiceTotal: newTotal,
      invoiceNotes,
      paymentStatus,
      paidAt: paymentStatus === 'paid' ? vendor.paidAt ?? new Date() : null,
    },
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

  let emailSent = false
  if (sendEmail) {
    const { subject, html } = buildVendorInvoiceEmail(updated, 'updated')
    emailSent = await sendVendorEmail({ vendor: updated, subject, html, emailType: 'vendor_invoice_updated' })
  }

  await logVendorActivity({
    vendorId: vendor.id,
    organizationId: effectiveOrgId,
    userId: user.id,
    editType: 'payment_updated',
    action: waive ? 'fee_waived' : 'invoice_edited',
    details: { lineItems },
    oldTotal,
    newTotal,
    emailSent,
  })

  return NextResponse.json({
    success: true,
    emailSent,
    vendor: { invoiceLineItems: lineItems, invoiceTotal: newTotal, invoiceNotes, paymentStatus },
    overpaid: amountPaid > newTotal ? toCents(amountPaid - newTotal) : 0,
  })
}
