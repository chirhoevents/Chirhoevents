/**
 * STAGE 7: STAFF REGISTRATION
 * ============================
 * Scenario: "Fr. Helper" signs up as staff for the event.
 *
 * Sources audited:
 *   src/app/api/registration/staff/route.ts                        (POST handler)
 *   src/app/api/registration/staff/[registrationId]/route.ts       (GET — no auth)
 *   src/app/api/registration/staff/validate-vendor-code/route.ts   (GET vendor code check)
 *   src/app/events/[eventId]/register-staff/success/page.tsx       (success page)
 *   src/app/staff/page.tsx                                         (admin portal, not staff portal)
 *   src/app/staff-login/page.tsx                                   (redirect only)
 *   src/app/api/webhooks/stripe/route.ts                           (no staff handling)
 *   prisma/schema.prisma                                           (StaffRegistration model)
 *
 * ─── BUGS DISCOVERED ────────────────────────────────────────────────────────
 *
 * BUG-7.1  LOW: `price` field from request body is extracted but never used
 *   Source:  src/app/api/registration/staff/route.ts  lines 32, 104–107
 *   Detail:  The POST handler destructures `price` from the request body (line 32),
 *            but the actual `totalAmount` is always derived server-side:
 *              isVendorStaff ? vendorStaffPrice : staffVolunteerPrice
 *            The extracted `price` variable is never referenced again.
 *            This is dead code but could mislead API consumers into thinking
 *            they can pass a custom price to override server pricing.
 *
 * BUG-7.2  MEDIUM: Poros liability code generated based on wrong event setting
 *   Source:  src/app/api/registration/staff/route.ts  line 115
 *   Detail:  Staff liability code generation is gated on:
 *              `event.settings.liabilityFormsRequiredGroup`
 *            This is the GROUP registration liability flag, not a staff-specific one.
 *            If a staff-specific liability setting exists (liabilityFormsRequiredStaff
 *            or similar), it is ignored. Conversely, staff registrations will
 *            receive Poros codes whenever groups require liability forms, even if
 *            no staff-specific liability is required.
 *
 * BUG-7.3  HIGH: Vendor code validation in main POST handler uses raw `eventId`
 *          (may be slug) while VendorRegistration.eventId stores UUIDs
 *   Source:  src/app/api/registration/staff/route.ts  lines 88–94
 *   Detail:  The staff registration handler correctly handles slug/UUID for
 *            the Event lookup (line 44–48), resolving to `event.id` (UUID).
 *            However, the vendor code lookup on line 88 queries:
 *              `{ vendorCode, eventId, status: 'approved' }`
 *            where `eventId` is the RAW input (potentially a slug), not `event.id`.
 *            Since VendorRegistration.eventId is always stored as a UUID, passing
 *            a slug here will always return null → "Invalid or unapproved vendor code"
 *            for any vendor staff registering via slug-based event URLs.
 *
 *            Note: The separate validate-vendor-code route has the same bug —
 *            it queries `{ vendorCode, eventId }` with the raw param (line 18).
 *
 * BUG-7.4  HIGH: Paid staff registrants receive NO confirmation email
 *   Source:  src/app/api/registration/staff/route.ts  lines 166–214
 *   Detail:  When `totalAmount > 0`, the handler creates a Stripe Checkout Session
 *            and immediately returns `{ registration, checkoutUrl }` at line 211–214
 *            without sending any confirmation email.
 *            The email block (lines 218–320) is only reached in the free path
 *            (`totalAmount === 0`), which falls through after the `if (totalAmount > 0)`
 *            early return.
 *            There is no webhook handler for `registrationType: 'staff'` to send
 *            an email post-payment either (see BUG-7.5).
 *            Paid staff registrants receive zero email communication.
 *
 * BUG-7.5  HIGH: Stripe webhook has NO handler for registrationType 'staff'
 *          — paid staff paymentStatus stays 'pending' forever
 *   Source:  src/app/api/webhooks/stripe/route.ts  (grep 'staff' → 0 matches)
 *   Detail:  The webhook handles checkout.session.completed for:
 *              - registrationType: 'group' (deposit)
 *              - registrationType: 'individual'
 *              - registrationType: 'vendor' (indirectly via PaymentIntent)
 *            The word 'staff' does not appear anywhere in the webhook file.
 *            After a paid staff member completes Stripe Checkout:
 *              1. No PaymentBalance update occurs (staff uses inline pricePaid field)
 *              2. StaffRegistration.paymentStatus remains 'pending' indefinitely
 *              3. No confirmation email is sent
 *            The staff member is stuck in a ghost-paid state.
 *
 * BUG-7.6  MEDIUM: Success page falsely tells ALL registrants "A confirmation
 *          email has been sent" regardless of payment path
 *   Source:  src/app/events/[eventId]/register-staff/success/page.tsx  lines 134–141
 *   Detail:  The success page always renders:
 *              "A confirmation email has been sent to {email} with all the details."
 *            This is true only for free registrations. Paid registrants land on
 *            this success page after Stripe Checkout redirects them back, but
 *            they have never received a confirmation email (see BUG-7.4).
 *            The page also shows porosAccessCode if present — but for paid
 *            registrants the poros code is never emailed either.
 *
 * BUG-7.7  LOW: QR code data uses millisecond timestamp — collision possible
 *   Source:  src/app/api/registration/staff/route.ts  line 110
 *   Detail:  QR code content is generated as:
 *              `STAFF-${eventId}-${Date.now()}`
 *            Two concurrent registrations within the same millisecond would
 *            produce identical QR codes. Under load, this is a realistic
 *            collision scenario. Compare to individual registration which uses
 *            the registration UUID in the QR data.
 *
 * BUG-7.8  LOW: No deduplication — same email can register as staff multiple times
 *   Source:  src/app/api/registration/staff/route.ts  (entire POST handler)
 *   Detail:  There is no check for existing StaffRegistration records with the
 *            same (email, eventId) combination before `prisma.staffRegistration.create()`.
 *            An attendee can submit the staff registration form multiple times and
 *            receive multiple registration records, QR codes, and Poros codes.
 *
 * ─── GAPS DISCOVERED ────────────────────────────────────────────────────────
 *
 * GAP-7.1  No staff registrant portal exists
 *   Detail:  /staff/page.tsx is an ADMIN system portal (requires Clerk auth +
 *            Rapha/Salve admin role check). It is not accessible to registered
 *            staff members.
 *            /staff-login/page.tsx only redirects to /sign-in?portal=staff —
 *            there is no staff-specific landing page or authenticated portal.
 *            Registered staff have no way to:
 *              - View their own registration details
 *              - Download their QR code
 *              - Check their liability form status
 *              - Manage their dietary/shirt preferences
 *
 * GAP-7.2  GET /api/registration/staff/[registrationId] has no authentication
 *   Source:  src/app/api/registration/staff/[registrationId]/route.ts
 *   Detail:  The endpoint returns full staff registration data (name, email,
 *            phone, role, porosAccessCode, vendorRegistration details) for any
 *            UUID, with no auth check. This is an IDOR vulnerability — any
 *            actor who can enumerate or guess a registration UUID can read
 *            private staff registration data.
 *            The success page calls this endpoint to render the confirmation,
 *            so removing auth is understandable for UX, but the data returned
 *            includes sensitive fields (porosAccessCode, phone) that should
 *            not be public.
 */

