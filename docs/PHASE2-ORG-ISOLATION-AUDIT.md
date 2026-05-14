# Phase 2 — Organization Isolation Audit
## Database-Level, API-Level, and Payment Isolation

**Date:** 2026-03-14
**Branch:** `claude/test-org-isolation-9y4yp`
**Scope:** Step 2.1 (DB queries), Step 2.2 (API endpoints), Step 2.3 (Payment isolation)

---

## Step 2.1 — Database-Level Isolation

### Raw SQL Queries

Ten files use `$queryRaw` or `$executeRaw`. All were reviewed:

| File | Raw SQL Purpose | Auth Guard | Verdict |
|------|----------------|-----------|---------|
| `src/lib/poros-raw-queries.ts` | Poros scheduling/rooms queries scoped by `event_id` | Called only from authenticated admin routes | ✅ SAFE — `event_id` comes from `verifyEventAccess()`-validated params |
| `src/app/api/admin/events/[eventId]/poros/data-import/route.ts` | `WHERE event_id = ${eventId}::uuid` | `verifyEventAccess()` + `poros.access` permission | ✅ SAFE |
| `src/app/api/admin/events/[eventId]/poros/m2k-import/route.ts` | `WHERE event_id = ${eventId}::uuid` | `verifyEventAccess()` + permission | ✅ SAFE |
| `src/app/api/admin/events/[eventId]/salve/generate-packet/route.ts` | Raw query scoped to `event_id` | `verifySalveAccess()` | ✅ SAFE |
| `src/app/api/events/[eventId]/route.ts` | Public event lookup by `id` | No auth (intentionally public) | ✅ SAFE — only returns public event fields, no financial/PII data |
| `src/app/api/admin/invoices/[invoiceId]/send-email/route.tsx` | Invoice lookup by `id` | Admin auth | ✅ SAFE |
| `src/app/api/admin/run-migration/route.ts` | DDL migrations | master_admin only | ✅ SAFE |
| `src/app/poros/public/[eventId]/page.tsx` | Public Poros info by `event_id` | No auth (intentionally public) | ✅ SAFE — public schedule data only |
| `src/app/api/master-admin/invoices/route.ts` | Cross-org invoice listing | master_admin role only | ✅ SAFE |
| `src/app/api/registration/group/route.ts` | Group registration write | Public (intentional) | ✅ SAFE — writes to org derived from event |

**Summary:** All raw SQL queries are either:
1. Guarded by `verifyEventAccess()` and use event-scoped parameters, or
2. Intentionally public endpoints that return only public data

**No unscoped raw SQL found that exposes cross-org data.**

---

### ORM Query Audit — Critical Paths

#### ✅ PASS — Admin event queries (all scoped by organizationId)

`GET /api/admin/events` (`src/app/api/admin/events/route.ts:33`):
```typescript
const whereClause: any = { organizationId }  // from getEffectiveOrgId(user)
```

`GET /api/admin/dashboard` — all counts include `organizationId` filter.

#### ✅ PASS — Payment/balance queries with eventId scope

Event-scoped payment queries:
```typescript
prisma.payment.findMany({ where: { eventId: event.id, paymentStatus: 'succeeded' } })
prisma.paymentBalance.findMany({ where: { eventId: event.id } })
```

These are secondary queries inside `GET /api/admin/events/route.ts` — the parent event record was already org-validated, so `eventId` is trustworthy.

#### ✅ PASS — Refund endpoint

`POST /api/admin/refunds` (`src/app/api/admin/refunds/route.ts`):
1. Authenticates user (must be `org_admin` or `master_admin`)
2. Fetches registration by `registrationId`
3. Checks `canAccessOrganization(user, registration.organizationId)` — cross-org access blocked
4. Only then creates refund record and calls Stripe

#### ⚠️ MEDIUM — Refund table lacks organizationId

