// Orgs collecting payments directly into the platform's own Stripe account
// (Organization.usePlatformStripeAccount) carry more risk for Chirho Technologies
// than a normal Connect destination charge — Chirho is the merchant of record,
// so a large chargeback or dispute lands on Chirho's own account. To limit that
// exposure, no single card charge for such an org may exceed this amount; a
// bigger payment must come in as a check instead.
export const PLATFORM_COLLECTED_CARD_CAP_CENTS = 100_000 // $1,000

export function exceedsPlatformCollectedCardCap(
  organization: { usePlatformStripeAccount: boolean },
  amountCents: number
): boolean {
  return organization.usePlatformStripeAccount && amountCents > PLATFORM_COLLECTED_CARD_CAP_CENTS
}

export const PLATFORM_COLLECTED_CARD_CAP_MESSAGE =
  'Due to financial circumstances this year, we are unable to process card payments over $1,000 for this event. Please mail a check for the full amount using the instructions below.'

export const PLATFORM_COLLECTED_CARD_CAP_ERROR =
  'This organization cannot process card payments over $1,000 at this time. Please process this as a check or cash payment instead.'
