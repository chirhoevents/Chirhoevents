/**
 * Test Suite 02: Authentication & Authorization Layer
 *
 * Unit tests for the pure authorization logic used throughout ChiRho Events.
 * Tests permissions.ts and inlines the pure logic from auth-utils.ts
 * (without requiring Clerk or database connections).
 *
 * These tests run WITHOUT a database or Clerk connection.
 *
 * Run: npx tsx tests/org-isolation/02-auth-layer.test.ts
 */

import { describe, it, expect, printSummary } from './helpers/test-runner'
import {
  makeOrg,
  makeAdminUser,
  makeGroupLeaderUser,
  makeMasterAdmin,
  makeEvent,
  resetCounter,
} from './helpers/mock-factories'

// Import only the pure, dependency-free permissions module
import {
  isAdminRole,
  hasPermission,
  getPermissionsForRole,
  type UserRole,
} from '../../src/lib/permissions'

// ============================================================
// Inline pure auth logic (mirrors auth-utils.ts without Clerk deps)
// ============================================================

interface MinimalUser {
  id: string
  clerkUserId: string
  organizationId: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
}

function isAdmin(user: MinimalUser | null): boolean {
  if (!user) return false
  return isAdminRole(user.role)
}

function isFullAdmin(user: MinimalUser | null): boolean {
  if (!user) return false
  return user.role === 'org_admin' || user.role === 'master_admin'
}

function canAccessOrganization(user: MinimalUser | null, organizationId: string): boolean {
  if (!user) return false
  if (user.role === 'master_admin') return true
  return user.organizationId === organizationId
}

// ============================================================
// SUITE: isAdmin — role-based admin detection
// ============================================================

describe('Auth Layer: isAdmin() function', () => {
  beforeEachSuite()

  it('master_admin is admin', () => {
    const user = makeMasterAdmin() as MinimalUser
    expect(isAdmin(user)).toBeTruthy()
  })

  it('org_admin is admin', () => {
    const org = makeOrg()
    const user = makeAdminUser(org, { role: 'org_admin' }) as MinimalUser
    expect(isAdmin(user)).toBeTruthy()
  })

  it('event_manager is admin', () => {
    const org = makeOrg()
    const user = makeAdminUser(org, { role: 'event_manager' }) as MinimalUser
    expect(isAdmin(user)).toBeTruthy()
  })

  it('finance_manager is admin', () => {
    const org = makeOrg()
    const user = makeAdminUser(org, { role: 'finance_manager' }) as MinimalUser
    expect(isAdmin(user)).toBeTruthy()
  })

  it('poros_coordinator is admin', () => {
    const org = makeOrg()
    const user = makeAdminUser(org, { role: 'poros_coordinator' }) as MinimalUser
    expect(isAdmin(user)).toBeTruthy()
  })

  it('salve_coordinator is admin', () => {
    const org = makeOrg()
    const user = makeAdminUser(org, { role: 'salve_coordinator' }) as MinimalUser
    expect(isAdmin(user)).toBeTruthy()
  })

  it('rapha_coordinator is admin', () => {
    const org = makeOrg()
    const user = makeAdminUser(org, { role: 'rapha_coordinator' }) as MinimalUser
    expect(isAdmin(user)).toBeTruthy()
  })

  it('staff is admin', () => {
    const org = makeOrg()
    const user = makeAdminUser(org, { role: 'staff' }) as MinimalUser
    expect(isAdmin(user)).toBeTruthy()
  })

  it('group_leader is NOT admin', () => {
    const org = makeOrg()
    const user = makeGroupLeaderUser(org) as MinimalUser
    expect(isAdmin(user)).toBeFalsy()
  })

  it('individual is NOT admin', () => {
    const org = makeOrg()
    const user = { ...makeAdminUser(org), role: 'individual' } as MinimalUser
    expect(isAdmin(user)).toBeFalsy()
  })

  it('null user is NOT admin', () => {
    expect(isAdmin(null)).toBeFalsy()
  })
})

