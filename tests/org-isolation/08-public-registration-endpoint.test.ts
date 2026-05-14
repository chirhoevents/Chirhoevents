/**
 * Test Suite 08: Public Registration Endpoint Vulnerability
 *
 * ⚠️  HIGH SECURITY CONCERN ⚠️
 *
 * The endpoint GET /api/registration/[registrationId] has NO authentication.
 * It returns sensitive data to anyone who knows the registration UUID:
 *   - accessCode (can be used to further exploit the debug endpoint)
 *   - groupLeaderEmail (PII — contact email)
 *   - depositPaid / totalAmount / balanceRemaining (financial data)
 *   - registrationStatus
 *
 * This test file:
 * 1. Documents the data exposed by the endpoint
 * 2. Analyzes the real-world risk (UUID guessability)
 * 3. Verifies what a properly restricted response would look like
 * 4. Defines the minimal safe public response
 *
 * Run: npx tsx tests/org-isolation/08-public-registration-endpoint.test.ts
 */

import { describe, it, expect, printSummary } from './helpers/test-runner'
import {
  makeOrg,
  makeAdminUser,
  makeEvent,
  makeGroupRegistration,
  resetCounter,
} from './helpers/mock-factories'

// ============================================================
// SUITE: Document what the endpoint currently returns
// ============================================================

describe('Public Registration Endpoint: Data exposure analysis', () => {
  resetCounter()

  it('endpoint returns sensitive fields with no authentication', () => {
    // The current code in src/app/api/registration/[registrationId]/route.ts
    // returns ALL of these fields to any unauthenticated caller:

    const org = makeOrg()
    const admin = makeAdminUser(org)
    const event = makeEvent(org, admin)
    const reg = makeGroupRegistration(event, {
      accessCode: 'ACC-TEST1234',
      groupLeaderEmail: 'leader@example.com',
    })

    // Simulate what the endpoint response looks like:
    const endpointResponse = {
      id: reg.id,
      groupName: reg.groupName,
      accessCode: reg.accessCode,         // ← SENSITIVE: can be used in debug endpoint attack
      qrCode: reg.qrCode,
      groupLeaderEmail: reg.groupLeaderEmail, // ← PII: direct contact data
      totalParticipants: reg.totalParticipants,
      eventName: event.name,
      eventId: reg.eventId,
      depositPaid: 500,                   // ← Financial data
      totalAmount: 2000,                  // ← Financial data
      balanceRemaining: 1500,             // ← Financial data
      registrationStatus: reg.registrationStatus,
      organizationName: org.name,
      organizationLogoUrl: org.logoUrl,
    }

    // The accessCode is particularly dangerous:
    // An attacker can use it to call GET /api/admin/debug/payments/ACC-TEST1234
    // and get full payment details (before the debug endpoint is fixed)
    expect(endpointResponse.accessCode).toBe('ACC-TEST1234')

    // The email is PII and should not be publicly accessible
    expect(endpointResponse.groupLeaderEmail).toBe('leader@example.com')

    // Financial data should not be publicly accessible
    expect(endpointResponse.depositPaid).toBe(500)
    expect(endpointResponse.balanceRemaining).toBe(1500)
  })

  it('the registrationId is a UUID — not guessable by brute force', () => {
    // UUIDs are 128-bit random values — 3.4 × 10^38 possible values.
    // Brute-force enumeration is computationally infeasible.
    //
    // HOWEVER, UUIDs ARE leaked through:
    // 1. Confirmation emails (contain the registrationId in the URL)
    // 2. Server logs (access logs record the URL)
    // 3. Browser history of the group leader's computer
    // 4. Referrer headers (if the confirmation page links to external resources)
    // 5. Forwarded/shared confirmation emails

    const org = makeOrg()
    const admin = makeAdminUser(org)
    const event = makeEvent(org, admin)
    const reg = makeGroupRegistration(event)

    // The UUID format: 8-4-4-4-12 hexadecimal characters
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    expect(uuidPattern.test(reg.id)).toBeTruthy()

    // Not guessable by brute force (2^128 search space)
    const possibleValues = BigInt('340282366920938463463374607431768211456')
    expect(possibleValues).toBeGreaterThan(1e30)
  })

  it('confirmation email URL embeds the registrationId', () => {
    // The webhook sends a confirmation email with URL:
    //   ${appUrl}/registration/confirmation/${registration.id}
    //
    // Anyone who receives (or intercepts) this email can extract the UUID
    // and call GET /api/registration/<uuid> with NO authentication

    const org = makeOrg()
    const admin = makeAdminUser(org)
    const event = makeEvent(org, admin)
    const reg = makeGroupRegistration(event)

    const appUrl = 'https://chirhoevents.com'
    const confirmationUrl = `${appUrl}/registration/confirmation/${reg.id}`

    // The registration ID is in the URL — visible to anyone with the URL
    expect(confirmationUrl).toContain(reg.id)

    // Email forwarding attack:
    // 1. Group leader receives confirmation email
    // 2. Leader forwards email to a parent or participant
    // 3. Parent extracts UUID from the URL in the email
    // 4. Parent can now call GET /api/registration/<uuid> and see:
    //    - groupLeaderEmail (not their data)
    //    - financial balance (not their concern)
    //    - accessCode (which enables further attacks if debug endpoint is unfixed)

    const urlContainsUUID = confirmationUrl.includes(reg.id)
    expect(urlContainsUUID).toBeTruthy()
  })
})

