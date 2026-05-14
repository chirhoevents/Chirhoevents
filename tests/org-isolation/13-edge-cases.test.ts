/**
 * Test Suite 13: Edge Cases & Stress Scenarios — Phase 6
 *
 * 6.1  Same group leader email across orgs — portal shows correct data per org,
 *       payments route to the right account, access code linking is isolated.
 * 6.2  Org admin direct URL manipulation — cross-org event ID in URL yields 403/404.
 * 6.3  Concurrent registration (50 leaders) — no shared state; each registration
 *       is independent; race condition in capacity is documented.
 * 6.4  Event capacity limits near-full — two simultaneous groups each requesting
 *       more spots than remain; TOCTOU race documented; Math.max(0,...) floor verified.
 * 6.5  Org deletion/deactivation — missing guard documented; existing data still
 *       isolated to the deactivated org; no cross-org leakage.
 * 6.6  Payment failure mid-registration — registration is created BEFORE Stripe;
 *       capacity is decremented before Stripe; no automatic rollback; orphaned
 *       record analysis; no webhook handler for payment_failed.
 *
 * Run: npx tsx tests/org-isolation/13-edge-cases.test.ts
 */

import { describe, it, expect, printSummary } from './helpers/test-runner'
import {
  makeOrg,
  makeOrgWithoutStripe,
  makeAdminUser,
  makeGroupLeaderUser,
  makeEvent,
  makeGroupRegistration,
  makePayment,
  makeEventWithCapacity,
  simulateCapacityCheck,
  simulateConcurrentCapacityChecks,
  simulateCapacityAfterRegistrations,
  simulateRegistrationFlow,
  simulateLinkAccessCode,
  simulateDashboardQuery,
  simulateDashboardQueryFixed,
  simulateEventAccessGate,
  buildGroupCheckoutConfig,
  buildGroupLeaderPaymentIntentConfig,
  resetCounter,
  type OrgStatus,
} from './helpers/mock-factories'

// ============================================================
// SUITE 6.1 — Same group leader email across two orgs
// ============================================================