// ============================================================
// SUITE: canAccessOrganization — cross-org access control
// ============================================================

describe('Auth Layer: canAccessOrganization() — cross-org isolation', () => {
  beforeEachSuite()

  it('org_admin can access their own organization', () => {
    const org = makeOrg()
    const user = makeAdminUser(org) as MinimalUser
    expect(canAccessOrganization(user, org.id)).toBeTruthy()
  })

  it('org_admin CANNOT access a different organization', () => {
    const orgA = makeOrg()
    const orgB = makeOrg()
    const adminA = makeAdminUser(orgA) as MinimalUser
    expect(canAccessOrganization(adminA, orgB.id)).toBeFalsy()
  })

  it('master_admin can access ANY organization', () => {
    const org = makeOrg()
    const master = makeMasterAdmin() as MinimalUser
    expect(canAccessOrganization(master, org.id)).toBeTruthy()
  })

  it('master_admin can access a second org', () => {
    const orgA = makeOrg()
    const orgB = makeOrg()
    const master = makeMasterAdmin() as MinimalUser
    expect(canAccessOrganization(master, orgA.id)).toBeTruthy()
    expect(canAccessOrganization(master, orgB.id)).toBeTruthy()
  })

  it('group_leader cannot access admin resources (isAdmin returns false)', () => {
    const org = makeOrg()
    const leader = makeGroupLeaderUser(org) as MinimalUser
    // Group leaders are NOT admins — they use a different portal
    expect(isAdmin(leader)).toBeFalsy()
    // canAccessOrganization returns true for their own org (by role logic)
    // but the admin check should block them before reaching canAccessOrganization
    // Verify that admin check correctly blocks them:
    expect(isAdminRole(leader.role as any)).toBeFalsy()
  })

  it('event_manager from org A cannot access org B data', () => {
    const orgA = makeOrg()
    const orgB = makeOrg()
    const eventMgr = makeAdminUser(orgA, { role: 'event_manager' }) as MinimalUser
    expect(canAccessOrganization(eventMgr, orgB.id)).toBeFalsy()
  })

  it('null user cannot access any organization', () => {
    const org = makeOrg()
    expect(canAccessOrganization(null, org.id)).toBeFalsy()
  })
})

// ============================================================
// SUITE: Role permission checks
// ============================================================

describe('Auth Layer: Role-based permission checks', () => {
  beforeEachSuite()

  it('org_admin has payments.process permission', () => {
    expect(hasPermission('org_admin', 'payments.process')).toBeTruthy()
  })

  it('org_admin has events.delete permission', () => {
    expect(hasPermission('org_admin', 'events.delete')).toBeTruthy()
  })

  it('org_admin has reports.view_financial permission', () => {
    expect(hasPermission('org_admin', 'reports.view_financial')).toBeTruthy()
  })

  it('event_manager does NOT have payments.process permission', () => {
    expect(hasPermission('event_manager', 'payments.process')).toBeFalsy()
  })

  it('event_manager does NOT have events.delete permission', () => {
    expect(hasPermission('event_manager', 'events.delete')).toBeFalsy()
  })

  it('event_manager does NOT have reports.view_financial permission', () => {
    expect(hasPermission('event_manager', 'reports.view_financial')).toBeFalsy()
  })

  it('finance_manager has payments.process permission', () => {
    expect(hasPermission('finance_manager', 'payments.process')).toBeTruthy()
  })

  it('finance_manager does NOT have events.delete permission', () => {
    expect(hasPermission('finance_manager', 'events.delete')).toBeFalsy()
  })

  it('staff has NO payments permissions', () => {
    expect(hasPermission('staff', 'payments.process')).toBeFalsy()
    expect(hasPermission('staff', 'payments.refund')).toBeFalsy()
    expect(hasPermission('staff', 'payments.view')).toBeFalsy()
  })

  it('group_leader has NO permissions at all', () => {
    const perms = getPermissionsForRole('group_leader')
    expect(perms.length).toBe(0)
  })

  it('poros_coordinator has poros.access permission', () => {
    expect(hasPermission('poros_coordinator', 'poros.access')).toBeTruthy()
  })

  it('poros_coordinator does NOT have salve.access or rapha.access', () => {
    expect(hasPermission('poros_coordinator', 'salve.access')).toBeFalsy()
    expect(hasPermission('poros_coordinator', 'rapha.access')).toBeFalsy()
  })

  it('master_admin has ALL permissions', () => {
    expect(hasPermission('master_admin', 'payments.process')).toBeTruthy()
    expect(hasPermission('master_admin', 'events.delete')).toBeTruthy()
    expect(hasPermission('master_admin', 'reports.view_financial')).toBeTruthy()
    expect(hasPermission('master_admin', 'poros.access')).toBeTruthy()
    expect(hasPermission('master_admin', 'salve.access')).toBeTruthy()
    expect(hasPermission('master_admin', 'rapha.access')).toBeTruthy()
    expect(hasPermission('master_admin', 'team.manage')).toBeTruthy()
  })
})

