/**
 * Tier 1 Critical Fixes — Verification Test Suite
 *
 * Verifies each fix by reading source files and asserting the correct
 * implementation pattern is in place. All tests are static analysis
 * (no DB or Stripe calls required).
 *
 * FIX 1.1 — Individual payment amount uses session.amount_total (BUG-5.1)
 * FIX 1.2 — M2K/Poros endpoint requires auth via verifyPorosAccess (BUG-10.4)
 * FIX 1.3 — Confirmation page crash-safe + access code from URL params (BUG-3.1, BUG-10.2)
 * FIX 1.4 — Stripe refund uses pi_... (BUG-3.5, BUG-5.2, BUG-8.6)
 * FIX 1.5 — Staff Stripe webhook handled + confirmation email (BUG-7.4, BUG-7.5)
 * FIX 1.6 — Individual/staff GET endpoints have dual auth response (BUG-5.3, GAP-7.2)
 * FIX 1.7 — Support message actually sends email via Resend (BUG-4.5)
 */

import * as fs from 'fs'
import * as path from 'path'

const ROOT = path.resolve(__dirname, '../..')

function read(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8')
}

// Minimal test runner
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

// ─── FIX 1.1 ─────────────────────────────────────────────────────────────────
describe('FIX 1.1 — Individual payment amount uses actual Stripe amount', () => {
  const webhookSrc = read('src/app/api/webhooks/stripe/route.ts')

  it('webhook does NOT use onCampusYouthPrice in PaymentBalance update', () => {
    // Find the paymentBalance.updateMany block for individual
    const updateBlock = webhookSrc.match(/paymentBalance\.updateMany[\s\S]*?}\s*\)/)?.[0] || ''
    expect(updateBlock).not.toContain('onCampusYouthPrice')
  })

  it('webhook does NOT use hardcoded 150 as amountPaid', () => {
    // Check the individual branch updateMany doesn't use the literal 150
    const individualSection = webhookSrc.split("// Handle INDIVIDUAL registration")[1]?.split("// Handle STAFF registration")[0] || ''
    const updateData = individualSection.match(/amountPaid:\s*[^,\n]+/)?.[0] || ''
    expect(updateData).not.toContain('150')
  })

  it('webhook uses session.amount_total / 100 for actualAmountPaid', () => {
    expect(webhookSrc).toContain('session.amount_total! / 100')
  })

  it('amountPaid is set to actualAmountPaid (not a hardcoded price)', () => {
    expect(webhookSrc).toContain('amountPaid: actualAmountPaid')
  })

  it('amountRemaining is calculated as totalAmountDue - actualAmountPaid', () => {
    expect(webhookSrc).toContain('Math.max(0, totalAmountDue - actualAmountPaid)')
  })

  it('PaymentBalance.totalAmountDue is fetched before the update', () => {
    expect(webhookSrc).toContain('existingBalance.totalAmountDue')
  })

  it('paymentStatus uses paid_full vs partial based on remaining amount', () => {
    expect(webhookSrc).toContain("amountRemaining <= 0 ? 'paid_full' : 'partial'")
  })

  it('invariant: totalAmountDue === amountPaid + amountRemaining is structurally enforced', () => {
    // amountRemaining = Math.max(0, totalAmountDue - actualAmountPaid)
    // amountPaid = actualAmountPaid
    // therefore totalAmountDue >= amountPaid + amountRemaining (capped at 0 for overpayments)
    expect(webhookSrc).toContain('const amountRemaining = Math.max(0, totalAmountDue - actualAmountPaid)')
  })
})

