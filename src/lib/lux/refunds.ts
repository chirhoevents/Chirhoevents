import Stripe from 'stripe'
import type { RefundReason } from '@prisma/client'
import { prisma, prismaIncludingCancelled } from '@/lib/prisma'
import { recalculateIndividualBalance } from '@/lib/lux/registrations'
import { OrderActionError } from '@/lib/lux/order-staff-actions'

/** What a refund needs from Stripe; swapped out in tests */
export interface RefundStripe {
  /** Cents that can still be refunded on this payment */
  refundable(paymentIntentId: string): Promise<number>
  /** Returns the Stripe refund id */
  refund(params: { paymentIntentId: string; amountCents: number; idempotencyKey: string; metadata: Record<string, string> }): Promise<string>
}

let defaultStripe: RefundStripe | null = null
function stripeRefunds(): RefundStripe {
  if (defaultStripe) return defaultStripe
  if (!process.env.STRIPE_SECRET_KEY) throw new OrderActionError('Card refunds aren’t set up. Refund by cash or check instead.')
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
  defaultStripe = {
    async refundable(paymentIntentId) {
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge'] })
      const charge = pi.latest_charge as Stripe.Charge | null
      if (!charge || typeof charge === 'string') return 0
      return Math.max(0, charge.amount - charge.amount_refunded)
    },
    async refund({ paymentIntentId, amountCents, idempotencyKey, metadata }) {
      // Destination charges: take the money back from the parish's Stripe
      // account and return the matching share of the platform fee
      const refund = await stripe.refunds.create(
        {
          payment_intent: paymentIntentId,
          amount: amountCents,
          reason: 'requested_by_customer',
          reverse_transfer: true,
          refund_application_fee: true,
          metadata,
        },
        { idempotencyKey }
      )
      return refund.id
    },
  }
  return defaultStripe
}

export type RefundKind = 'order' | 'event'
export type RefundHow = 'card' | 'cash' | 'check' | 'other'

const REASONS: Record<string, RefundReason> = {
  withdrew: 'participant_removed',
  cancelled: 'event_cancellation',
  overpaid: 'overpayment_correction',
  other: 'other',
}

const round = (n: number) => Math.round(n * 100) / 100

interface Target {
  registrationType: 'lux_order' | 'individual'
  id: string
  label: string
  recipient: { email: string | null; firstName: string; lastName: string; lang: 'en' | 'es' }
  description: { en: string; es: string }
  eventId: string | null
}

async function loadTarget(organizationId: string, kind: RefundKind, id: string): Promise<Target> {
  if (kind === 'order') {
    const order = await prisma.luxOrder.findFirst({ where: { id, organizationId }, include: { household: true } })
    if (!order) throw new OrderActionError('Registration not found', 404)
    return {
      registrationType: 'lux_order',
      id: order.id,
      label: `registration #${order.confirmationCode}`,
      recipient: {
        email: order.household.email,
        firstName: order.household.guardian1FirstName,
        lastName: order.household.guardian1LastName,
        lang: order.household.preferredLanguage === 'es' ? 'es' : 'en',
      },
      description: { en: `registration #${order.confirmationCode}`, es: `la inscripción n.º ${order.confirmationCode}` },
      eventId: null,
    }
  }
  const registration = await prismaIncludingCancelled.individualRegistration.findFirst({
    where: { id, organizationId, event: { mode: 'simple' } },
    include: { event: { select: { id: true, name: true } } },
  })
  if (!registration) throw new OrderActionError('Registration not found', 404)
  return {
    registrationType: 'individual',
    id: registration.id,
    label: registration.event.name,
    recipient: {
      email: registration.email,
      firstName: registration.firstName,
      lastName: registration.lastName,
      lang: (registration.luxDetails as { lang?: string } | null)?.lang === 'es' ? 'es' : 'en',
    },
    description: { en: registration.event.name, es: registration.event.name },
    eventId: registration.event.id,
  }
}

