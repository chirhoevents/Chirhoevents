import { prisma } from '@/lib/prisma'
import { cancelUnpaidOrders } from '@/lib/lux/family-registration'
import { sendOrderConfirmation } from '@/lib/lux/order-emails'

/**
 * Recompute what's been paid on a faith formation order from its succeeded
 * payments (idempotent), move it to paid once covered, and confirm
 * registrations that were waiting on a card payment.
 */
export async function recalculateOrder(orderId: string) {
  const order = await prisma.luxOrder.findUnique({ where: { id: orderId } })
  if (!order) return null
  const payments = await prisma.payment.findMany({
    where: { registrationId: orderId, registrationType: 'lux_order', paymentStatus: 'succeeded' },
    select: { amount: true },
  })
  const refunds = await prisma.refund.findMany({
    where: { registrationId: orderId, registrationType: 'lux_order', status: 'completed' },
    select: { refundAmount: true },
  })
  const paid = Math.round(
    (payments.reduce((s, p) => s + Number(p.amount), 0) - refunds.reduce((s, r) => s + Number(r.refundAmount), 0)) * 100
  ) / 100
  const covered = paid + 0.005 >= Number(order.amountDue)
  const status = covered && order.status !== 'waived' ? 'paid' : order.status === 'cancelled' && paid > 0 ? 'paid' : order.status

  const updated = await prisma.luxOrder.update({
    where: { id: orderId },
    data: { amountPaid: Math.max(0, paid), status },
  })
  if (status === 'paid') {
    await prisma.luxProgramRegistration.updateMany({
      where: { orderId, status: { in: ['pending_payment', 'cancelled'] }, ...(order.status === 'cancelled' ? {} : { cancelledAt: null }) },
      data: { status: 'registered', cancelledAt: null },
    })
  }
  return updated
}

/** checkout.session.completed for a Lux order (first payment or a later pay-link payment) */
export async function handleLuxOrderCheckoutCompleted(session: {
  id: string
  payment_intent: string | null
  amount_total: number | null
  metadata: Record<string, string> | null
}, charge: { receiptUrl: string | null; chargeId: string | null; last4: string | null; brand: string | null }) {
  const orderId = session.metadata?.registrationId
  if (!orderId) return

  const pending = await prisma.payment.findFirst({
    where: { registrationId: orderId, registrationType: 'lux_order', stripePaymentIntentId: session.id },
  })
  if (pending && pending.paymentStatus !== 'succeeded') {
    await prisma.payment.update({
      where: { id: pending.id },
      data: {
        paymentStatus: 'succeeded',
        processedAt: new Date(),
        stripePaymentIntentId: session.payment_intent || session.id,
        amount: session.amount_total ? session.amount_total / 100 : pending.amount,
        receiptUrl: charge.receiptUrl,
        stripeChargeId: charge.chargeId,
        cardLast4: charge.last4,
        cardBrand: charge.brand,
      },
    })
  } else if (!pending) {
    // Already processed (the row now holds the pi_ id), or never recorded
    const done = session.payment_intent
      ? await prisma.payment.findFirst({ where: { stripePaymentIntentId: session.payment_intent } })
      : null
    if (done) return
    console.error('[Lux order] No pending payment row for checkout', session.id, 'order', orderId)
    return
  } else {
    return // duplicate webhook
  }

  await recalculateOrder(orderId)
  await sendOrderConfirmation(orderId, charge.receiptUrl)
}

/** checkout.session.expired for a Lux order */
export async function handleLuxOrderCheckoutExpired(session: { id: string; metadata: Record<string, string> | null }) {
  const orderId = session.metadata?.registrationId
  if (!orderId) return
  await prisma.payment.updateMany({
    where: { registrationId: orderId, registrationType: 'lux_order', stripePaymentIntentId: session.id, paymentStatus: 'pending' },
    data: { paymentStatus: 'expired' },
  })
  // Another checkout for this order is still open (the family started over
  // from the pay page): leave the order alone
  const stillOpen = await prisma.payment.count({
    where: { registrationId: orderId, registrationType: 'lux_order', paymentStatus: 'pending' },
  })
  if (stillOpen > 0) return
  // A first checkout that was never paid gives its spots back; a later
  // pay-link checkout just lapses (the family is still registered)
  await cancelUnpaidOrders([orderId])
}
