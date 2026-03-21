/**
 * Tier 3 Fixes — Verification Test Suite
 *
 * Static analysis tests verifying correct implementation patterns.
 *
 * FIX 3.14 — Individual registrant contact info on confirmation page and email
 * FIX 3.15 — Waitlist capacity enforced when adding to waitlist
 */

import * as fs from 'fs'
import * as path from 'path'

const ROOT = path.resolve(__dirname, '../..')

function read(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8')
}

let _passed = 0
let _failed = 0
const _suites: Array<{ name: string; tests: Array<{ name: string; fn: () => void }> }> = []

function describe(name: string, fn: () => void) {
  const suite = { name, tests: [] as Array<{ name: string; fn: () => void }> }
  _suites.push(suite)
  const _prev = (global as any).__currentSuite
  ;(global as any).__currentSuite = suite
  fn()
  ;(global as any).__currentSuite = _prev
}

function it(name: string, fn: () => void) {
  const suite = (global as any).__currentSuite
  if (suite) suite.tests.push({ name, fn })
}

function expect(actual: unknown) {
  return {
    toBe: (expected: unknown) => {
      if (actual !== expected) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
    },
    toContain: (sub: string) => {
      if (typeof actual !== 'string' || !actual.includes(sub))
        throw new Error(`Expected string to contain: ${sub}`)
    },
    not: {
      toContain: (sub: string) => {
        if (typeof actual === 'string' && actual.includes(sub))
          throw new Error(`Expected string NOT to contain: ${sub}`)
      },
    },
  }
}

// ─── FIX 3.14 ────────────────────────────────────────────────────────────────
describe('FIX 3.14 — Individual registrant org contact info displayed', () => {
  const apiSrc = read('src/app/api/registration/individual/[registrationId]/route.ts')
  const pageSrc = read('src/app/registration/confirmation/individual/[registrationId]/page.tsx')
  const checkEmailSrc = read('src/app/api/registration/individual/route.ts')
  const webhookSrc = read('src/app/api/webhooks/stripe/route.ts')

  // API endpoint
  it('individual GET endpoint selects website field from organization', () => {
    expect(apiSrc).toContain('website: true')
  })

  it('individual GET authorized response includes organizationWebsite', () => {
    expect(apiSrc).toContain('organizationWebsite: registration.event.organization.website')
  })

  it('individual GET stripped public response includes organizationWebsite', () => {
    const strippedBlock = apiSrc.split('organizationContactPhone').pop() || ''
    expect(strippedBlock).toContain('organizationWebsite')
  })

  // Confirmation page
  it('RegistrationData interface includes organizationContactEmail field', () => {
    expect(pageSrc).toContain('organizationContactEmail?: string | null')
  })

  it('RegistrationData interface includes organizationContactPhone field', () => {
    expect(pageSrc).toContain('organizationContactPhone?: string | null')
  })

  it('RegistrationData interface includes organizationWebsite field', () => {
    expect(pageSrc).toContain('organizationWebsite?: string | null')
  })

  it('confirmation page shows org contact email with mailto link', () => {
    expect(pageSrc).toContain('organizationContactEmail}')
    expect(pageSrc).toContain('mailto:')
  })

  it('confirmation page shows org contact phone with tel link', () => {
    expect(pageSrc).toContain('organizationContactPhone}')
    expect(pageSrc).toContain('tel:')
  })

  it('confirmation page shows org website as a link', () => {
    expect(pageSrc).toContain('organizationWebsite}')
  })

  it('confirmation page does NOT show generic "contact the event organizer" text alone', () => {
    // The old card said "reply to your confirmation email or contact the event organizer"
    // The new card shows real contact details
    expect(pageSrc).not.toContain('reply to your confirmation email\n                or contact the event organizer')
  })

  it('confirmation page explains individual registrants have no portal', () => {
    expect(pageSrc).toContain('no self-service portal for individual registrants')
  })

  // Check payment email (uses HTML comment <!-- FIX 3.14 inside template literal)
  it('check payment email includes org contact email', () => {
    const checkEmailBlock = checkEmailSrc.split('FIX 3.14')[1] || ''
    expect(checkEmailBlock).toContain('event.organization.contactEmail')
  })

  it('check payment email includes org contact phone', () => {
    const checkEmailBlock = checkEmailSrc.split('FIX 3.14')[1] || ''
    expect(checkEmailBlock).toContain('event.organization.contactPhone')
  })

  it('check payment email includes org website', () => {
    const checkEmailBlock = checkEmailSrc.split('FIX 3.14')[1] || ''
    expect(checkEmailBlock).toContain('event.organization.website')
  })

  it('individual registration route selects org contactEmail for email', () => {
    expect(checkEmailSrc).toContain('contactEmail: true')
  })

  it('individual registration route selects org contactPhone for email', () => {
    expect(checkEmailSrc).toContain('contactPhone: true')
  })

  it('individual registration route selects org website for email', () => {
    expect(checkEmailSrc).toContain('website: true')
  })

  // Card payment webhook email
  it('webhook individual confirmation email includes FIX 3.14 org contact block', () => {
    expect(webhookSrc).toContain('FIX 3.14: Org contact info')
  })

  it('webhook individual email includes org contactEmail', () => {
    const fixBlock = webhookSrc.split('FIX 3.14')[1] || ''
    expect(fixBlock).toContain('organization.contactEmail')
  })

  it('webhook individual email includes org contactPhone', () => {
    const fixBlock = webhookSrc.split('FIX 3.14')[1] || ''
    expect(fixBlock).toContain('organization.contactPhone')
  })

  it('webhook individual email includes org website', () => {
    const fixBlock = webhookSrc.split('FIX 3.14')[1] || ''
    expect(fixBlock).toContain('organization.website')
  })
})

