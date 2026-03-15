/**
 * Stripe Reconciliation Script — Phase 4.2
 *
 * Compares payment records in the ChiRho Events database against what
 * Stripe reports for an org's connected account. Flags discrepancies.
 *
 * Usage:
 *   # Reconcile a specific org:
 *   DATABASE_URL="postgresql://..." STRIPE_SECRET_KEY="sk_..." npx tsx scripts/stripe-reconciliation.ts --orgId <org-uuid>
 *
 *   # Reconcile all orgs with a connected Stripe account:
 *   DATABASE_URL="postgresql://..." STRIPE_SECRET_KEY="sk_..." npx tsx scripts/stripe-reconciliation.ts --all
 *
 *   # Dry run with mock data (no real credentials needed):
 *   npx tsx scripts/stripe-reconciliation.ts --dry-run
 *
 * Output:
 *   For each org: lists matched payments, flags discrepancies.
 *   Exit code 0 if clean, 1 if discrepancies found.
 */

// Stripe and Prisma are loaded dynamically in live mode only (not needed for --dry-run)

// ============================================================
// TYPES
// ============================================================

interface DbPayment {
  id: string
  organizationId: string
  eventId: string
  registrationId: string
  registrationType: string
  amount: number           // stored in dollars
  paymentType: string
  paymentMethod: string
  paymentStatus: string
  stripePaymentIntentId: string | null
  platformFeeAmount: number | null
  createdAt: Date
  processedAt: Date | null
}

interface StripePaymentRecord {
  id: string                   // PaymentIntent ID (pi_...)
  amount: number               // in cents
  amountReceived: number       // in cents
  status: string               // succeeded | requires_payment_method | canceled | etc.
  applicationFeeAmount: number | null  // in cents
  transferData: { destination: string } | null
  metadata: Record<string, string>
  created: number              // unix timestamp
}

interface DiscrepancyReport {
  orgId: string
  orgName: string
  stripeAccountId: string | null
  totalDbPayments: number
  totalStripePayments: number
  matched: number
  discrepancies: Discrepancy[]
  summary: ReconciliationSummary
}

interface Discrepancy {
  type: DiscrepancyType
  severity: 'critical' | 'warning' | 'info'
  dbPaymentId?: string
  stripePaymentIntentId?: string
  description: string
  dbAmount?: number
  stripeAmount?: number
  expectedOrgAccount?: string
  actualOrgAccount?: string
}

type DiscrepancyType =
  | 'MISSING_IN_STRIPE'         // DB has record but Stripe doesn't
  | 'MISSING_IN_DB'             // Stripe has payment but DB doesn't
  | 'AMOUNT_MISMATCH'           // Amount differs between DB and Stripe
  | 'WRONG_STRIPE_ACCOUNT'      // Payment landed on wrong connected account
  | 'STATUS_MISMATCH'           // DB says succeeded but Stripe says otherwise
  | 'MISSING_METADATA'          // Stripe payment lacks registrationId metadata
  | 'ORPHANED_PAYMENT'          // Stripe payment metadata references unknown registration
  | 'DOUBLE_COUNTED'            // Same Stripe intent ID appears in multiple DB records

interface ReconciliationSummary {
  totalDbAmountDollars: number
  totalStripeAmountDollars: number
  amountDeltaDollars: number
  criticalCount: number
  warningCount: number
  infoCount: number
  isClean: boolean
}

// ============================================================
// MOCK DATA (for --dry-run mode)
// ============================================================

