# Phase 3 — Group Registration Flow End-to-End Audit
## Group Leader UX, Portal Instructions, and Isolation Verification

**Date:** 2026-03-14
**Branch:** `claude/test-org-isolation-9y4yp`
**Scope:** Step 3.1 (Registration flow), Step 3.2 (Portal instructions), Step 3.3 (Portal functionality)

---

## Step 3.1 — Group Leader Registration Process (Walk-Through)

### 3.1.1 — Landing / Event Page

**Route:** `GET /api/events/[eventId]` → rendered at `/events/[eventId]/`

Group registration is a **separate URL** from individual registration:
- Group: `/events/[eventId]/register-group/`
- Individual: `/events/[eventId]/register-individual/` (or similar)

The event listing page must present a clear "Group Registration" call-to-action separate from individual registration. The API returns `settings.groupRegistrationEnabled` and `settings.individualRegistrationEnabled` booleans that control which buttons appear.

**Verdict:** ✅ Architecturally correct — registration types are separate routes. UX clarity depends on the front-end copy (not audited in source here).

---

### 3.1.2 — Registration Form (`/events/[eventId]/register-group/`)

**What the form collects:**

| Field | Type | Notes |
|-------|------|-------|
| Group name | Text | Required |
| Parish name | Text | Optional |
| Diocese name | Text | Optional |
| Group leader name | Text | Required |
| Group leader email | Email | Required — confirmation email sent here |
| Group leader phone | Phone | Required |
| Group leader address | Street/City/State/Zip | Optional |
| Alternative contact 1 | Name/email/phone | Optional |
| Alternative contact 2 | Name/email/phone | Optional |
| Youth count | Number | Required — headcount only, no names yet |
| Chaperone count | Number | Required |
| Priest/clergy count | Number | Required |
| Housing type | Select: on_campus / off_campus / day_pass | Required |
| Special requests | Textarea | Optional |
| Coupon code | Text | Applied at review |

**Participant names are NOT collected at registration.** Participants fill in their own info later via the liability form using the group's access code. This is an intentional design: the group leader is registering a headcount, not a named roster.

**Pricing (Review Page):**
- Itemized: Youth (N) × $X + Chaperones (N) × $X + Priests (N) × $X
- Housing-specific price overrides applied if configured (`onCampusYouthPrice`, `offCampusYouthPrice`, etc.)
- Early bird pricing applied if within the window
- Coupon discount subtracted if valid
- **Total is displayed BEFORE proceeding to payment** ✅
- Deposit amount calculated separately (percentage, per-person fixed, or full payment)
- Balance remaining shown clearly

**Verification:** ✅ Total is shown on the review page before payment. Itemized breakdown prevents surprises.

---

### 3.1.3 — Participant Details

**CONFIRMED: Group leaders do not enter participant names at registration.**

The flow is:
1. Group leader registers → enters headcounts → pays deposit
2. Each participant individually fills out their liability form at `/poros/liability?code=[ACCESS_CODE]`
3. The form captures: name, age, gender, emergency contacts, medical info, allergies, dietary restrictions

**Group leader portal adds participants to the system** when each liability form is submitted (not at registration time).

**Implication for UX:** The confirmation email must clearly explain that participants need to go to the Poros liability platform to register themselves. This is step 2 in the "Next Steps" section of the email.

**Verdict:** ✅ The design is intentional. The email explains this step. However, see Step 3.2 for concerns about instruction clarity.

---

### 3.1.4 — Payment

**Credit card flow:**

The `POST /api/registration/group` route:

1. Validates event exists and is open for registration
2. Calculates price using event pricing (housing-specific overrides, early bird, coupons)
3. Creates `GroupRegistration` record with `organizationId = event.organizationId` ✅
4. Creates `PaymentBalance` record with `organizationId = event.organizationId` ✅
5. Creates `Payment` record (status: `pending`) ✅
6. Creates Stripe checkout session:

```typescript
// Stripe Connect: routes payment to org's connected account
if (event.organization.stripeAccountId) {
  checkoutConfig.payment_intent_data = {
    application_fee_amount: platformFeeAmount,  // ChiRho platform fee
    transfer_data: {
      destination: event.organization.stripeAccountId,  // Org gets the money
    }
  }
}
```

7. Returns `checkoutUrl` → client redirects to Stripe

