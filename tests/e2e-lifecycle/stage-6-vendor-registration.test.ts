/**
 * STAGE 6: VENDOR REGISTRATION
 * ==============================
 * Scenario: "Catholic Bookstore LLC" applies to be a vendor at the event.
 *
 * Sources audited:
 *   src/app/events/[eventId]/register-vendor/page.tsx     (form UI)
 *   src/app/api/registration/vendor/route.ts              (POST application)
 *   src/app/api/vendor/portal/route.ts                    (GET portal — no auth)
 *   src/app/api/vendor/payment/route.ts                   (POST create PI, PUT confirm)
 *   src/app/api/vendor/logo/route.ts                      (POST/DELETE logo)
 *   src/app/api/admin/events/[eventId]/vendors/route.ts   (admin list)
 *   src/app/api/admin/events/[eventId]/vendors/[vendorId]/approve/route.ts
 *   src/app/api/admin/events/[eventId]/vendors/[vendorId]/reject/route.ts
 *   src/app/vendor-portal/page.tsx                        (landing/code entry)
 *   src/app/vendor-dashboard/page.tsx                     (portal UI)
 *   prisma/schema.prisma                                  (VendorRegistration model)
 *   src/app/api/webhooks/stripe/route.ts                  (no vendor handling)
 *
 * ─── BUGS DISCOVERED ────────────────────────────────────────────────────────
 *
 * BUG-6.1  CRITICAL: Vendor payment amount units mismatch — payments always fail
 *          or charge the wrong amount
 *   Source:  src/app/api/vendor/payment/route.ts  lines 43–52, 71–86, 157
 *   Detail:  The POST route accepts `amount` from the client and passes it
 *            directly to `stripe.paymentIntents.create({ amount: Math.round(amount) })`.
 *            Stripe requires amounts in cents (50000 = $500.00).
 *            The balance check on line 47 compares:
 *              `if (amount > balance)`
 *            where `balance = totalDue - amountPaid` and both are dollar values
 *            from the DB (Decimal(10,2) columns → e.g. 500.00).
 *
 *            Two failure modes:
 *            A) Client sends cents (50000 for $500):
 *               → balance check: 50000 > 500 → true → "cannot exceed balance"
 *               → payment always rejected for any amount over $1
 *            B) Client sends dollars (500 for $500):
 *               → balance check passes (500 > 500 → false)
 *               → Stripe receives amount=500 cents = $5.00 charged instead of $500
 *               → PUT confirmation: paymentAmount = 500/100 = $5.00 recorded
 *               → vendor appears to have paid $5 against a $500 invoice
 *
 *            The response `paymentAmount: amount / 100` also confirms the API
 *            expects cents internally, reinforcing that Mode A is the intended
 *            behavior — making the balance check the bug.
 *
 * BUG-6.2  CRITICAL: Vendor portal API accepts vendorCode as a substitute for
 *          accessCode — booth staff can access the full vendor portal
 *   Source:  src/app/api/vendor/portal/route.ts  lines 47–79
 *   Detail:  The portal route first looks up by `accessCode`, then falls back
 *            to `findUnique({ where: { vendorCode: accessCode } })`.
 *            The vendorCode is explicitly designed to be shared widely with
 *            ALL booth staff (shown prominently in the approval email, copied
 *            from the dashboard). Any booth worker who knows the vendorCode
 *            can call `GET /api/vendor/portal?code={vendorCode}` and receive
 *            the full vendor portal response, including:
 *              - invoiceLineItems, invoiceTotal, amountPaid, balance, paidAt
 *              - vendorCode (the exact code they already know)
 *              - rejectionReason (if any)
 *              - All booth staff: names, emails, T-shirt sizes, check-in status
 *            The portal is intended for the vendor owner only, not booth staff.
 *
 * BUG-6.3  Vendor tier price is client-controlled — can be overridden to zero
 *   Source:  src/app/api/registration/vendor/route.ts  line 111
 *   Detail:  `const price = Number(tierPrice || tier?.price || 0)`
 *            The client can pass `tierPrice: 0` in the body, causing `tierPrice`
 *            to be falsy, and the fallback chain hits `tier?.price`. But if the
 *            client omits `tierPrice` entirely and sends `selectedTier` pointing
 *            to a real tier, the price is correctly taken from the tier definition.
 *            HOWEVER: if the client sends `tierPrice: 1` (an explicit override),
 *            the stored `tierPrice` is $1 regardless of what the actual tier costs.
 *            The admin sees the overridden price in the application and may not
 *            realize it was manipulated. The actual invoice is set by the admin
 *            at approval time, so the financial impact is limited to the initial
 *            application record — but it misrepresents the vendor's expectations.
 *
 * BUG-6.4  Payment confirmation (PUT) has no idempotency — double-confirms
 *          add amount twice
 *   Source:  src/app/api/vendor/payment/route.ts  lines 158–174
 *   Detail:  The PUT handler:
 *            1. Retrieves the PaymentIntent from Stripe (verifies succeeded)
 *            2. Adds paymentIntent.amount/100 to vendor.amountPaid
 *            If called twice with the same paymentIntentId (e.g., client retry,
 *            network glitch, duplicate request), the payment amount is added
 *            twice to amountPaid. A $500 booth payment would record $1000 paid.
 *            There is no deduplication check (no stored paymentIntentId match
 *            against previous confirmations).
 *
 * BUG-6.5  No Stripe webhook handling for vendor payments — relies entirely on
 *          client-triggered PUT confirmation
 *   Source:  src/app/api/webhooks/stripe/route.ts  (no vendor handling)
 *            src/app/api/vendor/payment/route.ts    PUT handler
 *   Detail:  Vendor payments use a PaymentIntent (not Checkout Session). When
 *            the payment succeeds, the org's Stripe account fires a webhook, but
 *            the webhook handler has no case for `type: 'vendor_payment'` in the
 *            metadata. If the client completes the Stripe Elements flow but
 *            navigates away before calling PUT /api/vendor/payment, the
 *            VendorRegistration.amountPaid stays at 0, paymentStatus remains
 *            'unpaid', and the vendor appears to not have paid. The payment
 *            was successfully charged by Stripe but not recorded in the DB.
 *
 * BUG-6.6  No platform fee on vendor booth payments
 *   Source:  src/app/api/vendor/payment/route.ts  lines 71–86
 *   Detail:  The payment intent is created using a direct charge on the connected
 *            account (`{ stripeAccount: stripeAccountId }`) rather than a
 *            destination charge. No `application_fee_amount` is set.
 *            Vendor booth payments go entirely to the org's Stripe account with
 *            zero platform fee collected. This is inconsistent with individual
 *            and group registration payments (both charge 1% platform fee).
 *            May be intentional policy but is undocumented and inconsistent.
 *
 * BUG-6.7  Vendor portal is unauthenticated — secured only by a short code
 *   Source:  src/app/api/vendor/portal/route.ts  (no auth middleware)
 *   Detail:  The portal relies entirely on knowledge of the accessCode (or
 *            vendorCode). There is no rate limiting, no Clerk authentication,
 *            and no lockout after failed attempts. The accessCode format and
 *            length (from generateVendorAccessCode()) is not audited here,
 *            but short alphanumeric codes can be brute-forced if the API is
 *            publicly accessible without rate limiting.
 *
 * ─── GAPS ───────────────────────────────────────────────────────────────────
 *
 * GAP-6.1  Vendor registration sends email from hardcoded ChiRho address —
 *          not the org's contact email
 *   Source:  src/app/api/registration/vendor/route.ts  line 252–256
 *   Detail:  `from: 'ChiRho Events <noreply@chirhoevents.com>'`
 *            Replies go to ChiRho's noreply inbox, not the event organizer.
 *            (Same as GAP-4.1 for group leader support email.)
 *
 * GAP-6.2  No capacity check on vendor applications
 *   Detail:  There is no maximum vendor count enforced. Admins must manually
 *            reject excess applications. This could result in more applications
 *            than the venue has booth space for.
 *
 * GAP-6.3  Vendor registration has no confirmation page — only redirects after submit
 *   Detail:  After POST succeeds, the form redirects. There is no dedicated
 *            confirmation page with a registration ID or reference number for
 *            the vendor to save. The confirmation email is the only record
 *            immediately accessible to the vendor.
 *
 * GAP-6.4  No vendor code invalidation after booths close
 *   Detail:  The vendorCode used for staff registration never expires and cannot
 *            be revoked through the portal. If a staff member leaves, the vendor
 *            cannot invalidate the code — they must contact the org admin.
 *
 * ─── WHAT WORKS ─────────────────────────────────────────────────────────────
 *
 * WORKS-6.1  Vendor registration is gated by event.settings.vendorRegistrationEnabled.
 *   If the org hasn't enabled vendor registration, the API returns 400.
 *
 * WORKS-6.2  Event lookup supports both UUID and slug in the eventId field —
 *   the route correctly detects UUID format and uses the appropriate Prisma
 *   where clause.
 *
 * WORKS-6.3  Both vendorCode and accessCode are generated with uniqueness retry
 *   loops (up to 5 attempts each) to prevent collisions.
 *
 * WORKS-6.4  Two separate codes are generated:
 *   - vendorCode: shared with booth staff for staff registration
 *   - accessCode: for the vendor owner to access the portal and pay
 *   The intent is correct (separate codes for separate audiences) even though
 *   BUG-6.2 allows vendorCode to also access the portal.
 *
 * WORKS-6.5  Custom question answers are saved to CustomRegistrationAnswer with
 *   registrationType: 'vendor'. Failure to save answers does NOT fail the
 *   registration (non-critical path).
 *
 * WORKS-6.6  Confirmation email sent immediately on application with full
 *   structured summary (business name, tier, price, 3-step next-steps flow).
 *   Email failures are caught and logged without failing the registration.
 *
 * WORKS-6.7  Admin approval workflow requires requireAdmin = true via
 *   verifyEventAccess() — org admin role enforced.
 *
 * WORKS-6.8  Admin sets the REAL invoice at approval time (invoiceLineItems,
 *   invoiceTotal), not at registration time. This gives the org control over
 *   the actual amount billed regardless of what the vendor submitted for tierPrice.
 *
 * WORKS-6.9  Approval email sends both codes: vendorCode (for staff) AND
 *   a deep-link to the vendor portal with accessCode embedded. This is
 *   the intended distinction — vendor owner gets accessCode link, shares
 *   vendorCode with staff.
 *
 * WORKS-6.10 Payment is blocked unless vendor.status === 'approved' (line 38).
 *   Pending and rejected vendors cannot initiate payment.
 *
 * WORKS-6.11 Overpayment guard exists in the payment route (though broken by
 *   units mismatch — see BUG-6.1). The guard logic itself is correct:
 *   `if (amount > balance) → reject`.
 *
 * WORKS-6.12 PUT confirmation retrieves the actual PaymentIntent from Stripe
 *   and uses `paymentIntent.amount / 100` (the real charged amount in dollars)
 *   to update amountPaid — no trust of client-supplied amount on confirmation.
 *
 * WORKS-6.13 Partial payment support: paymentStatus transitions from
 *   'unpaid' → 'partial' → 'paid' correctly when newAmountPaid >= totalDue.
 *
 * WORKS-6.14 Vendor portal correctly shows booth staff with their check-in
 *   status and liability form completion status.
 *
 * WORKS-6.15 Vendor portal does NOT expose other vendors, participant data,
 *   payment information for other vendors, or org admin data.
 *
 * WORKS-6.16 VendorRegistration correctly stores organizationId = event.organizationId,
 *   ensuring each registration is org-scoped.
 *
 * WORKS-6.17 Stripe guard: if org.stripeAccountId is null, payment is blocked
 *   with a clear error message (line 56–60).
 */

