/** Display helpers shared by Lux pages and emails (no server-only imports) */

export function formatMoney(amount: number | string | null | undefined): string {
  const value = Number(amount ?? 0)
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

/** "Saturday, October 24, 2026" for a @db.Date value (stored as UTC midnight); 'es' for Spanish */
export function formatEventDate(date: Date | string, options: Intl.DateTimeFormatOptions = {}, lang: 'en' | 'es' = 'en'): string {
  const d = typeof date === 'string' ? new Date(date.length === 10 ? `${date}T00:00:00Z` : date) : date
  return d.toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
    ...options,
  })
}

export function formatShortDate(date: Date | string, lang: 'en' | 'es' = 'en'): string {
  return formatEventDate(date, { weekday: undefined, month: 'short' }, lang)
}

/** "7:00 PM" from "19:00" */
export function formatTime(time: string | null | undefined): string {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return ''
  const [h, m] = time.split(':').map(Number)
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${m.toString().padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

export function formatTimeRange(start: string | null | undefined, end: string | null | undefined): string {
  const s = formatTime(start)
  const e = formatTime(end)
  if (s && e) return `${s} – ${e}`
  return s || e
}

/** Date and time; pass the event's time zone when rendering on the server */
export function formatDateTime(date: Date | string | null | undefined, timeZone?: string | null, lang: 'en' | 'es' = 'en'): string {
  if (!date) return ''
  const locale = lang === 'es' ? 'es-US' : 'en-US'
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }
  try {
    return new Date(date).toLocaleString(locale, timeZone ? { ...options, timeZone } : options)
  } catch {
    return new Date(date).toLocaleString(locale, options) // unknown time zone
  }
}

/** Grade value → label: "K" → "Kindergarten", "3" → "3rd grade" ('es': "Kínder", "3.º grado") */
export function gradeLabel(grade: string | null | undefined, lang: 'en' | 'es' = 'en'): string {
  if (!grade) return ''
  if (lang === 'es') {
    if (grade === 'PK') return 'Prekínder'
    if (grade === 'K') return 'Kínder'
    if (grade === 'Adult') return 'Adulto'
    return Number.isInteger(Number(grade)) ? `${grade}.º grado` : grade
  }
  if (grade === 'PK') return 'Pre-K'
  if (grade === 'K') return 'Kindergarten'
  if (grade === 'Adult') return 'Adult'
  const n = Number(grade)
  if (!Number.isInteger(n)) return grade
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] || 'th'
  return `${n}${suffix} grade`
}

export const GRADE_OPTIONS = ['PK', 'K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'Adult']

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
