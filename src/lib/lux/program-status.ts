/** Labels and status rules for programs, orders and documents (no server imports) */

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Paying online',
  paid: 'Paid',
  office_pending: 'Pay at office',
  assistance_requested: 'Fee assistance requested',
  waived: 'Waived',
  cancelled: 'Cancelled',
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  check: 'Check',
  card: 'Card',
  bank_transfer: 'Bank transfer',
  other: 'Other',
}

export const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  missing: 'Missing',
  received: 'Received – needs review',
  approved: 'Approved',
  needs_resubmission: 'Needs a new copy',
  parish_lookup: 'Parish to look up',
}

export const PROGRAM_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  open: 'Open',
  closed: 'Closed',
  archived: 'Archived',
}

/** Statuses where the family still has to do something */
export const FAMILY_OUTSTANDING = ['missing', 'needs_resubmission']
/** Statuses where staff still have to do something */
export const STAFF_OUTSTANDING = ['received', 'parish_lookup']

export function documentsSummary(
  requirements: Array<{ id: string; required: boolean }>,
  submissions: Array<{ requirementId: string; status: string }>
) {
  const required = requirements.filter(r => r.required)
  const statusFor = (requirementId: string) => submissions.find(s => s.requirementId === requirementId)?.status ?? 'missing'
  const statuses = required.map(r => statusFor(r.id))
  return {
    required: required.length,
    done: statuses.filter(s => s === 'approved').length,
    outstandingFromFamily: statuses.filter(s => FAMILY_OUTSTANDING.includes(s)).length,
    awaitingStaff: statuses.filter(s => STAFF_OUTSTANDING.includes(s)).length,
  }
}