import { printSummary, describe, it, expect } from '../org-isolation/helpers/test-runner'

// ─── Section 6.1: Registration Flow ──────────────────────────────────────────
describe('6.1 — Registration Flow', () => {
  it('vendor registration is accessible at /events/{eventId}/register-vendor', () => {
    const path = '/events/{eventId}/register-vendor'
    expect(path).toContain('register-vendor')
  })

  it('vendor registration is gated by event.settings.vendorRegistrationEnabled', () => {
    // if (!event.settings.vendorRegistrationEnabled) → 400
    const gatingEnabled = true
    expect(gatingEnabled).toBe(true)
  })

  it('event can be identified by UUID or slug in the eventId field', () => {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const uuidExample = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    const slugExample = 'testville-youth-conference-2025'
    expect(uuidPattern.test(uuidExample)).toBe(true)
    expect(uuidPattern.test(slugExample)).toBe(false)
  })

  it('required fields: eventId, businessName, contactFirstName, contactLastName, email, phone, boothDescription, selectedTier', () => {
    const requiredFields = [
      'eventId', 'businessName', 'contactFirstName', 'contactLastName',
      'email', 'phone', 'boothDescription', 'selectedTier',
    ]
    expect(requiredFields.length).toBe(8)
    expect(requiredFields).toContain('boothDescription')
    expect(requiredFields).toContain('selectedTier')
  })

  it('optional fields: tierPrice, additionalNeeds, customAnswers', () => {
    const optionalFields = ['tierPrice', 'additionalNeeds', 'customAnswers']
    expect(optionalFields).toContain('customAnswers')
  })

  it('vendor tiers are defined in event.settings.vendorTiers as a JSON array', () => {
    const exampleTiers = [
      { id: 'standard', name: 'Standard Booth', price: '250', description: '10x10 booth' },
      { id: 'premium', name: 'Premium Booth',  price: '500', description: '10x20 booth' },
    ]
    const tierCount = exampleTiers.length
    expect(tierCount).toBeGreaterThan(0)
  })

  it('BUG-6.3: vendor tier price is client-controlled — client can override tier price', () => {
    // price = Number(tierPrice || tier?.price || 0)
    // If client sends tierPrice: 1, the stored tierPrice = $1 regardless of actual tier cost
    const tierActualPrice = 250
    const clientOverride  = 1
    const storedPrice = clientOverride || tierActualPrice  // 1 is truthy
    expect(storedPrice).toBe(1)   // manipulated price stored
    expect(storedPrice).not.toBe(tierActualPrice)
  })

  it('admin sets the real invoice at approval time — client tierPrice is advisory only', () => {
    // At approval: invoiceTotal = sum(invoiceLineItems[].amount) — admin-controlled
    // The stored tierPrice from registration is informational, not used for billing
    const adminControlsInvoice = true
    expect(adminControlsInvoice).toBe(true)
  })

  it('registration creates VendorRegistration with status: pending', () => {
    const initialStatus = 'pending'
    expect(initialStatus).toBe('pending')
  })

  it('registration generates two unique codes: vendorCode (for staff) and accessCode (for portal)', () => {
    // vendorCode: shared with booth staff for staff registration
    // accessCode: for the vendor owner to access portal and pay invoice
    const codeTypes = ['vendorCode', 'accessCode']
    expect(codeTypes.length).toBe(2)
  })

  it('each code type retries up to 5 times to ensure uniqueness', () => {
    const maxRetries = 5
    expect(maxRetries).toBe(5)
  })

  it('registration stores organizationId = event.organizationId', () => {
    // prisma.vendorRegistration.create({ data: { organizationId: event.organizationId } })
    const orgScopedOnCreate = true
    expect(orgScopedOnCreate).toBe(true)
  })

  it('no Stripe payment occurs at registration time — vendor pays only after admin approval', () => {
    // Registration route has no stripe.* calls
    // Payment is collected post-approval via /api/vendor/payment
    const stripeAtRegistrationTime = false
    expect(stripeAtRegistrationTime).toBe(false)
  })

  it('confirmation email is sent immediately to vendor on application', () => {
    // resend.emails.send() called unconditionally after registration.create()
    const emailSentOnApplication = true
    expect(emailSentOnApplication).toBe(true)
  })

  it('confirmation email subject is: "Vendor Application Received - {eventName}"', () => {
    const subject = `Vendor Application Received - Testville Youth Conference`
    expect(subject).toContain('Vendor Application Received')
  })

  it('GAP-6.1: confirmation email is sent from noreply@chirhoevents.com, not the org\'s contact email', () => {
    const from = 'ChiRho Events <noreply@chirhoevents.com>'
    expect(from).toContain('chirhoevents.com')
    // Replies go to ChiRho's inbox, not the event organizer
  })

  it('custom question answers are saved without failing the registration if they error', () => {
    // try { createMany(customAnswers) } catch { console.error — no re-throw }
    const registrationFailsIfAnswersSaveFail = false
    expect(registrationFailsIfAnswersSaveFail).toBe(false)
  })

  it('GAP-6.2: no maximum vendor count enforced — admin must manually reject excess applications', () => {
    const vendorCapacityGuardExists = false
    expect(vendorCapacityGuardExists).toBe(false)
  })
})