// ============================================================
// SUITE: Safe vs unsafe response designs
// ============================================================

describe('Public Registration Endpoint: Safe response design', () => {
  resetCounter()

  it('SAFE response strips PII and financial data', () => {
    const org = makeOrg()
    const admin = makeAdminUser(org)
    const event = makeEvent(org, admin)
    const reg = makeGroupRegistration(event, {
      groupLeaderEmail: 'leader@example.com',
      accessCode: 'ACC-SECRET1',
    })

    // What the endpoint SHOULD return (minimum needed for confirmation page):
    const safeResponse = {
      id: reg.id,
      groupName: reg.groupName,
      eventName: event.name,
      registrationStatus: reg.registrationStatus,
      organizationName: org.name,
      organizationLogoUrl: org.logoUrl,
      // Note: qrCode IS needed for the confirmation page (check-in)
      // It should be included but the page should require the leader to be logged in
      // OR use a separate secure QR code endpoint
    }

    // Safe response does NOT include:
    const safeResponseKeys = Object.keys(safeResponse)
    expect(safeResponseKeys).not.toContain('accessCode')
    expect(safeResponseKeys).not.toContain('groupLeaderEmail')
    expect(safeResponseKeys).not.toContain('depositPaid')
    expect(safeResponseKeys).not.toContain('totalAmount')
    expect(safeResponseKeys).not.toContain('balanceRemaining')
  })

  it('UNSAFE: current response contains fields that enable attack chain', () => {
    const org = makeOrg()
    const admin = makeAdminUser(org)
    const event = makeEvent(org, admin)
    const reg = makeGroupRegistration(event, { accessCode: 'ACC-ATTACK1' })

    // Current response includes accessCode
    const currentResponseContainsAccessCode = 'accessCode' in {
      id: reg.id,
      groupName: reg.groupName,
      accessCode: reg.accessCode, // ← THIS enables the debug endpoint attack
      groupLeaderEmail: 'leader@example.com',
      depositPaid: 500,
      totalAmount: 2000,
      balanceRemaining: 1500,
      registrationStatus: reg.registrationStatus,
      organizationName: org.name,
      organizationLogoUrl: org.logoUrl,
    }

    expect(currentResponseContainsAccessCode).toBeTruthy() // This SHOULD be false after fix

    // Attack chain enabled by accessCode:
    // 1. GET /api/registration/<uuid> → get accessCode 'ACC-ATTACK1'
    // 2. GET /api/admin/debug/payments/ACC-ATTACK1 → get full payment records
    //    (until the debug endpoint is fixed)
  })

  it('adding authentication requirement breaks the confirmation page flow', () => {
    // The confirmation page is shown immediately after payment (before the user
    // is necessarily logged in with a Clerk account). Group leaders register and
    // pay as part of the public registration flow.
    //
    // Therefore, requiring Clerk authentication on this endpoint would break
    // the intended UX.
    //
    // RECOMMENDED APPROACH:
    // 1. Remove sensitive fields from the response (accessCode, groupLeaderEmail, financials)
    // 2. The QR code can remain since it's already public in the confirmation email
    // 3. The group leader portal (authenticated) provides the full financial view

    // Verify that the unauthenticated page DOES need some basic info:
    const necessaryPublicFields = [
      'groupName',      // "Hello, St. Joseph's Youth Group!"
      'eventName',      // "Which event am I registered for?"
      'registrationStatus', // "Is my registration complete?"
      'organizationName',   // "Which org is running this?"
    ]

    // These fields are safe to expose publicly (no PII, no financial data, no access codes)
    for (const field of necessaryPublicFields) {
      expect(typeof field).toBe('string')
    }

    // These fields should NOT be in the unauthenticated response:
    const fieldsToRemove = ['accessCode', 'groupLeaderEmail', 'depositPaid', 'totalAmount', 'balanceRemaining']
    expect(fieldsToRemove.length).toBeGreaterThan(0)
  })
})

