/** Display helpers shared by Lux pages and emails (no server-only imports) */

export function formatMoney(amount: number | string | null | undefined): string {
  const value = Number(amount ?? 0)
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

/** "Saturday, October 24, 2026" for a @db.Date value (stored as UTC midnight) */
export function formatEventDate(date: Date | string, options: Intl.DateTimeFormatOptions = {}): string {
  const d = typeof date === 'string' ? new Date(date.length === 10 ? `${date}T00:00:00Z` : date) : date
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
    ...options,
  })
}

export function formatShortDate(date: Date | string): string {
  return formatEventDate(date, { weekday: undefined, month: 'short' })
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

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return ''
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Grade value → label: "K" → "Kindergarten", "3" → "3rd grade" */
export function gradeLabel(grade: string | null | undefined): string {
  if (!grade) return ''
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
