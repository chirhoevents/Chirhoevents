// Youth Under 18 liability forms go to a parent for consent, so they only make
// sense for minors. These helpers keep that rule in one place so every path
// that creates or completes a youth-u18 form applies it — not just the
// teen-facing step-1 page, which used to be the only place age was checked.

/**
 * Whole years from a date of birth to `asOf`, by calendar date. Dates of birth
 * are stored as UTC midnight ("YYYY-MM-DD"), so compare in UTC. Returns null
 * for a missing or unparseable date.
 */
export function ageFromDateOfBirth(
  dateOfBirth: Date | string | null | undefined,
  asOf: Date = new Date()
): number | null {
  if (!dateOfBirth) return null
  const dob = new Date(dateOfBirth)
  if (Number.isNaN(dob.getTime())) return null

  let age = asOf.getUTCFullYear() - dob.getUTCFullYear()
  const monthDiff = asOf.getUTCMonth() - dob.getUTCMonth()
  if (monthDiff < 0 || (monthDiff === 0 && asOf.getUTCDate() < dob.getUTCDate())) {
    age--
  }
  return age
}

/**
 * Whether an existing roster participant may be sent a Youth Under 18 (parent
 * consent) form. Chaperones, clergy and 18+ youth sign their own forms; sending
 * one of them a parent link creates a bogus pending "youth u18" entry — and, if
 * the link is completed, a second roster record for the same adult.
 */
export function canReceiveParentConsentForm(participant: {
  participantType: string | null
  age: number | null | undefined
}): boolean {
  if (participant.participantType !== 'youth_u18') return false
  if (typeof participant.age === 'number' && participant.age >= 18) return false
  return true
}

/**
 * True when a pending Youth Under 18 form is really for an adult: either the
 * roster participant it's attached to isn't a minor youth, or the age on the
 * form itself is 18+. Those forms must not be sent to or completed by a parent.
 */
export function isParentFormForAdult(
  form: { participantAge: number | null },
  linkedParticipant: { participantType: string | null; age: number | null } | null
): boolean {
  if (linkedParticipant && !canReceiveParentConsentForm(linkedParticipant)) return true
  return form.participantAge !== null && form.participantAge >= 18
}

export const ADULT_DOB_ON_YOUTH_FORM_MESSAGE =
  'The date of birth entered shows this person is 18 or older. Adults, including chaperones, should go back and choose the "Youth 18+ or Chaperone" form instead.'

export const NOT_A_MINOR_PARENT_FORM_MESSAGE =
  'Parent consent forms are only for participants under 18. This person is registered as an adult (chaperone, clergy, or 18+), so they complete and sign their own form.'