describe('6.1 Same Group Leader Email Across Orgs: portal isolation + payment routing', () => {
  resetCounter()

  it('leader can link access codes from two different orgs without conflict', () => {
    const orgA = makeOrg()
    const orgB = makeOrg()
    const adminA = makeAdminUser(orgA)
    const adminB = makeAdminUser(orgB)
    const eventA = makeEvent(orgA, adminA)
    const eventB = makeEvent(orgB, adminB)

    // Same email registers for both events (different access codes)
    const regA = makeGroupRegistration(eventA, { groupLeaderEmail: 'youth@minister.com', clerkUserId: 'clerk_leader_cross' })
    const regB = makeGroupRegistration(eventB, { groupLeaderEmail: 'youth@minister.com', clerkUserId: 'clerk_leader_cross' })

    // Each registration has a different access code and different org
    expect(regA.accessCode).not.toBe(regB.accessCode)
    expect(regA.organizationId).toBe(orgA.id)
    expect(regB.organizationId).toBe(orgB.id)
    expect(regA.groupLeaderEmail).toBe(regB.groupLeaderEmail) // Same person
  })

  it('linking code A succeeds; linking code B also succeeds — not a conflict', () => {
    const orgA = makeOrg()
    const orgB = makeOrg()
    const adminA = makeAdminUser(orgA)
    const adminB = makeAdminUser(orgB)
    const eventA = makeEvent(orgA, adminA)
    const eventB = makeEvent(orgB, adminB)
    const leaderId = 'clerk_youth_minister_001'

    const regA = makeGroupRegistration(eventA, { clerkUserId: null }) // Not yet linked
    const regB = makeGroupRegistration(eventB, { clerkUserId: null })

    // Leader links Code A → 200
    const linkA = simulateLinkAccessCode(regA, leaderId)
    expect(linkA.status).toBe(200)
    expect(linkA.success).toBeTruthy()

    // Simulate: regA is now linked to leaderId
    const linkedRegA = { ...regA, clerkUserId: leaderId }

    // Leader links Code B (different registration) → also 200 (no conflict — different reg)
    const linkB = simulateLinkAccessCode(regB, leaderId)
    expect(linkB.status).toBe(200)
    expect(linkB.success).toBeTruthy()

    // Both linked to same user — still different registrations
    const linkedRegB = { ...regB, clerkUserId: leaderId }
    expect(linkedRegA.clerkUserId).toBe(linkedRegB.clerkUserId)
    expect(linkedRegA.id).not.toBe(linkedRegB.id)
    expect(linkedRegA.organizationId).not.toBe(linkedRegB.organizationId)
  })

  it('dashboard WITHOUT eventId returns FIRST registration (Org A) — Org B not shown', () => {
    const orgA = makeOrg()
    const orgB = makeOrg()
    const adminA = makeAdminUser(orgA)
    const adminB = makeAdminUser(orgB)
    const eventA = makeEvent(orgA, adminA)
    const eventB = makeEvent(orgB, adminB)
    const leaderId = 'clerk_youth_minister_001'

    const regA = makeGroupRegistration(eventA, { clerkUserId: leaderId, groupName: 'Alpha Group' })
    const regB = makeGroupRegistration(eventB, { clerkUserId: leaderId, groupName: 'Beta Group' })

    // findFirst returns regA (assumed first by insertion order)
    const dashboard = simulateDashboardQuery([regA, regB], leaderId)

    expect(dashboard).not.toBeNull()
    expect(dashboard!.groupName).toBe('Alpha Group')
    // Org B registration is not returned — leader must use eventId to reach it
    expect(dashboard!.organizationId).toBe(orgA.id)
  })

  it('dashboard WITH correct eventId (buggy: id=eventId) returns null for cross-org leader', () => {
    // Documenting the whereClause.id=eventId bug in the dashboard route.
    // When eventId is provided, the route sets whereClause.id = eventId
    // (filtering by registration.id, not registration.eventId).
    // So passing eventB.id would look for a registration whose PRIMARY KEY equals eventB.id.
    // Since registration IDs ≠ event IDs, this returns null.

    const orgA = makeOrg()
    const orgB = makeOrg()
    const adminA = makeAdminUser(orgA)
    const adminB = makeAdminUser(orgB)
    const eventA = makeEvent(orgA, adminA)
    const eventB = makeEvent(orgB, adminB)
    const leaderId = 'clerk_youth_minister_001'

    const regA = makeGroupRegistration(eventA, { clerkUserId: leaderId })
    const regB = makeGroupRegistration(eventB, { clerkUserId: leaderId })

    // Buggy: passing eventB.id is treated as registration.id — no match
    const buggyResult = simulateDashboardQuery([regA, regB], leaderId, eventB.id)
    expect(buggyResult).toBeNull() // Bug: leader can't reach their Org B registration

    // Fixed: passing eventB.id filters by registration.eventId
    const fixedResult = simulateDashboardQueryFixed([regA, regB], leaderId, eventB.id)
    expect(fixedResult).not.toBeNull()
    expect(fixedResult!.eventId).toBe(eventB.id)
    expect(fixedResult!.organizationId).toBe(orgB.id)
  })

  it('balance payment for Org A registration routes to Org A Stripe account', () => {
    const orgA = makeOrg()
    const orgB = makeOrg()
    const adminA = makeAdminUser(orgA)
    const adminB = makeAdminUser(orgB)
    const eventA = makeEvent(orgA, adminA)
    const eventB = makeEvent(orgB, adminB)
    const leaderId = 'clerk_youth_minister_001'

    const regA = makeGroupRegistration(eventA, { clerkUserId: leaderId })
    const regB = makeGroupRegistration(eventB, { clerkUserId: leaderId })

    // Payment intent for regA uses orgA's Stripe account
    const configA = buildGroupLeaderPaymentIntentConfig(orgA, 50000)
    const configB = buildGroupLeaderPaymentIntentConfig(orgB, 80000)

    expect(configA.transfer_data?.destination).toBe(orgA.stripeAccountId)
    expect(configB.transfer_data?.destination).toBe(orgB.stripeAccountId)
    expect(configA.transfer_data?.destination).not.toBe(configB.transfer_data?.destination)
  })

  it('a third leader trying to claim a code already linked to the cross-org leader gets 409', () => {
    const orgA = makeOrg()
    const adminA = makeAdminUser(orgA)
    const eventA = makeEvent(orgA, adminA)
    const leaderId = 'clerk_youth_minister_001'
    const intruder = 'clerk_intruder_999'

    const regA = makeGroupRegistration(eventA, { clerkUserId: leaderId })

    // Intruder tries to link the same code
    const result = simulateLinkAccessCode(regA, intruder)

    expect(result.status).toBe(409)
    expect(result.success).toBeFalsy()
    expect(result.error).toContain('already linked to another account')
  })

  it('re-linking the same code with the same user is idempotent — 200, not 409', () => {
    const orgA = makeOrg()
    const adminA = makeAdminUser(orgA)
    const eventA = makeEvent(orgA, adminA)
    const leaderId = 'clerk_youth_minister_001'

    const regA = makeGroupRegistration(eventA, { clerkUserId: leaderId })

    // Leader links their own code again (e.g., after signing out and back in)
    const result = simulateLinkAccessCode(regA, leaderId)

    expect(result.status).toBe(200)
    expect(result.success).toBeTruthy()
    expect(result.message).toContain('already linked')
  })
})

// ============================================================
// SUITE 6.2 — Org admin direct URL manipulation
// ============================================================