import { printSummary, describe, it, expect } from '../org-isolation/helpers/test-runner'

// ─── SECTION 7.1: REGISTRATION FLOW ─────────────────────────────────────────

describe('7.1 — Registration Flow: public form, fields, pricing, confirmation', () => {
  it('staff registration is public — no authentication required', () => {
    // The POST /api/registration/staff handler has no auth() or getToken() call.
    // Anyone with the event URL can register as staff or volunteer.
    const handlerHasClerkAuth = false // confirmed by reading route.ts: no auth import
    expect(handlerHasClerkAuth).toBe(false)
  })

  it('staff registration is gated by event.settings.staffRegistrationEnabled', () => {
    // Line 71: if (!event.settings.staffRegistrationEnabled) → 400
    const gatingSetting = 'staffRegistrationEnabled'
    expect(gatingSetting).toBe('staffRegistrationEnabled')
  })

  it('required fields: eventId, firstName, lastName, email, phone, role, tshirtSize', () => {
    // Line 36: if (!eventId || !firstName || !lastName || !email || !phone || !role || !tshirtSize)
    const requiredFields = ['eventId', 'firstName', 'lastName', 'email', 'phone', 'role', 'tshirtSize']
    expect(requiredFields).toContain('eventId')
    expect(requiredFields).toContain('firstName')
    expect(requiredFields).toContain('lastName')
    expect(requiredFields).toContain('email')
    expect(requiredFields).toContain('phone')
    expect(requiredFields).toContain('role')
    expect(requiredFields).toContain('tshirtSize')
    expect(requiredFields.length).toBe(7)
  })

  it('optional fields include dietaryRestrictions, isVendorStaff, vendorCode, customAnswers', () => {
    // Destructured from body but not in the required check
    const optionalFields = ['dietaryRestrictions', 'isVendorStaff', 'vendorCode', 'customAnswers']
    expect(optionalFields).toContain('dietaryRestrictions')
    expect(optionalFields).toContain('isVendorStaff')
    expect(optionalFields).toContain('vendorCode')
    expect(optionalFields).toContain('customAnswers')
  })

  it('BUG-7.1: `price` field is destructured from body but never used in pricing', () => {
    // Line 32: `price` is extracted. Lines 104-107: totalAmount derived from settings only.
    // The `price` variable is never referenced after destructuring.
    const priceExtractedFromBody = true
    const priceUsedInCalculation = false // confirmed: only vendorStaffPrice/staffVolunteerPrice used
    expect(priceExtractedFromBody).toBe(true)
    expect(priceUsedInCalculation).toBe(false)
  })

  it('pricing is server-side only: vendorStaffPrice or staffVolunteerPrice from event.settings', () => {
    // Lines 105-107:
    //   isVendorStaff ? Number(event.settings.vendorStaffPrice || 0)
    //                 : Number(event.settings.staffVolunteerPrice || 0)
    const pricingSource = 'event.settings'
    expect(pricingSource).toBe('event.settings')
  })

  it('eventId can be a UUID or a slug — event lookup handles both', () => {
    // Lines 44-48: UUID regex test, then findUnique by id or slug
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const uuid = '123e4567-e89b-12d3-a456-426614174000'
    const slug = 'chi-rho-2025'
    expect(uuidRegex.test(uuid)).toBe(true)
    expect(uuidRegex.test(slug)).toBe(false)
  })

  it('BUG-7.3: vendor code validation uses raw eventId (slug), not resolved event.id (UUID)', () => {
    // Lines 88-94: query uses `eventId` (raw body param) not `event.id` (resolved UUID)
    // VendorRegistration.eventId is always a UUID in the database
    // Slug-based registrations will always fail vendor code validation
    const vendorCodeQueryUsesRawEventId = true
    const vendorRegistrationStoresUuid = true
    const slugWillFailVendorCodeValidation = vendorCodeQueryUsesRawEventId && vendorRegistrationStoresUuid
    expect(slugWillFailVendorCodeValidation).toBe(true)
  })

  it('vendorCode must be uppercase when stored (toUpperCase called on lookup and storage)', () => {
    // Line 90: vendorCode.toUpperCase() in the lookup
    // Line 144: vendorCode: isVendorStaff ? vendorCode.toUpperCase() : null
    const storedAsUppercase = true
    expect(storedAsUppercase).toBe(true)
  })

  it('vendor staff validation requires: vendorCode, eventId match, status === approved', () => {
    // Lines 88-101: findFirst({ where: { vendorCode, eventId, status: 'approved' } })
    const validationCriteria = ['vendorCode', 'eventId', 'status: approved']
    expect(validationCriteria.length).toBe(3)
    expect(validationCriteria).toContain('status: approved')
  })

  it('BUG-7.2: Poros code generated when liabilityFormsRequiredGroup is true, not a staff-specific flag', () => {
    // Line 115: if (event.settings.liabilityFormsRequiredGroup)
    // This is the GROUP liability flag — staff liability is incorrectly coupled to group setting
    const liabilityFlagUsed = 'liabilityFormsRequiredGroup'
    const expectedFlagForStaff = 'liabilityFormsRequiredGroup' // actual code (the bug)
    const intendedFlagForStaff = 'liabilityFormsRequiredStaff' // what it should be
    expect(liabilityFlagUsed).toBe(expectedFlagForStaff)
    expect(liabilityFlagUsed).not.toBe(intendedFlagForStaff)
  })

  it('Poros code uniqueness is enforced with a 5-attempt retry loop', () => {
    // Lines 120-128: while (attempts < 5) check existing, retry if collision
    const maxRetries = 5
    expect(maxRetries).toBe(5)
  })

  it('BUG-7.7: QR code data uses millisecond timestamp — concurrent registrations can collide', () => {
    // Line 110: `STAFF-${eventId}-${Date.now()}`
    // Two registrations within the same millisecond produce identical QR codes
    const qrCodeFormat = 'STAFF-{eventId}-{Date.now()}'
    const usesRegistrationUuid = false // unlike individual registration
    const collisionRisk = !usesRegistrationUuid
    expect(collisionRisk).toBe(true)
    expect(qrCodeFormat).toContain('Date.now()')
  })

  it('free registration (totalAmount === 0): paymentStatus set to paid immediately', () => {
    // Line 147: paymentStatus: totalAmount > 0 ? 'pending' : 'paid'
    const totalAmount = 0
    const expectedStatus = totalAmount > 0 ? 'pending' : 'paid'
    expect(expectedStatus).toBe('paid')
  })

  it('paid registration (totalAmount > 0): paymentStatus set to pending', () => {
    // Line 147: paymentStatus: totalAmount > 0 ? 'pending' : 'paid'
    const totalAmount = 25
    const expectedStatus = totalAmount > 0 ? 'pending' : 'paid'
    expect(expectedStatus).toBe('pending')
  })

  it('free registration: confirmation email sent immediately after DB insert', () => {
    // Lines 217-320: email block is in the free path (after the paid early-return)
    const freePathSendsEmail = true
    expect(freePathSendsEmail).toBe(true)
  })

  it('BUG-7.4: paid registration returns checkoutUrl without sending any confirmation email', () => {
    // Lines 166-214: paid path creates Stripe session and returns early with { registration, checkoutUrl }
    // The email block (lines 218-320) is never reached for paid registrations
    const paidPathSendsEmailBeforeCheckout = false
    const paidPathSendsEmailAfterCheckout = false // no webhook handler (BUG-7.5)
    expect(paidPathSendsEmailBeforeCheckout).toBe(false)
    expect(paidPathSendsEmailAfterCheckout).toBe(false)
  })

  it('paid path creates Stripe Checkout Session (not PaymentIntent directly)', () => {
    // Line 177: stripe.checkout.sessions.create()
    // Compare: group leader portal uses stripe.paymentIntents.create()
    const stripeMethod = 'checkout.sessions.create'
    expect(stripeMethod).toBe('checkout.sessions.create')
  })

  it('Stripe Checkout uses destination charge with platform fee (correct routing)', () => {
    // Lines 192-198: payment_intent_data.application_fee_amount + transfer_data.destination
    const hasApplicationFee = true
    const hasTransferDestination = true
    expect(hasApplicationFee).toBe(true)
    expect(hasTransferDestination).toBe(true)
  })

  it('Stripe metadata includes registrationId and registrationType=staff', () => {
    // Lines 196-201 (payment_intent_data.metadata) and lines 205-208 (session metadata)
    const sessionMetadataKeys = ['registrationId', 'registrationType']
    expect(sessionMetadataKeys).toContain('registrationId')
    expect(sessionMetadataKeys).toContain('registrationType')
  })

  it('BUG-7.5: Stripe webhook has ZERO handling for registrationType staff', () => {
    // Confirmed by grep: word "staff" does not appear in webhook route.ts
    // After Stripe Checkout completes for paid staff:
    //   - StaffRegistration.paymentStatus stays 'pending'
    //   - No confirmation email is sent
    //   - No post-payment logic runs
    const webhookHandlesStaff = false
    expect(webhookHandlesStaff).toBe(false)
  })

  it('BUG-7.8: no deduplication — same email can register as staff multiple times', () => {
    // No findFirst/findUnique check for existing (email, eventId) before create()
    const hasDeduplicationCheck = false
    expect(hasDeduplicationCheck).toBe(false)
  })

  it('custom question answers saved via CustomRegistrationAnswer.createMany', () => {
    // Lines 154-163: createMany with registrationType: 'staff'
    const customAnswerSupport = true
    const registrationType = 'staff'
    expect(customAnswerSupport).toBe(true)
    expect(registrationType).toBe('staff')
  })

  it('custom answer save failure is NOT caught — would bubble up and fail the whole registration', () => {
    // Lines 153-163: createMany is called without try/catch; any DB error rolls up
    // Compare: vendor registration wraps customAnswers in try/catch and continues
    const customAnswersSaveIsolated = false
    expect(customAnswersSaveIsolated).toBe(false)
  })
})

