/**
 * Family registration for faith formation: one household, one or more
 * people, each into a program (different people can pick different
 * programs). Household details are entered once.
 *
 * Programs can be for children (parents register their kids), adults (OCIA:
 * the person registers themselves) or whole families. A program can charge
 * per person or once per family, and can offer class times to choose from.
 * The "children" naming below is historical: an entry can be an adult.
 */

import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { GRADE_OPTIONS } from '@/lib/lux/format'
import { calculateFamilyFees, type FeeItem, type FeeRules } from '@/lib/lux/family-fees'
import { programIsOpen } from '@/lib/lux/program-server'
import { parseSessions, type ProgramQuestion } from '@/lib/lux/program-templates'
import type { FamilySession } from '@/lib/lux/family-session'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export interface HouseholdInput {
  guardian1FirstName: string
  guardian1LastName: string
  guardian1Relationship: string | null
  email: string
  phone: string
  street: string | null
  city: string | null
  state: string | null
  zip: string | null
  guardian2FirstName: string | null
  guardian2LastName: string | null
  guardian2Relationship: string | null
  guardian2Email: string | null
  guardian2Phone: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  registeredParishioner: boolean | null
}

export interface ChildInput {
  key: string
  childId: string | null
  firstName: string
  lastName: string
  dateOfBirth: string | null
  gender: string | null
  grade: string | null
  school: string | null
  baptized: boolean | null
  baptismDate: string | null
  baptismParish: string | null
  baptismCity: string | null
  baptizedAtThisParish: boolean
  firstCommunionDate: string | null
  firstCommunionParish: string | null
  allergies: string | null
  medicalNotes: string | null
  programId: string
  // Set from the program: adults register for adult programs
  isAdult: boolean
  sessionId: string | null
  answers: Record<string, string | string[]>
  sponsor: { name: string; email: string; phone: string; parish: string; relationship: string } | null
}

export interface FamilyRegistrationInput {
  household: HouseholdInput
  children: ChildInput[]
  paymentMethod: 'card' | 'office'
  feeAssistance: { requested: boolean; note: string | null }
  // The language the family registered in; Lux emails them in it
  language: 'en' | 'es'
}

const s = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t ? t.slice(0, max) : null
}
const bool = (v: unknown): boolean | null => (v === true ? true : v === false ? false : null)
const date = (v: unknown): string | null => (typeof v === 'string' && DATE_RE.test(v) ? v : null)

