# Lux: Implementation Plan (Proposal)

**Status:** Plan agreed in principle. Security prerequisites (section 11) are done. Phase 1 starts once the remaining questions in section 12 are answered.
**Spec:** Lux, a simple registration module for ChiRho Events (simple events + faith formation / sacramental prep).

---

## 0. Decisions so far

| Topic | Decision |
|---|---|
| What Lux is | Parish-oriented software for small events/sign-ups and religious education. It is the product for the **Chapel and Parish** plans. |
| Chapel and Parish | No full Events portal. Everything they create is a Lux simple event or program. **Chapel: 5 simple events per year. Parish: 10 simple events per year.** Faith formation programs are not counted against these limits. |
| Bigger plans | Keep the full Events portal. Lux is a per-org switch on the master admin board. |
| Existing orgs | Grandfathered: every org that exists at launch keeps the full Events portal it has today, including the large org currently on Chapel. No upgrade is needed for that to keep working. |
| Who sees documents | Everyone logged in for the parish (org admin, pastor, staff) sees all sacramental documents and fee-assistance requests. No separate registrar role. Event-volunteer roles (SALVE/Rapha/Poros coordinators) and group leaders do not. Views are still logged quietly. |
| How long documents are kept | Until the parish deletes them. Auto-delete after N days is an optional per-program setting, **off by default**. |
| Email | Lux emails (confirmations, receipts, reminders, family links) are sent as **Lux**, with a Lux logo. Account, billing and support emails stay ChiRho Events. |
| Sibling discount / family cap | Yes. Set by the parish (section 7). |
| Security | Auth hardening and private file storage ship first (section 11). |

---

## 1. What exists today

| Area | Where | What matters for Lux |
|---|---|---|
| Auth | Clerk + `users` table, `src/lib/auth-utils.ts`, `src/lib/api-auth.ts` | One role per user, plus an "additional permissions" array (`User.permissions`, edited in Team settings). The admin sidebar honors the extra permissions; `requirePermission` / `userHasPermission` on the server do **not**. |
| Roles | `src/lib/permissions.ts`, `UserRole` enum | org_admin, event_manager, finance_manager, staff, poros/salve/rapha coordinators. |
| Module gating | `src/lib/subscription-tiers.ts` (`resolveModuleAccess`), `Organization.modulesEnabled`, `src/lib/event-module-guard.ts` | Tier defaults plus per-org master-admin overrides. The sidebar hides items by `module`. This is the pattern Lux follows. |
| Plans | `SUBSCRIPTION_TIERS` | Chapel $39 (1 event/yr, 500 people), Parish $59 (3 events, 750), Cathedral and up include Poros/SALVE/Rapha. The event limit is counted live by `countEventsUsedInCurrentPeriod` (non-draft events). |
| Login routing | `src/app/dashboard/page.tsx` → `/api/user/role` → role map | Org staff roles go to `/dashboard/admin`, which loads org info from `/api/admin/check-access`. |
| Events | `Event`, `EventSettings` (~150 toggles), `EventPricing` (youth/chaperone prices required) | Simple mode is a thin layer of defaults on top of these. |
| Individual registration | `/api/registration/individual` (1,080 lines) | Requires a housing type and an emergency contact. Writes `IndividualRegistration` + `PaymentBalance` + `Payment`. |
| Custom questions | `CustomRegistrationQuestion` / `CustomRegistrationAnswer`, `CustomQuestionRenderer` | Reused for simple events as is, and for programs with a nullable `luxProgramId`. |
| Payments | Stripe Checkout destination charges to the org's Connect account, `calculatePlatformFeeCents` (1% + Stripe fee passthrough) | The webhook (`/api/webhooks/stripe`) switches on `metadata.registrationType`. A "pay by check" path already exists (`pending_check_payment`), and staff record check/cash payments. `Payment.eventId` and `PaymentBalance.eventId` are required. |
| File storage | `src/lib/r2/*` | One R2 bucket served at a **public** URL. Certificates and letters of good standing were stored there with permanent public links. **Fixed:** they now go to a private bucket via `src/lib/r2/private-files.ts` and open through `/api/secure-files` (section 11b), which Lux documents reuse. |
| Email | `src/lib/resend.ts` | Wrapper that stores a full copy of every email in `OutboundEmail`. |
| Rate limiting | `src/lib/rate-limit.ts` | In memory, per serverless instance. Not reliable across Vercel instances. |
| Schema deploys | `scripts/build.sh` | `prisma db push`, plus a canary block that fails the build if critical columns are missing. |
| Tests | `tests/e2e-lifecycle`, `tests/org-isolation` | Plain `tsx` scripts: static source checks and Prisma-backed isolation tests. No test framework. |
| Docs / marketing | `src/app/docs/page.tsx`, `src/app/features/page.tsx`, `src/app/page.tsx`, `src/app/get-started/page.tsx` | Help center sections, feature cards, pricing cards, FAQ. |

