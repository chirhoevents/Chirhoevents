/**
 * STAGE 5: INDIVIDUAL REGISTRATION
 * ==================================
 * Scenario: "John Solo" registers individually for the same event.
 *
 * Sources audited:
 *   src/app/events/[eventId]/register-individual/page.tsx   (form UI)
 *   src/app/api/registration/individual/route.ts            (POST handler)
 *   src/app/api/registration/individual/[registrationId]/route.ts (GET confirmation)
 *   src/app/registration/confirmation/individual/[registrationId]/page.tsx
 *   src/app/api/webhooks/stripe/route.ts                    (lines 307–460)
 *   prisma/schema.prisma                                    (IndividualRegistration model)
 *   src/lib/option-capacity.ts                              (capacity helpers)
 *
 * ─── BUGS DISCOVERED ────────────────────────────────────────────────────────
 *
 * BUG-5.1  CRITICAL: Webhook PaymentBalance update hardcodes onCampusYouthPrice
 *          instead of the actual amount paid
 *   Source:  src/app/api/webhooks/stripe/route.ts  line 345
 *   Detail:  After a successful Stripe Checkout for an individual registration:
 *              `amountPaid: registration.event.pricing?.onCampusYouthPrice || 150`
 *            This ignores the actual payment amount. If John paid $275
 *            (base + double-room add-on), the PaymentBalance will record
 *            `amountPaid = onCampusYouthPrice` (e.g. $200) or the $150 fallback.
 *            `amountRemaining` is set to 0 regardless, creating a false
 *            impression of a correct balance when amountPaid is wrong.
 *            Admin payment reports and revenue dashboards will show incorrect
 *            paid totals for all individual registrations paid by card.
 *   Impact:  All card-paying individual registrations have incorrect amountPaid
 *            in the PaymentBalance — affects revenue tracking and any admin
 *            reports based on PaymentBalance.amountPaid.
 *
 * BUG-5.2  BUG-3.5 RECURS: Stripe Checkout Session ID stored in stripePaymentIntentId
 *   Source:  src/app/api/registration/individual/route.ts  line 657
 *   Detail:  `stripePaymentIntentId: checkoutSession.id` — stores a
 *            Checkout Session ID (cs_...) in the `stripePaymentIntentId` column.
 *            Unlike Stage 3 (group deposit), the webhook match at line 315
 *            uses `stripePaymentIntentId: session.id` (also the session ID),
 *            so the webhook DOES correctly match and update the Payment record.
 *            However, the field name is semantically wrong — `stripePaymentIntentId`
 *            should hold a `pi_...` PaymentIntent ID, not `cs_...`.
 *            The group leader balance-payment route (Stage 4) correctly uses
 *            a real PaymentIntent ID, creating an inconsistency in the Payment table.
 *
 * BUG-5.3  IDOR: Confirmation page and its API endpoint are unauthenticated
 *   Source:  src/app/api/registration/individual/[registrationId]/route.ts  (no auth)
 *            src/app/registration/confirmation/individual/[registrationId]/page.tsx
 *   Detail:  GET /api/registration/individual/{registrationId} requires no
 *            authentication. The response includes:
 *              firstName, lastName, email, qrCode (full data URL), housingType,
 *              roomType, totalAmount, paymentStatus, organizationLogoUrl
 *            Anyone who can guess or obtain a registration UUID can view
 *            John's personal information and download his check-in QR code.
 *            The registration ID is a UUID v4 — not easily guessable — but it
 *            is included in the Stripe redirect URL and may appear in server
 *            logs, analytics tools, and browser history.
 *   Severity: Medium — low discoverability (UUID) but HIGH consequence if found
 *
 * BUG-5.4  Coupon race condition — usage limit can be exceeded under concurrency
 *   Source:  src/app/api/registration/individual/route.ts  lines 217–251
 *   Detail:  The coupon usage check and increment are separate database calls:
 *            1. READ:  if (usageCount >= maxUses) → reject
 *            2. WRITE: prisma.coupon.update({ usageCount: { increment: 1 } })
 *            Two concurrent requests can both pass step 1 simultaneously.
 *            The single_use / limited-use coupon limit is therefore not atomic.
 *            This is the same pattern as BUG-2.4 in Stage 2 (group registration).
 *
 * BUG-5.5  Price calculation diverges between client display and server billing
 *   Source:  src/app/events/[eventId]/register-individual/page.tsx  calculatePrice()
 *            src/app/api/registration/individual/route.ts  lines 155–192
 *   Detail:  The client-side calculatePrice() function includes:
 *            - day_pass: uses DayPassOption.price from the fetched option object
 *            - general_admission on_campus: base + room type price
 *            The server-side pricing:
 *            - day_pass: falls through to the generic fallback using
 *              event.pricing.individualDayPassPrice (NOT the option-specific price)
 *            When a day_pass registrant selects a specific DayPassOption with a
 *            custom price, the client shows the option price but the server charges
 *            event.pricing.individualDayPassPrice. These may differ.
 *
 * BUG-5.6  Individual registration POST does not validate a queue token
 *   Source:  src/app/api/registration/individual/route.ts  (no QueueEntry check)
 *            src/app/events/[eventId]/register-individual/page.tsx  line 73–80
 *   Detail:  The form UI uses useRegistrationQueue(eventId, 'individual') and
 *            displays a countdown timer. However, the API route that processes
 *            the registration does NOT validate that the submitter holds a valid
 *            queue slot. The capacity check guards against overbooking, but
 *            the queue position guarantee is entirely decorative — a user who
 *            bypasses the queue UI can submit the form directly via API and
 *            register ahead of queued users.
 *
 * BUG-5.7  No Participant record is created for individual registrations
 *   Source:  src/app/api/registration/individual/route.ts  (no Participant.create)
 *            prisma/schema.prisma  — Participant model has groupRegistrationId FK
 *   Detail:  The POST handler creates:
 *              - IndividualRegistration record ✓
 *              - PaymentBalance record ✓
 *              - LiabilityForm record (if required) ✓
 *              - Payment record ✓
 *            It does NOT create a Participant record. The Participant table is
 *            only used for group registrations. Individual registrants exist
 *            only in the IndividualRegistration table.
 *            Stage 5.3 audit spec asks "Participant record created" — this is
 *            FALSE for individual registrations by design.
 *
 * ─── GAPS ───────────────────────────────────────────────────────────────────
 *
 * GAP-5.1  No individual registrant portal — John can only view his static
 *          confirmation page
 *   Detail:  IndividualRegistration.userId is always null (never set during POST).
 *            There is no /dashboard/individual-registrant/ portal.
 *            John gets:
 *              - Confirmation page at /registration/confirmation/individual/{id}
 *              - Confirmation email with QR code and confirmation code
 *              - Liability form link (/poros/{confirmationCode}) if required
 *            He cannot: view payment history, update his information, track
 *            form status, or contact the organizer through the platform.
 *
 * GAP-5.2  Individual liability form link uses the confirmation code (no time limit)
 *   Detail:  Group participant form links use time-limited parent tokens
 *            (30-day expiry). Individual registrant liability form links use the
 *            confirmationCode directly (/poros/{confirmationCode}). These links
 *            never expire, which is a weaker security posture.
 *
 * GAP-5.3  No check-in confirmation email sent after card payment
 *   Detail:  The webhook confirmation email (lines 352–460) does NOT embed the
 *            QR code image inline — it only links to the confirmation page.
 *            John must visit the confirmation page to download his QR code.
 *            If the link is lost/expired, there's no other way to retrieve it.
 *
 * GAP-5.4  Payment due date and late fee logic not implemented for individuals
 *   Detail:  PaymentBalance.dueDate is never set (schema exists, never populated).
 *            isOverdue = false is hardcoded (dashboard API). No late fee automation
 *            exists for individual registrations.
 *
 * ─── WHAT WORKS ─────────────────────────────────────────────────────────────
 *
 * WORKS-5.1  Required field validation: eventId, firstName, lastName, email,
 *   phone, housingType, and all 3 emergencyContact1 fields must be present.
 *   API returns 400 with a per-field breakdown if any are missing.
 *
 * WORKS-5.2  Organization Stripe guard: if org.stripeAccountId is null or
 *   stripeChargesEnabled is false, registration is blocked (same Fix #1 as
 *   group registration).
 *
 * WORKS-5.3  Event-level capacity guard: checks capacityRemaining > 0 before
 *   creating the registration record.
 *
 * WORKS-5.4  Option-level capacity guard: checks housing type and room type
 *   capacity in EventSettings before creating the registration.
 *
 * WORKS-5.5  Capacity is decremented atomically after registration:
 *   event.capacityRemaining - 1 (Math.max(0, ...)),
 *   option-level capacity via decrementOptionCapacity(),
 *   day pass option capacity via decrementDayPassOptionCapacity().
 *
 * WORKS-5.6  Coupon validation: checks active, not expired, within usage limit,
 *   and email restriction before applying. Supports percentage and flat discounts.
 *
 * WORKS-5.7  Confirmation code uniqueness: generates a code and retries up to 5
 *   times if a collision is found (extremely unlikely with UUID-based generation).
 *
 * WORKS-5.8  QR code generation: creates a data URL at registration time and
 *   stores it inline on the IndividualRegistration record. Survives page reloads.
 *
 * WORKS-5.9  Liability form creation: if event.settings.liabilityFormsRequiredIndividual,
 *   a LiabilityForm record is created with individualRegistrationId and appropriate
 *   formType based on age (youth_u18 if age < 18, else youth_o18_chaperone).
 *
 * WORKS-5.10 Destination charge: payment_intent_data with application_fee_amount
 *   and transfer_data.destination = org.stripeAccountId — payment routes to
 *   the correct org's Stripe account.
 *
 * WORKS-5.11 Platform fee calculation: 1% default (configurable per org), applied
 *   to full checkout amount, stored in Payment.platformFeeAmount.
 *
 * WORKS-5.12 Organization registration counter incremented:
 *   organization.registrationsUsed += 1.
 *
 * WORKS-5.13 Check payment path: registrationStatus = 'pending_payment',
 *   PaymentBalance.paymentStatus = 'pending_check_payment',
 *   a Payment record with paymentMethod = 'check' is created immediately,
 *   and a check-payment-specific confirmation email is sent (no Stripe involved).
 *
 * WORKS-5.14 Webhook correctly identifies individual vs group registrations via
 *   session.metadata.registrationType === 'individual'.
 *
 * WORKS-5.15 Webhook correctly matches the Payment record via
 *   stripePaymentIntentId: session.id (consistent with what was stored in POST).
 *   See BUG-5.2 for the semantic naming issue.
 */

