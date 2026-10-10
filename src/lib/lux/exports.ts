import { NextResponse } from 'next/server'
import { parseSessions } from '@/lib/lux/program-templates'
import { prisma, prismaIncludingCancelled } from '@/lib/prisma'
import { toCsv, csvResponse } from '@/lib/lux/csv'
import { gradeLabel } from '@/lib/lux/format'
import { ORDER_STATUS_LABELS, documentsSummary, DOCUMENT_STATUS_LABELS } from '@/lib/lux/program-status'

const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : '')

/** Children in a program, with family, sacrament, payment and document details */
export async function exportProgramRoster(organizationId: string, q: URLSearchParams) {
  const programId = q.get('programId') || ''
  const program = await prisma.luxProgram.findFirst({
    where: { id: programId, organizationId },
    include: { requirements: { orderBy: { displayOrder: 'asc' } } },
  })
  if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 })

  const registrations = await prisma.luxProgramRegistration.findMany({
    where: { programId, cancelledAt: null, ...(q.get('grade') ? { grade: q.get('grade')! } : {}) },
    include: { child: true, household: true, order: true, documents: true },
    orderBy: [{ child: { lastName: 'asc' } }, { child: { firstName: 'asc' } }],
  })
  const questions = (Array.isArray(program.questions) ? program.questions : []) as Array<{ id: string; label: string }>
  const sessions = parseSessions(program.sessions)
  const sessionFilter = q.get('session')
  const payment = q.get('payment')
  const docs = q.get('docs')

  const rows = registrations
    .filter(r => {
      if (sessionFilter && r.sessionId !== sessionFilter) return false
      if (payment === 'paid' && !['paid', 'waived'].includes(r.order?.status ?? '')) return false
      if (payment === 'owes' && ['paid', 'waived'].includes(r.order?.status ?? '')) return false
      const summary = documentsSummary(program.requirements, r.documents)
      if (docs === 'complete' && summary.outstandingFromFamily > 0) return false
      if (docs === 'missing' && summary.outstandingFromFamily === 0) return false
      return true
    })
    .map(r => {
      const c = r.child
      const h = r.household
      const summary = documentsSummary(program.requirements, r.documents)
      const sponsor = (r.sponsorInfo ?? {}) as Record<string, string>
      const answers = (r.answers ?? {}) as Record<string, unknown>
      return [
        c.firstName, c.lastName, c.isAdult ? 'Adult' : gradeLabel(r.grade || c.grade),
        ...(sessions.length ? [sessions.find(sess => sess.id === r.sessionId)?.name ?? ''] : []),
        day(c.dateOfBirth), c.gender ?? '',
        `${h.guardian1FirstName} ${h.guardian1LastName}`, h.guardian2FirstName ? `${h.guardian2FirstName} ${h.guardian2LastName ?? ''}`.trim() : '',
        h.email, h.phone, [h.street, h.city, h.state, h.zip].filter(Boolean).join(', '),
        c.baptized === null ? '' : c.baptized ? 'Yes' : 'No', day(c.baptismDate), c.baptizedAtThisParish ? 'This parish' : c.baptismParish ?? '',
        c.allergies ?? '', c.medicalNotes ?? '',
        ...(program.collectSponsor ? [sponsor.name ?? '', sponsor.email ?? '', sponsor.parish ?? ''] : []),
        ...(program.collectServiceHours ? [r.serviceHoursCompleted ?? ''] : []),
        Number(r.feeAmount).toFixed(2), r.order ? ORDER_STATUS_LABELS[r.order.status] ?? r.order.status : '',
        `${summary.done} of ${summary.required}`,
        ...program.requirements.map(req => {
          const sub = r.documents.find(d => d.requirementId === req.id)
          return DOCUMENT_STATUS_LABELS[sub?.status ?? 'missing'] ?? sub?.status ?? 'Missing'
        }),
        ...questions.map(qq => {
          const v = answers[qq.id]
          return Array.isArray(v) ? v.join('; ') : v ?? ''
        }),
        day(r.createdAt),
      ]
    })

  const headers = [
    program.audience === 'adults' ? 'First name' : 'Child first name', program.audience === 'adults' ? 'Last name' : 'Child last name', 'Grade',
    ...(sessions.length ? ['Class time'] : []),
    'Date of birth', 'Gender', program.audience === 'adults' ? 'Contact' : 'Guardian', 'Second guardian',
    'Email', 'Phone', 'Address', 'Baptized', 'Baptism date', 'Baptism parish', 'Allergies', 'Medical notes',
    ...(program.collectSponsor ? ['Sponsor', 'Sponsor email', 'Sponsor parish'] : []),
    ...(program.collectServiceHours ? ['Service hours'] : []),
    'Fee', 'Payment', 'Documents in', ...program.requirements.map(req => req.label), ...questions.map(qq => qq.label), 'Registered',
  ]
  return csvResponse(`${program.name}-${program.term}-roster.csv`, toCsv(headers, rows))
}