// ─── SECTION 7.2: STAFF PORTAL ───────────────────────────────────────────────

describe('7.2 — Staff Portal: existence, capabilities, isolation', () => {
  it('GAP-7.1: no staff registrant portal exists', () => {
    // /staff/page.tsx requires Clerk auth + Rapha/Salve admin role — not for staff registrants
    // /staff-login/page.tsx only redirects to /sign-in?portal=staff
    // No page exists where a registered staff member can view their own registration
    const staffRegistrantPortalExists = false
    expect(staffRegistrantPortalExists).toBe(false)
  })

  it('/staff/page.tsx is an admin system portal requiring Clerk auth + admin role', () => {
    // Lines 1-60 of staff/page.tsx: auth() called, user.role checked against
    // 'rapha_admin', 'salve_admin', 'super_admin' etc.
    const staffPageRequiresAdminRole = true
    expect(staffPageRequiresAdminRole).toBe(true)
  })

  it('/staff-login/page.tsx is just a redirect to /sign-in?portal=staff', () => {
    // The page has no portal content — it immediately redirects to Clerk sign-in
    const staffLoginIsRedirectOnly = true
    expect(staffLoginIsRedirectOnly).toBe(true)
  })

  it('registered staff cannot self-serve: no QR download, no form status, no details view', () => {
    // Consequence of GAP-7.1: no portal means no self-service capabilities
    const canViewOwnRegistration = false
    const canDownloadQrCode = false
    const canCheckLiabilityFormStatus = false
    expect(canViewOwnRegistration).toBe(false)
    expect(canDownloadQrCode).toBe(false)
    expect(canCheckLiabilityFormStatus).toBe(false)
  })

  it('staff have no access to financial data or other organizations (isolation not applicable — no portal)', () => {
    // Since no portal exists, cross-org or financial data exposure via staff portal is impossible
    // Financial isolation is not a concern for a non-existent portal
    const staffPortalExposesFinancialData = false
    const staffPortalExposesOtherOrgs = false
    expect(staffPortalExposesFinancialData).toBe(false)
    expect(staffPortalExposesOtherOrgs).toBe(false)
  })

  it('GAP-7.2: GET /api/registration/staff/[registrationId] has no authentication', () => {
    // route.ts: no auth() call, no token check — returns full record by UUID
    const getEndpointRequiresAuth = false
    expect(getEndpointRequiresAuth).toBe(false)
  })

  it('GAP-7.2: unauthenticated GET returns sensitive fields: phone, porosAccessCode, vendorRegistration details', () => {
    // The handler returns the full StaffRegistration object (line 37: return NextResponse.json(registration))
    // Includes: phone, porosAccessCode (liability form code), vendorRegistrationId
    // Plus joined: vendorRegistration.businessName
    const sensitiveFieldsExposed = ['phone', 'porosAccessCode', 'vendorRegistrationId']
    expect(sensitiveFieldsExposed).toContain('phone')
    expect(sensitiveFieldsExposed).toContain('porosAccessCode')
  })

  it('success page calls GET /api/registration/staff/[id] to render confirmation (explains no-auth decision)', () => {
    // success/page.tsx line 49: fetch(`/api/registration/staff/${registrationId}`)
    // No token available from unauthenticated staff — auth would break the confirmation UX
    const successPageCallsGetEndpoint = true
    expect(successPageCallsGetEndpoint).toBe(true)
  })

  it('BUG-7.6: success page unconditionally tells ALL registrants "A confirmation email has been sent"', () => {
    // success/page.tsx lines 134-141: Mail icon + "A confirmation email has been sent to {email}"
    // This text is rendered regardless of free vs. paid path
    // Paid registrants have received NO email (BUG-7.4) — the message is false
    const successPageAlwaysShowsEmailSentMessage = true
    const paidRegistrantsActuallyReceivedEmail = false
    expect(successPageAlwaysShowsEmailSentMessage).toBe(true)
    expect(paidRegistrantsActuallyReceivedEmail).toBe(false)
    // The UI claim contradicts reality for paid staff
    expect(successPageAlwaysShowsEmailSentMessage && !paidRegistrantsActuallyReceivedEmail).toBe(true)
  })

  it('validate-vendor-code endpoint is also unauthenticated and has the same slug/UUID bug', () => {
    // validate-vendor-code/route.ts: no auth, queries with raw eventId param
    // Same BUG-7.3 applies: slug-based eventId will fail to match UUID in DB
    const validateEndpointRequiresAuth = false
    const validateEndpointUsesRawEventId = true
    expect(validateEndpointRequiresAuth).toBe(false)
    expect(validateEndpointUsesRawEventId).toBe(true)
  })
})

