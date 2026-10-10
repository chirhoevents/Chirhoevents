# Lux: What Was Built

**Status:** Built on branch `claude/quirky-knuth-e1zzfo`: all four phases, plus the security fixes that had to come first.
**Spec:** Lux, a simple registration module for ChiRho Events (simple events + faith formation / sacramental prep).

---

## 1. Before you launch (your checklist)

| # | What | Why |
|---|---|---|
| 1 | **Create a private R2 bucket** (no public access) and set `R2_PRIVATE_BUCKET_NAME`. It uses the same R2 account and keys as today. | Lux documents only ever go to private storage. Until the bucket exists, Lux turns document uploads off and shows staff a banner. Families can still register. Safe Environment certificates and letters fall back to the public bucket and log an error. |
| 2 | **Move existing certificates and letters:** `npx tsx scripts/move-sensitive-files-private.ts` (dry run), then `DRY_RUN=false`. Add `DELETE_PUBLIC=true` to remove the public copies once you've checked. | Files uploaded before the fix still have permanent public links. |
| 3 | **Lux sending address:** emails go from `lux@chirhoevents.com` by default. To use another address, set `RESEND_LUX_FROM_EMAIL`. It must be on a domain verified in Resend (chirhoevents.com already is). | Family emails show as "St. Mary Parish via Lux". Replies go to the parish's contact email. |
| 4 | **Set `CRON_SECRET`** in Vercel if it isn't already. | The daily retention job deletes files, so in production it refuses to run without it. |
| 5 | **Deploy.** `scripts/build.sh` pushes the schema and runs the one-time grandfathering automatically. | Every org that exists at deploy time keeps the full Events portal (`events: true`). Orgs created later get their tier's defaults. |
| 6 | **Try it on a preview.** Create a Chapel test org from the master admin board, open it, then set up a program and an event. Register a family from `/lux/<slug>` in a private window, upload a document, request a family link, and record an office payment. | End-to-end check with real Clerk, Stripe test mode and email. |
| 7 | **Logo:** replace the placeholder sun mark in `src/components/lux/LuxLogo.tsx` (dashboard, public pages, homepage) and in the header of `luxEmailLayout` in `src/lib/lux/email.ts` (emails). | Placeholder until your Lux logo is ready. |

---

## 2. Decisions

| Topic | Decision |
|---|---|
| What Lux is | The parish product: simple events and sign-ups, plus faith formation and sacrament registration. |
| Chapel / Parish | Lux only, no full Events portal. **Chapel: 5 simple events a year. Parish: 10.** Programs are unlimited. No people-per-year cap. |
| Bigger plans | Full Events portal. Lux is **off by default** and turned on per org from the master admin board. |
| Limits | Adjustable per org on the master admin edit page (blank = plan default, -1 = unlimited). |
| Existing orgs | Grandfathered: they keep the full Events portal. |
| Who sees documents and fee assistance | Everyone logged in for the parish (org admin, managers, staff). The `staff` role is view-only. Event-volunteer roles and group leaders can't. Every document view, status change and delete is logged. |
| Document storage | Kept until the parish deletes them. Optional per-program auto-delete (1, 2 or 5 years after upload). Viewing links last 5 minutes; the files don't expire. |
| Email | Family-facing Lux email comes from Lux. Account, billing and support email stays ChiRho Events. |
| Fees | Per-program tuition and extra fees. Parish-wide sibling discount (amount or %, optional separate third-child value) and family maximum per term. Programs can opt out of either. |

---

## 3. How it works

### Plans and gating
* `src/lib/subscription-tiers.ts`: `features.lux`, `features.events` and `luxSimpleEventsPerYear` per tier. `resolveModuleAccess` returns `lux` and `events` alongside poros/salve/rapha, with per-org overrides (`sanitizeModuleOverrides`).
* The simple-event limit is counted per subscription year (published simple events only). Full-event limits count `mode: 'full'` only.
* Creating or duplicating a full event returns 403 when the `events` module is off.

### Routing
* `resolveLandingDashboard` (`src/lib/lux/routing.ts`): Lux-only orgs land on `/dashboard/lux`. Orgs with both land on the last dashboard used, with a switcher in both headers.
* The admin layout sends Lux-only orgs to the Lux equivalent (settings and support keep their path and query string).

### Simple events
* Real `Event` rows with `mode = 'simple'`, so registrations, payments, the Stripe webhook, refunds and exports reuse existing tables.
* `EventTicketOption` provides ticket types with per-ticket limits. Capacity is decremented atomically by head count (`ticketQuantity`).
* Public page: `/events/[slug]` renders `SimpleEventPublicPage`. Registration closes at the event's start (time-zone aware) unless set otherwise.
* "Convert to full event" flips `mode` (needs the `events` module; otherwise an upgrade message).

### Programs and families
* Templates: Faith Formation, First Communion, Confirmation, Custom (`program-templates.ts`), copied into the program and editable.
* Parish page `/lux/[orgSlug]` lists open programs and upcoming events. `/lux/[orgSlug]/register` is one form for every child, with each child in any program.
* `registerFamily` (`family-registration.ts`) validates against each program (grades, required questions, sponsor), locks program rows (`FOR UPDATE`) for capacity, creates the household, children, order, registrations and document checklist, and reuses an approved document already on file for the same child.
* Someone who isn't signed in but uses an email already on file joins that household, but can't change its details and gets access to that one order only.

