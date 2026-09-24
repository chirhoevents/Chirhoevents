type BalanceStatus =
  | 'unpaid'
  | 'partial'
  | 'paid_full'
  | 'overpaid'
  | 'refunded'
  | 'pending_check_payment'

/**
 * Derive amountRemaining + paymentStatus from the two source-of-truth numbers
 * (invoice total and net amount paid) instead of nudging amountRemaining by a
 * delta. Delta updates drift: e.g. lowering a $275 invoice to $125 clamps the
 * remaining balance at $0, and a later $150 refund that "increments remaining"
 * then leaves a phantom $150 due on a fully paid registration.
 */
export function deriveBalance(
  totalAmountDue: number,
  amountPaid: number,
  currentStatus?: BalanceStatus | null
): { amountRemaining: number; paymentStatus: BalanceStatus } {
  const total = Math.max(0, totalAmountDue)
  const paid = Math.max(0, amountPaid)
  const amountRemaining = Math.max(0, Math.round((total - paid) * 100) / 100)

  let paymentStatus: BalanceStatus
  if (paid <= 0) {
    // Nothing paid yet — keep "waiting on a check" / "refunded" markers.
    paymentStatus =
      currentStatus === 'pending_check_payment' || currentStatus === 'refunded'
        ? currentStatus
        : 'unpaid'
  } else if (paid > total + 0.005) {
    paymentStatus = 'overpaid'
  } else if (amountRemaining <= 0) {
    paymentStatus = 'paid_full'
  } else {
    paymentStatus = 'partial'
  }

  return { amountRemaining, paymentStatus }
}

export const REFUND_REASON_LABELS: Record<string, string> = {
  participant_removed: 'Participant Removed',
  group_cancellation: 'Group Cancellation',
  event_cancellation: 'Event Cancellation',
  overpayment_correction: 'Overpayment Correction',
  emergency_illness: 'Emergency / Illness',
  other: 'Other',
}

export function refundReasonLabel(reason: string | null | undefined): string {
  if (!reason) return ''
  return REFUND_REASON_LABELS[reason] || reason
}
