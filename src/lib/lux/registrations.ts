import { prisma, prismaIncludingCancelled } from '@/lib/prisma'
import { deriveBalance } from '@/lib/payment-balance-status'

type TicketLine = { optionId?: string; name?: string; unitPrice?: number; quantity?: number; amount?: number }

export function ticketLines(raw: unknown): TicketLine[] {
  return Array.isArray(raw) ? (raw as TicketLine[]) : []
}

/**
 * Give back the spots a simple-event registration was holding: the event's
 * capacity by its ticket count, and each ticket type's own limit.
 */
export async function releaseSimpleEventCapacity(registration: {
  eventId: string
  ticketQuantity: number
  ticketSelections: unknown
}): Promise<void> {
  const count = registration.ticketQuantity || 1
  await prisma.$executeRaw`
    UPDATE events
    SET capacity_remaining = LEAST(capacity_total, capacity_remaining + ${count})
    WHERE id = ${registration.eventId}::uuid AND capacity_remaining IS NOT NULL
  `
  await releaseTicketOptionCapacity(registration.ticketSelections)
}

export async function releaseTicketOptionCapacity(ticketSelections: unknown): Promise<void> {
  for (const line of ticketLines(ticketSelections)) {
    const qty = Number(line.quantity) || 0
    if (!line.optionId || qty <= 0) continue
    await prisma.$executeRaw`
      UPDATE event_ticket_options
      SET remaining = LEAST(capacity, remaining + ${qty})
      WHERE id = ${line.optionId}::uuid AND remaining IS NOT NULL
    `
  }
}

/** A simple-event registration in this org, including cancelled ones */
export async function findOrgSimpleRegistration(organizationId: string, registrationId: string) {
  return prismaIncludingCancelled.individualRegistration.findFirst({
    where: { id: registrationId, organizationId, event: { mode: 'simple' } },
    include: {
      event: {
        select: {
          id: true, name: true, slug: true, startDate: true, endDate: true, startTime: true, endTime: true,
          locationName: true, locationAddress: true, luxConfig: true, organizationId: true,
          settings: { select: { contactEmail: true } },
          organization: { select: { name: true, contactEmail: true } },
        },
      },
    },
  })
}

/**
 * Recompute a registration's balance from all its succeeded payments
 * (idempotent, like the Stripe webhook) and mark it complete once paid.
 */
export async function recalculateIndividualBalance(registrationId: string) {
  const balance = await prisma.paymentBalance.findUnique({ where: { registrationId } })
  if (!balance) return null
  const payments = await prisma.payment.findMany({
    where: { registrationId, registrationType: 'individual', paymentStatus: 'succeeded' },
    select: { amount: true },
  })
  const refunds = await prisma.refund.findMany({
    where: { registrationId, status: 'completed' },
    select: { refundAmount: true },
  })
  // Refunds lower amountPaid the same way the admin refund flow does
  const paid = Math.round(
    (payments.reduce((sum, p) => sum + Number(p.amount), 0) - refunds.reduce((sum, r) => sum + Number(r.refundAmount), 0)) * 100
  ) / 100
  const { amountRemaining: remaining, paymentStatus } = deriveBalance(Number(balance.totalAmountDue), paid, balance.paymentStatus)
  const updated = await prisma.paymentBalance.update({
    where: { registrationId },
    data: { amountPaid: Math.max(0, paid), amountRemaining: remaining, lastPaymentDate: new Date(), paymentStatus },
  })
  if (remaining <= 0) {
    await prismaIncludingCancelled.individualRegistration.updateMany({
      where: { id: registrationId, registrationStatus: { in: ['pending_payment', 'incomplete'] } },
      data: { registrationStatus: 'complete' },
    })
  }
  return updated
}