export function parseFamilyInput(raw: any): { ok: true; value: FamilyRegistrationInput } | { ok: false; error: string } {
  const h = raw?.household ?? {}
  const household: HouseholdInput = {
    guardian1FirstName: s(h.guardian1FirstName, 100) ?? '',
    guardian1LastName: s(h.guardian1LastName, 100) ?? '',
    guardian1Relationship: s(h.guardian1Relationship, 50),
    email: (s(h.email, 255) ?? '').toLowerCase(),
    phone: s(h.phone, 30) ?? '',
    street: s(h.street, 255),
    city: s(h.city, 100),
    state: s(h.state, 50),
    zip: s(h.zip, 20),
    guardian2FirstName: s(h.guardian2FirstName, 100),
    guardian2LastName: s(h.guardian2LastName, 100),
    guardian2Relationship: s(h.guardian2Relationship, 50),
    guardian2Email: s(h.guardian2Email, 255)?.toLowerCase() ?? null,
    guardian2Phone: s(h.guardian2Phone, 30),
    emergencyContactName: s(h.emergencyContactName, 255),
    emergencyContactPhone: s(h.emergencyContactPhone, 30),
    registeredParishioner: bool(h.registeredParishioner),
  }
  if (!household.guardian1FirstName || !household.guardian1LastName) return { ok: false, error: 'Please enter the parent or guardian’s name.' }
  if (!EMAIL_RE.test(household.email)) return { ok: false, error: 'Please enter a valid email address.' }
  if (!household.phone) return { ok: false, error: 'Please enter a phone number.' }
  if (household.guardian2Email && !EMAIL_RE.test(household.guardian2Email)) return { ok: false, error: 'The second guardian’s email doesn’t look right.' }

  const rawChildren: any[] = Array.isArray(raw?.children) ? raw.children : []
  if (rawChildren.length === 0) return { ok: false, error: 'Add at least one person to register.' }
  if (rawChildren.length > 15) return { ok: false, error: 'Please register up to 15 people at a time.' }

  const children: ChildInput[] = []
  for (const [index, c] of rawChildren.entries()) {
    const firstName = s(c?.firstName, 100)
    const lastName = s(c?.lastName, 100) ?? household.guardian1LastName
    if (!firstName) return { ok: false, error: `Please enter person ${index + 1}’s first name.` }
    if (typeof c?.programId !== 'string' || !c.programId) return { ok: false, error: `Choose a program for ${firstName}.` }
    const grade = typeof c?.grade === 'string' && GRADE_OPTIONS.includes(c.grade) ? c.grade : null
    const answers: Record<string, string | string[]> = {}
    if (c?.answers && typeof c.answers === 'object') {
      for (const [k, v] of Object.entries(c.answers)) {
        if (typeof v === 'string') answers[k.slice(0, 40)] = v.slice(0, 2000)
        else if (Array.isArray(v)) answers[k.slice(0, 40)] = v.filter(x => typeof x === 'string').map(x => (x as string).slice(0, 200))
      }
    }
    const sponsor = c?.sponsor && typeof c.sponsor === 'object' && s(c.sponsor.name, 255)
      ? {
          name: s(c.sponsor.name, 255)!,
          email: s(c.sponsor.email, 255) ?? '',
          phone: s(c.sponsor.phone, 30) ?? '',
          parish: s(c.sponsor.parish, 255) ?? '',
          relationship: s(c.sponsor.relationship, 100) ?? '',
        }
      : null
    children.push({
      key: s(c?.key, 40) ?? String(index),
      childId: typeof c?.childId === 'string' ? c.childId : null,
      firstName,
      lastName,
      dateOfBirth: date(c?.dateOfBirth),
      gender: s(c?.gender, 20),
      grade,
      school: s(c?.school, 255),
      baptized: bool(c?.baptized),
      baptismDate: date(c?.baptismDate),
      baptismParish: s(c?.baptismParish, 255),
      baptismCity: s(c?.baptismCity, 255),
      baptizedAtThisParish: c?.baptizedAtThisParish === true,
      firstCommunionDate: date(c?.firstCommunionDate),
      firstCommunionParish: s(c?.firstCommunionParish, 255),
      allergies: s(c?.allergies, 2000),
      medicalNotes: s(c?.medicalNotes, 2000),
      programId: c.programId,
      isAdult: c?.isAdult === true,
      sessionId: typeof c?.sessionId === 'string' && c.sessionId ? c.sessionId.slice(0, 40) : null,
      answers,
      sponsor,
    })
  }

  return {
    ok: true,
    value: {
      household,
      children,
      paymentMethod: raw?.paymentMethod === 'office' ? 'office' : 'card',
      feeAssistance: { requested: raw?.feeAssistance?.requested === true, note: s(raw?.feeAssistance?.note, 2000) },
      language: raw?.language === 'es' ? 'es' : 'en',
    },
  }
}

// ---------------------------------------------------------------------------
// Programs and prices
// ---------------------------------------------------------------------------