### Fees and payments
* `calculateFamilyFees` (`family-fees.ts`, all cents): the most expensive child pays full; the discount applies per child; children and charges already registered that term count toward siblings and the cap.
* Card: Stripe Connect destination charge with the standard platform fee. The webhook's `lux_order` branch marks the order paid. Expired checkouts give spots back unless a newer checkout is open.
* Office: registered immediately (`office_pending`). Staff record cash, check or card at the office (`recordOrderOfficePayment`), and the family gets a Lux receipt.
* Fee assistance: staff reduce, waive or decline (`decideOrderFees`), or adjust any order's amount due. Any card checkout left open is closed first, so families can't pay a stale amount.

### Documents
* Stored as `r2-private://` references with random keys. Uploads are PDF or images up to 10 MB. Staff uploads are approved immediately.
* Staff open files via `/api/lux/documents/[id]/view`, which checks access, logs the view, and returns a 5-minute signed URL.
* Families can upload and see status, but can't download.
* The Documents page has To review, Parish lookups, Missing and Approved tabs, plus bulk reminders with a sign-in link.
* Deleting a family's documents, or the retention job, keeps approved ones marked approved. Deleting a single bad file asks the family for it again.

### Family sign-in
* Magic links: 32 random bytes, sha256 stored, single use, 30 minutes when requested and 7 days in emails.
* Rate limits are DB-backed: 10 per IP per hour and 3 per household per hour. Responses are constant in content and timing, so they never reveal whether an email exists.
* Sessions use an httpOnly `lux_family` cookie (random token, hash stored, 4 hours), scoped to the whole household or a single order.
* The family page (`/lux/[orgSlug]/family`) shows documents, balance due with a pay link, children and programs, editable contact and health details, and a link to register for this year.

### Retention and housekeeping
* `/api/cron/lux-retention` runs daily (`vercel.json`). It deletes files past each program's retention setting, clears expired links and sessions, and prunes old rate-limit rows.

### Security fixes that shipped first
* Clerk tokens are verified (signature, expiry, session) everywhere a bearer token or cookie was trusted: the shared helper used by most admin APIs, and 17 routes that had their own unchecked copy.
* Safe Environment certificates and letters of good standing moved to private storage, opened through `/api/secure-files` after a login check.

---

## 4. Where things live

| Area | Files |
|---|---|
| Staff pages | `src/app/dashboard/lux/`: Home, Programs & Events, Registrations, Households, Documents, Payments, Exports, Settings, Support |
| Staff APIs | `src/app/api/lux/`: `overview`, `events`, `programs`, `registrations`, `households`, `orders`, `documents`, `payments`, `reminders`, `exports`, `settings`, `context` |
| Public pages | `src/app/lux/[orgSlug]/` (parish page, register, registered, pay, family), `src/app/lux/registered/`, `src/app/lux/link-expired/`, `src/app/events/[eventId]` (simple mode) |
| Public APIs | `src/app/api/lux/public/` (event register, quote, family register, family link/enter/logout, documents, details, order pay) |
| Libraries | `src/lib/lux/` |
| Components | `src/components/lux/`, `src/components/lux/public/` |
| Help docs | `src/app/docs/lux-docs.tsx` (Lux for Parishes and For Parish Families sections) |
| Marketing | `src/app/page.tsx` (Lux section, pricing, FAQ), `src/app/features/page.tsx`, `src/app/get-started/page.tsx`, `src/emails/org-admin-onboarding.ts` |

---

## 5. Tests

Plain `tsx` scripts. The Lux ones need a throwaway Postgres database:

```
DATABASE_URL=postgresql://... npx tsx tests/lux/simple-events.test.ts
DATABASE_URL=postgresql://... npx tsx tests/lux/family-fees.test.ts
DATABASE_URL=postgresql://... npx tsx tests/lux/family-registration.test.ts
DATABASE_URL=postgresql://... npx tsx tests/lux/staff-operations.test.ts
npx tsx tests/security/verify-clerk-token.test.ts
npx tsx tests/security/sensitive-files.test.ts
```

They cover:
* Routing and grandfathering.
* Simple-event limits, pricing, capacity and editing rules.
* Fee math, including discounts, the cap and registrations made on different days.
* Two children in two programs under one household.
* What an unverified email can and can't do.
* Document upload permissions and reuse.
* Magic links: single use and expiry.
* Order payments and expiry.
* Fee assistance decisions and office payments.
* Document deletion and retention.
* Token verification and private file storage.

---

## 6. Not built yet (possible follow-ups)

* **Refunds for faith formation orders** from the Lux dashboard. Simple-event refunds use the existing refund flow; for program orders, refund in Stripe and adjust the amount due in Lux.
* **Staff entering a registration for a walk-in family.** For now staff can fill in the public form at the office, choose "pay at the office", and record the payment.
* **Installments.** Out of scope per the spec.
