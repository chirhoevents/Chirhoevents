/**
 * Creating and editing Lux simple events. A simple event is a regular Event
 * row (mode 'simple') with sensible defaults applied for everything a small
 * parish event doesn't need, so registrations, payments, refunds and
 * check-in all go through the existing machinery.
 */

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { parseDateTimeInTimezone, formatDateTimeInTimezone } from '@/lib/timezone'
import { uniqueSlug } from '@/lib/lux/slug'
import { parseSimpleEventConfig, type SimpleEventConfig } from '@/lib/lux/simple-event'

export interface TicketInput {
  id?: string
  name: string
  price: number
  capacity: number | null
  description?: string | null
}

export interface QuestionInput {
  id?: string
  questionText: string
  questionType: 'text' | 'yes_no' | 'multiple_choice' | 'multi_select' | 'dropdown'
  options: string[]
  required: boolean
}

export interface SimpleEventInput {
  title: string
  description: string | null
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  startTime: string | null // HH:mm
  endTime: string | null
  timezone: string
  locationName: string | null
  locationAddress: string | null
  capacity: number | null
  closeDate: string | null // YYYY-MM-DDTHH:mm in the event's timezone
  tickets: TicketInput[]
  questions: QuestionInput[]
  config: SimpleEventConfig
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
}

const QUESTION_TYPES = ['text', 'yes_no', 'multiple_choice', 'multi_select', 'dropdown']
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^\d{2}:\d{2}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const str = (v: unknown, max = 5000): string | null => {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t ? t.slice(0, max) : null
}

function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

export function validateSimpleEventInput(raw: any): { ok: true; value: SimpleEventInput } | { ok: false; error: string } {
  const title = str(raw?.title, 255)
  if (!title) return { ok: false, error: 'Give your event a title.' }

  const startDate = typeof raw?.startDate === 'string' && DATE_RE.test(raw.startDate) ? raw.startDate : null
  if (!startDate) return { ok: false, error: 'Choose the event date.' }
  const endDate = typeof raw?.endDate === 'string' && DATE_RE.test(raw.endDate) ? raw.endDate : startDate
  if (endDate < startDate) return { ok: false, error: 'The end date is before the start date.' }

  const startTime = typeof raw?.startTime === 'string' && TIME_RE.test(raw.startTime) ? raw.startTime : null
  const endTime = typeof raw?.endTime === 'string' && TIME_RE.test(raw.endTime) ? raw.endTime : null
  const timezone = typeof raw?.timezone === 'string' && isValidTimezone(raw.timezone) ? raw.timezone : 'America/New_York'

  let capacity: number | null = null
  if (raw?.capacity !== null && raw?.capacity !== undefined && raw?.capacity !== '') {
    capacity = Number(raw.capacity)
    if (!Number.isInteger(capacity) || capacity < 1) return { ok: false, error: 'Capacity must be a whole number of at least 1, or left blank.' }
  }

  const closeDate = typeof raw?.closeDate === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw.closeDate) ? raw.closeDate : null

  const rawTickets: any[] = Array.isArray(raw?.tickets) ? raw.tickets : []
  const tickets: TicketInput[] = []
  for (const t of rawTickets) {
    const name = str(t?.name, 100)
    if (!name) return { ok: false, error: 'Every ticket type needs a name.' }
    const price = Number(t?.price ?? 0)
    if (!Number.isFinite(price) || price < 0 || price > 100000) return { ok: false, error: `Enter a valid price for "${name}".` }
    let ticketCapacity: number | null = null
    if (t?.capacity !== null && t?.capacity !== undefined && t?.capacity !== '') {
      ticketCapacity = Number(t.capacity)
      if (!Number.isInteger(ticketCapacity) || ticketCapacity < 0) return { ok: false, error: `The limit for "${name}" must be a whole number.` }
    }
    tickets.push({
      id: typeof t?.id === 'string' ? t.id : undefined,
      name,
      price: Math.round(price * 100) / 100,
      capacity: ticketCapacity,
      description: str(t?.description, 255),
    })
  }
  if (tickets.length === 0) return { ok: false, error: 'Add at least one ticket type (it can be free).' }
  if (tickets.length > 10) return { ok: false, error: 'Up to 10 ticket types per event.' }

  const rawQuestions: any[] = Array.isArray(raw?.questions) ? raw.questions : []
  const questions: QuestionInput[] = []
  for (const q of rawQuestions) {
    const questionText = str(q?.questionText, 500)
    if (!questionText) continue
    const questionType = QUESTION_TYPES.includes(q?.questionType) ? q.questionType : 'text'
    const options: string[] = Array.isArray(q?.options)
      ? q.options.map((o: unknown) => str(o, 200)).filter((o: string | null): o is string => !!o)
      : []
    if (['multiple_choice', 'multi_select', 'dropdown'].includes(questionType) && options.length < 2) {
      return { ok: false, error: `Add at least two choices for "${questionText}".` }
    }
    questions.push({ id: typeof q?.id === 'string' ? q.id : undefined, questionText, questionType, options, required: !!q?.required })
  }

  const config = parseSimpleEventConfig(raw?.config)
  const hasPaidTickets = tickets.some(t => t.price > 0)
  if (hasPaidTickets && !config.onlinePayment && !config.officePayment.enabled) {
    return { ok: false, error: 'Choose how people can pay: online by card, at the parish office, or both.' }
  }

  const contactEmail = str(raw?.contactEmail, 255)
  if (contactEmail && !EMAIL_RE.test(contactEmail)) return { ok: false, error: 'The contact email doesn’t look right.' }

  return {
    ok: true,
    value: {
      title,
      description: str(raw?.description, 5000),
      startDate,
      endDate,
      startTime,
      endTime,
      timezone,
      locationName: str(raw?.locationName, 255),
      locationAddress: str(raw?.locationAddress, 500),
      capacity,
      closeDate,
      tickets,
      questions,
      config,
      contactName: str(raw?.contactName, 255),
      contactEmail,
      contactPhone: str(raw?.contactPhone, 20),
    },
  }
}