/** Every document a family still owes (or staff still need to look up) */
export async function exportOutstandingDocuments(organizationId: string, q: URLSearchParams) {
  const programId = q.get('programId')
  const submissions = await prisma.luxDocumentSubmission.findMany({
    where: {
      organizationId,
      status: { in: ['missing', 'needs_resubmission', 'parish_lookup'] },
      programRegistration: { cancelledAt: null, program: { status: { not: 'archived' } }, ...(programId ? { programId } : {}) },
    },
    include: {
      requirement: { select: { label: true, required: true } },
      child: { select: { firstName: true, lastName: true, grade: true } },
      household: { select: { guardian1FirstName: true, guardian1LastName: true, email: true, phone: true } },
      programRegistration: { select: { program: { select: { name: true, term: true } } } },
    },
    orderBy: [{ createdAt: 'asc' }],
  })
  const rows = submissions.map(s => [
    `${s.programRegistration.program.name} (${s.programRegistration.program.term})`,
    `${s.child.firstName} ${s.child.lastName}`, gradeLabel(s.child.grade), s.requirement.label,
    s.requirement.required ? 'Required' : 'Optional', DOCUMENT_STATUS_LABELS[s.status] ?? s.status,
    `${s.household.guardian1FirstName} ${s.household.guardian1LastName}`, s.household.email, s.household.phone,
    s.lastReminderAt ? day(s.lastReminderAt) : '', s.reviewerNote ?? '',
  ])
  return csvResponse('outstanding-documents.csv', toCsv(
    ['Program', 'Child', 'Grade', 'Document', 'Required', 'Status', 'Guardian', 'Email', 'Phone', 'Last reminder', 'Staff note'],
    rows
  ))
}

/** All Lux payments: simple events and faith formation orders */
export async function exportPayments(organizationId: string) {
  const payments = await prisma.payment.findMany({
    where: {
      organizationId,
      OR: [{ registrationType: 'lux_order' }, { registrationType: 'individual', eventId: { not: null } }],
      paymentStatus: { in: ['succeeded', 'refunded'] },
    },
    orderBy: { createdAt: 'asc' },
  })
  const simpleEventIds = new Set(
    (await prisma.event.findMany({ where: { organizationId, mode: 'simple' }, select: { id: true } })).map(e => e.id)
  )
  const luxPayments = payments.filter(p => p.registrationType === 'lux_order' || (p.eventId && simpleEventIds.has(p.eventId)))

  const individualIds = luxPayments.filter(p => p.registrationType === 'individual').map(p => p.registrationId)
  const orderIds = luxPayments.filter(p => p.registrationType === 'lux_order').map(p => p.registrationId)
  const [individuals, orders, events] = await Promise.all([
    // Payments on registrations cancelled later still happened
    prismaIncludingCancelled.individualRegistration.findMany({
      where: { id: { in: individualIds } },
      select: { id: true, firstName: true, lastName: true, email: true, eventId: true },
    }),
    prisma.luxOrder.findMany({
      where: { id: { in: orderIds } },
      select: { id: true, confirmationCode: true, household: { select: { guardian1FirstName: true, guardian1LastName: true, email: true } } },
    }),
    prisma.event.findMany({ where: { id: { in: [...simpleEventIds] } }, select: { id: true, name: true } }),
  ])
  const eventName = new Map(events.map(e => [e.id, e.name]))
  const rows = luxPayments.map(p => {
    const ind = individuals.find(i => i.id === p.registrationId)
    const order = orders.find(o => o.id === p.registrationId)
    return [
      day(p.processedAt ?? p.createdAt),
      ind ? `${ind.firstName} ${ind.lastName}` : order ? `${order.household.guardian1FirstName} ${order.household.guardian1LastName}` : '',
      ind?.email ?? order?.household.email ?? '',
      p.registrationType === 'lux_order' ? `Faith formation (order ${order?.confirmationCode ?? ''})` : eventName.get(p.eventId ?? '') ?? 'Event',
      p.paymentMethod, Number(p.amount).toFixed(2), p.paymentStatus, p.checkNumber ?? '', p.receiptUrl ?? '',
    ]
  })
  return csvResponse('lux-payments.csv', toCsv(['Date', 'Paid by', 'Email', 'For', 'Method', 'Amount', 'Status', 'Check #', 'Receipt'], rows))
}

/** Every family on file with their children */
export async function exportHouseholds(organizationId: string) {
  const households = await prisma.luxHousehold.findMany({
    where: { organizationId },
    include: { children: { where: { archivedAt: null }, orderBy: { dateOfBirth: 'asc' } } },
    orderBy: [{ guardian1LastName: 'asc' }, { guardian1FirstName: 'asc' }],
  })
  const rows = households.map(h => [
    `${h.guardian1FirstName} ${h.guardian1LastName}`,
    h.guardian2FirstName ? `${h.guardian2FirstName} ${h.guardian2LastName ?? ''}`.trim() : '',
    h.email, h.phone, h.guardian2Email ?? '', h.guardian2Phone ?? '', h.street ?? '', h.city ?? '', h.state ?? '', h.zip ?? '',
    h.emergencyContactName ?? '', h.emergencyContactPhone ?? '',
    h.registeredParishioner === null ? '' : h.registeredParishioner ? 'Yes' : 'No',
    h.children.map(c => `${c.firstName} ${c.lastName}${c.grade ? ` (${gradeLabel(c.grade)})` : ''}`).join('; '),
    day(h.createdAt),
  ])
  return csvResponse('households.csv', toCsv(
    ['Guardian', 'Second guardian', 'Email', 'Phone', 'Second guardian email', 'Second guardian phone', 'Street', 'City', 'State', 'ZIP',
      'Emergency contact', 'Emergency phone', 'Registered parishioner', 'Children', 'First registered'],
    rows
  ))
}
