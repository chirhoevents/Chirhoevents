/**
 * Timezone-aware helpers for datetime-local form inputs.
 *
 * `<input type="datetime-local">` sends a naive wall-clock string with no
 * timezone (e.g. "2026-06-05T09:00"). The browser treats it as the user's
 * local clock; if the API calls `new Date(string)`, Node interprets it as
 * the server's local clock — which on Vercel/AWS is UTC. That silently
 * shifts every saved timestamp by the server↔user offset.
 *
 * These helpers convert between a wall-clock string and a UTC Date using
 * the IANA timezone stored on the Event row, so an admin typing "9:00 AM"
 * in an Eastern-Time event always stores 9:00 AM ET (not 9:00 AM UTC).
 *
 * Uses only built-in `Intl.DateTimeFormat` — no extra dependency.
 */

const PARTS_KEYS = ['year', 'month', 'day', 'hour', 'minute', 'second'] as const

function partsAsRecord(date: Date, timezone: string) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const out: Record<string, string> = {}
  for (const p of fmt.formatToParts(date)) {
    if ((PARTS_KEYS as readonly string[]).includes(p.type)) out[p.type] = p.value
  }
  // Intl can render midnight as hour="24" in some locales — normalize.
  if (out.hour === '24') out.hour = '00'
  return out
}

/**
 * Parse a datetime-local string ("YYYY-MM-DDTHH:mm" or "YYYY-MM-DDTHH:mm:ss")
 * as a wall-clock time in the given IANA timezone, returning the UTC Date.
 *
 * Example:
 *   parseDateTimeInTimezone("2026-06-05T09:00", "America/New_York")
 *   → Date for 2026-06-05T13:00:00Z (EDT is UTC-4 in June)
 */
export function parseDateTimeInTimezone(
  localDateTime: string,
  timezone: string
): Date {
  // Step 1: pretend the string is UTC, so we get a tentative instant.
  const tentative = new Date(localDateTime + (localDateTime.endsWith('Z') ? '' : 'Z'))
  if (isNaN(tentative.getTime())) {
    throw new Error(`Invalid datetime string: ${localDateTime}`)
  }

  // Step 2: ask the formatter what the wall clock would read in the target TZ
  // for that tentative instant.
  const parts = partsAsRecord(tentative, timezone)
  const wallAsUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second || '0')
  )

  // Step 3: the difference is the timezone's offset at that moment (handles DST).
  // We pretended the wall clock was UTC; the real UTC instant is shifted by that offset.
  const offsetMs = wallAsUTC - tentative.getTime()
  return new Date(tentative.getTime() - offsetMs)
}

/**
 * Format a UTC Date as a datetime-local string ("YYYY-MM-DDTHH:mm") for
 * displaying in an `<input type="datetime-local">` field, in the given
 * IANA timezone.
 *
 * Example:
 *   formatDateTimeInTimezone(new Date("2026-06-05T13:00:00Z"), "America/New_York")
 *   → "2026-06-05T09:00"
 */
export function formatDateTimeInTimezone(
  date: Date,
  timezone: string
): string {
  const parts = partsAsRecord(date, timezone)
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}
