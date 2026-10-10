import { prisma } from '@/lib/prisma'
import { closeOpenCheckouts, recalculateOrder } from '@/lib/lux/order-payments'

/** A problem staff can fix (shown as-is), with the HTTP status to answer with */
export class OrderActionError extends Error {
  constructor(message: string, public status = 400) {
    super(message)
  }
}

const METHODS = { cash: 'cash', check: 'check', card: 'card', other: 'other' } as const
export type OfficeMethod = keyof typeof METHODS

async function loadOrder(organizationId: string, orderId: string) {
  const order = await prisma.luxOrder.findFirst({
    where: { id: orderId, organizationId },
    include: { household: true },
  })
  if (!order) throw new OrderActionError('Registration not found', 404)
  if (order.status === 'cancelled') throw new OrderActionError('This registration was cancelled.')
  return order
}

/**
 * Record cash, a check or a card swiped at the office against a faith
 * formation order. A family who started paying online but came in instead
 * keeps their spots, and any card checkout left open is closed so they
 * can't pay twice.
 */
export async function recordOrderOfficePayment(params: {
  organizationId: string
  orderId: string
  userId: string
  amount: unknown
  method: unknown
  checkNumber?: unknown
  note?: unknown
}) {
  const order = await loadOrder(params.organizationId, params.orderId)
  const amount = Math.round(Number(params.amount) * 100) / 100
  const method = METHODS[params.method as OfficeMethod]
  if (!Number.isFinite(amount) || amount <= 0) throw new OrderActionError('Enter the amount received.')
  if (!method) throw new OrderActionError('Choose how it was paid.')
  const owed = Math.round((Number(order.amountDue) - Number(order.amountPaid)) * 100) / 100
  if (amount > owed + 0.005) {
    throw new OrderActionError(owed > 0 ? `That's more than the ${owed.toFixed(2)} still owed.` : 'Nothing is owed on this registration.')
  }

  // Hold their spots before closing the checkout, whose expiry would release them
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
      organizationId: params.organizationId,
      eventId: null,
      registrationId: order.id,
      registrationType: 'lux_order',
      amount,
      paymentType: 'balance',
      paymentMethod: method,
      paymentStatus: 'succeeded',
      checkNumber: method === 'check' ? (String(params.checkNumber || '').slice(0, 50) || null) : null,
      checkReceivedDate: method === 'check' ? new Date() : null,
      notes: typeof params.note === 'string' ? params.note.slice(0, 1000) : null,
      processedAt: new Date(),
      processedByUserId: params.userId,
      processedVia: 'manual',
    },
  })
  const updated = await recalculateOrder(order.id)
  const remaining = updated ? Math.max(0, Math.round((Number(updated.amountDue) - Number(updated.amountPaid)) * 100) / 100) : 0
  return { order, amount, method, remaining }
}

export type FeeDecision = 'approved' | 'waived' | 'denied'

/**
 * Decide a fee assistance request, or adjust what any order owes:
 *   approved  the family owes `amountDue` (between what they've paid and the total)
 *   waived    nothing more is owed
 *   denied    the full total stays due (only for a fee assistance request)
 */
export async function decideOrderFees(params: {
  organizationId: string
  orderId: string
  userId: string
  decision: unknown
  amountDue?: unknown
  note?: unknown
}) {
  const order = await loadOrder(params.organizationId, params.orderId)
  const decision = params.decision as FeeDecision
  if (!['approved', 'waived', 'denied'].includes(decision)) throw new OrderActionError('Choose approve, waive or deny.')
  if (decision === 'denied' && !order.feeAssistanceRequested) throw new OrderActionError('This family didn’t ask for fee assistance.')

  const total = Number(order.total)
  const paid = Number(order.amountPaid)
  let amountDue = total
  if (decision === 'waived') amountDue = paid
  if (decision === 'approved') {
    amountDue = Math.round(Number(params.amountDue) * 100) / 100
    if (params.amountDue === '' || params.amountDue === null || !Number.isFinite(amountDue) || amountDue < 0) {
      throw new OrderActionError('Enter the new amount due.')
    }
    if (amountDue > total) throw new OrderActionError(`The amount due can't be more than the ${total.toFixed(2)} total.`)
    if (amountDue < paid) throw new OrderActionError(`The family has already paid ${paid.toFixed(2)}.`)
  }

  const owed = Math.round((amountDue - paid) * 100) / 100
  const status = owed > 0 ? 'office_pending' : paid > 0 ? 'paid' : 'waived'
  const note = typeof params.note === 'string' ? params.note.trim().slice(0, 2000) || null : null

  await prisma.$transaction([
    prisma.luxOrder.update({
      where: { id: order.id },
      data: {
        amountDue,
        status,
        // Anything still owed is paid at the office or from the family's pay link
        paymentMethod: owed > 0 && order.paymentMethod === 'none' ? 'office' : order.paymentMethod,
        ...(order.feeAssistanceRequested
          ? {
              feeAssistanceStatus: decision === 'denied' ? 'denied' : 'approved',
              feeAssistanceStaffNote: note,
              feeAssistanceResolvedById: params.userId,
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

  return { order, decision, previousAmountDue: Number(order.amountDue), amountDue, owed, note }
}