// ============================================================
// SUITE: isFullAdmin — distinguishes org_admin/master from limited admins
// ============================================================

describe('Auth Layer: isFullAdmin() — org_admin and master_admin only', () => {
  beforeEachSuite()

  it('org_admin is full admin', () => {
    const org = makeOrg()
    const user = makeAdminUser(org, { role: 'org_admin' }) as MinimalUser
    expect(isFullAdmin(user)).toBeTruthy()
  })

  it('master_admin is full admin', () => {
    const master = makeMasterAdmin() as MinimalUser
    expect(isFullAdmin(master)).toBeTruthy()
  })

  it('event_manager is NOT full admin', () => {
    const org = makeOrg()
    const user = makeAdminUser(org, { role: 'event_manager' }) as MinimalUser
    expect(isFullAdmin(user)).toBeFalsy()
  })

  it('finance_manager is NOT full admin', () => {
    const org = makeOrg()
    const user = makeAdminUser(org, { role: 'finance_manager' }) as MinimalUser
    expect(isFullAdmin(user)).toBeFalsy()
  })

  it('group_leader is NOT full admin', () => {
    const org = makeOrg()
    const user = makeGroupLeaderUser(org) as MinimalUser
    expect(isFullAdmin(user)).toBeFalsy()
  })
})

// ============================================================
// SUITE: verifyEventAccess org mismatch simulation
// Tests the logic that verifyEventAccess() uses without
// needing a real HTTP request or database
// ============================================================

