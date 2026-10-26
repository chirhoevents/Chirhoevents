import { parseDateTimeInTimezone } from '@/lib/timezone'

/**
 * When an event is over.
 *
 * An event ends at midnight after its last day, in the event's own
 * timezone, so late arrivals can still hand in forms all through the final
 * day. It also counts as over once it's marked completed (the hourly
 * complete-ended-events cron does that) or archived.
 *
 * Once over, registrants can no longer submit liability forms (staff enter
 * late ones from Poros instead) and the group leader portal is read-only,
 * apart from paying an outstanding balance.
 */

export interface EventEndFields {
  endDate: Date
  timezone?: string | null
  status?: string | null
  archivedAt?: Date | null
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Midnight after the event's last day, in its timezone. */
export function getEventEndsAt(event: Pick<EventEndFields, 'endDate' | 'timezone'>): Date {
  // endDate is a DATE column, so Prisma hands it back as UTC midnight of that day.
  const nextDay = new Date(new Date(event.endDate).getTime() + DAY_MS).toISOString().slice(0, 10)
  try {
    return parseDateTimeInTimezone(`${nextDay}T00:00`, event.timezone || 'America/New_York')
  } catch {
    // Unknown timezone: fall back to UTC midnight
    return new Date(`${nextDay}T00:00:00Z`)
  }
}

export function hasEventEnded(event: EventEndFields, now: Date = new Date()): boolean {
  if (event.status === 'completed' || event.archivedAt) return true
  return now.getTime() >= getEventEndsAt(event).getTime()
}

export const EVENT_ENDED_FORM_MESSAGE =
  'This event has ended, so liability forms can no longer be submitted online. Please contact the event organizer, who can add your form for you.'

export const EVENT_ENDED_PORTAL_MESSAGE =
  'This event has ended, so the group leader portal is now read-only. You can still view your registration, forms and receipts, and pay any remaining balance. Please contact the event organizer if something needs to change.'

export const EVENT_ENDED_ADMIN_RESEND_MESSAGE =
  'This event has ended, so form links no longer work online. Use the Manual Entry tab in Poros Liability to enter any late forms.'
