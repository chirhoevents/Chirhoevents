import { prisma, prismaIncludingCancelled } from '@/lib/prisma'
import { isParentFormForAdult } from '@/lib/youth-age'

/**
 * Whether the registration a liability form belongs to has been cancelled.
 * A parent link from the confirmation email keeps working otherwise, so a
 * parent could still fill out and sign a form for a cancelled registration.
 */
export async function isLiabilityFormRegistrationCancelled(form: {
  individualRegistrationId: string | null
  groupRegistrationId: string | null
}): Promise<boolean> {
  if (form.individualRegistrationId) {
    const registration = await prismaIncludingCancelled.individualRegistration.findUnique({
      where: { id: form.individualRegistrationId },
      select: { cancelledAt: true },
    })
    return !!registration?.cancelledAt
  }
  if (form.groupRegistrationId) {
    const registration = await prismaIncludingCancelled.groupRegistration.findUnique({
      where: { id: form.groupRegistrationId },
      select: { cancelledAt: true },
    })
    return !!registration?.cancelledAt
  }
  return false
}

export const CANCELLED_REGISTRATION_FORM_MESSAGE =
  'This registration has been cancelled, so this form no longer needs to be completed. Please contact the event organizer with any questions.'

/**
 * Whether a pending parent (Youth Under 18) link should no longer be completed:
 * the form is for an adult (e.g. one created for a chaperone by the old
 * group-leader "Resend Email" button), or it's attached to a roster participant
 * whose form is already signed. Completing either would add a second roster
 * record for the same person — as a youth — and take another spot.
 */
export async function isStrayParentForm(form: {
  participantId: string | null
  participantAge: number | null
}): Promise<boolean> {
  const linkedParticipant = form.participantId
    ? await prisma.participant.findUnique({
        where: { id: form.participantId },
        select: { participantType: true, age: true, liabilityFormCompleted: true },
      })
    : null
  if (linkedParticipant?.liabilityFormCompleted) return true
  return isParentFormForAdult(form, linkedParticipant)
}

export const STRAY_PARENT_LINK_MESSAGE =
  'This parent consent link is no longer valid. The participant is either registered as an adult (who signs their own form) or already has a completed liability form. Please contact your group leader or the event organizer with any questions.'