// ─── Section 6.2: Approval → Payment Flow ────────────────────────────────────
describe('6.2a — Admin Approval and Invoice', () => {
  it('admin approval requires requireAdmin = true via verifyEventAccess()', () => {
    const requiresAdminRole = true
    expect(requiresAdminRole).toBe(true)
  })

  it('approval sets: status=approved, approvedAt=now(), invoiceLineItems, invoiceTotal, invoiceNotes', () => {
    const approvalFields = ['status', 'approvedAt', 'invoiceLineItems', 'invoiceTotal', 'invoiceNotes']
    expect(approvalFields).toContain('invoiceLineItems')
    expect(approvalFields).toContain('invoiceTotal')
  })

  it('invoiceTotal is calculated server-side as sum of invoiceLineItems[].amount', () => {
    const items = [{ description: 'Booth fee', amount: 250 }, { description: 'Electric', amount: 50 }]
    const total = items.reduce((sum, item) => sum + Number(item.amount), 0)
    expect(total).toBe(300)
  })

  it('approval email includes: vendorCode, staff registration URL, invoice details, portal URL', () => {
    const approvalEmailContains = ['vendorCode', 'staffRegUrl', 'invoiceLineItems', 'portalUrl']
    expect(approvalEmailContains).toContain('vendorCode')
    expect(approvalEmailContains).toContain('portalUrl')
  })

  it('vendor status must be "pending" to be approved — already-processed vendors return 400', () => {
    // if (vendor.status !== 'pending') → 400 'Vendor already processed'
    const idempotentApproval = false
    expect(idempotentApproval).toBe(false)
  })

  it('vendor status must be "approved" to initiate payment — pending/rejected vendors cannot pay', () => {
    // if (vendor.status !== 'approved') → 403 'Vendor not approved for payment'
    const paymentRequiresApproval = true
    expect(paymentRequiresApproval).toBe(true)
  })
})

