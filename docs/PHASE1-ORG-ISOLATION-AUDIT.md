# Phase 1: Organization Isolation Architecture Audit
**ChiRho Events — Security & Data Isolation Review**
*Generated: 2026-02-27 | Branch: claude/test-org-isolation-9y4yp*

---

## Executive Summary

This document maps the ChiRho Events codebase architecture with a focus on multi-tenant organization isolation — particularly around payments, group registration, the group leader portal, and reporting. One **critical vulnerability** was found that allows any authenticated user (regardless of role) to query payment data across org boundaries. Several **medium-severity gaps** were also identified.

---

## 1. Data Model Map — Organization Isolation

### 1.1 The Organization Model (`prisma/schema.prisma` L17–100)

The `Organization` table is the root of the multi-tenant hierarchy. Key fields:

| Field | Purpose | Notes |
|---|---|---|
| `id` | Primary key (UUID) | Used as FK in all scoped tables |
| `stripeAccountId` | Stripe Connect account ID | `@unique`, nullable — org may not be connected |
| `stripeAccountStatus` | `not_connected / pending / active` | Tracks onboarding state |
| `stripeOnboardingCompleted` | Onboarding complete flag | |
| `stripeChargesEnabled` | Stripe charges allowed | Must be `true` to charge |
| `stripePayoutsEnabled` | Stripe payouts allowed | |
| `platformFeePercentage` | ChiRho's cut (default 1%) | Used in every payment |

### 1.2 Foreign Key Chain: Organization → Event → Registration → Payment

```
Organization
  └── Event (organizationId FK) ✅
        ├── GroupRegistration (organizationId FK) ✅
        │     ├── Participant (organizationId FK) ✅
        │     ├── LiabilityForm (organizationId FK) ✅
        │     └── Payment (organizationId FK) ✅
        ├── IndividualRegistration (organizationId FK) ✅
        │     ├── LiabilityForm (organizationId FK) ✅
        │     └── Payment (organizationId FK) ✅
        ├── Payment (organizationId FK) ✅
        ├── PaymentBalance (organizationId FK) ✅
        ├── VendorRegistration (organizationId FK) ✅
        ├── StaffRegistration (organizationId FK) ✅
        ├── Coupon (organizationId FK) ✅
        ├── DayPassOption (organizationId FK) ✅
        ├── Building (eventId FK only — no organizationId) ⚠️
        │     └── Room (buildingId FK only) ⚠️
        │           └── RoomAssignment (roomId FK only) ⚠️
        ├── SeatingSection (eventId FK only) ⚠️
        │     └── SeatingAssignment (sectionId FK only) ⚠️
        ├── WaitlistEntry (eventId FK only) ⚠️
        ├── PorosStaff (eventId FK only) ⚠️
        └── LiabilityFormTemplate (organizationId + optional eventId) ✅
```

**Also scoped directly to Organization (not via Event):**
- `User` (organizationId FK, nullable for master_admin) ✅
- `SafeEnvironmentCertificate` (organizationId FK) ✅
- `EmailLog` (organizationId FK) ✅
- `SupportTicket` (organizationId FK) ✅
- `Invoice` (organizationId FK) ✅
- `BillingNote` (organizationId FK) ✅

### 1.3 Tables with Indirect Isolation Only (via eventId chain)

These tables rely on the `event.organizationId` chain rather than carrying a direct `organizationId`:

| Table | FK Path | Risk Level |
|---|---|---|
| `Building` | `eventId` → `events.organizationId` | Low — always accessed through event context |
| `Room` | `buildingId` → `buildings.eventId` → `events.organizationId` | Low — 3-hop chain |
| `RoomAssignment` | `roomId` → `rooms.buildingId` → ... | Low — 4-hop chain |
| `SeatingSection` | `eventId` → `events.organizationId` | Low |
| `SeatingAssignment` | `sectionId` → `seating_sections.eventId` | Low |
| `WaitlistEntry` | `eventId` → `events.organizationId` | Low |
| `PorosStaff` | `eventId` → `events.organizationId` | Low |

All Poros API routes use `verifyEventAccess()` which validates org membership before any data access — the indirect chain is enforced at the API layer.

### 1.4 Tables with NO Org/Event Isolation at DB Level

| Table | Has organizationId | Notes |
|---|---|---|
| `RegistrationEdit` | ❌ | Audit trail; only has `registrationId` + `editedByUserId` |
| `Refund` | ❌ | Only has `registrationId` + `processedByUserId` |
| `ReportTemplate` | `organizationId` ✅ (L1400) | Has direct org FK |

