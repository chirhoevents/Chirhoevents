/**
 * Archive sections for the Master Event Report.
 *
 * The master report doubles as the organization's permanent record of an
 * event (kept for years for legal reasons, and handed to organizers if the
 * platform ever goes away), so beyond the core registration / finance
 * tables it includes everything else the event used: cancellations, full
 * registration details, housing, meals, small groups, seating, schedules,
 * incident reports, surveys, safe environment certificates, name tag and
 * welcome packet setup, and the original uploaded files.
 *
 * Every query here is wrapped so one missing table or bad row degrades to
 * an empty section instead of failing the whole report.
 */

import { prisma } from '@/lib/prisma'
import type { GenericReportSection } from '@/lib/reports/generate-master-report-pdf'
import { isStoredFileUrl, type ArchiveAttachment } from '@/lib/reports/master-report-attachments'

// ------------------------------------------------------------
// Formatting helpers
// ------------------------------------------------------------

const RED = '#B91C1C'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// Secrets / machine data that mean nothing on paper.
const SKIP_KEY_RE = /token|password|^qrCode$|^signatureData$|^settingsJson$/i

function txt(v: any, fallback = '—'): string {
  if (v === null || v === undefined || v === '') return fallback
  return String(v)
}

function date(v: any, withTime = true): string {
  if (!v) return '—'
  const d = v instanceof Date ? v : new Date(v)
  if (isNaN(d.getTime())) return '—'
  // @db.Date columns come back as midnight UTC — print them without a time
  // (and in UTC) so they don't shift a day in US time zones.
  const dateOnly = !withTime || (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0)
  if (dateOnly) {
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
  }
  return d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function money(v: any): string {
  const n = Number(v)
  return isFinite(n) ? `$${n.toFixed(2)}` : '—'
}

function yesNo(v: any): string {
  return v ? 'Yes' : 'No'
}

function humanize(v: any): string {
  if (v === null || v === undefined || v === '') return '—'
  return String(v).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function labelize(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\bUrl\b/g, 'URL')
    .replace(/\bAda\b/g, 'ADA')
}

function fullName(p: any): string {
  if (!p) return ''
  return `${p.firstName || ''} ${p.lastName || ''}`.trim()
}

function formatValue(v: any): string {
  if (v instanceof Date) return date(v)
  if (typeof v === 'boolean') return yesNo(v)
  if (typeof v === 'bigint') return v.toString()
  // Prisma Decimal
  if (v && typeof v === 'object' && typeof v.toFixed === 'function' && 'd' in v) return v.toString()
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v, null, 1).replace(/\s*\n\s*/g, ' ')
    } catch {
      return String(v)
    }
  }
  return String(v)
}

/**
 * Every populated scalar column on a row as label/value pairs. Used for the
 * "full detail" record sections so nothing on the registration is left out,
 * even columns added after this report was written.
 */
function recordFromRow(row: any, omit: string[] = []): Array<[string, string]> {
  const out: Array<[string, string]> = []
  for (const [k, v] of Object.entries(row || {})) {
    if (omit.includes(k) || k === 'id' || SKIP_KEY_RE.test(k)) continue
    if (v === null || v === undefined || v === '') continue
    if (k.endsWith('Id') && typeof v === 'string' && UUID_RE.test(v)) continue
    if (Array.isArray(v) && v.length === 0) continue
    out.push([`${labelize(k)}:`, formatValue(v)])
  }
  return out
}

async function safe<T>(label: string, p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p
  } catch (err: any) {
    console.error(`[Master Report PDF] ${label} query failed:`, err?.message || err)
    return fallback
  }
}

// ------------------------------------------------------------
// Loader
// ------------------------------------------------------------

export interface ArchiveBaseData {
  eventId: string
  groups: any[]
  individuals: any[]
  participants: any[]
  vendors: any[]
  staff: any[]
  liabilityForms: any[]
  paymentBalances: any[]
  refunds: any[]
}

export interface ArchiveResult {
  /** Rendered after the Staff section. */
  registrationSections: GenericReportSection[]
  /** Rendered after Email History. */
  endSections: GenericReportSection[]
  certificateFiles: ArchiveAttachment[]
  letterFiles: ArchiveAttachment[]
  eventDocuments: ArchiveAttachment[]
  event: any
}

