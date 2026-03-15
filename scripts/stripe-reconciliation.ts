/**
 * Stripe Reconciliation Script
 *
 * Usage:
 *   npx tsx scripts/stripe-reconciliation.ts --dry-run          # Mock data demo
 *   npx tsx scripts/stripe-reconciliation.ts --orgId <uuid>     # Single org
 *   npx tsx scripts/stripe-reconciliation.ts --all              # All orgs
 *
 * Exit code 0 = no discrepancies, exit code 1 = discrepancies found.
 */

import Stripe from 'stripe'
import { PrismaClient } from '@prisma/client'

// ─── Types ────────────────────────────────────────────────────────────────────

type DiscrepancyType =
  | 'MISSING_IN_STRIPE'    // DB says succeeded, Stripe has no matching charge
  | 'MISSING_IN_DB'        // Stripe has a charge, DB has no payment record
  | 'STATUS_MISMATCH'      // Stripe status ≠ DB status
  | 'AMOUNT_MISMATCH'      // Dollar amounts differ by > $0.01
  | 'WRONG_STRIPE_ACCOUNT' // Payment metadata says Org A but landed on Org B account
  | 'DOUBLE_COUNTED'       // Same Stripe payment intent ID in multiple DB records

interface Discrepancy {
  type: DiscrepancyType
  paymentId?: string
  stripeIntentId?: string
  expectedAmount?: number
  actualAmount?: number
  detail: string
}

interface OrgResult {
  orgId: string
  orgName: string
  stripeAccountId: string
  totalDbPayments: number
  totalStripeCharges: number
  discrepancies: Discrepancy[]
}

// ─── DB payment shape ─────────────────────────────────────────────────────────

interface DbPayment {
  id: string
  organizationId: string
  stripePaymentIntentId: string | null
  amount: number        // in dollars
  paymentStatus: string
}

// ─── Dry-run mock data ────────────────────────────────────────────────────────

function buildMockData(): Array<{
  org: { id: string; name: string; stripeAccountId: string }
  dbPayments: DbPayment[]
  stripeCharges: Array<{ id: string; payment_intent: string | null; amount: number; status: string; metadata: Record<string, string> }>
}> {
  return [
    {
      org: { id: 'org-aaa-111', name: 'St. Michael Parish', stripeAccountId: 'acct_mock_orgA' },
      dbPayments: [
        // Normal: both sides agree
        { id: 'pay-001', organizationId: 'org-aaa-111', stripePaymentIntentId: 'pi_normal_001', amount: 150.00, paymentStatus: 'succeeded' },
        // MISSING_IN_STRIPE: DB says succeeded, Stripe has nothing
        { id: 'pay-002', organizationId: 'org-aaa-111', stripePaymentIntentId: 'pi_ghost_002', amount: 75.00, paymentStatus: 'succeeded' },
        // STATUS_MISMATCH: Stripe says succeeded, DB says pending
        { id: 'pay-003', organizationId: 'org-aaa-111', stripePaymentIntentId: 'pi_mismatch_003', amount: 200.00, paymentStatus: 'pending' },
        // DOUBLE_COUNTED: same intent ID in two DB rows
        { id: 'pay-004a', organizationId: 'org-aaa-111', stripePaymentIntentId: 'pi_double_004', amount: 50.00, paymentStatus: 'succeeded' },
        { id: 'pay-004b', organizationId: 'org-aaa-111', stripePaymentIntentId: 'pi_double_004', amount: 50.00, paymentStatus: 'succeeded' },
      ],
      stripeCharges: [
        { id: 'ch_normal_001', payment_intent: 'pi_normal_001', amount: 15000, status: 'succeeded', metadata: { organizationId: 'org-aaa-111' } },
        // MISSING_IN_DB: Stripe has a charge, DB has nothing
        { id: 'ch_orphan_999', payment_intent: 'pi_orphan_999', amount: 9900, status: 'succeeded', metadata: { organizationId: 'org-aaa-111' } },
        { id: 'ch_mismatch_003', payment_intent: 'pi_mismatch_003', amount: 20000, status: 'succeeded', metadata: { organizationId: 'org-aaa-111' } },
        { id: 'ch_double_004', payment_intent: 'pi_double_004', amount: 5000, status: 'succeeded', metadata: { organizationId: 'org-aaa-111' } },
      ],
    },
    {
      org: { id: 'org-bbb-222', name: 'Holy Cross Youth Group', stripeAccountId: 'acct_mock_orgB' },
      dbPayments: [
        // AMOUNT_MISMATCH: DB says $100, Stripe has $105
        { id: 'pay-010', organizationId: 'org-bbb-222', stripePaymentIntentId: 'pi_amount_010', amount: 100.00, paymentStatus: 'succeeded' },
        // WRONG_STRIPE_ACCOUNT: metadata says orgA but landed on orgB's account
        { id: 'pay-011', organizationId: 'org-bbb-222', stripePaymentIntentId: 'pi_wrong_011', amount: 60.00, paymentStatus: 'succeeded' },
        // Normal
        { id: 'pay-012', organizationId: 'org-bbb-222', stripePaymentIntentId: 'pi_ok_012', amount: 250.00, paymentStatus: 'succeeded' },
      ],
      stripeCharges: [
        { id: 'ch_amount_010', payment_intent: 'pi_amount_010', amount: 10500, status: 'succeeded', metadata: { organizationId: 'org-bbb-222' } },
        // metadata says wrong org (orgA), but this is on orgB's account
        { id: 'ch_wrong_011', payment_intent: 'pi_wrong_011', amount: 6000, status: 'succeeded', metadata: { organizationId: 'org-aaa-111' } },
        { id: 'ch_ok_012', payment_intent: 'pi_ok_012', amount: 25000, status: 'succeeded', metadata: { organizationId: 'org-bbb-222' } },
      ],
    },
  ]
}