/** Money in minus money already given back, and the card payments that can take a refund */
async function moneyOn(target: Target) {
  const [payments, refunds] = await Promise.all([
    prisma.payment.findMany({
      where: { registrationId: target.id, registrationType: target.registrationType, paymentStatus: 'succeeded' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, amount: true, stripePaymentIntentId: true },
    }),
    prisma.refund.findMany({
      where: { registrationId: target.id, registrationType: target.registrationType, status: 'completed' },
      select: { refundAmount: true },
    }),
  ])
  const paidIn = payments.reduce((s, p) => s + Number(p.amount), 0)
  const refunded = refunds.reduce((s, r) => s + Number(r.refundAmount), 0)
  return {
    net: round(paidIn - refunded),
    refundCount: refunds.length,
    cardPayments: payments.filter(p => p.stripePaymentIntentId?.startsWith('pi_')),
  }
}

/** How much can be refunded, and how much of that can go back to a card */
export async function refundableAmounts(organizationId: string, kind: RefundKind, id: string, stripeClient?: RefundStripe) {
  const target = await loadTarget(organizationId, kind, id)
  const money = await moneyOn(target)
  let toCard = 0
  if (money.cardPayments.length > 0) {
    try {
      const client = stripeClient ?? stripeRefunds()
      for (const p of money.cardPayments) toCard += (await client.refundable(p.stripePaymentIntentId!)) / 100
    } catch (error) {
      console.error('[Lux refunds] Could not read refundable card amounts', error)
    }
  }
  return { paid: Math.max(0, money.net), toCard: round(Math.min(Math.max(0, money.net), toCard)) }
}

/**
 * Refund money on a faith formation registration (order) or a simple event
 * registration: back to the card through Stripe (split across card payments
 * if there were several), or given back by cash or check at the office.
 *
 * A refund returns money the family no longer owes, so it never creates a
 * new balance: what's still owed stays the same, and the amount due comes
 * down with the refund.
 */
