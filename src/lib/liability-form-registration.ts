import { prismaIncludingCancelled } from '@/lib/prisma'

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