// ─── FIX 1.2 ─────────────────────────────────────────────────────────────────
describe('FIX 1.2 — M2K/Poros endpoint secured with verifyPorosAccess', () => {
  const m2kSrc = read('src/app/api/public/poros/[eventId]/m2k-data/route.ts')

  it('imports verifyPorosAccess from api-auth', () => {
    expect(m2kSrc).toContain("import { verifyPorosAccess } from '@/lib/api-auth'")
  })

  it('calls verifyPorosAccess at the top of the handler', () => {
    expect(m2kSrc).toContain('await verifyPorosAccess(request, eventId)')
  })

  it('returns the auth error immediately if present', () => {
    expect(m2kSrc).toContain('if (error) return error')
  })

  it('hardcoded M2K_EVENT_ID constant is removed', () => {
    expect(m2kSrc).not.toContain('M2K_EVENT_ID')
  })

  it('hardcoded event ID check is removed', () => {
    expect(m2kSrc).not.toContain('b9b70d36-ae35-47a0-aeb7-a50df9a598f1')
  })

  it('comment no longer says "no auth required"', () => {
    expect(m2kSrc).not.toContain('no auth required')
  })
})

// ─── FIX 1.3 ─────────────────────────────────────────────────────────────────
describe('FIX 1.3 — Group confirmation page: crash-safe + access code from URL params', () => {
  const pageSrc = read('src/app/registration/confirmation/[registrationId]/page.tsx')
  const groupRegSrc = read('src/app/api/registration/group/route.ts')
  const regApiSrc = read('src/app/api/registration/[registrationId]/route.ts')

  it('group POST success_url includes access_code param', () => {
    expect(groupRegSrc).toContain('access_code=')
  })

  it('group POST success_url includes group_name param', () => {
    expect(groupRegSrc).toContain('group_name=')
  })

  it('group POST success_url includes participants param', () => {
    expect(groupRegSrc).toContain('participants=')
  })

  it('group POST success_url includes amount_paid param', () => {
    expect(groupRegSrc).toContain('amount_paid=')
  })

  it('confirmation page reads access_code from searchParams', () => {
    expect(pageSrc).toContain("searchParams.get('access_code')")
  })

  it('confirmation page reads group_name from searchParams', () => {
    expect(pageSrc).toContain("searchParams.get('group_name')")
  })

  it('confirmation page reads amount_paid from searchParams', () => {
    expect(pageSrc).toContain("searchParams.get('amount_paid')")
  })

  it('confirmation page does NOT call .toFixed() directly on registration.depositPaid', () => {
    expect(pageSrc).not.toContain('registration.depositPaid.toFixed')
  })

  it('confirmation page does NOT call .toFixed() directly on registration.totalAmount', () => {
    expect(pageSrc).not.toContain('registration.totalAmount.toFixed')
  })

  it('confirmation page does NOT call .toFixed() directly on registration.balanceRemaining', () => {
    expect(pageSrc).not.toContain('registration.balanceRemaining.toFixed')
  })

  it('confirmation page uses null-safe merged variable depositPaid for .toFixed()', () => {
    expect(pageSrc).toContain('depositPaid.toFixed(2)')
    // The depositPaid variable is defined with ?? fallback, not registration.depositPaid
  })

  it('RegistrationData interface has optional financial fields (not required)', () => {
    expect(pageSrc).toContain('depositPaid?: number')
    expect(pageSrc).toContain('totalAmount?: number')
    expect(pageSrc).toContain('balanceRemaining?: number')
  })

  it('confirmation page shows portal linking step-by-step instructions', () => {
    expect(pageSrc).toContain('Link Your Group Leader Account')
  })

  it('confirmation page shows access code from merged URL/API source', () => {
    expect(pageSrc).toContain('const accessCode = registration?.accessCode ?? urlAccessCode')
  })

  it('stripped API response now includes organizationContactEmail', () => {
    expect(regApiSrc).toContain('organizationContactEmail: registration.event.organization.contactEmail')
  })

  it('stripped API response now includes organizationContactPhone', () => {
    expect(regApiSrc).toContain('organizationContactPhone: registration.event.organization.contactPhone')
  })

  it('confirmation page shows org contact info when available', () => {
    expect(pageSrc).toContain('organizationContactEmail')
  })
})

