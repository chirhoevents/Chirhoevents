import { prisma } from '@/lib/prisma'

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
 * Participant yet (i.e. still waiting on the parent).
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
 * youth-u18 form — what matters is whether a real seat is still free, not how
 * many pending forms are outstanding. A group can already have more pending
 * (not-yet-verified-by-parent) forms outstanding than it has real spots left,
 * e.g. from before capacity was enforced at invite time, or because a group
 * leader over-invited. Whichever pending forms get completed first, up to the
 * group's registered total, claim the remaining real seats; this only compares
 * completed Participant rows against totalParticipants, so it works correctly
 * even when outstanding pending forms already outnumber the spots left.
 */
export async function hasFreeParticipantSlot(groupRegistrationId: string): Promise<boolean> {
  const [groupRegistration, participantCount] = await Promise.all([
    prisma.groupRegistration.findUnique({
      where: { id: groupRegistrationId },
      select: { totalParticipants: true },
    }),
    prisma.participant.count({ where: { groupRegistrationId } }),
  ])

  const totalParticipants = groupRegistration?.totalParticipants ?? 0
  return participantCount < totalParticipants
}

export const GROUP_CAPACITY_FULL_MESSAGE =
  "Sorry, there are no more spots available for this group. Please contact your group leader — they can log in to the Group Leader Portal to edit or delete an already-submitted form to free up a spot, or reach out to the event organizer to add more."
