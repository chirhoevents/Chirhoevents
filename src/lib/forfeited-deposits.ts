/**
 * Non-refundable deposits kept on dropped group spots.
 *
 * When an admin drops spots on a group registration, calculateSpotChange
 * keeps the deposit already paid on those spots in the total (see
 * group-spot-pricing). That amount is recorded on the RegistrationEdit audit
 * row as changesMade.depositForfeited; this sums those rows so the kept
 * deposit can be shown as its own line instead of being hidden in the total.
 */

import { prisma } from '@/lib/prisma'

export interface ForfeitedDeposits {
  amount: number
  spots: number
}

export async function getForfeitedDeposits(registrationId: string): Promise<ForfeitedDeposits> {
  const edits = await prisma.registrationEdit.findMany({
    where: { registrationId, registrationType: 'group' },
    select: { changesMade: true },
  })

  let amount = 0
  let spots = 0
  for (const edit of edits) {
    const entry = (edit.changesMade as any)?.depositForfeited
    if (!entry) continue
    // Older rows only carry the display string, e.g.
    // "$60.00 (3 dropped spots) — non-refundable, ..."
    const text = typeof entry.new === 'string' ? entry.new : ''
    const entryAmount =
      typeof entry.amount === 'number' ? entry.amount : Number(text.match(/\$([\d,]+\.?\d*)/)?.[1]?.replace(/,/g, '') || 0)
    const entrySpots =
      typeof entry.spots === 'number' ? entry.spots : Number(text.match(/\((\d+) dropped spot/)?.[1] || 0)
    if (Number.isFinite(entryAmount)) amount += entryAmount
    if (Number.isFinite(entrySpots)) spots += entrySpots
  }

  return { amount: Math.round(amount * 100) / 100, spots }
}