`RegistrationEdit` and `Refund` both lack `organizationId`. API routes that create these records always do so in the context of a verified registration (i.e., after confirming org membership), so the risk is medium — a compromise of the API layer could write audit/refund records for foreign registrations. The records themselves cannot expose data without joining to the registration.

---

## 2. Payment Configuration Audit

### 2.1 Stripe Connected Account Setup

Each `Organization` has its own Stripe Connect account via `stripeAccountId`. The payment flow for event registration uses **Destination Charges**:

```
ChiRho Platform Stripe Account
  ├── Charges the customer
  ├── Keeps platformFeePercentage (default 1%)
  └── Transfers remainder to org's stripeAccountId
```

The vendor payment flow uses **Direct Charges** (different pattern):
```
Org's Stripe Account (via { stripeAccount: stripeAccountId })
  └── Charges the customer directly
```

### 2.2 Stripe API Call Inventory

Every Stripe API call site was reviewed:

| File | Call Type | Uses Org Account? | Notes |
|---|---|---|---|
| `registration/group/route.ts:594` | `checkout.sessions.create` | ✅ If connected | Falls back to platform if no account |
| `registration/individual/route.ts` | `checkout.sessions.create` | ✅ If connected | Falls back to platform if no account |
| `registration/staff/route.ts:193` | `paymentIntents.create` | ✅ Required | Blocks if not connected |
| `group-leader/payments/create-payment-intent/route.ts:105` | `paymentIntents.create` | ✅ If connected | Falls back to platform if no account |
| `admin/virtual-terminal/process/route.ts:211` | `paymentIntents.create` | ✅ Required | Returns 400 if not connected |
| `vendor/payment/route.ts:71` | `paymentIntents.create` | ✅ Required | Returns 400 if not connected |
| `invoices/[token]/checkout/route.ts:101` | `checkout.sessions.create` | ❌ Platform only | **Correct** — these are ChiRho subscription/setup fees |
| `webhooks/stripe/route.ts` | `webhooks.constructEvent` | N/A — inbound | Webhook handler |
| `stripe/connect/route.ts` | `accounts.create/retrieve` | N/A — onboarding | Account creation/link |
| `stripe/connect/callback/route.ts` | `accounts.retrieve` | N/A — onboarding | Verifies account status |

### 2.3 Stripe Fallback Behavior (⚠️ DESIGN DECISION — VERIFY)

For group and individual registration and group-leader balance payments, when an org has **no Stripe Connected Account** (`stripeAccountId == null`):
- The payment is processed via the **platform's main Stripe account**
- Money accumulates in the ChiRho Events Stripe account
- There is no `transfer_data.destination` so no transfer occurs

**This appears intentional** (the code logs "processing without platform fee") but requires business confirmation: is it acceptable for un-connected orgs to collect money that sits in the platform account? The virtual terminal and vendor payment routes correctly **block** payment when there's no connected account.

**Recommendation:** Decide whether group/individual registration should also block (return error) when no Stripe account is connected, or whether the fallback to the platform account is deliberate.

---

## 3. Authentication & Authorization Layer

### 3.1 Middleware (`src/middleware.ts`)

The Clerk middleware uses an **allow-list** approach — all routes are protected by default, but the following route patterns are explicitly marked public (they "handle their own auth"):

```
/api/admin/*       → handle own auth
/api/group-leader/* → handle own auth
/api/master-admin/* → handle own auth
/api/stripe/*      → handle own auth
/api/webhooks/*    → handle own auth
/api/registration/* → public (no auth — registrations are open)
/api/portal/*      → handle own auth
/api/vendor/*      → handle own auth
/api/invoices/*    → public (invoice payment pages)
/api/queue/*       → public (registration flow)
```

**Key observation:** Registration APIs (`/api/registration/*`) are fully public — no authentication required. This is correct by design since event registration is open to the public.

### 3.2 Core Admin Auth — `verifyEventAccess()` (`src/lib/api-auth.ts`)

The primary guard for all admin API routes. Flow:

```
1. Extract Clerk user ID from:
   a. Clerk auth() cookies (primary)
   b. Authorization: Bearer <JWT> header (fallback 1)
   c. Raw cookie parsing + JWT decode (fallback 2)
2. Look up User in DB by clerkUserId
3. Verify user has admin role
4. Get effectiveOrgId (handles master_admin impersonation)
5. Look up Event by eventId
6. CRITICAL CHECK: event.organizationId === effectiveOrgId
   → master_admin bypasses this check (intentional)
   → all other roles must match
7. Return 403 "Organization mismatch" if different
```

