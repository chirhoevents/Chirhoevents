import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { findOrderByPayToken } from '@/lib/lux/order-access'
import { appUrl } from '@/lib/lux/email'
import { createConnectCheckoutSession, expireCheckoutSession, STRIPE_MINIMUM_CHARGE_CENTS } from '@/lib/lux/stripe-checkout'

type Params = { params: Promise<{ id: string }> }

/**
 * POST /api/lux/public/orders/[id]/pay  { t }
 * Card checkout for what's still owed on a faith formation order, from the
 * pay link in the family's email (or after backing out of an earlier checkout).
 */
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params
  const { t } = await request.json().catch(() => ({}))
  const order = await findOrderByPayToken(id, t)
  if (!order || !order.organization.publicSlug) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (order.status === 'cancelled') {
    return NextResponse.json({ error: 'This registration expired before it was paid. Please register again.' }, { status: 400 })
  }
  const owed = Math.round((Number(order.amountDue) - Number(order.amountPaid)) * 100) / 100
  if (owed <= 0 || order.status === 'paid' || order.status === 'waived') {
    return NextResponse.json({ error: 'Nothing is owed on this registration.' }, { status: 400 })
  }
  if (Math.round(owed * 100) < STRIPE_MINIMUM_CHARGE_CENTS) {
    return NextResponse.json({ error: 'Card payments must be at least $0.50. Please pay at the office.' }, { status: 400 })
  }
  const live = order.registrations.filter(r => r.status !== 'cancelled')
  if (!order.organization.stripeAccountId || !order.organization.stripeChargesEnabled || live.some(r => !r.program.onlinePaymentEnabled)) {
    return NextResponse.json({ error: 'Online payment isn’t available for this registration. Please pay at the parish office.' }, { status: 400 })
  }

  const slug = order.organization.publicSlug
  const { session, platformFeeCents } = await createConnectCheckoutSession({
    organization: order.organization,
    lineItems: [{
      name: `Faith formation registration ${order.confirmationCode}`,
      description: live.map(r => `${r.child.firstName}: ${r.program.name}`).join(', ').slice(0, 300),
      amountCents: Math.round(owed * 100),
      quantity: 1,
    }],
    metadata: { registrationId: order.id, registrationType: 'lux_order', organizationId: order.organizationId },
    successUrl: appUrl(`/lux/${slug}/registered/${order.id}?t=${order.payToken}&session_id={CHECKOUT_SESSION_ID}`),
    cancelUrl: appUrl(`/lux/${slug}/pay/${order.id}?t=${order.payToken}&cancelled=1`),
    customerEmail: order.household.email,
  })

  const earlier = await prisma.payment.findMany({
    where: { registrationId: order.id, registrationType: 'lux_order', paymentStatus: 'pending' },
    select: { id: true, stripePaymentIntentId: true },
  })
  await prisma.payment.create({
    data: {
      organizationId: order.organizationId,
      eventId: null,
      registrationId: order.id,
      registrationType: 'lux_order',
      amount: owed,
      paymentType: 'balance',
      paymentMethod: 'card',
      paymentStatus: 'pending',
      stripePaymentIntentId: session.id,
      platformFeeAmount: platformFeeCents / 100,
      processedVia: 'online',
    },
  })
  // Close checkouts started earlier for this order so only one can be paid
  for (const p of earlier) {
    if (p.stripePaymentIntentId?.startsWith('cs_')) await expireCheckoutSession(p.stripePaymentIntentId)
    await prisma.payment.update({ where: { id: p.id }, data: { paymentStatus: 'expired' } })
  }

  return NextResponse.json({ checkoutUrl: session.url })
}