function buildMockDbPayments(orgId: string): DbPayment[] {
  return [
    {
      id: 'db-pay-001',
      organizationId: orgId,
      eventId: 'event-uuid-aaa',
      registrationId: 'reg-uuid-111',
      registrationType: 'group',
      amount: 750.00,
      paymentType: 'deposit',
      paymentMethod: 'card',
      paymentStatus: 'succeeded',
      stripePaymentIntentId: 'pi_mock_001_succeeded',
      platformFeeAmount: 7.50,
      createdAt: new Date('2025-06-01T10:00:00Z'),
      processedAt: new Date('2025-06-01T10:01:30Z'),
    },
    {
      id: 'db-pay-002',
      organizationId: orgId,
      eventId: 'event-uuid-aaa',
      registrationId: 'reg-uuid-222',
      registrationType: 'group',
      amount: 1200.00,
      paymentType: 'deposit',
      paymentMethod: 'card',
      paymentStatus: 'succeeded',
      stripePaymentIntentId: 'pi_mock_002_succeeded',
      platformFeeAmount: 12.00,
      createdAt: new Date('2025-06-02T14:00:00Z'),
      processedAt: new Date('2025-06-02T14:02:00Z'),
    },
    {
      id: 'db-pay-003',
      organizationId: orgId,
      eventId: 'event-uuid-aaa',
      registrationId: 'reg-uuid-333',
      registrationType: 'group',
      amount: 500.00,
      paymentType: 'balance',
      paymentMethod: 'card',
      paymentStatus: 'succeeded',
      stripePaymentIntentId: 'pi_mock_003_amount_wrong', // Will have amount mismatch
      platformFeeAmount: 5.00,
      createdAt: new Date('2025-06-03T09:00:00Z'),
      processedAt: new Date('2025-06-03T09:00:45Z'),
    },
    {
      id: 'db-pay-004',
      organizationId: orgId,
      eventId: 'event-uuid-aaa',
      registrationId: 'reg-uuid-444',
      registrationType: 'group',
      amount: 300.00,
      paymentType: 'deposit',
      paymentMethod: 'card',
      paymentStatus: 'succeeded',
      stripePaymentIntentId: 'pi_mock_004_missing_in_stripe', // Missing from Stripe
      platformFeeAmount: 3.00,
      createdAt: new Date('2025-06-04T11:00:00Z'),
      processedAt: new Date('2025-06-04T11:01:00Z'),
    },
    {
      id: 'db-pay-005',
      organizationId: orgId,
      eventId: 'event-uuid-aaa',
      registrationId: 'reg-uuid-555',
      registrationType: 'group',
      amount: 900.00,
      paymentType: 'balance',
      paymentMethod: 'card',
      paymentStatus: 'pending', // Never confirmed — webhook may have failed
      stripePaymentIntentId: 'pi_mock_005_succeeded_in_stripe', // Stripe says succeeded
      platformFeeAmount: 9.00,
      createdAt: new Date('2025-06-05T16:00:00Z'),
      processedAt: null,
    },
  ]
}