---

## 2. How Lux fits

```
                 ┌─────────────── one Clerk login, one org, one team, one Stripe account ───────────────┐
                 │                                                                                       │
   Events portal │  /dashboard/admin   (unchanged)                 Lux   /dashboard/lux   (new, small)   │
                 │                                                                                       │
                 │   Full events ◄──── "Convert to full event" ──── Simple events  (Event.mode='simple') │
                 │        │                                               │                              │
                 │        └──────────── IndividualRegistration / Payment / Stripe webhook ◄──┘           │
                 │                                                                                       │
                 │                                                 Programs (new tables): households,   │
                 │                                                 children, program registrations,     │
                 │                                                 documents ──► same Stripe Connect     │
                 │                                                 checkout, fee calc and Payment ledger │
                 └───────────────────────────────────────────────────────────────────────────────────────┘
```

* **Simple events are real `Event` rows** with `mode = 'simple'`. Their registrations are real `IndividualRegistration`s and their payments are real `Payment`s. The existing webhook, refunds, virtual terminal, check/cash recording and SALVE therefore work without changes, and "Convert to full event" amounts to flipping `mode`.
* **Programs get their own tables** because a year-long First Communion program is not an event (it has no date, no venue and no housing). They reuse the Stripe Connect checkout, platform fee, webhook, `Payment` ledger, custom questions and email logging.
* **Lux has its own dashboard and its own creation flow**, so a parish never sees housing, deposits, staff/vendor setup or the 7-step event wizard.

---

## 3. Gating, plans and limits

* `ModuleKey` gains two keys, both overridable per org on the master admin board like Poros:
  * **`lux`**: the Lux dashboard.
  * **`events`**: the full Events portal.
* Tier defaults in `SUBSCRIPTION_TIERS`:

  | Tier | `lux` | `events` | Simple events / year | Programs |
  |---|---|---|---|---|
  | Chapel | on | **off** | 5 | unlimited |
  | Parish | on | **off** | 10 | unlimited |
  | Cathedral / Shrine / Basilica | on (switchable per org) | on | unlimited | unlimited |

* **Grandfathering, run once at launch:** every org that exists before the release gets an explicit `events: true` override, the same pattern as the `20260531000001` migration. It runs from `build.sh`, guarded by a `PlatformSetting` row (`lux_events_grandfathered`) so it only ever runs once. Orgs created later get the tier default. Grandfathered orgs keep their existing `eventsPerYearLimit` for full events and also get Lux with their tier's simple-event limit.
* **Limits:** each tier gets `luxLimits = { simpleEventsPerYear, activePrograms, documentStorageGb }` (Chapel 5, Parish 10, otherwise `null` = unlimited). They can be overridden per org in `Organization.luxSettings.limits`. Helpers: `getLuxLimits(org)` and `assertLuxLimit(org, kind)`. The year is the same subscription-anniversary period `countEventsUsedInCurrentPeriod` uses, counting published simple events.
* Simple events are **excluded** from the full-event count (filter `mode: 'full'`), and full events are excluded from the simple-event count.
* **Dark launch:** `PlatformSetting` key `lux_rollout` = `off | beta | all`. With `beta`, only orgs with an explicit `lux: true` override see Lux, so it can be tried on a few parishes before it's switched on for everyone.
* The stale `TIER_LIMITS` table in `src/app/api/admin/events/check-limit/route.ts` is replaced with values from `SUBSCRIPTION_TIERS`.

