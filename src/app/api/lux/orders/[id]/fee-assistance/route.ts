import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLuxStaff, luxAudit, clientIp } from '@/lib/lux/access'
import { loadOrderForStaff } from '@/lib/lux/orders-staff'
import { closeOpenCheckouts } from '@/lib/lux/order-payments'
import { orderPayUrl } from '@/lib/lux/order-emails'
import { feeAssistanceDecisionEmail, sendLuxEmail } from '@/lib/lux/email'
import { parseLuxSettings } from '@/lib/lux/settings'

type Params = { params: Promise<{ id: string }> }

/**
 * POST /api/lux/orders/[id]/fee-assistance
 * Decide a family's fee assistance request, or adjust what any order owes.
 *   { decision: 'approved', amountDue, note?, sendEmail? }  reduce the amount due
 *   { decision: 'waived', note?, sendEmail? }              nothing more is owed
 *   { decision: 'denied', note?, sendEmail? }              the full total stays due
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
  const decision = body.decision as 'approved' | 'waived' | 'denied'
  if (!['approved', 'waived', 'denied'].includes(decision)) {
    return NextResponse.json({ error: 'Choose approve, waive or deny.' }, { status: 400 })
  }
  const total = Number(order.total)
  const paid = Number(order.amountPaid)
  let amountDue = total
  if (decision === 'waived') amountDue = paid
  if (decision === 'approved') {
    amountDue = Math.round(Number(body.amountDue) * 100) / 100
    if (!Number.isFinite(amountDue) || amountDue < 0) return NextResponse.json({ error: 'Enter the new amount due.' }, { status: 400 })
    if (amountDue > total) return NextResponse.json({ error: `The amount due can't be more than the ${total.toFixed(2)} total.` }, { status: 400 })
    if (amountDue < paid) return NextResponse.json({ error: `The family has already paid ${paid.toFixed(2)}.` }, { status: 400 })
  }
  if (decision === 'denied' && !order.feeAssistanceRequested) {
    return NextResponse.json({ error: 'This family didn’t ask for fee assistance.' }, { status: 400 })
  }

  const owed = Math.round((amountDue - paid) * 100) / 100
  const status = owed > 0 ? 'office_pending' : paid > 0 ? 'paid' : 'waived'
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 2000) || null : null

  await prisma.$transaction([
    prisma.luxOrder.update({
      where: { id: order.id },
      data: {
        amountDue,
        status,
        // A card checkout only happens from the family's pay link now
        paymentMethod: owed > 0 ? (order.paymentMethod === 'none' ? 'office' : order.paymentMethod) : order.paymentMethod,
        ...(order.feeAssistanceRequested
          ? {
              feeAssistanceStatus: decision === 'denied' ? 'denied' : 'approved',
              feeAssistanceStaffNote: note,
              feeAssistanceResolvedById: ctx.user.id,
              feeAssistanceResolvedAt: new Date(),
            }
          : {}),
      },
    }),
    // Children waiting on a card payment are registered once the parish has decided
    prisma.luxProgramRegistration.updateMany({
      where: { orderId: order.id, status: 'pending_payment', cancelledAt: null },
      data: { status: 'registered' },
    }),
  ])
  // After the update, so a closed checkout's expiry can't release their spots
  await closeOpenCheckouts(order.id)

  await luxAudit({
    organizationId: ctx.organizationId, actorUserId: ctx.user.id,
    action: order.feeAssistanceRequested ? 'order.fee_assistance_decided' : 'order.amount_adjusted',
    targetType: 'lux_order', targetId: order.id,
    metadata: { decision, from: Number(order.amountDue), to: amountDue }, ip: clientIp(request),
  })

  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: { contactEmail: true, publicSlug: true, luxSettings: true },
  })
  if (body.sendEmail !== false && order.feeAssistanceRequested && org?.publicSlug) {
    const settings = parseLuxSettings(org.luxSettings)
    const email = feeAssistanceDecisionEmail({
      organizationName: ctx.organization.name,
      guardianFirstName: order.household.guardian1FirstName,
      decision,
      amountDue: owed,
      payUrl: orderPayUrl(org.publicSlug, order.id, order.payToken),
      officeInstructions: settings.officePaymentInstructions || undefined,
      staffNote: note,
    })
    await sendLuxEmail({
      organizationId: ctx.organizationId,
      organizationName: ctx.organization.name,
      to: order.household.email,
      recipientName: `${order.household.guardian1FirstName} ${order.household.guardian1LastName}`,
      replyTo: org.contactEmail || undefined,
      registrationId: order.id,
      registrationType: 'lux_order',
      emailType: 'lux_fee_assistance_decision',
      ...email,
    })
  }

  return NextResponse.json({ success: true, order: await loadOrderForStaff(ctx.organizationId, order.id) })
}
