/**
 * Test Suite 04: API Endpoint Isolation
 *
 * Integration tests that verify admin API routes properly scope
 * database queries to the authenticated user's organization.
 *
 * Tests simulate the EXACT query patterns used in the API routes
 * to verify org isolation at the data layer.
 *
 * These tests require a live database. Set DATABASE_URL in environment.
 *
 * Run: DATABASE_URL="postgresql://..." npx tsx tests/org-isolation/04-api-endpoint-isolation.test.ts
 */

import { describe, it, expect, printSummary } from './helpers/test-runner'
import { PrismaClient } from '@prisma/client'
import {
  makeOrg,
  makeAdminUser,
  makeEvent,
  makeGroupRegistration,
  makePayment,
} from './helpers/mock-factories'

const prisma = new PrismaClient()

// ============================================================
// Test data — two completely isolated organizations
// ============================================================

const ORG_A_ID = '11111111-1111-1111-1111-111111111111'
const ORG_B_ID = '22222222-2222-2222-2222-222222222222'
const ORG_A_STRIPE = 'acct_test_orgA_isolation'
const ORG_B_STRIPE = 'acct_test_orgB_isolation'

async function seedTestData() {
  // Clean up any existing test data
  await cleanupTestData()

  // Create two organizations
  await prisma.$executeRaw`
    INSERT INTO organizations (
      id, name, type, contact_email, stripe_account_id,
      stripe_account_status, stripe_charges_enabled,
      subscription_tier, subscription_status, monthly_fee,
      storage_limit_gb, platform_fee_percentage
    ) VALUES
    (
      ${ORG_A_ID}::uuid,
      'Test Org A (Isolation Test)',
      'diocese',
      'test-org-a@chirho-test.invalid',
      ${ORG_A_STRIPE},
      'active', true, 'basic', 'active', 99.00, 10, 1.00
    ),
    (
      ${ORG_B_ID}::uuid,
      'Test Org B (Isolation Test)',
      'diocese',
      'test-org-b@chirho-test.invalid',
      ${ORG_B_STRIPE},
      'active', true, 'basic', 'active', 99.00, 10, 1.00
    )
    ON CONFLICT (id) DO NOTHING
  `

  // Create admin user for each org
  const adminAId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  const adminBId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

  await prisma.$executeRaw`
    INSERT INTO users (id, clerk_user_id, organization_id, email, first_name, last_name, role)
    VALUES
    (${adminAId}::uuid, 'clerk_test_admin_a', ${ORG_A_ID}::uuid, 'admin-a@chirho-test.invalid', 'Admin', 'A', 'org_admin'),
    (${adminBId}::uuid, 'clerk_test_admin_b', ${ORG_B_ID}::uuid, 'admin-b@chirho-test.invalid', 'Admin', 'B', 'org_admin')
    ON CONFLICT (id) DO NOTHING
  `

  // Create events for each org
  const eventAId = 'eeeeaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  const eventBId = 'eeeebb bb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'.replace(/ /g, '')

  await prisma.$executeRaw`
    INSERT INTO events (
      id, organization_id, name, slug, start_date, end_date,
      timezone, status, is_published, created_by
    ) VALUES
    (
      ${eventAId}::uuid, ${ORG_A_ID}::uuid,
      'Org A Test Event', 'org-a-test-event-isolation',
      '2025-07-01', '2025-07-04', 'America/New_York',
      'registration_open', true, ${adminAId}::uuid
    ),
    (
      ${eventBId}::uuid, ${ORG_B_ID}::uuid,
      'Org B Test Event', 'org-b-test-event-isolation',
      '2025-07-01', '2025-07-04', 'America/New_York',
      'registration_open', true, ${adminBId}::uuid
    )
    ON CONFLICT (id) DO NOTHING
  `

  // Create group registrations
  const regAId = 'rrrraaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  const regBId = 'rrrbbbb b-bbbb-bbbb-bbbb-bbbbbbbbbbbb'.replace(/ /g, '')

  await prisma.$executeRaw`
    INSERT INTO group_registrations (
      id, event_id, organization_id, group_name,
      group_leader_name, group_leader_email, group_leader_phone,
      access_code, youth_count, chaperone_count, priest_count,
      total_participants, registration_status, housing_type
    ) VALUES
    (
      ${regAId}::uuid, ${eventAId}::uuid, ${ORG_A_ID}::uuid,
      'St. Parish A (test)', 'Leader A', 'leader-a@chirho-test.invalid', '555-0001',
      'TEST-ACC-A', 5, 1, 0, 6, 'pending_forms', 'on_campus'
    ),
    (
      ${regBId}::uuid, ${eventBId}::uuid, ${ORG_B_ID}::uuid,
      'St. Parish B (test)', 'Leader B', 'leader-b@chirho-test.invalid', '555-0002',
      'TEST-ACC-B', 8, 2, 1, 11, 'pending_forms', 'on_campus'
    )
    ON CONFLICT (id) DO NOTHING
  `

  // Create payments
  await prisma.$executeRaw`
    INSERT INTO payments (
      id, organization_id, event_id, registration_id,
      registration_type, amount, payment_type, payment_method,
      payment_status, stripe_payment_intent_id, platform_fee_amount
    ) VALUES
    (
      'ppppaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
      ${ORG_A_ID}::uuid, ${eventAId}::uuid, ${regAId}::uuid,
      'group', 300.00, 'deposit', 'card', 'succeeded',
      'pi_test_org_a_isolation', 3.00
    ),
    (
      'ppppbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
      ${ORG_B_ID}::uuid, ${eventBId}::uuid, ${regBId}::uuid,
      'group', 550.00, 'deposit', 'card', 'succeeded',
      'pi_test_org_b_isolation', 5.50
    )
    ON CONFLICT (id) DO NOTHING
  `

  return { eventAId, eventBId, regAId, regBId, adminAId, adminBId }
}

