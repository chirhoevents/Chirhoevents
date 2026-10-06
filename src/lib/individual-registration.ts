/**
 * Shared rules for individual registrations, used by the registration form,
 * the review page, the registration API and the emails so they can't drift
 * apart (e.g. the review page showing one price while Stripe charges another).
 */

const DAY_MS = 24 * 60 * 60 * 1000

// null/undefined means "not set"; 0 is a real price (free).
type Price = number | null | undefined

export interface IndividualPricing {
  individualBasePrice?: Price
  individualEarlyBirdPrice?: Price
  individualOffCampusPrice?: Price
  individualDayPassPrice?: Price
  youthRegularPrice?: Price
  singleRoomPrice?: Price
  doubleRoomPrice?: Price
  tripleRoomPrice?: Price
  quadRoomPrice?: Price
  individualMealPackagePrice?: Price
  earlyBirdDeadline?: string | Date | null
}

export interface IndividualSelection {
  housingType: string
  roomType?: string | null
  /** Price of the chosen day pass option, if one was chosen */
  dayPassOptionPrice?: Price
  /** Optional meal package add-on (only offered when the event enables it) */
  includeMealPackage?: boolean
}

/**
 * Price of one individual registration before coupons.
 */
export function calculateIndividualPrice(
  pricing: IndividualPricing,
  selection: IndividualSelection,
  now: Date = new Date()
): number {
  const deadline = pricing.earlyBirdDeadline ? new Date(pricing.earlyBirdDeadline) : null
  const isEarlyBird = !!deadline && now <= deadline
  const standardPrice = isEarlyBird
    ? pricing.individualEarlyBirdPrice ?? pricing.individualBasePrice ?? pricing.youthRegularPrice ?? 0
    : pricing.individualBasePrice ?? pricing.youthRegularPrice ?? 0

  let total: number
  if (selection.housingType === 'day_pass') {
    total = selection.dayPassOptionPrice ?? pricing.individualDayPassPrice ?? 0
  } else if (selection.housingType === 'off_campus' && pricing.individualOffCampusPrice != null) {
    total = pricing.individualOffCampusPrice
  } else {
    total = standardPrice
  }

  if (selection.housingType === 'on_campus' && selection.roomType) {
    const roomPrices: Record<string, Price> = {
      single: pricing.singleRoomPrice,
      double: pricing.doubleRoomPrice,
      triple: pricing.tripleRoomPrice,
      quad: pricing.quadRoomPrice,
    }
    total += roomPrices[selection.roomType] ?? 0
  }

  if (selection.includeMealPackage) {
    total += pricing.individualMealPackagePrice ?? 0
  }

  return Number(total)
}

export const ROOM_TYPES = ['single', 'double', 'triple', 'quad'] as const
export type IndividualRoomType = (typeof ROOM_TYPES)[number]

// Event settings fields the individual housing rules read (all optional, so
// the public event API's settings object and Prisma's EventSettings both fit)
export interface IndividualHousingSettings {
  porosHousingEnabled?: boolean | null
  allowOnCampus?: boolean | null
  allowOffCampus?: boolean | null
  allowSingleRoom?: boolean | null
  allowDoubleRoom?: boolean | null
  allowTripleRoom?: boolean | null
  allowQuadRoom?: boolean | null
  singleRoomLabel?: string | null
  doubleRoomLabel?: string | null
  tripleRoomLabel?: string | null
  quadRoomLabel?: string | null
  onCampusCapacity?: number | null
  onCampusRemaining?: number | null
  singleRoomCapacity?: number | null
  singleRoomRemaining?: number | null
  doubleRoomCapacity?: number | null
  doubleRoomRemaining?: number | null
  tripleRoomCapacity?: number | null
  tripleRoomRemaining?: number | null
  quadRoomCapacity?: number | null
  quadRoomRemaining?: number | null
}

const ROOM_SETTING_KEYS: Record<IndividualRoomType, {
  allow: keyof IndividualHousingSettings
  label: keyof IndividualHousingSettings
  capacity: keyof IndividualHousingSettings
  remaining: keyof IndividualHousingSettings
}> = {
  single: { allow: 'allowSingleRoom', label: 'singleRoomLabel', capacity: 'singleRoomCapacity', remaining: 'singleRoomRemaining' },
  double: { allow: 'allowDoubleRoom', label: 'doubleRoomLabel', capacity: 'doubleRoomCapacity', remaining: 'doubleRoomRemaining' },
  triple: { allow: 'allowTripleRoom', label: 'tripleRoomLabel', capacity: 'tripleRoomCapacity', remaining: 'tripleRoomRemaining' },
  quad: { allow: 'allowQuadRoom', label: 'quadRoomLabel', capacity: 'quadRoomCapacity', remaining: 'quadRoomRemaining' },
}

/** The organizer's name for a room type (e.g. "Dorm Double"), or "Double Room" */
export function roomTypeLabel(roomType: string, settings?: IndividualHousingSettings | null): string {
  const key = ROOM_SETTING_KEYS[roomType as IndividualRoomType]
  const custom = key ? settings?.[key.label] : null
  if (typeof custom === 'string' && custom.trim()) return custom.trim()
  return `${roomType.charAt(0).toUpperCase()}${roomType.slice(1)} Room`
}

const isFull = (capacity: unknown, remaining: unknown) =>
  typeof capacity === 'number' && typeof remaining === 'number' && remaining <= 0

/**
 * What an individual may choose for housing, from the event's settings:
 * whether on-campus / off-campus are allowed (and on-campus not full), and
 * which room types are allowed, each marked full or not.
 */