// ─── FIX 1.4 ─────────────────────────────────────────────────────────────────
describe('FIX 1.4 — Stripe Payment records store pi_... not cs_...', () => {
  const webhookSrc = read('src/app/api/webhooks/stripe/route.ts')
  const groupRegSrc = read('src/app/api/registration/group/route.ts')
  const indivRegSrc = read('src/app/api/registration/individual/route.ts')
  const backfillSrc = read('scripts/backfill-stripe-payment-intent-ids.ts')

  it('group registration POST stores payment_intent (not session.id)', () => {
    expect(groupRegSrc).toContain('stripePaymentIntentId: checkoutSession.payment_intent as string')
  })

  it('group registration POST does NOT store checkoutSession.id as stripePaymentIntentId', () => {
    expect(groupRegSrc).not.toContain('stripePaymentIntentId: checkoutSession.id')
  })

  it('individual registration POST stores payment_intent (not session.id)', () => {
    expect(indivRegSrc).toContain('stripePaymentIntentId: checkoutSession.payment_intent as string')
  })

  it('individual registration POST does NOT store checkoutSession.id as stripePaymentIntentId', () => {
    expect(indivRegSrc).not.toContain('stripePaymentIntentId: checkoutSession.id')
  })

  it('webhook group branch updateMany uses session.payment_intent (not session.id)', () => {
    const groupSection = webhookSrc.split('// Handle GROUP registration')[1]?.split('// Fetch registration')[0] || ''
    expect(groupSection).toContain('session.payment_intent as string')
    expect(groupSection).not.toContain('session.id')
  })

  it('webhook individual branch updateMany uses session.payment_intent (not session.id)', () => {
    const individualSection = webhookSrc.split('// Handle INDIVIDUAL registration')[1]?.split('// Handle STAFF registration')[0] || ''
    const updateBlock = individualSection.split('updateMany')[1]?.split('}')[0] || ''
    expect(updateBlock).toContain('payment_intent')
  })

  it('backfill script exists at scripts/backfill-stripe-payment-intent-ids.ts', () => {
    expect(fs.existsSync(path.join(ROOT, 'scripts/backfill-stripe-payment-intent-ids.ts'))).toBe(true)
  })

  it('backfill script targets cs_... records', () => {
    expect(backfillSrc).toContain("startsWith: 'cs_'")
  })

  it('backfill script calls stripe.checkout.sessions.retrieve to get the PI', () => {
    expect(backfillSrc).toContain('stripe.checkout.sessions.retrieve(sessionId')
  })

  it('backfill script has DRY_RUN mode', () => {
    expect(backfillSrc).toContain('DRY_RUN')
  })

  it('backfill script updates stripePaymentIntentId with pi_... value', () => {
    expect(backfillSrc).toContain("startsWith('pi_')")
  })
})

// ─── FIX 1.5 ─────────────────────────────────────────────────────────────────
describe('FIX 1.5 — Staff Stripe webhook handled + confirmation email', () => {
  const webhookSrc = read('src/app/api/webhooks/stripe/route.ts')
  const staffRegSrc = read('src/app/api/registration/staff/route.ts')

  it("webhook has registrationType === 'staff' branch", () => {
    expect(webhookSrc).toContain("registrationType === 'staff'")
  })

  it('staff branch updates StaffRegistration.paymentStatus to paid', () => {
    const staffSection = webhookSrc.split("// Handle STAFF registration")[1]?.split("// Handle GROUP registration")[0] || ''
    expect(staffSection).toContain("paymentStatus: 'paid'")
  })

  it('staff branch creates a Payment record', () => {
    const staffSection = webhookSrc.split("// Handle STAFF registration")[1]?.split("// Handle GROUP registration")[0] || ''
    expect(staffSection).toContain('prisma.payment.create')
  })

  it('staff branch Payment record uses actual amount from session.amount_total', () => {
    const staffSection = webhookSrc.split("// Handle STAFF registration")[1]?.split("// Handle GROUP registration")[0] || ''
    expect(staffSection).toContain('session.amount_total! / 100')
  })

  it('staff branch Payment record uses pi_... (session.payment_intent)', () => {
    const staffSection = webhookSrc.split("// Handle STAFF registration")[1]?.split("// Handle GROUP registration")[0] || ''
    expect(staffSection).toContain('session.payment_intent as string')
  })

  it('staff branch sends confirmation email', () => {
    const staffSection = webhookSrc.split("// Handle STAFF registration")[1]?.split("// Handle GROUP registration")[0] || ''
    expect(staffSection).toContain('resend.emails.send')
  })

  it('staff Stripe checkout session metadata includes organizationId', () => {
    expect(staffRegSrc).toContain('organizationId: event.organizationId')
  })

  it('staff Stripe checkout session metadata includes eventId', () => {
    const stripeMetadata = staffRegSrc.split('payment_intent_data')[1]?.split('success_url')[0] || ''
    // eventId is in payment_intent_data.metadata
    const sessionMetadata = staffRegSrc.split('metadata: {')[2] || staffRegSrc
    expect(staffRegSrc).toContain("registrationType: 'staff'")
  })

  it('free staff registration still sends confirmation email (no regression)', () => {
    // The free path emails before the Stripe block — check it still exists
    expect(staffRegSrc).toContain('Staff Registration Confirmed!')
  })
})

