import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEventAccess } from '@/lib/api-auth'
import { deriveVendorPaymentStatus, logVendorActivity, toCents } from '@/lib/vendor-admin'

const METHODS = ['check', 'cash', 'bank_transfer', 'card', 'other'] as const
type Method = (typeof METHODS)[number]

/**
 * Record an offline vendor payment (check, cash, bank transfer, card taken
 * in person, ...). Creates a Payment row for the history and bumps the
 * vendor's amountPaid / paymentStatus.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; vendorId: string }> }
) {
  const { eventId, vendorId } = await params
  const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
    requireAdmin: true,
    logPrefix: '[Vendor Record Payment]',
  })
  if (error) return error
  if (!user || !effectiveOrgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const vendor = await prisma.vendorRegistration.findFirst({
    where: { id: vendorId, eventId, organizationId: effectiveOrgId },
  })
  if (!vendor) {
    return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
  }
  if (vendor.status !== 'approved') {
    return NextResponse.json({ error: 'Payments can only be recorded for approved vendors.' }, { status: 400 })
  }

  const body = await request.json()
  const amount = toCents(Number(body.amount))
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Enter an amount greater than $0.' }, { status: 400 })
  }
  const method: Method = METHODS.includes(body.method) ? body.method : 'other'
  const checkNumber = method === 'check' ? String(body.checkNumber || '').trim() || null : null
  const note = String(body.notes || '').trim() || null
  // Store manual dates at noon UTC so they never shift a day in US time zones
  const receivedDate = body.receivedDate ? new Date(`${body.receivedDate}T12:00:00Z`) : new Date()
  if (Number.isNaN(receivedDate.getTime())) {
    return NextResponse.json({ error: 'Invalid received date.' }, { status: 400 })
  }

  const invoiceTotal = Number(vendor.invoiceTotal || 0)
  const newPaid = toCents(Number(vendor.amountPaid || 0) + amount)
  const paymentStatus = deriveVendorPaymentStatus(invoiceTotal, newPaid)

  const [payment] = await prisma.$transaction([
    prisma.payment.create({
      data: {
        organizationId: effectiveOrgId,
        eventId,
        registrationId: vendor.id,
        registrationType: 'vendor',
        amount,
        paymentType: 'balance',
        paymentMethod: method,
        paymentStatus: 'succeeded',
        checkNumber,
        checkReceivedDate: method === 'check' ? receivedDate : null,
        notes: note,
        processedByUserId: user.id,
        processedVia: 'manual',
        processedAt: receivedDate,
      },
    }),
    prisma.vendorRegistration.update({
      where: { id: vendor.id },
      data: {
        amountPaid: newPaid,
        paymentStatus,
        paidAt: paymentStatus === 'paid' ? vendor.paidAt ?? new Date() : vendor.paidAt,
      },
    }),
  ])

  await logVendorActivity({
    vendorId: vendor.id,
    organizationId: effectiveOrgId,
    userId: user.id,
    editType: 'payment_processed',
    action: 'payment_recorded',
    details: { amount, method, checkNumber, paymentId: payment.id },
    note,
  })

  return NextResponse.json({
    success: true,
    amountPaid: newPaid,
    paymentStatus,
    overpaid: newPaid > invoiceTotal ? toCents(newPaid - invoiceTotal) : 0,
  })
}
