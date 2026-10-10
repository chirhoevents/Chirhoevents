import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLuxStaff } from '@/lib/lux/access'
import { createSimpleEvent, validateSimpleEventInput } from '@/lib/lux/simple-event-server'
import { getSimpleEventStatus } from '@/lib/lux/simple-event'

/** GET /api/lux/events: the org's simple events with sign-up and payment totals */
export async function GET(request: NextRequest) {
  const { error, ctx } = await requireLuxStaff(request)
  if (error) return error

  const events = await prisma.event.findMany({
    where: { organizationId: ctx.organizationId, mode: 'simple', archivedAt: null },
    orderBy: { startDate: 'desc' },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      isPublished: true,
      startDate: true,
      endDate: true,
      startTime: true,
      endTime: true,
      timezone: true,
      locationName: true,
      capacityTotal: true,
      capacityRemaining: true,
      registrationOpenDate: true,
      registrationCloseDate: true,
    },
  })
  const eventIds = events.map(e => e.id)

  const [registrations, balances] = await Promise.all([
    prisma.individualRegistration.groupBy({
      by: ['eventId'],
      where: { eventId: { in: eventIds }, registrationStatus: { not: 'expired' } },
      _count: { _all: true },
      _sum: { ticketQuantity: true },
    }),
    prisma.paymentBalance.groupBy({
      by: ['eventId'],
      where: { eventId: { in: eventIds }, registrationType: 'individual' },
      _sum: { amountPaid: true, amountRemaining: true },
    }),
  ])
  const regByEvent = new Map(registrations.map(r => [r.eventId, r]))
  const balByEvent = new Map(balances.map(b => [b.eventId, b]))

  return NextResponse.json({
    events: events.map(e => ({
      ...e,
      liveStatus: getSimpleEventStatus(e),
      registrations: regByEvent.get(e.id)?._count._all ?? 0,
      ticketsSold: regByEvent.get(e.id)?._sum.ticketQuantity ?? 0,
      amountPaid: Number(balByEvent.get(e.id)?._sum.amountPaid ?? 0),
      amountOutstanding: Number(balByEvent.get(e.id)?._sum.amountRemaining ?? 0),
    })),
  })
}

/** POST /api/lux/events: create a simple event (saved as a draft) */
export async function POST(request: NextRequest) {
  const { error, ctx } = await requireLuxStaff(request, { manage: true })
  if (error) return error

  const body = await request.json().catch(() => null)
  const parsed = validateSimpleEventInput(body)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const event = await createSimpleEvent({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    input: parsed.value,
    hasRapha: ctx.modules.rapha,
  })
  return NextResponse.json({ event: { id: event.id, slug: event.slug } }, { status: 201 })
}
