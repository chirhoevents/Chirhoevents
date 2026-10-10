/**
 * Creating and editing faith formation programs.
 */

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { slugify, uniqueSlug } from '@/lib/lux/slug'
import { GRADE_OPTIONS } from '@/lib/lux/format'
import type { ProgramQuestion } from '@/lib/lux/program-templates'

export interface FeeItemInput { id: string; name: string; amount: number; siblingDiscount: boolean }
export interface RequirementInput { id?: string; key: string; label: string; description: string | null; required: boolean; allowParishLookup: boolean }

export interface ProgramInput {
  templateKey: string
  name: string
  term: string
  description: string | null
  registrationOpensAt: Date | null
  registrationClosesAt: Date | null
  capacity: number | null
  grades: string[] | null
  tuitionPerChild: number
  feeItems: FeeItemInput[]
  siblingDiscountApplies: boolean
  countsTowardFamilyCap: boolean
  onlinePaymentEnabled: boolean
  payAtOfficeEnabled: boolean
  feeAssistanceEnabled: boolean
  collectSponsor: boolean
  collectServiceHours: boolean
  serviceHoursRequired: number | null
  questions: ProgramQuestion[]
  confirmationMessage: string | null
  documentRetentionDays: number | null
  requirements: RequirementInput[]
}

const TEMPLATE_KEYS = ['faith_formation', 'first_communion', 'confirmation', 'custom']
const QUESTION_TYPES = ['text', 'yes_no', 'dropdown', 'multiple_choice', 'multi_select']

const str = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t ? t.slice(0, max) : null
}
const money = (v: unknown): number | null => {
  const n = Number(v ?? 0)
  return Number.isFinite(n) && n >= 0 && n <= 100000 ? Math.round(n * 100) / 100 : null
}
const optionalInt = (v: unknown, min: number): number | null | 'invalid' => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isInteger(n) && n >= min ? n : 'invalid'
}
const optionalDate = (v: unknown): Date | null | 'invalid' => {
  if (v === null || v === undefined || v === '') return null
  const d = new Date(String(v))
  return isNaN(d.getTime()) ? 'invalid' : d
}
const randomId = () => Math.random().toString(36).slice(2, 10)