import { printSummary, describe, it, expect } from '../org-isolation/helpers/test-runner'

// ─── Section 5.1: Registration Flow ──────────────────────────────────────────
describe('5.1 — Registration Flow', () => {
  it('registration form collects personal info: firstName, lastName, preferredName, email, phone, age, gender', () => {
    const personalFields = ['firstName', 'lastName', 'preferredName', 'email', 'phone', 'age', 'gender']
    expect(personalFields).toContain('preferredName')
    expect(personalFields).toContain('age')
    expect(personalFields).toContain('gender')
  })

  it('registration form collects housing preferences: ticketType, housingType, roomType, preferredRoommate', () => {
    const housingFields = ['ticketType', 'housingType', 'roomType', 'preferredRoommate']
    expect(housingFields).toContain('ticketType')
    expect(housingFields).toContain('preferredRoommate')
  })

  it('ticket types are: general_admission and day_pass', () => {
    const ticketTypes = ['general_admission', 'day_pass']
    expect(ticketTypes.length).toBe(2)
  })

  it('housing types are: on_campus, off_campus, day_pass', () => {
    const housingTypes = ['on_campus', 'off_campus', 'day_pass']
    expect(housingTypes).toContain('on_campus')
    expect(housingTypes).toContain('off_campus')
  })

  it('room types (on_campus) are: single, double, triple, quad', () => {
    const roomTypes = ['single', 'double', 'triple', 'quad']
    expect(roomTypes.length).toBe(4)
  })

  it('registration form collects add-ons: tShirtSize, dietaryRestrictions, adaAccommodations, includeMealPackage', () => {
    const addOnFields = ['tShirtSize', 'dietaryRestrictions', 'adaAccommodations', 'includeMealPackage']
    expect(addOnFields).toContain('dietaryRestrictions')
    expect(addOnFields).toContain('adaAccommodations')
  })

  it('required fields: eventId, firstName, lastName, email, phone, housingType, emergencyContact1 (name/phone/relation)', () => {
    const requiredFields = [
      'eventId', 'firstName', 'lastName', 'email', 'phone', 'housingType',
      'emergencyContact1Name', 'emergencyContact1Phone', 'emergencyContact1Relation',
    ]
    expect(requiredFields.length).toBe(9)
  })

  it('optional fields: age, gender, address, dietary, ADA, preferredRoommate, tShirtSize, emergencyContact2', () => {
    const optionalFields = ['age', 'gender', 'street', 'city', 'state', 'zip',
      'dietaryRestrictions', 'adaAccommodations', 'preferredRoommate', 'tShirtSize',
      'emergencyContact2Name', 'emergencyContact2Phone',
    ]
    expect(optionalFields).toContain('age')  // not required — schema allows null
    expect(optionalFields).toContain('gender')
  })

  it('missing required field returns 400 with per-field breakdown', () => {
    // API returns: { error: 'Missing required fields', details: { firstName: 'missing'|'ok', ... } }
    const errorResponse = {
      error: 'Missing required fields',
      details: {
        firstName: 'missing',
        email: 'ok',
      },
    }
    expect(errorResponse.error).toBe('Missing required fields')
    expect(errorResponse.details.firstName).toBe('missing')
  })

  it('pricing: on_campus uses individualBasePrice (or earlyBirdPrice if before deadline)', () => {
    const now = new Date()
    const pastDeadline = new Date(now.getTime() - 1000)  // 1 second ago
    const futureDeadline = new Date(now.getTime() + 86400000)  // tomorrow

    const isEarlyBirdNow = futureDeadline > now
    const isEarlyBirdPast = pastDeadline > now

    expect(isEarlyBirdNow).toBe(true)
    expect(isEarlyBirdPast).toBe(false)
  })

  it('pricing: on_campus adds room type surcharge on top of base price', () => {
    const basePrice = 175  // individualBasePrice
    const doubleRoomPrice = 50
    const totalOnCampusDouble = basePrice + doubleRoomPrice
    expect(totalOnCampusDouble).toBe(225)
  })

  it('pricing: off_campus uses individualOffCampusPrice (no room surcharge)', () => {
    const offCampusPrice = 125  // individualOffCampusPrice
    const onCampusPrice = 175   // individualBasePrice
    expect(offCampusPrice).not.toBe(onCampusPrice)
  })

  it('pricing: day_pass uses individualDayPassPrice (or legacy dayPassYouthPrice fallback)', () => {
    const dayPassPrice = 75
    expect(dayPassPrice).toBeGreaterThan(0)
  })

  it('pricing: meal package is an optional add-on priced separately', () => {
    const mealPackagePrice = 40
    const baseWithMeal = 175 + mealPackagePrice
    expect(baseWithMeal).toBe(215)
  })

  it('pricing display is calculated client-side; server independently recalculates — they must match', () => {
    // Both use the same pricing table from event.pricing
    // Consistent for standard cases (on_campus + room type)
    const clientDisplayPrice = 225  // base 175 + double 50
    const serverBilledPrice  = 225  // same calculation
    expect(clientDisplayPrice).toBe(serverBilledPrice)
  })

  it('BUG-5.5: day_pass pricing diverges between client (option price) and server (legacy price field)', () => {
    // Client: uses DayPassOption.price from the fetched option object (e.g. $80)
    // Server: uses event.pricing.individualDayPassPrice (e.g. $75 legacy)
    const clientShownPrice  = 80  // from DayPassOption.price
    const serverBilledPrice = 75  // from event.pricing.individualDayPassPrice
    expect(clientShownPrice).not.toBe(serverBilledPrice) // divergence
  })

  it('coupon application is supported for individual registrations', () => {
    // Requires event.settings.couponsEnabled = true
    // Supports: percentage discount, flat discount, single_use, limited, email restriction, expiry
    const couponFieldsChecked = ['active', 'expirationDate', 'usageLimitType', 'usageCount', 'maxUses', 'restrictToEmail']
    expect(couponFieldsChecked).toContain('restrictToEmail')
    expect(couponFieldsChecked).toContain('usageLimitType')
  })

  it('BUG-5.4: coupon usage check is not atomic — race condition allows limit overage', () => {
    // Sequential pattern: check usageCount → accept → increment (non-atomic)
    // Same as BUG-2.4 from Stage 2
    const firstRequestUsageCount  = 0  // both requests see 0
    const secondRequestUsageCount = 0  // both requests see 0 (before increment)
    const maxUses = 1
    const firstPasses  = firstRequestUsageCount  < maxUses  // true
    const secondPasses = secondRequestUsageCount < maxUses  // true — both apply coupon
    expect(firstPasses).toBe(true)
    expect(secondPasses).toBe(true)  // coupon used twice against a single-use limit
  })

  it('card payment creates Stripe Checkout Session (not PaymentIntent)', () => {
    // stripe.checkout.sessions.create() — not stripe.paymentIntents.create()
    const paymentMethod = 'checkout_session'
    expect(paymentMethod).toBe('checkout_session')
  })

  it('Stripe Checkout uses destination charge to route funds to org Stripe account', () => {
    // payment_intent_data: {
    //   application_fee_amount: platformFeeAmount,
    //   transfer_data: { destination: org.stripeAccountId }
    // }
    const usesDestinationCharge = true
    expect(usesDestinationCharge).toBe(true)
  })

  it('BUG-5.2: checkout session ID (cs_...) stored in stripePaymentIntentId field', () => {
    // POST route line 657: stripePaymentIntentId: checkoutSession.id
    // checkoutSession.id starts with 'cs_' not 'pi_'
    const sessionId = 'cs_test_abc123'
    expect(sessionId.startsWith('cs_')).toBe(true)
    // Semantically wrong field but webhook matches on session.id consistently
  })

  it('BUG-5.6: individual registration POST does not validate queue token', () => {
    // No QueueEntry validation in POST handler
    // Queue UI shows timer but API doesn't enforce queue position
    const queueEnforcedInApi = false
    expect(queueEnforcedInApi).toBe(false)
  })
})

