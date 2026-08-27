// Stripe charges 2.9% + $0.30 per successful US card transaction. For destination
// charges to Standard Connect accounts, Stripe debits this fee from the platform's
// balance — `on_behalf_of` does not shift it for that account type. To stay net
// positive, we bake the Stripe fee into application_fee_amount: the connected
// account effectively pays it via a larger app-fee deduction, and the platform
// keeps its full configured margin.
const STRIPE_PERCENT_FEE = 0.029
const STRIPE_FIXED_FEE_CENTS = 30

export function calculateStripeProcessingFeeCents(amountCents: number): number {
  return Math.round(amountCents * STRIPE_PERCENT_FEE) + STRIPE_FIXED_FEE_CENTS
}

export function calculatePlatformFeeCents(
  amountCents: number,
  platformFeePercentage: number
): number {
  const platformMarginCents = Math.round(
    amountCents * (platformFeePercentage / 100)
  )
  const stripeFeeReimbursementCents = calculateStripeProcessingFeeCents(amountCents)
  return platformMarginCents + stripeFeeReimbursementCents
}
