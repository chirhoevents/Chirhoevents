/**
 * Lux simple events: form settings, ticket pricing and open/closed status.
 * Pure functions (no database) so the public page, the API and tests share
 * the same rules.
 */

import { parseDateTimeInTimezone } from '@/lib/timezone'

export type FieldMode = 'required' | 'optional' | 'hidden'

export interface SimpleEventConfig {
  phoneField: FieldMode
  addressField: FieldMode
  // Most tickets one person can buy in one registration
  maxPerRegistration: number
  waiver: { enabled: boolean; text: string }
  // Only offered when the org has Rapha
  medical: { enabled: boolean }
  onlinePayment: boolean
  officePayment: { enabled: boolean; instructions: string }
  confirmationMessage: string
}

export const DEFAULT_WAIVER_TEXT =
  'I understand that participation in this activity involves certain risks. On behalf of myself and anyone I am registering, ' +
  'I release the parish, its clergy, staff and volunteers from liability for injury or loss arising from participation, ' +
  'except in cases of gross negligence. I give permission for photos taken at the event to be used in parish communications.'

export const DEFAULT_SIMPLE_EVENT_CONFIG: SimpleEventConfig = {
  phoneField: 'required',
  addressField: 'hidden',
  maxPerRegistration: 10,
  waiver: { enabled: false, text: DEFAULT_WAIVER_TEXT },
  medical: { enabled: false },
  onlinePayment: true,
  officePayment: { enabled: true, instructions: '' },
  confirmationMessage: '',
}

const FIELD_MODES: FieldMode[] = ['required', 'optional', 'hidden']

export function parseSimpleEventConfig(raw: unknown): SimpleEventConfig {
  const c = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>
  const d = DEFAULT_SIMPLE_EVENT_CONFIG
  const mode = (value: unknown, fallback: FieldMode) =>
    FIELD_MODES.includes(value as FieldMode) ? (value as FieldMode) : fallback
  const max = Number(c.maxPerRegistration)
  return {
    phoneField: mode(c.phoneField, d.phoneField),
    addressField: mode(c.addressField, d.addressField),
    maxPerRegistration: Number.isInteger(max) && max >= 1 && max <= 100 ? max : d.maxPerRegistration,
    waiver: {
      enabled: !!c.waiver?.enabled,
      text: typeof c.waiver?.text === 'string' && c.waiver.text.trim() ? c.waiver.text : d.waiver.text,
    },
    medical: { enabled: !!c.medical?.enabled },
    onlinePayment: c.onlinePayment === undefined ? d.onlinePayment : !!c.onlinePayment,
    officePayment: {
      enabled: c.officePayment?.enabled === undefined ? d.officePayment.enabled : !!c.officePayment.enabled,
      instructions: typeof c.officePayment?.instructions === 'string' ? c.officePayment.instructions : '',
    },
    confirmationMessage: typeof c.confirmationMessage === 'string' ? c.confirmationMessage : '',
  }
}

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

export interface PricedTicketOption {
  id: string
  name: string
  price: number
  remaining: number | null
  isActive: boolean
}

export interface TicketSelectionInput {
  optionId: string
  quantity: number
}

export interface TicketLine {
  optionId: string
  name: string
  unitPrice: number
  quantity: number
  amount: number
}

export type SimpleEventTotal =
  | { ok: true; lines: TicketLine[]; quantity: number; total: number }
  | { ok: false; error: string }

const toCents = (dollars: number) => Math.round(dollars * 100)

/**
 * Total for the tickets someone picked. Works in cents so $0.10 + $0.20
 * doesn't come out as $0.30000000000000004.
 */