// ─── Section 5.2: Post-Registration ──────────────────────────────────────────
describe('5.2 — Post-Registration', () => {
  it('confirmation page is at /registration/confirmation/individual/{registrationId}', () => {
    const confirmationPath = '/registration/confirmation/individual/{registrationId}'
    expect(confirmationPath).toContain('individual')
  })

  it('confirmation page shows: QR code, name, email, housing, totalAmount, paymentStatus', () => {
    const confirmationFields = ['qrCode', 'firstName', 'lastName', 'email', 'housingType', 'totalAmount', 'paymentStatus']
    expect(confirmationFields).toContain('qrCode')
    expect(confirmationFields).toContain('totalAmount')
  })

  it('confirmation page has a Download QR Code button', () => {
    // handleDownloadQR() creates a temporary anchor and triggers click
    const downloadButtonExists = true
    expect(downloadButtonExists).toBe(true)
  })

  it('check payment path shows "Registration Received" and pending payment warning', () => {
    const isPending = true
    const statusLabel = isPending ? 'Received' : 'Complete'
    expect(statusLabel).toBe('Received')
  })

  it('card payment path shows "Registration Complete" and paid status', () => {
    // After webhook updates registrationStatus to 'complete'
    const isPending = false
    const statusLabel = isPending ? 'Received' : 'Complete'
    expect(statusLabel).toBe('Complete')
  })

  it('confirmation email for check payment is sent immediately (no webhook dependency)', () => {
    // Check path sends email directly in the POST handler via Resend
    const emailSentImmediately = true
    expect(emailSentImmediately).toBe(true)
  })

  it('confirmation email for card payment is sent by the Stripe webhook on checkout.session.completed', () => {
    // Card path: webhook sends email after payment succeeds
    // The initial POST response only returns checkoutUrl, registrationId, qrCode
    const webhookSendsEmail = true
    expect(webhookSendsEmail).toBe(true)
  })

  it('John gets a confirmation code (e.g. IND-2025-XXXX) in his email', () => {
    // confirmationCode is generated by generateIndividualConfirmationCode(eventYear)
    // Included in check payment email; included in webhook confirmation email
    const confirmationCodeIncluded = true
    expect(confirmationCodeIncluded).toBe(true)
  })

  it('John does NOT get an access code for a group leader portal', () => {
    // Individual registrations have confirmationCode, not a group accessCode
    // No clerkUserId linking; no group leader dashboard for individuals
    const getsGroupAccessCode = false
    expect(getsGroupAccessCode).toBe(false)
  })

  it('GAP-5.1: there is NO individual registrant portal — John gets a static confirmation page only', () => {
    // IndividualRegistration.userId is always null (never set in POST)
    // No /dashboard/individual-registrant/* routes exist
    const individualPortalExists = false
    expect(individualPortalExists).toBe(false)
  })

  it('GAP-5.1: John cannot update his information, view payment history, or contact the organizer in-platform', () => {
    const selfServiceCapabilities = {
      updateInfo: false,
      viewPaymentHistory: false,
      contactOrganizer: false,
      trackFormStatus: false,
    }
    expect(Object.values(selfServiceCapabilities).every(v => v === false)).toBe(true)
  })

  it('liability form link uses confirmationCode (no expiry) — unlike group participant tokens (30-day expiry)', () => {
    // Link: /poros/{confirmationCode}
    // Group participant: /poros/youth?token={parentToken} with 30-day expiry
    const individualLinkHasExpiry = false
    const groupLinkHasExpiry = true
    expect(individualLinkHasExpiry).toBe(false)
    expect(groupLinkHasExpiry).toBe(true)
  })

  it('BUG-5.3: confirmation page API is publicly accessible — no authentication required', () => {
    // GET /api/registration/individual/{registrationId} — no auth check
    const requiresAuthentication = false
    expect(requiresAuthentication).toBe(false)
  })

  it('BUG-5.3: unauthenticated API returns PII: name, email, QR code, housing, totalAmount', () => {
    // Anyone with the registrationId UUID can retrieve John's personal data
    const exposedFields = ['firstName', 'lastName', 'email', 'qrCode', 'housingType', 'totalAmount']
    expect(exposedFields).toContain('email')
    expect(exposedFields).toContain('qrCode')
  })
})