export async function refundLuxPayment(params: {
  organizationId: string
  kind: RefundKind
  id: string
  userId: string
  amount: unknown
  method: unknown
  reason?: unknown
  checkNumber?: unknown
  note?: unknown
  stripeClient?: RefundStripe
}) {
  if (params.kind !== 'order' && params.kind !== 'event') throw new OrderActionError('Unknown registration type.')
  const target = await loadTarget(params.organizationId, params.kind, params.id)
  const amount = round(Number(params.amount))
  const method = params.method as RefundHow
  if (!['card', 'cash', 'check', 'other'].includes(method)) throw new OrderActionError('Choose how the money goes back.')
  if (!Number.isFinite(amount) || amount <= 0) throw new OrderActionError('Enter the amount to refund.')

  const before = await moneyOn(target)
  if (amount > before.net + 0.005) {
    throw new OrderActionError(before.net > 0 ? `That's more than the ${before.net.toFixed(2)} paid.` : 'Nothing has been paid on this registration.')
  }
  const reason = REASONS[String(params.reason)] ?? 'other'
  const userNote = typeof params.note === 'string' ? params.note.trim().slice(0, 1000) : ''
  const checkNumber = method === 'check' ? String(params.checkNumber || '').trim().slice(0, 50) : ''
  const how = method === 'check' ? `Check${checkNumber ? ` #${checkNumber}` : ''}` : method === 'cash' ? 'Cash' : method === 'other' ? 'Other' : 'Card'
  const notes = [how, userNote].filter(Boolean).join(' · ')

  let refunded = 0
  if (method === 'card') {
    if (before.cardPayments.length === 0) throw new OrderActionError('This family didn’t pay by card online. Refund by cash or check instead.')
    const client = params.stripeClient ?? stripeRefunds()
    let left = Math.round(amount * 100)
    const plan: Array<{ paymentIntentId: string; cents: number }> = []
    for (const p of before.cardPayments) {
      if (left <= 0) break
      const available = await client.refundable(p.stripePaymentIntentId!)
      const cents = Math.min(left, available)
      if (cents > 0) { plan.push({ paymentIntentId: p.stripePaymentIntentId!, cents }); left -= cents }
    }
    if (left > 0) {
      const most = (Math.round(amount * 100) - left) / 100
      throw new OrderActionError(most > 0
        ? `Only ${most.toFixed(2)} can go back to the card. Refund the rest by cash or check.`
        : 'Nothing is left to refund on the card. Refund by cash or check instead.')
    }
    for (const [i, step] of plan.entries()) {
      let stripeRefundId: string
      try {
        stripeRefundId = await client.refund({
          paymentIntentId: step.paymentIntentId,
          amountCents: step.cents,
          // Same key for a double-clicked refund, so Stripe only refunds once
          idempotencyKey: `lux-refund:${step.paymentIntentId}:${step.cents}:${before.refundCount + i}`,
          metadata: { registrationId: target.id, registrationType: target.registrationType, organizationId: params.organizationId },
        })
      } catch (error) {
        console.error('[Lux refunds] Stripe refund failed', error)
        if (refunded > 0) {
          await settle(target)
          throw new OrderActionError(`Stripe refunded ${refunded.toFixed(2)} but stopped there: ${(error as Error).message}`, 502)
        }
        throw new OrderActionError(`Stripe couldn’t refund this card: ${(error as Error).message}`, 502)
      }
      const duplicate = await prisma.refund.findFirst({ where: { stripeRefundId } })
      if (!duplicate) {
        await prisma.refund.create({
          data: {
            registrationId: target.id,
            registrationType: target.registrationType,
            organizationId: params.organizationId,
            refundAmount: step.cents / 100,
            refundMethod: 'stripe',
            refundReason: reason,
            notes: notes || null,
            processedByUserId: params.userId,
            stripeRefundId,
            status: 'completed',
          },
        })
      }
      refunded = round(refunded + step.cents / 100)
    }
  } else {
    await prisma.refund.create({
      data: {
        registrationId: target.id,
        registrationType: target.registrationType,
        organizationId: params.organizationId,
        refundAmount: amount,
        refundMethod: 'manual',
        refundReason: reason,
        notes: notes || null,
        processedByUserId: params.userId,
        // Staff record it once the money is back in the family's hands
        status: 'completed',
      },
    })
    refunded = amount
  }

  const after = await settle(target)
  return { target, amount: refunded, toCard: method === 'card', paidAfter: after.paid }
}

/** Bring the order or balance in line with what's been paid and refunded */
async function settle(target: Target): Promise<{ paid: number }> {
  const money = await moneyOn(target)
  const paid = Math.max(0, money.net)

  if (target.registrationType === 'lux_order') {
    const order = await prisma.luxOrder.findUniqueOrThrow({ where: { id: target.id } })
    const owedBefore = Math.max(0, round(Number(order.amountDue) - Number(order.amountPaid)))
    const amountDue = Math.max(0, round(paid + owedBefore))
    const active = await prisma.luxProgramRegistration.count({ where: { orderId: order.id, cancelledAt: null } })
    const status = owedBefore > 0 ? order.status : paid > 0 ? 'paid' : active > 0 ? 'waived' : 'cancelled'
    await prisma.luxOrder.update({ where: { id: order.id }, data: { amountPaid: paid, amountDue, status } })
    return { paid }
  }

  const balance = await prisma.paymentBalance.findUnique({ where: { registrationId: target.id } })
  if (balance) {
    const owedBefore = Math.max(0, round(Number(balance.totalAmountDue) - Number(balance.amountPaid)))
    await prisma.paymentBalance.update({
      where: { id: balance.id },
      data: { totalAmountDue: Math.max(0, round(paid + owedBefore)), ...(paid <= 0 ? { paymentStatus: 'refunded' } : {}) },
    })
    await recalculateIndividualBalance(target.id)
  }
  return { paid }
}
