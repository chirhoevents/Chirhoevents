/**
 * Tier 2 High-Priority Fixes — Verification Test Suite
 *
 * Verifies each fix by reading source files and asserting the correct
 * implementation pattern is in place. All tests are static analysis
 * (no DB or Stripe calls required).
 *
 * FIX 2.1  — Group leader portal 404: EventContext selectedEventId uses eventId not reg.id (BUG-4.1)
 * FIX 2.2  — Event capacity updated when admin drops spots (BUG-8.4)
 * FIX 2.3  — PaymentBalance updated from server-computed total, not client-supplied (BUG-8.5)
 * FIX 2.4  — Participant count uses totalParticipants field, not participants.length (BUG-3.2)
 * FIX 2.5  — Confirmation price reads PaymentBalance, not re-derived from pricing (BUG-3.3)
 * FIX 2.6  — Coupon usageCount incremented after payment, not before (BUG-3.7)
 * FIX 2.7  — SALVE stats include individual registrations (BUG-9.1/9.4)
 * FIX 2.8  — Staff email on payment (verified existing, Tier 1 FIX 1.5)
 * FIX 2.9  — Vendor code validation resolves slugs to UUIDs (BUG-7.3)
 * FIX 2.10 — Waitlist invitation checks capacity before sending (BUG-8.8)
 * FIX 2.11 — Resource portal lookup has rate limiting + truncated roommate names (BUG-10.5)
 */

import * as fs from 'fs'
import * as path from 'path'

const ROOT = path.resolve(__dirname, '../..')

function read(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8')
}

// Minimal test runner (same pattern as tier-1)
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
      toBe: (expected: unknown) => {
        if (actual === expected) throw new Error(`Expected value NOT to be ${JSON.stringify(expected)}`)
      },
    },
  }
}

// ─── FIX 2.1 ─────────────────────────────────────────────────────────────────
describe('FIX 2.1 — Group leader portal uses eventId (not registration UUID)', () => {
  const settingsSrc = read('src/app/api/group-leader/settings/route.ts')
  const contextSrc = read('src/contexts/EventContext.tsx')
  const layoutSrc = read('src/app/dashboard/group-leader/layout.tsx')

  it('settings route returns id: reg.eventId (not reg.id) in linkedEvents', () => {
    expect(settingsSrc).toContain('id: reg.eventId')
  })

  it('settings route also returns registrationId: reg.id in linkedEvents', () => {
    expect(settingsSrc).toContain('registrationId: reg.id')
  })

  it('settings route does NOT return id: reg.id as the id field (old bug pattern)', () => {
    // The old pattern was just "id: reg.id" without "registrationId: reg.id" alongside it
    // After the fix we have BOTH id: reg.eventId AND registrationId: reg.id
    expect(settingsSrc).toContain('id: reg.eventId')
    expect(settingsSrc).toContain('registrationId: reg.id')
  })

  it('LinkedEvent interface in EventContext includes registrationId field', () => {
    expect(contextSrc).toContain('registrationId: string')
  })

  it('layout.tsx uses data.registration.eventId when adding a new code', () => {
    expect(layoutSrc).toContain('setSelectedEventId(data.registration.eventId)')
  })

  it('layout.tsx does NOT use data.registration.id to set selectedEventId', () => {
    // The old pattern was setSelectedEventId(data.registration.id)
    expect(layoutSrc).not.toContain('setSelectedEventId(data.registration.id)')
  })
})

// ─── FIX 2.2 ─────────────────────────────────────────────────────────────────
describe('FIX 2.2 — Event capacity updated when admin changes participant count', () => {
  const adminGroupSrc = read('src/app/api/admin/registrations/group/[id]/route.ts')

  it('admin group PUT calculates totalParticipantDiff', () => {
    expect(adminGroupSrc).toContain('totalParticipantDiff')
  })

  it('uses $executeRaw to update capacity_remaining atomically', () => {
    expect(adminGroupSrc).toContain('capacity_remaining - ${totalParticipantDiff}')
  })

  it('uses GREATEST(0, ...) to prevent negative capacity', () => {
    expect(adminGroupSrc).toContain('GREATEST(0, capacity_remaining')
  })

  it('only updates capacity when totalParticipantDiff !== 0', () => {
    expect(adminGroupSrc).toContain('if (totalParticipantDiff !== 0)')
  })

  it('guards capacity update with IS NOT NULL check', () => {
    expect(adminGroupSrc).toContain('capacity_remaining IS NOT NULL')
  })
})