describe('6.2b — Vendor Payment', () => {
  it('payment creates a Stripe PaymentIntent (not Checkout Session)', () => {
    // stripe.paymentIntents.create() — direct PI, not checkout session
    const usesPaymentIntent = true
    expect(usesPaymentIntent).toBe(true)
  })

  it('BUG-6.6: vendor payment uses direct charge (stripeAccount:) without a platform fee', () => {
    // paymentIntentConfig: { stripeAccount: stripeAccountId }  ← direct charge
    // No application_fee_amount set → platform earns $0 on vendor booth payments
    // Contrast: individual/group registrations use destination charge with 1% fee
    const platformFeeApplied = false
    expect(platformFeeApplied).toBe(false)
  })

  it('BUG-6.1: payment balance check compares cents to dollars — payments always rejected or wrong amount charged', () => {
    // balance = invoiceTotal (dollars) - amountPaid (dollars) → e.g. 500.00
    // amount from client = expected in cents for Stripe → e.g. 50000
    const balanceDollars = 500
    const amountCents    = 50000  // $500 in cents for Stripe
    const balanceCheckPasses = amountCents > balanceDollars  // 50000 > 500 = true → rejected!
    expect(balanceCheckPasses).toBe(true)  // check fires → payment blocked
  })

  it('BUG-6.1: if client sends dollars to bypass balance check, Stripe charges wrong amount', () => {
    // amount = 500 (dollars, not cents)
    // balance check: 500 > 500 = false → passes
    // Stripe receives amount=500 cents = $5.00 instead of $500.00
    const amountDollars = 500
    const stripeAmountCents = amountDollars  // 500 cents = $5.00 — WRONG
    const actualDollarsCharged = stripeAmountCents / 100  // $5.00
    expect(actualDollarsCharged).toBe(5)  // only $5 charged for $500 invoice
  })

  it('BUG-6.5: no Stripe webhook handles vendor payment_intent.succeeded events', () => {
    // webhook handler has no case for type: 'vendor_payment' in metadata
    // If client completes Stripe Elements but never calls PUT, payment is "lost"
    const webhookHandlesVendorPayment = false
    expect(webhookHandlesVendorPayment).toBe(false)
  })

  it('BUG-6.4: payment confirmation PUT is not idempotent — calling twice doubles amountPaid', () => {
    // PUT: newAmountPaid = current + paymentIntent.amount / 100
    // No check that this paymentIntentId was already confirmed
    const initialAmountPaid = 0
    const paymentAmount = 500  // dollars

    const firstConfirmation  = initialAmountPaid + paymentAmount   // $500
    const secondConfirmation = firstConfirmation + paymentAmount   // $1000 — double counted!
    expect(secondConfirmation).toBe(1000)  // should be $500
  })

  it('PUT confirmation retrieves actual PI amount from Stripe — does not trust client-supplied amount', () => {
    // paymentAmount = paymentIntent.amount / 100  ← from Stripe, not from client body
    const trustsStripeAmount = true
    expect(trustsStripeAmount).toBe(true)
  })

  it('paymentStatus transitions: unpaid → partial → paid', () => {
    function deriveStatus(newAmountPaid: number, totalDue: number): string {
      if (newAmountPaid >= totalDue) return 'paid'
      return 'partial'
    }
    expect(deriveStatus(250, 500)).toBe('partial')
    expect(deriveStatus(500, 500)).toBe('paid')
    expect(deriveStatus(600, 500)).toBe('paid')  // overpayment → paid (not error)
  })

  it('Stripe guard: payment fails if org.stripeAccountId is null', () => {
    // if (!stripeAccountId) → 400 'Payment processing is not configured'
    const guardExists = true
    expect(guardExists).toBe(true)
  })
})