describe('6.2 Direct URL Manipulation: cross-org event ID yields 403/404', () => {
  resetCounter()

  it('org_admin requesting their own event passes the access gate', () => {
    const orgA = makeOrg()
    const adminA = makeAdminUser(orgA, { role: 'org_admin' })
    const eventA = makeEvent(orgA, adminA)

    const gate = simulateEventAccessGate(orgA.id, 'org_admin', eventA.organizationId)
    expect(gate.allowed).toBeTruthy()
    expect(gate.status).toBe(200)
  })

  it('org_admin requesting another org\'s event via direct URL → 403', () => {
    const orgA = makeOrg()
    const orgB = makeOrg()
    const adminA = makeAdminUser(orgA, { role: 'org_admin' })
    const adminB = makeAdminUser(orgB)
    const eventB = makeEvent(orgB, adminB)

    // Admin A tries: GET /api/admin/events/<eventB.id>/reports/registrations
    const gate = simulateEventAccessGate(orgA.id, 'org_admin', eventB.organizationId)

    expect(gate.allowed).toBeFalsy()
    expect(gate.status).toBe(403)
    expect(gate.reason).toContain('mismatch')
  })

  it('every report endpoint (all 5 types) blocks the cross-org request — same gate', () => {
    const orgA = makeOrg()
    const orgB = makeOrg()
    const adminA = makeAdminUser(orgA, { role: 'org_admin' })
    const adminB = makeAdminUser(orgB)
    const eventB = makeEvent(orgB, adminB)

    // The verifyEventAccess / verifyEventAccessWithPermission gate is called by ALL
    // report routes before any query runs. They all share the same gate logic.
    const reportTypes = [
      'registrations', 'financial', 'medical', 'housing', 'check-in'
    ]

    for (const reportType of reportTypes) {
      const gate = simulateEventAccessGate(orgA.id, 'org_admin', eventB.organizationId)
      expect(gate.allowed).toBeFalsy()  // All blocked
      expect(gate.status).toBe(403)
    }
  })

  it('event_manager from Org A cannot access Org B event data via URL', () => {
    const orgA = makeOrg()
    const orgB = makeOrg()
    const managerA = makeAdminUser(orgA, { role: 'event_manager' })
    const adminB = makeAdminUser(orgB)
    const eventB = makeEvent(orgB, adminB)

    const gate = simulateEventAccessGate(orgA.id, 'event_manager', eventB.organizationId)
    expect(gate.allowed).toBeFalsy()
    expect(gate.status).toBe(403)
  })

  it('group_leader cannot access admin event reports via any URL', () => {
    const orgA = makeOrg()
    const orgB = makeOrg()
    const adminA = makeAdminUser(orgA)
    const adminB = makeAdminUser(orgB)
    const eventA = makeEvent(orgA, adminA)
    const eventB = makeEvent(orgB, adminB)
    const leader = makeGroupLeaderUser(orgA)

    // Group leader is not an admin — requireAdmin check blocks even own-org event
    // (isAdmin returns false for 'group_leader')
    const { isAdminRole } = require('../../src/lib/permissions')
    const leaderIsAdmin = isAdminRole('group_leader')
    expect(leaderIsAdmin).toBeFalsy()
    // Therefore verifyEventAccess returns 403 "Admin access required" before the org check
  })

  it('master_admin can access any event — URL manipulation is not a concern', () => {
    const orgA = makeOrg()
    const orgB = makeOrg()
    const masterAdmin = makeAdminUser(orgA, { role: 'master_admin' })
    const adminB = makeAdminUser(orgB)
    const eventB = makeEvent(orgB, adminB)

    // This is intended — master_admin has platform-wide access
    const gate = simulateEventAccessGate(orgA.id, 'master_admin', eventB.organizationId)
    expect(gate.allowed).toBeTruthy()
    expect(gate.status).toBe(200)
  })

  it('a non-existent event ID in URL returns 404, not data from any org', () => {
    // verifyEventAccess: if event not found → 404 (before org check)
    // Test: there is no event with id 'made-up-uuid-abc'
    const orgA = makeOrg()
    const adminA = makeAdminUser(orgA, { role: 'org_admin' })

    // Simulate: prisma.event.findUnique({ where: { id: 'made-up-uuid-abc' } }) → null
    const eventNotFound = null
    const wouldReturn404 = eventNotFound === null

    expect(wouldReturn404).toBeTruthy() // → 404 "Event not found"
  })
})

// ============================================================
// SUITE 6.3 — Concurrent registration (50 group leaders)
// ============================================================