export function validateProgramInput(raw: any): { ok: true; value: ProgramInput } | { ok: false; error: string } {
  const name = str(raw?.name, 255)
  if (!name) return { ok: false, error: 'Give the program a name.' }
  const term = str(raw?.term, 50)
  if (!term) return { ok: false, error: 'Enter the year or term, e.g. 2026–2027.' }

  const tuition = money(raw?.tuitionPerChild)
  if (tuition === null) return { ok: false, error: 'Enter a valid tuition amount (0 for free).' }

  const feeItems: FeeItemInput[] = []
  for (const item of Array.isArray(raw?.feeItems) ? raw.feeItems : []) {
    const itemName = str(item?.name, 100)
    const amount = money(item?.amount)
    if (!itemName && !Number(item?.amount)) continue
    if (!itemName) return { ok: false, error: 'Every extra fee needs a name (e.g. Books).' }
    if (amount === null) return { ok: false, error: `Enter a valid amount for ${itemName}.` }
    feeItems.push({ id: typeof item?.id === 'string' ? item.id.slice(0, 20) : randomId(), name: itemName, amount, siblingDiscount: !!item?.siblingDiscount })
  }
  if (feeItems.length > 10) return { ok: false, error: 'Up to 10 extra fees per program.' }

  const capacity = optionalInt(raw?.capacity, 1)
  if (capacity === 'invalid') return { ok: false, error: 'Capacity must be a whole number, or left blank.' }
  const serviceHoursRequired = optionalInt(raw?.serviceHoursRequired, 0)
  if (serviceHoursRequired === 'invalid') return { ok: false, error: 'Service hours must be a whole number.' }
  const documentRetentionDays = optionalInt(raw?.documentRetentionDays, 30)
  if (documentRetentionDays === 'invalid') return { ok: false, error: 'Keep documents for at least 30 days, or leave blank to keep them until you delete them.' }

  const opens = optionalDate(raw?.registrationOpensAt)
  const closes = optionalDate(raw?.registrationClosesAt)
  if (opens === 'invalid' || closes === 'invalid') return { ok: false, error: 'Check the registration dates.' }
  if (opens && closes && closes < opens) return { ok: false, error: 'Registration closes before it opens.' }

  const grades = Array.isArray(raw?.grades)
    ? raw.grades.filter((g: unknown) => typeof g === 'string' && GRADE_OPTIONS.includes(g))
    : null

  const questions: ProgramQuestion[] = []
  for (const q of Array.isArray(raw?.questions) ? raw.questions : []) {
    const label = str(q?.label ?? q?.questionText, 500)
    if (!label) continue
    const type = QUESTION_TYPES.includes(q?.type ?? q?.questionType) ? (q?.type ?? q?.questionType) : 'text'
    const options: string[] = Array.isArray(q?.options) ? q.options.map((o: unknown) => str(o, 200)).filter(Boolean) : []
    if (['dropdown', 'multiple_choice', 'multi_select'].includes(type) && options.length < 2) {
      return { ok: false, error: `Add at least two choices for "${label}".` }
    }
    questions.push({ id: typeof q?.id === 'string' && q.id ? q.id.slice(0, 40) : randomId(), label, type, options, required: !!q?.required })
  }

  const requirements: RequirementInput[] = []
  const usedKeys = new Set<string>()
  for (const r of Array.isArray(raw?.requirements) ? raw.requirements : []) {
    const label = str(r?.label, 255)
    if (!label) continue
    let key = str(r?.key, 60) || slugify(label, 50).replace(/-/g, '_')
    while (usedKeys.has(key)) key = `${key}_${randomId().slice(0, 3)}`
    usedKeys.add(key)
    requirements.push({
      id: typeof r?.id === 'string' ? r.id : undefined,
      key,
      label,
      description: str(r?.description, 1000),
      required: r?.required !== false,
      allowParishLookup: !!r?.allowParishLookup,
    })
  }

  const hasFees = tuition > 0 || feeItems.some(i => i.amount > 0)
  const online = raw?.onlinePaymentEnabled !== false
  const office = raw?.payAtOfficeEnabled !== false
  if (hasFees && !online && !office) return { ok: false, error: 'Choose how families can pay: online, at the office, or both.' }

  return {
    ok: true,
    value: {
      templateKey: TEMPLATE_KEYS.includes(raw?.templateKey) ? raw.templateKey : 'custom',
      name,
      term,
      description: str(raw?.description, 5000),
      registrationOpensAt: opens,
      registrationClosesAt: closes,
      capacity,
      grades: grades && grades.length ? grades : null,
      tuitionPerChild: tuition,
      feeItems,
      siblingDiscountApplies: raw?.siblingDiscountApplies !== false,
      countsTowardFamilyCap: raw?.countsTowardFamilyCap !== false,
      onlinePaymentEnabled: online,
      payAtOfficeEnabled: office,
      feeAssistanceEnabled: raw?.feeAssistanceEnabled !== false,
      collectSponsor: !!raw?.collectSponsor,
      collectServiceHours: !!raw?.collectServiceHours,
      serviceHoursRequired: raw?.collectServiceHours ? serviceHoursRequired : null,
      questions,
      confirmationMessage: str(raw?.confirmationMessage, 5000),
      documentRetentionDays,
      requirements,
    },
  }
}

function programFields(input: ProgramInput) {
  return {
    templateKey: input.templateKey,
    name: input.name,
    term: input.term,
    description: input.description,
    registrationOpensAt: input.registrationOpensAt,
    registrationClosesAt: input.registrationClosesAt,
    capacity: input.capacity,
    grades: input.grades ?? Prisma.DbNull,
    tuitionPerChild: input.tuitionPerChild,
    feeItems: input.feeItems as any,
    siblingDiscountApplies: input.siblingDiscountApplies,
    countsTowardFamilyCap: input.countsTowardFamilyCap,
    onlinePaymentEnabled: input.onlinePaymentEnabled,
    payAtOfficeEnabled: input.payAtOfficeEnabled,
    feeAssistanceEnabled: input.feeAssistanceEnabled,
    collectSponsor: input.collectSponsor,
    collectServiceHours: input.collectServiceHours,
    serviceHoursRequired: input.serviceHoursRequired,
    questions: input.questions as any,
    confirmationMessage: input.confirmationMessage,
    documentRetentionDays: input.documentRetentionDays,
  }
}