export function individualHousingOptions(settings: IndividualHousingSettings | null | undefined) {
  const rooms = ROOM_TYPES
    .filter(room => settings?.[ROOM_SETTING_KEYS[room].allow] !== false)
    .map(room => ({
      value: room,
      label: roomTypeLabel(room, settings),
      full: isFull(settings?.[ROOM_SETTING_KEYS[room].capacity], settings?.[ROOM_SETTING_KEYS[room].remaining]),
    }))
  return {
    onCampusAllowed: settings?.allowOnCampus !== false,
    onCampusFull: isFull(settings?.onCampusCapacity, settings?.onCampusRemaining),
    offCampusAllowed: settings?.allowOffCampus !== false,
    rooms,
  }
}

/**
 * Housing choices only appear on the individual form for multi-day events
 * with housing turned on; everyone else is registered as off-campus.
 */
export function eventOffersHousing(
  settings: { porosHousingEnabled?: boolean | null } | null | undefined,
  startDate: Date | string,
  endDate: Date | string
): boolean {
  const day = (d: Date | string) => new Date(d).toISOString().split('T')[0]
  return !!settings?.porosHousingEnabled && day(startDate) !== day(endDate)
}

/**
 * Label/value lines describing what someone registered for, for emails and
 * the confirmation page. Housing lines are left out when the event doesn't
 * offer housing, so nobody is told they have an on-campus double room at an
 * event with no housing.
 */
export function individualAttendanceLines(reg: {
  ticketType?: string | null
  housingType?: string | null
  roomType?: string | null
  housingOffered: boolean
  dayPassName?: string | null
  /** For the organizer's custom room names */
  settings?: IndividualHousingSettings | null
  includesMealPackage?: boolean | null
}): Array<{ label: string; value: string }> {
  const lines: Array<{ label: string; value: string }> = []
  if (reg.ticketType === 'day_pass' || reg.housingType === 'day_pass') {
    lines.push({ label: 'Ticket', value: reg.dayPassName ? `Day Pass: ${reg.dayPassName}` : 'Day Pass' })
  } else {
    lines.push({ label: 'Ticket', value: 'General Admission' })
    if (reg.housingOffered) {
      if (reg.housingType === 'on_campus') {
        lines.push({ label: 'Housing', value: 'On-campus housing' })
        if (reg.roomType) {
          lines.push({ label: 'Room', value: roomTypeLabel(reg.roomType, reg.settings) })
        }
      } else {
        lines.push({ label: 'Housing', value: 'Off-campus (own accommodations)' })
      }
    }
  }
  if (reg.includesMealPackage) {
    lines.push({ label: 'Meal Package', value: 'Included' })
  }
  return lines
}

/**
 * For an individual registration under 18, registration itself is step 1 of
 * the youth liability form, so the parent link (step 2) goes out in the
 * confirmation email. That email can arrive months before the event, so the
 * link stays valid through the event's last day instead of the 7 days used
 * when a teen sends the link to a parent themselves.
 */
export function individualParentTokenExpiry(eventEndDate: Date): Date {
  const minimum = new Date(Date.now() + 7 * DAY_MS)
  const afterEvent = new Date(new Date(eventEndDate).getTime() + DAY_MS)
  return afterEvent > minimum ? afterEvent : minimum
}

/**
 * Link for the "Complete Liability Form" button in an individual's emails:
 * straight to the parent form for a minor with a parent link, otherwise the
 * Poros page for their confirmation code.
 */
export function individualLiabilityFormUrl(
  appUrl: string,
  confirmationCode: string | null,
  parentToken: string | null | undefined
): string {
  return parentToken
    ? `${appUrl}/poros/parent/${parentToken}`
    : `${appUrl}/poros/${confirmationCode}`
}

/**
 * The "Liability Form Required" block for an individual's confirmation email.
 * A minor's form is completed and signed by a parent/guardian through the
 * link; an adult completes their own.
 */
export function individualLiabilityEmailBlock(opts: {
  url: string
  isMinor: boolean
  participantFirstName: string
}): string {
  const intro = opts.isMinor
    ? `Because ${opts.participantFirstName} is under 18, a <strong>parent or guardian</strong> must fill out the medical, insurance and emergency contact information and sign the liability form before the event. ${opts.participantFirstName}'s registration details are already filled in.`
    : 'Please complete and sign your liability form before the event.'
  const forwardNote = opts.isMinor
    ? `<p style="color: #92400E; font-size: 13px; margin: 15px 0 0 0;">If ${opts.participantFirstName} registered with their own email address, please forward this email to a parent or guardian.</p>`
    : ''
  return `
    <div style="background-color: #FEF3C7; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #F59E0B;">
      <h3 style="color: #92400E; margin-top: 0;">📋 Liability Form Required</h3>
      <p style="color: #92400E; margin-bottom: 15px;">${intro}</p>
      <div style="text-align: center;">
        <a href="${opts.url}"
           style="display: inline-block; background-color: #1E3A5F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          ${opts.isMinor ? 'Parent/Guardian: Complete Liability Form' : 'Complete Liability Form'}
        </a>
      </div>
      <p style="color: #78716C; font-size: 12px; margin-top: 15px; text-align: center;">
        Or copy this link: ${opts.url}
      </p>
      ${forwardNote}
    </div>
  `
}

/**
 * The organizer's custom confirmation message (set in the event wizard),
 * styled the same way as in the group confirmation email.
 */
export function organizerMessageBlock(message: string | null | undefined): string {
  if (!message) return ''
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0; background: #f0f7ff; border-radius: 8px; padding: 16px; border-left: 4px solid #1a73e8;">
      <tr>
        <td>
          <p style="margin: 0;">${message.replace(/\n/g, '<br>')}</p>
        </td>
      </tr>
    </table>
  `
}