**What Stripe checkout creates:**
- One checkout session for the deposit amount
- `stripePaymentIntentId` = checkout session ID (stored in `Payment` record)
- `registrationId` in metadata = the group registration UUID

**Post-payment (webhook):**
- `checkout.session.completed` webhook fires
- `Payment.paymentStatus` → `succeeded`
- `PaymentBalance.amountPaid` recalculated from all succeeded payments
- `GroupRegistration.registrationStatus` → `pending_forms`
- Confirmation email sent to `groupLeaderEmail`

**Records created at registration:**
- 1 × `GroupRegistration`
- 1 × `PaymentBalance`
- 1 × `Payment` (deposit only)

**Note: Individual participant records are NOT created at registration.** They are created when each participant submits their liability form.

**Stripe account verification:**
- ✅ `stripeAccountId` comes from `event.organization` (DB join, not user input)
- ✅ Platform fee from `org.platformFeePercentage` (per-org, from DB)
- ⚠️ If org has no Stripe account: payment routes to platform account silently (no error shown to user) — this is a medium risk already documented in Phase 2

**Check payment flow:**
- Registration record created with `registrationStatus: 'pending_payment'`
- Payment record created with `paymentStatus: 'pending'`, `paymentMethod: 'check'`
- Confirmation email sent immediately (includes mailing address and payable-to info)
- No Stripe checkout session created

**Verdict:** ✅ Payment amount matches calculated total. Stripe account routing is correct. All records correctly link to the org/event.

---

### 3.1.5 — Confirmation

**After Stripe payment:**
- Redirect to `/registration/confirmation/[registrationId]?session_id=[CHECKOUT_SESSION_ID]`
- Confirmation page shows: org logo, event name, group name, access code, QR code, participant count, payment summary
- Buttons: Print receipt, Resend confirmation email, Download PDF
- Webhook fires concurrently: sends confirmation email to group leader

**After check payment:**
- Client receives `{ registrationId, accessCode, checkoutUrl: null }` from API
- Frontend should redirect to confirmation page
- Confirmation email sent immediately (includes check mailing address)

**Confirmation email content (see Step 3.2 for full analysis):**
- ✅ Confirmation of registration details
- ✅ Access code (prominently displayed)
- ✅ 6-step Next Steps section
- ⚠️ Portal login instructions are vague (see 3.2)

**Verdict:** ✅ Confirmation page exists and is informative. Email is sent. See Step 3.2 for concerns about portal instructions.

---

## Step 3.2 — Portal Instructions Quality Assessment

### The Email Next Steps Section (Exact Text)

The `generateGroupRegistrationConfirmationEmail()` function emits these steps:

**Step 2 (Liability Forms):**
> "Each participant must complete their liability form using your access code. They can go to the Poros liability platform."
> [Button: "Go to Poros Liability"]

**Step 3 (Portal Setup):**
> "Set Up Your Group Leader Dashboard"
> "Sign in if you have used Chiro in the past and add your new access code, or sign up using Clerk!"
> [Button: "Go to Group Leader Portal"]

---

### Issues Found

#### ❌ ISSUE 1 — "Chiro" is not a recognizable product name

**Current copy:** "Sign in if you have used Chiro in the past..."
**Problem:** "Chiro" is internal shorthand. A group leader from a parish who registered for the first time has no idea what "Chiro" is. This will cause confusion and support requests.
**Fix:** Replace with the product name or a plain description: "If you have an account from a previous event, sign in with the same email."

#### ❌ ISSUE 2 — "Sign up using Clerk" exposes implementation detail

**Current copy:** "...or sign up using Clerk!"
**Problem:** "Clerk" is the authentication provider's name, not a user-facing concept. Telling a non-tech-savvy group leader to "sign up using Clerk" is meaningless and may be alarming ("is Clerk a separate company? why do I need another account?").
**Fix:** "Create a free account" or "Create an account at [portal URL]."

#### ❌ ISSUE 3 — No explanation of HOW to link the access code

**Problem:** After creating an account or signing in, the group leader must go to `/dashboard/group-leader/link-access-code` and enter their access code. This step is not mentioned. The `groupLeaderPortalUrl` points to `/dashboard/group-leader` — if they have no linked registration, the layout redirects them to the link page, but this is not communicated in the email.
**Fix:** Add an explicit step: "Once signed in, enter your access code **[ACCESS_CODE]** on the 'Link Access Code' page. This connects your account to your group's registration."

