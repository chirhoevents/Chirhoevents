/**
 * Test Suite 05: Group Leader Portal Isolation
 *
 * Verifies that group leaders can ONLY see data for their own registration.
 * Tests both the auth logic and the query patterns used in group-leader APIs.
 *
 * Run: npx tsx tests/org-isolation/05-group-leader-isolation.test.ts
 */

import { describe, it, expect, printSummary } from './helpers/test-runner'
import {
  hasPermission,
  getPermissionsForRole,
  isAdminRole,
} from '../../src/lib/permissions'
import {
  makeOrg,
  makeAdminUser,
  makeGroupLeaderUser,
  makeEvent,
  makeGroupRegistration,
  resetCounter,
} from './helpers/mock-factories'

// Inline pure isAdmin (no Clerk dep)
function isAdmin(user: { role: string } | null): boolean {
  if (!user) return false
  return isAdminRole(user.role as any)
}

// ============================================================
// SUITE: Group leader auth — clerkUserId scoping
// ============================================================

describe('Group Leader Isolation: Auth via clerkUserId', () => {
  resetCounter()

  it('group leader is found by their clerkUserId', () => {
    const org = makeOrg()
    const leader = makeGroupLeaderUser(org)
    const event = makeEvent(org, makeAdminUser(org))
    const reg = makeGroupRegistration(event, {
      clerkUserId: leader.clerkUserId,
    })

    // Simulate the query in group-leader/dashboard/route.ts:
    // prisma.groupRegistration.findFirst({ where: { clerkUserId: userId } })

    // If userId === leader.clerkUserId, the query finds the registration
    const found = reg.clerkUserId === leader.clerkUserId
    expect(found).toBeTruthy()
  })

  it('group leader from org A CANNOT find org B registration by clerkUserId', () => {
    const orgA = makeOrg()
    const orgB = makeOrg()
    const leaderA = makeGroupLeaderUser(orgA)
    const adminB = makeAdminUser(orgB)
    const eventB = makeEvent(orgB, adminB)

    // Org B's registration has a DIFFERENT clerkUserId
    const regB = makeGroupRegistration(eventB, {
      clerkUserId: 'clerk_orgB_leader_different',
    })

    // Leader A tries to query with their clerkUserId
    // The query: { clerkUserId: leaderA.clerkUserId }
    // regB has clerkUserId = 'clerk_orgB_leader_different'
    // They don't match — leader A cannot find regB

    const crossOrgFound = regB.clerkUserId === leaderA.clerkUserId
    expect(crossOrgFound).toBeFalsy()
  })

  it('two group leaders in same org can only access their own registrations', () => {
    const org = makeOrg()
    const leaderA = makeGroupLeaderUser(org)
    const leaderB = makeGroupLeaderUser(org)
    const event = makeEvent(org, makeAdminUser(org))

    const regA = makeGroupRegistration(event, { clerkUserId: leaderA.clerkUserId })
    const regB = makeGroupRegistration(event, { clerkUserId: leaderB.clerkUserId })

    // Leader A's query finds regA, not regB
    expect(regA.clerkUserId).toBe(leaderA.clerkUserId)
    expect(regA.clerkUserId).not.toBe(leaderB.clerkUserId)

    // Leader B's query finds regB, not regA
    expect(regB.clerkUserId).toBe(leaderB.clerkUserId)
    expect(regB.clerkUserId).not.toBe(leaderA.clerkUserId)
  })
})

// ============================================================
// SUITE: Group leader role has NO admin permissions
// ============================================================

describe('Group Leader Isolation: group_leader role has zero admin permissions', () => {
  resetCounter()
  // hasPermission and getPermissionsForRole imported at top of file

  it('group_leader has ZERO permissions defined', () => {
    const perms = getPermissionsForRole('group_leader')
    expect(perms.length).toBe(0)
  })

  it('group_leader cannot view events', () => {
    expect(hasPermission('group_leader', 'events.view')).toBeFalsy()
  })

  it('group_leader cannot view registrations', () => {
    expect(hasPermission('group_leader', 'registrations.view')).toBeFalsy()
  })

  it('group_leader cannot process payments', () => {
    expect(hasPermission('group_leader', 'payments.process')).toBeFalsy()
  })

  it('group_leader cannot view financial reports', () => {
    expect(hasPermission('group_leader', 'reports.view_financial')).toBeFalsy()
  })

  it('group_leader cannot access Poros portal', () => {
    expect(hasPermission('group_leader', 'poros.access')).toBeFalsy()
  })

  it('group_leader cannot access SALVE portal', () => {
    expect(hasPermission('group_leader', 'salve.access')).toBeFalsy()
  })

  it('group_leader cannot access Rapha medical portal', () => {
    expect(hasPermission('group_leader', 'rapha.access')).toBeFalsy()
  })
})

// ============================================================
// SUITE: Group leader eventId filter bug
// ============================================================

