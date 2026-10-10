import { NextRequest, NextResponse } from 'next/server'
import { prisma, prismaIncludingCancelled } from '@/lib/prisma'
import { requireLuxStaff } from '@/lib/lux/access'
import { toCsv, csvResponse } from '@/lib/lux/csv'
import { ticketLines } from '@/lib/lux/registrations'
import { exportProgramRoster, exportOutstandingDocuments, exportPayments, exportHouseholds } from '@/lib/lux/exports'

type Params = { params: Promise<{ kind: string }> }

/**
 * GET /api/lux/exports/[kind]
 *   event-registrations?eventId=   everyone registered for a simple event
 *   program-roster?programId=      children in a program (optional filters)
 *   outstanding-documents?programId=  documents still missing / to resubmit
 *   payments                       every Lux payment
 *   households                     every family on file
 */
export async function GET(request: NextRequest, { params }: Params) {
  const { error, ctx } = await requireLuxStaff(request)
  if (error) return error
  const { kind } = await params
  const q = request.nextUrl.searchParams

  if (kind === 'event-registrations') {
    const eventId = q.get('eventId') || ''
    const event = await prisma.event.findFirst({
      where: { id: eventId, organizationId: ctx.organizationId, mode: 'simple' },
      select: { id: true, name: true, customRegistrationQuestions: { orderBy: { displayOrder: 'asc' }, select: { id: true, questionText: true } } },
    })
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

    const registrations = await prismaIncludingCancelled.individualRegistration.findMany({
      where: { eventId, registrationStatus: { not: 'expired' } },
      orderBy: { createdAt: 'asc' },
    })
    const ids = registrations.map(r => r.id)
    const [balances, answers] = await Promise.all([
      prisma.paymentBalance.findMany({ where: { registrationId: { in: ids } } }),
      prisma.customRegistrationAnswer.findMany({ where: { registrationId: { in: ids } } }),
    ])
    const balanceBy = new Map(balances.map(b => [b.registrationId, b]))

    const headers = [
      'First name', 'Last name', 'Email', 'Phone', 'Street', 'City', 'State', 'ZIP', 'Tickets', 'Ticket details',
      'Total', 'Paid', 'Owed', 'Status', 'Confirmation #', 'Registered', 'Waiver signed by',
      'Allergies', 'Medical conditions', 'Medications', 'Emergency contact', 'Emergency phone',
      ...event.customRegistrationQuestions.map(qq => qq.questionText),
    ]
    const rows = registrations.map(r => {
      const b = balanceBy.get(r.id)
      const details = (r.luxDetails ?? {}) as { waiver?: { signedName?: string }; medical?: Record<string, string> }
      const status = r.cancelledAt ? 'Cancelled' : r.registrationStatus === 'incomplete' ? 'Paying online' :
        !b || Number(b.totalAmountDue) === 0 ? 'Free' : Number(b.amountRemaining) <= 0 ? 'Paid' : 'Owes'
      return [
        r.firstName, r.lastName, r.email, r.phone, r.street, r.city, r.state, r.zip, r.ticketQuantity,
        ticketLines(r.ticketSelections).map(l => `${l.quantity}x ${l.name}`).join('; '),
        b ? Number(b.totalAmountDue).toFixed(2) : '0.00', b ? Number(b.amountPaid).toFixed(2) : '0.00',
        b ? Number(b.amountRemaining).toFixed(2) : '0.00', status, r.confirmationCode, r.createdAt.toISOString().slice(0, 16).replace('T', ' '),
        details.waiver?.signedName ?? '', details.medical?.allergies ?? '', details.medical?.conditions ?? '',
        details.medical?.medications ?? '', details.medical?.emergencyContactName ?? '', details.medical?.emergencyContactPhone ?? '',
        ...event.customRegistrationQuestions.map(qq => answers.find(a => a.registrationId === r.id && a.questionId === qq.id)?.answerText ?? ''),
      ]
    })
    return csvResponse(`${event.name}-registrations.csv`, toCsv(headers, rows))
  }

  if (kind === 'program-roster') return exportProgramRoster(ctx.organizationId, q)
  if (kind === 'outstanding-documents') return exportOutstandingDocuments(ctx.organizationId, q)
  if (kind === 'payments') return exportPayments(ctx.organizationId)
  if (kind === 'households') return exportHouseholds(ctx.organizationId)

  return NextResponse.json({ error: 'Unknown export' }, { status: 404 })
}
