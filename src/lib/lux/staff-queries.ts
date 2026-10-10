import { prisma } from '@/lib/prisma'

/**
 * Simple-event registrations that still owe money (paying at the door or
 * the office). Leaves out cancelled ones and anyone still at card checkout.
 */
export async function simpleEventBalancesOwing(organizationId: string) {
  const registrations = await prisma.individualRegistration.findMany({
    where: {
      organizationId,
      event: { mode: 'simple', archivedAt: null },
      registrationStatus: { notIn: ['expired', 'incomplete'] },
    },
    select: {
      id: true, firstName: true, lastName: true, email: true, phone: true, createdAt: true, ticketQuantity: true,
      eventId: true, event: { select: { name: true, startDate: true } },
    },
  })
  if (registrations.length === 0) return []
  const balances = await prisma.paymentBalance.findMany({
    where: { registrationId: { in: registrations.map(r => r.id) }, amountRemaining: { gt: 0 } },
    select: { registrationId: true, totalAmountDue: true, amountPaid: true, amountRemaining: true },
  })
  const byId = new Map(registrations.map(r => [r.id, r]))
  return balances
    .map(b => {
      const r = byId.get(b.registrationId)!
      return {
        registrationId: r.id,
        name: `${r.firstName} ${r.lastName}`,
        email: r.email,
        phone: r.phone,
        people: r.ticketQuantity,
        eventId: r.eventId,
        eventName: r.event.name,
        eventDate: r.event.startDate,
        total: Number(b.totalAmountDue),
        paid: Number(b.amountPaid),
        owed: Number(b.amountRemaining),
        createdAt: r.createdAt,
      }
    })
    .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime() || a.name.localeCompare(b.name))
}