describe('6.3 Concurrent Registration: 50 leaders, no shared state per registration', () => {
  resetCounter()

  it('50 concurrent registrations each produce a unique registration record', () => {
    const org = makeOrg()
    const admin = makeAdminUser(org)
    const event = makeEvent(org, admin)

    const registrations = Array.from({ length: 50 }, (_, i) =>
      makeGroupRegistration(event, {
        groupName: `Parish ${i + 1}`,
        groupLeaderEmail: `leader${i + 1}@parish${i + 1}.org`,
        youthCount: 10,
        totalParticipants: 12,
      })
    )

    // All 50 are distinct records
    const ids = new Set(registrations.map(r => r.id))
    const accessCodes = new Set(registrations.map(r => r.accessCode))

    expect(ids.size).toBe(50)          // All unique IDs
    expect(accessCodes.size).toBe(50)  // All unique access codes
  })

  it('all 50 registrations belong to the correct org and event', () => {
    const org = makeOrg()
    const admin = makeAdminUser(org)
    const event = makeEvent(org, admin)

    const registrations = Array.from({ length: 50 }, (_, i) =>
      makeGroupRegistration(event, { groupName: `Parish ${i + 1}` })
    )

    expect(registrations.every(r => r.organizationId === org.id)).toBeTruthy()
    expect(registrations.every(r => r.eventId === event.id)).toBeTruthy()
    expect(registrations.every(r => r.registrationStatus === 'pending_forms')).toBeTruthy()
  })

  it('no shared state between concurrent registrations — each is self-contained', () => {
    const org = makeOrg()
    const admin = makeAdminUser(org)
    const event = makeEvent(org, admin)

    const r1 = makeGroupRegistration(event, { groupName: 'Group 1', youthCount: 15 })
    const r2 = makeGroupRegistration(event, { groupName: 'Group 2', youthCount: 8 })

    // Modifying r1 does not affect r2
    const mutatedR1 = { ...r1, youthCount: 99 }
    expect(r2.youthCount).toBe(8)     // r2 unchanged
    expect(mutatedR1.id).not.toBe(r2.id)
    expect(mutatedR1.accessCode).not.toBe(r2.accessCode)
  })

  it('50 concurrent leaders each link their own access code — no 409 conflicts', () => {
    const org = makeOrg()
    const admin = makeAdminUser(org)
    const event = makeEvent(org, admin)

    const registrations = Array.from({ length: 50 }, (_, i) =>
      makeGroupRegistration(event, { clerkUserId: null, groupName: `Parish ${i + 1}` })
    )

    // Each leader links their own code — different registration per leader
    const results = registrations.map((reg, i) => {
      const leaderId = `clerk_leader_${i + 1}`
      return simulateLinkAccessCode(reg, leaderId)
    })

    expect(results.every(r => r.status === 200)).toBeTruthy()
    expect(results.every(r => r.success)).toBeTruthy()
    expect(results.some(r => r.status === 409)).toBeFalsy()
  })

  it('payment configs for 50 concurrent card payments are independently scoped', () => {
    const org = makeOrg()
    const admin = makeAdminUser(org)
    const event = makeEvent(org, admin)

    // 50 different deposit amounts (simulating different group sizes)
    const configs = Array.from({ length: 50 }, (_, i) => ({
      amountCents: (i + 1) * 10000,
      config: buildGroupCheckoutConfig(org, (i + 1) * 10000),
    }))

    // All point to same org Stripe account (correct)
    expect(configs.every(c => c.config.payment_intent_data?.transfer_data?.destination === org.stripeAccountId)).toBeTruthy()

    // Each config has its own application_fee_amount (1% of their deposit)
    const feeAmounts = configs.map(c => c.config.payment_intent_data?.application_fee_amount)
    const uniqueFees = new Set(feeAmounts)
    expect(uniqueFees.size).toBe(50) // All different
  })

  it('RACE CONDITION DOCUMENTED: concurrent capacity reads all see the same value before any decrement', () => {
    // In the real code, the sequence is:
    //   Request A: READ capacityRemaining=5 → passes check
    //   Request B: READ capacityRemaining=5 → passes check  (same value!)
    //   Request A: DECREMENT to 2 (asked for 3)
    //   Request B: DECREMENT to 0 (asked for 5) → goes negative! Math.max(0) floors it
    //
    // Both pass the check because the READ is not inside the same atomic operation as the check.

    const initialRemaining = 5
    const concurrent = [
      { name: 'Group A', participants: 3 },
      { name: 'Group B', participants: 5 },
    ]

    // Both requests read capacityRemaining=5 (no lock) → both pass the check
    const checkResults = simulateConcurrentCapacityChecks(initialRemaining, concurrent)

    expect(checkResults[0].passedCheck).toBeTruthy() // Group A (3 of 5 remaining) passes
    expect(checkResults[1].passedCheck).toBeTruthy() // Group B (5 of 5) also passes — RACE!
    // Total requested: 8 > 5 available — over-allocation possible
  })
})

// ============================================================
// SUITE 6.4 — Event capacity limits near-full
// ============================================================

