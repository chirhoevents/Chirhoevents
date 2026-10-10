import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLuxStaff, luxAudit, clientIp } from '@/lib/lux/access'
import { loadOrderForStaff } from '@/lib/lux/orders-staff'
import { OrderActionError, recordOrderOfficePayment } from '@/lib/lux/order-staff-actions'
import { paymentRecordedEmail, sendLuxEmail } from '@/lib/lux/email'

type Params = { params: Promise<{ id: string }> }

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
  const body = await request.json().catch(() => ({}))

  let result: Awaited<ReturnType<typeof recordOrderOfficePayment>>
  try {
    result = await recordOrderOfficePayment({
      organizationId: ctx.organizationId,
      orderId: id,
      userId: ctx.user.id,
      amount: body.amount,
      method: body.method,
      checkNumber: body.checkNumber,
      note: body.note,
    })
  } catch (e) {
    if (e instanceof OrderActionError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
  const { order, amount, method, remaining } = result

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
      remaining,
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
