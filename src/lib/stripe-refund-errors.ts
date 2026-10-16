/**
 * Card refunds on destination charges pull the money back from the org's
 * connected Stripe account (reverse_transfer). Stripe only uses the settled
 * ("available") part of that balance, and automatic payouts sweep it to the
 * bank every day, so refunds on older payments often fail even though the
 * dashboard shows money in the account. Stripe's wording for that is
 * developer-facing, so translate it into something an org admin can act on.
 */
export const INSUFFICIENT_BALANCE_REFUND_MESSAGE =
  "Your Stripe account doesn't have enough available balance to cover this refund. " +
  'Recent payments take about 2 business days to settle before they can be used for refunds, ' +
  'and automatic payouts send settled funds to your bank each day. ' +
  'You can refund another way (for example by check) and record it here with that method, ' +
  'or try again once your available Stripe balance covers the refund.'

export function isInsufficientBalanceRefundError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : ''
  return /sufficient funds in their stripe balance/i.test(message)
}

/** A refund failure message an org admin can act on */
export function stripeRefundErrorMessage(error: unknown): string {
  if (isInsufficientBalanceRefundError(error)) return INSUFFICIENT_BALANCE_REFUND_MESSAGE
  const detail = error instanceof Error ? error.message : 'Unknown error'
  return `Stripe couldn't process this refund: ${detail}`
}