function buildMockStripePayments(orgStripeAccountId: string): StripePaymentRecord[] {
  return [
    {
      id: 'pi_mock_001_succeeded',
      amount: 75000,       // $750.00 — matches DB
      amountReceived: 75000,
      status: 'succeeded',
      applicationFeeAmount: 750, // $7.50
      transferData: { destination: orgStripeAccountId },
      metadata: { registrationId: 'reg-uuid-111', registrationType: 'group', organizationId: 'org-mock' },
      created: Math.floor(new Date('2025-06-01T10:01:00Z').getTime() / 1000),
    },
    {
      id: 'pi_mock_002_succeeded',
      amount: 120000,      // $1200.00 — matches DB
      amountReceived: 120000,
      status: 'succeeded',
      applicationFeeAmount: 1200, // $12.00
      transferData: { destination: orgStripeAccountId },
      metadata: { registrationId: 'reg-uuid-222', registrationType: 'group', organizationId: 'org-mock' },
      created: Math.floor(new Date('2025-06-02T14:01:00Z').getTime() / 1000),
    },
    {
      id: 'pi_mock_003_amount_wrong',
      amount: 45000,       // $450.00 — DB says $500 → AMOUNT MISMATCH
      amountReceived: 45000,
      status: 'succeeded',
      applicationFeeAmount: 450,
      transferData: { destination: orgStripeAccountId },
      metadata: { registrationId: 'reg-uuid-333', registrationType: 'group', organizationId: 'org-mock' },
      created: Math.floor(new Date('2025-06-03T09:00:30Z').getTime() / 1000),
    },
    {
      id: 'pi_mock_005_succeeded_in_stripe',
      amount: 90000,       // $900.00 — DB says pending but Stripe succeeded → STATUS MISMATCH
      amountReceived: 90000,
      status: 'succeeded',
      applicationFeeAmount: 900,
      transferData: { destination: orgStripeAccountId },
      metadata: { registrationId: 'reg-uuid-555', registrationType: 'group', organizationId: 'org-mock' },
      created: Math.floor(new Date('2025-06-05T16:00:30Z').getTime() / 1000),
    },
    {
      id: 'pi_mock_006_missing_in_db', // Stripe has this — DB doesn't → MISSING IN DB
      amount: 60000,       // $600.00
      amountReceived: 60000,
      status: 'succeeded',
      applicationFeeAmount: 600,
      transferData: { destination: orgStripeAccountId },
      metadata: { registrationId: 'reg-uuid-666', registrationType: 'group', organizationId: 'org-mock' },
      created: Math.floor(new Date('2025-06-06T08:00:00Z').getTime() / 1000),
    },
    {
      id: 'pi_mock_007_wrong_account', // Payment routed to wrong account
      amount: 200000,      // $2000.00
      amountReceived: 200000,
      status: 'succeeded',
      applicationFeeAmount: null,
      transferData: { destination: 'acct_WRONG_OTHER_ORG' }, // ← wrong!
      metadata: { registrationId: 'reg-uuid-777', registrationType: 'group', organizationId: 'org-mock' },
      created: Math.floor(new Date('2025-06-07T12:00:00Z').getTime() / 1000),
    },
  ]
}

// ============================================================
// CORE RECONCILIATION LOGIC
// ============================================================

