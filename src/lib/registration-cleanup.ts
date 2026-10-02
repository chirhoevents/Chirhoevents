import { prismaIncludingCancelled as prisma } from '@/lib/prisma'

type RegistrationKind = 'group' | 'individual'

async function groupParticipantIds(registrationId: string): Promise<string[]> {
  const rows = await prisma.participant.findMany({
    where: { groupRegistrationId: registrationId },
    select: { id: true },
  })
  return rows.map((p) => p.id)
}

/**
 * Free everything a registration was holding in Poros: room beds, small
 * group seats, meal group and seating section places. Mirrors the
 * per-assignment delete routes so the stored occupancy counters stay right.
 * Called when a registration is cancelled or deleted.
 */
export async function releaseRegistrationAssignments(
  type: RegistrationKind,
  registrationId: string
): Promise<void> {
  const participantIds = type === 'group' ? await groupParticipantIds(registrationId) : []
  const owner =
    type === 'group'
      ? { groupRegistrationId: registrationId }
      : { individualRegistrationId: registrationId }
  const ownerOrParticipant =
    participantIds.length > 0 ? { OR: [owner, { participantId: { in: participantIds } }] } : owner

  // Rooms: one bed per assignment row.
  const rooms = await prisma.roomAssignment.findMany({ where: ownerOrParticipant, select: { roomId: true } })
  if (rooms.length > 0) {
    await prisma.roomAssignment.deleteMany({ where: ownerOrParticipant })
    for (const roomId of new Set(rooms.map((r) => r.roomId))) {
      const occupancy = await prisma.roomAssignment.count({ where: { roomId } })
      await prisma.room.update({ where: { id: roomId }, data: { currentOccupancy: occupancy } })
    }
  }

  // Small groups: only per-person assignments count toward currentSize.
  const smallGroups = await prisma.smallGroupAssignment.findMany({
    where: ownerOrParticipant,
    select: { smallGroupId: true, participantId: true, individualRegistrationId: true },
  })
  if (smallGroups.length > 0) {
    await prisma.smallGroupAssignment.deleteMany({ where: ownerOrParticipant })
    const freed = new Map<string, number>()
    for (const a of smallGroups) {
      if (a.participantId || a.individualRegistrationId) {
        freed.set(a.smallGroupId, (freed.get(a.smallGroupId) || 0) + 1)
      }
    }
    for (const [id, n] of freed) {
      const group = await prisma.smallGroup.findUnique({ where: { id }, select: { currentSize: true } })
      if (group) {
        await prisma.smallGroup.update({ where: { id }, data: { currentSize: Math.max(0, group.currentSize - n) } })
      }
    }
  }

  // Meal groups: a group assignment holds its whole headcount.
  const meals = await prisma.mealGroupAssignment.findMany({
    where: owner,
    select: { mealGroupId: true, participantCountOverride: true },
  })
  if (meals.length > 0) {
    let headcount = 1
    if (type === 'group') {
      const reg = await prisma.groupRegistration.findUnique({
        where: { id: registrationId },
        select: { totalParticipants: true },
      })
      headcount = reg?.totalParticipants || 1
    }
    await prisma.mealGroupAssignment.deleteMany({ where: owner })
    for (const m of meals) {
      const size = m.participantCountOverride ?? headcount
      const group = await prisma.mealGroup.findUnique({ where: { id: m.mealGroupId }, select: { currentSize: true } })
      if (group) {
        await prisma.mealGroup.update({
          where: { id: m.mealGroupId },
          data: { currentSize: Math.max(0, group.currentSize - size) },
        })
      }
    }
  }

  // Seating: occupancy is the number of assignments in the section.
  const seats = await prisma.seatingAssignment.findMany({ where: owner, select: { sectionId: true } })
  if (seats.length > 0) {
    await prisma.seatingAssignment.deleteMany({ where: owner })
    for (const sectionId of new Set(seats.map((s) => s.sectionId))) {
      const occupancy = await prisma.seatingAssignment.count({ where: { sectionId } })
      await prisma.seatingSection.update({ where: { id: sectionId }, data: { currentOccupancy: occupancy } })
    }
  }

  if (type === 'group') {
    await prisma.mealColorAssignment.deleteMany({ where: { groupRegistrationId: registrationId } })
  }
}

/**
 * Permanently remove a registration and every row hanging off it. Call
 * releaseRegistrationAssignments first so occupancy counters are fixed.
 * Child rows go in FK order (certificates / letters / incidents before the
 * forms and participants they point at).
 */
export async function deleteRegistrationPermanently(
  type: RegistrationKind,
  registrationId: string
): Promise<void> {
  const participantIds = type === 'group' ? await groupParticipantIds(registrationId) : []
  const formOwner =
    type === 'group'
      ? { groupRegistrationId: registrationId }
      : { individualRegistrationId: registrationId }
  const forms = await prisma.liabilityForm.findMany({
    where: participantIds.length > 0 ? { OR: [formOwner, { participantId: { in: participantIds } }] } : formOwner,
    select: { id: true },
  })
  const formIds = forms.map((f) => f.id)
  const byParticipantOrForm = {
    OR: [{ participantId: { in: participantIds } }, { liabilityFormId: { in: formIds } }],
  }

  await prisma.safeEnvironmentCertificate.deleteMany({ where: byParticipantOrForm })
  await prisma.letterOfGoodStanding.deleteMany({ where: byParticipantOrForm })
  await prisma.medicalIncident.deleteMany({ where: byParticipantOrForm })

  const ownerOrParticipant =
    participantIds.length > 0
      ? { OR: [formOwner, { participantId: { in: participantIds } }] }
      : formOwner
  await prisma.surveyRecipient.deleteMany({ where: ownerOrParticipant })
  await prisma.checkInLog.deleteMany({ where: ownerOrParticipant })
  if (participantIds.length > 0) {
    await prisma.adaIndividual.deleteMany({ where: { participantId: { in: participantIds } } })
  }
  await prisma.liabilityForm.deleteMany({ where: { id: { in: formIds } } })

  if (type === 'group') {
    await prisma.participant.deleteMany({ where: { groupRegistrationId: registrationId } })
    await prisma.groupStaffAssignment.deleteMany({ where: { groupRegistrationId: registrationId } })
    await prisma.userPreferences.deleteMany({ where: { groupRegistrationId: registrationId } })
  }

  const payments = await prisma.payment.findMany({
    where: { registrationId, registrationType: type },
    select: { id: true },
  })
  if (payments.length > 0) {
    await prisma.billingNote.deleteMany({ where: { paymentId: { in: payments.map((p) => p.id) } } })
  }
  await prisma.refund.deleteMany({ where: { registrationId } })
  await prisma.couponRedemption.deleteMany({ where: { registrationId } })
  await prisma.payment.deleteMany({ where: { registrationId, registrationType: type } })
  await prisma.paymentBalance.deleteMany({ where: { registrationId, registrationType: type } })
  await prisma.customRegistrationAnswer.deleteMany({ where: { registrationId } })

  if (type === 'group') {
    await prisma.groupRegistration.delete({ where: { id: registrationId } })
  } else {
    await prisma.individualRegistration.delete({ where: { id: registrationId } })
  }
}