export async function loadOpenPrograms(organizationId: string, ids?: string[]) {
  const programs = await prisma.luxProgram.findMany({
    where: { organizationId, status: 'open', ...(ids ? { id: { in: ids } } : {}) },
    include: { requirements: { orderBy: { displayOrder: 'asc' } } },
    orderBy: [{ term: 'desc' }, { name: 'asc' }],
  })
  const counts = await prisma.luxProgramRegistration.groupBy({
    by: ['programId', 'sessionId'],
    where: { programId: { in: programs.map(p => p.id) }, cancelledAt: null },
    _count: { _all: true },
  })
  return programs
    .filter(p => programIsOpen(p))
    .map(p => {
      const mine = counts.filter(c => c.programId === p.id)
      const registered = mine.reduce((sum, c) => sum + c._count._all, 0)
      const spotsLeft = p.capacity === null ? null : Math.max(0, p.capacity - registered)
      return {
        ...p,
        registered,
        spotsLeft,
        feeItemsList: (Array.isArray(p.feeItems) ? p.feeItems : []) as unknown as FeeItem[],
        questionsList: (Array.isArray(p.questions) ? p.questions : []) as unknown as ProgramQuestion[],
        gradesList: (Array.isArray(p.grades) ? p.grades : null) as string[] | null,
        sessionsList: parseSessions(p.sessions).map(sess => {
          const taken = mine.find(c => c.sessionId === sess.id)?._count._all ?? 0
          const left = sess.capacity === null ? null : Math.max(0, sess.capacity - taken)
          return { ...sess, spotsLeft: spotsLeft !== null && (left === null || spotsLeft < left) ? spotsLeft : left }
        }),
        perFamily: p.feeType === 'per_family',
      }
    })
}
export type OpenProgram = Awaited<ReturnType<typeof loadOpenPrograms>>[number]

/** What the household already has this term, for sibling ranking and the family maximum */
async function priorsForTerm(householdId: string | null, term: string, excludeChildIds: string[]) {
  if (!householdId) return { priorDiscountedChildren: 0, priorChargesTowardCap: 0 }
  const existing = await prisma.luxProgramRegistration.findMany({
    where: { householdId, term, cancelledAt: null, status: { not: 'cancelled' } },
    select: { childId: true, feeAmount: true, program: { select: { siblingDiscountApplies: true, countsTowardFamilyCap: true, feeType: true } } },
  })
  const discountedChildren = new Set(
    existing
      .filter(r => r.program.siblingDiscountApplies && r.program.feeType !== 'per_family' && !excludeChildIds.includes(r.childId))
      .map(r => r.childId)
  )
  return {
    priorDiscountedChildren: discountedChildren.size,
    priorChargesTowardCap: existing.filter(r => r.program.countsTowardFamilyCap).reduce((sum, r) => sum + Number(r.feeAmount), 0),
  }
}

export interface QuoteLine {
  key: string
  childKey: string
  childName: string
  programId: string
  programName: string
  term: string
  tuition: number
  feeItems: FeeItem[]
  base: number
  siblingDiscount: number
  capAdjustment: number
  total: number
  // One fee per family: carried by the first person; the rest are covered
  perFamily?: boolean
  coveredByFamilyFee?: boolean
  // The family already paid this program's family fee on an earlier registration
  familyFeeAlreadyPaid?: boolean
}

export interface Quote {
  lines: QuoteLine[]
  subtotal: number
  siblingDiscount: number
  familyCapAdjustment: number
  total: number
}

/**
 * Price an order. Children are matched to the household's existing children
 * (by id with a verified session, otherwise by name and birth date) so
 * siblings registered earlier this term count.
 */