This is the correct pattern and is used consistently across all Poros, SALVE, Rapha, payment, and reporting routes.

### 3.3 Org Admin Auth — `verifyAdminAccess()` (`src/lib/api-auth.ts`)

Used for routes that don't need event-specific checks (dashboard, billing, settings). Verifies admin role + returns `effectiveOrgId` for use in DB queries.

### 3.4 Group Leader Auth

Group leaders authenticate via Clerk and are identified by `GroupRegistration.clerkUserId`. Group leader APIs:

1. Authenticate via Clerk (cookies or JWT header)
2. Query `groupRegistration.findFirst({ where: { clerkUserId: userId } })`
3. All returned data is inherently scoped to that leader's registration

**Bug found** (non-security, functional): In `group-leader/dashboard/route.ts:49` and `group-leader/payments/route.ts:21`:
```javascript
const whereClause: any = { clerkUserId: userId }
if (eventId) {
  whereClause.id = eventId  // BUG: should be whereClause.eventId = eventId
}
```
The intent is to filter by event when `?eventId=` is passed, but `id` refers to the `groupRegistration.id`, not `eventId`. This means the filter silently fails (returns all registrations for the user, or 404 if the UUID doesn't match). **Not a security issue** — `clerkUserId` still enforces that only the logged-in user's data is returned.

### 3.5 JWT Fallback — Security Concern (`src/lib/jwt-auth-helper.ts`)

The `decodeJwtPayload()` function decodes JWT tokens by base64-decoding the payload, **without verifying the signature**:

```typescript
export function decodeJwtPayload(token: string): { sub?: string } | null {
  const parts = token.split('.')
  const payload = Buffer.from(parts[1], 'base64').toString('utf-8')
  return JSON.parse(payload)  // No signature verification!
}
```

This is used as a fallback when Clerk's `auth()` fails. If an attacker can reach the fallback path (by making Clerk's primary auth fail), they could forge a JWT with any `sub` claim.

**Mitigating factors:**
- The primary Clerk `auth()` path does verify signatures
- The forged token would still need to match a `clerkUserId` in the database
- In practice, this fallback is only used in production edge cases (cookie timing issues)

**Recommendation:** Add JWT signature verification to `decodeJwtPayload()` using Clerk's public key, or remove the unverified fallback paths.

### 3.6 Role Definitions (`src/lib/permissions.ts`)

Roles in the system:

| Role | Scope | Admin Dashboard? |
|---|---|---|
| `master_admin` | All orgs | ✅ |
| `org_admin` | Own org | ✅ |
| `event_manager` | Own org | ✅ |
| `finance_manager` | Own org | ✅ |
| `poros_coordinator` | Own org | ✅ |
| `salve_coordinator` | Own org | ✅ |
| `rapha_coordinator` | Own org | ✅ |
| `staff` | Own org (read-only) | ✅ |
| `group_leader` | Own registration only | ❌ |
| `individual` | Own registration only | ❌ |
| `parent` | Own children only | ❌ |
| `salve_user` | SALVE check-in only | ❌ |
| `rapha_user` | Rapha medical only | ❌ |

### 3.7 Master Admin Impersonation

Master admins can impersonate any org via cookies:
- `impersonating_org`: The org UUID being impersonated
- `master_admin_id`: The master admin's user ID (validated against `user.id`)
- `impersonating_org_name`: Display name

The validation `masterAdminId === user.id` prevents one user from using another user's impersonation cookie. The impersonation state is visible via `ImpersonationBanner` components.

---

## 4. Critical Vulnerabilities Found

### 🔴 CRITICAL: Debug Payments Endpoint Has No Org Check

**File:** `src/app/api/admin/debug/payments/[registrationId]/route.ts`

**What it does:** Returns all payment records, payment balance, and registration info for ANY registration ID.

**Auth check:** Only verifies that the user is **authenticated** — does NOT check:
- Admin role
- Organization membership

**Impact:** Any authenticated user (including `group_leader`, `individual`, `parent`, `salve_user`) can call this endpoint to view payment data for registrations belonging to OTHER organizations.

```typescript
// Line 12-16: ONLY authentication check — no isAdmin(), no org check
const userId = await getClerkUserIdFromRequest(request)
if (!userId) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
// Then queries ALL payments for any registrationId — no org filter
```

**Attack scenario:**
1. Attacker creates their own account (group leader) on Org A
2. They call `GET /api/admin/debug/payments/<any-registration-uuid>` or `GET /api/admin/debug/payments/<access-code-of-org-B-group>`
3. They receive full payment data (amounts, dates, payment status) for Org B's registrations
4. Access codes are printed on confirmation emails (discoverable by social engineering)