---

## 4. Schema changes

All changes are additive and safe for `prisma db push`. New columns that existing queries implicitly select (`events.mode`, `individual_registrations.ticket_quantity`) also get a line in the `build.sh` schema canary.

### Changes to existing models

```prisma
model Organization {
  luxSettings  Json    @default("{}") @map("lux_settings") @db.JsonB  // limits override, fee rules, office-payment text
  publicSlug   String? @unique @map("public_slug") @db.VarChar(80)     // /lux/<slug> family registration page
}

model User {
  lastDashboard String? @map("last_dashboard") @db.VarChar(10)        // 'events' | 'lux'
}

model Event {
  mode          String  @default("full") @db.VarChar(20)              // 'full' | 'simple'
  ticketOptions EventTicketOption[]
}

model IndividualRegistration {
  ticketQuantity   Int   @default(1) @map("ticket_quantity")          // head count for capacity
  ticketSelections Json? @map("ticket_selections") @db.JsonB          // [{optionId, name, unitPrice, quantity}] snapshot
}

model Payment        { eventId String? ... }   // nullable: Lux program orders aren't tied to one event
model PaymentBalance { eventId String? ... }

enum RegistrationType { ... lux_order }

model CustomRegistrationQuestion {
  luxProgramId String? @map("lux_program_id") @db.Uuid               // program-specific custom fields
}
```

Notes:
* Making `Payment.eventId` nullable is the only change to a core financial table. Every existing write path already sets it. Existing event reports filter by `eventId`, so they naturally leave Lux program payments out. The TypeScript compiler will flag every read that assumed a string, and each one gets fixed in the same PR.
* The emergency-contact columns on `IndividualRegistration` stay `NOT NULL`. Simple events store `''` and Lux screens hide the field. This avoids changing the type of a column that emails, exports and PDFs read today.

### New models (Part 1)

```prisma
model EventTicketOption {           // "Adult $10 / Child $5"
  id, eventId, organizationId, name, price Decimal, capacity Int?, remaining Int?,
  displayOrder Int, isActive Boolean, createdAt, updatedAt
}
```

### New models (Part 2)

