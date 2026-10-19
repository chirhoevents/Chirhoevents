// Scheduled survey sends. Times the admin types are wall-clock times in the
// event's timezone (not the admin's browser), so "Sunday 3:00 PM" means 3 PM
// where the event is.

export type SurveyScheduleMode = 'event_end' | 'custom'

// Used when an event has no end time set: early evening on the last day,
// so the email lands after a typical closing Mass / send-off.
export const DEFAULT_EVENT_END_TIME = '17:00'

// A cron run that hasn't finished within this long is assumed dead (e.g. a
// function timeout) and the survey can be claimed again.
export const SCHEDULE_CLAIM_STALE_MS = 10 * 60 * 1000

/** Offset (ms) of `timeZone` from UTC at the instant `date`. */
function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date)
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return asUtc - Math.floor(date.getTime() / 1000) * 1000
}

/**
 * Converts a wall-clock date ('YYYY-MM-DD') and time ('HH:MM') in `timeZone`
 * to the real instant. Returns null for malformed input.
 */
export function zonedWallTimeToUtc(date: string, time: string, timeZone: string): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(time)
  if (!dateMatch || !timeMatch) return null

  const wallAsUtc = Date.UTC(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3]),
    Number(timeMatch[1]),
    Number(timeMatch[2])
  )
  try {
    // Guess with the offset at the wall time, then correct once in case the
    // guess landed across a DST change.
    let result = wallAsUtc - timeZoneOffsetMs(new Date(wallAsUtc), timeZone)
    result = wallAsUtc - timeZoneOffsetMs(new Date(result), timeZone)
    return new Date(result)
  } catch {
    return null // unknown timezone
  }
}

/** The instant an event ends, in its own timezone. */
export function getEventEndInstant(event: {
  endDate: Date
  endTime: string | null
  timezone: string
}): Date | null {
  // endDate is a DATE column, so Prisma hands it back as UTC midnight.
  const date = event.endDate.toISOString().slice(0, 10)
  return zonedWallTimeToUtc(date, event.endTime || DEFAULT_EVENT_END_TIME, event.timezone)
}

/** When a survey's scheduled send is due, or null if nothing is scheduled. */
export function getScheduledSendDueAt(
  survey: { scheduledSendMode: string | null; scheduledSendAt: Date | null },
  event: { endDate: Date; endTime: string | null; timezone: string }
): Date | null {
  if (survey.scheduledSendMode === 'event_end') return getEventEndInstant(event)
  if (survey.scheduledSendMode === 'custom') return survey.scheduledSendAt
  return null
}
