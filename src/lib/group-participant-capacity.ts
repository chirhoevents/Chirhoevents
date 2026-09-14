import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

type TransactionClient = Prisma.TransactionClient

export class GroupCapacityFullError extends Error {
  constructor() {
    super('Group participant capacity is full')
    this.name = 'GroupCapacityFullError'
  }
}

interface GroupCapacityResult {
  hasCapacity: boolean
  totalParticipants: number
  slotsUsed: number
  slotsRemaining: number
}

/**
 * A group registration's `totalParticipants` is the paid-for/registered headcount.
 * A "slot" counts as used the moment someone starts claiming it, not just once their
 * liability form is fully signed — otherwise a group can rack up more pending forms
 * (a youth form awaiting parent verification, a chaperone form awaiting their safe
 * environment cert) than it has spots, since those already-started forms don't show
 * up in a simple `Participant` count until they're finished.
 *
 * Used = existing Participant rows (every completed form, of any type) + pending
 * youth-u18 LiabilityForm rows that were initiated but haven't produced a
 * Participant yet (i.e. still waiting on the parent) — excluding ones whose
 * parent link has already expired. An expired pending form can never be
 * completed (the complete route rejects it outright), so still counting it
 * here would tie up a real spot forever just because someone started a form
 * and never finished within the window — exactly the scenario where a group
 * leader blasts the registration link, a bunch of people do step 1 and never
 * come back, and everyone who's actually attending runs into "no spots left."
 */
export async function checkGroupParticipantCapacity(
  groupRegistrationId: string
): Promise<GroupCapacityResult> {
  const [groupRegistration, participantCount, pendingYouthFormCount] = await Promise.all([
    prisma.groupRegistration.findUnique({
      where: { id: groupRegistrationId },
      select: { totalParticipants: true },
    }),
    prisma.participant.count({
      where: { groupRegistrationId },
    }),
    prisma.liabilityForm.count({
      where: {
        groupRegistrationId,
        participantId: null,
        completed: false,
        OR: [
          { parentTokenExpiresAt: null },
          { parentTokenExpiresAt: { gt: new Date() } },
        ],
      },
    }),
  ])

  const totalParticipants = groupRegistration?.totalParticipants ?? 0
  const slotsUsed = participantCount + pendingYouthFormCount
  const slotsRemaining = totalParticipants - slotsUsed

  return {
    hasCapacity: slotsRemaining > 0,
    totalParticipants,
    slotsUsed,
    slotsRemaining,
  }
}

/**
 * At the moment a pending form is actually being finalized — a parent signs a
 * youth-u18 form, or a chaperone/clergy member submits directly — what matters
 * is whether a real seat is still free, not how many pending forms are
 * outstanding. A group can already have more pending (not-yet-verified) forms
 * outstanding than it has real spots left, e.g. from before capacity was
 * enforced at invite time, or because a group leader over-invited. Whichever
 * ones get completed first, up to the group's registered total, claim the
 * remaining real seats.
 *
 * This must be called with a transaction client, as the first statement inside
 * a `prisma.$transaction(async (tx) => { ... })` that goes on to create the
 * Participant using the same `tx`. `SELECT ... FOR UPDATE` row-locks the group
 * registration for the rest of that transaction, so if two parents for the
 * same group submit within milliseconds of each other, the second transaction
 * blocks on the lock until the first commits (or rolls back) rather than both
 * reading "1 spot left" and both getting through — a plain count-then-create
 * with no lock can't guarantee that under concurrent requests. Throws
 * GroupCapacityFullError if no seat is left; catch it in the route and map it
 * to a 409.
 */
export async function assertParticipantSlotAvailable(
  tx: TransactionClient,
  groupRegistrationId: string
): Promise<void> {
  const locked = await tx.$queryRaw<{ totalParticipants: number }[]>`
    SELECT total_participants AS "totalParticipants"
    FROM group_registrations
    WHERE id = ${groupRegistrationId}::uuid
    FOR UPDATE
  `
  const totalParticipants = locked[0]?.totalParticipants ?? 0
  const participantCount = await tx.participant.count({ where: { groupRegistrationId } })

  if (participantCount >= totalParticipants) {
    throw new GroupCapacityFullError()
  }
}

export const GROUP_CAPACITY_FULL_MESSAGE =
  "Sorry, there are no more spots available for this group. Please contact your group leader — they can log in to the Group Leader Portal to edit or delete an already-submitted form to free up a spot, or reach out to the event organizer to add more."