```prisma
model LuxHousehold {                // persistent across years
  id, organizationId,
  guardian1FirstName, guardian1LastName, guardian2FirstName?, guardian2LastName?,
  email, emailNormalized, phone, street?, city?, state?, zip?, notes?, createdAt, updatedAt
  @@unique([organizationId, emailNormalized])
}

model LuxChild {
  id, householdId, organizationId, firstName, lastName, dateOfBirth, gender?, grade,
  baptismDate?, baptismParish?, baptismCity?, baptizedAtThisParish Boolean,
  extra Json?, archivedAt?, createdAt, updatedAt
}

model LuxProgram {
  id, organizationId, name, slug, templateKey, term,          // 'first_communion', '2026-2027'
  description?, status,                                        // draft | open | closed | archived
  registrationOpensAt?, registrationClosesAt?, capacity?, gradeMin?, gradeMax?,
  feePerChild Decimal, onlinePaymentEnabled, payAtOfficeEnabled, officePaymentInstructions?,
  collectSponsor Boolean, collectServiceHours Boolean,
  documentRetentionDays Int?,                                  // null = keep until deleted
  createdBy, createdAt, updatedAt
}

model LuxOrder {                    // one family checkout session (one Stripe charge)
  id, organizationId, householdId, subtotal, discountTotal, total,
  paymentMethod,                                               // card | office | none
  status,                                                      // pending | paid | office_pending | waived | cancelled
  feeAssistanceRequested Boolean, feeAssistanceNote?, feeAssistanceStatus,   // none | requested | approved | denied
  feeAssistanceAdjustedTotal?, feeAssistanceResolvedBy?, feeAssistanceResolvedAt?, createdAt, updatedAt
}

model LuxProgramRegistration {      // child ↔ program for a term
  id, organizationId, programId, childId, householdId, orderId, term,
  status,                                                      // pending_payment | registered | cancelled
  feeAmount, discountAmount, sponsorInfo Json?, serviceHours Json?, createdAt, updatedAt
  @@unique([programId, childId])
}

model LuxDocumentRequirement {
  id, programId, organizationId, key, label, description?, required Boolean,
  allowParishLookup Boolean,                                   // "Baptized at this parish, please look it up"
  displayOrder
}

model LuxDocumentSubmission {
  id, organizationId, requirementId, programRegistrationId, childId,
  status,                                                      // missing | received | approved | needs_resubmission | parish_lookup
  storageKey?,                                                 // private-bucket key; never a URL
  fileName?, contentType?, sizeBytes?, uploadedAt?, uploadedVia,  // family | staff
  reviewedBy?, reviewedAt?, reviewerNote?, deletedAt?, createdAt, updatedAt
}

model LuxMagicLink {
  id, organizationId, householdId, tokenHash,                  // sha256; raw token is never stored
  expiresAt, usedAt?, requestedIp?, createdAt
  @@index([householdId, createdAt])
}

model LuxAuditLog {                 // document views, status changes, deletes, fee decisions, links issued
  id, organizationId, actorUserId?, actorHouseholdId?, action, targetType, targetId,
  metadata Json?, ip?, createdAt
  @@index([organizationId, createdAt])
}
```

---

## 5. Dashboard routing and switcher

* New pure function `resolveLandingDashboard({ role, modules, lastDashboard })` in `src/lib/lux/routing.ts`, unit tested:
  * It applies only to org staff roles (org_admin, event_manager, finance_manager, staff). Master admins, coordinators and group leaders keep today's routing.
  * `lux && !events` (new Chapel/Parish orgs) → `lux`. `lux && events` → `lastDashboard ?? 'events'`. `!lux` → today's behavior.
* `/api/user/role` also returns `dashboard`, and `/dashboard/page.tsx` routes on it.
* The admin layout redirects a Lux-only org from `/dashboard/admin` to `/dashboard/lux`. The Lux layout redirects an org without Lux back to `/dashboard/admin`.
* A `DashboardSwitcher` in both headers ("Events | Lux") appears only when the org has both. Switching calls `POST /api/user/last-dashboard`.
* Lux layout (`src/app/dashboard/lux/layout.tsx`) nav: **Home · Programs & Events · Registrations · Households · Documents** (registrar only) **· Payments · Exports · Settings**. Settings embeds the existing `SettingsClient` (Stripe Connect, team, branding), so nothing is rebuilt.

---

## 6. Phase 1: Simple events

**"What are you setting up?"** (`/dashboard/lux/new`): two large cards, (1) *An event or sign-up* and (2) *A class or sacrament program*. Until Phase 2 ships, card 2 shows "Coming soon".

**One-page form** (`/dashboard/lux/events/new`, also used for edit):
title, date (+ optional time), location, short description · ticket types (starts with one "General" ticket; "Add a ticket type" for Adult/Child) · capacity (optional) · close date (optional) · custom questions (existing editor) · payment: *Online by card* (needs Stripe connected) and/or *Pay at the parish office* · toggles: *Require a waiver* and *Collect medical/allergy info* (the second appears only when the org has Rapha).