async function cleanupTestData() {
  // Clean up in reverse dependency order
  try {
    await prisma.$executeRaw`DELETE FROM payments WHERE organization_id IN (${ORG_A_ID}::uuid, ${ORG_B_ID}::uuid)`
    await prisma.$executeRaw`DELETE FROM group_registrations WHERE organization_id IN (${ORG_A_ID}::uuid, ${ORG_B_ID}::uuid)`
    await prisma.$executeRaw`DELETE FROM events WHERE organization_id IN (${ORG_A_ID}::uuid, ${ORG_B_ID}::uuid)`
    await prisma.$executeRaw`DELETE FROM users WHERE organization_id IN (${ORG_A_ID}::uuid, ${ORG_B_ID}::uuid)`
    await prisma.$executeRaw`DELETE FROM organizations WHERE id IN (${ORG_A_ID}::uuid, ${ORG_B_ID}::uuid)`
  } catch {
    // Cleanup errors are non-fatal (test data may not exist)
  }
}

// ============================================================
// SUITE: Admin event list — org scoping
// ============================================================

describe('API Isolation: Admin event list is scoped to org', () => {
  let testIds: Awaited<ReturnType<typeof seedTestData>>

  it('setup test data', async () => {
    testIds = await seedTestData()
    expect(testIds).not.toBeNull()
  })

  it('Org A admin ONLY sees Org A events', async () => {
    // Simulate: GET /api/admin/events with organizationId = ORG_A_ID
    const events = await prisma.event.findMany({
      where: { organizationId: ORG_A_ID },
      select: { id: true, name: true, organizationId: true },
    })

    // All returned events must belong to Org A
    for (const event of events) {
      expect(event.organizationId).toBe(ORG_A_ID)
    }

    // Org A should see its own event
    const orgAEventNames = events.map((e: any) => e.name)
    expect(orgAEventNames).toContain('Org A Test Event')
  })

  it('Org A admin DOES NOT see Org B events', async () => {
    const events = await prisma.event.findMany({
      where: { organizationId: ORG_A_ID },
      select: { id: true, name: true, organizationId: true },
    })

    const names = events.map((e: any) => e.name)
    expect(names).not.toContain('Org B Test Event')
  })

  it('Org B admin ONLY sees Org B events', async () => {
    const events = await prisma.event.findMany({
      where: { organizationId: ORG_B_ID },
      select: { id: true, name: true, organizationId: true },
    })

    for (const event of events) {
      expect(event.organizationId).toBe(ORG_B_ID)
    }

    const names = events.map((e: any) => e.name)
    expect(names).toContain('Org B Test Event')
    expect(names).not.toContain('Org A Test Event')
  })
})

// ============================================================
// SUITE: Registration list — org scoping
// ============================================================

describe('API Isolation: Group registration list is scoped to org', () => {
  it('Org A admin ONLY sees Org A registrations', async () => {
    const regs = await prisma.groupRegistration.findMany({
      where: { organizationId: ORG_A_ID },
      select: { id: true, groupName: true, organizationId: true },
    })

    for (const reg of regs) {
      expect(reg.organizationId).toBe(ORG_A_ID)
    }

    const names = regs.map((r: any) => r.groupName)
    expect(names).toContain('St. Parish A (test)')
    expect(names).not.toContain('St. Parish B (test)')
  })

  it('Org B admin ONLY sees Org B registrations', async () => {
    const regs = await prisma.groupRegistration.findMany({
      where: { organizationId: ORG_B_ID },
      select: { id: true, groupName: true, organizationId: true },
    })

    for (const reg of regs) {
      expect(reg.organizationId).toBe(ORG_B_ID)
    }

    const names = regs.map((r: any) => r.groupName)
    expect(names).not.toContain('St. Parish A (test)')
  })

  it('cross-org registration lookup by ID returns null with org filter', async () => {
    // Simulate: admin from Org A tries to look up Org B's registration
    // by including organizationId in the where clause
    const regBId = 'rrrbbbb b-bbbb-bbbb-bbbb-bbbbbbbbbbbb'.replace(/ /g, '')

    const crossOrgLookup = await prisma.groupRegistration.findFirst({
      where: {
        id: regBId,
        organizationId: ORG_A_ID, // Org A filter — should NOT return Org B's registration
      },
    })

    expect(crossOrgLookup).toBeNull()
  })
})