const utcDate = (day: string) => new Date(`${day}T00:00:00Z`)

/** Tickets and people already taken by live registrations (cancelled / expired ones don't count) */
export async function soldCounts(eventId: string): Promise<{ total: number; byOption: Map<string, number> }> {
  const registrations = await prisma.individualRegistration.findMany({
    where: { eventId, registrationStatus: { not: 'expired' } },
    select: { ticketQuantity: true, ticketSelections: true },
  })
  const byOption = new Map<string, number>()
  let total = 0
  for (const r of registrations) {
    total += r.ticketQuantity
    for (const line of (Array.isArray(r.ticketSelections) ? r.ticketSelections : []) as Array<{ optionId?: string; quantity?: number }>) {
      if (line.optionId) byOption.set(line.optionId, (byOption.get(line.optionId) || 0) + (Number(line.quantity) || 0))
    }
  }
  return { total, byOption }
}

function settingsFor(input: SimpleEventInput, hasRapha: boolean) {
  return {
    groupRegistrationEnabled: false,
    individualRegistrationEnabled: true,
    liabilityFormsRequiredGroup: false,
    liabilityFormsRequiredIndividual: false,
    showDietaryRestrictions: false,
    showAdaAccommodations: false,
    porosEnabled: false,
    porosHousingEnabled: false,
    salveCheckinEnabled: false,
    raphaMedicalEnabled: hasRapha && input.config.medical.enabled,
    tshirtsEnabled: false,
    staffRegistrationEnabled: false,
    vendorRegistrationEnabled: false,
    checkPaymentEnabled: input.config.officePayment.enabled,
    cardPaymentDisabled: !input.config.onlinePayment,
    waitlistEnabled: false,
    couponsEnabled: false,
    allowOnCampus: false,
    allowDayPass: false,
    registrationInstructions: input.config.officePayment.instructions || null,
    confirmationEmailMessage: input.config.confirmationMessage || null,
    contactName: input.contactName,
    contactEmail: input.contactEmail,
    contactPhone: input.contactPhone,
  }
}