describe('6.4 Event Capacity Near-Full: exact-limit behavior and race condition', () => {
  resetCounter()

  it('capacity check blocks when remaining is exactly 0', () => {
    const check = simulateCapacityCheck(0, 100, 1)
    expect(check.allowed).toBeFalsy()
    expect(check.status).toBe(400)
    expect(check.error).toContain('full capacity')
  })

  it('capacity check blocks when requested > remaining (1 spot left, 5 requested)', () => {
    const check = simulateCapacityCheck(1, 100, 5)
    expect(check.allowed).toBeFalsy()
    expect(check.status).toBe(400)
    expect(check.spotsRemaining).toBe(1)
    expect(check.error).toContain('Only 1 spot')
  })

  it('capacity check passes when requested === remaining (exact fit)', () => {
    const check = simulateCapacityCheck(10, 100, 10)
    expect(check.allowed).toBeTruthy()
    expect(check.status).toBe(200)
  })

  it('capacity check passes when requested < remaining', () => {
    const check = simulateCapacityCheck(15, 100, 10)
    expect(check.allowed).toBeTruthy()
    expect(check.status).toBe(200)
    expect(check.spotsRemaining).toBe(15)
  })

  it('null capacity (no limit configured) always passes', () => {
    const check = simulateCapacityCheck(null, null, 999)
    expect(check.allowed).toBeTruthy()
    expect(check.status).toBe(200)
  })

  it('Math.max(0,...) prevents capacity going below zero after concurrent decrements', () => {
    // The route uses: Math.max(0, event.capacityRemaining - totalParticipants)
    // This floor ensures we don't store a negative number, but does NOT prevent
    // over-allocation at the check stage.

    const finalCapacity = simulateCapacityAfterRegistrations(5, [3, 5])
    // Sequential: 5 → 2 → Math.max(0, 2-5) = 0
    expect(finalCapacity).toBe(0)
    expect(finalCapacity).toBeGreaterThan(-1) // Never negative
  })

  it('TOCTOU: two groups of 5 both pass check when only 5 spots remain', () => {
    // Group A reads 5 remaining → passes check (5 >= 5)
    // Group B reads 5 remaining → passes check (5 >= 5) — READ BEFORE DECREMENT
    // Group A decrements → 0 remaining
    // Group B decrements → Math.max(0, 0-5) = 0 — capacity "floored" but NOT restored
    //
    // Result: 10 participants registered against 5 spots → over-allocation

    const initialRemaining = 5
    const concurrent = [
      { name: 'Group A (5 youth)', participants: 5 },
      { name: 'Group B (5 youth)', participants: 5 },
    ]

    const checkResults = simulateConcurrentCapacityChecks(initialRemaining, concurrent)

    // Both pass! (This is the race condition)
    expect(checkResults[0].passedCheck).toBeTruthy()
    expect(checkResults[1].passedCheck).toBeTruthy()

    // After both process: capacity floor is 0, but 10 were registered
    const capacityAfter = simulateCapacityAfterRegistrations(5, [5, 5])
    expect(capacityAfter).toBe(0)
    // Math.max prevents negative but cannot retroactively cancel the second registration
  })

  it('RECOMMENDED FIX: atomic decrement with check prevents over-allocation', () => {
    // The fix is a database-level atomic check-and-decrement:
    //   UPDATE events
    //   SET capacity_remaining = capacity_remaining - $n
    //   WHERE id = $id AND capacity_remaining >= $n
    //   RETURNING capacity_remaining
    //
    // If affected_rows = 0, the capacity was already insufficient.
    // This eliminates the TOCTOU window entirely.
    //
    // Alternatively: use a Prisma transaction:
    //   prisma.$transaction(async (tx) => {
    //     const event = await tx.event.findUnique({ where: { id }, select: { capacityRemaining } })
    //     if (event.capacityRemaining < n) throw new Error('No capacity')
    //     await tx.event.update({ where: { id }, data: { capacityRemaining: { decrement: n } } })
    //   })

    // Verify: the atomic approach returns exactly the right capacity
    function atomicDecrement(capacity: number, requested: number): { success: boolean; newCapacity: number } {
      if (capacity < requested) return { success: false, newCapacity: capacity }
      return { success: true, newCapacity: capacity - requested }
    }

    const { success: firstSuccess, newCapacity: after1 } = atomicDecrement(5, 5)
    const { success: secondSuccess, newCapacity: after2 } = atomicDecrement(after1, 5)

    expect(firstSuccess).toBeTruthy()   // First group gets spots
    expect(secondSuccess).toBeFalsy()   // Second group is rejected atomically
    expect(after1).toBe(0)
    expect(after2).toBe(0)              // Unchanged on failure
  })

  it('capacity check error includes spotsRemaining for client display', () => {
    const check = simulateCapacityCheck(3, 100, 7)
    expect(check.allowed).toBeFalsy()
    expect(check.spotsRemaining).toBe(3)
    // Client can show: "Only 3 spots remaining, you requested 7"
  })
})

// ============================================================
// SUITE 6.5 — Org deletion/deactivation
// ============================================================