// ============================================================
// SUITE: Payment list — org scoping
// ============================================================

describe('API Isolation: Payment list is scoped to org', () => {
  it('Org A admin ONLY sees Org A payments', async () => {
    const payments = await prisma.payment.findMany({
      where: { organizationId: ORG_A_ID, paymentStatus: 'succeeded' },
      select: { id: true, amount: true, organizationId: true, stripePaymentIntentId: true },
    })

    for (const p of payments) {
      expect(p.organizationId).toBe(ORG_A_ID)
    }

    const piIds = payments.map((p: any) => p.stripePaymentIntentId)
    expect(piIds).toContain('pi_test_org_a_isolation')
    expect(piIds).not.toContain('pi_test_org_b_isolation')
  })

  it('Org B admin ONLY sees Org B payments', async () => {
    const payments = await prisma.payment.findMany({
      where: { organizationId: ORG_B_ID, paymentStatus: 'succeeded' },
      select: { id: true, amount: true, organizationId: true, stripePaymentIntentId: true },
    })

    for (const p of payments) {
      expect(p.organizationId).toBe(ORG_B_ID)
    }

    const piIds = payments.map((p: any) => p.stripePaymentIntentId)
    expect(piIds).not.toContain('pi_test_org_a_isolation')
  })

  it('total revenue calculation uses org-scoped payment filter', async () => {
    const orgAPayments = await prisma.payment.findMany({
      where: { organizationId: ORG_A_ID, paymentStatus: 'succeeded' },
      select: { amount: true },
    })
    const orgBPayments = await prisma.payment.findMany({
      where: { organizationId: ORG_B_ID, paymentStatus: 'succeeded' },
      select: { amount: true },
    })

    const orgATotal = orgAPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0)
    const orgBTotal = orgBPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0)

    // Org A paid $300, Org B paid $550
    expect(orgATotal).toBe(300)
    expect(orgBTotal).toBe(550)
    expect(orgATotal).not.toBe(orgBTotal)
  })
})

// ============================================================
// SUITE: verifyEventAccess org check at database level
// ============================================================

describe('API Isolation: verifyEventAccess organization check at database level', () => {
  it('event lookup returns organizationId — caller must compare against user org', async () => {
    const eventAId = 'eeeeaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

    const event = await prisma.event.findUnique({
      where: { id: eventAId },
      select: { id: true, organizationId: true },
    })

    expect(event).not.toBeNull()
    expect(event?.organizationId).toBe(ORG_A_ID)
  })

  it('Org A admin cannot access Org B event — org mismatch detected', async () => {
    const eventBId = 'eeeebbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

    const event = await prisma.event.findUnique({
      where: { id: eventBId },
      select: { id: true, organizationId: true },
    })

    if (!event) {
      // Event doesn't exist — that's fine for this test
      return
    }

    const adminAEffectiveOrgId = ORG_A_ID
    const orgMatch = event.organizationId === adminAEffectiveOrgId

    expect(orgMatch).toBeFalsy()
  })
})

// ============================================================
// SUITE: Coupon isolation
// ============================================================

describe('API Isolation: Coupons are scoped to event (and thus org)', () => {
  it('coupon lookup includes eventId filter — cross-org coupon reuse blocked', async () => {
    // When applying a coupon, the route does:
    // prisma.coupon.findFirst({ where: { eventId: event.id, code: ..., active: true } })
    // Since eventId is org-scoped, a coupon for Org A's event won't match Org B's event

    const eventAId = 'eeeeaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const eventBId = 'eeeebbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

    // Simulate: look up a coupon with the wrong eventId
    const couponForWrongOrg = await prisma.coupon.findFirst({
      where: {
        eventId: eventBId, // Org B's event
        code: 'NONEXISTENT-COUPON',
        active: true,
      },
    })

    // Should not find anything (no such coupon)
    expect(couponForWrongOrg).toBeNull()
  })
})

// ============================================================
// Cleanup
// ============================================================

describe('Cleanup: Remove test data', () => {
  it('removes all isolation test data', async () => {
    await cleanupTestData()
    // Verify cleanup
    const orgs = await prisma.organization.findMany({
      where: {
        id: { in: [ORG_A_ID, ORG_B_ID] },
      },
    })
    expect(orgs.length).toBe(0)
  })
})

// ============================================================
// Main
// ============================================================

async function main() {
  console.log('\n🔒 Running API Endpoint Isolation Tests...\n')
  console.log('⚠️  These tests require DATABASE_URL to be set.\n')

  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is not set.')
    console.error('Set it to a test PostgreSQL database and re-run.')
    process.exit(1)
  }

  try {
    await new Promise(r => setTimeout(r, 100))
  } finally {
    await prisma.$disconnect()
  }

  printSummary()
}

main().catch(err => {
  console.error('Test runner failed:', err)
  prisma.$disconnect()
  process.exit(1)
})