// ─── Core reconciliation logic ────────────────────────────────────────────────

function reconcile(
  orgId: string,
  orgName: string,
  stripeAccountId: string,
  dbPayments: DbPayment[],
  stripeCharges: Array<{ id: string; payment_intent: string | null; amount: number; status: string; metadata: Record<string, string> }>
): OrgResult {
  const discrepancies: Discrepancy[] = []

  // Index DB payments by Stripe intent ID
  const dbByIntent = new Map<string, DbPayment[]>()
  for (const p of dbPayments) {
    if (!p.stripePaymentIntentId) continue
    const arr = dbByIntent.get(p.stripePaymentIntentId) ?? []
    arr.push(p)
    dbByIntent.set(p.stripePaymentIntentId, arr)
  }

  // Index Stripe charges by intent ID
  const stripeByIntent = new Map<string, typeof stripeCharges[0]>()
  for (const c of stripeCharges) {
    if (c.payment_intent) stripeByIntent.set(c.payment_intent, c)
  }

  // Check for DOUBLE_COUNTED
  for (const [intentId, rows] of dbByIntent.entries()) {
    if (rows.length > 1) {
      discrepancies.push({
        type: 'DOUBLE_COUNTED',
        stripeIntentId: intentId,
        detail: `Intent ${intentId} appears in ${rows.length} DB payment records: ${rows.map(r => r.id).join(', ')}`,
      })
    }
  }

  // Check DB payments against Stripe
  const succeededDbPayments = dbPayments.filter(p => p.paymentStatus === 'succeeded' && p.stripePaymentIntentId)
  for (const dbPay of succeededDbPayments) {
    const intentId = dbPay.stripePaymentIntentId!
    const stripeCharge = stripeByIntent.get(intentId)

    if (!stripeCharge) {
      discrepancies.push({
        type: 'MISSING_IN_STRIPE',
        paymentId: dbPay.id,
        stripeIntentId: intentId,
        expectedAmount: dbPay.amount,
        detail: `DB payment ${dbPay.id} (${fmt(dbPay.amount)}) is succeeded but no Stripe charge found for intent ${intentId}`,
      })
      continue
    }

    // AMOUNT_MISMATCH (Stripe stores cents)
    const stripeAmountDollars = stripeCharge.amount / 100
    if (Math.abs(stripeAmountDollars - dbPay.amount) > 0.01) {
      discrepancies.push({
        type: 'AMOUNT_MISMATCH',
        paymentId: dbPay.id,
        stripeIntentId: intentId,
        expectedAmount: dbPay.amount,
        actualAmount: stripeAmountDollars,
        detail: `Amount mismatch for intent ${intentId}: DB=${fmt(dbPay.amount)} Stripe=${fmt(stripeAmountDollars)}`,
      })
    }

    // STATUS_MISMATCH
    if (stripeCharge.status === 'succeeded' && dbPay.paymentStatus !== 'succeeded') {
      discrepancies.push({
        type: 'STATUS_MISMATCH',
        paymentId: dbPay.id,
        stripeIntentId: intentId,
        detail: `Status mismatch for intent ${intentId}: DB=${dbPay.paymentStatus} Stripe=${stripeCharge.status}`,
      })
    }

    // WRONG_STRIPE_ACCOUNT: charge is on this org's account but metadata says a different org
    const metaOrgId = stripeCharge.metadata?.organizationId
    if (metaOrgId && metaOrgId !== orgId) {
      discrepancies.push({
        type: 'WRONG_STRIPE_ACCOUNT',
        paymentId: dbPay.id,
        stripeIntentId: intentId,
        detail: `Intent ${intentId} landed on account ${stripeAccountId} (org ${orgId}) but metadata.organizationId=${metaOrgId}`,
      })
    }
  }

  // Check DB pending/non-succeeded payments for STATUS_MISMATCH (Stripe succeeded, DB not)
  const nonSucceededDbWithIntent = dbPayments.filter(
    p => p.paymentStatus !== 'succeeded' && p.stripePaymentIntentId
  )
  for (const dbPay of nonSucceededDbWithIntent) {
    const stripeCharge = stripeByIntent.get(dbPay.stripePaymentIntentId!)
    if (stripeCharge?.status === 'succeeded') {
      discrepancies.push({
        type: 'STATUS_MISMATCH',
        paymentId: dbPay.id,
        stripeIntentId: dbPay.stripePaymentIntentId!,
        detail: `Status mismatch for intent ${dbPay.stripePaymentIntentId}: DB=${dbPay.paymentStatus} Stripe=${stripeCharge.status}`,
      })
    }
  }

  // Check Stripe charges against DB (MISSING_IN_DB)
  const allDbIntentIds = new Set(dbPayments.map(p => p.stripePaymentIntentId).filter(Boolean))
  for (const charge of stripeCharges) {
    if (charge.status !== 'succeeded') continue
    if (charge.payment_intent && !allDbIntentIds.has(charge.payment_intent)) {
      discrepancies.push({
        type: 'MISSING_IN_DB',
        stripeIntentId: charge.payment_intent,
        actualAmount: charge.amount / 100,
        detail: `Stripe charge ${charge.id} (${fmt(charge.amount / 100)}) on account ${stripeAccountId} has no DB payment record`,
      })
    }
  }

  return {
    orgId,
    orgName,
    stripeAccountId,
    totalDbPayments: dbPayments.length,
    totalStripeCharges: stripeCharges.length,
    discrepancies,
  }
}

