/**
 * Youth Under 18 age rules (src/lib/youth-age.ts). Pure logic, no database
 * needed:
 *
 *   npx tsx tests/youth-age/youth-age.test.ts
 */

import {
  ageFromDateOfBirth,
  canReceiveParentConsentForm,
  isParentFormForAdult,
} from '../../src/lib/youth-age'

let failures = 0
function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) console.log(`    ✅ ${name}`)
  else {
    failures++
    console.error(`    ❌ ${name}`, detail !== undefined ? detail : '')
  }
}
function section(title: string) {
  console.log(`\n  ${title}`)
}

const asOf = new Date('2026-11-10T15:00:00Z')

section('Age from date of birth')
{
  check('1966-05-22 is 60', ageFromDateOfBirth('1966-05-22', asOf) === 60, ageFromDateOfBirth('1966-05-22', asOf))
  check('birthday later this year not yet counted', ageFromDateOfBirth('2009-12-01', asOf) === 16)
  check('birthday today counts', ageFromDateOfBirth('2008-11-10', asOf) === 18)
  check('day before 18th birthday is 17', ageFromDateOfBirth('2008-11-11', asOf) === 17)
  check('Date object works the same', ageFromDateOfBirth(new Date('2010-01-15'), asOf) === 16)
  check('missing date → null', ageFromDateOfBirth(null, asOf) === null && ageFromDateOfBirth('', asOf) === null)
  check('garbage → null', ageFromDateOfBirth('not-a-date', asOf) === null)
}

section('Who can be sent a parent consent form')
{
  check('minor youth → yes', canReceiveParentConsentForm({ participantType: 'youth_u18', age: 15 }))
  check('youth with unknown (0) age → yes', canReceiveParentConsentForm({ participantType: 'youth_u18', age: 0 }))
  check('chaperone → no', !canReceiveParentConsentForm({ participantType: 'chaperone', age: 60 }))
  check('18+ youth → no', !canReceiveParentConsentForm({ participantType: 'youth_o18', age: 19 }))
  check('priest → no', !canReceiveParentConsentForm({ participantType: 'priest', age: 45 }))
  check('mislabeled youth_u18 aged 60 → no', !canReceiveParentConsentForm({ participantType: 'youth_u18', age: 60 }))
}

section('Pending parent form that is really for an adult')
{
  // The screenshot case: a youth-u18 form created for a 60-year-old chaperone
  check(
    'form linked to a chaperone → adult',
    isParentFormForAdult({ participantAge: 60 }, { participantType: 'chaperone', age: 60 })
  )
  check('unlinked form with age 60 → adult', isParentFormForAdult({ participantAge: 60 }, null))
  check('unlinked teen form → not adult', !isParentFormForAdult({ participantAge: 16 }, null))
  check('unlinked form with no age → not adult', !isParentFormForAdult({ participantAge: null }, null))
  check(
    'form linked to a minor youth → not adult',
    !isParentFormForAdult({ participantAge: 14 }, { participantType: 'youth_u18', age: 14 })
  )
}

console.log(failures ? `\n  ${failures} check(s) failed\n` : '\n  All checks passed\n')
process.exit(failures ? 1 : 0)