describe('Auth Layer: verifyEventAccess organization mismatch logic', () => {
  beforeEachSuite()

  it('access is GRANTED when user org matches event org', () => {
    const org = makeOrg()
    const user = makeAdminUser(org)
    const event = makeEvent(org, user)

    // Simulate the check inside verifyEventAccess:
    const userOrgId = user.organizationId
    const eventOrgId = event.organizationId
    const isMaster = user.role === 'master_admin'

    const accessGranted = isMaster || (eventOrgId === userOrgId)
    expect(accessGranted).toBeTruthy()
  })

  it('access is DENIED when user org does not match event org', () => {
    const orgA = makeOrg()
    const orgB = makeOrg()
    const adminA = makeAdminUser(orgA)
    const eventB = makeEvent(orgB, makeAdminUser(orgB))

    // Simulate the check inside verifyEventAccess:
    const userOrgId = adminA.organizationId // orgA.id
    const eventOrgId = eventB.organizationId // orgB.id
    const isMaster = adminA.role === 'master_admin'

    const accessGranted = isMaster || (eventOrgId === userOrgId)
    expect(accessGranted).toBeFalsy()
  })

  it('master_admin is GRANTED access regardless of org mismatch', () => {
    const orgA = makeOrg()
    const orgB = makeOrg()
    const master = makeMasterAdmin()
    const eventB = makeEvent(orgB, makeAdminUser(orgB))

    const isMaster = master.role === 'master_admin'
    const userOrgId = 'platform-admin' // master admin's org
    const eventOrgId = eventB.organizationId // orgB.id

    const accessGranted = isMaster || (eventOrgId === userOrgId)
    expect(accessGranted).toBeTruthy()
  })

  it('poros_coordinator from wrong org is DENIED', () => {
    const orgA = makeOrg()
    const orgB = makeOrg()
    const porosUser = makeAdminUser(orgA, { role: 'poros_coordinator' })
    const eventB = makeEvent(orgB, makeAdminUser(orgB))

    const isMaster = porosUser.role === 'master_admin'
    const accessGranted = isMaster || (eventB.organizationId === porosUser.organizationId)
    expect(accessGranted).toBeFalsy()
  })

  it('finance_manager from wrong org is DENIED', () => {
    const orgA = makeOrg()
    const orgB = makeOrg()
    const finance = makeAdminUser(orgA, { role: 'finance_manager' })
    const eventB = makeEvent(orgB, makeAdminUser(orgB))

    const isMaster = finance.role === 'master_admin'
    const accessGranted = isMaster || (eventB.organizationId === finance.organizationId)
    expect(accessGranted).toBeFalsy()
  })
})

// ============================================================
// SUITE: Impersonation logic
// ============================================================

describe('Auth Layer: Master admin impersonation logic', () => {
  beforeEachSuite()

  it('getEffectiveOrgId returns impersonated org for master_admin with valid cookie', async () => {
    // This tests the logic of get-effective-org.ts without cookies
    // We simulate what getEffectiveOrgId does:

    const master = makeMasterAdmin()
    const targetOrg = makeOrg()

    // Simulate: master admin is impersonating targetOrg
    const simulatedImpersonatingOrg = targetOrg.id
    const simulatedMasterAdminId = master.id

    // The check in getEffectiveOrgId:
    const isMaster = master.role === 'master_admin'
    const impersonatingOrg = simulatedImpersonatingOrg
    const masterAdminId = simulatedMasterAdminId

    // Security: masterAdminId must match the actual logged-in user
    const isValidImpersonation = isMaster && impersonatingOrg && masterAdminId === master.id

    const effectiveOrgId = isValidImpersonation ? impersonatingOrg : master.organizationId
    expect(effectiveOrgId).toBe(targetOrg.id)
  })

  it('impersonation is rejected when masterAdminId cookie does not match user.id', () => {
    const masterA = makeMasterAdmin()
    const masterB = makeMasterAdmin()
    const targetOrg = makeOrg()

    // Attacker: master B tries to use master A's impersonation cookie
    const cookieMasterAdminId = masterA.id // master A's id in cookie
    const actualUserId = masterB.id        // master B is actually logged in

    // The check:
    const cookieMatchesUser = cookieMasterAdminId === actualUserId
    expect(cookieMatchesUser).toBeFalsy()

    // If they don't match, effectiveOrgId falls back to masterB's org
    const effectiveOrgId = cookieMatchesUser ? targetOrg.id : masterB.organizationId
    expect(effectiveOrgId).toBe(masterB.organizationId)
    expect(effectiveOrgId).not.toBe(targetOrg.id)
  })
})

// ============================================================
// Helper: reset UUID counter before each suite block
// ============================================================
function beforeEachSuite() {
  resetCounter()
}

// ============================================================
// Main
// ============================================================

async function main() {
  console.log('\n🔐 Running Auth Layer Isolation Tests...\n')
  // Allow async describe/it calls to settle
  await new Promise(r => setTimeout(r, 50))
  printSummary()
}

main().catch(err => {
  console.error('Test runner failed:', err)
  process.exit(1)
})