#### ❌ ISSUE 4 — Access code is mentioned but not repeated in the portal instructions

**Problem:** The access code is displayed prominently at the top of the email, but Step 3 (portal setup) does not repeat it. A group leader who scrolls to Step 3 may not remember their code.
**Fix:** Include `Your access code: [ACCESS_CODE]` inline within Step 3's text.

#### ❌ ISSUE 5 — No description of WHAT the portal does

**Problem:** Step 3 says "Set Up Your Group Leader Dashboard" but doesn't explain what they'll find there. Why should they bother?
**Fix:** Add a one-sentence description: "The dashboard lets you track liability forms, view housing assignments, check payment status, and manage your group."

#### ⚠️ ISSUE 6 — No support contact in portal setup instructions

**Problem:** If the group leader can't get into the portal, where do they turn? The email includes "Reply to this email" in Step 6 (Questions), but that's buried at the end after 5 other steps.
**Fix:** Add support contact to Step 3: "Need help? Email [support email] or reply to this email."

#### ⚠️ ISSUE 7 — "Poros" is also internal jargon

**Problem:** The liability form platform is called "Poros" internally. "Go to the Poros liability platform" is meaningless to participants and parents.
**Fix:** "Have each participant complete their registration form at the link below (or they can visit [portal URL] and enter your group's access code)."

---

### Recommended Replacement Copy for Step 3

**Current:**
```
Set Up Your Group Leader Dashboard
Sign in if you have used Chiro in the past and add your new access code, or sign up using Clerk!
[Button: Go to Group Leader Portal]
```

**Recommended:**
```
Set Up Your Group Leader Portal
Your portal lets you track forms, payments, housing, and your full participant roster.

1. Visit: [Group Leader Portal URL]
2. Create a free account (or sign in with the email you used to register)
3. Enter your access code when prompted: [ACCESS_CODE]

Once linked, your group's registration will appear on your dashboard.
Need help? Reply to this email or contact [support@org.email].

[Button: Go to Group Leader Portal]
```

---

### Recommended Replacement Copy for Step 2

**Current:**
```
Complete Liability Forms
Each participant must complete their liability form using your access code. They can go to the Poros liability platform.
[Button: Go to Poros Liability]
```

**Recommended:**
```
Participant Registration Forms
Each participant (youth, chaperones, and priests) must complete a registration form with their personal info, emergency contacts, and medical information.

Share this link with everyone in your group:
[Button: Open Participant Form]
URL: [poros liability URL]

They'll be asked for your group's access code: [ACCESS_CODE]
```

---

## Step 3.3 — Group Leader Portal Functionality Verification

### Portal API Routes Inventory

| Route | Method | Auth | Scope | Function |
|-------|--------|------|-------|----------|
| `/api/group-leader/dashboard` | GET | Clerk userId | `WHERE clerkUserId = userId` | Dashboard summary |
| `/api/group-leader/participants` | GET | Clerk userId | `WHERE clerkUserId = userId` | Full roster with liability data |
| `/api/group-leader/payments` | GET | Clerk userId | `WHERE clerkUserId = userId` | Balance + transaction history |
| `/api/group-leader/payments/create-payment-intent` | POST | Clerk userId | `WHERE clerkUserId = userId` | Make a balance payment |
| `/api/group-leader/housing` | GET | Clerk userId | `WHERE clerkUserId = userId` | Room assignments |
| `/api/group-leader/forms` | GET | Clerk userId | `WHERE clerkUserId = userId` | Liability forms tracking |
| `/api/group-leader/certificates` | GET | Clerk userId | `WHERE clerkUserId = userId` | Safe environment certs |
| `/api/group-leader/registration` | GET | Clerk userId | `WHERE clerkUserId = userId` | Registration details |
| `/api/group-leader/registration/edit` | POST | Clerk userId | `WHERE clerkUserId = userId` | Edit registration |
| `/api/group-leader/link-access-code` | POST | Clerk userId | Validated against access code | Link access code to account |

**Auth pattern used consistently:** `getClerkUserIdFromRequest(request)` → query scoped by `clerkUserId: userId`

---

### 3.3.1 — View Group Roster

**Route:** `GET /api/group-leader/participants`

