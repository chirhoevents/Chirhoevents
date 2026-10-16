// Name tag name resolution.
//
// Registration forms collect a legal first/last name (used for liability,
// medical and legal records) and an optional preferred name. The name tag
// shows the preferred name when there is one:
//
// - Clergy & Religious, or a preferred name that starts with a religious or
//   clerical title ("Sister Mary Agnes", "Fr. John"), or one that already ends
//   in the legal last name: printed exactly as entered, replacing the whole
//   legal name. Religious sisters and brothers usually go by their religious
//   name alone and don't want their legal name on the badge.
// - Anything else ("Johnny") is a nickname: it replaces the first name and
//   the legal last name stays.

type Maybe<T> = T | null | undefined

const TITLE_PREFIX =
  /^(sister|sr|brother|br|father|fr|mother|deacon|dcn|bishop|bp|most\s+rev|rev|reverend|msgr|monsignor|abbot|abbess|friar)\b/i

export function nameTagName(
  firstName: Maybe<string>,
  lastName: Maybe<string>,
  preferredName: Maybe<string>,
  isClergyOrReligious = false
): { firstName: string; lastName: string; fullName: string } {
  const first = (firstName || '').trim()
  const last = (lastName || '').trim()
  const preferred = (preferredName || '').replace(/\s+/g, ' ').trim()

  if (!preferred) {
    return { firstName: first, lastName: last, fullName: joinName(first, last) }
  }

  const replacesWholeName =
    isClergyOrReligious ||
    TITLE_PREFIX.test(preferred) ||
    (!!last && preferred.toLowerCase().endsWith(` ${last.toLowerCase()}`))

  if (replacesWholeName) {
    return { firstName: preferred, lastName: '', fullName: preferred }
  }

  return { firstName: preferred, lastName: last, fullName: joinName(preferred, last) }
}

export function joinName(first: Maybe<string>, last: Maybe<string>): string {
  return [first, last].map((s) => (s || '').trim()).filter(Boolean).join(' ')
}