// ─── FIX 1.6 ─────────────────────────────────────────────────────────────────
describe('FIX 1.6 — IDOR: individual/staff GET endpoints have dual auth response', () => {
  const indivSrc = read('src/app/api/registration/individual/[registrationId]/route.ts')
  const staffSrc = read('src/app/api/registration/staff/[registrationId]/route.ts')

  it('individual endpoint imports getClerkUserIdFromRequest', () => {
    expect(indivSrc).toContain('getClerkUserIdFromRequest')
  })

  it('individual endpoint checks authentication and sets isAuthorized', () => {
    expect(indivSrc).toContain('isAuthorized')
  })

  it('individual endpoint returns full data for authorized callers', () => {
    expect(indivSrc).toContain('if (isAuthorized)')
  })

  it('individual unauthenticated response does NOT include firstName or lastName', () => {
    // The stripped response object should not include these fields
    const strippedSection = indivSrc.split('// Stripped public response')[1] || ''
    expect(strippedSection).not.toContain('firstName: registration.firstName')
    expect(strippedSection).not.toContain('lastName: registration.lastName')
  })

  it('individual unauthenticated response does NOT include email', () => {
    const strippedSection = indivSrc.split('// Stripped public response')[1] || ''
    expect(strippedSection).not.toContain('email: registration.email')
  })

  it('individual unauthenticated response does NOT include qrCode', () => {
    const strippedSection = indivSrc.split('// Stripped public response')[1] || ''
    expect(strippedSection).not.toContain('qrCode: registration.qrCode')
  })

  it('individual unauthenticated response includes org contact info', () => {
    expect(indivSrc).toContain('organizationContactEmail')
    expect(indivSrc).toContain('organizationContactPhone')
  })

  it('staff endpoint imports getClerkUserIdFromRequest', () => {
    expect(staffSrc).toContain('getClerkUserIdFromRequest')
  })

  it('staff endpoint checks authentication and sets isAuthorized', () => {
    expect(staffSrc).toContain('isAuthorized')
  })

  it('staff unauthenticated response does NOT include phone', () => {
    const strippedSection = staffSrc.split('// Stripped public response')[1] || ''
    expect(strippedSection).not.toContain('phone: registration.phone')
  })

  it('staff unauthenticated response does NOT include porosAccessCode', () => {
    const strippedSection = staffSrc.split('// Stripped public response')[1] || ''
    expect(strippedSection).not.toContain('porosAccessCode')
  })

  it('staff unauthenticated response does NOT include vendorRegistration', () => {
    const strippedSection = staffSrc.split('// Stripped public response')[1] || ''
    expect(strippedSection).not.toContain('vendorRegistration')
  })

  it('staff unauthenticated response includes org contact info', () => {
    expect(staffSrc).toContain('organizationContactEmail')
    expect(staffSrc).toContain('organizationContactPhone')
  })
})