// ─── Output helpers ───────────────────────────────────────────────────────────

function fmt(dollars: number): string {
  return `$${dollars.toFixed(2)}`
}

function printOrgResult(result: OrgResult): void {
  const status = result.discrepancies.length === 0 ? '✅ CLEAN' : `❌ ${result.discrepancies.length} DISCREPANCY(IES)`
  console.log(`\n┌─ ${result.orgName}`)
  console.log(`│  ID:              ${result.orgId}`)
  console.log(`│  Stripe account:  ${result.stripeAccountId}`)
  console.log(`│  DB payments:     ${result.totalDbPayments}`)
  console.log(`│  Stripe charges:  ${result.totalStripeCharges}`)
  console.log(`│  Status:          ${status}`)

  if (result.discrepancies.length > 0) {
    console.log('│')
    const byType = new Map<DiscrepancyType, Discrepancy[]>()
    for (const d of result.discrepancies) {
      const arr = byType.get(d.type) ?? []
      arr.push(d)
      byType.set(d.type, arr)
    }
    for (const [type, items] of byType.entries()) {
      console.log(`│  [${type}] × ${items.length}`)
      for (const item of items) {
        console.log(`│    • ${item.detail}`)
        if (item.expectedAmount !== undefined) console.log(`│      Expected: ${fmt(item.expectedAmount)}`)
        if (item.actualAmount !== undefined)   console.log(`│      Actual:   ${fmt(item.actualAmount)}`)
      }
    }
  }

  console.log('└' + '─'.repeat(60))
}