export async function quoteFamily(params: {
  programs: OpenProgram[]
  children: Array<Pick<ChildInput, 'key' | 'firstName' | 'lastName' | 'programId'> & { existingChildId?: string | null }>
  householdId: string | null
  rules: FeeRules
}): Promise<Quote> {
  const byTerm = new Map<string, typeof params.children>()
  for (const child of params.children) {
    const program = params.programs.find(p => p.id === child.programId)
    if (!program) continue
    byTerm.set(program.term, [...(byTerm.get(program.term) || []), child])
  }

  // Family-fee programs this household already paid for (someone is registered)
  const familyPrograms = params.programs.filter(p => p.feeType === 'per_family').map(p => p.id)
  const paidFamilyPrograms = new Set(
    params.householdId && familyPrograms.length
      ? (await prisma.luxProgramRegistration.findMany({
          where: { householdId: params.householdId, programId: { in: familyPrograms }, cancelledAt: null, status: 'registered' },
          select: { programId: true },
        })).map(r => r.programId)
      : []
  )

  const lines: QuoteLine[] = []
  for (const [term, children] of byTerm) {
    const childKey = (c: (typeof children)[number]) =>
      c.existingChildId || `${c.firstName.trim().toLowerCase()}|${c.lastName.trim().toLowerCase()}`
    const priors = await priorsForTerm(
      params.householdId,
      term,
      children.map(c => c.existingChildId).filter(Boolean) as string[]
    )
    const programOf = (c: (typeof children)[number]) => params.programs.find(p => p.id === c.programId)!
    const perPerson = children.filter(c => programOf(c).feeType !== 'per_family')
    const familyGroups = new Map<string, typeof children>()
    for (const c of children.filter(c => programOf(c).feeType === 'per_family')) {
      familyGroups.set(c.programId, [...(familyGroups.get(c.programId) || []), c])
    }

    const result = calculateFamilyFees({
      rules: params.rules,
      ...priors,
      lines: [
        ...perPerson.map(c => {
          const program = programOf(c)
          return {
            key: c.key,
            childKey: childKey(c),
            tuition: Number(program.tuitionPerChild),
            feeItems: program.feeItemsList,
            siblingDiscountApplies: program.siblingDiscountApplies,
            countsTowardFamilyCap: program.countsTowardFamilyCap,
          }
        }),
        ...[...familyGroups.keys()].map(programId => {
          const program = params.programs.find(p => p.id === programId)!
          const alreadyPaid = paidFamilyPrograms.has(programId)
          return {
            key: `family:${programId}`,
            childKey: `family:${programId}`,
            tuition: alreadyPaid ? 0 : Number(program.tuitionPerChild),
            feeItems: alreadyPaid ? [] : program.feeItemsList,
            siblingDiscountApplies: false,
            countsTowardFamilyCap: program.countsTowardFamilyCap,
          }
        }),
      ],
    })

    const zero = { base: 0, siblingDiscount: 0, capAdjustment: 0, total: 0 }
    for (const c of children) {
      const program = programOf(c)
      const base = {
        key: c.key,
        childName: `${c.firstName} ${c.lastName}`.trim(),
        programId: program.id,
        programName: program.name,
        term,
        tuition: Number(program.tuitionPerChild),
        feeItems: program.feeItemsList,
      }
      if (program.feeType === 'per_family') {
        const group = familyGroups.get(program.id)!
        const line = result.lines.find(l => l.key === `family:${program.id}`)!
        const first = group[0].key === c.key
        lines.push({
          ...base,
          childKey: line.childKey,
          ...(first ? { base: line.base, siblingDiscount: line.siblingDiscount, capAdjustment: line.capAdjustment, total: line.total } : zero),
          perFamily: true,
          coveredByFamilyFee: !first,
          familyFeeAlreadyPaid: paidFamilyPrograms.has(program.id),
        })
      } else {
        const line = result.lines.find(l => l.key === c.key)!
        lines.push({ ...base, childKey: line.childKey, base: line.base, siblingDiscount: line.siblingDiscount, capAdjustment: line.capAdjustment, total: line.total })
      }
    }
  }

  const sum = (f: (l: QuoteLine) => number) => Math.round(lines.reduce((acc, l) => acc + f(l), 0) * 100) / 100
  return {
    lines,
    subtotal: sum(l => l.base),
    siblingDiscount: sum(l => l.siblingDiscount),
    familyCapAdjustment: sum(l => l.capAdjustment),
    total: sum(l => l.total),
  }
}