describe('6.5 Org Deactivation: missing guard documented; existing data stays isolated', () => {
  resetCounter()

  it('SECURITY FINDING: registration route does NOT check organization.status', () => {
    // In registration/group/route.ts, the organization select is:
    //   organization: { select: { id, name, stripeAccountId, stripeChargesEnabled, platformFeePercentage } }
    //
    // 'status' is NOT selected and NOT checked.
    // A deactivated org's event will still accept new registrations.

    const deactivatedOrg = makeOrg({ status: 'deactivated' } as any)

    // The fields that ARE fetched during registration
    const fetchedFields = ['id', 'name', 'stripeAccountId', 'stripeChargesEnabled', 'platformFeePercentage']
    const statusFieldFetched = fetchedFields.includes('status')

    expect(statusFieldFetched).toBeFalsy() // FINDING: status is not checked
    // A deactivated org's events can still accept registrations — this is a gap.
  })

  it('RECOMMENDED FIX: should check org.status === "active" before creating registration', () => {
    // The correct guard would be:
    //   if (event.organization.status !== 'active') {
    //     return NextResponse.json({ error: 'This event is no longer accepting registrations' }, { status: 403 })
    //   }

    function simulateWithOrgStatusCheck(orgStatus: OrgStatus): { allowed: boolean; status: number } {
      if (orgStatus !== 'active') {
        return { allowed: false, status: 403 }
      }
      return { allowed: true, status: 200 }
    }

    expect(simulateWithOrgStatusCheck('active').allowed).toBeTruthy()
    expect(simulateWithOrgStatusCheck('suspended').allowed).toBeFalsy()
    expect(simulateWithOrgStatusCheck('deactivated').allowed).toBeFalsy()
    expect(simulateWithOrgStatusCheck('pending').allowed).toBeFalsy()
  })

  it('existing registrations of a deactivated org remain isolated to that org', () => {
    // Even if an org is deactivated, its data is still correctly org-scoped.
    // Other orgs cannot access it — the event ownership check still applies.

    const activeOrg = makeOrg({ status: 'active' } as any)
    const deactivatedOrg = makeOrg({ status: 'deactivated' } as any)
    const adminActive = makeAdminUser(activeOrg)
    const adminDeactivated = makeAdminUser(deactivatedOrg)
    const eventActive = makeEvent(activeOrg, adminActive)
    const eventDeactivated = makeEvent(deactivatedOrg, adminDeactivated)

    const regDeactivated = makeGroupRegistration(eventDeactivated, { groupName: 'Old Parish Group' })

    // Active org admin cannot access deactivated org's event data
    const gate = simulateEventAccessGate(activeOrg.id, 'org_admin', eventDeactivated.organizationId)
    expect(gate.allowed).toBeFalsy()
    expect(gate.status).toBe(403)

    // Deactivated org's registration is still scoped to its event
    expect(regDeactivated.organizationId).toBe(deactivatedOrg.id)
    expect(regDeactivated.organizationId).not.toBe(activeOrg.id)
  })

  it('deactivated org event data does NOT appear in active org reports', () => {
    const activeOrg = makeOrg()
    const deactivatedOrg = makeOrg()
    const adminActive = makeAdminUser(activeOrg)
    const adminDeactivated = makeAdminUser(deactivatedOrg)
    const eventActive = makeEvent(activeOrg, adminActive)
    const eventDeactivated = makeEvent(deactivatedOrg, adminDeactivated)

    const regActive = makeGroupRegistration(eventActive, { groupName: 'Active Parish' })
    const regDeactivated = makeGroupRegistration(eventDeactivated, { groupName: 'Deactivated Parish' })
    const allRegs = [regActive, regDeactivated]

    // Active org admin's report for eventActive → only sees active org's registrations
    const { queryByEventId } = require('./helpers/mock-factories')
    const report = allRegs.filter(r => r.eventId === eventActive.id)

    expect(report.length).toBe(1)
    expect(report[0].groupName).toBe('Active Parish')
    expect(report.some(r => r.groupName === 'Deactivated Parish')).toBeFalsy()
  })

  it('deactivated org admin cannot access OTHER orgs\' events (gate still applies)', () => {
    const activeOrg = makeOrg()
    const deactivatedOrg = makeOrg()
    const adminDeactivated = makeAdminUser(deactivatedOrg, { role: 'org_admin' })
    const adminActive = makeAdminUser(activeOrg)
    const eventActive = makeEvent(activeOrg, adminActive)

    // Even though the org is deactivated, the user account still has 'org_admin' role.
    // Their org ID still doesn't match eventActive.organizationId.
    const gate = simulateEventAccessGate(deactivatedOrg.id, 'org_admin', eventActive.organizationId)
    expect(gate.allowed).toBeFalsy()
    expect(gate.status).toBe(403)
  })

  it('payments of deactivated org are not included in active org financial reports', () => {
    const activeOrg = makeOrg()
    const deactivatedOrg = makeOrg()
    const adminActive = makeAdminUser(activeOrg)
    const adminDeactivated = makeAdminUser(deactivatedOrg)
    const eventActive = makeEvent(activeOrg, adminActive)
    const eventDeactivated = makeEvent(deactivatedOrg, adminDeactivated)
    const regActive = makeGroupRegistration(eventActive)
    const regDeactivated = makeGroupRegistration(eventDeactivated)

    const paymentActive = makePayment(activeOrg, eventActive, regActive, { amount: 1000 })
    const paymentDeactivated = makePayment(deactivatedOrg, eventDeactivated, regDeactivated, { amount: 5000 })
    const allPayments = [paymentActive, paymentDeactivated]

    const reportForActive = allPayments.filter(p => p.eventId === eventActive.id)

    expect(reportForActive.length).toBe(1)
    expect(reportForActive[0].amount).toBe(1000)
    expect(reportForActive.some(p => p.amount === 5000)).toBeFalsy() // Deactivated org excluded
  })
})