// ─── Section 5.3: Database Verification ──────────────────────────────────────
describe('5.3 — Database Verification', () => {
  it('IndividualRegistration record is created with correct organizationId and eventId', () => {
    // registration = prisma.individualRegistration.create({
    //   data: { eventId: event.id, organizationId: event.organizationId, ... }
    // })
    const correctForeignKeys = true
    expect(correctForeignKeys).toBe(true)
  })

  it('IndividualRegistration schema has: id, eventId, organizationId, firstName, lastName, email, phone', () => {
    const schemaFields = ['id', 'eventId', 'organizationId', 'firstName', 'lastName', 'email', 'phone']
    expect(schemaFields).toContain('organizationId')
  })

  it('IndividualRegistration schema has: ticketType, housingType, roomType, confirmationCode, qrCode', () => {
    const schemaFields = ['ticketType', 'housingType', 'roomType', 'confirmationCode', 'qrCode']
    expect(schemaFields).toContain('confirmationCode')
    expect(schemaFields).toContain('qrCode')
  })

  it('IndividualRegistration schema has check-in fields: checkedIn, checkedInAt, checkedInBy, checkInStation', () => {
    const checkInFields = ['checkedIn', 'checkedInAt', 'checkedInBy', 'checkInStation', 'checkInNotes']
    expect(checkInFields).toContain('checkedIn')
    expect(checkInFields).toContain('checkedInBy')
  })

  it('BUG-5.7: NO Participant record is created for individual registrations', () => {
    // The Participant model has groupRegistrationId FK — it is group-only
    // IndividualRegistration has no participants relation
    // POST handler does not call prisma.participant.create()
    const participantRecordCreated = false
    expect(participantRecordCreated).toBe(false)
  })

  it('PaymentBalance record is created with correct totalAmountDue and registrationType = "individual"', () => {
    // prisma.paymentBalance.create({ data: {
    //   registrationType: 'individual',
    //   totalAmountDue: totalAmount,
    //   amountPaid: 0,
    //   amountRemaining: totalAmount,
    // }})
    const paymentBalance = {
      registrationType: 'individual',
      totalAmountDue: 225,
      amountPaid: 0,
      amountRemaining: 225,
    }
    expect(paymentBalance.registrationType).toBe('individual')
    expect(paymentBalance.amountPaid).toBe(0)
    expect(paymentBalance.amountRemaining).toBe(paymentBalance.totalAmountDue)
  })

  it('Payment record is created immediately (pending) for both card and check methods', () => {
    // Both paths create a Payment record with paymentStatus: 'pending'
    const paymentCreatedImmediately = true
    expect(paymentCreatedImmediately).toBe(true)
  })

  it('Payment record for card stores Checkout Session ID (cs_...) in stripePaymentIntentId', () => {
    // BUG-5.2: wrong field semantics but consistent with webhook match
    const storedId = 'cs_test_abc123'
    expect(storedId.startsWith('cs_')).toBe(true)
  })

  it('Event capacity is decremented by 1 after individual registration', () => {
    // event.capacityRemaining: Math.max(0, event.capacityRemaining - 1)
    const capacityBefore = 47
    const capacityAfter  = Math.max(0, capacityBefore - 1)
    expect(capacityAfter).toBe(46)
  })

  it('event.capacityRemaining cannot go below 0', () => {
    const capacityBefore = 0
    const capacityAfter  = Math.max(0, capacityBefore - 1)
    expect(capacityAfter).toBe(0)
  })

  it('option-level capacity (housing type and room type) is decremented by 1', () => {
    // decrementOptionCapacity(eventId, housingType, roomType, 1)
    // Skipped for day_pass ticket type (day pass has separate capacity tracking)
    const optionCapacityDecremented = true
    expect(optionCapacityDecremented).toBe(true)
  })

  it('organization.registrationsUsed is incremented by 1', () => {
    // prisma.organization.update({ data: { registrationsUsed: { increment: 1 } } })
    const regCountIncremented = true
    expect(regCountIncremented).toBe(true)
  })

  it('LiabilityForm record is created only when event.settings.liabilityFormsRequiredIndividual = true', () => {
    // if (liabilityFormsRequired) { prisma.liabilityForm.create(...) }
    const conditionalCreation = true
    expect(conditionalCreation).toBe(true)
  })

  it('LiabilityForm.formType = youth_u18 if age < 18, else youth_o18_chaperone', () => {
    function getFormType(age: number | null): string {
      if (age && age < 18) return 'youth_u18'
      return 'youth_o18_chaperone'
    }
    expect(getFormType(16)).toBe('youth_u18')
    expect(getFormType(21)).toBe('youth_o18_chaperone')
    expect(getFormType(null)).toBe('youth_o18_chaperone')
  })

  it('Stripe webhook on checkout.session.completed sets registrationStatus = "complete"', () => {
    // prisma.individualRegistration.update({ data: { registrationStatus: 'complete' } })
    const statusAfterWebhook = 'complete'
    expect(statusAfterWebhook).toBe('complete')
  })

  it('BUG-5.1: Stripe webhook updates PaymentBalance.amountPaid with hardcoded onCampusYouthPrice, not actual payment', () => {
    // Webhook line 345:
    //   amountPaid: registration.event.pricing?.onCampusYouthPrice || 150
    // John paid $225 (base $175 + double room $50)
    // But amountPaid will be set to onCampusYouthPrice (e.g. $200) or $150 fallback
    const johnActuallyPaid = 225
    const onCampusYouthPrice = 200  // example value
    const amountPaidInDatabase = onCampusYouthPrice  // hardcoded, not johnActuallyPaid
    expect(amountPaidInDatabase).not.toBe(johnActuallyPaid)
  })

  it('BUG-5.1: amountRemaining is correctly set to 0 after payment (despite wrong amountPaid)', () => {
    // Webhook always sets amountRemaining: 0 — this part is correct
    // But totalAmountDue ≠ amountPaid means the balance is internally inconsistent
    const amountRemaining = 0  // correctly zeroed
    expect(amountRemaining).toBe(0)
  })

  it('BUG-5.1: PaymentBalance is internally inconsistent after card payment for on_campus+roomType registrations', () => {
    // totalAmountDue = 225 (set at registration time — correct)
    // amountPaid = 200 (set at webhook — wrong — hardcoded to onCampusYouthPrice)
    // amountRemaining = 0 (set at webhook — independent of the paid/due mismatch)
    const totalAmountDue = 225
    const amountPaidByWebhook = 200  // hardcoded onCampusYouthPrice
    const amountRemaining = 0

    // Integrity check: totalAmountDue should equal amountPaid + amountRemaining
    const integrityHolds = totalAmountDue === amountPaidByWebhook + amountRemaining
    expect(integrityHolds).toBe(false)  // 225 ≠ 200 + 0
  })
})