**Fix required:** Add admin role check (`isAdmin(user)`) + organization membership check (`canAccessOrganization(user, registration.organizationId)`).

---

## 5. Medium-Severity Gaps

### 🟡 MEDIUM: `RegistrationEdit` and `Refund` Have No `organizationId`

`RegistrationEdit` and `Refund` records are created without direct org scoping. While the API routes that create them do verify org membership first, these tables cannot be directly queried with an org filter — any bulk query would return records across orgs.

**Risk:** If a new API route is added that queries these tables by `registrationId` without first verifying org ownership, data could leak.

**Recommendation:** Add `organizationId` FK to both `RegistrationEdit` and `Refund` tables as a defense-in-depth measure.

### 🟡 MEDIUM: JWT Fallback Path Without Signature Verification

See Section 3.5. The `decodeJwtPayload()` fallback path does not verify JWT signatures.

### 🟡 MEDIUM: Missing Stripe Account Fallback for Group/Individual Registration

See Section 2.3. When an org has no Stripe Connected Account, group and individual registration payments go to the platform Stripe account. This differs from virtual terminal (which blocks) and vendor payment (which blocks).

---

## 6. Summary Checklist

| Check | Status | Notes |
|---|---|---|
| `organizationId` on `events` | ✅ | Present, indexed |
| `organizationId` on `group_registrations` | ✅ | Present, indexed |
| `organizationId` on `individual_registrations` | ✅ | Present |
| `organizationId` on `participants` | ✅ | Present |
| `organizationId` on `payments` | ✅ | Present, indexed |
| `organizationId` on `payment_balances` | ✅ | Present |
| `organizationId` on `liability_forms` | ✅ | Present, indexed |
| `organizationId` on `safe_environment_certificates` | ✅ | Present, indexed |
| `organizationId` on `vendor_registrations` | ✅ | Present, indexed |
| `organizationId` on `staff_registrations` | ✅ | Present, indexed |
| `organizationId` on `coupons` | ✅ | Present, indexed |
| `organizationId` on `day_pass_options` | ✅ | Present, indexed |
| `organizationId` on `registration_edits` | ❌ | MISSING — medium risk |
| `organizationId` on `refunds` | ❌ | MISSING — medium risk |
| `stripeAccountId` on `Organization` | ✅ | Present, unique |
| Org account used in group registration checkout | ✅ | With fallback to platform |
| Org account used in individual registration checkout | ✅ | With fallback to platform |
| Org account used in group leader balance payment | ✅ | With fallback to platform |
| Org account used in virtual terminal | ✅ | Blocks if not connected |
| Org account used in vendor payment | ✅ | Blocks if not connected |
| Platform invoice checkout uses platform account | ✅ | Correct by design |
| Admin event access checks org membership | ✅ | `verifyEventAccess()` |
| Admin dashboard data scoped to org | ✅ | `getEffectiveOrgId()` |
| Group leader scoped to own registration | ✅ | Via `clerkUserId` filter |
| Debug payments endpoint checks org membership | ❌ | **CRITICAL — missing entirely** |
| JWT fallback verifies signature | ❌ | MEDIUM — no verification |
| Group leader `eventId` filter bug | ⚠️ | FUNCTIONAL BUG — `id` vs `eventId` |

---

## 7. Recommended Test Matrix (Phase 2)

Based on this analysis, the following scenarios must be covered by automated tests:

1. **Cross-org event access**: Admin from Org A cannot access events, registrations, or payments of Org B via `/api/admin/events/[eventId]/*`
2. **Cross-org registration read**: Admin from Org A cannot view a registration belonging to Org B
3. **Cross-org payment read**: Admin from Org A cannot view payments belonging to Org B
4. **Debug endpoint**: A non-admin user can currently read ANY registration's payment data — this is the critical fix to test
5. **Group leader isolation**: Group leader from Group A cannot access Group B's data even if they know the group B ID
6. **Stripe account isolation**: Payment intent created for Org A's event uses Org A's `stripeAccountId`, not Org B's
7. **Master admin impersonation**: Master admin impersonating Org A sees Org A's data; switching to Org B changes scope
8. **Stripe fallback**: When org has no Stripe account, registration payment goes to platform account (not another org's account)
9. **Coupon isolation**: A coupon created for Org A's event cannot be redeemed on Org B's event
10. **Group leader `eventId` filter bug**: Verify the `whereClause.id = eventId` bug and its functional impact

---

*End of Phase 1 Audit Document*
