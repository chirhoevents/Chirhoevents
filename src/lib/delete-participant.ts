import { prisma } from '@/lib/prisma'

/**
 * Remove a group participant along with everything hanging off their liability
 * form. Deleting the Participant row on its own doesn't work for chaperones:
 * SafeEnvironmentCertificate.participantId is a required FK with no cascade, so
 * Postgres refuses the delete as soon as a cert was uploaded (a 500 with no
 * explanation). And LiabilityForm.participantId is SET NULL on delete, not
 * cascade, so a plain delete also left the signed form behind as an orphan
 * that kept showing up in the admin roster. Clear both explicitly first.
 */
export async function deleteParticipantAndForms(participantId: string): Promise<void> {
  await prisma.$transaction([
    prisma.safeEnvironmentCertificate.deleteMany({ where: { participantId } }),
    prisma.liabilityForm.deleteMany({ where: { participantId } }),
    prisma.participant.delete({ where: { id: participantId } }),
  ])
}
