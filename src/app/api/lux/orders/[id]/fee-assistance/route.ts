import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLuxStaff, luxAudit, clientIp } from '@/lib/lux/access'
import { loadOrderForStaff } from '@/lib/lux/orders-staff'
import { decideOrderFees, OrderActionError } from '@/lib/lux/order-staff-actions'
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
 * The family is emailed privately about a fee assistance decision.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const { error, ctx } = await requireLuxStaff(request, { manage: true })
  if (error) return error
  const { id } = await params
  const body = await request.json().catch(() => ({}))

  let result: Awaited<ReturnType<typeof decideOrderFees>>
  try {
    result = await decideOrderFees({
      organizationId: ctx.organizationId,
      orderId: id,
      userId: ctx.user.id,
      decision: body.decision,
      amountDue: body.amountDue,
      note: body.note,
    })
  } catch (e) {
    if (e instanceof OrderActionError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
  const { order, decision, previousAmountDue, amountDue, owed, note } = result

  await luxAudit({
    organizationId: ctx.organizationId, actorUserId: ctx.user.id,
    action: order.feeAssistanceRequested ? 'order.fee_assistance_decided' : 'order.amount_adjusted',
    targetType: 'lux_order', targetId: order.id,
    metadata: { decision, from: previousAmountDue, to: amountDue }, ip: clientIp(request),
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
      lang: order.household.preferredLanguage === 'es' ? 'es' : 'en',
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