**Server**
* `POST /api/lux/events` creates `Event(mode: 'simple')`, `EventSettings` with simple defaults (individual on, group off, housing/day-pass/rooms off, staff/vendor off, Poros/SALVE off, waiver per toggle), `EventPricing` (youth/chaperone 0, `requireFullPayment: true`, no deposits or tiers) and the ticket options. On publish: `registrationOpenDate = now`, `registrationCloseDate = closeDate ?? event start`.
* `src/lib/lux/simple-event-pricing.ts`: `calculateSimpleEventTotal(options, selections)`, a pure function with tests.
* `src/lib/stripe-connect-checkout.ts`: extracts the destination-charge + platform-fee session builder for Lux to use. Existing registration routes are left untouched in this phase.
* `POST /api/lux/events/[slug]/register`: a thin route that reuses `getRegistrationStatus`, `generateIndividualConfirmationCode`, capacity decrement (by `ticketQuantity`), the Resend wrapper and `logEmail`. It writes `IndividualRegistration` + `PaymentBalance` + `Payment` with `metadata.registrationType = 'individual'`, so the **existing webhook completes it unchanged**.
* Pay at office reuses the existing check-payment path, relabeled. Staff mark a registration paid from the Lux Payments view, which calls the existing record-payment API.

**Public page:** `/events/[slug]` renders a new slim `SimpleEventPage` when `mode === 'simple'`. Full event pages are not touched.

**Convert to full event:** `POST /api/lux/events/[id]/convert`.
* If the org has `events`: set `mode = 'full'`, seed `individualBasePrice` from the first ticket, and redirect to the full edit page. Registrations and payments are already individual registrations, so they carry over unchanged.
* If not: return an upgrade prompt in the same style as `moduleNotInPlanMessage`.

---

## 7. Phase 2: Programs, households, family registration

* **Templates** live in `src/lib/lux/program-templates.ts` as code constants. They are copied into the program at creation and stay editable:
  * Faith Formation: grade-based, baptismal certificate optional.
  * First Communion: baptismal certificate required, parish lookup allowed.
  * Confirmation: baptismal certificate, sponsor name/parish/contact, sponsor eligibility letter, service hours.
  * Custom: blank.
* **Family flow** at `/lux/[orgSlug]`:
  1. Household info (entered once).
  2. Children: add as many as needed; each picks a program and fills that program's fields.
  3. Documents: upload now or later; baptism lookup checkbox.
  4. Review: fees computed on the server, optional *Request fee assistance* checkbox.
  5. Pay by card or at the office.
* **Fees:** `src/lib/lux/family-fees.ts` → `calculateFamilyFees(children, programs, feeRules)`, a pure function with tests. Per-child fee comes from the program. Sibling discount (flat or %) and family cap come from the parish's fee rules (open question 4).
* **Checkout:** one `LuxOrder` maps to one Stripe Checkout session, with one line item per child and `metadata.registrationType = 'lux_order'`. A new webhook branch marks the order paid and the registrations registered. Office payment sets `office_pending`; staff mark it paid, which writes a `Payment` (cash/check).
* **Fee assistance** is visible to the parish's logged-in staff only, never to other families. Staff can approve with a new total, waive, or deny. Every decision is logged.

## 8. Phase 3: Documents and privacy

* **Storage is permanent.** Documents stay stored until the parish deletes them (or an optional per-program auto-delete runs; off by default). They live in the private bucket from section 11b (`src/lib/r2/private-files.ts`). Keys are random: `lux/{orgId}/{submissionId}`. The database stores the private reference only, never a URL.
* **Viewing:** clicking "View" goes to `/api/lux/documents/[id]`, which checks the login and org, logs the view, and opens the file through a link that works for 5 minutes. Each click makes a fresh link. The time limit applies only to the link, never to the document, so a link copied into an email or chat stops working instead of exposing a child's records forever.
* **Who can view:** any logged-in org staff user of that parish (org_admin, event_manager, finance_manager, staff). No separate registrar role. SALVE/Rapha/Poros coordinators, group leaders and families' own links cannot browse other families' documents. Status changes and deletes are logged the same way.
* **Uploads** are PDF/JPG/PNG/HEIC, up to 10 MB, made by the family (registration session or magic link) or by staff on the family's behalf. Usage counts toward `documentStorageGb`.
* **Retention:** `LuxProgram.documentRetentionDays`, `null` (keep until deleted) by default. If a parish sets it, a daily cron (`/api/cron/lux-retention`) deletes expired files. Staff also get a "Delete this household's documents" action.
* **Checklist view:** a child × requirement grid per program with an "outstanding only" filter, plus one-click and bulk reminder emails. Each reminder carries a magic link straight to the upload step.