`Refund` records are created at `src/app/api/admin/refunds/route.ts:162`:
```typescript
await prisma.refund.create({
  data: { registrationId, registrationType, refundAmount, ... }
  // NO organizationId stored
})
```
`registration_edits` has the same issue. A query for all refunds across all orgs would require joining through the registration table. This makes auditing and reporting harder but doesn't create an isolation vulnerability (the API is gated behind `canAccessOrganization()`).

**Risk:** Medium — affects reporting queries, not live data access.

#### ✅ PASS — Webhook balance recalculation

The `payment_intent.succeeded` handler recalculates from all succeeded payments for a `registrationId`. This is idempotent and cannot leak cross-org data because the `registrationId` comes from the Stripe payment intent's own metadata (which was set at checkout creation time and verified via Stripe's signature).

---

## Step 2.2 — API Endpoint Isolation

### Legend
- ✅ PASS — auth + org check present and correct
- ❌ FAIL — missing required auth or org check
- ⚠️ CONCERN — auth present but design requires attention

### Admin API Endpoints

| Endpoint | Auth Guard | Org Scope | Result |
|----------|-----------|-----------|--------|
| `GET /api/admin/events` | `getCurrentUser` + `isAdmin` | `getEffectiveOrgId` → `WHERE organizationId` | ✅ PASS |
| `GET /api/admin/events/[eventId]` | `verifyEventAccess` | event.organizationId === effectiveOrgId | ✅ PASS |
| `GET/POST /api/admin/events/[eventId]/poros/*` | `verifyEventAccess` + permission | event-scoped | ✅ PASS |
| `GET /api/admin/dashboard` | `verifyEventAccess` or `getCurrentUser+isAdmin` | `getEffectiveOrgId` | ✅ PASS |
| `POST /api/admin/virtual-terminal/process` | `getCurrentUser` + `isAdmin` + `hasPermission` | `getEffectiveOrgId` + `WHERE organizationId` on reg lookup | ✅ PASS |
| `POST /api/admin/refunds` | `getClerkUserIdFromRequest` → org_admin/master_admin check | `canAccessOrganization(user, reg.organizationId)` | ✅ PASS |
| `GET /api/admin/registrations/[regId]/payment-balance` | Admin auth | Fetch-then-check org | ✅ PASS (deferred check pattern) |
| `GET /api/admin/debug/payments/[registrationId]` | `getClerkUserIdFromRequest` only | **NONE** | ❌ **CRITICAL FAIL** |
| `GET /api/admin/billing` | Admin auth | Platform-level (no org scope needed) | ✅ PASS |

### Registration API Endpoints

| Endpoint | Auth Guard | Org Scope | Result |
|----------|-----------|-----------|--------|
| `POST /api/registration/group` | None (intentionally public) | org derived from event | ✅ PASS (by design) |
| `POST /api/registration/individual` | None (intentionally public) | org derived from event | ✅ PASS (by design) |
| `GET /api/registration/[registrationId]` | **None** | **None** | ❌ **HIGH FAIL** |

### Group Leader API Endpoints

| Endpoint | Auth Guard | Org Scope | Result |
|----------|-----------|-----------|--------|
| `GET /api/group-leader/dashboard` | `getClerkUserIdFromRequest` → clerkUserId scope | `WHERE clerkUserId = userId` | ✅ PASS |
| `POST /api/group-leader/payments/create-payment-intent` | `getClerkUserIdFromRequest` → clerkUserId scope | `WHERE clerkUserId = userId` | ✅ PASS |

### Stripe / Webhook Endpoints

| Endpoint | Auth Guard | Org Scope | Result |
|----------|-----------|-----------|--------|
| `POST /api/webhooks/stripe` | `stripe.webhooks.constructEvent()` signature | organizationId from session metadata | ⚠️ CONCERN (see 2.3) |
| `POST /api/vendor/payment` | Access code only | vendor reg scoped to event | ⚠️ CONCERN — no Clerk auth |

---

### CRITICAL FAIL #1 — Debug Endpoint

**File:** `src/app/api/admin/debug/payments/[registrationId]/route.ts`