// ─── FIX 3.15 ────────────────────────────────────────────────────────────────
describe('FIX 3.15 — Waitlist capacity enforced when adding to waitlist', () => {
  const waitlistSrc = read('src/app/api/events/[eventId]/waitlist/route.ts')

  it('event query includes waitlistCapacity field', () => {
    expect(waitlistSrc).toContain('waitlistCapacity: true')
  })

  it('counts current pending entries before allowing new entry', () => {
    // The count is used both for position and capacity enforcement
    expect(waitlistSrc).toContain("status: 'pending'")
    expect(waitlistSrc).toContain('pendingCount')
  })

  it('checks waitlistCapacity before creating entry', () => {
    expect(waitlistSrc).toContain('FIX 3.15')
    expect(waitlistSrc).toContain('waitlistCap')
    expect(waitlistSrc).toContain('pendingCount >= waitlistCap')
  })

  it('returns 409 when waitlist is full', () => {
    const capacityBlock = waitlistSrc.split('FIX 3.15')[1] || ''
    expect(capacityBlock).toContain('{ status: 409 }')
  })

  it('error message mentions waitlist is full and to contact organizer', () => {
    expect(waitlistSrc).toContain('The waitlist for this event is also full')
  })

  it('includes waitlistFull: true in the 409 response body', () => {
    expect(waitlistSrc).toContain('waitlistFull: true')
  })

  it('treats null or 0 waitlistCapacity as unlimited (backwards compatible)', () => {
    // Guard: waitlistCap > 0 means null/0 = unlimited
    expect(waitlistSrc).toContain('waitlistCap > 0 && pendingCount >= waitlistCap')
  })

  it('still calculates position after capacity check passes', () => {
    expect(waitlistSrc).toContain('const position = pendingCount + 1')
  })
})

// ─── Runner ──────────────────────────────────────────────────────────────────
console.log('\n=== Tier 3 Fixes — Test Results ===\n')

for (const suite of _suites) {
  console.log(`\n  ${suite.name}`)
  for (const test of suite.tests) {
    try {
      test.fn()
      console.log(`    ✅ ${test.name}`)
      _passed++
    } catch (err: any) {
      console.log(`    ❌ ${test.name}`)
      console.log(`       ${err.message}`)
      _failed++
    }
  }
}

console.log(`\n${'='.repeat(50)}`)
console.log(`  Results: ${_passed} passed, ${_failed} failed`)
console.log(`${'='.repeat(50)}\n`)

if (_failed > 0) {
  process.exit(1)
}