function reconcilePayments(
  orgId: string,
  orgName: string,
  orgStripeAccountId: string,
  dbPayments: DbPayment[],
  stripePayments: StripePaymentRecord[]
): DiscrepancyReport {
  const discrepancies: Discrepancy[] = []

  // Build lookup maps
  const stripeById = new Map<string, StripePaymentRecord>()
  for (const sp of stripePayments) {
    stripeById.set(sp.id, sp)
  }

  const dbByStripeId = new Map<string, DbPayment[]>()
  for (const dp of dbPayments) {
    if (dp.stripePaymentIntentId) {
      const existing = dbByStripeId.get(dp.stripePaymentIntentId) ?? []
      existing.push(dp)
      dbByStripeId.set(dp.stripePaymentIntentId, existing)
    }
  }

  // --- Check 1: DB-side payments that should appear in Stripe ---
  const succeededDbPayments = dbPayments.filter(p => p.paymentStatus === 'succeeded')
  let matched = 0

  for (const dp of succeededDbPayments) {
    if (!dp.stripePaymentIntentId) continue

    const sp = stripeById.get(dp.stripePaymentIntentId)

    if (!sp) {
      discrepancies.push({
        type: 'MISSING_IN_STRIPE',
        severity: 'critical',
        dbPaymentId: dp.id,
        stripePaymentIntentId: dp.stripePaymentIntentId,
        description: `DB payment ${dp.id} (${dp.stripePaymentIntentId}) marked succeeded but not found in Stripe. Possible webhook failure or data corruption.`,
        dbAmount: dp.amount,
      })
      continue
    }

    // Amount check: DB stores dollars, Stripe stores cents
    const stripeAmountDollars = sp.amount / 100
    const delta = Math.abs(stripeAmountDollars - dp.amount)
    if (delta > 0.01) {  // Allow $0.01 rounding tolerance
      discrepancies.push({
        type: 'AMOUNT_MISMATCH',
        severity: 'critical',
        dbPaymentId: dp.id,
        stripePaymentIntentId: dp.stripePaymentIntentId,
        description: `Amount mismatch for ${dp.stripePaymentIntentId}: DB=$${dp.amount.toFixed(2)}, Stripe=$${stripeAmountDollars.toFixed(2)} (delta=$${delta.toFixed(2)})`,
        dbAmount: dp.amount,
        stripeAmount: stripeAmountDollars,
      })
    }

    // Stripe account routing check
    if (sp.transferData?.destination && sp.transferData.destination !== orgStripeAccountId) {
      discrepancies.push({
        type: 'WRONG_STRIPE_ACCOUNT',
        severity: 'critical',
        dbPaymentId: dp.id,
        stripePaymentIntentId: dp.stripePaymentIntentId,
        description: `Payment ${dp.stripePaymentIntentId} routed to wrong Stripe account. Expected: ${orgStripeAccountId}, Got: ${sp.transferData.destination}`,
        expectedOrgAccount: orgStripeAccountId,
        actualOrgAccount: sp.transferData.destination,
      })
    }

    // No transfer_data but org has a connected account = payment stayed on platform
    if (!sp.transferData && orgStripeAccountId) {
      discrepancies.push({
        type: 'WRONG_STRIPE_ACCOUNT',
        severity: 'critical',
        dbPaymentId: dp.id,
        stripePaymentIntentId: dp.stripePaymentIntentId,
        description: `Payment ${dp.stripePaymentIntentId} has no transfer_data — funds stayed on ChiRho platform account instead of routing to ${orgStripeAccountId}. Org was NOT credited.`,
        expectedOrgAccount: orgStripeAccountId,
        actualOrgAccount: 'platform (no transfer)',
      })
    }

    matched++
  }

  // --- Check 2: DB payments pending but Stripe says succeeded (webhook failure) ---
  const pendingDbPayments = dbPayments.filter(p =>
    p.paymentStatus === 'pending' && p.stripePaymentIntentId
  )
  for (const dp of pendingDbPayments) {
    const sp = stripeById.get(dp.stripePaymentIntentId!)
    if (sp && sp.status === 'succeeded') {
      discrepancies.push({
        type: 'STATUS_MISMATCH',
        severity: 'critical',
        dbPaymentId: dp.id,
        stripePaymentIntentId: dp.stripePaymentIntentId!,
        description: `Payment ${dp.stripePaymentIntentId} shows "pending" in DB but "succeeded" in Stripe. Webhook likely failed to process. Balance NOT updated — registration may be incorrectly blocked.`,
        dbAmount: dp.amount,
        stripeAmount: sp.amount / 100,
      })
    }
  }

  // --- Check 3: Stripe payments not in DB ---
  for (const sp of stripePayments) {
    if (sp.status !== 'succeeded') continue

    const dbRecords = dbByStripeId.get(sp.id)
    if (!dbRecords || dbRecords.length === 0) {
      discrepancies.push({
        type: 'MISSING_IN_DB',
        severity: 'warning',
        stripePaymentIntentId: sp.id,
        description: `Stripe payment ${sp.id} ($${(sp.amount / 100).toFixed(2)}) has no corresponding DB record. Webhook may have created it without a prior DB record, or DB record was deleted.`,
        stripeAmount: sp.amount / 100,
      })
    }
  }

  // --- Check 4: Double-counted intent IDs in DB ---
  for (const [intentId, records] of dbByStripeId.entries()) {
    if (records.length > 1) {
      discrepancies.push({
        type: 'DOUBLE_COUNTED',
        severity: 'critical',
        stripePaymentIntentId: intentId,
        description: `Stripe payment intent ${intentId} appears in ${records.length} DB payment records (IDs: ${records.map(r => r.id).join(', ')}). This would cause double-counting in balance calculations.`,
      })
    }
  }

  // --- Check 5: Stripe payments missing metadata ---
  for (const sp of stripePayments) {
    if (!sp.metadata?.registrationId) {
      discrepancies.push({
        type: 'MISSING_METADATA',
        severity: 'warning',
        stripePaymentIntentId: sp.id,
        description: `Stripe payment ${sp.id} lacks registrationId metadata. Cannot link to a registration. May be a manual or external charge.`,
      })
    }
  }

  // --- Check 6: Stripe payments with wrong destination account ---
  // Catches payments that Stripe has on record with this org's metadata
  // but were routed to the wrong connected account.
  for (const sp of stripePayments) {
    if (sp.status !== 'succeeded') continue
    if (!sp.metadata?.registrationId) continue

    if (sp.transferData?.destination && sp.transferData.destination !== orgStripeAccountId) {
      discrepancies.push({
        type: 'WRONG_STRIPE_ACCOUNT',
        severity: 'critical',
        stripePaymentIntentId: sp.id,
        description: `Stripe payment ${sp.id} carries this org's metadata (registrationId: ${sp.metadata.registrationId}) but was routed to ${sp.transferData.destination} instead of ${orgStripeAccountId}. Org was NOT credited.`,
        expectedOrgAccount: orgStripeAccountId,
        actualOrgAccount: sp.transferData.destination,
        stripeAmount: sp.amount / 100,
      })
    }

    if (!sp.transferData && orgStripeAccountId) {
      discrepancies.push({
        type: 'WRONG_STRIPE_ACCOUNT',
        severity: 'critical',
        stripePaymentIntentId: sp.id,
        description: `Stripe payment ${sp.id} has no transfer_data — $${(sp.amount / 100).toFixed(2)} stayed on the ChiRho platform account. Expected destination: ${orgStripeAccountId}.`,
        expectedOrgAccount: orgStripeAccountId,
        actualOrgAccount: 'platform (no transfer)',
        stripeAmount: sp.amount / 100,
      })
    }
  }

  // --- Summary ---
  const dbTotal = succeededDbPayments.reduce((s, p) => s + p.amount, 0)
  const stripeTotal = stripePayments
    .filter(p => p.status === 'succeeded')
    .reduce((s, p) => s + p.amount / 100, 0)

  const criticalCount = discrepancies.filter(d => d.severity === 'critical').length
  const warningCount = discrepancies.filter(d => d.severity === 'warning').length
  const infoCount = discrepancies.filter(d => d.severity === 'info').length

  return {
    orgId,
    orgName,
    stripeAccountId: orgStripeAccountId,
    totalDbPayments: dbPayments.length,
    totalStripePayments: stripePayments.length,
    matched,
    discrepancies,
    summary: {
      totalDbAmountDollars: dbTotal,
      totalStripeAmountDollars: stripeTotal,
      amountDeltaDollars: Math.abs(stripeTotal - dbTotal),
      criticalCount,
      warningCount,
      infoCount,
      isClean: discrepancies.length === 0,
    },
  }
}

