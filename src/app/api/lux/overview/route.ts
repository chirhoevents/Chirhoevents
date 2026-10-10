import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLuxStaff } from '@/lib/lux/access'
import { getSimpleEventStatus } from '@/lib/lux/simple-event'
import { parseLuxSettings } from '@/lib/lux/settings'
import { FAMILY_OUTSTANDING, STAFF_OUTSTANDING } from '@/lib/lux/program-status'
import { privateBucketConfigured } from '@/lib/r2/private-files'
import { simpleEventBalancesOwing } from '@/lib/lux/staff-queries'

const liveDocs = { programRegistration: { cancelledAt: null, program: { status: { not: 'archived' } } } }

/** GET /api/lux/overview — what the Lux home page shows: what needs attention, what's coming up, setup steps */
export async function GET(request: NextRequest) {
  const { error, ctx } = await requireLuxStaff(request)
  if (error) return error
  const orgId = ctx.organizationId

  const [org, programs, events, toReview, missing, owingOrders, assistance, recentOrders, recentEventRegs] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { stripeAccountId: true, stripeChargesEnabled: true, publicSlug: true, luxSettings: true, logoUrl: true, contactEmail: true },
    }),
    prisma.luxProgram.findMany({
      where: { organizationId: orgId, status: { in: ['draft', 'open', 'closed'] } },
      select: {
        id: true, name: true, term: true, status: true, capacity: true,
        _count: { select: { registrations: { where: { cancelledAt: null } } } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.event.findMany({
      where: { organizationId: orgId, mode: 'simple', archivedAt: null, endDate: { gte: new Date(Date.now() - 86400000) } },
      select: {
        id: true, name: true, startDate: true, endDate: true, startTime: true, endTime: true, timezone: true, status: true,
        isPublished: true, capacityTotal: true, capacityRemaining: true, registrationOpenDate: true, registrationCloseDate: true,
      },
      orderBy: { startDate: 'asc' },
      take: 20,
    }),
    prisma.luxDocumentSubmission.count({ where: { organizationId: orgId, status: { in: STAFF_OUTSTANDING }, ...liveDocs } }),
    prisma.luxDocumentSubmission.count({ where: { organizationId: orgId, status: { in: FAMILY_OUTSTANDING }, requirement: { required: true }, ...liveDocs } }),
    prisma.luxOrder.findMany({
      where: { organizationId: orgId, status: { in: ['office_pending', 'pending_payment'] } },
      select: { amountDue: true, amountPaid: true },
    }),
    prisma.luxOrder.count({ where: { organizationId: orgId, feeAssistanceStatus: 'requested', status: { not: 'cancelled' } } }),
    prisma.luxOrder.findMany({
      where: { organizationId: orgId, status: { not: 'cancelled' } },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true, createdAt: true, status: true, householdId: true,
        household: { select: { guardian1FirstName: true, guardian1LastName: true } },
        registrations: { where: { cancelledAt: null }, select: { child: { select: { firstName: true } }, program: { select: { name: true } } } },
      },
    }),
    prisma.individualRegistration.findMany({
      where: { organizationId: orgId, event: { mode: 'simple' }, registrationStatus: { not: 'expired' } },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { id: true, createdAt: true, firstName: true, lastName: true, ticketQuantity: true, eventId: true, event: { select: { name: true } } },
    }),
  ])

  const eventIds = events.map(e => e.id)
  const [eventCounts, eventBalances] = await Promise.all([
    prisma.individualRegistration.groupBy({
      by: ['eventId'],
      where: { eventId: { in: eventIds }, registrationStatus: { not: 'expired' } },
      _sum: { ticketQuantity: true },
    }),
    simpleEventBalancesOwing(orgId),
  ])
  const peopleByEvent = new Map(eventCounts.map(c => [c.eventId, c._sum.ticketQuantity ?? 0]))
  const settings = parseLuxSettings(org?.luxSettings)
  const orderOwed = owingOrders.reduce((s, o) => s + Math.max(0, Number(o.amountDue) - Number(o.amountPaid)), 0)

  const recent = [
    ...recentOrders.map(o => ({
      kind: 'program' as const,
      id: o.id,
      href: `/dashboard/lux/households/${o.householdId}`,
      who: `${o.household.guardian1FirstName} ${o.household.guardian1LastName}`,
      what: o.registrations.map(r => `${r.child.firstName} · ${r.program.name}`).join(', ') || 'Registration',
      at: o.createdAt,
    })),
    ...recentEventRegs.map(r => ({
      kind: 'event' as const,
      id: r.id,
      href: `/dashboard/lux/events/${r.eventId}`,
      who: `${r.firstName} ${r.lastName}`,
      what: `${r.event.name}${r.ticketQuantity > 1 ? ` (${r.ticketQuantity} people)` : ''}`,
      at: r.createdAt,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 8)

  return NextResponse.json({
    attention: {
      documentsToReview: toReview,
      documentsMissing: missing,
      feeAssistance: assistance,
      ordersOwing: owingOrders.length,
      ordersOwed: Math.round(orderOwed * 100) / 100,
      eventBalancesOwing: eventBalances.length,
      eventBalancesOwed: Math.round(eventBalances.reduce((sum, b) => sum + b.owed, 0) * 100) / 100,
    },
    programs: programs.map(p => ({ id: p.id, name: p.name, term: p.term, status: p.status, capacity: p.capacity, registered: p._count.registrations })),
    events: events
      .map(e => ({ id: e.id, name: e.name, startDate: e.startDate, startTime: e.startTime, liveStatus: getSimpleEventStatus(e), people: peopleByEvent.get(e.id) ?? 0, capacityTotal: e.capacityTotal }))
      .filter(e => e.liveStatus !== 'ended')
      .slice(0, 5),
    recent,
    setup: {
      paymentsReady: !!org?.stripeAccountId && !!org?.stripeChargesEnabled,
      documentStorageReady: privateBucketConfigured(),
      publicSlug: org?.publicSlug ?? null,
      hasLogo: !!org?.logoUrl,
      hasContactEmail: !!org?.contactEmail,
      feeRulesSet: settings.feeRules.siblingDiscount.type !== 'none' || settings.feeRules.familyCap !== null,
      officeInstructionsSet: !!settings.officePaymentInstructions,
      hasPrograms: programs.length > 0,
      hasEvents: events.length > 0,
    },
  })
}
