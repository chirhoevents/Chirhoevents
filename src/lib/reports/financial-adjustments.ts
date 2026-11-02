/**
 * Notes use plain ASCII ("to", "-"): they're also printed in the PDF
 * statement, whose built-in font has no arrow or minus-sign glyphs.
 *
 * Turns the registration_edits audit trail into plain-English notes for the
 * financial report, so whoever reads it can see *why* a registration's
 * invoiced amount moved (spots added/dropped, deposit kept or waived, manual
 * price changes) instead of just seeing numbers that don't match sign-up.
 */

const money = (n: number) => `$${n.toFixed(2)}`

const HOUSING_LABELS: Record<string, string> = {
  onCampusTotal: 'On-campus spots',
  offCampusTotal: 'Off-campus spots',
  dayPassTotal: 'Day-pass spots',
}

/** Dollar amount stored on a deposit change entry (structured or legacy text). */
function amountOf(change: any): number {
  if (!change || typeof change !== 'object') return 0
  if (typeof change.amount === 'number') return change.amount
  const match = String(change.new ?? '').match(/\$([\d,]+(?:\.\d+)?)/)
  return match ? Number(match[1].replace(/,/g, '')) : 0
}

export interface EditSummary {
  /** One-line, human-readable explanation of the change. */
  note: string
  /** Deposit kept on dropped spots by this edit (counts toward the total). */
  depositForfeited: number
  /** Deposit on dropped spots an admin released (not charged). */
  depositWaived: number
  /** A previously kept deposit that was later reversed/corrected. */
  depositReversed: number
}

export function summarizeEdit(changesMade: unknown, difference: number, adminNotes?: string | null): EditSummary {
  const changes = (changesMade && typeof changesMade === 'object' ? changesMade : {}) as Record<string, any>
  const parts: string[] = []

  const tp = changes.totalParticipants
  if (tp && tp.old != null && tp.new != null) {
    const dropped = Number(tp.old) - Number(tp.new)
    parts.push(
      dropped > 0
        ? `Dropped ${dropped} spot${dropped === 1 ? '' : 's'} (${tp.old} to ${tp.new})`
        : `Added ${-dropped} spot${dropped === -1 ? '' : 's'} (${tp.old} to ${tp.new})`
    )
  } else {
    for (const [key, label] of Object.entries(HOUSING_LABELS)) {
      const c = changes[key]
      if (c && c.old != null && c.new != null) parts.push(`${label} ${c.old} to ${c.new}`)
    }
  }
  if (changes.housingType && changes.housingType.old !== changes.housingType.new) {
    const fmt = (v: unknown) => String(v ?? '—').replace(/_/g, ' ')
    parts.push(`Housing ${fmt(changes.housingType.old)} to ${fmt(changes.housingType.new)}`)
  }
  if (changes.roomType && changes.roomType.old !== changes.roomType.new) {
    parts.push(`Room ${changes.roomType.old ?? '—'} to ${changes.roomType.new ?? '—'}`)
  }

  const depositForfeited = amountOf(changes.depositForfeited)
  const depositWaived = amountOf(changes.depositForfeitWaived)
  const depositReversed = changes.depositForfeitReversed ? Math.abs(difference) || amountOf(changes.depositForfeitReversed) : 0

  if (depositForfeited > 0) {
    parts.push(`${money(depositForfeited)} deposit already paid on the dropped spots kept (non-refundable)`)
  }
  if (depositWaived > 0) {
    parts.push(`${money(depositWaived)} deposit on the dropped spots waived by admin`)
  }
  if (depositReversed > 0) {
    parts.push(`Correction: ${money(depositReversed)} deposit charge reversed`)
  }
  if (parts.length === 0 && changes.totalAmountDue) {
    parts.push('Manual price adjustment')
  }
  if (adminNotes && adminNotes.trim()) {
    parts.push(`Note: ${adminNotes.trim()}`)
  }
  if (parts.length === 0) parts.push(difference < 0 ? 'Price reduced by admin' : 'Price increased by admin')

  return { note: parts.join('; '), depositForfeited, depositWaived, depositReversed }
}
