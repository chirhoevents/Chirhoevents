/**
 * Test Suite 01: Data Model — Organization Isolation
 *
 * Verifies that every critical table has `organizationId` (or a provable FK chain
 * back to the organization) by introspecting the Prisma schema at runtime.
 *
 * Run: npx tsx tests/org-isolation/01-data-model.test.ts
 */

import { describe, it, expect, printSummary } from './helpers/test-runner'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ============================================================
// Tables that MUST have a direct organizationId column
// ============================================================
const TABLES_REQUIRING_DIRECT_ORG_ID = [
  'events',
  'group_registrations',
  'individual_registrations',
  'participants',
  'payments',
  'payment_balances',
  'liability_forms',
  'safe_environment_certificates',
  'liability_form_templates',
  'vendor_registrations',
  'staff_registrations',
  'coupons',
  'day_pass_options',
  'email_logs',
  'support_tickets',
  'invoices',
  'billing_notes',
]

// Tables with only an eventId (indirect isolation via event.organization_id)
// These are acceptable — they inherit isolation through the event
const TABLES_WITH_INDIRECT_ORG_ISOLATION_VIA_EVENT = [
  'buildings',
  'seating_sections',
  'waitlist_entries',
  'poros_staff',
]

// Tables with NO org or event isolation (audit/ancillary) — flagged as risks
const TABLES_WITHOUT_ORG_ISOLATION = [
  'registration_edits',
  'refunds',
]

async function getColumnNames(tableName: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = ${tableName}
      AND table_schema = 'public'
    ORDER BY ordinal_position
  `
  return rows.map((r: { column_name: string }) => r.column_name)
}

async function tableExists(tableName: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_name = ${tableName}
        AND table_schema = 'public'
    ) AS exists
  `
  return rows[0]?.exists ?? false
}

// ============================================================
// SUITE: Direct organizationId presence
// ============================================================

describe('Data Model: Direct organizationId on critical tables', () => {
  for (const table of TABLES_REQUIRING_DIRECT_ORG_ID) {
    it(`${table} has organization_id column`, async () => {
      const exists = await tableExists(table)
      expect(exists).toBeTruthy()

      const columns = await getColumnNames(table)
      expect(columns).toContain('organization_id')
    })
  }
})

// ============================================================
// SUITE: Indirect isolation via eventId
// ============================================================

describe('Data Model: Tables with eventId-based indirect isolation', () => {
  for (const table of TABLES_WITH_INDIRECT_ORG_ISOLATION_VIA_EVENT) {
    it(`${table} has event_id column (and events has organization_id)`, async () => {
      const exists = await tableExists(table)
      expect(exists).toBeTruthy()

      const columns = await getColumnNames(table)
      expect(columns).toContain('event_id')

      // Verify events table has organization_id (the anchor)
      const eventColumns = await getColumnNames('events')
      expect(eventColumns).toContain('organization_id')
    })
  }
})

// ============================================================
// SUITE: Document tables lacking direct org isolation
// These tests PASS (documenting current state) but are
// labeled as "isolation gaps" for engineering attention.
// ============================================================

describe('Data Model: Tables WITHOUT direct org isolation (known gaps)', () => {
  it('registration_edits lacks organization_id (KNOWN GAP — medium risk)', async () => {
    const columns = await getColumnNames('registration_edits')
    // This confirms the gap exists — the test "passes" by documenting reality
    const hasOrgId = columns.includes('organization_id')
    if (hasOrgId) {
      // Gap has been fixed — great!
      console.log('    ✓ registration_edits now has organization_id (gap fixed!)')
    } else {
      console.log('    ⚠ registration_edits does NOT have organization_id (gap exists)')
      // Test passes but logs warning — not a hard failure since this is documented
    }
    expect(columns).toContain('registration_id') // must have the FK
  })

  it('refunds lacks organization_id (KNOWN GAP — medium risk)', async () => {
    const columns = await getColumnNames('refunds')
    const hasOrgId = columns.includes('organization_id')
    if (hasOrgId) {
      console.log('    ✓ refunds now has organization_id (gap fixed!)')
    } else {
      console.log('    ⚠ refunds does NOT have organization_id (gap exists)')
    }
    expect(columns).toContain('registration_id') // must have the FK
  })
})

// ============================================================
// SUITE: Organization stripe fields
// ============================================================

describe('Data Model: Organization Stripe payment configuration fields', () => {
  it('organizations table has stripe_account_id', async () => {
    const columns = await getColumnNames('organizations')
    expect(columns).toContain('stripe_account_id')
  })

  it('organizations table has stripe_account_status', async () => {
    const columns = await getColumnNames('organizations')
    expect(columns).toContain('stripe_account_status')
  })

  it('organizations table has stripe_charges_enabled', async () => {
    const columns = await getColumnNames('organizations')
    expect(columns).toContain('stripe_charges_enabled')
  })

  it('organizations table has platform_fee_percentage', async () => {
    const columns = await getColumnNames('organizations')
    expect(columns).toContain('platform_fee_percentage')
  })

  it('payments table has stripe_payment_intent_id', async () => {
    const columns = await getColumnNames('payments')
    expect(columns).toContain('stripe_payment_intent_id')
  })

  it('payments table has platform_fee_amount', async () => {
    const columns = await getColumnNames('payments')
    expect(columns).toContain('platform_fee_amount')
  })
})

// ============================================================
// SUITE: Index coverage for org isolation
// ============================================================

describe('Data Model: Indexes on organization_id for performance & isolation', () => {
  const EXPECTED_ORG_INDEXES = [
    { table: 'events', index: 'idx_event_org' },
    { table: 'group_registrations', index: 'idx_group_org' },
    { table: 'payments', index: 'idx_payment_registration' },
    { table: 'users', index: 'idx_user_org' },
  ]

  for (const { table, index } of EXPECTED_ORG_INDEXES) {
    it(`${table} has index ${index}`, async () => {
      const rows = await prisma.$queryRaw<Array<{ indexname: string }>>`
        SELECT indexname FROM pg_indexes
        WHERE tablename = ${table}
          AND schemaname = 'public'
          AND indexname = ${index}
      `
      expect(rows.length).toBeGreaterThan(0)
    })
  }
})

// ============================================================
// Cleanup & summary
// ============================================================

async function main() {
  console.log('\n🔍 Running Data Model Isolation Tests...\n')
  try {
    // Wait for all async tests to settle
    await new Promise(r => setTimeout(r, 100))
  } finally {
    await prisma.$disconnect()
  }
  printSummary()
}

main().catch(err => {
  console.error('Test runner failed:', err)
  process.exit(1)
})