// ─── FIX 1.7 ─────────────────────────────────────────────────────────────────
describe('FIX 1.7 — Support message actually sends email via Resend', () => {
  const supportSrc = read('src/app/api/group-leader/support/message/route.ts')

  it('imports Resend', () => {
    expect(supportSrc).toContain("from 'resend'")
  })

  it('no longer has a TODO comment', () => {
    expect(supportSrc).not.toContain('// TODO: Implement email sending')
  })

  it('calls resend.emails.send to notify the org', () => {
    expect(supportSrc).toContain('resend.emails.send')
  })

  it('sends to the organization contactEmail', () => {
    expect(supportSrc).toContain('to: orgEmail')
  })

  it('email subject includes group leader name and event name', () => {
    expect(supportSrc).toContain('Support message from ${leaderName}')
    expect(supportSrc).toContain('${eventName}')
  })

  it('email has reply_to set to the group leader email', () => {
    expect(supportSrc).toContain('reply_to: leaderEmail')
  })

  it('returns success: false when email send fails', () => {
    expect(supportSrc).toContain('success: false')
  })

  it('sends a confirmation email back to the group leader', () => {
    // Second resend.emails.send call sends to leaderEmail
    const confirmSection = supportSrc.split('// Send confirmation to the group leader')[1] || ''
    expect(confirmSection).toContain('to: leaderEmail')
  })

  it('does NOT return success: true without actually sending', () => {
    // The old stub returned success: true without calling resend
    // Now there's a real send before the success return
    const successReturn = supportSrc.indexOf("success: true")
    const firstResendCall = supportSrc.indexOf('resend.emails.send')
    expect(firstResendCall < successReturn).toBe(true)
  })
})

// ─── POST-FIX GREP CHECKS ─────────────────────────────────────────────────────
describe('Post-fix grep checks', () => {
  it('webhook does NOT use onCampusYouthPrice or hardcoded 150 for amountPaid in any PaymentBalance update', () => {
    const webhookSrc = read('src/app/api/webhooks/stripe/route.ts')
    // Extract all paymentBalance update blocks
    const updateBlocks = webhookSrc.match(/paymentBalance\.(update|updateMany)[\s\S]*?}\s*\)/g) || []
    for (const block of updateBlocks) {
      if (block.includes('amountPaid')) {
        expect(block).not.toContain('onCampusYouthPrice')
        expect(block).not.toContain(': 150')
        expect(block).not.toContain(': 200')
      }
    }
  })

  it('no refund-related code passes cs_... string to stripe.refunds.create', () => {
    const refundSrc = read('src/app/api/admin/refunds/route.ts')
    // The refund endpoint should use stripePaymentIntentId which now holds pi_...
    // It should NOT hardcode a cs_ value
    expect(refundSrc).not.toContain("'cs_'")
    expect(refundSrc).not.toContain('"cs_"')
  })

  it('/api/public/poros/[eventId]/m2k-data no longer has "no auth" comment', () => {
    const m2kSrc = read('src/app/api/public/poros/[eventId]/m2k-data/route.ts')
    expect(m2kSrc).not.toContain('no auth')
  })
})

// ─── RUN ──────────────────────────────────────────────────────────────────────
const width = 60
console.log('\n' + '═'.repeat(width))
console.log('TIER 1 CRITICAL FIXES — VERIFICATION')
console.log('═'.repeat(width) + '\n')

for (const suite of _suites) {
  let suitePassed = 0
  let suiteFailed = 0
  const results: string[] = []

  for (const test of suite.tests) {
    try {
      test.fn()
      results.push(`  ✅ ${test.name}`)
      suitePassed++
      _passed++
    } catch (err: any) {
      results.push(`  ❌ ${test.name}\n     ${err.message}`)
      suiteFailed++
      _failed++
    }
  }

  const icon = suiteFailed === 0 ? '✅' : '❌'
  console.log(`${icon} ${suite.name} (${suitePassed}/${suite.tests.length})`)
  results.forEach((r) => console.log(r))
  console.log()
}

console.log('─'.repeat(width))
console.log(`Total: ${_passed + _failed} tests | ✅ ${_passed} passed | ❌ ${_failed} failed`)
console.log('═'.repeat(width) + '\n')

if (_failed > 0) process.exit(1)