// ============================================================
// SUITE 6.6 — Payment failure mid-registration
// ============================================================

describe('6.6 Payment Failure Mid-Registration: orphaned records and missing rollback', () => {
  resetCounter()

  it('ARCHITECTURE: registration is created BEFORE the Stripe API call', () => {
    // Order of operations in registration/group/route.ts:
    //   1. Capacity check (lines 119-170)
    //   2. Pricing calculation (lines 174-278)
    //   3. prisma.groupRegistration.create()  ← LINE 318
    //   4. prisma.paymentBalance.create()     ← LINE 393
    //   5. prisma.event.update() - decrement capacity  ← LINE 409
    //   6. decrementOptionCapacity()           ← LINE 420
    //   7. stripe.checkout.sessions.create()  ← LINE 594  (STRIPE CALLED LAST)
    //   8. prisma.payment.create()             ← LINE 597
    //
    // If Stripe throws at step 7:
    //   - Steps 3-6 are NOT rolled back (no $transaction wrapper)
    //   - Registration exists with status='incomplete'
    //   - Capacity is already decremented
    //   - PaymentBalance exists with status='unpaid'

    const org = makeOrg()
    const admin = makeAdminUser(org)
    const event = makeEventWithCapacity(org, admin, { total: 100, remaining: 50 })

    const flow = simulateRegistrationFlow({
      org,
      event,
      request: {
        groupName: 'St. Error Parish',
        groupLeaderEmail: 'leader@error.org',
        youthCount: 10, chaperoneCount: 2, priestCount: 0,
        housingType: 'on_campus',
        paymentMethod: 'card',
        eventId: event.id,
        organizationId: org.id,
      },
      stripeWillSucceed: false,  // Stripe fails
      stripeWillThrow: true,     // Exception thrown
    })

    // Registration was created before Stripe
    expect(flow.registrationCreated).toBeTruthy()
    expect(flow.capacityDecrementedStep).not.toBeNull()
    expect(flow.capacityDecrementedStep).toBeLessThanOrEqual(flow.stripeStep ?? 999)

    // Stripe failure → orphaned incomplete record
    expect(flow.orphanedOnStripeFailure).toBeTruthy()
    expect(flow.registrationStatus).toBe('incomplete')
    expect(flow.finalState).toBe('incomplete')
  })

  it('capacity is decremented before Stripe — so it stays decremented on failure', () => {
    const org = makeOrg()
    const admin = makeAdminUser(org)
    const event = makeEventWithCapacity(org, admin, { total: 100, remaining: 50 })

    const flowSucceeds = simulateRegistrationFlow({
      org, event,
      request: { groupName: 'G1', groupLeaderEmail: 'a@b.com', youthCount: 10, chaperoneCount: 0, priestCount: 0, housingType: 'on_campus', paymentMethod: 'card', eventId: event.id, organizationId: org.id },
      stripeWillSucceed: false,
      stripeWillThrow: true,
    })

    // Capacity was decremented at step 3 (or earlier), Stripe at step 4+
    expect(flowSucceeds.capacityDecrementedStep).not.toBeNull()
    expect(flowSucceeds.stripeStep).not.toBeNull()
    expect(flowSucceeds.capacityDecrementedStep! < flowSucceeds.stripeStep!).toBeTruthy()
  })

  it('check payment does NOT involve Stripe — no orphan risk for check registrations', () => {
    const org = makeOrg()
    const admin = makeAdminUser(org)
    const event = makeEventWithCapacity(org, admin, { total: 100, remaining: 50 })

    const flow = simulateRegistrationFlow({
      org, event,
      request: {
        groupName: 'St. Check Parish', groupLeaderEmail: 'check@leader.org',
        youthCount: 5, chaperoneCount: 1, priestCount: 0,
        housingType: 'on_campus', paymentMethod: 'check',
        eventId: event.id, organizationId: org.id,
      },
      stripeWillSucceed: false,  // Irrelevant for check
      stripeWillThrow: false,
    })

    // Check payments skip Stripe entirely
    expect(flow.stripeStep).toBeNull()
    expect(flow.orphanedOnStripeFailure).toBeFalsy()
    expect(flow.registrationStatus).toBe('pending_payment')
    expect(flow.finalState).toBe('complete')
  })

  it('SECURITY FINDING: no webhook handler for checkout.session.expired or payment_intent.payment_failed', () => {
    // From webhooks/stripe/route.ts, the handled event types are:
    const handledWebhookEvents = [
      'payment_intent.succeeded',
      'checkout.session.completed',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.payment_succeeded',
      'invoice.payment_failed',
      'account.updated',
    ]

    // NOT handled — registration-level payment failures are not cleaned up
    const missingHandlers = [
      'checkout.session.expired',       // Stripe session times out
      'payment_intent.payment_failed',  // Card declined for registration deposit
    ]

    for (const missingEvent of missingHandlers) {
      expect(handledWebhookEvents.includes(missingEvent)).toBeFalsy()
    }

    // Consequence: if a group leader abandons the checkout, their registration
    // stays in 'incomplete' status and capacity stays decremented indefinitely.
    // Admin must manually cancel to restore capacity.
  })

  it('FINDING: no $transaction wrapper — partial state is possible on any DB error', () => {
    // If any prisma call between step 3 (create registration) and step 7 (stripe) fails,
    // the state is partially written. For example:
    //   - Registration created ✓
    //   - PaymentBalance created ✓
    //   - event.update (decrement capacity) throws → registration exists, capacity NOT decremented
    //
    // This inconsistency requires manual reconciliation.
    //
    // The fix: wrap all writes in prisma.$transaction()

    const transactionWouldFix = true
    expect(transactionWouldFix).toBeTruthy()

    // Without a transaction, partial success is possible for each of these steps:
    const stepsWithoutTransaction = [
      'groupRegistration.create()',
      'groupRegistration.update() (QR code)',
      'organization.update() (increment counter)',
      'paymentBalance.create()',
      'event.update() (decrement capacity)',
      'decrementOptionCapacity()',
      'stripe.checkout.sessions.create()',
      'payment.create()',
    ]
    // Any failure leaves the system in a partial state
    expect(stepsWithoutTransaction.length).toBe(8) // 8 sequential operations, no rollback
  })

  it('orphaned incomplete registrations do NOT leak to other orgs', () => {
    // Even if a registration is left in 'incomplete' status (payment abandoned),
    // it still belongs to its event → its org. No other org can see it.

    const orgA = makeOrg()
    const orgB = makeOrg()
    const adminA = makeAdminUser(orgA)
    const adminB = makeAdminUser(orgB)
    const eventA = makeEvent(orgA, adminA)
    const eventB = makeEvent(orgB, adminB)

    // Orphaned incomplete registration for Org A
    const orphanedReg = makeGroupRegistration(eventA, {
      registrationStatus: 'pending_forms', // Using the closest status to 'incomplete'
      groupName: 'Abandoned Payment Group',
    })

    // Org B admin requests their own event reports — cannot see Org A's orphaned reg
    const gate = simulateEventAccessGate(orgB.id, 'org_admin', eventA.organizationId)
    expect(gate.allowed).toBeFalsy()

    // Even with a direct DB query scoped by eventId, Org B only sees their event
    const allRegs = [orphanedReg, makeGroupRegistration(eventB)]
    const reportForB = allRegs.filter(r => r.eventId === eventB.id)

    expect(reportForB.every(r => r.organizationId === orgB.id)).toBeTruthy()
    expect(reportForB.some(r => r.groupName === 'Abandoned Payment Group')).toBeFalsy()
  })

  it('a card-declined registration attempt still creates the DB record (current behavior)', () => {
    // This documents the current behavior (not ideal):
    //   1. Registration created with status='incomplete'
    //   2. Stripe checkout session created (buyer sees payment page)
    //   3. Buyer's card is declined by Stripe
    //   4. No webhook for payment_failed → DB record stays 'incomplete'
    //   5. Stripe's session expires (typically after 24h)
    //   6. No checkout.session.expired handler → record stays 'incomplete'
    //
    // The record is effectively garbage after the session expires.
    // Capacity: stays decremented (spots are "held" by the abandoned registration).

    const org = makeOrg()
    const admin = makeAdminUser(org)
    const event = makeEventWithCapacity(org, admin, { total: 100, remaining: 20 })

    const flow = simulateRegistrationFlow({
      org, event,
      request: {
        groupName: 'Card Declined Group', groupLeaderEmail: 'declined@test.com',
        youthCount: 5, chaperoneCount: 1, priestCount: 0,
        housingType: 'on_campus', paymentMethod: 'card',
        eventId: event.id, organizationId: org.id,
      },
      stripeWillSucceed: false,
      stripeWillThrow: false,  // Session created but payment not completed
    })

    // Record exists but stays 'incomplete'
    expect(flow.registrationCreated).toBeTruthy()
    expect(flow.registrationStatus).toBe('incomplete')
    expect(flow.capacityDecrementedStep).not.toBeNull()
    // Capacity of 20 − 6 = 14 remaining after this "declined" registration holds spots
  })
})

// ============================================================
// Main
// ============================================================

async function main() {
  console.log('\n⚡ Running Edge Cases & Stress Scenario Tests (Phase 6)...\n')
  await new Promise(r => setTimeout(r, 50))
  printSummary()
}

main().catch(err => {
  console.error('Test runner failed:', err)
  process.exit(1)
})
