/**
 * Registration Price Calculator
 * Calculates total registration prices based on participants and event pricing
 */

export interface EventPricing {
  youthEarlyBirdPrice: number | null
  youthRegularPrice: number | null
  youthLatePrice: number | null
  chaperoneEarlyBirdPrice: number | null
  chaperoneRegularPrice: number | null
  chaperoneLatePrice: number | null
  priestPrice: number | null
  onCampusYouthPrice: number | null
  offCampusYouthPrice: number | null
  dayPassYouthPrice: number | null
  onCampusChaperonePrice: number | null
  offCampusChaperonePrice: number | null
  dayPassChaperonePrice: number | null
  earlyBirdDeadline: Date | null
  regularDeadline: Date | null
  fullPaymentDeadline: Date | null
}

export interface Participant {
  participantType: 'youth_u18' | 'youth_o18' | 'chaperone' | 'priest'
}

export interface CalculatePriceParams {
  participants: Participant[]
  housingType: 'on_campus' | 'off_campus' | 'day_pass'
  pricing: EventPricing
  registrationDate?: Date
}

/**
 * Determines the current pricing tier based on registration date and deadlines
 */
function getPricingTier(
  registrationDate: Date,
  earlyBirdDeadline: Date | null,
  regularDeadline: Date | null
): 'early_bird' | 'regular' | 'late' {
  const now = registrationDate.getTime()

  if (earlyBirdDeadline && now <= earlyBirdDeadline.getTime()) {
    return 'early_bird'
  }

  if (regularDeadline && now <= regularDeadline.getTime()) {
    return 'regular'
  }

  return 'late'
}

/**
 * Gets the price for a single participant based on type, housing, and tier
 */
function getParticipantPrice(
  participant: Participant,
  housingType: 'on_campus' | 'off_campus' | 'day_pass',
  tier: 'early_bird' | 'regular' | 'late',
  pricing: EventPricing
): number {
  const { participantType } = participant

  // Priests are always free
  if (participantType === 'priest') {
    return pricing.priestPrice || 0
  }

  // For youth participants
  if (participantType === 'youth_u18' || participantType === 'youth_o18') {
    // Check for housing-specific pricing first
    if (housingType === 'on_campus' && pricing.onCampusYouthPrice) {
      return pricing.onCampusYouthPrice
    }
    if (housingType === 'off_campus' && pricing.offCampusYouthPrice) {
      return pricing.offCampusYouthPrice
    }
    if (housingType === 'day_pass' && pricing.dayPassYouthPrice) {
      return pricing.dayPassYouthPrice
    }

    // Fall back to tier-based pricing
    if (tier === 'early_bird' && pricing.youthEarlyBirdPrice) {
      return pricing.youthEarlyBirdPrice
    }
    if (tier === 'regular' && pricing.youthRegularPrice) {
      return pricing.youthRegularPrice
    }
    if (tier === 'late' && pricing.youthLatePrice) {
      return pricing.youthLatePrice
    }

    // Final fallback to regular price
    return pricing.youthRegularPrice || 0
  }

  // For chaperones
  if (participantType === 'chaperone') {
    // Check for housing-specific pricing first
    if (housingType === 'on_campus' && pricing.onCampusChaperonePrice) {
      return pricing.onCampusChaperonePrice
    }
    if (housingType === 'off_campus' && pricing.offCampusChaperonePrice) {
      return pricing.offCampusChaperonePrice
    }
    if (housingType === 'day_pass' && pricing.dayPassChaperonePrice) {
      return pricing.dayPassChaperonePrice
    }

    // Fall back to tier-based pricing
    if (tier === 'early_bird' && pricing.chaperoneEarlyBirdPrice) {
      return pricing.chaperoneEarlyBirdPrice
    }
    if (tier === 'regular' && pricing.chaperoneRegularPrice) {
      return pricing.chaperoneRegularPrice
    }
    if (tier === 'late' && pricing.chaperoneLatePrice) {
      return pricing.chaperoneLatePrice
    }

    // Final fallback to regular price
    return pricing.chaperoneRegularPrice || 0
  }

  return 0
}

/**
 * Calculates the total registration price for a group
 */
export function calculateRegistrationPrice({
  participants,
  housingType,
  pricing,
  registrationDate = new Date(),
}: CalculatePriceParams): {
  total: number
  breakdown: Array<{
    participantType: string
    count: number
    pricePerPerson: number
    subtotal: number
  }>
  tier: 'early_bird' | 'regular' | 'late'
} {
  const tier = getPricingTier(
    registrationDate,
    pricing.earlyBirdDeadline,
    pricing.regularDeadline
  )

  // Group participants by type
  const participantGroups = participants.reduce(
    (acc, participant) => {
      const type = participant.participantType
      if (!acc[type]) {
        acc[type] = []
      }
      acc[type].push(participant)
      return acc
    },
    {} as Record<string, Participant[]>
  )

  // Calculate price for each group
  const breakdown = Object.entries(participantGroups).map(([type, group]) => {
    const pricePerPerson = getParticipantPrice(
      group[0],
      housingType,
      tier,
      pricing
    )
    const count = group.length
    const subtotal = pricePerPerson * count

    return {
      participantType: type,
      count,
      pricePerPerson,
      subtotal,
    }
  })

  const total = breakdown.reduce((sum, item) => sum + item.subtotal, 0)

  return {
    total,
    breakdown,
    tier,
  }
}
