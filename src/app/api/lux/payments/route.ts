import { NextRequest, NextResponse } from 'next/server'
import { prisma, prismaIncludingCancelled } from '@/lib/prisma'
import { requireLuxStaff } from '@/lib/lux/access'
import { simpleEventBalancesOwing } from '@/lib/lux/staff-queries'
import { PAYMENT_METHOD_LABELS } from '@/lib/lux/orders-staff'

/**
 * GET /api/lux/payments
 * Fee assistance requests, who still owes (programs and events), recent
 * payments, and what's been collected this year.
 */
export async function GET(request: NextRequest) {
  const { error, ctx } = await requireLuxStaff(request)
  if (error) return error
  const orgId = ctx.organizationId
  const yearStart = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1))

  const simpleEvents = await prisma.event.findMany({ where: { organizationId: orgId, mode: 'simple' }, select: { id: true, name: true } })
  const eventName = new Map(simpleEvents.map(e => [e.id, e.name]))
  // Refunds aren't tied to an event, so find them through the registrations
  const simpleRegIds = (await prismaIncludingCancelled.individualRegistration.findMany({
    where: { eventId: { in: simpleEvents.map(e => e.id) } },
    select: { id: true },
  })).map(r => r.id)
  const luxPayments = {
    organizationId: orgId,
    paymentStatus: 'succeeded' as const,
    OR: [
      { registrationType: 'lux_order' as const },
      { registrationType: 'individual' as const, eventId: { in: simpleEvents.map(e => e.id) } },
    ],
  }

  const [orders, eventBalances, recent, yearPayments, yearRefunds] = await Promise.all([
    prisma.luxOrder.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { feeAssistanceStatus: 'requested', status: { not: 'cancelled' } },
          { status: { in: ['office_pending', 'pending_payment'] } },
        ],
      },
      include: {
        household: { select: { id: true, guardian1FirstName: true, guardian1LastName: true, email: true, phone: true } },
        registrations: { where: { cancelledAt: null }, select: { child: { select: { firstName: true } }, program: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    simpleEventBalancesOwing(orgId),
    prisma.payment.findMany({
      where: luxPayments,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { processedBy: { select: { firstName: true, lastName: true } } },
    }),
    prisma.payment.findMany({
      where: { ...luxPayments, createdAt: { gte: yearStart } },
      select: { amount: true, paymentMethod: true, processedVia: true },
    }),
    prisma.refund.aggregate({
      where: {
        organizationId: orgId,
        status: 'completed',
        createdAt: { gte: yearStart },
        OR: [
          { registrationType: 'lux_order' },
          { registrationType: 'individual', registrationId: { in: simpleRegIds } },
        ],
      },
      _sum: { refundAmount: true },
    }),
  ])

  // Who paid: program orders by family, event payments by registrant
  const orderIds = recent.filter(p => p.registrationType === 'lux_order').map(p => p.registrationId)
  const eventRegIds = recent.filter(p => p.registrationType === 'individual').map(p => p.registrationId)
  const [payerOrders, payerRegs] = await Promise.all([
    prisma.luxOrder.findMany({
      where: { id: { in: orderIds } },
      select: { id: true, confirmationCode: true, household: { select: { guardian1FirstName: true, guardian1LastName: true } } },
    }),
    prisma.individualRegistration.findMany({ where: { id: { in: eventRegIds } }, select: { id: true, firstName: true, lastName: true } }),
  ])
  const orderBy = new Map(payerOrders.map(o => [o.id, o]))
  const regBy = new Map(payerRegs.map(r => [r.id, r]))

  const isOnline = (p: { paymentMethod: string; processedVia: string | null }) => p.paymentMethod === 'card' && p.processedVia !== 'manual'
  const sum = (list: Array<{ amount: unknown }>) => Math.round(list.reduce((s, p) => s + Number(p.amount), 0) * 100) / 100
  const orderRow = (o: (typeof orders)[number]) => ({
    id: o.id,
    confirmationCode: o.confirmationCode,
    householdId: o.household.id,
    family: `${o.household.guardian1FirstName} ${o.household.guardian1LastName}`,
    email: o.household.email,
    phone: o.household.phone,
    children: o.registrations.map(r => `${r.child.firstName} · ${r.program.name}`),
    status: o.status,
    total: Number(o.total),
    amountDue: Number(o.amountDue),
    owed: Math.max(0, Math.round((Number(o.amountDue) - Number(o.amountPaid)) * 100) / 100),
    note: o.feeAssistanceNote,
    createdAt: o.createdAt,
  })

  return NextResponse.json({
    assistance: orders.filter(o => o.feeAssistanceStatus === 'requested').map(orderRow),
    ordersOwing: orders
      .filter(o => o.feeAssistanceStatus !== 'requested' && ['office_pending', 'pending_payment'].includes(o.status))
      .map(orderRow)
      .filter(o => o.owed > 0),
    eventBalances,
    recent: recent.map(p => {
      const order = p.registrationType === 'lux_order' ? orderBy.get(p.registrationId) : null
      const reg = p.registrationType === 'individual' ? regBy.get(p.registrationId) : null
      return {
        id: p.id,
        amount: Number(p.amount),
        method: PAYMENT_METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod,
        online: isOnline(p),
        at: p.processedAt ?? p.createdAt,
        who: order ? `${order.household.guardian1FirstName} ${order.household.guardian1LastName}` : reg ? `${reg.firstName} ${reg.lastName}` : '—',
        what: order ? `Faith formation #${order.confirmationCode}` : (p.eventId && eventName.get(p.eventId)) || 'Event',
        orderId: order ? order.id : null,
        eventId: p.registrationType === 'individual' ? p.eventId : null,
        recordedBy: p.processedBy ? `${p.processedBy.firstName} ${p.processedBy.lastName}`.trim() : null,
        receiptUrl: p.receiptUrl,
      }
    }),
    totals: {
      year: yearStart.getUTCFullYear(),
      online: sum(yearPayments.filter(isOnline)),
      office: sum(yearPayments.filter(p => !isOnline(p))),
      refunded: Number(yearRefunds._sum.refundAmount ?? 0),
      outstanding: Math.round((
        orders.filter(o => ['office_pending', 'pending_payment'].includes(o.status))
          .reduce((s, o) => s + Math.max(0, Number(o.amountDue) - Number(o.amountPaid)), 0) +
        eventBalances.reduce((s, b) => s + b.owed, 0)
      ) * 100) / 100,
    },
  })
}
