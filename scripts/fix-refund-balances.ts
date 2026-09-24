/**
 * Repair script: clear phantom balances left behind by the old refund flow.
 *
 * Background: /api/admin/refunds used to decrement amountPaid AND increment
 * amountRemaining by the refund amount, and hard-code paymentStatus 'partial'.
 * When the invoice total had already been lowered (participant removed), that
 * turned a fully paid registration into one showing a balance due — e.g.
 * total $125 / paid $125 / balance $150. The group leader portal and reminder
 * emails both read that balance.
 *
 * This recomputes amountRemaining = max(0, total − paid) and the status for:
 *   - every balance row whose stored amountRemaining disagrees with that, and
 *   - every balance row that has a refund recorded against it.
 * Rows that already agree and have no refunds are left alone. Idempotent.
 *
 *   Dry run (default):  npx tsx scripts/fix-refund-balances.ts
 *   Apply changes:      DRY_RUN=false npx tsx scripts/fix-refund-balances.ts
 *   Single event:       EVENT_ID=<uuid> npx tsx scripts/fix-refund-balances.ts
 */

import { prisma } from '../src/lib/prisma'
import { deriveBalance } from '../src/lib/payment-balance-status'

const DRY_RUN = process.env.DRY_RUN !== 'false'
const EVENT_ID = process.env.EVENT_ID || null

async function main() {
  console.log(`fix-refund-balances — ${DRY_RUN ? 'DRY RUN' : 'APPLYING'}${EVENT_ID ? ` (event ${EVENT_ID})` : ''}`)

  const balances = await prisma.paymentBalance.findMany({
    where: EVENT_ID ? { eventId: EVENT_ID } : {},
  })

  const refunded = await prisma.refund.findMany({
    where: { registrationId: { in: balances.map((b) => b.registrationId) } },
    select: { registrationId: true },
  })
  const hasRefund = new Set(refunded.map((r) => r.registrationId))

  let changed = 0
  for (const b of balances) {
    const total = Number(b.totalAmountDue)
    const paid = Number(b.amountPaid)
    const storedRemaining = Number(b.amountRemaining)
    const expectedRemaining = Math.max(0, total - paid)
    const refundedRow = hasRefund.has(b.registrationId)

    if (Math.abs(storedRemaining - expectedRemaining) <= 0.005 && !refundedRow) continue

    const { amountRemaining, paymentStatus } = deriveBalance(
      total,
      paid,
      paid <= 0 && refundedRow ? 'refunded' : b.paymentStatus
    )

    if (Math.abs(storedRemaining - amountRemaining) <= 0.005 && paymentStatus === b.paymentStatus) continue

    const label = await describeRegistration(b.registrationId, b.registrationType)
    console.log(
      `${label}: total $${total.toFixed(2)}, paid $${paid.toFixed(2)} — ` +
        `balance $${storedRemaining.toFixed(2)} → $${amountRemaining.toFixed(2)}, ` +
        `status ${b.paymentStatus} → ${paymentStatus}`
    )
    changed++

    if (!DRY_RUN) {
      await prisma.paymentBalance.update({
        where: { id: b.id },
        data: { amountRemaining, paymentStatus },
      })
    }
  }

  console.log(`\n${changed} row(s) ${DRY_RUN ? 'would be' : 'were'} updated.`)
}

async function describeRegistration(id: string, type: string): Promise<string> {
  if (type === 'group') {
    const g = await prisma.groupRegistration.findUnique({ where: { id }, select: { groupName: true } })
    return g?.groupName || `group ${id}`
  }
  const i = await prisma.individualRegistration.findUnique({
    where: { id },
    select: { firstName: true, lastName: true },
  })
  return i ? `${i.firstName} ${i.lastName}` : `${type} ${id}`
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