function eventFields(input: SimpleEventInput) {
  return {
    name: input.title,
    description: input.description,
    startDate: utcDate(input.startDate),
    endDate: utcDate(input.endDate),
    startTime: input.startTime,
    endTime: input.endTime,
    timezone: input.timezone,
    locationName: input.locationName,
    locationAddress: input.locationAddress ? { address: input.locationAddress } : Prisma.DbNull,
    registrationCloseDate: input.closeDate ? parseDateTimeInTimezone(input.closeDate, input.timezone) : null,
    luxConfig: input.config as any,
  }
}

export async function createSimpleEvent(params: {
  organizationId: string
  userId: string
  input: SimpleEventInput
  hasRapha: boolean
}) {
  const { organizationId, userId, input, hasRapha } = params
  const lowestPrice = Math.min(...input.tickets.map(t => t.price))

  return prisma.$transaction(async tx => {
    const event = await tx.event.create({
      data: {
        organizationId,
        createdBy: userId,
        slug: uniqueSlug(input.title),
        mode: 'simple',
        status: 'draft',
        isPublished: false,
        capacityTotal: input.capacity,
        capacityRemaining: input.capacity,
        enableWaitlist: false,
        ...eventFields(input),
        settings: { create: settingsFor(input, hasRapha) },
        pricing: {
          create: {
            youthRegularPrice: 0,
            chaperoneRegularPrice: 0,
            individualBasePrice: lowestPrice,
            individualOffCampusPrice: lowestPrice,
            requireFullPayment: true,
          },
        },
      },
    })

    await tx.eventTicketOption.createMany({
      data: input.tickets.map((t, i) => ({
        eventId: event.id,
        organizationId,
        name: t.name,
        description: t.description ?? null,
        price: t.price,
        capacity: t.capacity,
        remaining: t.capacity,
        displayOrder: i,
      })),
    })

    if (input.questions.length > 0) {
      await tx.customRegistrationQuestion.createMany({
        data: input.questions.map((q, i) => ({
          eventId: event.id,
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.options.length ? q.options : undefined,
          required: q.required,
          appliesTo: 'individual' as const,
          displayOrder: i,
        })),
      })
    }

    return event
  })
}