**Scope:** `prisma.groupRegistration.findFirst({ where: { clerkUserId: userId } })`

Returns:
- Full participant list with names, ages, types
- Liability form completion status per participant
- Medical info (conditions, allergies, medications)
- Emergency contacts
- Dietary restrictions and ADA accommodations

**Cross-group isolation:** ✅ — scoped by `clerkUserId`. A leader can only see participants in their own registration.
**Cross-org isolation:** ✅ — the registration itself is org-scoped (from event creation).

---

### 3.3.2 — Edit Participant Info

**Route:** `GET/POST /api/group-leader/registration/edit`

Group leaders can edit their **registration details** (headcounts, contact info). Participants update their own info via the liability form.

Specific participant editing (add/remove) is available via the registration edit route — the exact scope of editable fields depends on event settings (`editRegistrationEnabled`, `editRegistrationDeadline`).

**Cross-group isolation:** ✅ — scoped by `clerkUserId`.

---

### 3.3.3 — Housing Assignments

**Route:** `GET /api/group-leader/housing`

Returns:
- Allocated rooms (building name, room number, capacity)
- Bed-by-bed assignments per room
- Participant assignment status
- Stats: male/female youth and chaperone counts

**Scope:** `prisma.groupRegistration.findFirst({ where: { clerkUserId: userId, id: eventId, housingType: 'on_campus' } })`

**❌ BUG — Same `whereClause.id = eventId` issue documented in Phase 1:**

```typescript
// housing/route.ts line 30-32:
where: {
  clerkUserId: userId,
  id: eventId,           // ← BUG: id should be eventId
  housingType: 'on_campus',
}
```

This is the same pattern as the dashboard and payments routes. When `eventId` is passed as a query param, the housing route attempts to filter by `groupRegistration.id = eventId` instead of `groupRegistration.eventId = eventId`. Since a group registration ID and an event ID are different UUIDs, this always returns null for housing requests that include an `eventId` filter.

**Security impact:** None — `clerkUserId` still scopes correctly. Housing data for other groups cannot be accessed.
**Functional impact:** MEDIUM — housing page may fail to load for group leaders who have registrations for multiple events, since the eventId filter silently fails.

**Cross-group isolation:** ✅ — scoped by `clerkUserId`.
**Cross-org isolation:** ✅ — rooms belong to the event which belongs to the org.

---

### 3.3.4 — Payment Status

**Route:** `GET /api/group-leader/payments`

Returns:
- `PaymentBalance`: total due, amount paid, amount remaining, late fees, payment status
- All `Payment` transactions: amount, type, method, status, receipt URL, check number

**Scope:** `prisma.groupRegistration.findFirst({ where: { clerkUserId: userId } })` → then queries by `registrationId`

**Cross-group isolation:** ✅ — scoped by `clerkUserId` then by `registrationId`.

---

### 3.3.5 — Make Additional Payments

**Route:** `POST /api/group-leader/payments/create-payment-intent`

Creates a Stripe Payment Intent for the remaining balance.

```typescript
// The org's Stripe account comes from reg.organizationId → org.stripeAccountId
const reg = await prisma.groupRegistration.findFirst({ where: { clerkUserId: userId } })
const org = await prisma.organization.findUnique({ where: { id: reg.organizationId } })
// → payment goes to org.stripeAccountId (correct)
```

**Cross-group isolation:** ✅ — only accesses the leader's own registration.
**Payment routing:** ✅ — org's connected account is used.

**❌ BUG — Same `whereClause.id = eventId` pattern:**

```typescript
// payments/create-payment-intent/route.ts (approximate):
const whereClause: any = { clerkUserId: userId }
if (eventId) {
  whereClause.id = eventId  // ← BUG
}
```

Same issue: if a group leader passes `?eventId=...`, the query looks for `groupRegistration.id === eventId` and returns null. The payment intent cannot be created for that event.

**Security impact:** None.
**Functional impact:** MEDIUM — multi-event group leaders cannot make balance payments via the event-filtered URL.

---

### 3.3.6 — NOT See Other Groups

**Verification:** All group leader API routes use:
```typescript
const userId = await getClerkUserIdFromRequest(request)
prisma.groupRegistration.findFirst({ where: { clerkUserId: userId } })
```