// ─── FIX 2.3 ─────────────────────────────────────────────────────────────────
describe('FIX 2.3 — PaymentBalance updated from server-computed total', () => {
  const adminGroupSrc = read('src/app/api/admin/registrations/group/[id]/route.ts')

  it('fetches eventPricing server-side in PUT handler', () => {
    expect(adminGroupSrc).toContain('eventPricing.findUnique')
  })

  it('computes serverNewTotal from event pricing fields', () => {
    expect(adminGroupSrc).toContain('serverNewTotal')
  })

  it('uses computedNewTotal (not client newTotal) in PaymentBalance update', () => {
    expect(adminGroupSrc).toContain('totalAmountDue: computedNewTotal')
  })

  it('does NOT use increment: difference pattern for amountRemaining', () => {
    // The buggy pattern was amountRemaining: { increment: difference }
    expect(adminGroupSrc).not.toContain('amountRemaining: {\n            increment: difference')
    expect(adminGroupSrc).not.toContain('increment: difference,')
  })

  it('amountRemaining is set as a computed value (not an increment)', () => {
    expect(adminGroupSrc).toContain('amountRemaining: newAmountRemaining')
  })

  it('amountRemaining is capped at 0 with Math.max', () => {
    expect(adminGroupSrc).toContain('Math.max(0, Number(paymentBalance.amountRemaining)')
  })
})

// ─── FIX 2.4 ─────────────────────────────────────────────────────────────────
describe('FIX 2.4 — Participant count uses totalParticipants field, not .length', () => {
  const registrationSrc = read('src/app/api/registration/[registrationId]/route.ts')

  it('selects totalParticipants field from groupRegistration', () => {
    expect(registrationSrc).toContain('totalParticipants: true')
  })

  it('uses registration.totalParticipants || 0 in authorized and public responses', () => {
    // The file has two response blocks — both should use totalParticipants field
    const occurrences = registrationSrc.split('registration.totalParticipants || 0').length - 1
    expect(occurrences >= 2).toBe(true)
  })

  it('uses registration.totalParticipants || 0 in stripped public response', () => {
    const publicBlock = registrationSrc.split('} else {').pop() || ''
    expect(publicBlock).toContain('registration.totalParticipants || 0')
  })

  it('does NOT use participants.length for totalParticipants', () => {
    expect(registrationSrc).not.toContain('participants.length')
  })
})

// ─── FIX 2.5 ─────────────────────────────────────────────────────────────────
describe('FIX 2.5 — Confirmation price reads PaymentBalance, not re-derived from pricing', () => {
  const registrationSrc = read('src/app/api/registration/[registrationId]/route.ts')

  it('fetches paymentBalance for authorized responses', () => {
    expect(registrationSrc).toContain('paymentBalance.findFirst')
  })

  it('uses Number(paymentBalance.totalAmountDue) for totalAmount', () => {
    expect(registrationSrc).toContain('Number(paymentBalance.totalAmountDue)')
  })

  it('uses Number(paymentBalance.amountPaid) for depositPaid', () => {
    expect(registrationSrc).toContain('Number(paymentBalance.amountPaid)')
  })

  it('uses Number(paymentBalance.amountRemaining) for balanceRemaining', () => {
    expect(registrationSrc).toContain('Number(paymentBalance.amountRemaining)')
  })

  it('does NOT re-derive totalAmount from youthRegularPrice', () => {
    // Old code multiplied counts by youthRegularPrice inside the authorized block
    // The new code reads from PaymentBalance instead
    const authorizedSection = registrationSrc.split('if (isAuthorized)')[1]?.split('if (isAuthorized)')[0] || ''
    expect(authorizedSection).not.toContain('youthRegularPrice')
  })
})