export async function createProgram(organizationId: string, userId: string, input: ProgramInput) {
  return prisma.$transaction(async tx => {
    const program = await tx.luxProgram.create({
      data: {
        organizationId,
        createdByUserId: userId,
        slug: uniqueSlug(`${input.name} ${input.term}`),
        status: 'draft',
        ...programFields(input),
      },
    })
    if (input.requirements.length) {
      await tx.luxDocumentRequirement.createMany({
        data: input.requirements.map((r, i) => ({
          organizationId,
          programId: program.id,
          key: r.key,
          label: r.label,
          description: r.description,
          required: r.required,
          allowParishLookup: r.allowParishLookup,
          displayOrder: i,
        })),
      })
    }
    return program
  })
}

export async function updateProgram(organizationId: string, programId: string, input: ProgramInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const existing = await prisma.luxDocumentRequirement.findMany({
    where: { programId },
    include: { _count: { select: { submissions: { where: { storageRef: { not: null } } } } } },
  })
  const keptIds = new Set(input.requirements.map(r => r.id).filter(Boolean) as string[])
  const removedWithFiles = existing.find(r => !keptIds.has(r.id) && r._count.submissions > 0)
  if (removedWithFiles) {
    return { ok: false, error: `Families have already uploaded "${removedWithFiles.label}", so it can't be removed. Mark it optional instead.` }
  }

  if (input.capacity !== null) {
    const active = await prisma.luxProgramRegistration.count({ where: { programId, cancelledAt: null } })
    if (input.capacity < active) return { ok: false, error: `${active} children are already registered, so capacity can't be lower than that.` }
  }

  const activeRegistrations = await prisma.luxProgramRegistration.findMany({
    where: { programId, cancelledAt: null },
    select: { id: true, childId: true, householdId: true, child: { select: { baptizedAtThisParish: true } } },
  })

  await prisma.$transaction(async tx => {
    await tx.luxProgram.update({ where: { id: programId }, data: programFields(input) })

    const existingIds = new Set(existing.map(r => r.id))
    for (const [i, r] of input.requirements.entries()) {
      const data = { label: r.label, description: r.description, required: r.required, allowParishLookup: r.allowParishLookup, displayOrder: i }
      if (r.id && existingIds.has(r.id)) {
        await tx.luxDocumentRequirement.update({ where: { id: r.id }, data })
      } else {
        // A new requirement applies to families already registered too
        const created = await tx.luxDocumentRequirement.create({ data: { ...data, organizationId, programId, key: r.key } })
        if (activeRegistrations.length) {
          await tx.luxDocumentSubmission.createMany({
            data: activeRegistrations.map(reg => ({
              organizationId,
              requirementId: created.id,
              programRegistrationId: reg.id,
              childId: reg.childId,
              householdId: reg.householdId,
              status: r.allowParishLookup && reg.child.baptizedAtThisParish && r.key === 'baptismal_certificate' ? 'parish_lookup' : 'missing',
            })),
          })
        }
      }
    }
    const removed = existing.filter(r => !keptIds.has(r.id)).map(r => r.id)
    if (removed.length) await tx.luxDocumentRequirement.deleteMany({ where: { id: { in: removed } } })
  })
  return { ok: true }
}

/** Is the program taking registrations right now? */
export function programIsOpen(
  program: { status: string; registrationOpensAt: Date | null; registrationClosesAt: Date | null },
  now: Date = new Date()
): boolean {
  if (program.status !== 'open') return false
  if (program.registrationOpensAt && now < program.registrationOpensAt) return false
  if (program.registrationClosesAt && now > program.registrationClosesAt) return false
  return true
}

/** The program shaped for the editor form */
export async function loadProgramForEditor(organizationId: string, programId: string) {
  const program = await prisma.luxProgram.findFirst({
    where: { id: programId, organizationId },
    include: { requirements: { orderBy: { displayOrder: 'asc' } } },
  })
  if (!program) return null
  return {
    ...program,
    tuitionPerChild: Number(program.tuitionPerChild),
    feeItems: (Array.isArray(program.feeItems) ? program.feeItems : []) as unknown as FeeItemInput[],
    grades: (Array.isArray(program.grades) ? program.grades : null) as string[] | null,
    questions: (Array.isArray(program.questions) ? program.questions : []) as unknown as ProgramQuestion[],
    requirements: program.requirements.map(r => ({
      id: r.id, key: r.key, label: r.label, description: r.description ?? '', required: r.required, allowParishLookup: r.allowParishLookup,
    })),
  }
}