/** Validate children against the programs they picked (open, grade, required answers, sponsor) */
export function checkChildrenAgainstPrograms(children: ChildInput[], programs: OpenProgram[]): string | null {
  const seen = new Set<string>()
  for (const child of children) {
    const program = programs.find(p => p.id === child.programId)
    if (!program) return `${child.firstName}’s program isn’t open for registration right now.`
    if (!child.isAdult && program.gradesList && (!child.grade || !program.gradesList.includes(child.grade))) {
      return `${program.name} is for grades ${program.gradesList.join(', ')}. Please check ${child.firstName}’s grade.`
    }
    if (program.sessionsList.length > 0) {
      const session = program.sessionsList.find(sess => sess.id === child.sessionId)
      if (!session) return `Choose a class time for ${child.firstName} in ${program.name}.`
      if (!child.isAdult && session.grades && (!child.grade || !session.grades.includes(child.grade))) {
        return `${session.name} is for grades ${session.grades.join(', ')}. Please choose another class time for ${child.firstName}.`
      }
    }
    const dupKey = `${child.childId || `${child.firstName.toLowerCase()}|${child.lastName.toLowerCase()}`}|${child.programId}`
    if (seen.has(dupKey)) return `${child.firstName} is listed twice for ${program.name}.`
    seen.add(dupKey)
    for (const q of program.questionsList) {
      const answer = child.answers[q.id]
      if (q.required && (!answer || (Array.isArray(answer) && answer.length === 0))) {
        return `Please answer “${q.label}” for ${child.firstName}.`
      }
    }
    if (program.collectSponsor && !child.sponsor) return `Please enter ${child.firstName}’s sponsor.`
  }
  return null
}

// ---------------------------------------------------------------------------
// Saving
// ---------------------------------------------------------------------------

function confirmationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return `LUX-${Array.from(randomBytes(6)).map(b => chars[b % chars.length]).join('')}`
}

const utcDate = (d: string | null) => (d ? new Date(`${d}T00:00:00Z`) : null)

function childData(c: ChildInput) {
  return {
    firstName: c.firstName,
    lastName: c.lastName,
    dateOfBirth: utcDate(c.dateOfBirth),
    gender: c.gender,
    grade: c.grade,
    school: c.school,
    baptized: c.baptized,
    baptismDate: utcDate(c.baptismDate),
    baptismParish: c.baptismParish,
    baptismCity: c.baptismCity,
    baptizedAtThisParish: c.baptizedAtThisParish,
    firstCommunionDate: utcDate(c.firstCommunionDate),
    firstCommunionParish: c.firstCommunionParish,
    allergies: c.allergies,
    medicalNotes: c.medicalNotes,
    isAdult: c.isAdult,
  }
}

function householdData(h: HouseholdInput, language: 'en' | 'es') {
  return { ...h, emailNormalized: h.email.trim().toLowerCase(), preferredLanguage: language }
}

export class RegistrationError extends Error {}

export interface RegisterResult {
  orderId: string
  confirmationCode: string
  payToken: string
  householdId: string
  status: string
  total: number
  amountDue: number
  quote: Quote
  // What kind of session this browser should get
  sessionScope: 'household' | 'order'
  uploads: Array<{ submissionId: string; childKey: string; childName: string; programName: string; requirementKey: string; label: string; description: string | null; required: boolean; status: string }>
}

/**
 * Save a family's registration. Household details are only updated when
 * the person is signed in to that family (a family link) or the household
 * is new; someone typing an email that's already on file adds children and
 * registrations to that family but can't change or see its details.
 */