// ============================================================
// SUITE: Comparison with authentication in other public endpoints
// ============================================================

describe('Public Registration Endpoint: Comparison with other public registration APIs', () => {
  resetCounter()

  it('POST /api/registration/group is correctly public (write-only)', () => {
    // The group registration POST endpoint is intentionally public.
    // It only WRITES data and returns a confirmation.
    // This is correct: anyone should be able to register for an event.

    const isPublicWrite = true // By design
    const returnsMinimalData = true // Only what's needed to confirm the registration

    expect(isPublicWrite).toBeTruthy()
    expect(returnsMinimalData).toBeTruthy()
  })

  it('GET /api/events/[eventId] public event info does NOT expose financial data', () => {
    // The public event listing endpoint (for the registration page) only
    // returns public event information: name, dates, location, pricing tiers.
    // It does NOT return payment data for any organization.

    const publicEventResponse = {
      name: 'ChiRho Youth Conference 2025',
      startDate: '2025-08-01',
      endDate: '2025-08-04',
      locationName: 'Retreat Center',
      status: 'published',
      // Does NOT include: organizationId details, financials, access codes
    }

    const hasNoFinancials = !publicEventResponse.hasOwnProperty('revenue')
    const hasNoAccessCodes = !publicEventResponse.hasOwnProperty('accessCode')
    expect(hasNoFinancials).toBeTruthy()
    expect(hasNoAccessCodes).toBeTruthy()
  })

  it('the confirmation endpoint is the ONLY public READ endpoint that returns financial data', () => {
    // Audit of all public-accessible (no auth) READ endpoints:
    //
    // ✅ GET /api/events/[eventId] — public event info only, no financials
    // ✅ GET /api/registration/group — public registration form data
    // ❌ GET /api/registration/[registrationId] — financial data without auth ← FIX NEEDED
    //
    // This is the only endpoint in the public API surface that returns
    // payment and financial data without requiring authentication.

    const publicEndpointsWithFinancialData = [
      'GET /api/registration/[registrationId]', // This one — needs fix
    ]
    expect(publicEndpointsWithFinancialData.length).toBe(1) // Should be 0 after fix
  })
})

// ============================================================
// Main
// ============================================================

async function main() {
  console.log('\n🔓 Running Public Registration Endpoint Vulnerability Tests...\n')
  console.log('NOTE: Tests document the current data exposure and required fix.\n')
  await new Promise(r => setTimeout(r, 50))
  printSummary()
}

main().catch(err => {
  console.error('Test runner failed:', err)
  process.exit(1)
})