function printSummaryTable(results: OrgResult[]): void {
  console.log('\n' + '═'.repeat(80))
  console.log('RECONCILIATION SUMMARY')
  console.log('═'.repeat(80))
  console.log(
    'Org Name'.padEnd(30) +
    'DB Pay'.padStart(8) +
    'Stripe'.padStart(8) +
    'Issues'.padStart(8)
  )
  console.log('─'.repeat(80))
  for (const r of results) {
    const name = r.orgName.length > 28 ? r.orgName.slice(0, 27) + '…' : r.orgName
    const mark = r.discrepancies.length > 0 ? ' ❌' : ' ✅'
    console.log(
      name.padEnd(30) +
      String(r.totalDbPayments).padStart(8) +
      String(r.totalStripeCharges).padStart(8) +
      String(r.discrepancies.length).padStart(8) +
      mark
    )
  }
  console.log('─'.repeat(80))
  const totalDiscrepancies = results.reduce((s, r) => s + r.discrepancies.length, 0)
  const totalOrgs = results.length
  const cleanOrgs = results.filter(r => r.discrepancies.length === 0).length
  console.log(`\nTotal orgs:          ${totalOrgs}`)
  console.log(`Clean orgs:          ${cleanOrgs}`)
  console.log(`Orgs with issues:    ${totalOrgs - cleanOrgs}`)
  console.log(`Total discrepancies: ${totalDiscrepancies}`)
  console.log('═'.repeat(80))
}

// ─── Live: fetch DB payments for one org ─────────────────────────────────────

async function fetchDbPayments(prisma: PrismaClient, orgId: string): Promise<DbPayment[]> {
  const rows = await prisma.payment.findMany({
    where: {
      organizationId: orgId,
      paymentMethod: 'card',
    },
    select: {
      id: true,
      organizationId: true,
      stripePaymentIntentId: true,
      amount: true,
      paymentStatus: true,
    },
  })
  return rows.map(r => ({
    id: r.id,
    organizationId: r.organizationId,
    stripePaymentIntentId: r.stripePaymentIntentId,
    amount: Number(r.amount),
    paymentStatus: r.paymentStatus,
  }))
}

// ─── Live: fetch Stripe charges for one connected account ─────────────────────