**The code:**
```typescript
const userId = await getClerkUserIdFromRequest(request)
if (!userId) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
// NO isAdmin() check
// NO organizationId check
// Directly queries ALL payments for any registrationId
const allPayments = await prisma.payment.findMany({ where: { registrationId } })
```

**Attack vector:**
1. Attacker authenticates as a `group_leader` on Org A
2. Learns (or guesses) access code for Org B's registration (format `ACC-XXXXXXXX`)
3. Calls `GET /api/admin/debug/payments/ACC-ORGB-CODE` with their auth token
4. Receives full payment data for Org B's registration

**Required fix:**
```typescript
// After getting userId, look up user and add:
const user = await prisma.user.findFirst({ where: { clerkUserId: userId } })
if (!user || !isAdminRole(user.role)) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
// After finding registration, add:
if (!canAccessOrganization(user, registration.organizationId)) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

---

### HIGH FAIL #2 — Public Registration Lookup

**File:** `src/app/api/registration/[registrationId]/route.ts`

**The code:**
```typescript
export async function GET(request, { params }) {
  // NO authentication check whatsoever
  const registration = await prisma.groupRegistration.findUnique({
    where: { id: registrationId },
    // returns: accessCode, groupLeaderEmail, payment totals, participantCount
  })
```

**Data exposed to unauthenticated caller:**
- `accessCode` (can be used to call the debug endpoint)
- `groupLeaderEmail` (PII)
- `depositPaid` / `totalAmount` / `balanceRemaining` (financial data)
- `registrationStatus`

**Context:** This endpoint serves the post-registration confirmation page (`/registration/confirmation/[id]`). The `registrationId` is a UUID that is not guessable by brute force, but:
1. It's embedded in confirmation emails, which could be forwarded
2. It could be leaked via server logs, referrer headers, etc.
3. Any user who obtains a UUID (from a forwarded email, a log, etc.) can call this endpoint with no authentication

**Risk assessment:** HIGH. Financial and contact data is exposed to anyone who obtains the UUID.

**Required fix options:**
1. Add authentication requirement (breaks the post-registration confirmation flow for unauthenticated users)
2. Limit returned fields — strip `accessCode`, `groupLeaderEmail`, financial amounts from the public response
3. Add a short-lived signed token to confirmation email URLs and validate it here

---

## Step 2.3 — Payment Isolation (Critical Paths)

### 2.3.1 — Event Creation → Stripe Account Linking

**How it works:** Events are created via the admin interface. The `stripeAccountId` on the `Organization` record is set during Stripe Connect onboarding (via `account.updated` webhooks). Events do **not** store a `stripeAccountId` — they inherit it at checkout time via:

```typescript
const org = await prisma.organization.findUnique({ where: { id: event.organizationId } })
// Then:
payment_intent_data: { transfer_data: { destination: org.stripeAccountId } }
```

**Analysis:**
- ✅ Event → Organization → stripeAccountId chain is correct
- ✅ The account is looked up fresh at checkout time (not cached)
- ✅ The org's `stripeChargesEnabled` flag is checked in the virtual terminal (blocks payment if account not ready)
- ⚠️ Group checkout (`/api/registration/group`) does NOT check `stripeChargesEnabled` — it silently falls back to platform account if `stripeAccountId` is null. This means payments for new orgs that haven't completed Stripe onboarding go to the platform, not the org.

### 2.3.2 — Checkout Session Creation

#### Group Registration Checkout (`src/app/api/registration/group/route.ts`)

```typescript
if (event.organization.stripeAccountId) {
  sessionConfig.payment_intent_data = {
    application_fee_amount: Math.round(amount * (platformFeePercent / 100) * 100),
    transfer_data: { destination: event.organization.stripeAccountId },
  }
}
// else: no payment_intent_data → payment goes to platform account
```

**Analysis:**
- ✅ `stripeAccountId` comes from `event.organization` (DB-joined, not user-supplied)
- ✅ Platform fee is calculated from `org.platformFeePercentage` (org-specific, from DB)
- ✅ `organizationId` stored in session metadata = `event.organizationId` (DB-derived)
- ⚠️ Silent fallback to platform account when org has no Stripe account (design decision, but financially material)

#### Individual Registration Checkout

Same pattern as group — uses destination charges with org's connected account.

#### Group Leader Balance Payment (`src/app/api/group-leader/payments/create-payment-intent`)

```typescript
const org = await prisma.organization.findUnique({ where: { id: groupReg.organizationId } })
stripe.paymentIntents.create({
  transfer_data: { destination: org.stripeAccountId },
  application_fee_amount: ...
})
```

- ✅ `organizationId` comes from `groupReg.organizationId` (DB-derived from the authenticated user's own registration)
- ✅ User cannot inject a different org's `stripeAccountId`

#### Virtual Terminal (`src/app/api/admin/virtual-terminal/process`)

```typescript
const org = await prisma.organization.findFirst({ where: { id: organizationId } })
if (!org?.stripeAccountId) return 403
// Uses destination charges
```

- ✅ `organizationId` = `getEffectiveOrgId(user)` (session-derived)
- ✅ Explicitly blocks if no Stripe account configured
- ✅ Registration lookup includes `WHERE organizationId = organizationId` to prevent cross-org virtual terminal use

### 2.3.3 — Webhook Handling

**File:** `src/app/api/webhooks/stripe/route.ts`

**Architecture:** Single platform-level webhook endpoint receiving all Stripe events.

#### Signature Verification
```typescript
event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
```
- ✅ Signature verified using platform's webhook secret — forged events are rejected
- ✅ This applies to all event types (`payment_intent.succeeded`, `checkout.session.completed`, `account.updated`)

#### organizationId from Metadata
```typescript
const { registrationId, registrationType } = session.metadata || {}
// Then:
await prisma.payment.updateMany({ where: { registrationId, stripePaymentIntentId: session.id } })
```

**Analysis of metadata trust:**
- The `registrationId` in metadata was set at checkout creation time by the server (not user-controlled at webhook time)
- Stripe guarantees the metadata was not tampered with (signature verification)
- However: if an attacker could create a fraudulent checkout session (impossible without Stripe credentials), they could fake metadata

**Verdict:** ✅ PASS — metadata comes from server-side checkout session creation; Stripe signature prevents tampering

#### account.updated Event
```typescript
const org = await prisma.organization.findFirst({ where: { stripeAccountId: account.id } })
await prisma.organization.update({ where: { id: org.id }, data: { stripeChargesEnabled: ... } })
```
- ✅ Org lookup is by Stripe's own `account.id` (cannot be forged)
- ✅ Only updates the org that owns the Stripe account — no cross-org contamination

#### ⚠️ Single Webhook Secret Concern
All organizations share one webhook endpoint and one `STRIPE_WEBHOOK_SECRET`. This means:
- Events for all orgs (including Connected Account events) arrive at the same endpoint
- If the platform secret is compromised, an attacker can forge events for any org
- **Mitigation:** Rotate the secret immediately if compromised; no architectural fix needed unless adopting per-org webhook endpoints (operationally complex)

### 2.3.4 — Refunds

**File:** `src/app/api/admin/refunds/route.ts`

```typescript
const refund = await stripe.refunds.create({
  payment_intent: lastPayment.stripePaymentIntentId,
  amount: Math.round(refundAmount * 100),
  reason: 'requested_by_customer',
})
```

**Key observation:** The refund is created on the **platform** Stripe account (using `process.env.STRIPE_SECRET_KEY`), targeting a `payment_intent` that was created via destination charges.

**How this works for destination charges:**
- Original charge: platform creates charge, transfers to connected account
- Stripe refund on the platform: automatically pulls back from the connected account's balance
- ✅ This is the correct pattern for destination charge refunds per Stripe documentation

**Authorization chain:**
1. User must be `org_admin` or `master_admin`
2. `canAccessOrganization(user, registration.organizationId)` — cross-org refunds blocked
3. Refund amount validated against `paymentBalance.amountPaid`

**Verdict:** ✅ PASS — refund authorization is correct; Stripe handles the fund reversal correctly for destination charges

**Gap:** `Refund` record does not store `organizationId`, making cross-org refund reporting queries require joins.

### 2.3.5 — Concurrent Multi-Org Events

**Check for shared mutable state:**
- `stripe` client: instantiated module-level in each route file — stateless HTTP client, safe for concurrent use
- `prisma` client: singleton from `src/lib/prisma.ts` — uses connection pool, safe for concurrent requests
- No in-memory caches, no shared counters, no global mutable state found

**Webhook idempotency:**
The webhook handlers use recalculation patterns rather than increment:
```typescript
const allSucceededPayments = await prisma.payment.findMany({ where: { registrationId, paymentStatus: 'succeeded' } })
const newAmountPaid = allSucceededPayments.reduce((sum, p) => sum + Number(p.amount), 0)
```
- ✅ Safe to receive the same webhook multiple times
- ✅ No race condition between concurrent events from different orgs

**Verdict:** ✅ PASS — no shared state between orgs, no race conditions identified

---

## Summary — Critical Findings

### ❌ CRITICAL (must fix immediately)

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | Debug endpoint: no admin check, no org check | `src/app/api/admin/debug/payments/[registrationId]/route.ts` | CRITICAL |

### ❌ HIGH (fix before next release)

| # | Issue | File | Severity |
|---|-------|------|----------|
| 2 | Public registration lookup: exposes accessCode, email, financial data with no auth | `src/app/api/registration/[registrationId]/route.ts` | HIGH |

### ⚠️ MEDIUM (fix in next sprint)

| # | Issue | File | Severity |
|---|-------|------|----------|
| 3 | Group checkout silently falls back to platform account when org lacks Stripe account | `src/app/api/registration/group/route.ts` | MEDIUM |
| 4 | JWT fallback path decodes without signature verification | `src/lib/jwt-auth-helper.ts` | MEDIUM |
| 5 | `Refund` and `RegistrationEdit` tables lack `organizationId` FK | `prisma/schema.prisma` | MEDIUM |

### ✅ CONFIRMED SECURE

- All admin event routes: `verifyEventAccess()` correctly gates by org
- Payment routing: destination charges always use DB-sourced `stripeAccountId`
- Webhook handling: Stripe signature verification prevents forged events
- Refund authorization: `canAccessOrganization()` correctly blocks cross-org refunds
- Group leader isolation: `clerkUserId` scoping prevents cross-user data access
- Concurrent events: no shared mutable state between organizations
- Raw SQL queries: all properly scoped by event (which is org-validated)

---

## Recommended Fixes (Prioritized)

### Fix 1 — Debug Endpoint (CRITICAL)

Apply to `src/app/api/admin/debug/payments/[registrationId]/route.ts`:
1. After getting `userId`, look up user record
2. Add `isAdminRole(user.role)` check → 403 if not admin
3. After finding registration, add `canAccessOrganization(user, registration.organizationId)` → 403 if wrong org

### Fix 2 — Public Registration Endpoint (HIGH)

Apply to `src/app/api/registration/[registrationId]/route.ts`:
- Remove `accessCode` from the response
- Remove `groupLeaderEmail` from the response
- Consider replacing financial amounts with a boolean `hasPendingBalance`
- Or require a short-lived signed token in the URL (e.g., HMAC of `registrationId + timestamp`)

### Fix 3 — Group Checkout Stripe Fallback (MEDIUM)

Apply to `src/app/api/registration/group/route.ts`:
- Add explicit check: if `!event.organization.stripeAccountId`, return error to user rather than silently routing to platform
- Or document this as intended behavior (platform absorbs payment when org not onboarded)

### Fix 4 — Add organizationId to Refund Table (MEDIUM)

Schema migration to add `organizationId` to `Refund` and `RegistrationEdit` tables.

---

*Phase 2 audit complete. See `tests/org-isolation/` for test suites that verify these findings.*
