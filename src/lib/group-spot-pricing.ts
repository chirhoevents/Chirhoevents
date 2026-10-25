/**
 * Group spot pricing for admin edits.
 *
 * When an admin adds or drops spots on an existing group registration, the
 * total is adjusted by just the spots that changed, priced the way this group
 * was priced at sign-up (housing-specific price, else the early-bird/regular
 * tier they registered under, minus any percentage coupon they used). The
 * existing total is never rebuilt from scratch, so negotiated prices, fixed
 * coupons and manual adjustments on the remaining spots are preserved.
 *
 * Shared by the edit modal (live preview) and the PUT route (source of truth).
 */

export interface SpotCounts {
  onCampusYouth: number
  onCampusChaperones: number
  offCampusYouth: number
  offCampusChaperones: number
  dayPassYouth: number
  dayPassChaperones: number
  priests: number
}

export const SPOT_KEYS: Array<keyof SpotCounts> = [
  'onCampusYouth',
  'onCampusChaperones',
  'offCampusYouth',
  'offCampusChaperones',
  'dayPassYouth',
  'dayPassChaperones',
  'priests',
]

export const SPOT_LABELS: Record<keyof SpotCounts, string> = {
  onCampusYouth: 'On-campus youth',
  onCampusChaperones: 'On-campus chaperone',
  offCampusYouth: 'Off-campus youth',
  offCampusChaperones: 'Off-campus chaperone',
  dayPassYouth: 'Day pass youth',
  dayPassChaperones: 'Day pass chaperone',
  priests: 'Priest',
}

// Prices may arrive as Prisma Decimals, numbers, or strings (JSON-serialized
// Decimals on the client), and dates as Date or ISO strings.
type Money = number | string | { toString(): string } | null | undefined
type DateLike = Date | string | null | undefined

export interface SpotPricingConfig {
  youthEarlyBirdPrice?: Money
  youthRegularPrice?: Money
  chaperoneEarlyBirdPrice?: Money
  chaperoneRegularPrice?: Money
  priestPrice?: Money
  onCampusYouthPrice?: Money
  offCampusYouthPrice?: Money
  dayPassYouthPrice?: Money
  onCampusChaperonePrice?: Money
  offCampusChaperonePrice?: Money
  dayPassChaperonePrice?: Money
  earlyBirdDeadline?: DateLike
  depositAmount?: Money
  depositPercentage?: Money
  depositPerPerson?: boolean | null
  requireFullPayment?: boolean | null
}

export interface RegistrationSpotFields {
  housingType?: string | null
  youthCount?: number | null
  chaperoneCount?: number | null
  priestCount?: number | null
  totalParticipants?: number | null
  onCampusYouth?: number | null
  onCampusChaperones?: number | null
  offCampusYouth?: number | null
  offCampusChaperones?: number | null
  dayPassYouth?: number | null
  dayPassChaperones?: number | null
}

const num = (v: Money): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(typeof v === 'object' ? v.toString() : v)
  return Number.isFinite(n) ? n : null
}

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * The spot counts a registration currently holds, per housing bucket.
 * Rows without inventory data put everyone under their housing type (day pass
 * when there is none), and rows with all-zero type counts but a positive
 * totalParticipants are treated as all youth — same view the edit modal shows.
 */
export function getRegistrationSpotCounts(reg: RegistrationSpotFields): SpotCounts {
  const priests = reg.priestCount || 0
  const inventory = [
    reg.onCampusYouth,
    reg.onCampusChaperones,
    reg.offCampusYouth,
    reg.offCampusChaperones,
    reg.dayPassYouth,
    reg.dayPassChaperones,
  ]
  if (inventory.some(v => typeof v === 'number' && v > 0)) {
    return {
      onCampusYouth: reg.onCampusYouth || 0,
      onCampusChaperones: reg.onCampusChaperones || 0,
      offCampusYouth: reg.offCampusYouth || 0,
      offCampusChaperones: reg.offCampusChaperones || 0,
      dayPassYouth: reg.dayPassYouth || 0,
      dayPassChaperones: reg.dayPassChaperones || 0,
      priests,
    }
  }

  let youth = reg.youthCount || 0
  const chaperones = reg.chaperoneCount || 0
  const storedTotal = reg.totalParticipants || 0
  if (youth === 0 && chaperones === 0 && priests === 0 && storedTotal > 0) {
    youth = storedTotal
  }
  const bucket = reg.housingType || 'day_pass'
  return {
    onCampusYouth: bucket === 'on_campus' ? youth : 0,
    onCampusChaperones: bucket === 'on_campus' ? chaperones : 0,
    offCampusYouth: bucket === 'off_campus' ? youth : 0,
    offCampusChaperones: bucket === 'off_campus' ? chaperones : 0,
    dayPassYouth: bucket === 'day_pass' ? youth : 0,
    dayPassChaperones: bucket === 'day_pass' ? chaperones : 0,
    priests,
  }
}

export function spotCountsEqual(a: SpotCounts, b: SpotCounts): boolean {
  return SPOT_KEYS.every(key => a[key] === b[key])
}

/**
 * Per-spot list price for this group. Mirrors sign-up pricing in
 * /api/registration/group: a housing-specific price wins, otherwise the
 * early-bird price if the group registered before the early-bird deadline,
 * otherwise the regular price.
 */
