// Clergy & Religious role helpers.
//
// Everyone who fills out the Clergy & Religious liability form is stored with
// participantType 'priest' and the specific title in clergyTitle (father,
// most_reverend, deacon, seminarian, mr, sister, brother). Some import paths
// store the specific ParticipantType instead (deacon, seminarian,
// religious_sister, religious_brother). These helpers resolve either shape to
// the person's actual role so reports never lump a Sister in with "Clergy".
//
// Chaperone ratio rule: deacons, seminarians, religious sisters and religious
// brothers are with their group and count as chaperones. Priests and bishops
// are pulled away for Mass and confessions, so they do not count.

type Maybe<T> = T | null | undefined

export type ClergyRole = 'priest' | 'bishop' | 'deacon' | 'seminarian' | 'sister' | 'brother'

const CLERGY_FORM_PARTICIPANT_TYPES = new Set([
  'priest',
  'deacon',
  'seminarian',
  'religious_sister',
  'religious_brother',
])

const ROLE_LABELS: Record<ClergyRole, string> = {
  priest: 'Priest',
  bishop: 'Bishop',
  deacon: 'Deacon',
  seminarian: 'Seminarian',
  sister: 'Sister',
  brother: 'Brother',
}

const CHAPERONE_ROLES = new Set<ClergyRole>(['deacon', 'seminarian', 'sister', 'brother'])

/** True when the participant type belongs to the Clergy & Religious form. */
export function isClergyOrReligiousType(participantType: Maybe<string>): boolean {
  return !!participantType && CLERGY_FORM_PARTICIPANT_TYPES.has(participantType)
}

/**
 * Resolves a Clergy & Religious participant to their specific role. The title
 * wins over the participant type because the submit route stores every title
 * as participantType 'priest'. Returns null for non-clergy participants.
 */
export function getClergyRole(participantType: Maybe<string>, clergyTitle: Maybe<string>): ClergyRole | null {
  switch (clergyTitle) {
    case 'father':
      return 'priest'
    case 'most_reverend':
      return 'bishop'
    case 'deacon':
      return 'deacon'
    case 'seminarian':
    case 'mr':
      return 'seminarian'
    case 'sister':
      return 'sister'
    case 'brother':
      return 'brother'
  }
  switch (participantType) {
    case 'priest':
      return 'priest'
    case 'deacon':
      return 'deacon'
    case 'seminarian':
      return 'seminarian'
    case 'religious_sister':
      return 'sister'
    case 'religious_brother':
      return 'brother'
  }
  return null
}

/** "Priest", "Deacon", "Seminarian", "Sister", ... or null for non-clergy. */
export function getClergyRoleLabel(participantType: Maybe<string>, clergyTitle: Maybe<string>): string | null {
  const role = getClergyRole(participantType, clergyTitle)
  return role ? ROLE_LABELS[role] : null
}

/** Deacons, seminarians, sisters and brothers count toward the chaperone ratio; priests do not. */
export function clergyCountsAsChaperone(participantType: Maybe<string>, clergyTitle: Maybe<string>): boolean {
  const role = getClergyRole(participantType, clergyTitle)
  return !!role && CHAPERONE_ROLES.has(role)
}

/** Gender implied by a clergy/religious role: Sisters are female, every other role is male. */
export function getClergyGender(participantType: Maybe<string>, clergyTitle: Maybe<string>): 'male' | 'female' | null {
  const role = getClergyRole(participantType, clergyTitle)
  if (!role) return null
  return role === 'sister' ? 'female' : 'male'
}

/** Chaperones plus the clergy/religious roles that serve as chaperones. */
export function countsAsChaperone(participantType: Maybe<string>, clergyTitle: Maybe<string>): boolean {
  return (
    participantType === 'chaperone' ||
    participantType === 'youth_o18_chaperone' ||
    clergyCountsAsChaperone(participantType, clergyTitle)
  )
}

/**
 * Gender to use for supervision ratios. The Clergy & Religious form does not
 * ask for gender, so a clergy/religious role decides it; anyone else uses the
 * gender on their record.
 */
export function getRatioGender(
  participantType: Maybe<string>,
  clergyTitle: Maybe<string>,
  storedGender: Maybe<string>
): string | null {
  return getClergyGender(participantType, clergyTitle) ?? storedGender ?? null
}

const ROLE_PARTICIPANT_TYPES: Record<ClergyRole, string> = {
  priest: 'priest',
  bishop: 'priest',
  deacon: 'deacon',
  seminarian: 'seminarian',
  sister: 'religious_sister',
  brother: 'religious_brother',
}

/**
 * The specific ParticipantType for a clergy/religious participant (e.g. a
 * 'priest' record titled Sister becomes 'religious_sister'). Anyone else keeps
 * their participant type unchanged.
 */
export function resolveParticipantType<T extends Maybe<string>>(participantType: T, clergyTitle: Maybe<string>): T | string {
  if (!isClergyOrReligiousType(participantType)) return participantType
  const role = getClergyRole(participantType, clergyTitle)
  return role ? ROLE_PARTICIPANT_TYPES[role] : participantType
}