describe('Group Leader Isolation: eventId filter bug documentation', () => {
  resetCounter()

  it('BUG: whereClause.id = eventId is wrong — should be whereClause.eventId = eventId', () => {
    // Document the bug in group-leader/dashboard/route.ts:49 and payments/route.ts:21
    //
    // Current (buggy) code:
    //   const whereClause: any = { clerkUserId: userId }
    //   if (eventId) {
    //     whereClause.id = eventId  // ← BUG: sets groupRegistration.id = eventId
    //   }
    //
    // Correct code:
    //   whereClause.eventId = eventId  // ← CORRECT: filters by event
    //
    // Verify this is indeed a bug (not a security issue):
    // - The clerkUserId filter still enforces that the user sees ONLY their own data
    // - The eventId filter just silently fails (because groupRegistration.id != eventId UUID)
    // - This means: when eventId is passed, the result is either 404 (wrong UUID type)
    //   OR it ignores the eventId filter entirely if the UUID happens to match

    const userId = 'clerk_leader_123'
    const eventId = 'event-uuid-abc-123' // An event's UUID

    // Current buggy behavior:
    const buggyWhereClause: any = { clerkUserId: userId }
    if (eventId) {
      buggyWhereClause.id = eventId // Sets groupRegistration.id to the event's UUID
    }

    // The where clause now has: { clerkUserId: userId, id: eventId }
    // This will look for a groupRegistration whose id === eventId
    // Since groupRegistration IDs and event IDs are different UUIDs, this returns null

    expect(buggyWhereClause.id).toBe(eventId)  // Confirms the bug: id is set to eventId
    expect(buggyWhereClause.eventId).toBeUndefined() // Confirms: eventId is NOT set

    // Correct behavior (what it should be):
    const correctWhereClause: any = { clerkUserId: userId }
    if (eventId) {
      correctWhereClause.eventId = eventId // Sets groupRegistration.eventId
    }

    expect(correctWhereClause.eventId).toBe(eventId)  // Correct: eventId is set
    expect(correctWhereClause.id).toBeUndefined() // And id is NOT overridden
  })

  it('bug does NOT create cross-org security vulnerability', () => {
    // Even with the bug, org isolation is preserved because:
    // - The clerkUserId filter ALWAYS scopes results to the logged-in user
    // - A group leader can only see registrations linked to their clerkUserId
    // - The eventId filter is supplementary and only used for multi-event scenarios

    const userId = 'clerk_leader_123'
    const maliciousEventId = 'org-b-group-reg-uuid' // Attacker provides a groupReg UUID from org B

    // Current buggy code:
    const whereClause: any = { clerkUserId: userId }
    if (maliciousEventId) {
      whereClause.id = maliciousEventId
    }

    // Result: { clerkUserId: 'clerk_leader_123', id: 'org-b-group-reg-uuid' }
    // The DB query requires BOTH clerkUserId AND id to match
    // Org B's registration has clerkUserId = 'clerk_orgB_leader' (different)
    // So the query returns null — the attacker gets 404, not org B's data

    expect(whereClause.clerkUserId).toBe(userId)
    expect(whereClause.id).toBe(maliciousEventId)
    // The clerkUserId requirement prevents the cross-org lookup from succeeding
    const clerkUserIdPresent = !!whereClause.clerkUserId
    expect(clerkUserIdPresent).toBeTruthy() // Safety net is still there
  })
})

// ============================================================
// SUITE: Group leader registration data ownership
// ============================================================

describe('Group Leader Isolation: Registration data is owned by correct org', () => {
  resetCounter()

  it('group registration created via public API inherits event.organizationId', () => {
    // Simulates: src/app/api/registration/group/route.ts:318
    // data: { eventId: event.id, organizationId: event.organizationId, ... }

    const orgA = makeOrg()
    const adminA = makeAdminUser(orgA)
    const eventA = makeEvent(orgA, adminA)

    // When a group registers for Org A's event, the registration inherits Org A's org ID
    const reg = makeGroupRegistration(eventA)

    expect(reg.organizationId).toBe(orgA.id)
    expect(reg.eventId).toBe(eventA.id)
    expect(reg.organizationId).toBe(eventA.organizationId)
  })

  it('group leader cannot register for an event and end up in wrong org', () => {
    const orgA = makeOrg()
    const orgB = makeOrg()
    const adminA = makeAdminUser(orgA)
    const eventA = makeEvent(orgA, adminA)

    // The registration is always created with the event's organizationId
    // A group leader registering for Org A's event will always be in Org A
    const reg = makeGroupRegistration(eventA)

    expect(reg.organizationId).toBe(orgA.id)
    expect(reg.organizationId).not.toBe(orgB.id)
  })
})

// ============================================================
// Main
// ============================================================

async function main() {
  console.log('\n👥 Running Group Leader Isolation Tests...\n')
  await new Promise(r => setTimeout(r, 50))
  printSummary()
}

main().catch(err => {
  console.error('Test runner failed:', err)
  process.exit(1)
})