export function getSpotUnitPrices(
  pricing: SpotPricingConfig,
  registeredAt: DateLike
): Record<keyof SpotCounts, number> {
  const deadline = pricing.earlyBirdDeadline ? new Date(pricing.earlyBirdDeadline) : null
  const regDate = registeredAt ? new Date(registeredAt) : new Date()
  const isEarlyBird = !!deadline && regDate.getTime() <= deadline.getTime()

  const youthTier =
    (isEarlyBird ? num(pricing.youthEarlyBirdPrice) : null) || num(pricing.youthRegularPrice) || 0
  const chaperoneTier =
    (isEarlyBird ? num(pricing.chaperoneEarlyBirdPrice) : null) || num(pricing.chaperoneRegularPrice) || 0

  return {
    onCampusYouth: num(pricing.onCampusYouthPrice) || youthTier,
    onCampusChaperones: num(pricing.onCampusChaperonePrice) || chaperoneTier,
    offCampusYouth: num(pricing.offCampusYouthPrice) || youthTier,
    offCampusChaperones: num(pricing.offCampusChaperonePrice) || chaperoneTier,
    dayPassYouth: num(pricing.dayPassYouthPrice) || youthTier,
    dayPassChaperones: num(pricing.dayPassChaperonePrice) || chaperoneTier,
    priests: num(pricing.priestPrice) || 0,
  }
}

export interface SpotChangeLine {
  key: keyof SpotCounts
  label: string
  change: number
  unitPrice: number
  amount: number
}

export interface SpotChangeResult {
  lines: SpotChangeLine[]
  /** Sum of the line amounts after the group's percentage coupon. */
  spotsDelta: number
  couponPercent: number
  /** Deposit already paid on dropped spots; it stays owed (non-refundable). */
  forfeitedDeposit: number
  droppedSpots: number
  newTotal: number
}

/**
 * New total after changing spot counts from `oldCounts` to `newCounts`.
 * Moving a spot between housing buckets is priced as the price difference;
 * only a net drop of youth/chaperones/priests forfeits deposit.
 */
export function calculateSpotChange(params: {
  currentTotal: number
  oldCounts: SpotCounts
  newCounts: SpotCounts
  pricing: SpotPricingConfig
  registeredAt: DateLike
  couponPercent?: number | null
  amountPaid?: number | null
}): SpotChangeResult {
  const { currentTotal, oldCounts, newCounts, pricing, registeredAt } = params
  const couponPercent = Math.min(100, Math.max(0, params.couponPercent || 0))
  const unit = getSpotUnitPrices(pricing, registeredAt)

  const lines: SpotChangeLine[] = []
  for (const key of SPOT_KEYS) {
    const change = newCounts[key] - oldCounts[key]
    if (change !== 0) {
      lines.push({
        key,
        label: SPOT_LABELS[key],
        change,
        unitPrice: unit[key],
        amount: round2(change * unit[key]),
      })
    }
  }

  const rawDelta = lines.reduce((sum, l) => sum + l.amount, 0)
  const spotsDelta = round2(rawDelta * (1 - couponPercent / 100))

  // Net drops per participant type (moving between housing buckets isn't a drop).
  const youthOf = (c: SpotCounts) => c.onCampusYouth + c.offCampusYouth + c.dayPassYouth
  const chapOf = (c: SpotCounts) => c.onCampusChaperones + c.offCampusChaperones + c.dayPassChaperones
  const droppedYouth = Math.max(0, youthOf(oldCounts) - youthOf(newCounts))
  const droppedChaperones = Math.max(0, chapOf(oldCounts) - chapOf(newCounts))
  const droppedPriests = Math.max(0, oldCounts.priests - newCounts.priests)
  const droppedSpots = droppedYouth + droppedChaperones + droppedPriests

  // Only the two configurations where a deposit is a distinct per-spot slice
  // (percentage-of-price, or flat per-person) forfeit anything; a flat
  // total-group deposit or "pay in full" has no per-spot share to keep.
  let forfeitedDeposit = 0
  if (droppedSpots > 0 && !pricing.requireFullPayment) {
    // Price of a dropped spot: the cheapest bucket the type was removed from
    // is a conservative pick when drops span several buckets.
    const droppedPrice = (keys: Array<keyof SpotCounts>) => {
      const dropped = keys.filter(k => newCounts[k] < oldCounts[k])
      return dropped.length ? Math.min(...dropped.map(k => unit[k])) : 0
    }
    const youthPrice = droppedPrice(['onCampusYouth', 'offCampusYouth', 'dayPassYouth'])
    const chapPrice = droppedPrice(['onCampusChaperones', 'offCampusChaperones', 'dayPassChaperones'])
    const priestPrice = unit.priests

    const depositPercentage = num(pricing.depositPercentage)
    const depositAmount = num(pricing.depositAmount)
    if (depositPercentage != null) {
      const droppedValue =
        (droppedYouth * youthPrice + droppedChaperones * chapPrice + droppedPriests * priestPrice) *
        (1 - couponPercent / 100)
      forfeitedDeposit = (droppedValue * depositPercentage) / 100
    } else if (depositAmount != null && pricing.depositPerPerson !== false) {
      // Free spots (e.g. priests at $0) never paid a deposit.
      const paidDrops =
        (youthPrice > 0 ? droppedYouth : 0) +
        (chapPrice > 0 ? droppedChaperones : 0) +
        (priestPrice > 0 ? droppedPriests : 0)
      forfeitedDeposit = paidDrops * depositAmount
    }
  }
  // Never forfeit more than has actually been paid.
  forfeitedDeposit = round2(Math.min(forfeitedDeposit, Math.max(0, params.amountPaid || 0)))

  return {
    lines,
    spotsDelta,
    couponPercent,
    forfeitedDeposit,
    droppedSpots,
    newTotal: round2(Math.max(0, currentTotal + spotsDelta + forfeitedDeposit)),
  }
}