export function calculateSimpleEventTotal(
  options: PricedTicketOption[],
  selections: TicketSelectionInput[],
  maxPerRegistration: number
): SimpleEventTotal {
  const byId = new Map(options.map(o => [o.id, o]))
  const merged = new Map<string, number>()
  for (const s of selections) {
    const quantity = Number(s.quantity)
    if (!Number.isInteger(quantity) || quantity < 0) return { ok: false, error: 'Ticket quantities must be whole numbers.' }
    if (quantity === 0) continue
    merged.set(s.optionId, (merged.get(s.optionId) || 0) + quantity)
  }

  const lines: TicketLine[] = []
  let totalCents = 0
  let quantity = 0
  for (const [optionId, qty] of merged) {
    const option = byId.get(optionId)
    if (!option || !option.isActive) return { ok: false, error: 'One of the selected tickets is no longer available.' }
    if (option.remaining !== null && qty > option.remaining) {
      return {
        ok: false,
        error: option.remaining === 0
          ? `${option.name} tickets are sold out.`
          : `Only ${option.remaining} ${option.name} ticket${option.remaining === 1 ? '' : 's'} left.`,
      }
    }
    const amountCents = toCents(option.price) * qty
    totalCents += amountCents
    quantity += qty
    lines.push({ optionId, name: option.name, unitPrice: option.price, quantity: qty, amount: amountCents / 100 })
  }

  if (quantity === 0) return { ok: false, error: 'Choose at least one ticket.' }
  if (quantity > maxPerRegistration) {
    return { ok: false, error: `You can register up to ${maxPerRegistration} per registration.` }
  }
  return { ok: true, lines, quantity, total: totalCents / 100 }
}

// ---------------------------------------------------------------------------
// Open / closed
// ---------------------------------------------------------------------------

export type SimpleEventStatus = 'draft' | 'not_yet_open' | 'open' | 'full' | 'closed' | 'ended'

export interface SimpleEventForStatus {
  isPublished: boolean
  status: string
  startDate: Date | string
  endDate: Date | string
  startTime: string | null
  endTime: string | null
  timezone: string
  registrationOpenDate: Date | string | null
  registrationCloseDate: Date | string | null
  capacityRemaining: number | null
}

function dayString(date: Date | string): string {
  return (typeof date === 'string' ? date : date.toISOString()).slice(0, 10)
}

/** When the event starts, in real time: the date + start time in the event's timezone (start of day if no time) */
export function simpleEventStartsAt(event: Pick<SimpleEventForStatus, 'startDate' | 'startTime' | 'timezone'>): Date {
  const time = event.startTime && /^\d{2}:\d{2}$/.test(event.startTime) ? event.startTime : '00:00'
  return parseDateTimeInTimezone(`${dayString(event.startDate)}T${time}`, event.timezone) ?? new Date(event.startDate)
}

/** When the event is over: the end date + end time, or the end of that day */
export function simpleEventEndsAt(event: Pick<SimpleEventForStatus, 'endDate' | 'endTime' | 'timezone'>): Date {
  const time = event.endTime && /^\d{2}:\d{2}$/.test(event.endTime) ? event.endTime : '23:59'
  return parseDateTimeInTimezone(`${dayString(event.endDate)}T${time}`, event.timezone) ?? new Date(event.endDate)
}

/**
 * Registration opens when published (or at the chosen open date) and closes
 * at the chosen close date, otherwise when the event starts (end of the
 * event day when no start time is set).
 */
export function simpleEventCloseAt(event: SimpleEventForStatus): Date {
  if (event.registrationCloseDate) return new Date(event.registrationCloseDate)
  if (event.startTime) return simpleEventStartsAt(event)
  return simpleEventEndsAt({ endDate: event.startDate, endTime: null, timezone: event.timezone })
}

export function getSimpleEventStatus(event: SimpleEventForStatus, now: Date = new Date()): SimpleEventStatus {
  if (!event.isPublished || event.status === 'draft') return 'draft'
  if (now > simpleEventEndsAt(event)) return 'ended'
  if (event.status === 'registration_closed') return 'closed'
  if (event.registrationOpenDate && now < new Date(event.registrationOpenDate)) return 'not_yet_open'
  if (now > simpleEventCloseAt(event)) return 'closed'
  if (event.capacityRemaining !== null && event.capacityRemaining <= 0) return 'full'
  return 'open'
}

export const SIMPLE_EVENT_STATUS_LABELS: Record<SimpleEventStatus, string> = {
  draft: 'Draft',
  not_yet_open: 'Opens soon',
  open: 'Open',
  full: 'Full',
  closed: 'Closed',
  ended: 'Ended',
}