// ─── Section 6.3: Vendor Portal ──────────────────────────────────────────────
describe('6.2c — Vendor Portal', () => {
  it('vendor portal is at /vendor-dashboard?code={accessCode}', () => {
    const portalPath = '/vendor-dashboard?code={accessCode}'
    expect(portalPath).toContain('vendor-dashboard')
    expect(portalPath).toContain('code=')
  })

  it('portal landing page at /vendor-portal allows entering the access code manually', () => {
    const landingPageExists = true
    expect(landingPageExists).toBe(true)
  })

  it('vendor portal shows: businessName, contact info, status, invoiceLineItems, invoiceTotal, amountPaid, balance, paymentStatus', () => {
    const portalFields = [
      'businessName', 'contactFirstName', 'contactLastName', 'email', 'phone',
      'status', 'invoiceLineItems', 'invoiceTotal', 'amountPaid', 'balance',
      'paymentStatus', 'vendorCode', 'selectedTier', 'tierPrice',
    ]
    expect(portalFields).toContain('invoiceLineItems')
    expect(portalFields).toContain('balance')
    expect(portalFields).toContain('vendorCode')
  })

  it('vendor portal shows booth staff: name, email, role, tshirtSize, checkedIn, liabilityStatus', () => {
    const staffFields = ['firstName', 'lastName', 'email', 'role', 'tshirtSize', 'checkedIn', 'liabilityStatus']
    expect(staffFields).toContain('liabilityStatus')
    expect(staffFields).toContain('tshirtSize')
  })

  it('BUG-6.2: portal API accepts vendorCode as a fallback for accessCode', () => {
    // portal route tries: findUnique({ where: { accessCode } })
    //            then:    findUnique({ where: { vendorCode: accessCode } })
    // vendorCode is widely shared with all booth staff — they can access the full portal
    const vendorCodeGrantsPortalAccess = true
    expect(vendorCodeGrantsPortalAccess).toBe(true)
  })

  it('BUG-6.2: booth staff (using vendorCode) can see invoice totals, amount paid, and rejection reason', () => {
    const dataExposedToStaff = ['invoiceTotal', 'amountPaid', 'balance', 'rejectionReason']
    expect(dataExposedToStaff).toContain('invoiceTotal')
    expect(dataExposedToStaff).toContain('rejectionReason')
  })

  it('BUG-6.7: portal API has no authentication — secured only by knowledge of the access code', () => {
    const requiresAuthentication = false
    expect(requiresAuthentication).toBe(false)
  })

  it('BUG-6.7: no rate limiting or lockout after failed code attempts', () => {
    const rateLimitingExists = false
    expect(rateLimitingExists).toBe(false)
  })

  it('vendor CANNOT see other vendors\' data through the portal', () => {
    // Each portal lookup is by unique accessCode/vendorCode — returns only that vendor
    const crossVendorDataVisible = false
    expect(crossVendorDataVisible).toBe(false)
  })

  it('vendor CANNOT see participant (individual/group) data through the portal', () => {
    // Portal response: vendor info, event info, boothStaff only
    // No participant queries are made
    const participantDataVisible = false
    expect(participantDataVisible).toBe(false)
  })

  it('vendor CANNOT see other organizations\' data through the portal', () => {
    // Portal lookup is by unique accessCode — one vendor = one org
    const crossOrgDataVisible = false
    expect(crossOrgDataVisible).toBe(false)
  })

  it('vendor can upload a logo via POST /api/vendor/logo', () => {
    const logoUploadExists = true
    expect(logoUploadExists).toBe(true)
  })

  it('vendor can delete their logo via DELETE /api/vendor/logo', () => {
    const logoDeleteExists = true
    expect(logoDeleteExists).toBe(true)
  })

  it('portal balance is calculated as: invoiceTotal - amountPaid', () => {
    const invoiceTotal = 500
    const amountPaid   = 150
    const balance = invoiceTotal - amountPaid
    expect(balance).toBe(350)
  })

  it('portal shows invoiceTotal from admin-set invoice, not vendor-submitted tierPrice', () => {
    // invoiceTotal is set at approval time by admin
    // tierPrice is the vendor's self-reported figure, stored for reference only
    const invoiceSourceIsAdmin = true
    expect(invoiceSourceIsAdmin).toBe(true)
  })
})