// ============================================================
// STRIPE DATA FETCHING
// ============================================================

/**
 * Fetches all succeeded payment intents for an org's connected account.
 * Uses Stripe pagination to retrieve all records.
 */
async function fetchStripePayments(
  stripe: any,
  stripeAccountId: string,
  createdAfter?: Date
): Promise<StripePaymentRecord[]> {
  const results: StripePaymentRecord[] = []
  let hasMore = true
  let startingAfter: string | undefined

  const params: Stripe.PaymentIntentListParams = {
    limit: 100,
  }
  if (createdAfter) {
    params.created = { gte: Math.floor(createdAfter.getTime() / 1000) }
  }

  while (hasMore) {
    if (startingAfter) {
      params.starting_after = startingAfter
    }

    // For connected accounts, list via the platform key (destination charges appear
    // on the platform; we filter by transfer_data.destination client-side).
    // For direct charges on the connected account, use stripeAccount header.
    const page = await stripe.paymentIntents.list(params)

    for (const pi of page.data) {
      // Filter to only this org's payments
      const dest = (pi as any).transfer_data?.destination
      if (dest && dest !== stripeAccountId) continue

      results.push({
        id: pi.id,
        amount: pi.amount,
        amountReceived: pi.amount_received,
        status: pi.status,
        applicationFeeAmount: (pi as any).application_fee_amount ?? null,
        transferData: (pi as any).transfer_data ?? null,
        metadata: pi.metadata as Record<string, string>,
        created: pi.created,
      })
    }

    hasMore = page.has_more
    if (page.data.length > 0) {
      startingAfter = page.data[page.data.length - 1].id
    } else {
      hasMore = false
    }
  }

  return results
}

