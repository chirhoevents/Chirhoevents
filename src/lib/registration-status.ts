/**
 * Registration Status Helper
 *
 * Determines the current registration status of an event based on:
 * - Current date/time
 * - Registration open/close dates
 * - Event start/end dates
 * - Capacity limits
 */

export type RegistrationStatusType =
  | 'not_yet_open'
  | 'open'
  | 'closing_soon'
  | 'closed'
  | 'at_capacity'
  | 'event_ended'

export interface RegistrationStatusResult {
  status: RegistrationStatusType
  message: string
  showCountdown: boolean
  countdownTarget: Date | null
  allowRegistration: boolean
  allowWaitlist: boolean
  spotsRemaining: number | null
  urgentStyle: boolean
}

export interface EventForStatus {
  status?: string // Manual event status override
  startDate: Date
  endDate: Date
  registrationOpenDate: Date | null
  registrationCloseDate: Date | null
  capacityTotal: number | null
  capacityRemaining: number | null
  enableWaitlist: boolean
  closedMessage?: string | null // Custom message when closed
  settings?: {
    countdownBeforeOpen?: boolean
    countdownBeforeClose?: boolean
    waitlistEnabled?: boolean
  }
}

const CLOSING_SOON_HOURS = 48 // Show "closing soon" when within 48 hours

/**
 * Get the current registration status for an event
 */
export function getRegistrationStatus(
  event: EventForStatus,
  currentDate: Date = new Date()
): RegistrationStatusResult {
  const now = currentDate.getTime()
  const eventStart = event.startDate.getTime()
  const eventEnd = event.endDate.getTime()
  const regOpen = event.registrationOpenDate?.getTime() || null
  const regClose = event.registrationCloseDate?.getTime() || null

  // 0. MANUAL STATUS OVERRIDE - Admin manually closed registration
  if (event.status === 'registration_closed') {
    return {
      status: 'closed',
      message: event.closedMessage || 'Registration is closed',
      showCountdown: false,
      countdownTarget: null,
      allowRegistration: false,
      allowWaitlist: event.settings?.waitlistEnabled ?? event.enableWaitlist,
      spotsRemaining: event.capacityRemaining,
      urgentStyle: false,
    }
  }

  // 1. EVENT ENDED - Event has completed
  if (now > eventEnd) {
    return {
      status: 'event_ended',
      message: 'This event has ended',
      showCountdown: false,
      countdownTarget: null,
      allowRegistration: false,
      allowWaitlist: false,
      spotsRemaining: null,
      urgentStyle: false,
    }
  }

  // 2. AT CAPACITY - Event is full
  if (
    event.capacityTotal !== null &&
    event.capacityRemaining !== null &&
    event.capacityRemaining <= 0
  ) {
    return {
      status: 'at_capacity',
      message: 'Event is at full capacity',
      showCountdown: false,
      countdownTarget: null,
      allowRegistration: false,
      allowWaitlist: event.enableWaitlist,
      spotsRemaining: 0,
      urgentStyle: false,
    }
  }

  // 3. NOT YET OPEN - Before registration opens
  if (regOpen && now < regOpen) {
    return {
      status: 'not_yet_open',
      message: 'Registration opens soon',
      showCountdown: event.settings?.countdownBeforeOpen ?? true,
      countdownTarget: new Date(regOpen),
      allowRegistration: false,
      allowWaitlist: false,
      spotsRemaining: event.capacityRemaining,
      urgentStyle: false,
    }
  }

  // 4. CLOSED - After registration closes or after event starts
  const effectiveCloseDate = regClose ? Math.min(regClose, eventStart) : eventStart
  if (now > effectiveCloseDate) {
    return {
      status: 'closed',
      message: 'Registration is closed',
      showCountdown: false,
      countdownTarget: null,
      allowRegistration: false,
      allowWaitlist: event.enableWaitlist,
      spotsRemaining: event.capacityRemaining,
      urgentStyle: false,
    }
  }

  // 5. CLOSING SOON - Within 48 hours of closing
  const timeUntilClose = effectiveCloseDate - now
  const hoursUntilClose = timeUntilClose / (1000 * 60 * 60)

  if (hoursUntilClose <= CLOSING_SOON_HOURS) {
    return {
      status: 'closing_soon',
      message: 'Registration closes soon!',
      showCountdown: event.settings?.countdownBeforeClose ?? true,
      countdownTarget: new Date(effectiveCloseDate),
      allowRegistration: true,
      allowWaitlist: false,
      spotsRemaining: event.capacityRemaining,
      urgentStyle: true,
    }
  }

  // 6. OPEN - Registration is currently open
  return {
    status: 'open',
    message: 'Registration is open',
    showCountdown: false,
    countdownTarget: null,
    allowRegistration: true,
    allowWaitlist: false,
    spotsRemaining: event.capacityRemaining,
    urgentStyle: false,
  }
}

/**
 * Get a human-readable description of spots remaining
 */
export function getSpotsRemainingMessage(
  spotsRemaining: number | null,
  threshold: number = 20
): string | null {
  if (spotsRemaining === null) {
    return null
  }

  if (spotsRemaining === 0) {
    return 'Event is full'
  }

  if (spotsRemaining <= threshold) {
    return `Only ${spotsRemaining} spot${spotsRemaining === 1 ? '' : 's'} remaining!`
  }

  return `${spotsRemaining} spots available`
}

/**
 * Calculate time remaining until a target date
 */
export function getTimeRemaining(targetDate: Date, currentDate: Date = new Date()) {
  const total = targetDate.getTime() - currentDate.getTime()

  if (total <= 0) {
    return {
      total: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    }
  }

  const seconds = Math.floor((total / 1000) % 60)
  const minutes = Math.floor((total / 1000 / 60) % 60)
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24)
  const days = Math.floor(total / (1000 * 60 * 60 * 24))

  return {
    total,
    days,
    hours,
    minutes,
    seconds,
  }
}