export async function registerFamily(params: {
  organizationId: string
  input: FamilyRegistrationInput
  session: FamilySession | null
  rules: FeeRules
  paymentsReady: boolean
}): Promise<RegisterResult> {
  const { organizationId, input, rules } = params
  const programIds = [...new Set(input.children.map(c => c.programId))]
  const programs = await loadOpenPrograms(organizationId, programIds)
  // Adults register for adult programs; everyone else is a child here
  for (const c of input.children) {
    const program = programs.find(p => p.id === c.programId)
    c.isAdult = program?.audience === 'adults'
    if (c.isAdult) c.grade = null
    if (program && program.sessionsList.length === 0) c.sessionId = null
    // OCIA asks "Have you been baptized?" with more detail; keep the yes/no on the person too
    const background = c.answers?.baptism_background
    if (c.baptized === null && typeof background === 'string' && background) {
      c.baptized = background.startsWith('Yes') ? true : background === 'No' ? false : null
    }
  }
  const problem = checkChildrenAgainstPrograms(input.children, programs)
  if (problem) throw new RegistrationError(problem)

  // --- Household ------------------------------------------------------------
  const email = input.household.email
  const verifiedHouseholdId = params.session && params.session.organizationId === organizationId && !params.session.orderId
    ? params.session.householdId
    : null
  let household = verifiedHouseholdId
    ? await prisma.luxHousehold.findUnique({ where: { id: verifiedHouseholdId } })
    : await prisma.luxHousehold.findUnique({ where: { lux_household_org_email: { organizationId, emailNormalized: email } } })
  const isNewHousehold = !household
  const canEditHousehold = isNewHousehold || (!!verifiedHouseholdId && household?.id === verifiedHouseholdId)

  if (household && canEditHousehold) {
    if (household.emailNormalized !== email) {
      const other = await prisma.luxHousehold.findUnique({ where: { lux_household_org_email: { organizationId, emailNormalized: email } } })
      if (other && other.id !== household.id) {
        throw new RegistrationError('That email is already used by another family on file. Please contact the parish office.')
      }
    }
    household = await prisma.luxHousehold.update({ where: { id: household.id }, data: householdData(input.household, input.language) })
  } else if (!household) {
    household = await prisma.luxHousehold.create({ data: { organizationId, ...householdData(input.household, input.language) } })
  }
  const householdId = household.id

  // --- Children ---------------------------------------------------------------
  const existingChildren = await prisma.luxChild.findMany({ where: { householdId, archivedAt: null } })
  const childIdByKey = new Map<string, string>()
  for (const c of input.children) {
    const sameChildEarlier = input.children.find(o => o !== c && childIdByKey.has(o.key) &&
      o.firstName.toLowerCase() === c.firstName.toLowerCase() && o.lastName.toLowerCase() === c.lastName.toLowerCase())
    if (sameChildEarlier) {
      childIdByKey.set(c.key, childIdByKey.get(sameChildEarlier.key)!)
      continue
    }
    let match = canEditHousehold && c.childId ? existingChildren.find(e => e.id === c.childId) : undefined
    match ??= existingChildren.find(e =>
      e.firstName.toLowerCase() === c.firstName.toLowerCase() &&
      e.lastName.toLowerCase() === c.lastName.toLowerCase() &&
      (!c.dateOfBirth || !e.dateOfBirth || e.dateOfBirth.toISOString().slice(0, 10) === c.dateOfBirth))
    if (match) {
      if (canEditHousehold) await prisma.luxChild.update({ where: { id: match.id }, data: childData(c) })
      childIdByKey.set(c.key, match.id)
    } else {
      const created = await prisma.luxChild.create({ data: { organizationId, householdId, ...childData(c) } })
      childIdByKey.set(c.key, created.id)
    }
  }
  const childRows = await prisma.luxChild.findMany({ where: { id: { in: [...new Set(childIdByKey.values())] } } })

  // --- Already registered? ------------------------------------------------------
  const existingRegistrations = await prisma.luxProgramRegistration.findMany({
    where: { programId: { in: programIds }, childId: { in: childRows.map(c => c.id) } },
    include: { order: { select: { id: true, status: true, amountPaid: true } } },
  })
  for (const c of input.children) {
    const childId = childIdByKey.get(c.key)!
    const existing = existingRegistrations.find(r => r.programId === c.programId && r.childId === childId)
    if (!existing || existing.cancelledAt) continue
    const abandonedCard = existing.status === 'pending_payment' && existing.order?.status === 'pending_payment' && Number(existing.order.amountPaid) === 0
    if (!abandonedCard) {
      const program = programs.find(p => p.id === c.programId)!
      throw new RegistrationError(`${c.firstName} is already registered for ${program.name}.`)
    }
  }
  // Card checkouts this family started and never finished are replaced
  const abandonedOrderIds = [...new Set(existingRegistrations
    .filter(r => !r.cancelledAt && r.status === 'pending_payment' && r.order?.status === 'pending_payment' && Number(r.order.amountPaid) === 0)
    .map(r => r.order!.id))]
  if (abandonedOrderIds.length) await cancelUnpaidOrders(abandonedOrderIds)

  // --- Price it -------------------------------------------------------------------
  const quote = await quoteFamily({
    programs,
    householdId,
    rules,
    children: input.children.map(c => ({ ...c, existingChildId: childIdByKey.get(c.key) })),
  })
  const total = quote.total
  const assistanceAllowed = input.children.some(c => programs.find(p => p.id === c.programId)?.feeAssistanceEnabled)
  const wantsAssistance = input.feeAssistance.requested && assistanceAllowed && total > 0

  const chosen = programs.filter(p => programIds.includes(p.id))
  let method: 'none' | 'card' | 'office'
  if (total <= 0 || wantsAssistance) method = 'none'
  else if (input.paymentMethod === 'office' && chosen.every(p => p.payAtOfficeEnabled)) method = 'office'
  else if (chosen.every(p => p.onlinePaymentEnabled) && params.paymentsReady) method = 'card'
  else if (chosen.every(p => p.payAtOfficeEnabled)) method = 'office'
  else throw new RegistrationError('Online payment isn’t available right now. Please contact the parish office to register.')

  const orderStatus = total <= 0 ? 'paid'
    : wantsAssistance ? 'assistance_requested'
    : method === 'office' ? 'office_pending'
    : 'pending_payment'
  const registrationStatus = method === 'card' ? 'pending_payment' : 'registered'

  // --- Save, holding the program rows so capacity can't be oversold ---------------
  const result = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM lux_programs WHERE id = ANY(${programIds}::uuid[]) FOR UPDATE`
    for (const program of chosen) {
      if (program.capacity === null) continue
      const taken = await tx.luxProgramRegistration.count({ where: { programId: program.id, cancelledAt: null } })
      const adding = input.children.filter(c => c.programId === program.id).length
      if (taken + adding > program.capacity) {
        const left = Math.max(0, program.capacity - taken)
        throw new RegistrationError(left === 0
          ? `Sorry, ${program.name} is full.`
          : `Sorry, ${program.name} only has ${left} spot${left === 1 ? '' : 's'} left.`)
      }
    }
    for (const program of chosen) {
      for (const session of program.sessionsList) {
        if (session.capacity === null) continue
        const adding = input.children.filter(c => c.programId === program.id && c.sessionId === session.id).length
        if (!adding) continue
        const taken = await tx.luxProgramRegistration.count({ where: { programId: program.id, sessionId: session.id, cancelledAt: null } })
        if (taken + adding > session.capacity) {
          const left = Math.max(0, session.capacity - taken)
          throw new RegistrationError(left === 0
            ? `Sorry, ${session.name} (${program.name}) is full. Please choose another class time.`
            : `Sorry, ${session.name} (${program.name}) only has ${left} spot${left === 1 ? '' : 's'} left.`)
        }
      }
    }

    const order = await tx.luxOrder.create({
      data: {
        organizationId,
        householdId,
        confirmationCode: confirmationCode(),
        payToken: randomBytes(24).toString('hex'),
        subtotal: quote.subtotal,
        siblingDiscount: quote.siblingDiscount,
        familyCapAdjustment: quote.familyCapAdjustment,
        total,
        amountDue: total,
        amountPaid: 0,
        paymentMethod: method,
        status: orderStatus,
        feeAssistanceRequested: wantsAssistance,
        feeAssistanceNote: wantsAssistance ? input.feeAssistance.note : null,
        feeAssistanceStatus: wantsAssistance ? 'requested' : 'none',
        breakdown: quote as any,
      },
    })

    const uploads: RegisterResult['uploads'] = []
    for (const c of input.children) {
      const childId = childIdByKey.get(c.key)!
      const program = programs.find(p => p.id === c.programId)!
      const line = quote.lines.find(l => l.key === c.key)!
      const data = {
        organizationId,
        householdId,
        orderId: order.id,
        term: program.term,
        status: registrationStatus,
        grade: c.grade,
        sessionId: c.sessionId,
        feeAmount: line.total,
        discountAmount: Math.round((line.siblingDiscount + line.capAdjustment) * 100) / 100,
        answers: c.answers as any,
        sponsorInfo: (c.sponsor ?? undefined) as any,
        cancelledAt: null,
      }
      const previous = existingRegistrations.find(r => r.programId === c.programId && r.childId === childId)
      const registration = previous
        ? await tx.luxProgramRegistration.update({ where: { id: previous.id }, data })
        : await tx.luxProgramRegistration.create({ data: { ...data, programId: program.id, childId } })

      const child = childRows.find(r => r.id === childId)!
      for (const requirement of program.requirements) {
        // Reuse a document already approved for this child (e.g. last year's baptismal certificate)
        const onFile = await tx.luxDocumentSubmission.findFirst({
          where: { childId, status: 'approved', storageRef: { not: null }, requirement: { key: requirement.key }, programRegistrationId: { not: registration.id } },
          orderBy: { reviewedAt: 'desc' },
        })
        const lookup = requirement.allowParishLookup && child.baptizedAtThisParish && requirement.key === 'baptismal_certificate'
        const submission = await tx.luxDocumentSubmission.upsert({
          where: { lux_submission_requirement_registration: { requirementId: requirement.id, programRegistrationId: registration.id } },
          update: {},
          create: {
            organizationId,
            requirementId: requirement.id,
            programRegistrationId: registration.id,
            childId,
            householdId,
            status: onFile ? 'approved' : lookup ? 'parish_lookup' : 'missing',
            ...(onFile ? {
              storageRef: onFile.storageRef,
              fileName: onFile.fileName,
              contentType: onFile.contentType,
              sizeBytes: onFile.sizeBytes,
              uploadedAt: onFile.uploadedAt,
              uploadedVia: 'reused',
              reviewedAt: onFile.reviewedAt,
              reviewedById: onFile.reviewedById,
              reviewerNote: 'Already on file from an earlier program',
            } : {}),
          },
        })
        uploads.push({
          submissionId: submission.id,
          childKey: c.key,
          childName: `${c.firstName} ${c.lastName}`.trim(),
          programName: program.name,
          requirementKey: requirement.key,
          label: requirement.label,
          description: requirement.description,
          required: requirement.required,
          status: submission.status,
        })
      }
    }
    return { order, uploads }
  })

  return {
    orderId: result.order.id,
    confirmationCode: result.order.confirmationCode,
    payToken: result.order.payToken,
    householdId,
    status: orderStatus,
    total,
    amountDue: total,
    quote,
    sessionScope: canEditHousehold ? 'household' : 'order',
    uploads: result.uploads,
  }
}

/**
 * Cancel orders whose card checkout was never paid, releasing their spots
 * (used when the checkout expires, or the family starts over).
 */
export async function cancelUnpaidOrders(orderIds: string[]): Promise<number> {
  let cancelled = 0
  for (const id of orderIds) {
    const claimed = await prisma.luxOrder.updateMany({
      where: { id, status: 'pending_payment', amountPaid: 0 },
      data: { status: 'cancelled' },
    })
    if (claimed.count === 0) continue
    cancelled++
    await prisma.luxProgramRegistration.updateMany({
      where: { orderId: id, status: 'pending_payment' },
      data: { status: 'cancelled', cancelledAt: new Date() },
    })
    await prisma.payment.updateMany({
      where: { registrationId: id, registrationType: 'lux_order', paymentStatus: 'pending' },
      data: { paymentStatus: 'expired' },
    })
  }
  return cancelled
}
