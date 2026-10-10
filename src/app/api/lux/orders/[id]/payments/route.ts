import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLuxStaff, luxAudit, clientIp } from '@/lib/lux/access'
import { closeOpenCheckouts, recalculateOrder } from '@/lib/lux/order-payments'
import { loadOrderForStaff } from '@/lib/lux/orders-staff'
import { paymentRecordedEmail, sendLuxEmail } from '@/lib/lux/email'

type Params = { params: Promise<{ id: string }> }

const METHODS: Record<string, 'cash' | 'check' | 'card' | 'other'> = { cash: 'cash', check: 'check', card: 'card', other: 'other' }
const METHOD_LABELS: Record<string, string> = { cash: 'cash', check: 'check', card: 'card at the office', other: 'other' }

/**
 * POST /api/lux/orders/[id]/payments
 * Record a payment taken at the parish office for a faith formation order.
 * { amount, method, checkNumber?, note?, sendEmail? }
 */
export async function POST(request: NextRequest, { params }: Params) {
  const { error, ctx } = await requireLuxStaff(request, { manage: true })
  if (error) return error
  const { id } = await params

  const order = await prisma.luxOrder.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: { household: true },
  })
  if (!order) return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
  if (order.status === 'cancelled') return NextResponse.json({ error: 'This registration was cancelled.' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const amount = Math.round(Number(body.amount) * 100) / 100
  const method = METHODS[body.method]
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'Enter the amount received.' }, { status: 400 })
  if (!method) return NextResponse.json({ error: 'Choose how it was paid.' }, { status: 400 })
  const owed = Math.round((Number(order.amountDue) - Number(order.amountPaid)) * 100) / 100
  if (amount > owed + 0.005) {
    return NextResponse.json({ error: owed > 0 ? `That's more than the ${owed.toFixed(2)} still owed.` : 'Nothing is owed on this registration.' }, { status: 400 })
  }

  // Paying at the office instead of finishing a card checkout: hold their
  // spots (before closing the checkout, whose expiry would release them)
  if (order.status === 'pending_payment') {
    await prisma.$transaction([
      prisma.luxOrder.update({ where: { id: order.id }, data: { status: 'office_pending', paymentMethod: 'office' } }),
      prisma.luxProgramRegistration.updateMany({
        where: { orderId: order.id, status: 'pending_payment', cancelledAt: null },
        data: { status: 'registered' },
      }),
    ])
  }
  await closeOpenCheckouts(order.id)
  await prisma.payment.create({
    data: {
      organizationId: ctx.organizationId,
      eventId: null,
      registrationId: order.id,
      registrationType: 'lux_order',
      amount,
      paymentType: 'balance',
      paymentMethod: method,
      paymentStatus: 'succeeded',
      checkNumber: method === 'check' ? (String(body.checkNumber || '').slice(0, 50) || null) : null,
      checkReceivedDate: method === 'check' ? new Date() : null,
      notes: typeof body.note === 'string' ? body.note.slice(0, 1000) : null,
      processedAt: new Date(),
      processedByUserId: ctx.user.id,
      processedVia: 'manual',
    },
  })
  const updated = await recalculateOrder(order.id)
  await luxAudit({
    organizationId: ctx.organizationId, actorUserId: ctx.user.id, action: 'order.payment_recorded',
    targetType: 'lux_order', targetId: order.id, metadata: { amount, method }, ip: clientIp(request),
  })

  if (body.sendEmail !== false) {
    const email = paymentRecordedEmail({
      organizationName: ctx.organization.name,
      firstName: order.household.guardian1FirstName,
      amount,
      method: METHOD_LABELS[method],
      description: `registration #${order.confirmationCode}`,
      remaining: updated ? Math.max(0, Number(updated.amountDue) - Number(updated.amountPaid)) : 0,
    })
    const org = await prisma.organization.findUnique({ where: { id: ctx.organizationId }, select: { contactEmail: true } })
    await sendLuxEmail({
      organizationId: ctx.organizationId,
      organizationName: ctx.organization.name,
      to: order.household.email,
      recipientName: `${order.household.guardian1FirstName} ${order.household.guardian1LastName}`,
      replyTo: org?.contactEmail || undefined,
      registrationId: order.id,
      registrationType: 'lux_order',
      emailType: 'lux_payment_recorded',
      ...email,
    })
  }

  return NextResponse.json({ success: true, order: await loadOrderForStaff(ctx.organizationId, order.id) })
}