export async function loadArchiveSections(base: ArchiveBaseData): Promise<ArchiveResult> {
  const { eventId } = base
  const regIds = [
    ...base.groups.map(g => g.id),
    ...base.individuals.map(i => i.id),
    ...base.vendors.map(v => v.id),
    ...base.staff.map(s => s.id),
  ]

  const [
    event,
    eventSettings,
    registrationEdits,
    rooms,
    roomAssignments,
    adaIndividuals,
    mealGroups,
    mealColorAssignments,
    mealTimes,
    smallGroups,
    seatingSections,
    porosStaff,
    scheduleEntries,
    adoration,
    confession,
    announcements,
    infoItems,
    resources,
    schedulePdf,
    pricing,
    dayPassOptions,
    coupons,
    customQuestions,
    letters,
    surveys,
    nameTagTemplate,
    welcomeSettings,
    welcomeInserts,
    incidents,
    medicalAccessLogs,
    certificates,
  ] = await Promise.all([
    safe('event', prisma.event.findUnique({ where: { id: eventId } }), null as any),
    safe('eventSettings', prisma.eventSettings.findUnique({ where: { eventId } }), null as any),
    safe('registrationEdits', prisma.registrationEdit.findMany({
      where: {
        OR: [
          { registrationId: { in: regIds } },
          // Hard-deleted registrations no longer have a row to match on;
          // the cancel route records the event on the audit entry instead.
          { changesMade: { path: ['eventId'], equals: eventId } },
        ],
      },
      include: { editedBy: { select: { firstName: true, lastName: true } } },
      orderBy: { editedAt: 'asc' },
    }), [] as any[]),
    safe('rooms', prisma.room.findMany({
      where: { building: { eventId } },
      include: {
        building: { select: { name: true, displayOrder: true } },
        allocatedToGroup: { select: { groupName: true } },
      },
    }), [] as any[]),
    safe('roomAssignments', prisma.roomAssignment.findMany({
      where: { room: { building: { eventId } } },
      include: { room: { include: { building: { select: { name: true } } } } },
    }), [] as any[]),
    safe('adaIndividuals', prisma.adaIndividual.findMany({
      where: { eventId },
      include: { room: { include: { building: { select: { name: true } } } } },
      orderBy: { name: 'asc' },
    }), [] as any[]),
    safe('mealGroups', prisma.mealGroup.findMany({
      where: { eventId },
      include: { assignments: true },
      orderBy: { displayOrder: 'asc' },
    }), [] as any[]),
    safe('mealColorAssignments', prisma.mealColorAssignment.findMany({ where: { eventId } }), [] as any[]),
    safe('mealTimes', prisma.porosMealTime.findMany({
      where: { eventId },
      orderBy: [{ dayDate: 'asc' }, { order: 'asc' }],
    }), [] as any[]),
    safe('smallGroups', prisma.smallGroup.findMany({
      where: { eventId },
      include: {
        sgl: { select: { firstName: true, lastName: true } },
        coSgl: { select: { firstName: true, lastName: true } },
        meetingRoom: { include: { building: { select: { name: true } } } },
        assignments: true,
      },
      orderBy: [{ groupNumber: 'asc' }, { name: 'asc' }],
    }), [] as any[]),
    safe('seatingSections', prisma.seatingSection.findMany({
      where: { eventId },
      include: { seatingAssignments: true },
      orderBy: { displayOrder: 'asc' },
    }), [] as any[]),
    safe('porosStaff', prisma.porosStaff.findMany({
      where: { eventId },
      include: { groupStaffAssignments: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    }), [] as any[]),
    safe('schedule', prisma.porosScheduleEntry.findMany({
      where: { eventId },
      orderBy: [{ dayDate: 'asc' }, { order: 'asc' }, { startTime: 'asc' }],
    }), [] as any[]),
    safe('adoration', prisma.porosAdoration.findMany({ where: { eventId }, orderBy: { order: 'asc' } }), [] as any[]),
    safe('confession', prisma.porosConfession.findMany({ where: { eventId }, orderBy: { order: 'asc' } }), [] as any[]),
    safe('announcements', prisma.porosAnnouncement.findMany({ where: { eventId }, orderBy: { createdAt: 'asc' } }), [] as any[]),
    safe('infoItems', prisma.porosInfoItem.findMany({ where: { eventId }, orderBy: { order: 'asc' } }), [] as any[]),
    safe('resources', prisma.porosResource.findMany({ where: { eventId }, orderBy: { order: 'asc' } }), [] as any[]),
    safe('schedulePdf', prisma.porosSchedulePdf.findUnique({ where: { eventId } }), null as any),
    safe('pricing', prisma.eventPricing.findUnique({ where: { eventId } }), null as any),
    safe('dayPassOptions', prisma.dayPassOption.findMany({ where: { eventId }, orderBy: { date: 'asc' } }), [] as any[]),
    safe('coupons', prisma.coupon.findMany({ where: { eventId }, orderBy: { createdAt: 'asc' } }), [] as any[]),
    safe('customQuestions', prisma.customRegistrationQuestion.findMany({
      where: { eventId },
      include: { answers: true },
      orderBy: { displayOrder: 'asc' },
    }), [] as any[]),
    safe('letters', prisma.letterOfGoodStanding.findMany({
      where: { eventId },
      include: { verifiedBy: { select: { firstName: true, lastName: true } } },
      orderBy: { participantName: 'asc' },
    }), [] as any[]),
    safe('surveys', prisma.survey.findMany({
      where: { eventId },
      include: {
        questions: { orderBy: { displayOrder: 'asc' } },
        responses: {
          include: { answers: true, recipient: true },
          orderBy: { submittedAt: 'asc' },
        },
        _count: { select: { recipients: true } },
      },
      orderBy: { createdAt: 'asc' },
    }), [] as any[]),
    safe('nameTagTemplate', prisma.nameTagTemplate.findUnique({ where: { eventId } }), null as any),
    safe('welcomeSettings', prisma.welcomePacketSettings.findUnique({ where: { eventId } }), null as any),
    safe('welcomeInserts', prisma.welcomePacketInsert.findMany({ where: { eventId }, orderBy: { displayOrder: 'asc' } }), [] as any[]),
    safe('incidents', prisma.medicalIncident.findMany({
      where: { eventId },
      include: { updates: { orderBy: { createdAt: 'asc' } } },
      orderBy: [{ incidentDate: 'asc' }, { createdAt: 'asc' }],
    }), [] as any[]),
    safe('medicalAccessLogs', prisma.medicalAccessLog.findMany({ where: { eventId }, orderBy: { createdAt: 'asc' } }), [] as any[]),
    safe('certificates', prisma.safeEnvironmentCertificate.findMany({
      where: {
        OR: [
          { liabilityForm: { eventId } },
          { participant: { groupRegistration: { eventId } } },
        ],
      },
      include: {
        participant: {
          select: {
            firstName: true, lastName: true, participantType: true,
            groupRegistration: { select: { groupName: true, parishName: true } },
          },
        },
        liabilityForm: { select: { participantFirstName: true, participantLastName: true } },
        uploadedBy: { select: { firstName: true, lastName: true } },
        verifiedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { uploadedAt: 'asc' },
    }), [] as any[]),
  ])

  // Users referenced by id only (cancelled-by, assigned-by, ...).
  const userIds = Array.from(new Set([
    ...base.groups.map(g => g.cancelledByUserId),
    ...base.individuals.map(i => i.cancelledByUserId),
  ].filter(Boolean))) as string[]
  const users = userIds.length > 0
    ? await safe('users', prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, firstName: true, lastName: true },
      }), [] as any[])
    : []
  const userName = (id: string | null | undefined) => {
    const u = id ? users.find((x: any) => x.id === id) : null
    return u ? fullName(u) : '—'
  }

  // ---------- Lookups ----------
  const groupById = new Map(base.groups.map(g => [g.id, g]))
  const individualById = new Map(base.individuals.map(i => [i.id, i]))
  const participantById = new Map(base.participants.map(p => [p.id, p]))
  const vendorById = new Map(base.vendors.map(v => [v.id, v]))
  const staffById = new Map(base.staff.map(s => [s.id, s]))
  const balanceByReg = new Map(base.paymentBalances.map(pb => [`${pb.registrationType}:${pb.registrationId}`, pb]))

  const cancelledTag = (row: any) => (row?.cancelledAt ? ' (CANCELLED)' : '')
  const groupLabel = (id: string | null | undefined) => {
    const g: any = id ? groupById.get(id) : null
    return g ? `${g.groupName}${cancelledTag(g)}` : ''
  }
  const personLabel = (a: { participantId?: string | null; individualRegistrationId?: string | null; groupRegistrationId?: string | null }) => {
    if (a.participantId) {
      const p: any = participantById.get(a.participantId)
      if (p) return fullName(p)
    }
    if (a.individualRegistrationId) {
      const i: any = individualById.get(a.individualRegistrationId)
      if (i) return `${fullName(i)}${cancelledTag(i)}`
    }
    if (a.groupRegistrationId) return groupLabel(a.groupRegistrationId) || 'Unknown group'
    return 'Unknown'
  }
  const registrationLabel = (type: string, id: string) => {
    if (type === 'group') return groupLabel(id) || 'Deleted group registration'
    if (type === 'individual') {
      const i: any = individualById.get(id)
      return i ? `${fullName(i)}${cancelledTag(i)}` : 'Deleted individual registration'
    }
    if (type === 'vendor') return (vendorById.get(id) as any)?.businessName || 'Unknown vendor'
    if (type === 'staff') return fullName(staffById.get(id)) || 'Unknown staff'
    return 'Unknown'
  }
  const participantGroup = (p: any) => groupLabel(p?.groupRegistrationId)

  const registrationSections: GenericReportSection[] = []
  const endSections: GenericReportSection[] = []

  // ========== Cancelled registrations ==========
  const cancelledGroups = base.groups.filter(g => g.cancelledAt)
  const cancelledIndividuals = base.individuals.filter(i => i.cancelledAt)
  const deletedEdits = registrationEdits.filter((e: any) => (e.changesMade as any)?.action === 'deleted')
  const refundsByReg = new Map<string, number>()
  for (const r of base.refunds) {
    const k = `${r.registrationType}:${r.registrationId}`
    refundsByReg.set(k, (refundsByReg.get(k) || 0) + Number(r.refundAmount || 0))
  }
  const cancelledRows: string[][] = [
    ...cancelledGroups.map(g => {
      const bal: any = balanceByReg.get(`group:${g.id}`)
      return [
        'Group', g.groupName, txt(g.groupLeaderName), txt(g.groupLeaderEmail),
        String(g.participants?.length ?? 0),
        bal ? money(bal.amountPaid) : '$0.00',
        money(refundsByReg.get(`group:${g.id}`) || 0),
        date(g.createdAt), date(g.cancelledAt), userName(g.cancelledByUserId), txt(g.cancellationReason),
      ]
    }),
    ...cancelledIndividuals.map(i => {
      const bal: any = balanceByReg.get(`individual:${i.id}`)
      return [
        'Individual', fullName(i), fullName(i), txt(i.email), '1',
        bal ? money(bal.amountPaid) : '$0.00',
        money(refundsByReg.get(`individual:${i.id}`) || 0),
        date(i.createdAt), date(i.cancelledAt), userName(i.cancelledByUserId), txt(i.cancellationReason),
      ]
    }),
    ...deletedEdits.map((e: any) => {
      const c: any = e.changesMade || {}
      return [
        `${humanize(e.registrationType)} (deleted)`, txt(c.registrantName, 'Name not recorded'), '—', txt(c.registrantEmail),
        txt(c.participantsRestored), '—', '—', '—', date(e.editedAt), fullName(e.editedBy) || '—',
        txt(c.reason || e.adminNotes),
      ]
    }),
  ]
  registrationSections.push({
    title: 'Cancelled Registrations',
    subtitle: 'Registrations cancelled or deleted by an administrator. Cancelled registrations still appear (marked CANCELLED) in the tables above, and their liability forms and payments are kept in full.',
    placement: 'registrations',
    columns: [
      { label: 'Type', weight: 7 }, { label: 'Registration', weight: 13 }, { label: 'Contact', weight: 10 },
      { label: 'Email', weight: 13 }, { label: 'People', weight: 4, align: 'right' },
      { label: 'Paid', weight: 6, align: 'right' }, { label: 'Refunded', weight: 6, align: 'right' },
      { label: 'Registered', weight: 7 }, { label: 'Cancelled', weight: 9 }, { label: 'Cancelled By', weight: 9 },
      { label: 'Reason', weight: 16 },
    ],
    rows: cancelledRows,
  })

  // ========== Full registration details ==========
  if (base.groups.length > 0) {
    registrationSections.push({
      title: 'Group Registration Details',
      subtitle: 'Every field on file for each group registration, including housing counts, special requests, and cancellation details.',
      placement: 'registrations',
      records: base.groups.map(g => ({
        heading: `${g.groupName}${cancelledTag(g)}  ·  ${g.accessCode}`,
        keyValues: [
          ...recordFromRow(g, ['participants']),
          ['Participants:', (base.participants.filter(p => p.groupRegistrationId === g.id)
            .map(p => `${fullName(p)} (${humanize(p.participantType)}, ${p.age ?? '?'})`).join('; ')) || '—'],
          ...(g.cancelledByUserId ? [['Cancelled By:', userName(g.cancelledByUserId)] as [string, string]] : []),
        ],
      })),
    })
  }
  if (base.individuals.length > 0) {
    registrationSections.push({
      title: 'Individual Registration Details',
      subtitle: 'Every field on file for each individual registration, including emergency contacts and cancellation details.',
      placement: 'registrations',
      records: base.individuals.map(i => ({
        heading: `${fullName(i)}${cancelledTag(i)}${i.confirmationCode ? `  ·  ${i.confirmationCode}` : ''}`,
        keyValues: [
          ...recordFromRow(i),
          ...(i.cancelledByUserId ? [['Cancelled By:', userName(i.cancelledByUserId)] as [string, string]] : []),
        ],
      })),
    })
  }
  if (base.vendors.length > 0) {
    registrationSections.push({
      title: 'Vendor Details',
      subtitle: 'Every field on file for each vendor, including booth description, invoice notes, and booth staff.',
      placement: 'registrations',
      records: base.vendors.map(v => ({
        heading: `${v.businessName}  ·  ${humanize(v.status)}`,
        keyValues: [
          ...recordFromRow(v),
          ['Booth Staff:', base.staff.filter(s => s.vendorRegistrationId === v.id).map(s => fullName(s)).join('; ') || '—'],
        ],
      })),
    })
  }
  if (base.staff.length > 0) {
    registrationSections.push({
      title: 'Staff & Volunteer Details',
      subtitle: 'Every field on file for each staff / volunteer registration.',
      placement: 'registrations',
      records: base.staff.map(s => ({
        heading: `${fullName(s)}${s.isVendorStaff ? `  ·  Vendor staff (${s.vendorRegistration?.businessName || 'vendor'})` : ''}`,
        keyValues: recordFromRow(s, ['vendorRegistration']),
      })),
    })
  }

  if (customQuestions.length > 0) {
    const rows: string[][] = []
    for (const q of customQuestions) {
      if (q.answers.length === 0) {
        rows.push([q.questionText, humanize(q.appliesTo), '—', '(no answers)'])
      }
      for (const a of q.answers) {
        rows.push([q.questionText, humanize(q.appliesTo), registrationLabel(a.registrationType, a.registrationId), txt(a.answerText)])
      }
    }
    registrationSections.push({
      title: 'Custom Registration Questions & Answers',
      placement: 'registrations',
      columns: [{ label: 'Question', weight: 30 }, { label: 'Applies To', weight: 10 }, { label: 'Registration', weight: 20 }, { label: 'Answer', weight: 40 }],
      rows,
    })
  }

  if (registrationEdits.length > 0) {
    registrationSections.push({
      title: 'Registration Change Log',
      subtitle: 'Audit trail of every admin edit, payment change, participant add/remove, cancellation, and deletion.',
      placement: 'registrations',
      columns: [
        { label: 'When', weight: 10 }, { label: 'Registration', weight: 15 }, { label: 'Type', weight: 7 },
        { label: 'Change', weight: 10 }, { label: 'Old Total', weight: 7, align: 'right' },
        { label: 'New Total', weight: 7, align: 'right' }, { label: 'By', weight: 10 }, { label: 'Details', weight: 34 },
      ],
      rows: registrationEdits.map((e: any) => {
        const c: any = e.changesMade
        const deletedName = c?.action === 'deleted' && c?.registrantName ? `${c.registrantName} (deleted)` : null
        return [
          date(e.editedAt), deletedName || registrationLabel(e.registrationType, e.registrationId), humanize(e.registrationType),
          c?.action ? humanize(c.action) : humanize(e.editType),
          e.oldTotal != null ? money(e.oldTotal) : '—', e.newTotal != null ? money(e.newTotal) : '—',
          fullName(e.editedBy) || '—',
          [e.adminNotes, c ? formatValue(c) : null].filter(Boolean).join(' — '),
        ]
      }),
    })
  }

  // ========== Medical, emergency, incidents ==========
  const formsWithMedical = base.liabilityForms.filter(f =>
    f.medicalConditions || f.medications || f.allergies || f.dietaryRestrictions || f.adaAccommodations)
  const formPerson = (f: any) => `${f.participantFirstName || ''} ${f.participantLastName || ''}`.trim()
  const formGroup = (f: any) => f.groupRegistration?.groupName
    ? `${f.groupRegistration.groupName}${groupById.get(f.groupRegistrationId)?.cancelledAt ? ' (CANCELLED)' : ''}`
    : f.individualRegistrationId ? 'Individual' : '—'
  if (formsWithMedical.length > 0) {
    endSections.push({
      title: 'Medical, Allergy & Dietary Summary',
      subtitle: 'Taken from submitted liability forms. See the signed forms appendix for the complete originals.',
      columns: [
        { label: 'Name', weight: 11 }, { label: 'Group', weight: 11 }, { label: 'Age', weight: 4 },
        { label: 'Allergies', weight: 15 }, { label: 'Medications', weight: 15 }, { label: 'Conditions', weight: 15 },
        { label: 'Dietary', weight: 14 }, { label: 'ADA', weight: 15 },
      ],
      rows: formsWithMedical.map(f => [
        formPerson(f), formGroup(f), txt(f.participantAge),
        txt(f.allergies, ''), txt(f.medications, ''), txt(f.medicalConditions, ''),
        txt(f.dietaryRestrictions, ''), txt(f.adaAccommodations, ''),
      ]),
    })
  }
  const formsWithContacts = base.liabilityForms.filter(f => f.emergencyContact1Name || f.insuranceProvider)
  if (formsWithContacts.length > 0) {
    endSections.push({
      title: 'Emergency Contacts & Insurance',
      subtitle: 'Taken from submitted liability forms.',
      columns: [
        { label: 'Name', weight: 13 }, { label: 'Group', weight: 12 }, { label: 'Emergency Contact 1', weight: 20 },
        { label: 'Emergency Contact 2', weight: 20 }, { label: 'Insurance', weight: 20 }, { label: 'Parent Email', weight: 15 },
      ],
      rows: formsWithContacts.map(f => [
        formPerson(f), formGroup(f),
        [f.emergencyContact1Name, f.emergencyContact1Relation, f.emergencyContact1Phone].filter(Boolean).join(' · '),
        [f.emergencyContact2Name, f.emergencyContact2Relation, f.emergencyContact2Phone].filter(Boolean).join(' · '),
        [f.insuranceProvider, f.insurancePolicyNumber && `Policy ${f.insurancePolicyNumber}`, f.insuranceGroupNumber && `Group ${f.insuranceGroupNumber}`].filter(Boolean).join(' · '),
        txt(f.parentEmail, ''),
      ]),
    })
  }

  if (incidents.length > 0) {
    endSections.push({
      title: 'Incident Reports (Full Detail)',
      subtitle: 'Complete Rapha incident reports, including treatment, parent contact, hospital transport, follow-up, and every update logged.',
      records: incidents.map((i: any) => ({
        heading: `${date(i.incidentDate, false)} ${i.incidentTime || ''}  ·  ${i.participantName || 'Unknown'}  ·  ${humanize(i.incidentType)} (${humanize(i.severity)})`,
        keyValues: [
          ...recordFromRow(i, ['updates']),
          ...i.updates.map((u: any, n: number) => [
            `Update ${n + 1}:`, `${date(u.createdAt)} — ${u.updatedByName}: ${u.updateText}`,
          ] as [string, string]),
        ],
      })),
    })
  }
  if (medicalAccessLogs.length > 0) {
    endSections.push({
      title: 'Medical Records Access Log',
      subtitle: 'Who viewed or changed medical information during the event.',
      columns: [
        { label: 'When', weight: 12 }, { label: 'User', weight: 14 }, { label: 'Action', weight: 14 },
        { label: 'Resource', weight: 12 }, { label: 'Details', weight: 38 }, { label: 'IP', weight: 10 },
      ],
      rows: medicalAccessLogs.map((l: any) => [
        date(l.createdAt), l.userName, humanize(l.action), humanize(l.resourceType), txt(l.details, ''), txt(l.ipAddress, ''),
      ]),
    })
  }

  // ========== Safe environment certificates & letters ==========
  interface CertRow { name: string; role: string; group: string; program: string; completed: string; expires: string; status: string; uploaded: string; verified: string; filename: string; url: string | null }
  const certRows: CertRow[] = []
  const seenCertUrls = new Set<string>()
  for (const c of certificates) {
    const name = fullName(c.participant) || `${c.liabilityForm?.participantFirstName || ''} ${c.liabilityForm?.participantLastName || ''}`.trim() || 'Unknown'
    seenCertUrls.add(c.fileUrl)
    certRows.push({
      name,
      role: humanize(c.participant?.participantType || 'participant'),
      group: groupLabel(participantById.get(c.participantId)?.groupRegistrationId) || c.participant?.groupRegistration?.groupName || '—',
      program: txt(c.programName),
      completed: date(c.completionDate, false),
      expires: date(c.expirationDate, false),
      status: humanize(c.status),
      uploaded: `${date(c.uploadedAt)}${c.uploadedBy ? ` by ${fullName(c.uploadedBy)}` : ''}`,
      verified: c.verifiedAt ? `${date(c.verifiedAt)}${c.verifiedBy ? ` by ${fullName(c.verifiedBy)}` : ''}` : '—',
      filename: txt(c.originalFilename, ''),
      url: c.fileUrl,
    })
  }
  // Legacy / direct-URL certificates on participants, staff, and vendors.
  for (const p of base.participants) {
    if (p.safeEnvironmentCertUrl && !seenCertUrls.has(p.safeEnvironmentCertUrl)) {
      seenCertUrls.add(p.safeEnvironmentCertUrl)
      certRows.push({
        name: fullName(p), role: humanize(p.participantType), group: participantGroup(p) || '—', program: '—',
        completed: '—', expires: '—', status: humanize(p.safeEnvironmentCertStatus || 'uploaded'),
        uploaded: '—', verified: '—', filename: '', url: p.safeEnvironmentCertUrl,
      })
    }
  }
  for (const s of base.staff) {
    if (s.safeEnvironmentCertUrl && !seenCertUrls.has(s.safeEnvironmentCertUrl)) {
      seenCertUrls.add(s.safeEnvironmentCertUrl)
      certRows.push({
        name: fullName(s), role: s.isVendorStaff ? 'Vendor Staff' : 'Staff', group: s.vendorRegistration?.businessName || '—',
        program: '—', completed: '—', expires: '—', status: 'Uploaded', uploaded: date(s.safeEnvironmentCertUploadedAt),
        verified: '—', filename: '', url: s.safeEnvironmentCertUrl,
      })
    }
  }
  for (const v of base.vendors) {
    if (v.safeEnvironmentCertUrl && !seenCertUrls.has(v.safeEnvironmentCertUrl)) {
      seenCertUrls.add(v.safeEnvironmentCertUrl)
      certRows.push({
        name: `${v.contactFirstName || ''} ${v.contactLastName || ''}`.trim(), role: 'Vendor', group: v.businessName,
        program: '—', completed: '—', expires: '—', status: 'Uploaded', uploaded: date(v.safeEnvironmentCertUploadedAt),
        verified: '—', filename: '', url: v.safeEnvironmentCertUrl,
      })
    }
  }
  certRows.sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name))
  if (certRows.length > 0) {
    endSections.push({
      title: 'Safe Environment Certificates',
      subtitle: 'Every safe environment certificate submitted for this event. The certificate files themselves are attached in the Safe Environment Certificates appendix.',
      columns: [
        { label: 'Name', weight: 12 }, { label: 'Role', weight: 7 }, { label: 'Group / Vendor', weight: 13 },
        { label: 'Program', weight: 11 }, { label: 'Completed', weight: 8 }, { label: 'Expires', weight: 8 },
        { label: 'Status', weight: 7 }, { label: 'Uploaded', weight: 13 }, { label: 'Verified', weight: 13 },
        { label: 'File', weight: 8 },
      ],
      rows: certRows.map(c => [c.name, c.role, c.group, c.program, c.completed, c.expires, c.status, c.uploaded, c.verified, c.filename]),
    })
  }
  const certificateFiles: ArchiveAttachment[] = certRows.map(c => ({
    label: `Safe Environment Certificate - ${c.name} (${c.group})`,
    details: [
      `Role: ${c.role}`, `Program: ${c.program}`, `Completed: ${c.completed}   Expires: ${c.expires}`,
      `Status: ${c.status}`, `Uploaded: ${c.uploaded}`, `Verified: ${c.verified}`,
    ],
    url: c.url,
  }))

  if (letters.length > 0) {
    endSections.push({
      title: 'Letters of Good Standing',
      subtitle: 'Clergy / religious letters of good standing. Uploaded letters are attached in their own appendix.',
      columns: [
        { label: 'Name', weight: 14 }, { label: 'Type', weight: 8 }, { label: 'Method', weight: 9 },
        { label: 'Status', weight: 8 }, { label: 'Submitted To', weight: 16 }, { label: 'Uploaded', weight: 10 },
        { label: 'Verified', weight: 13 }, { label: 'Notes / Rejection', weight: 22 },
      ],
      rows: letters.map((l: any) => [
        l.participantName, humanize(l.participantType), humanize(l.submissionMethod), humanize(l.status),
        [l.submittedToContact, l.submittedToEmail].filter(Boolean).join(' · '), date(l.uploadedAt),
        l.verifiedAt ? `${date(l.verifiedAt)}${l.verifiedBy ? ` by ${fullName(l.verifiedBy)}` : ''}` : '—',
        [l.externalSubmissionNotes, l.rejectionReason].filter(Boolean).join(' — '),
      ]),
    })
  }
  const letterFiles: ArchiveAttachment[] = letters
    .filter((l: any) => l.fileUrl)
    .map((l: any) => ({
      label: `Letter of Good Standing - ${l.participantName}`,
      details: [`Type: ${humanize(l.participantType)}`, `Status: ${humanize(l.status)}`, `Uploaded: ${date(l.uploadedAt)}`],
      url: l.fileUrl,
    }))

  // ========== Housing ==========
  if (rooms.length > 0) {
    const sortedRooms = [...rooms].sort((a: any, b: any) =>
      (a.building.displayOrder - b.building.displayOrder) || a.building.name.localeCompare(b.building.name) ||
      a.floor - b.floor || a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }))
    endSections.push({
      title: 'Housing — Buildings & Rooms',
      columns: [
        { label: 'Building', weight: 13 }, { label: 'Room', weight: 7 }, { label: 'Floor', weight: 5 },
        { label: 'Purpose', weight: 8 }, { label: 'Gender', weight: 7 }, { label: 'Housing', weight: 9 },
        { label: 'Beds', weight: 5, align: 'right' }, { label: 'Capacity', weight: 6, align: 'right' },
        { label: 'Occupied', weight: 6, align: 'right' }, { label: 'ADA', weight: 10 }, { label: 'Allocated To', weight: 12 },
        { label: 'Notes', weight: 12 },
      ],
      rows: sortedRooms.map((r: any) => [
        r.building.name, r.roomNumber, String(r.floor), humanize(r.roomPurpose), humanize(r.gender), humanize(r.housingType),
        String(r.bedCount), String(r.capacity), String(r.currentOccupancy),
        r.isAdaAccessible ? `Yes${r.adaFeatures ? ` — ${r.adaFeatures}` : ''}` : 'No',
        r.allocatedToGroup?.groupName || '', txt(r.notes, ''),
      ]),
    })
  }
  if (roomAssignments.length > 0) {
    const rows = roomAssignments.map((a: any) => {
      const p: any = a.participantId ? participantById.get(a.participantId) : null
      const i: any = a.individualRegistrationId ? individualById.get(a.individualRegistrationId) : null
      return {
        sort: `${a.room.building.name}|${a.room.roomNumber.padStart(8, '0')}|${a.bedNumber ?? 0}`,
        cells: [
          a.room.building.name, a.room.roomNumber, a.bedNumber ? String.fromCharCode(64 + a.bedNumber) : '—',
          personLabel(a), p ? humanize(p.participantType) : i ? 'Individual' : a.groupRegistrationId ? 'Group' : '—',
          p ? participantGroup(p) : i ? 'Individual' : groupLabel(a.groupRegistrationId),
          humanize(p?.gender || i?.gender), date(a.assignedAt), txt(a.notes, ''),
        ],
      }
    }).sort((x: any, y: any) => x.sort.localeCompare(y.sort))
    endSections.push({
      title: 'Housing — Room Assignments',
      subtitle: 'Who stayed in which room and bed.',
      columns: [
        { label: 'Building', weight: 13 }, { label: 'Room', weight: 7 }, { label: 'Bed', weight: 4 },
        { label: 'Person', weight: 16 }, { label: 'Type', weight: 9 }, { label: 'Group', weight: 16 },
        { label: 'Gender', weight: 7 }, { label: 'Assigned', weight: 10 }, { label: 'Notes', weight: 18 },
      ],
      rows: rows.map((r: any) => r.cells),
    })
  }
  if (adaIndividuals.length > 0) {
    endSections.push({
      title: 'ADA / Accessibility Accommodations',
      columns: [
        { label: 'Name', weight: 15 }, { label: 'Gender', weight: 7 }, { label: 'Accessibility Need', weight: 35 },
        { label: 'Room', weight: 15 }, { label: 'Notes', weight: 28 },
      ],
      rows: adaIndividuals.map((a: any) => [
        a.name, humanize(a.gender), a.accessibilityNeed,
        a.room ? `${a.room.building?.name || ''} ${a.room.roomNumber}`.trim() : '—', txt(a.notes, ''),
      ]),
    })
  }

  // ========== Meals ==========
  if (mealGroups.length > 0) {
    endSections.push({
      title: 'Meal Groups',
      columns: [
        { label: 'Meal Group', weight: 14 }, { label: 'Color', weight: 9 }, { label: 'For', weight: 9 },
        { label: 'Breakfast', weight: 9 }, { label: 'Lunch', weight: 9 }, { label: 'Dinner', weight: 9 },
        { label: 'Sun. Breakfast', weight: 9 }, { label: 'Capacity', weight: 7, align: 'right' },
        { label: 'Size', weight: 6, align: 'right' }, { label: 'Assigned Registrations', weight: 19 },
      ],
      rows: mealGroups.map((m: any) => [
        m.name, m.color, humanize(m.accommodationType), txt(m.breakfastTime, ''), txt(m.lunchTime, ''),
        txt(m.dinnerTime, ''), txt(m.sundayBreakfastTime, ''), String(m.capacity), String(m.currentSize),
        m.assignments.map((a: any) => personLabel(a) + (a.participantCountOverride ? ` (${a.participantCountOverride})` : '')).join('; '),
      ]),
    })
  }
  if (mealColorAssignments.length > 0) {
    endSections.push({
      title: 'Meal Color Assignments',
      columns: [{ label: 'Group', weight: 50 }, { label: 'Meal Color', weight: 25 }, { label: 'Assigned', weight: 25 }],
      rows: mealColorAssignments
        .map((m: any) => [groupLabel(m.groupRegistrationId) || '—', humanize(m.color), date(m.assignedAt)])
        .sort((a: string[], b: string[]) => a[0].localeCompare(b[0])),
    })
  }
  if (mealTimes.length > 0) {
    endSections.push({
      title: 'Meal Times',
      columns: [{ label: 'Day', weight: 25 }, { label: 'Meal', weight: 25 }, { label: 'Color', weight: 25 }, { label: 'Time', weight: 25 }],
      rows: mealTimes.map((m: any) => [
        `${humanize(m.day)}${m.dayDate ? ` (${date(m.dayDate, false)})` : ''}`, humanize(m.meal), humanize(m.color), m.time,
      ]),
    })
  }

  // ========== Small groups, seating, Poros staff ==========
  if (smallGroups.length > 0) {
    endSections.push({
      title: 'Small Groups',
      columns: [
        { label: '#', weight: 4 }, { label: 'Small Group', weight: 12 }, { label: 'SGL', weight: 11 },
        { label: 'Co-SGL', weight: 11 }, { label: 'Meets', weight: 14 }, { label: 'Size', weight: 6, align: 'right' },
        { label: 'Members', weight: 30 }, { label: 'Notes', weight: 12 },
      ],
      rows: smallGroups.map((g: any) => [
        txt(g.groupNumber, ''), g.name, fullName(g.sgl) || '—', fullName(g.coSgl) || '—',
        [g.meetingTime, g.meetingPlace, g.meetingRoom && `${g.meetingRoom.building?.name || ''} ${g.meetingRoom.roomNumber}`.trim()].filter(Boolean).join(' · '),
        `${g.currentSize}/${g.capacity}`,
        g.assignments.map((a: any) => personLabel(a)).join('; '),
        txt(g.notes, ''),
      ]),
    })
  }
  if (seatingSections.length > 0) {
    endSections.push({
      title: 'Seating Sections',
      columns: [
        { label: 'Section', weight: 14 }, { label: 'Code', weight: 7 }, { label: 'Location', weight: 18 },
        { label: 'Capacity', weight: 7, align: 'right' }, { label: 'Occupied', weight: 7, align: 'right' },
        { label: 'Assigned Registrations', weight: 47 },
      ],
      rows: seatingSections.map((s: any) => [
        s.name, txt(s.sectionCode, ''), txt(s.locationDescription, ''), String(s.capacity), String(s.currentOccupancy),
        s.seatingAssignments.map((a: any) => personLabel(a) + (a.participantCountOverride ? ` (${a.participantCountOverride})` : '')).join('; '),
      ]),
    })
  }
  if (porosStaff.length > 0) {
    endSections.push({
      title: 'Small Group Leaders & Religious Staff',
      columns: [
        { label: 'Name', weight: 14 }, { label: 'Type', weight: 9 }, { label: 'Email', weight: 16 },
        { label: 'Phone', weight: 9 }, { label: 'Gender', weight: 6 }, { label: 'Diocese', weight: 12 },
        { label: 'Assigned Groups', weight: 20 }, { label: 'Notes', weight: 14 },
      ],
      rows: porosStaff.map((s: any) => [
        fullName(s), humanize(s.staffType), txt(s.email, ''), txt(s.phone, ''), humanize(s.gender), txt(s.diocese, ''),
        s.groupStaffAssignments.map((a: any) => `${groupLabel(a.groupRegistrationId)} (${humanize(a.role)})`).join('; '),
        txt(s.notes, ''),
      ]),
    })
  }

  // ========== T-shirts ==========
  const shirtCounts = new Map<string, number>()
  const addShirt = (size: string | null | undefined) => {
    const k = size ? String(size).toUpperCase() : 'Not specified'
    shirtCounts.set(k, (shirtCounts.get(k) || 0) + 1)
  }
  base.participants.filter(p => !groupById.get(p.groupRegistrationId)?.cancelledAt).forEach(p => addShirt(p.tShirtSize))
  base.individuals.filter(i => !i.cancelledAt).forEach(i => addShirt(i.tShirtSize))
  base.staff.forEach(s => addShirt(s.tshirtSize))
  if (shirtCounts.size > 0) {
    endSections.push({
      title: 'T-Shirt Size Totals',
      subtitle: 'Active participants, individual registrants, and staff (cancelled registrations excluded).',
      columns: [{ label: 'Size', weight: 50 }, { label: 'Count', weight: 50, align: 'right' }],
      rows: Array.from(shirtCounts.entries()).sort().map(([k, n]) => [k, String(n)]),
    })
  }

  // ========== Schedule & Poros content ==========
  if (scheduleEntries.length > 0) {
    endSections.push({
      title: 'Event Schedule',
      columns: [
        { label: 'Day', weight: 14 }, { label: 'Start', weight: 8 }, { label: 'End', weight: 8 },
        { label: 'Title', weight: 22 }, { label: 'Location', weight: 16 }, { label: 'Description', weight: 32 },
      ],
      rows: scheduleEntries.map((e: any) => [
        `${humanize(e.day)}${e.dayDate ? ` (${date(e.dayDate, false)})` : ''}`, e.startTime, txt(e.endTime, ''),
        e.title, txt(e.location, ''), txt(e.description, ''),
      ]),
    })
  }
  if (adoration.length > 0 || confession.length > 0) {
    endSections.push({
      title: 'Adoration & Confession Times',
      columns: [
        { label: 'Type', weight: 12 }, { label: 'Day', weight: 14 }, { label: 'Start', weight: 9 }, { label: 'End', weight: 9 },
        { label: 'Location', weight: 20 }, { label: 'Description', weight: 28 }, { label: 'Active', weight: 8 },
      ],
      rows: [
        ...adoration.map((a: any) => ['Adoration', humanize(a.day), a.startTime, txt(a.endTime, ''), a.location, txt(a.description, ''), yesNo(a.isActive)]),
        ...confession.map((c: any) => ['Confession', humanize(c.day), c.startTime, txt(c.endTime, ''), c.location, txt(c.description, ''), yesNo(c.isActive)]),
      ],
    })
  }
  if (announcements.length > 0 || infoItems.length > 0) {
    endSections.push({
      title: 'Announcements & Info Items',
      columns: [
        { label: 'Kind', weight: 10 }, { label: 'Title', weight: 18 }, { label: 'Type', weight: 8 },
        { label: 'Message / Content', weight: 44 }, { label: 'Shown', weight: 14 }, { label: 'Active', weight: 6 },
      ],
      rows: [
        ...announcements.map((a: any) => [
          'Announcement', a.title, humanize(a.type), a.message,
          a.startDate || a.endDate ? `${date(a.startDate)} – ${date(a.endDate)}` : '', yesNo(a.isActive),
        ]),
        ...infoItems.map((i: any) => ['Info', i.title, humanize(i.type), [i.content, i.url].filter(Boolean).join(' — '), '', yesNo(i.isActive)]),
      ],
    })
  }
  if (resources.length > 0 || schedulePdf) {
    endSections.push({
      title: 'Resources & Links',
      subtitle: 'Files stored in ChiRho Events are attached in the Event Documents appendix.',
      columns: [{ label: 'Name', weight: 25 }, { label: 'Type', weight: 10 }, { label: 'URL', weight: 57 }, { label: 'Active', weight: 8 }],
      rows: [
        ...(schedulePdf ? [[`Schedule PDF: ${schedulePdf.filename}`, 'PDF', schedulePdf.url, 'Yes']] : []),
        ...resources.map((r: any) => [r.name, humanize(r.type), r.url, yesNo(r.isActive)]),
      ],
    })
  }

  // ========== Pricing, day passes, coupons ==========
  if (pricing) {
    endSections.push({
      title: 'Pricing & Payment Settings',
      keyValues: recordFromRow(pricing),
      ...(dayPassOptions.length > 0 ? {
        columns: [
          { label: 'Day Pass', weight: 20 }, { label: 'Date', weight: 12 }, { label: 'Price', weight: 11, align: 'right' as const },
          { label: 'Youth', weight: 11, align: 'right' as const }, { label: 'Chaperone', weight: 11, align: 'right' as const },
          { label: 'Capacity', weight: 11, align: 'right' as const }, { label: 'Remaining', weight: 12, align: 'right' as const },
          { label: 'Active', weight: 12 },
        ],
        rows: dayPassOptions.map((d: any) => [
          d.name, date(d.date, false), money(d.price), d.youthPrice != null ? money(d.youthPrice) : '—',
          d.chaperonePrice != null ? money(d.chaperonePrice) : '—', String(d.capacity), String(d.remaining), yesNo(d.isActive),
        ]),
      } : {}),
    })
  }
  if (coupons.length > 0) {
    endSections.push({
      title: 'Coupon Codes',
      columns: [
        { label: 'Code', weight: 11 }, { label: 'Name', weight: 18 }, { label: 'Discount', weight: 10 },
        { label: 'Limit', weight: 10 }, { label: 'Used', weight: 7, align: 'right' }, { label: 'Stackable', weight: 8 },
        { label: 'Restricted To', weight: 16 }, { label: 'Expires', weight: 12 }, { label: 'Active', weight: 8 },
      ],
      rows: coupons.map((c: any) => [
        c.code, c.name,
        c.discountType === 'percentage' ? `${Number(c.discountValue)}%` : money(c.discountValue),
        c.maxUses ? `${humanize(c.usageLimitType)} (${c.maxUses})` : humanize(c.usageLimitType),
        String(c.usageCount), yesNo(c.isStackable), txt(c.restrictToEmail, ''), date(c.expirationDate), yesNo(c.active),
      ]),
    })
  }

  // ========== Surveys ==========
  for (const s of surveys) {
    const questionById = new Map(s.questions.map((q: any) => [q.id, q]))
    const keyValues: Array<[string, string]> = [
      ['Status:', humanize(s.status)],
      ['Description:', txt(s.description)],
      ['Sent To:', [s.sendToParticipants && 'Participants', s.sendToGroupLeaders && 'Group leaders', s.sendToStaff && 'Staff'].filter(Boolean).join(', ') || '—'],
      ['Anonymous:', yesNo(s.isAnonymous)],
      ['Recipients / Responses:', `${s._count?.recipients ?? 0} / ${s.responses.length}`],
      ['Closes:', date(s.closesAt)],
      ...s.questions.map((q: any, n: number) => [
        `Question ${n + 1}:`,
        `${q.questionText}  [${humanize(q.questionType)}${Array.isArray(q.options) && q.options.length ? `: ${q.options.join(' / ')}` : ''}${q.scaleMin != null ? ` ${q.scaleMin}–${q.scaleMax}` : ''}]`,
      ] as [string, string]),
    ]
    const rows: string[][] = []
    for (const r of s.responses) {
      const who = s.isAnonymous ? 'Anonymous' : [r.recipient?.name, r.recipient?.email].filter(Boolean).join(' · ') || 'Public link'
      for (const a of r.answers) {
        let answer = txt(a.answerText, '')
        if (answer.startsWith('[')) {
          try { answer = (JSON.parse(answer) as string[]).join(', ') } catch { /* keep raw */ }
        }
        rows.push([date(r.submittedAt), who, (questionById.get(a.questionId) as any)?.questionText || 'Deleted question', answer])
      }
    }
    endSections.push({
      title: `Survey: ${s.title}`,
      keyValues,
      columns: [{ label: 'Submitted', weight: 12 }, { label: 'Respondent', weight: 18 }, { label: 'Question', weight: 30 }, { label: 'Answer', weight: 40 }],
      rows,
    })
  }

  // ========== Name tags & welcome packet ==========
  if (nameTagTemplate) {
    const t: any = nameTagTemplate.settingsJson || {}
    const templateKv: Array<[string, string]> = [
      ...recordFromRow(nameTagTemplate),
      ...Object.entries(t)
        .filter(([, v]) => v !== '' && v !== null && v !== undefined)
        .map(([k, v]) => [`Designer: ${labelize(k)}:`, formatValue(v)] as [string, string]),
    ]
    const sampleP: any = base.participants.find(p => !groupById.get(p.groupRegistrationId)?.cancelledAt) || null
    const sampleGroup: any = sampleP ? groupById.get(sampleP.groupRegistrationId) : null
    const sampleMeal: any = sampleGroup ? mealColorAssignments.find((m: any) => m.groupRegistrationId === sampleGroup.id) : null
    endSections.push({
      title: 'Name Tag Template',
      subtitle: 'Settings used to print name tags, with a mock-up of one tag using a real participant.',
      keyValues: templateKv,
      nameTagSample: {
        headerText: t.conferenceHeaderText || event?.name || '',
        name: sampleP ? (sampleP.preferredName || sampleP.firstName) + ` ${sampleP.lastName}` : 'Participant Name',
        groupLine: (t.showGroup ?? nameTagTemplate.showParish) ? sampleGroup?.parishName || sampleGroup?.groupName || 'Parish / Group' : null,
        roleLine: (t.showParticipantType ?? nameTagTemplate.showRole) ? humanize(sampleP?.participantType || 'youth') : null,
        housingLine: (t.showHousing ?? nameTagTemplate.showHousing) ? 'Housing: Building / Room' : null,
        mealColorHex: (t.showMealColor ?? nameTagTemplate.showMealColor) ? (sampleMeal ? mealHexFor(sampleMeal.color) : '#6B7280') : null,
        mealColorLabel: sampleMeal ? humanize(sampleMeal.color) : 'Meal color',
        showQrCode: t.showQrCode ?? nameTagTemplate.showQrCode,
        backgroundColor: t.backgroundColor || '#FFFFFF',
        textColor: t.textColor || nameTagTemplate.textColor || '#1E3A5F',
        accentColor: t.accentColor || nameTagTemplate.accentColor || '#9C8466',
      },
    })
  }
  if (welcomeSettings || welcomeInserts.length > 0) {
    endSections.push({
      title: 'Welcome Packet',
      keyValues: welcomeSettings ? recordFromRow(welcomeSettings) : [],
      ...(welcomeInserts.length > 0 ? {
        columns: [{ label: 'Insert', weight: 30 }, { label: 'Type', weight: 10 }, { label: 'File', weight: 50 }, { label: 'Active', weight: 10 }],
        rows: welcomeInserts.map((w: any) => [w.name, humanize(w.fileType), w.fileUrl, yesNo(w.isActive)]),
      } : {}),
    })
  }

  // ========== Event details & settings ==========
  if (event || eventSettings) {
    endSections.push({
      title: 'Event Details & Settings',
      subtitle: 'Event configuration as it stood when this report was generated.',
      keyValues: [
        ...(event ? recordFromRow(event) : []),
        ...(eventSettings ? recordFromRow(eventSettings).map(([k, v]) => [`Setting: ${k}`, v] as [string, string]) : []),
      ],
    })
  }

  // ========== Event documents (attached files) ==========
  const eventDocuments: ArchiveAttachment[] = []
  for (const w of welcomeInserts) {
    eventDocuments.push({ label: `Welcome Packet Insert - ${w.name}`, details: [`Type: ${humanize(w.fileType)}`], url: w.fileUrl })
  }
  if (welcomeSettings?.campusMapUrl) {
    eventDocuments.push({ label: 'Campus Map', details: [], url: welcomeSettings.campusMapUrl })
  }
  if (welcomeSettings?.emergencyProceduresUrl) {
    eventDocuments.push({ label: 'Emergency Procedures', details: [], url: welcomeSettings.emergencyProceduresUrl })
  }
  if (schedulePdf) {
    eventDocuments.push({ label: `Event Schedule - ${schedulePdf.filename}`, details: [], url: schedulePdf.url })
  }
  for (const r of resources) {
    // External links are listed in Resources & Links; only our own stored files are embedded.
    if (isStoredFileUrl(r.url)) {
      eventDocuments.push({ label: `Resource - ${r.name}`, details: [`Type: ${humanize(r.type)}`], url: r.url })
    }
  }

  return { registrationSections, endSections, certificateFiles, letterFiles, eventDocuments, event }
}

const MEAL_COLOR_HEX: Record<string, string> = {
  blue: '#3498db', red: '#e74c3c', orange: '#e67e22', yellow: '#f1c40f', green: '#27ae60',
  purple: '#9b59b6', brown: '#8b4513', grey: '#95a5a6', gray: '#95a5a6',
}

function mealHexFor(color: string): string {
  return MEAL_COLOR_HEX[String(color).toLowerCase()] ?? '#6B7280'
}