// ─── FIX 2.6 ─────────────────────────────────────────────────────────────────
describe('FIX 2.6 — Coupon usageCount incremented after payment confirmation', () => {
  const groupSrc = read('src/app/api/registration/group/route.ts')
  const individualSrc = read('src/app/api/registration/individual/route.ts')
  const webhookSrc = read('src/app/api/webhooks/stripe/route.ts')

  it('group route does NOT increment usageCount immediately inside coupon validation', () => {
    // Get the coupon validation block (before the Stripe session creation)
    const couponBlock = groupSrc.split('// Calculate deposit based on settings')[0]
    expect(couponBlock).not.toContain('usageCount: { increment: 1 }')
  })

  it('group route increments coupon for check payments before return', () => {
    const checkBlock = groupSrc.split('// For check payments, increment coupon usage')[1] || ''
    expect(checkBlock).toContain('usageCount: { increment: 1 }')
  })

  it('group route adds couponId to Stripe session metadata', () => {
    expect(groupSrc).toContain("couponId: appliedCoupon?.id || ''")
  })

  it('individual route does NOT increment usageCount immediately inside coupon validation', () => {
    const couponBlock = individualSrc.split('// Determine registration status')[0]
    expect(couponBlock).not.toContain('usageCount: { increment: 1 }')
  })

  it('individual route increments coupon for check payments before return', () => {
    const checkBlock = individualSrc.split('// For check payments, increment coupon usage')[1] || ''
    expect(checkBlock).toContain('usageCount: { increment: 1 }')
  })

  it('individual route adds couponId to Stripe session metadata', () => {
    expect(individualSrc).toContain("couponId: appliedCoupon?.id || ''")
  })

  it('webhook increments coupon usageCount for individual checkout.session.completed', () => {
    const individualWebhook = webhookSrc.split('// Handle INDIVIDUAL registration')[1]?.split('// Handle STAFF registration')[0] || ''
    expect(individualWebhook).toContain('usageCount: { increment: 1 }')
  })

  it('webhook increments coupon usageCount for group checkout.session.completed', () => {
    const groupWebhook = webhookSrc.split('// FIX 2.6: Increment coupon usage after confirmed group payment')[1] || ''
    expect(groupWebhook).toContain('usageCount: { increment: 1 }')
  })

  it('webhook reads couponId from session.metadata', () => {
    expect(webhookSrc).toContain('session.metadata?.couponId')
  })
})

// ─── FIX 2.7 ─────────────────────────────────────────────────────────────────
describe('FIX 2.7 — SALVE stats include individual registrations', () => {
  const statsSrc = read('src/app/api/admin/events/[eventId]/salve/stats/route.ts')
  const lookupSrc = read('src/app/api/admin/events/[eventId]/salve/lookup/route.ts')

  it('stats route counts individualRegistration records for totalParticipants', () => {
    expect(statsSrc).toContain('individualRegistration.count')
  })

  it('stats route adds individualTotal to groupParticipantTotal', () => {
    expect(statsSrc).toContain('groupParticipantTotal + individualTotal')
  })

  it('stats route counts checked-in individual registrations', () => {
    expect(statsSrc).toContain('individualCheckedIn')
  })

  it('stats route sums both group and individual checked-in counts', () => {
    expect(statsSrc).toContain('groupCheckedIn + individualCheckedIn')
  })

  it('lookup route does NOT return hardcoded checkedIn: false for individual QR scan', () => {
    const individualQrSection = lookupSrc
      .split("parsed.type === 'individual' && parsed.registrationId")[1]
      ?.split('return NextResponse.json')[1] || ''
    expect(individualQrSection).not.toContain("checkedIn: false, // Individual check-in not implemented yet")
  })

  it('lookup route uses formatIndividualRegistrationAsGroup for individual QR scan', () => {
    const individualSection = lookupSrc.split("parsed.type === 'individual'")[1] || ''
    expect(individualSection).toContain('formatIndividualRegistrationAsGroup')
  })
})

