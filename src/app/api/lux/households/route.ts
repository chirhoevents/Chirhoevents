import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLuxStaff } from '@/lib/lux/access'
import { FAMILY_OUTSTANDING } from '@/lib/lux/program-status'

/**
 * GET /api/lux/households?q=&filter=all|owes|documents|assistance
 * Families on file, with what each still needs.
 */
export async function GET(request: NextRequest) {
  const { error, ctx } = await requireLuxStaff(request)
  if (error) return error
  const q = (request.nextUrl.searchParams.get('q') || '').trim().slice(0, 100)
  const filter = request.nextUrl.searchParams.get('filter') || 'all'

  const search = q
    ? {
        OR: [
          { guardian1FirstName: { contains: q, mode: 'insensitive' as const } },
          { guardian1LastName: { contains: q, mode: 'insensitive' as const } },
          { guardian2FirstName: { contains: q, mode: 'insensitive' as const } },
          { guardian2LastName: { contains: q, mode: 'insensitive' as const } },
          { email: { contains: q, mode: 'insensitive' as const } },
          { phone: { contains: q } },
          { children: { some: { OR: [
            { firstName: { contains: q, mode: 'insensitive' as const } },
            { lastName: { contains: q, mode: 'insensitive' as const } },
          ] } } },
        ],
      }
    : {}

  const households = await prisma.luxHousehold.findMany({
    where: { organizationId: ctx.organizationId, ...search },
    include: {
      children: { where: { archivedAt: null }, select: { firstName: true }, orderBy: { dateOfBirth: 'asc' } },
      registrations: { where: { cancelledAt: null, program: { status: { not: 'archived' } } }, select: { id: true } },
      orders: { where: { status: { not: 'cancelled' } }, select: { amountDue: true, amountPaid: true, feeAssistanceStatus: true } },
      documents: {
        where: { status: { in: FAMILY_OUTSTANDING }, requirement: { required: true }, programRegistration: { cancelledAt: null, program: { status: { not: 'archived' } } } },
        select: { id: true },
      },
    },
    orderBy: [{ guardian1LastName: 'asc' }, { guardian1FirstName: 'asc' }],
    take: 1000,
  })

  const rows = households.map(h => ({
    id: h.id,
    name: `${h.guardian1FirstName} ${h.guardian1LastName}`,
    secondGuardian: h.guardian2FirstName ? `${h.guardian2FirstName} ${h.guardian2LastName ?? ''}`.trim() : null,
    email: h.email,
    phone: h.phone,
    children: h.children.map(c => c.firstName),
    activeRegistrations: h.registrations.length,
    owed: Math.round(h.orders.reduce((s, o) => s + Math.max(0, Number(o.amountDue) - Number(o.amountPaid)), 0) * 100) / 100,
    missingDocuments: h.documents.length,
    assistanceRequested: h.orders.some(o => o.feeAssistanceStatus === 'requested'),
  })).filter(r =>
    filter === 'owes' ? r.owed > 0
      : filter === 'documents' ? r.missingDocuments > 0
      : filter === 'assistance' ? r.assistanceRequested
      : true
  )

  return NextResponse.json({ households: rows, truncated: households.length === 1000 })
}
