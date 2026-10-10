/**
 * The "what do you need" questions on /get-started, shared by the form, the
 * request API, the master admin notification email and the review screen,
 * so every answer an applicant gives shows up for the master admin with the
 * same wording they saw. No server imports (used by client pages).
 */

export type NeedKind = 'lux' | 'events' | 'both'

type Option = { value: string; label: string }

export const NEED_KINDS: Array<Option & { description: string }> = [
  { value: 'lux', label: 'Parish life (Lux)', description: 'Faith formation and sacrament registration, plus simple sign-ups for parish events. Chapel or Parish plan.' },
  { value: 'events', label: 'Larger events', description: 'Retreats, conferences and diocesan gatherings with groups, housing, forms and check-in. Cathedral and up.' },
  { value: 'both', label: 'Both', description: 'Larger events, plus faith formation and parish sign-ups in the same account.' },
]

export const LUX_PROGRAMS: Option[] = [
  { value: 'faith_formation', label: 'Faith Formation / Religious Education' },
  { value: 'family_faith_formation', label: 'Family Faith Formation' },
  { value: 'first_communion', label: 'First Communion' },
  { value: 'confirmation', label: 'Confirmation' },
  { value: 'baptism_prep', label: 'Baptism Preparation' },
  { value: 'ocia', label: 'OCIA' },
  { value: 'vbs', label: 'Vacation Bible School' },
  { value: 'parish_events', label: 'Parish events and sign-ups' },
]

export const FAMILY_COUNTS: Option[] = [
  { value: 'under-50', label: 'Under 50 families' },
  { value: '50-150', label: '50–150 families' },
  { value: '150-400', label: '150–400 families' },
  { value: '400+', label: 'More than 400 families' },
]

export const LUX_EVENT_COUNTS: Array<Option & { tier: string; estimate: number }> = [
  { value: 'lux-5', label: 'Up to 5 a year (Chapel)', tier: 'chapel', estimate: 5 },
  { value: 'lux-10', label: 'Up to 10 a year (Parish)', tier: 'parish', estimate: 10 },
  { value: 'lux-more', label: 'More than 10 a year', tier: 'parish', estimate: 15 },
]

export const EVENT_COUNTS: Array<Option & { tier: string; estimate: number }> = [
  { value: '1-5', label: '1–5 events', tier: 'cathedral', estimate: 5 },
  { value: '6-10', label: '6–10 events', tier: 'shrine', estimate: 10 },
  { value: '10+', label: '10+ events', tier: 'basilica', estimate: 25 },
]

export const ATTENDEE_COUNTS: Array<Option & { estimate: number }> = [
  { value: 'under-500', label: 'Under 500', estimate: 500 },
  { value: '500-1000', label: '500–1,000', estimate: 1000 },
  { value: '1000-3000', label: '1,000–3,000', estimate: 3000 },
  { value: '3000-8000', label: '3,000–8,000', estimate: 8000 },
  { value: '8000+', label: '8,000+', estimate: 10000 },
]

export const EVENT_KINDS: Option[] = [
  { value: 'retreats', label: 'Retreats' },
  { value: 'conferences', label: 'Conferences' },
  { value: 'youth_rallies', label: 'Youth rallies' },
  { value: 'camps', label: 'Camps' },
  { value: 'diocesan', label: 'Diocesan gatherings' },
  { value: 'pilgrimages', label: 'Pilgrimages' },
]

export const EVENT_FEATURES: Option[] = [
  { value: 'groups', label: 'Group registration with a leader portal' },
  { value: 'housing', label: 'Housing and room assignments' },
  { value: 'forms', label: 'Liability and medical forms' },
  { value: 'checkin', label: 'Check-in and name tags' },
  { value: 'medical', label: 'Medical / nurse station' },
  { value: 'staff', label: 'Staff and volunteer registration' },
  { value: 'vendors', label: 'Vendors' },
]

export const SPANISH_OPTIONS: Option[] = [
  { value: 'yes', label: 'Yes, many of our families' },
  { value: 'some', label: 'Some families' },
  { value: 'no', label: 'No' },
]

export const PAYMENT_OPTIONS: Option[] = [
  { value: 'online', label: 'Yes, by card online' },
  { value: 'office', label: 'No, at the office only' },
  { value: 'unsure', label: 'Not sure yet' },
]

export const CURRENT_TOOLS: Option[] = [
  { value: 'paper', label: 'Paper forms' },
  { value: 'google_forms', label: 'Google Forms' },
  { value: 'jotform', label: 'JotForm' },
  { value: 'parish_software', label: 'Parish software (ParishSOFT, Flocknote…)' },
  { value: 'event_software', label: 'Event software (Eventbrite, Cvent…)' },
  { value: 'spreadsheets', label: 'Spreadsheets' },
  { value: 'other', label: 'Something else' },
]

export const START_OPTIONS: Option[] = [
  { value: 'asap', label: 'As soon as possible' },
  { value: 'month', label: 'Within a month' },
  { value: 'season', label: 'Before our next season or school year' },
  { value: 'exploring', label: 'Just exploring' },
]

export interface OnboardingNeeds {
  kind: NeedKind
  // Lux
  programs: string[]
  families: string
  luxEvents: string
  spanish: string
  onlinePayments: string
  // Larger events
  events: string
  attendees: string
  eventKinds: string[]
  features: string[]
  // Everyone
  currentTools: string[]
  currentToolsOther: string
  start: string
}

