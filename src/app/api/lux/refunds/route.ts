import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLuxStaff, luxAudit, clientIp } from '@/lib/lux/access'
import { OrderActionError } from '@/lib/lux/order-staff-actions'
import { refundableAmounts, refundLuxPayment, type RefundKind } from '@/lib/lux/refunds'
import { refundEmail, sendLuxEmail } from '@/lib/lux/email'

// Money leaves the parish's account: the admin and finance roles only
const REFUND_ROLES = ['org_admin', 'finance_manager', 'master_admin']

function kindOf(value: unknown): RefundKind | null {
  return value === 'order' || value === 'event' ? value : null
}

async function requireRefunder(request: NextRequest) {
  const result = await requireLuxStaff(request, { manage: true })
  if (result.error) return result
  if (!REFUND_ROLES.includes(result.ctx.user.role)) {
    return { error: NextResponse.json({ error: 'Only your organization admin can give refunds.' }, { status: 403 }), ctx: undefined }
  }
  return result
}

/** GET /api/lux/refunds?kind=order|event&id=  How much can be refunded, and how much back to a card */
export async function GET(request: NextRequest) {
  const { error, ctx } = await requireRefunder(request)
  if (error) return error
  const kind = kindOf(request.nextUrl.searchParams.get('kind'))
  const id = request.nextUrl.searchParams.get('id')
  if (!kind || !id) return NextResponse.json({ error: 'Missing registration' }, { status: 400 })
  try {
    return NextResponse.json(await refundableAmounts(ctx.organizationId, kind, id))
  } catch (e) {
    if (e instanceof OrderActionError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}

/**
 * POST /api/lux/refunds
 * { kind: 'order'|'event', id, amount, method: 'card'|'cash'|'check'|'other', reason?, checkNumber?, note?, sendEmail? }
 */
export async function POST(request: NextRequest) {
  const { error, ctx } = await requireRefunder(request)
  if (error) return error
  const body = await request.json().catch(() => ({}))
  const kind = kindOf(body.kind)
  if (!kind || typeof body.id !== 'string') return NextResponse.json({ error: 'Missing registration' }, { status: 400 })

  let result: Awaited<ReturnType<typeof refundLuxPayment>>
  try {
    result = await refundLuxPayment({
      organizationId: ctx.organizationId,
      kind,
      id: body.id,
      userId: ctx.user.id,
      amount: body.amount,
      method: body.method,
      reason: body.reason,
      checkNumber: body.checkNumber,
      note: body.note,
    })
  } catch (e) {
    if (e instanceof OrderActionError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
  const { target, amount, toCard } = result

  await luxAudit({
    organizationId: ctx.organizationId, actorUserId: ctx.user.id, action: 'refund.recorded',
    targetType: target.registrationType, targetId: target.id, metadata: { amount, method: body.method }, ip: clientIp(request),
  })

  if (body.sendEmail !== false && target.recipient.email) {
    const lang = target.recipient.lang
    const email = refundEmail({
      organizationName: ctx.organization.name,
      firstName: target.recipient.firstName,
      amount,
      toCard,
      description: target.description[lang],
      lang,
    })
    const org = await prisma.organization.findUnique({ where: { id: ctx.organizationId }, select: { contactEmail: true } })
    await sendLuxEmail({
      organizationId: ctx.organizationId,
      organizationName: ctx.organization.name,
      to: target.recipient.email,
      recipientName: `${target.recipient.firstName} ${target.recipient.lastName}`,
      replyTo: org?.contactEmail || undefined,
      eventId: target.eventId ?? undefined,
      registrationId: target.id,
      registrationType: target.registrationType,
      emailType: 'lux_refund',
      ...email,
    })
  }

  return NextResponse.json({ success: true, amount, paidAfter: result.paidAfter })
}