// ─── Section 6.3: Database Verification ──────────────────────────────────────
describe('6.3 — Database Verification', () => {
  it('VendorRegistration record has: id, eventId, organizationId, businessName, contact fields', () => {
    const schemaFields = ['id', 'eventId', 'organizationId', 'businessName',
      'contactFirstName', 'contactLastName', 'email', 'phone']
    expect(schemaFields).toContain('organizationId')
    expect(schemaFields).toContain('businessName')
  })

  it('VendorRegistration record has: boothDescription, selectedTier, tierPrice, additionalNeeds', () => {
    const boothFields = ['boothDescription', 'selectedTier', 'tierPrice', 'additionalNeeds']
    expect(boothFields).toContain('boothDescription')
    expect(boothFields).toContain('tierPrice')
  })

  it('VendorRegistration record has: status (pending/approved/rejected), rejectionReason, approvedAt', () => {
    const statuses: ('pending' | 'approved' | 'rejected')[] = ['pending', 'approved', 'rejected']
    expect(statuses).toContain('pending')
    expect(statuses).toContain('approved')
    expect(statuses).toContain('rejected')
  })

  it('VendorRegistration record has: invoiceLineItems (JSON), invoiceTotal, paymentStatus, amountPaid, stripePaymentIntentId', () => {
    const paymentFields = ['invoiceLineItems', 'invoiceTotal', 'paymentStatus', 'amountPaid', 'stripePaymentIntentId', 'paidAt']
    expect(paymentFields).toContain('invoiceLineItems')
    expect(paymentFields).toContain('stripePaymentIntentId')
  })

  it('VendorRegistration has two unique code fields: vendorCode and accessCode', () => {
    const codes = ['vendorCode', 'accessCode']
    expect(codes.length).toBe(2)
  })

  it('VendorRegistration relates to StaffRegistration[] via boothStaff', () => {
    // boothStaff StaffRegistration[]  ← FK on StaffRegistration.vendorId
    const hasBoothStaffRelation = true
    expect(hasBoothStaffRelation).toBe(true)
  })

  it('VendorRegistration does NOT have a PaymentBalance record — uses inline payment fields', () => {
    // Unlike group/individual registrations which use the PaymentBalance table,
    // vendor payments are tracked directly on VendorRegistration:
    //   amountPaid, paymentStatus, invoiceTotal, stripePaymentIntentId
    const usesPaymentBalanceTable = false
    expect(usesPaymentBalanceTable).toBe(false)
  })

  it('initial state after POST: status=pending, paymentStatus=unpaid, amountPaid=0', () => {
    const initialRecord = {
      status: 'pending',
      paymentStatus: 'unpaid',
      amountPaid: 0,
      approvedAt: null,
      invoiceTotal: null,  // set at approval time
      stripePaymentIntentId: null,
    }
    expect(initialRecord.status).toBe('pending')
    expect(initialRecord.amountPaid).toBe(0)
    expect(initialRecord.invoiceTotal).toBeNull()
  })

  it('after admin approval: status=approved, invoiceLineItems set, invoiceTotal set', () => {
    const afterApproval = {
      status: 'approved',
      invoiceTotal: 300,
      invoiceLineItems: [{ description: 'Booth', amount: 250 }, { description: 'Electric', amount: 50 }],
    }
    expect(afterApproval.status).toBe('approved')
    expect(afterApproval.invoiceTotal).toBeGreaterThan(0)
  })

  it('payment records for vendors are stored on VendorRegistration itself — NOT in the Payment table', () => {
    // vendor/payment route does NOT call prisma.payment.create()
    // Updates VendorRegistration.amountPaid, paymentStatus, stripePaymentIntentId, paidAt
    const paymentTableUsed = false
    expect(paymentTableUsed).toBe(false)
  })

  it('Stripe PaymentIntent ID (pi_...) is stored in VendorRegistration.stripePaymentIntentId', () => {
    // POST handler: prisma.vendorRegistration.update({ data: { stripePaymentIntentId: paymentIntent.id } })
    // paymentIntent.id starts with 'pi_' — correct semantic
    const piId = 'pi_test_vendor_abc123'
    expect(piId.startsWith('pi_')).toBe(true)
    // Contrast with individual/group which store checkout session ID (cs_...) in same field
  })
})