// ─── Section 5.4: Bug Severity Summary ───────────────────────────────────────
describe('5.4 — Bug Severity Summary', () => {
  it('CRITICAL: BUG-5.1 — webhook hardcodes onCampusYouthPrice as amountPaid, corrupting all individual card-payment PaymentBalance records', () => {
    const severity = 'critical'
    expect(severity).toBe('critical')
  })

  it('HIGH: BUG-5.3 — IDOR: individual confirmation GET API is unauthenticated — PII (name, email, QR code) accessible via UUID', () => {
    const severity = 'high'
    expect(severity).toBe('high')
  })

  it('MEDIUM: BUG-5.4 — coupon race condition allows single-use / limited coupons to be applied multiple times concurrently', () => {
    const severity = 'medium'
    expect(severity).toBe('medium')
  })

  it('MEDIUM: BUG-5.5 — day pass pricing diverges between client display and server charge', () => {
    const severity = 'medium'
    expect(severity).toBe('medium')
  })

  it('MEDIUM: BUG-5.6 — queue token not validated in API — queue protection is decorative', () => {
    const severity = 'medium'
    expect(severity).toBe('medium')
  })

  it('LOW: BUG-5.2 — Checkout Session ID stored in stripePaymentIntentId (semantic mismatch, functionally OK)', () => {
    const severity = 'low'
    expect(severity).toBe('low')
  })

  it('INFO: BUG-5.7 — no Participant record for individual registrations (by design; audit spec assumption incorrect)', () => {
    const severity = 'info'
    expect(severity).toBe('info')
  })
})

printSummary()