The `clerkUserId` on `GroupRegistration` is unique to one user (enforced by `link-access-code` route: if the code is already linked to a different user, it returns 409). One group leader's Clerk account maps to their own registration only.

**Verdict:** ✅ A group leader from Group X cannot see Group Y's data, even if both groups are registered for the same event.

---

### 3.3.7 — NOT See Other Orgs

**Verification:** The `clerkUserId` links to a specific `GroupRegistration`. That registration has `organizationId = event.organizationId`. The group leader's queries are scoped to their own registration, which inherits the org context.

A group leader registered for Org A's event:
- Cannot link an access code from Org B's event (the code lookup by `accessCode` has a unique constraint — each access code belongs to exactly one registration)
- Cannot see Org B's events (they have no `clerkUserId` link to any Org B registration)
- Cannot see Org B's financial data (all payment queries scope by `registrationId`)

**Verdict:** ✅ Cross-org isolation holds. A group leader sees exactly one org's data: the org that ran the event they registered for.

---

## Summary — Phase 3 Findings

### ❌ CRITICAL UX ISSUES (must fix before next registration cycle)

| # | Issue | Location | Severity |
|---|-------|----------|----------|
| 1 | "Sign in with Chiro" — meaningless to group leaders | `email-templates.ts` Step 3 | HIGH UX |
| 2 | "Sign up using Clerk" — confusing internal branding | `email-templates.ts` Step 3 | HIGH UX |
| 3 | No explanation of how to link access code after signing in | `email-templates.ts` Step 3 | HIGH UX |
| 4 | Access code not repeated in portal setup instructions | `email-templates.ts` Step 3 | MEDIUM UX |
| 5 | No description of what the portal does | `email-templates.ts` Step 3 | MEDIUM UX |
| 6 | "Poros liability platform" is internal jargon to participants | `email-templates.ts` Step 2 | MEDIUM UX |

### ❌ FUNCTIONAL BUGS (not security issues, but break functionality)

| # | Issue | Location | Severity |
|---|-------|----------|----------|
| 7 | `whereClause.id = eventId` in dashboard route | `api/group-leader/dashboard/route.ts:51` | MEDIUM |
| 8 | `whereClause.id = eventId` in payments route | `api/group-leader/payments/route.ts:23` | MEDIUM |
| 9 | `where: { id: eventId }` in housing route | `api/group-leader/housing/route.ts:30` | MEDIUM |
| 10 | Same bug in payments/create-payment-intent | `api/group-leader/payments/create-payment-intent/route.ts` | MEDIUM |

All four bugs are the same root cause: `whereClause.id = eventId` should be `whereClause.eventId = eventId`. These bugs only affect group leaders registered to multiple events — single-event leaders are unaffected because they don't pass `?eventId=...`.

### ✅ CONFIRMED WORKING

- Group registration form collects correct data (headcount, housing, pricing)
- Total is displayed before payment on the review page
- Stripe checkout uses org's connected account (destination charges)
- All records correctly linked to org/event (`organizationId = event.organizationId`)
- Confirmation page and email sent after payment
- Group leader portal exists with full functionality
- Cross-group isolation: each leader sees only their own registration ✅
- Cross-org isolation: leader sees only data from the org they registered with ✅
- Additional payments route through correct org's Stripe account ✅

---

## Recommended Fixes (Prioritized)

### Priority 1 — Email copy (before next registration cycle)

Rewrite Step 3 of `generateGroupRegistrationConfirmationEmail()` using the improved copy in Section 3.2. This directly impacts every group leader's first experience with the portal.

### Priority 2 — Fix `whereClause.id = eventId` bug (all 4 instances)

In each affected route, change:
```typescript
if (eventId) {
  whereClause.id = eventId     // WRONG
}
```
to:
```typescript
if (eventId) {
  whereClause.eventId = eventId  // CORRECT
}
```

Files: `dashboard/route.ts`, `payments/route.ts`, `housing/route.ts`, `payments/create-payment-intent/route.ts`

### Priority 3 — Group leader portal URL in email

Change `groupLeaderPortalUrl` from `/dashboard/group-leader` to `/dashboard/group-leader/link-access-code?code=[ACCESS_CODE]` — this deep-links the group leader directly to the access code linking page with their code pre-filled, skipping the redirect.

---

*Phase 3 audit complete. See `tests/org-isolation/10-group-registration-flow.test.ts` for verification tests.*
