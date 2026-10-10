import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLuxStaff } from '@/lib/lux/access'
import { ORDER_STATUS_LABELS } from '@/lib/lux/orders-staff'

const LIMIT = 500

/**
 * GET /api/lux/registrations?type=all|programs|events&q=
 * Everyone who signed up for anything, newest first: children in programs
 * and people registered for events.
 */
export async function GET(request: NextRequest) {
  const { error, ctx } = await requireLuxStaff(request)
  if (error) return error
  const params = request.nextUrl.searchParams
  const type = params.get('type') || 'all'
  const q = (params.get('q') || '').trim().slice(0, 100)
  const like = (field: string) => ({ [field]: { contains: q, mode: 'insensitive' as const } })

  const [programRegs, eventRegs] = await Promise.all([
    type === 'events' ? [] : prisma.luxProgramRegistration.findMany({
      where: {
        organizationId: ctx.organizationId,
        cancelledAt: null,
        program: { status: { not: 'archived' } },
        ...(q ? { OR: [
          { child: like('firstName') }, { child: like('lastName') },
          { household: like('guardian1FirstName') }, { household: like('guardian1LastName') }, { household: like('email') },
          { program: like('name') },
        ] } : {}),
      },
      include: {
        child: { select: { firstName: true, lastName: true } },
        household: { select: { id: true, guardian1FirstName: true, guardian1LastName: true, email: true } },
        program: { select: { name: true } },
        order: { select: { status: true, confirmationCode: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: LIMIT,
    }),
    type === 'programs' ? [] : prisma.individualRegistration.findMany({
      where: {
        organizationId: ctx.organizationId,
        event: { mode: 'simple', archivedAt: null },
        registrationStatus: { not: 'expired' },
        ...(q ? { OR: [like('firstName'), like('lastName'), like('email'), { event: like('name') }] } : {}),
      },
      select: {
        id: true, firstName: true, lastName: true, email: true, createdAt: true, ticketQuantity: true, registrationStatus: true,
        confirmationCode: true, eventId: true, event: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: LIMIT,
    }),
  ])

  const balances = eventRegs.length
    ? await prisma.paymentBalance.findMany({
        where: { registrationId: { in: eventRegs.map(r => r.id) } },
        select: { registrationId: true, totalAmountDue: true, amountRemaining: true },
      })
    : []
  const balanceBy = new Map(balances.map(b => [b.registrationId, b]))

  const rows = [
    ...programRegs.map(r => ({
      kind: 'program' as const,
      id: r.id,
      name: `${r.child.firstName} ${r.child.lastName}`,
      contact: `${r.household.guardian1FirstName} ${r.household.guardian1LastName}`,
      email: r.household.email,
      what: r.program.name,
      people: 1,
      amount: Number(r.feeAmount),
      payment: r.order ? ORDER_STATUS_LABELS[r.order.status] ?? r.order.status : '—',
      paymentTone: !r.order || ['paid', 'waived'].includes(r.order.status) ? 'green' : r.order.status === 'assistance_requested' ? 'blue' : 'amber',
      confirmationCode: r.order?.confirmationCode ?? null,
      href: `/dashboard/lux/households/${r.household.id}`,
      orderId: r.orderId,
      createdAt: r.createdAt,
    })),
    ...eventRegs.map(r => {
      const b = balanceBy.get(r.id)
      const total = Number(b?.totalAmountDue ?? 0)
      const owed = Number(b?.amountRemaining ?? 0)
      return {
        kind: 'event' as const,
        id: r.id,
        name: `${r.firstName} ${r.lastName}`,
        contact: null,
        email: r.email,
        what: r.event.name,
        people: r.ticketQuantity,
        amount: total,
        payment: r.registrationStatus === 'incomplete' ? 'Paying online' : total === 0 ? 'Free' : owed > 0 ? 'Owes' : 'Paid',
        paymentTone: r.registrationStatus === 'incomplete' || owed > 0 ? 'amber' : 'green',
        confirmationCode: r.confirmationCode,
        href: `/dashboard/lux/events/${r.eventId}`,
        orderId: null,
        createdAt: r.createdAt,
      }
    }),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, LIMIT)

  return NextResponse.json({ registrations: rows, truncated: programRegs.length === LIMIT || eventRegs.length === LIMIT })
}