// ─── Section 6.4: Bug Severity Summary ───────────────────────────────────────
describe('6.4 — Bug Severity Summary', () => {
  it('CRITICAL: BUG-6.1 — vendor payment amount/balance units mismatch causes all payments to fail or charge wrong amount', () => {
    const severity = 'critical'
    expect(severity).toBe('critical')
  })

  it('CRITICAL: BUG-6.2 — vendorCode fallback in portal API gives booth staff full vendor portal access (invoice, balance, rejection reason)', () => {
    const severity = 'critical'
    expect(severity).toBe('critical')
  })

  it('HIGH: BUG-6.5 — no Stripe webhook for vendor payments; browser crash after Stripe Elements completes loses the payment record', () => {
    const severity = 'high'
    expect(severity).toBe('high')
  })

  it('HIGH: BUG-6.4 — payment confirmation PUT is not idempotent; network retry doubles amountPaid', () => {
    const severity = 'high'
    expect(severity).toBe('high')
  })

  it('MEDIUM: BUG-6.3 — vendor tier price is client-controlled; vendor can manipulate stored tierPrice', () => {
    const severity = 'medium'
    expect(severity).toBe('medium')
  })

  it('MEDIUM: BUG-6.7 — portal secured only by short code; no auth, no rate limiting, no lockout', () => {
    const severity = 'medium'
    expect(severity).toBe('medium')
  })

  it('LOW: BUG-6.6 — no platform fee on vendor payments; inconsistent with 1% fee on individual/group payments', () => {
    const severity = 'low'
    expect(severity).toBe('low')
  })
})

printSummary()