// ============================================================
// DB DATA FETCHING
// ============================================================

async function fetchDbPayments(prisma: any, orgId: string): Promise<DbPayment[]> {
  const records = await (prisma as any).payment.findMany({
    where: {
      organizationId: orgId,
      paymentMethod: 'card',
      stripePaymentIntentId: { not: null },
    },
    orderBy: { createdAt: 'asc' },
  })

  return records.map((r: any) => ({
    id: r.id,
    organizationId: r.organizationId,
    eventId: r.eventId,
    registrationId: r.registrationId,
    registrationType: r.registrationType,
    amount: Number(r.amount),
    paymentType: r.paymentType,
    paymentMethod: r.paymentMethod,
    paymentStatus: r.paymentStatus,
    stripePaymentIntentId: r.stripePaymentIntentId,
    platformFeeAmount: r.platformFeeAmount ? Number(r.platformFeeAmount) : null,
    createdAt: r.createdAt,
    processedAt: r.processedAt ?? null,
  }))
}

// ============================================================
// REPORT PRINTING
// ============================================================

function printReport(report: DiscrepancyReport): void {
  const sep = '='.repeat(72)
  const sub = '-'.repeat(72)

  console.log(`\n${sep}`)
  console.log(`RECONCILIATION REPORT`)
  console.log(`Org:              ${report.orgName} (${report.orgId})`)
  console.log(`Stripe Account:   ${report.stripeAccountId ?? 'NONE'}`)
  console.log(`DB payments:      ${report.totalDbPayments}`)
  console.log(`Stripe payments:  ${report.totalStripePayments}`)
  console.log(`Matched:          ${report.matched}`)
  console.log(sep)

  const s = report.summary
  console.log(`DB total (succeeded):     $${s.totalDbAmountDollars.toFixed(2)}`)
  console.log(`Stripe total (succeeded): $${s.totalStripeAmountDollars.toFixed(2)}`)
  console.log(`Delta:                    $${s.amountDeltaDollars.toFixed(2)}`)
  console.log(sub)

  if (report.discrepancies.length === 0) {
    console.log('✅ CLEAN — No discrepancies found.')
  } else {
    console.log(`⚠️  ${report.discrepancies.length} discrepancy/ies found:`)
    console.log(`   Critical: ${s.criticalCount}  |  Warning: ${s.warningCount}  |  Info: ${s.infoCount}`)
    console.log(sub)

    for (const d of report.discrepancies) {
      const icon = d.severity === 'critical' ? '🔴' : d.severity === 'warning' ? '🟡' : 'ℹ️'
      console.log(`\n${icon} [${d.type}] (${d.severity.toUpperCase()})`)
      console.log(`   ${d.description}`)
      if (d.dbAmount !== undefined) console.log(`   DB amount:     $${d.dbAmount.toFixed(2)}`)
      if (d.stripeAmount !== undefined) console.log(`   Stripe amount: $${d.stripeAmount.toFixed(2)}`)
      if (d.dbPaymentId) console.log(`   DB payment ID: ${d.dbPaymentId}`)
      if (d.stripePaymentIntentId) console.log(`   Stripe PI:     ${d.stripePaymentIntentId}`)
    }
  }

  console.log(`\n${sep}\n`)
}

// ============================================================
// MAIN ENTRY POINT
// ============================================================