export const EMPTY_NEEDS: OnboardingNeeds = {
  kind: 'lux', programs: [], families: '', luxEvents: '', spanish: '', onlinePayments: '',
  events: '', attendees: '', eventKinds: [], features: [], currentTools: [], currentToolsOther: '', start: '',
}

const pick = (options: Option[], v: unknown) => (typeof v === 'string' && options.some(o => o.value === v) ? v : '')
const pickMany = (options: Option[], v: unknown) =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && options.some(o => o.value === x)))] : []

/** Keep only answers from the lists above (the request API stores this as-is) */
export function parseNeeds(raw: unknown): OnboardingNeeds {
  const n = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const kind = (['lux', 'events', 'both'] as const).find(k => k === n.kind) ?? 'lux'
  const lux = kind !== 'events'
  const events = kind !== 'lux'
  return {
    kind,
    programs: lux ? pickMany(LUX_PROGRAMS, n.programs) : [],
    families: lux ? pick(FAMILY_COUNTS, n.families) : '',
    luxEvents: lux ? pick(LUX_EVENT_COUNTS, n.luxEvents) : '',
    spanish: lux ? pick(SPANISH_OPTIONS, n.spanish) : '',
    onlinePayments: pick(PAYMENT_OPTIONS, n.onlinePayments),
    events: events ? pick(EVENT_COUNTS, n.events) : '',
    attendees: events ? pick(ATTENDEE_COUNTS, n.attendees) : '',
    eventKinds: events ? pickMany(EVENT_KINDS, n.eventKinds) : [],
    features: events ? pickMany(EVENT_FEATURES, n.features) : [],
    currentTools: pickMany(CURRENT_TOOLS, n.currentTools),
    currentToolsOther: typeof n.currentToolsOther === 'string' ? n.currentToolsOther.slice(0, 200) : '',
    start: pick(START_OPTIONS, n.start),
  }
}

/** What's missing before the form can be sent, or null */
export function needsProblem(n: OnboardingNeeds): string | null {
  if (n.kind !== 'events' && n.programs.length === 0) return 'Choose at least one program or kind of sign-up you need.'
  if (n.kind !== 'events' && !n.luxEvents) return 'Choose how many parish events you run a year.'
  if (n.kind !== 'lux' && !n.events) return 'Choose how many events you plan to run a year.'
  if (n.kind !== 'lux' && !n.attendees) return 'Choose about how many people attend in a year.'
  return null
}

/** The plan to suggest: the larger-events plan when they need one, otherwise Chapel or Parish */
export function suggestedTier(n: OnboardingNeeds): string {
  if (n.kind !== 'lux') return EVENT_COUNTS.find(o => o.value === n.events)?.tier ?? 'cathedral'
  return LUX_EVENT_COUNTS.find(o => o.value === n.luxEvents)?.tier ?? 'chapel'
}

/** Rough numbers for the existing estimate columns */
export function needsEstimates(n: OnboardingNeeds): { eventsPerYear: number | null; registrationsPerYear: number | null } {
  const events = EVENT_COUNTS.find(o => o.value === n.events)?.estimate ?? 0
  const lux = LUX_EVENT_COUNTS.find(o => o.value === n.luxEvents)?.estimate ?? 0
  return {
    eventsPerYear: events + lux || null,
    registrationsPerYear: ATTENDEE_COUNTS.find(o => o.value === n.attendees)?.estimate ?? null,
  }
}

const label = (options: Option[], v: string) => options.find(o => o.value === v)?.label ?? ''
const labels = (options: Option[], vs: string[]) => vs.map(v => label(options, v)).filter(Boolean).join(', ')

/** Every answer as label/value rows, in the order the form asks them (empty answers left out) */
export function describeNeeds(raw: unknown): Array<{ label: string; value: string }> {
  if (!raw || typeof raw !== 'object') return []
  const n = parseNeeds(raw)
  const tools = [labels(CURRENT_TOOLS, n.currentTools.filter(t => t !== 'other')), n.currentTools.includes('other') ? (n.currentToolsOther || 'Something else') : '']
    .filter(Boolean).join(', ')
  const rows: Array<[string, string]> = [
    ['Needs', label(NEED_KINDS, n.kind)],
    ['Programs', labels(LUX_PROGRAMS, n.programs)],
    ['Families a year', label(FAMILY_COUNTS, n.families)],
    ['Parish events a year', label(LUX_EVENT_COUNTS, n.luxEvents)],
    ['Spanish for families', label(SPANISH_OPTIONS, n.spanish)],
    ['Larger events a year', label(EVENT_COUNTS, n.events)],
    ['Attendees a year', label(ATTENDEE_COUNTS, n.attendees)],
    ['Kinds of events', labels(EVENT_KINDS, n.eventKinds)],
    ['Features needed', labels(EVENT_FEATURES, n.features)],
    ['Card payments online', label(PAYMENT_OPTIONS, n.onlinePayments)],
    ['Uses today', tools],
    ['Wants to start', label(START_OPTIONS, n.start)],
  ]
  return rows.filter(([, v]) => v).map(([l, v]) => ({ label: l, value: v }))
}