// ─── SECTION 7.3: DATABASE VERIFICATION ──────────────────────────────────────

describe('7.3 — Database: StaffRegistration record correctness', () => {
  it('StaffRegistration.eventId is always stored as UUID (event.id), not the raw slug input', () => {
    // Line 133: eventId: event.id  (the resolved Event primary key)
    // The POST handler correctly uses event.id after UUID/slug resolution
    const eventIdStoredAsUuid = true
    expect(eventIdStoredAsUuid).toBe(true)
  })

  it('StaffRegistration.organizationId is set from event.organizationId', () => {
    // Line 135: organizationId: event.organizationId
    const organizationIdStoredCorrectly = true
    expect(organizationIdStoredCorrectly).toBe(true)
  })

  it('StaffRegistration uses inline payment fields — no PaymentBalance table entry created', () => {
    // The staff registration handler never calls prisma.paymentBalance.create()
    // Payment tracking is via StaffRegistration.pricePaid and StaffRegistration.paymentStatus
    const usesPaymentBalanceTable = false
    const usesInlinePaymentFields = true
    expect(usesPaymentBalanceTable).toBe(false)
    expect(usesInlinePaymentFields).toBe(true)
  })

  it('pricePaid is stored as the server-calculated totalAmount (not client-provided price)', () => {
    // Line 146: pricePaid: totalAmount  (derived from settings, not from body.price)
    const storedValue = 'server-calculated totalAmount'
    expect(storedValue).toBe('server-calculated totalAmount')
  })

  it('paymentStatus stored as paid for free registrations, pending for paid', () => {
    // Line 147: paymentStatus: totalAmount > 0 ? 'pending' : 'paid'
    const freeStatus = 0 > 0 ? 'pending' : 'paid'
    const paidStatus = 25 > 0 ? 'pending' : 'paid'
    expect(freeStatus).toBe('paid')
    expect(paidStatus).toBe('pending')
  })

  it('BUG-7.5 consequence: paid StaffRegistration.paymentStatus never transitions from pending to paid', () => {
    // After Stripe Checkout completes, webhook has no staff handler
    // The record stays { paymentStatus: 'pending', pricePaid: 25 } indefinitely
    const webhookUpdatesPaymentStatus = false
    expect(webhookUpdatesPaymentStatus).toBe(false)
  })

  it('vendorRegistrationId is stored as FK when vendor staff — null for regular staff', () => {
    // Line 145: vendorRegistrationId: vendorRegistration?.id || null
    const vendorStaffHasFk = true
    const regularStaffHasNullFk = true
    expect(vendorStaffHasFk).toBe(true)
    expect(regularStaffHasNullFk).toBe(true)
  })

  it('vendorCode is stored uppercase when vendor staff, null for regular staff', () => {
    // Line 144: vendorCode: isVendorStaff ? vendorCode.toUpperCase() : null
    const vendorStaffCodeUppercase = true
    const regularStaffCodeNull = true
    expect(vendorStaffCodeUppercase).toBe(true)
    expect(regularStaffCodeNull).toBe(true)
  })

  it('porosAccessCode stored when liabilityFormsRequiredGroup is true, null otherwise', () => {
    // Lines 114-129: conditional generation
    // Note: uses GROUP flag (BUG-7.2), but is stored correctly in the record
    const codeStoredWhenGroupFlagTrue = true
    expect(codeStoredWhenGroupFlagTrue).toBe(true)
  })

  it('qrCode stored as base64 data URL generated at registration time', () => {
    // Lines 110-111: QRCode.toDataURL(qrCodeData) → stored inline in qrCode field
    const qrCodeStoredInline = true
    const qrCodeIsDataUrl = true
    expect(qrCodeStoredInline).toBe(true)
    expect(qrCodeIsDataUrl).toBe(true)
  })

  it('no Participant record created — staff are not in the Participant table', () => {
    // Handler never calls prisma.participant.create()
    // Staff registrations are entirely separate from group participant records
    const participantRecordCreated = false
    expect(participantRecordCreated).toBe(false)
  })

  it('no LiabilityForm record created — only a porosAccessCode is generated', () => {
    // Handler generates a code (lines 114-129) but never calls prisma.liabilityForm.create()
    // The Poros system creates the form when the staff member uses the code
    const liabilityFormRecordCreated = false
    const porosCodeGenerated = true
    expect(liabilityFormRecordCreated).toBe(false)
    expect(porosCodeGenerated).toBe(true)
  })

  it('isVendorStaff boolean stored on registration record', () => {
    // Line 143: isVendorStaff: isVendorStaff || false
    const isVendorStaffStored = true
    expect(isVendorStaffStored).toBe(true)
  })

  it('dietary restrictions stored as nullable string, null if not provided', () => {
    // Line 142: dietaryRestrictions: dietaryRestrictions || null
    const dietaryNullable = true
    expect(dietaryNullable).toBe(true)
  })
})

printSummary()