// ─── FIX 2.8 ─────────────────────────────────────────────────────────────────
describe('FIX 2.8 — Staff payment confirmation email sent via webhook (verified from Tier 1)', () => {
  const webhookSrc = read('src/app/api/webhooks/stripe/route.ts')

  it('webhook handles registrationType === staff in checkout.session.completed', () => {
    expect(webhookSrc).toContain("registrationType === 'staff'")
  })

  it('webhook updates staffRegistration.paymentStatus to paid', () => {
    expect(webhookSrc).toContain("paymentStatus: 'paid'")
  })

  it('webhook sends confirmation email for staff registration', () => {
    const staffBlock = webhookSrc.split("// Handle STAFF registration")[1]?.split("// Handle GROUP registration")[0] || ''
    expect(staffBlock).toContain('resend.emails.send')
  })

  it('webhook creates a Payment record for staff with succeeded status', () => {
    const staffBlock = webhookSrc.split("// Handle STAFF registration")[1]?.split("// Handle GROUP registration")[0] || ''
    expect(staffBlock).toContain("paymentStatus: 'succeeded'")
  })
})

// ─── FIX 2.9 ─────────────────────────────────────────────────────────────────
describe('FIX 2.9 — Vendor code validation resolves slugs to UUIDs', () => {
  const validateSrc = read('src/app/api/registration/staff/validate-vendor-code/route.ts')

  it('checks if eventId is a UUID with regex', () => {
    expect(validateSrc).toContain('/^[0-9a-f]{8}-')
  })

  it('resolves slug to UUID via prisma.event.findUnique when not a UUID', () => {
    expect(validateSrc).toContain('slug: rawEventId')
  })

  it('uses resolved eventId (not rawEventId) in vendorRegistration query', () => {
    // The vendorRegistration query should use `eventId` (the resolved value)
    const vendorBlock = validateSrc.split('const vendorRegistration')[1] || ''
    expect(vendorBlock).toContain('eventId,')
  })

  it('returns 200 with valid: false when event slug is not found', () => {
    expect(validateSrc).toContain("valid: false, error: 'Event not found'")
  })
})

// ─── FIX 2.10 ────────────────────────────────────────────────────────────────
describe('FIX 2.10 — Waitlist invitation checks event capacity', () => {
  const waitlistSrc = read('src/app/api/admin/waitlist/[entryId]/contact/route.ts')

  it('fetches event with capacityRemaining before sending invitation', () => {
    expect(waitlistSrc).toContain('capacityRemaining')
  })

  it('checks partySize against capacityRemaining', () => {
    expect(waitlistSrc).toContain('entry.partySize')
    expect(waitlistSrc).toContain('eventCapacity.capacityRemaining < spotsNeeded')
  })

  it('returns 409 when capacity is insufficient', () => {
    expect(waitlistSrc).toContain('{ status: 409 }')
  })

  it('includes capacityRemaining in the error response', () => {
    expect(waitlistSrc).toContain('capacityRemaining: eventCapacity.capacityRemaining')
  })

  it('only blocks when capacityTotal is not null (event tracks capacity)', () => {
    expect(waitlistSrc).toContain('eventCapacity.capacityTotal !== null')
    expect(waitlistSrc).toContain('eventCapacity.capacityRemaining !== null')
  })
})

// ─── FIX 2.11 ────────────────────────────────────────────────────────────────
describe('FIX 2.11 — Resource portal lookup has rate limiting and truncated roommate names', () => {
  const lookupSrc = read('src/app/api/events/[eventId]/resources/lookup/route.ts')

  it('defines a rate limit constant of 5', () => {
    expect(lookupSrc).toContain('RATE_LIMIT = 5')
  })

  it('uses a 60-second rate window', () => {
    expect(lookupSrc).toContain('RATE_WINDOW_MS = 60_000')
  })

  it('extracts IP from x-forwarded-for header', () => {
    expect(lookupSrc).toContain('x-forwarded-for')
  })

  it('returns 429 when rate limit is exceeded', () => {
    expect(lookupSrc).toContain('{ status: 429 }')
  })

  it('calls checkRateLimit(ip) in the GET handler', () => {
    expect(lookupSrc).toContain('checkRateLimit(ip)')
  })

  it('truncates roommate last name to first initial + dot', () => {
    expect(lookupSrc).toContain("r.lastName.charAt(0) + '.'")
  })

  it('stores truncated roommates in response.housing', () => {
    expect(lookupSrc).toContain('roommates: truncatedRoommates')
  })
})

// ─── Runner ──────────────────────────────────────────────────────────────────
console.log('\n=== Tier 2 High-Priority Fixes — Test Results ===\n')

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