## 9. Phase 4: Magic link, exports, retention UI

* `POST /api/lux/magic-link {orgSlug, email}` always returns the same 200 response. If a household matches, the server creates a 32-byte random token, stores its sha256, sets a 30-minute expiry and emails the link.
* **Rate limits are stored in the database:** at most 3 links per household per hour and 10 per IP per hour, counted from `LuxMagicLink` rows, on top of the existing middleware limiter.
* **Opening the link** exchanges the single-use token for a signed httpOnly session cookie scoped to that household (2 hours). The page lets the family confirm or update household info, re-register children (prefilled from last term) and upload missing documents. It has no navigation and no account.
* The raw link is redacted from the `OutboundEmail` copy.
* **Exports:** CSV (opens in Excel) for program rosters (filters: grade, payment status, documents complete), outstanding documents and simple-event registrant lists.

---

## 9b. Lux email and branding

* `src/lib/lux/email.ts`: a `sendLuxEmail()` wrapper around the existing Resend client (so every email is still logged in `OutboundEmail`). It sends from `Lux <${RESEND_LUX_FROM_EMAIL}>`, uses a Lux-branded email layout with the Lux logo, and uses the parish's contact as reply-to (existing `resolveReplyTo`).
* Lux sends: simple-event confirmations and receipts, pay-at-office instructions, program registration confirmations, document reminders, family email links, and fee-assistance outcomes.
* ChiRho Events keeps sending: org onboarding, subscription and invoices, support, and master-admin email. Full-event emails for grandfathered orgs are unchanged.
* **Logo:** placeholder "Lux" wordmark until you provide the logo. It goes in `public/lux/` and is used in emails, the Lux dashboard header and public Lux pages.
* **Setup on your side:** pick the sending address. An address on `chirhoevents.com` works with the existing Resend domain. A new domain needs Resend DNS verification first.

---

## 10. Docs and marketing updates (shipped with each phase)

* `src/app/docs/page.tsx`: new section **"Lux: Simple Registration & Faith Formation"** with these pages:
  * What is Lux?
  * Setting up a simple event or sign-up
  * Taking payments & pay-at-office
  * Converting to a full event
  * Creating a faith formation or sacrament program
  * How families register
  * Documents & privacy (registrar role)
  * Returning families (email link)
  * Fee assistance
  * Exports
* `src/app/features/page.tsx`: a Lux feature card next to Poros/SALVE/Rapha.
* `src/app/page.tsx` and `src/app/get-started/page.tsx`: Chapel and Parish pricing cards rewritten as Lux plans ("5 / 10 simple events a year + unlimited faith formation programs"), a Lux feature card, and FAQ entries. Bigger plans: "Full event registration, Poros, SALVE, Rapha, plus Lux.
* Master admin org edit page: **Lux** and **Full Events** toggles.

---

## 11. Before or alongside Lux: pre-existing issues found during exploration

Status: **a** and **b** are fixed on this branch (commits `Verify Clerk tokens…` and `Store certificates and letters privately…`), with tests in `tests/security/`. **c** no longer matters for Lux because document access is no longer a separate permission. **d** is folded into Phase 1.