async function fetchStripeCharges(
  stripe: Stripe,
  stripeAccountId: string
): Promise<Array<{ id: string; payment_intent: string | null; amount: number; status: string; metadata: Record<string, string> }>> {
  const charges: Array<{ id: string; payment_intent: string | null; amount: number; status: string; metadata: Record<string, string> }> = []
  let startingAfter: string | undefined

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const page = await stripe.charges.list(
      { limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) },
      { stripeAccount: stripeAccountId }
    )
    for (const c of page.data) {
      charges.push({
        id: c.id,
        payment_intent: typeof c.payment_intent === 'string' ? c.payment_intent : (c.payment_intent?.id ?? null),
        amount: c.amount,
        status: c.status,
        metadata: (c.metadata as Record<string, string>) ?? {},
      })
    }
    if (!page.has_more) break
    startingAfter = page.data[page.data.length - 1].id
  }

  return charges
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const isDryRun = args.includes('--dry-run')
  const isAll = args.includes('--all')
  const orgIdIndex = args.indexOf('--orgId')
  const singleOrgId = orgIdIndex >= 0 ? args[orgIdIndex + 1] : null

  if (!isDryRun && !isAll && !singleOrgId) {
    console.error('Usage: npx tsx scripts/stripe-reconciliation.ts --dry-run | --orgId <uuid> | --all')
    process.exit(1)
  }

  // ── DRY RUN ──────────────────────────────────────────────────────────────────
  if (isDryRun) {
    console.log('🔍 DRY-RUN MODE — using synthetic mock data (no DB, no Stripe API calls)\n')
    const mockData = buildMockData()
    const results: OrgResult[] = []

    for (const { org, dbPayments, stripeCharges } of mockData) {
      const result = reconcile(org.id, org.name, org.stripeAccountId, dbPayments, stripeCharges)
      results.push(result)
      printOrgResult(result)
    }

    printSummaryTable(results)

    const totalDiscrepancies = results.reduce((s, r) => s + r.discrepancies.length, 0)
    if (totalDiscrepancies > 0) {
      console.log(`\n⚠️  ${totalDiscrepancies} discrepancy(ies) detected in mock data.`)
      console.log('   (Expected — dry-run mock data intentionally includes all discrepancy types.)')
      // Dry-run always exits 0 (it's a demo)
      process.exit(0)
    }
    process.exit(0)
  }

  // ── LIVE MODES ────────────────────────────────────────────────────────────────
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (!stripeSecretKey) {
    console.error('STRIPE_SECRET_KEY environment variable is required for live mode.')
    process.exit(1)
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' })
  const prisma = new PrismaClient()

  try {
    let orgs: Array<{ id: string; name: string; stripeAccountId: string }>

    if (singleOrgId) {
      const org = await prisma.organization.findUnique({
        where: { id: singleOrgId },
        select: { id: true, name: true, stripeAccountId: true },
      })
      if (!org) { console.error(`Organization ${singleOrgId} not found.`); process.exit(1) }
      if (!org.stripeAccountId) { console.error(`Organization ${org.name} has no stripeAccountId.`); process.exit(1) }
      orgs = [{ id: org.id, name: org.name, stripeAccountId: org.stripeAccountId }]
    } else {
      // --all: every org with an active stripeAccountId
      const rows = await prisma.organization.findMany({
        where: { stripeAccountId: { not: null }, stripeChargesEnabled: true },
        select: { id: true, name: true, stripeAccountId: true },
      })
      orgs = rows
        .filter(r => r.stripeAccountId != null)
        .map(r => ({ id: r.id, name: r.name, stripeAccountId: r.stripeAccountId! }))
    }

    console.log(`\nReconciling ${orgs.length} org(s)...\n`)
    const results: OrgResult[] = []

    for (const org of orgs) {
      console.log(`  Fetching data for: ${org.name} (${org.stripeAccountId})`)
      const [dbPayments, stripeCharges] = await Promise.all([
        fetchDbPayments(prisma, org.id),
        fetchStripeCharges(stripe, org.stripeAccountId),
      ])
      const result = reconcile(org.id, org.name, org.stripeAccountId, dbPayments, stripeCharges)
      results.push(result)
      printOrgResult(result)
    }

    printSummaryTable(results)

    const totalDiscrepancies = results.reduce((s, r) => s + r.discrepancies.length, 0)
    process.exit(totalDiscrepancies > 0 ? 1 : 0)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