export async function updateSimpleEvent(params: {
  organizationId: string
  eventId: string
  input: SimpleEventInput
  hasRapha: boolean
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { organizationId, eventId, input, hasRapha } = params
  const sold = await soldCounts(eventId)

  if (input.capacity !== null && input.capacity < sold.total) {
    return { ok: false, error: `${sold.total} spots are already taken, so capacity can't be lower than that.` }
  }
  for (const t of input.tickets) {
    const soldForOption = t.id ? sold.byOption.get(t.id) || 0 : 0
    if (t.capacity !== null && t.capacity < soldForOption) {
      return { ok: false, error: `${soldForOption} "${t.name}" tickets are already sold, so its limit can't be lower than that.` }
    }
  }

  const existingQuestions = await prisma.customRegistrationQuestion.findMany({
    where: { eventId },
    select: { id: true, questionText: true, _count: { select: { answers: true } } },
  })
  const keptQuestionIds = new Set(input.questions.map(q => q.id).filter(Boolean) as string[])
  const removedAnswered = existingQuestions.find(q => !keptQuestionIds.has(q.id) && q._count.answers > 0)
  if (removedAnswered) {
    return {
      ok: false,
      error: `"${removedAnswered.questionText}" already has answers, so it can't be removed. You can edit its wording instead.`,
    }
  }

  const lowestPrice = Math.min(...input.tickets.map(t => t.price))
  const existingOptions = await prisma.eventTicketOption.findMany({ where: { eventId }, select: { id: true } })
  const existingOptionIds = new Set(existingOptions.map(o => o.id))

  await prisma.$transaction(async tx => {
    await tx.event.update({
      where: { id: eventId },
      data: {
        ...eventFields(input),
        capacityTotal: input.capacity,
        capacityRemaining: input.capacity === null ? null : input.capacity - sold.total,
        settings: { update: settingsFor(input, hasRapha) },
        pricing: { update: { individualBasePrice: lowestPrice, individualOffCampusPrice: lowestPrice } },
      },
    })

    const keptOptionIds = new Set<string>()
    for (const [i, t] of input.tickets.entries()) {
      if (t.id && existingOptionIds.has(t.id)) {
        keptOptionIds.add(t.id)
        const soldForOption = sold.byOption.get(t.id) || 0
        await tx.eventTicketOption.update({
          where: { id: t.id },
          data: {
            name: t.name,
            description: t.description ?? null,
            price: t.price,
            capacity: t.capacity,
            remaining: t.capacity === null ? null : t.capacity - soldForOption,
            displayOrder: i,
            isActive: true,
          },
        })
      } else {
        await tx.eventTicketOption.create({
          data: {
            eventId,
            organizationId,
            name: t.name,
            description: t.description ?? null,
            price: t.price,
            capacity: t.capacity,
            remaining: t.capacity,
            displayOrder: i,
          },
        })
      }
    }
    // Removed ticket types are hidden, not deleted, so past registrations keep their history
    const removedIds = [...existingOptionIds].filter(id => !keptOptionIds.has(id))
    if (removedIds.length) {
      await tx.eventTicketOption.updateMany({ where: { id: { in: removedIds } }, data: { isActive: false } })
    }

    const existingQuestionIds = new Set(existingQuestions.map(q => q.id))
    for (const [i, q] of input.questions.entries()) {
      const data = {
        questionText: q.questionText,
        questionType: q.questionType,
        options: q.options.length ? q.options : undefined,
        required: q.required,
        displayOrder: i,
      }
      if (q.id && existingQuestionIds.has(q.id)) {
        await tx.customRegistrationQuestion.update({ where: { id: q.id }, data })
      } else {
        await tx.customRegistrationQuestion.create({ data: { ...data, eventId, appliesTo: 'individual' } })
      }
    }
    const removedQuestionIds = [...existingQuestionIds].filter(id => !keptQuestionIds.has(id))
    if (removedQuestionIds.length) {
      await tx.customRegistrationQuestion.deleteMany({ where: { id: { in: removedQuestionIds } } })
    }
  })

  return { ok: true }
}

/** Event + tickets + questions shaped for the Lux editor form */
export async function loadSimpleEventForEditor(organizationId: string, eventId: string) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, organizationId, mode: 'simple' },
    include: {
      settings: { select: { contactName: true, contactEmail: true, contactPhone: true } },
      ticketOptions: { where: { isActive: true }, orderBy: { displayOrder: 'asc' } },
      customRegistrationQuestions: { orderBy: { displayOrder: 'asc' } },
    },
  })
  if (!event) return null
  const address = (event.locationAddress as { address?: string } | null)?.address ?? ''
  return {
    id: event.id,
    slug: event.slug,
    status: event.status,
    isPublished: event.isPublished,
    title: event.name,
    description: event.description ?? '',
    startDate: event.startDate.toISOString().slice(0, 10),
    endDate: event.endDate.toISOString().slice(0, 10),
    startTime: event.startTime ?? '',
    endTime: event.endTime ?? '',
    timezone: event.timezone,
    locationName: event.locationName ?? '',
    locationAddress: address,
    capacity: event.capacityTotal,
    closeDate: event.registrationCloseDate ? formatDateTimeInTimezone(event.registrationCloseDate, event.timezone) : '',
    tickets: event.ticketOptions.map(t => ({
      id: t.id,
      name: t.name,
      price: Number(t.price),
      capacity: t.capacity,
      description: t.description ?? '',
    })),
    questions: event.customRegistrationQuestions.map(q => ({
      id: q.id,
      questionText: q.questionText,
      questionType: q.questionType,
      options: Array.isArray(q.options) ? (q.options as string[]) : [],
      required: q.required,
    })),
    config: parseSimpleEventConfig(event.luxConfig),
    contactName: event.settings?.contactName ?? '',
    contactEmail: event.settings?.contactEmail ?? '',
    contactPhone: event.settings?.contactPhone ?? '',
  }
}