**a. Unverified JWT accepted as identity (high severity). FIXED.** `src/lib/jwt-auth-helper.ts` (`getClerkUserIdFromHeader`, `getClerkUserIdFromRequest`, `getClerkUserIdFromCookies`) and the inline copies in `/api/admin/check-access` and `/api/user/role` base64-decode a bearer token or cookie and trust its `sub` **without checking the signature**. `getCurrentUser(overrideUserId)` then prefers that ID over the verified Clerk session. About 150 files use this path, and `/api/admin(.*)` is public in the middleware ("handles its own auth"). Anyone who knows a staff member's Clerk user ID can make admin API calls as that person. Lux document access would sit on the same layer, so the acceptance criterion "documents are inaccessible without the registrar permission" cannot honestly be met until this is fixed.
  * **Proposed fix (separate PR):** verify the token with Clerk's `verifyToken` (keeps the cookie-timing workaround for real tokens), make `getCurrentUser` prefer the verified `auth()` session, and have all Lux routes use a strict helper.

**b. Public file URLs. FIXED in code; needs the private bucket created to take effect.** Safe Environment certificates (participants, staff, vendors) and letters of good standing were uploaded to the public bucket with permanent URLs. (Liability form PDFs are generated on request, not stored, so they were never exposed this way.)
  * They now upload to `R2_PRIVATE_BUCKET_NAME`, and every page opens them through `/api/secure-files`: org admins for that event's organization, or the group leader who owns the group.
  * `scripts/move-sensitive-files-private.ts` moves the existing files.
  * Until the bucket exists, new uploads still go to the public bucket, with an error logged, so uploads never break mid-season.

**c. Server permission helpers ignore extra permissions.** Only the sidebar reads them. Lux adds a helper that honors them.

**d. Two event-limit tables disagree.** `src/app/api/admin/events/check-limit/route.ts` keeps its own `TIER_LIMITS` (Chapel = 3 events), but `subscription-tiers.ts` says Chapel = 1.

---

## 12. Open questions

1. **Lux sending address:** `lux@chirhoevents.com` (works today) or a separate Lux domain (needs DNS setup)?
2. **People-per-year caps:** Chapel and Parish currently cap people at 500 and 750 a year. One fish fry plus faith formation could pass 500. *Recommendation: drop the people cap on Chapel and Parish and limit by simple events only.*
3. **Lux on bigger plans:** on by default for Cathedral and up, or off until you switch it on per org? *Assumption: on by default; you can switch it off.*

Assumptions unless told otherwise:
* Chapel ($39) and Parish ($59) pricing and the $50 access fee stay the same.
* Sibling discount and family cap: per-child fee set on each program; discount and cap set once per parish per year and applied across all of a household's children.
* The standard platform fee (1% + Stripe passthrough) applies to Lux card payments.

---

## 13. Delivery: one PR per phase

| PR | Contents | Tests |
|---|---|---|
| 0 (done) | Auth hardening (11a), private storage for certificates and letters (11b) | `tests/security/verify-clerk-token.test.ts`, `tests/security/sensitive-files.test.ts` |
| 1 | Lux/events modules + tier defaults, one-time grandfathering, 5/10 simple-event limits, routing + switcher, Lux layout, "What are you setting up?", simple events, public page, register route, pay at office, convert/upgrade prompt, Lux email sender, docs + pricing/marketing | Routing truth table, grandfathering, simple-event limits, simple-event pricing, convert keeps registrations/payments, existing suites unchanged |
| 2 | Households, children, templates, family flow, family fees, Stripe order checkout + webhook branch, pay at office | Family fee calc (discount/cap), two children / two programs / one household, webhook marks order paid |
| 3 | Documents on the private storage from PR 0, view logging, checklist, reminders | Access matrix (org staff / coordinator / group leader / other org), no URL stored |
| 4 | Magic link, fee assistance UI, exports, retention cron + delete action, remaining docs | Token hashing, expiry, single use, identical response for unknown emails, rate limits |