async function runReconciliation() {
  const args = process.argv.slice(2)
  const isDryRun = args.includes('--dry-run')
  const isAll = args.includes('--all')
  const orgIdArg = args.find((_, i) => args[i - 1] === '--orgId')

  if (!isDryRun && !process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is required.')
    console.error('Use --dry-run for a demonstration without real credentials.')
    process.exit(1)
  }

  if (!isDryRun && !process.env.STRIPE_SECRET_KEY) {
    console.error('ERROR: STRIPE_SECRET_KEY environment variable is required.')
    console.error('Use --dry-run for a demonstration without real credentials.')
    process.exit(1)
  }

  console.log('='.repeat(72))
  console.log('ChiRho Events — Stripe Reconciliation Tool (Phase 4.2)')
  console.log(`Mode: ${isDryRun ? 'DRY RUN (mock data)' : 'LIVE'}`)
  console.log(`Date: ${new Date().toISOString()}`)
  console.log('='.repeat(72))

  // ── DRY RUN MODE ──────────────────────────────────────────────────────────
  if (isDryRun) {
    const mockOrgId = 'org-mock-uuid-1234'
    const mockOrgName = 'Holy Spirit Youth Ministry (MOCK)'
    const mockStripeAccountId = 'acct_mock_hsym_001'

    const dbPayments = buildMockDbPayments(mockOrgId)
    const stripePayments = buildMockStripePayments(mockStripeAccountId)

    console.log(`\n[DRY RUN] Reconciling mock org: ${mockOrgName}`)
    console.log(`[DRY RUN] DB payments: ${dbPayments.length}, Stripe payments: ${stripePayments.length}`)

    const report = reconcilePayments(
      mockOrgId,
      mockOrgName,
      mockStripeAccountId,
      dbPayments,
      stripePayments
    )
    printReport(report)

    console.log('[DRY RUN] Expected discrepancies in mock data:')
    console.log('  1. MISSING_IN_STRIPE: pi_mock_004_missing_in_stripe')
    console.log('  2. AMOUNT_MISMATCH:   pi_mock_003_amount_wrong ($500 DB vs $450 Stripe)')
    console.log('  3. STATUS_MISMATCH:   pi_mock_005_succeeded_in_stripe (pending in DB, succeeded in Stripe)')
    console.log('  4. MISSING_IN_DB:     pi_mock_006_missing_in_db')
    console.log('  5. WRONG_STRIPE_ACCOUNT: pi_mock_007_wrong_account')
    console.log('')

    const exitCode = report.summary.isClean ? 0 : 1
    process.exit(exitCode)
  }

  // ── LIVE MODE ─────────────────────────────────────────────────────────────
  const { default: Stripe } = await import('stripe')
  const { PrismaClient } = await import('@prisma/client')
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-06-20',
  })
  const prisma = new PrismaClient()

  let orgsToReconcile: Array<{ id: string; name: string; stripeAccountId: string | null }>

  try {
    if (orgIdArg) {
      const org = await (prisma as any).organization.findUnique({
        where: { id: orgIdArg },
        select: { id: true, name: true, stripeAccountId: true },
      })
      if (!org) {
        console.error(`ERROR: Organization ${orgIdArg} not found.`)
        process.exit(1)
      }
      orgsToReconcile = [org]
    } else if (isAll) {
      orgsToReconcile = await (prisma as any).organization.findMany({
        where: { stripeAccountId: { not: null }, status: 'active' },
        select: { id: true, name: true, stripeAccountId: true },
      })
    } else {
      console.error('ERROR: Specify --orgId <uuid> or --all.')
      console.error('       Use --dry-run for a mock demonstration.')
      process.exit(1)
    }

    let globalClean = true

    for (const org of orgsToReconcile) {
      console.log(`\nReconciling: ${org.name} (${org.id})`)

      if (!org.stripeAccountId) {
        console.log(`  SKIP — no Stripe account configured.`)
        continue
      }

      const [dbPayments, stripePayments] = await Promise.all([
        fetchDbPayments(prisma, org.id),
        fetchStripePayments(stripe, org.stripeAccountId),
      ])

      const report = reconcilePayments(
        org.id,
        org.name,
        org.stripeAccountId,
        dbPayments,
        stripePayments
      )
      printReport(report)

      if (!report.summary.isClean) globalClean = false
    }

    process.exit(globalClean ? 0 : 1)
  } finally {
    await prisma.$disconnect()
  }
}

runReconciliation().catch(err => {
  console.error('Reconciliation failed:', err)
  process.exit(1)
})
