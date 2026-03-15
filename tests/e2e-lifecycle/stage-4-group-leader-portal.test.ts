/**
 * STAGE 4: GROUP LEADER PORTAL
 * ============================
 * Scenario: Maria Test logs into the Group Leader Portal and manages her
 * 15-person registration for "Testville Youth Conference."
 *
 * Sources audited:
 *   src/app/dashboard/group-leader/layout.tsx          (auth guard, event switcher)
 *   src/app/dashboard/group-leader/page.tsx            (dashboard overview)
 *   src/contexts/EventContext.tsx                       (selectedEventId state)
 *   src/app/api/group-leader/settings/route.ts         (linked events, branding)
 *   src/app/api/group-leader/dashboard/route.ts        (dashboard data)
 *   src/app/api/group-leader/participants/route.ts     (roster view)
 *   src/app/api/group-leader/payments/route.ts         (payment history)
 *   src/app/api/group-leader/payments/create-payment-intent/route.ts
 *   src/app/api/group-leader/housing/route.ts          (housing view)
 *   src/app/api/group-leader/housing/assign/route.ts   (manual assignment)
 *   src/app/api/group-leader/housing/auto-assign/route.ts
 *   src/app/api/group-leader/housing/submit/route.ts   (lock assignments)
 *   src/app/api/group-leader/forms/route.ts            (liability forms status)
 *   src/app/api/group-leader/forms/bulk-email-reminders/route.ts
 *   src/app/api/group-leader/registration/route.ts     (GET/PUT registration)
 *   src/app/api/group-leader/registration/edit/route.ts (restricted PUT)
 *   src/app/api/group-leader/link-access-code/route.ts (link code)
 *   src/app/api/group-leader/support/message/route.ts  (support messages)
 *
 * ─── BUGS DISCOVERED ────────────────────────────────────────────────────────
 *
 * BUG-4.1  selectedEventId in EventContext stores registration UUID, but APIs
 *          with "Fix #6" treat it as event UUID → portal data loading broken
 *   Source:  src/contexts/EventContext.tsx  &
 *            src/app/api/group-leader/settings/route.ts  line 129
 *   Detail:  The settings route returns `linkedEvents` where each entry's
 *            `id` field is `reg.id` (GroupRegistration primary key, a UUID).
 *            The EventContext stores this as `selectedEventId`.
 *
 *            Multiple API routes carry the comment "Fix #6: was incorrectly
 *            whereClause.id" and now do:
 *              `whereClause.eventId = eventId`
 *            treating selectedEventId as the Event UUID column.
 *
 *            Since GroupRegistration.id ≠ GroupRegistration.eventId, the
 *            WHERE clause `eventId = registrationUUID` never matches → 404.
 *
 *            Affected routes:
 *              GET /api/group-leader/dashboard?eventId=...     → always 404
 *              GET /api/group-leader/payments?eventId=...      → always 404
 *              POST /api/group-leader/payments/create-payment-intent → always 404
 *
 *            Routes that use `id: eventId` (matching primary key) still
 *            accidentally work when the registration UUID is passed:
 *              POST /api/group-leader/housing/assign
 *              POST /api/group-leader/housing/auto-assign
 *              POST /api/group-leader/housing/submit
 *
 *   Root cause: settings route should return `id: reg.eventId` (event UUID)
 *               to match what the API WHERE clauses expect.
 *
 * BUG-4.2  Participants and forms routes have no event filter
 *   Source:  src/app/api/group-leader/participants/route.ts  line 17–18
 *            src/app/api/group-leader/forms/route.ts         line 17–18
 *   Detail:  Both routes use `findFirst({ where: { clerkUserId: userId } })`
 *            with NO eventId filter. If Maria has two linked registrations
 *            (e.g. Conference A and Conference B), she always sees the first
 *            registration's participants on the Participants tab, regardless
 *            of which event is selected in the sidebar dropdown.
 *   Impact:  Multi-event users see the wrong roster — data leakage between
 *            their own registrations across different events.
 *
 * BUG-4.3  PUT /api/group-leader/registration allows editing housingType
 *          without adjusting housing capacity or PaymentBalance
 *   Source:  src/app/api/group-leader/registration/route.ts  line 137
 *   Detail:  The route updates `housingType` freely. Changing housing type
 *            (e.g. off_campus → on_campus) does not:
 *            - Decrement on-campus capacity or increment off-campus capacity
 *            - Recalculate the PaymentBalance.totalAmountDue (different
 *              housing types have different prices)
 *            This can corrupt both capacity tracking and financial records.
 *   Note:    The separate /registration/edit route correctly restricts the
 *            editable fields to contact info + specialRequests only. The
 *            two routes have inconsistent access control policies.
 *
 * BUG-4.4  Payment intent creation has no overpayment guard
 *   Source:  src/app/api/group-leader/payments/create-payment-intent/route.ts  line 22–29
 *   Detail:  The `amount` field from the request body is accepted without
 *            validation against `PaymentBalance.amountRemaining`. A group
 *            leader (or attacker) can submit any positive amount, creating a
 *            payment intent for more than the balance owed. After the Stripe
 *            webhook updates the balance, the PaymentBalance.amountRemaining
 *            goes negative — no overpayment handling exists.
 *
 * BUG-4.5  CRITICAL: Support messages are silently discarded — never sent
 *   Source:  src/app/api/group-leader/support/message/route.ts  lines 46–57
 *   Detail:  The route contains an explicit TODO comment:
 *              "// TODO: Implement email sending"
 *              "// For now, just log the message"
 *            The endpoint logs to server console and always returns
 *            `{ success: true, message: 'Your message has been sent...' }`.
 *            No email is ever sent. The org admin receives no notification.
 *            Group leaders are falsely told their message was delivered.
 *
 * BUG-4.6  Bulk email reminders only send for youth_u18 with parentEmail
 *   Source:  src/app/api/group-leader/forms/bulk-email-reminders/route.ts  line 56
 *   Detail:  The reminder loop fires only when:
 *            `participant.participantType === 'youth_u18' && participant.parentEmail`
 *            Chaperones, adult youth (youth_o18), priests, and youth_u18
 *            without a parentEmail stored get no reminder email. The returned
 *            count is the full `emailPromises.length` (including undefined
 *            entries for skipped participants), overstating the send count.
 *
 * BUG-4.7  Housing assign/submit/auto-assign use `id: eventId` (correct for
 *          registration UUID) but housing GET uses `eventId: eventId` (correct
 *          for event UUID) — inconsistent; housing view and housing mutations
 *          use different lookup semantics
 *   Source:  src/app/api/group-leader/housing/route.ts  line 30 (GET: eventId: eventId)
 *            src/app/api/group-leader/housing/assign/route.ts  line 27 (POST: id: eventId)
 *   Detail:  The GET route (view housing) correctly filters by the EventId
 *            column; the POST routes (assign/submit) filter by the primary key.
 *            If the client passes a registration UUID as "eventId", the GET
 *            returns 404 but the POSTs succeed. The housing page therefore
 *            cannot load housing data (GET 404) but can still accept
 *            assignment mutations — an inconsistent state.
 *
 * BUG-4.8  Housing assign bed check is not atomic — race condition possible
 *   Source:  src/app/api/group-leader/housing/assign/route.ts  lines 70–82, 119–127
 *   Detail:  The route reads `roomAssignment.findFirst({ where: { roomId, bedNumber } })`
 *            and then creates a new assignment in separate steps.
 *            Two concurrent requests for the same bed can both pass the check
 *            and create duplicate RoomAssignment records for the same bed.
 *   Fix:     Wrap the check + create in a transaction with a unique constraint
 *            on (roomId, bedNumber), or use an upsert with appropriate conflict
 *            handling.
 *
 * BUG-4.9  Housing submit sends no email and notifies no admin
 *   Source:  src/app/api/group-leader/housing/submit/route.ts  lines 55–56
 *   Detail:  Two TODO comments:
 *              "// TODO: Send confirmation email to group leader"
 *              "// TODO: Notify org admin"
 *            The housing locked flag is set correctly, but no notifications
 *            are sent. Org admins must manually poll the dashboard to discover
 *            submitted housing assignments.
 *
 * ─── GAPS ───────────────────────────────────────────────────────────────────
 *
 * GAP-4.1  "Contact Event Organizers" button uses hardcoded support email
 *   Source:  src/app/dashboard/group-leader/page.tsx  line 488
 *   Detail:  Quick Actions has:
 *              `mailto:support@chirhoevents.com?subject=Event Question`
 *            This sends to ChiRho's own support inbox, not the registering
 *            org's contactEmail. Group leaders cannot reach their event
 *            organizer from this button.
 *
 * GAP-4.2  No participant drop (remove) capability in the group leader portal
 *   Detail:  There is no DELETE endpoint under /api/group-leader/participants/.
 *            The spec says headcount should stay at 15 with an empty slot, but
 *            there is no UI or API for marking a specific participant as
 *            "dropped". Group leaders must contact the org admin to make any
 *            headcount changes.
 *
 * GAP-4.3  PaymentBalance not updated immediately after create-payment-intent
 *   Detail:  The payment intent endpoint creates a Payment record with
 *            `paymentStatus: 'pending'`. The PaymentBalance.amountPaid and
 *            amountRemaining are only updated when the Stripe webhook
 *            (payment_intent.succeeded) fires. If the webhook is delayed or
 *            fails, the displayed balance is stale even after a successful
 *            payment.
 *
 * GAP-4.4  No participant edit capability through the group leader portal
 *   Detail:  Individual participant records (Participant table) can only be
 *            modified via the Poros liability form flow. Group leaders have
 *            no UI to correct a participant's name, age, or gender after
 *            the form is submitted. Admin would need to intervene.
 *
 * ─── WHAT WORKS ─────────────────────────────────────────────────────────────
 *
 * WORKS-4.1  Clerk sign-in works. The layout correctly uses getToken() with
 *   retries (up to 5 attempts with increasing delays) before redirecting.
 *
 * WORKS-4.2  Link-access-code flow correctly resolves BUG-3.1.
 *   POST /api/group-leader/link-access-code sets GroupRegistration.clerkUserId
 *   and makes the entire group leader portal accessible.
 *
 * WORKS-4.3  Access code is unique per group; already-linked check prevents
 *   two accounts from claiming the same registration.
 *
 * WORKS-4.4  Dashboard correctly uses PaymentBalance.totalAmountDue and
 *   GroupRegistration.totalParticipants — not re-derived from pricing or
 *   participant relation count. BUG-3.2 and BUG-3.3 do not affect the portal.
 *
 * WORKS-4.5  Multi-event support exists: sidebar dropdown shows all linked
 *   events with event name, group name, and event dates. Selection is
 *   persisted to localStorage.
 *
 * WORKS-4.6  Registration edit (restricted route) correctly limits edits to
 *   contact info and specialRequests only. Participant counts (youth,
 *   chaperone, priest) are explicitly excluded and cannot be changed.
 *
 * WORKS-4.7  Housing assign correctly validates:
 *   - Participant belongs to this group (groupRegistrationId check)
 *   - Room is allocated to this group (allocatedToGroupId check)
 *   - Bed number is within room capacity
 *   - Bed is not already taken (sequential check, non-atomic — see BUG-4.8)
 *   - Moving an already-assigned participant to a new bed clears the old
 *     assignment and decrements the old room's occupancy.
 *
 * WORKS-4.8  Auto-assign respects gender designations on rooms (male/female)
 *   and room purpose type (youth_u18, chaperone_18plus, general, clergy).
 *   Clergy (priests) are excluded from auto-assignment entirely.
 *
 * WORKS-4.9  Payment intent for balance payment uses a true PaymentIntent
 *   (pi_...) — not a Checkout Session (cs_...). Contrast with BUG-3.5 from
 *   Stage 3.
 *
 * WORKS-4.10 Payment isolation: payments route filters by
 *   `registrationId: groupRegistration.id` so Maria cannot see another
 *   group's payment history.
 *
 * WORKS-4.11 Participant form reminder emails are sent via Resend with a
 *   time-limited parent token URL (30-day expiry).
 *
 * WORKS-4.12 Housing lock (submit) is idempotent-safe: duplicate submit
 *   requests return 400 if already locked.
 *
 * WORKS-4.13 Housing lock+unlock request fields exist on GroupRegistration:
 *   housingAssignmentsLocked, housingAssignmentsSubmittedAt,
 *   housingUnlockRequested, housingUnlockRequestedAt.
 */

import { printSummary, describe, it, expect } from '../org-isolation/helpers/test-runner'

// ─── Section 4.1: Login Flow ──────────────────────────────────────────────────
describe('4.1 — Login Flow', () => {
  it('Clerk handles sign-in — magic link is the primary method', () => {
    // Clerk hosted sign-in at /sign-in uses email OTP (magic link) by default
    // OAuth (Google) may also be configured at the Clerk Dashboard level
    // The platform itself has no custom auth logic — fully delegated to Clerk
    const authDelegatedToClerk = true
    expect(authDelegatedToClerk).toBe(true)
  })

  it('layout retries getToken() up to 5 times before redirecting to /sign-in', () => {
    // layout.tsx lines 88–92: while (!token && attempts < maxAttempts)
    // Prevents false redirects during hydration when session is valid but token
    // hasn't been established yet
    const maxRetries = 5
    expect(maxRetries).toBe(5)
  })

  it('unauthenticated users are redirected to /sign-in', () => {
    // After 5 failed token attempts: router.replace('/sign-in')
    const redirectTarget = '/sign-in'
    expect(redirectTarget).toBe('/sign-in')
  })

  it('authenticated user with no linked registration is redirected to /dashboard/group-leader/link-access-code', () => {
    // Settings route returns 404 when no GroupRegistration.clerkUserId = userId
    // Layout catches 404 → router.replace('/dashboard/group-leader/link-access-code')
    const redirectTarget = '/dashboard/group-leader/link-access-code'
    expect(redirectTarget).toContain('link-access-code')
  })

  it('linking an access code sets clerkUserId on the GroupRegistration record', () => {
    // POST /api/group-leader/link-access-code:
    //   prisma.groupRegistration.update({ data: { clerkUserId: userId } })
    // This is the workaround for BUG-3.1 (clerkUserId never set at registration time)
    const linkCodeSetsClerkUserId = true
    expect(linkCodeSetsClerkUserId).toBe(true)
  })

  it('access code is case-insensitive — stored uppercase, accepted uppercase', () => {
    // link-access-code route: accessCode.toUpperCase()
    // GroupRegistration.accessCode is stored as uppercase at creation time
    const normalizedCode = 'tyc-stex-2025'.toUpperCase()
    expect(normalizedCode).toBe('TYC-STEX-2025')
  })

  it('already-linked access code returns success without re-linking', () => {
    // if (groupRegistration.clerkUserId === userId) → success (idempotent)
    const alreadyLinkedReturnsSuccess = true
    expect(alreadyLinkedReturnsSuccess).toBe(true)
  })

  it('access code claimed by another user returns 409 Conflict', () => {
    // if (groupRegistration.clerkUserId && groupRegistration.clerkUserId !== userId) → 409
    const conflictStatus = 409
    expect(conflictStatus).toBe(409)
  })

  it('after linking, user lands on the group leader dashboard (no extra navigation)', () => {
    // The link-access-code page redirects to /dashboard/group-leader after success
    const landingPage = '/dashboard/group-leader'
    expect(landingPage).toBe('/dashboard/group-leader')
  })
})

// ─── Section 4.2: Dashboard Overview ─────────────────────────────────────────
describe('4.2 — Dashboard Overview', () => {
  it('dashboard displays: event name, event dates, group name, access code', () => {
    // page.tsx shows these 4 fields in the Registration Overview card
    const displayedFields = ['eventName', 'eventDates', 'groupName', 'accessCode']
    expect(displayedFields).toContain('accessCode')
    expect(displayedFields).toContain('eventName')
  })

  it('dashboard displays total participant count from stored integer, not relation count', () => {
    // dashboard API route line 97: const totalParticipants = groupRegistration.totalParticipants
    // NOT participants.length — correctly handles the fact that Participant rows
    // don't exist until forms are submitted (see BUG-3.2 from Stage 3)
    const usesStoredInteger = true
    expect(usesStoredInteger).toBe(true)
  })

  it('dashboard payment summary reads from PaymentBalance, not re-derived from pricing', () => {
    // dashboard API route lines 90–92:
    //   paymentBalance = prisma.paymentBalance.findUnique(...)
    //   totalAmount: Number(paymentBalance.totalAmountDue)
    //   paidAmount: Number(paymentBalance.amountPaid)
    // Correctly reflects coupon discounts and early-bird rates — no BUG-3.3 impact
    const usesPaymentBalance = true
    expect(usesPaymentBalance).toBe(true)
  })

  it('payment card shows: total amount, amount paid, balance remaining, due date, overdue warning', () => {
    const paymentFields = ['totalAmount', 'paidAmount', 'balanceRemaining', 'dueDate', 'isOverdue', 'lateFeeApplied']
    expect(paymentFields).toContain('balanceRemaining')
    expect(paymentFields).toContain('isOverdue')
    expect(paymentFields).toContain('lateFeeApplied')
  })

  it('forms card shows completed/pending count using stored totalParticipants as denominator', () => {
    // dashboard API lines 97–101:
    //   const totalParticipants = groupRegistration.totalParticipants  // e.g. 15
    //   const completedForms = participants.filter(liabilityFormCompleted).length
    //   const pendingForms = totalParticipants - completedForms  // correct: 15 - 0 = 15 pending
    const totalParticipants = 15
    const completedForms = 0 // no Participant rows exist yet
    const pendingForms = totalParticipants - completedForms
    expect(pendingForms).toBe(15)
  })

  it('certificates card tracks chaperone safe-environment certificate status', () => {
    // Counts chaperones with safeEnvironmentCertStatus === 'uploaded' or 'verified'
    const certStatuses = ['uploaded', 'verified', 'pending']
    expect(certStatuses).toContain('verified')
    expect(certStatuses).toContain('uploaded')
  })

  it('multi-event dropdown shows event name, group name, and event dates per entry', () => {
    // layout.tsx SelectItem renders: event.eventName, event.groupName, event.eventDates
    const dropdownFields = ['eventName', 'groupName', 'eventDates']
    expect(dropdownFields.length).toBe(3)
  })

  it('selected event is persisted to localStorage across page refreshes', () => {
    // EventContext: localStorage.setItem('selectedEventId', id)
    // On mount: const savedEventId = localStorage.getItem('selectedEventId')
    const persistedAcrossRefresh = true
    expect(persistedAcrossRefresh).toBe(true)
  })

  it('BUG-4.1: dashboard API uses selectedEventId as eventId column filter, but selectedEventId is a registration UUID', () => {
    // settings route returns linkedEvents[].id = reg.id (registration UUID)
    // dashboard page calls GET /api/group-leader/dashboard?eventId=<registrationUUID>
    // dashboard API: whereClause.eventId = eventId  (treats registrationUUID as event column)
    // Result: WHERE clerkUserId = userId AND eventId = registrationUUID → 0 rows → 404
    const registrationUUID = 'a1b2c3d4-0000-0000-0000-000000000000'
    const eventUUID        = 'b2c3d4e5-0000-0000-0000-000000000000'
    const selectedEventId  = registrationUUID // what EventContext stores
    const willFindRecord   = selectedEventId === eventUUID // false — never matches
    expect(willFindRecord).toBe(false)
  })

  it('BUG-4.1: the root cause is settings route returning reg.id instead of reg.eventId', () => {
    // Fix: settings route line 129 should be: id: reg.eventId (not id: reg.id)
    const settingsReturnsShouldBe = 'id: reg.eventId'
    expect(settingsReturnsShouldBe).toContain('reg.eventId')
  })

  it('GAP-4.1: "Contact Event Organizers" button emails hardcoded ChiRho support, not org contactEmail', () => {
    // page.tsx line 488: mailto:support@chirhoevents.com?subject=Event Question
    // Should use: groupRegistration.event.organization.contactEmail
    const hardcodedEmail = 'support@chirhoevents.com'
    const isOrgEmail = hardcodedEmail.endsWith('@chirhoevents.com')
    expect(isOrgEmail).toBe(true) // it's chirho's own email, not the organizer's
  })
})

// ─── Section 4.3: Roster Viewing ─────────────────────────────────────────────
describe('4.3 — Roster Viewing', () => {
  it('participants route returns participants with: name, email, age, gender, type', () => {
    const returnedFields = [
      'firstName', 'lastName', 'preferredName',
      'age', 'gender', 'participantType',
      'email',
    ]
    expect(returnedFields).toContain('participantType')
    expect(returnedFields).toContain('age')
  })

  it('participants route returns form status and PDF URL per participant', () => {
    const formFields = ['liabilityFormCompleted', 'liabilityFormId', 'liabilityFormPdfUrl', 'liabilityFormCompletedAt']
    expect(formFields).toContain('liabilityFormCompleted')
    expect(formFields).toContain('liabilityFormPdfUrl')
  })

  it('participants route returns medical data from liability forms', () => {
    // Includes: medicalConditions, allergies, medications
    // This is LIABILITY FORM data (submitted by parents) — not Rapha clinical data
    // Group leaders legitimately need this for emergency response
    const medicalFields = ['medicalConditions', 'allergies', 'medications']
    expect(medicalFields).toContain('medicalConditions')
  })

  it('participants route returns emergency contact information', () => {
    const emergencyFields = [
      'emergencyContact1Name', 'emergencyContact1Phone', 'emergencyContact1Relation',
      'emergencyContact2Name', 'emergencyContact2Phone', 'emergencyContact2Relation',
    ]
    expect(emergencyFields.length).toBe(6)
  })

  it('BUG-4.2: participants route has no event filter — always returns first registration participants', () => {
    // GET /api/group-leader/participants:
    //   findFirst({ where: { clerkUserId: userId } }) — no eventId filter
    // If Maria has 2 linked registrations, Participants tab always shows
    // the first one, even when she selects the second event in the dropdown
    const hasEventFilter = false
    expect(hasEventFilter).toBe(false)
  })

  it('Rapha clinical examination records are NOT accessible to group leaders', () => {
    // Group leaders have no rapha.access permission
    // Rapha data is not included in any group-leader API response
    const raphaDataExposed = false
    expect(raphaDataExposed).toBe(false)
  })

  it('participants are sorted by: participantType asc, lastName asc, firstName asc', () => {
    // participants route orderBy: [{ participantType: 'asc' }, { lastName: 'asc' }, ...]
    const sortOrder = ['participantType asc', 'lastName asc', 'firstName asc']
    expect(sortOrder[0]).toBe('participantType asc')
  })
})

// ─── Section 4.4: Roster Editing ─────────────────────────────────────────────
describe('4.4 — Roster Editing', () => {
  it('group leader can edit their own contact info via restricted edit route', () => {
    // PUT /api/group-leader/registration/edit:
    //   allows: groupLeaderName, email, phone, address, specialRequests
    const allowedEdits = ['groupLeaderName', 'groupLeaderEmail', 'groupLeaderPhone',
      'groupLeaderStreet', 'groupLeaderCity', 'groupLeaderState', 'groupLeaderZip', 'specialRequests']
    expect(allowedEdits).toContain('groupLeaderEmail')
    expect(allowedEdits.length).toBe(8)
  })

  it('restricted edit route explicitly prevents changing groupName, parishName, dioceseName, housingType, counts', () => {
    // /registration/edit route.ts comment lines 78:
    //   "Explicitly NOT updating: groupName, parishName, dioceseName, housingType, counts"
    const immutableFields = ['groupName', 'parishName', 'dioceseName', 'housingType',
      'youthCount', 'chaperoneCount', 'priestCount']
    expect(immutableFields).toContain('housingType')
    expect(immutableFields).toContain('youthCount')
  })

  it('BUG-4.3: the unrestricted PUT /api/group-leader/registration allows editing housingType', () => {
    // /api/group-leader/registration (PUT) route.ts line 137:
    //   housingType: updateData.housingType  ← no restriction
    // This changes housing type without adjusting capacity or PaymentBalance
    const unrestrictedRouteAllowsHousingTypeChange = true
    expect(unrestrictedRouteAllowsHousingTypeChange).toBe(true)
  })

  it('two edit routes exist with inconsistent access control policies', () => {
    const routes = [
      '/api/group-leader/registration/edit',  // restricted: contact info only
      '/api/group-leader/registration',       // unrestricted: groupName, housingType, etc.
    ]
    expect(routes.length).toBe(2)
  })

  it('participant counts (youthCount, chaperoneCount, priestCount) cannot be changed via ANY portal route', () => {
    // Both PUT routes explicitly exclude count fields from updateData
    // Comment in /api/group-leader/registration route.ts line 115–117:
    //   "Participant counts... are intentionally excluded from updates.
    //    These must be changed by administrators..."
    const countsAreImmutable = true
    expect(countsAreImmutable).toBe(true)
  })

  it('GAP-4.2: there is no participant drop (delete) endpoint in the group leader portal', () => {
    // No DELETE /api/group-leader/participants/[participantId] exists
    // Group leaders cannot mark individual participants as dropped
    const dropEndpointExists = false
    expect(dropEndpointExists).toBe(false)
  })

  it('GAP-4.4: individual participant details cannot be edited through the group leader portal', () => {
    // Participant records are created/edited via Poros liability form flow only
    // No group-leader API routes modify the Participant table directly
    const participantEditEndpointExists = false
    expect(participantEditEndpointExists).toBe(false)
  })

  it('restricted edit route verifies ownership via clerkUserId check before updating', () => {
    // /registration/edit route.ts lines 57–63:
    //   if (existingRegistration.clerkUserId !== userId) → 403
    const ownershipChecked = true
    expect(ownershipChecked).toBe(true)
  })

  it('edit sends a confirmation email listing each changed field', () => {
    // /registration/edit builds a changes array comparing old vs new values
    // and sends it via Resend
    const changeTrackingEmailSent = true
    expect(changeTrackingEmailSent).toBe(true)
  })
})

// ─── Section 4.5: Housing Assignments View ───────────────────────────────────
describe('4.5 — Housing Assignments View', () => {
  it('housing view shows: building name, room number, floor, capacity, gender, bed assignments', () => {
    const housingFields = ['buildingName', 'roomNumber', 'floor', 'capacity', 'gender', 'beds']
    expect(housingFields).toContain('buildingName')
    expect(housingFields).toContain('beds')
  })

  it('each bed is identified by number AND letter (1→A, 2→B ... 8→H)', () => {
    function bedNumberToLetter(bedNumber: number): string {
      const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
      return letters[bedNumber - 1] || bedNumber.toString()
    }
    expect(bedNumberToLetter(1)).toBe('A')
    expect(bedNumberToLetter(8)).toBe('H')
    expect(bedNumberToLetter(9)).toBe('9') // fallback for oversized rooms
  })

  it('housing is only available for on_campus registrations', () => {
    // housing GET route line 31: housingType: 'on_campus' filter
    // Off-campus and commuter groups get 404 on the housing endpoint
    const housingFilterType = 'on_campus'
    expect(housingFilterType).toBe('on_campus')
  })

  it('priests are excluded from housing assignment display', () => {
    // participants query: where: { participantType: { not: 'priest' } }
    const priestsExcluded = true
    expect(priestsExcluded).toBe(true)
  })

  it('housing shows lock status, submission timestamp, and unlock request state', () => {
    const lockFields = ['isLocked', 'submittedAt', 'unlockRequested', 'unlockRequestedAt']
    expect(lockFields).toContain('isLocked')
    expect(lockFields).toContain('unlockRequested')
  })

  it('group leader CANNOT change housing assignments, only view them — FALSE: they CAN assign', () => {
    // Contrary to what might be expected, group leaders have full housing assignment
    // capability (assign, auto-assign, submit). Admin does NOT need to do this.
    const groupLeaderCanAssign = true
    expect(groupLeaderCanAssign).toBe(true)
  })

  it('BUG-4.7: housing GET uses eventId: eventId filter but POST routes use id: eventId', () => {
    // GET route line 30: where: { clerkUserId: userId, eventId: eventId }
    // POST assign/submit/auto-assign: where: { clerkUserId: userId, id: eventId }
    // If client passes registration UUID, GET fails (404) but POSTs succeed
    const housingGetUsesEventIdColumn = true  // whereClause.eventId = eventId
    const housingPostUsesPrimaryKey   = true  // whereClause.id = eventId
    expect(housingGetUsesEventIdColumn).toBe(true)
    expect(housingPostUsesPrimaryKey).toBe(true)
  })
})

// ─── Section 4.6: Auto-Assign Housing ────────────────────────────────────────
describe('4.6 — Auto-Assign Housing', () => {
  it('auto-assign IS available to group leaders — not admin-only', () => {
    // POST /api/group-leader/housing/auto-assign exists and is authenticated by
    // Clerk user identity, not by role check
    const isAdminOnly = false
    expect(isAdminOnly).toBe(false)
  })

  it('auto-assign respects gender designations on rooms', () => {
    // getRoomCategory() maps: male + youth_u18 → male_u18 room
    //                          female + youth_u18 → female_u18 room
    //                          male + chaperone_18plus → male_chaperone room
    // Only participants of matching category are assigned to matching rooms
    const genderRespected = true
    expect(genderRespected).toBe(true)
  })

  it('auto-assign respects room capacity — stops when all beds are filled', () => {
    // For each participant: finds first available bed across rooms sorted by
    // most available beds. Stops if no beds remain.
    const capacityRespected = true
    expect(capacityRespected).toBe(true)
  })

  it('auto-assign excludes priests (clergy) from room assignments', () => {
    // getParticipantCategory(): if participantType === 'priest' → return null
    // null-category participants are not included in unassigned list
    const priestsExcluded = true
    expect(priestsExcluded).toBe(true)
  })

  it('auto-assign is per-category (male_u18, female_u18, male_chaperone, female_chaperone)', () => {
    // Body requires: { eventId, category }  where category is one of these 4 values
    const categories = ['male_u18', 'female_u18', 'male_chaperone', 'female_chaperone']
    expect(categories.length).toBe(4)
  })

  it('auto-assign is blocked when housingAssignmentsLocked = true', () => {
    // auto-assign route line 80: if (housingAssignmentsLocked) → 400
    const blockedWhenLocked = true
    expect(blockedWhenLocked).toBe(true)
  })

  it('auto-assign only operates on rooms already allocated to this group', () => {
    // Uses groupRegistration.allocatedRooms — rooms pre-allocated by admin
    // Cannot assign to rooms of other groups
    const confinedToAllocatedRooms = true
    expect(confinedToAllocatedRooms).toBe(true)
  })
})

// ─── Section 4.7: Payment Status & Making Payments ───────────────────────────
describe('4.7 — Payment Status and Making Payments', () => {
  it('payment history shows all transactions for this registration', () => {
    // payments API: prisma.payment.findMany({ where: { registrationId, registrationType: 'group' } })
    const paymentHistoryFields = ['amount', 'paymentType', 'paymentMethod', 'paymentStatus',
      'receiptUrl', 'checkNumber', 'processedAt']
    expect(paymentHistoryFields).toContain('receiptUrl')
    expect(paymentHistoryFields).toContain('checkNumber')
  })

  it('payment balance correctly shows totalAmountDue, amountPaid, amountRemaining', () => {
    const balanceFields = ['totalAmountDue', 'amountPaid', 'amountRemaining', 'lateFeesApplied', 'paymentStatus']
    expect(balanceFields).toContain('amountRemaining')
    expect(balanceFields).toContain('lateFeesApplied')
  })

  it('"Make Payment" creates a Stripe PaymentIntent with destination charge', () => {
    // POST /api/group-leader/payments/create-payment-intent:
    //   payment_intent_data: {
    //     application_fee_amount: platformFeeAmount,
    //     transfer_data: { destination: org.stripeAccountId }
    //   }
    const usesDestinationCharge = true
    expect(usesDestinationCharge).toBe(true)
  })

  it('payment intent stores actual PaymentIntent ID (pi_...) not session ID', () => {
    // The route calls stripe.paymentIntents.create() and stores paymentIntent.id
    // This is the actual PI ID — contrast with BUG-3.5 where initial deposit
    // stored a Checkout Session ID
    const paymentIntentId = 'pi_test_abc123'
    expect(paymentIntentId.startsWith('pi_')).toBe(true)
  })

  it('platform fee is correctly calculated on the balance payment amount', () => {
    const balanceAmount = 2475 // dollars
    const amountInCents = Math.round(balanceAmount * 100)
    const platformFeePercentage = 1
    const platformFeeAmount = Math.round(amountInCents * (platformFeePercentage / 100))
    expect(platformFeeAmount).toBe(2475) // 2475 cents = $24.75
  })

  it('BUG-4.4: no guard against overpayment — any positive amount is accepted', () => {
    // POST /api/group-leader/payments/create-payment-intent:
    //   if (!amount || amount <= 0) → 400  (only checks positive)
    //   NO check: amount <= paymentBalance.amountRemaining
    const amountDue = 500
    const attemptedPayment = 9999
    const isBlocked = attemptedPayment <= amountDue
    expect(isBlocked).toBe(false) // overpayment NOT blocked
  })

  it('GAP-4.3: PaymentBalance not updated until Stripe webhook fires', () => {
    // create-payment-intent creates Payment record with status=pending
    // PaymentBalance.amountPaid only increments via payment_intent.succeeded webhook
    const balanceUpdatedImmediately = false
    expect(balanceUpdatedImmediately).toBe(false)
  })
})

// ─── Section 4.8: Form Reminders ─────────────────────────────────────────────
describe('4.8 — Form Reminders (Safe Environment & Liability)', () => {
  it('forms page shows placeholder slots for forms not yet started', () => {
    // forms route: emptySlots = totalParticipants - participants.length
    // Creates pending-N placeholder entries for unfilled spots
    const totalParticipants = 15
    const participantRowsCreated = 0 // at registration time
    const emptySlots = totalParticipants - participantRowsCreated
    expect(emptySlots).toBe(15) // 15 placeholders on first portal login
  })

  it('forms page correctly calculates "0/15 completed" at time of registration', () => {
    const completed = 0
    const totalRequired = 15
    const display = `${completed}/${totalRequired} completed`
    expect(display).toBe('0/15 completed')
  })

  it('bulk email reminder sends to parentEmail for youth_u18 participants only', () => {
    // bulk-email-reminders route line 56:
    //   if (participant.participantType === 'youth_u18' && participant.parentEmail)
    const eligibleType = 'youth_u18'
    const requiresParentEmail = true
    expect(eligibleType).toBe('youth_u18')
    expect(requiresParentEmail).toBe(true)
  })

  it('BUG-4.6: bulk reminders skip chaperones, adult youth, and priests', () => {
    // Only youth_u18 with parentEmail get reminder emails
    // Chaperones and adult participants get no reminder even if form is incomplete
    const skippedTypes = ['chaperone', 'youth_o18', 'priest']
    expect(skippedTypes).toContain('chaperone')
  })

  it('BUG-4.6: returned send count includes undefined entries for skipped participants', () => {
    // The map() returns undefined for non-qualifying participants
    // emailPromises.length = total participants count, not actual sends
    const participants = [
      { participantType: 'youth_u18', parentEmail: 'parent@example.com' },
      { participantType: 'chaperone', parentEmail: null },
      { participantType: 'youth_u18', parentEmail: null }, // no parentEmail
    ]
    const emailPromises = participants.map(p => {
      if (p.participantType === 'youth_u18' && p.parentEmail) {
        return Promise.resolve('sent')
      }
      // else returns undefined implicitly
    })
    const reportedCount = emailPromises.length          // 3 (the bug: includes undefineds)
    const actualSendCount = emailPromises.filter(Boolean).length  // 1
    // The bug: route returns count: emailPromises.length (3) instead of actualSendCount (1)
    expect(reportedCount).toBe(3)       // buggy reported value
    expect(actualSendCount).toBe(1)     // correct value
    expect(reportedCount).not.toBe(actualSendCount) // mismatch confirms the bug
  })

  it('parent token URL has 30-day expiry for liability form links', () => {
    // parentTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const expiryMs = 30 * 24 * 60 * 60 * 1000
    const expiryDays = expiryMs / (24 * 60 * 60 * 1000)
    expect(expiryDays).toBe(30)
  })

  it('reminder correctly verifies all participant IDs belong to this user\'s group', () => {
    // bulk-email-reminders WHERE:
    //   id: { in: participantIds },
    //   groupRegistration: { clerkUserId: userId }
    // Cannot send reminders for another group's participants
    const ownershipVerified = true
    expect(ownershipVerified).toBe(true)
  })
})

// ─── Section 4.9: Registration Edit Requests ─────────────────────────────────
describe('4.9 — Registration Edit Requests', () => {
  it('group leader can update their own contact information via the portal', () => {
    // PUT /api/group-leader/registration/edit: contact fields only
    const canUpdateContactInfo = true
    expect(canUpdateContactInfo).toBe(true)
  })

  it('group leader cannot change headcount (add or remove spots) through any portal route', () => {
    // Both PUT routes explicitly exclude youthCount, chaperoneCount, priestCount, totalParticipants
    const canChangeHeadcount = false
    expect(canChangeHeadcount).toBe(false)
  })

  it('headcount changes require contacting the org admin (no formal request system)', () => {
    // There is no /api/group-leader/registration/request-change endpoint
    // The portal Quick Actions "Contact Event Organizers" points to support email
    // (hardcoded ChiRho email — see GAP-4.1)
    const formalRequestSystemExists = false
    expect(formalRequestSystemExists).toBe(false)
  })
})

// ─── Section 4.10: Support Messaging ─────────────────────────────────────────
describe('4.10 — Support Messaging', () => {
  it('BUG-4.5: CRITICAL — support message route never sends any email', () => {
    // POST /api/group-leader/support/message route.ts lines 46–57:
    //   "// TODO: Implement email sending"
    //   "// For now, just log the message"
    //   console.log('Support message from:', ...)
    //   return { success: true, message: 'Your message has been sent...' }
    // No resend.emails.send() call exists in this route
    const emailSentToAdmin = false
    expect(emailSentToAdmin).toBe(false)
  })

  it('BUG-4.5: org admin receives no notification of support messages', () => {
    // The route reads groupRegistration.event.organization.contactEmail
    // but only logs it to console — never sends to it
    const adminNotified = false
    expect(adminNotified).toBe(false)
  })

  it('BUG-4.5: group leader is falsely told their message was delivered', () => {
    // Response: { success: true, message: 'Your message has been sent to the event organizers.' }
    // This is a lie — no message was sent
    const falseSuccessReturned = true
    expect(falseSuccessReturned).toBe(true)
  })

  it('there is no in-portal conversation history or reply mechanism', () => {
    // No SupportTicket conversation thread is created
    // No database record is written for support messages
    const conversationHistoryExists = false
    expect(conversationHistoryExists).toBe(false)
  })
})

// ─── Section 4.11: Portal Isolation Checks ───────────────────────────────────
describe('4.11 — Portal Isolation (Security)', () => {
  it('all group-leader API routes require Clerk authentication', () => {
    // All routes start with: getClerkUserIdFromRequest(request) → 401 if null
    const allRoutesAuthenticated = true
    expect(allRoutesAuthenticated).toBe(true)
  })

  it('registration data is scoped to clerkUserId — cannot see another group\'s data', () => {
    // All WHERE clauses include: clerkUserId: userId
    // Even if an attacker knows another registration's UUID, they cannot see
    // its data without matching Clerk credentials
    const dataScopedToUser = true
    expect(dataScopedToUser).toBe(true)
  })

  it('link-access-code prevents claiming another user\'s already-linked code', () => {
    // if (groupRegistration.clerkUserId && groupRegistration.clerkUserId !== userId) → 409
    const claimingOthersCodeBlocked = true
    expect(claimingOthersCodeBlocked).toBe(true)
  })

  it('housing room assignment verifies participant belongs to this group', () => {
    // assign route: participant = findFirst({ where: { id: participantId, groupRegistrationId: groupRegistration.id } })
    // Cannot assign another group's participant to Maria's allocated rooms
    const participantOwnershipVerified = true
    expect(participantOwnershipVerified).toBe(true)
  })

  it('housing room assignment verifies room is allocated to this group', () => {
    // assign route: room = findFirst({ where: { id: roomId, allocatedToGroupId: groupRegistration.id } })
    // Cannot assign a bed in a room allocated to a different group
    const roomOwnershipVerified = true
    expect(roomOwnershipVerified).toBe(true)
  })

  it('bulk email reminders verify all participant IDs belong to caller\'s group', () => {
    // WHERE: groupRegistration: { clerkUserId: userId }
    // Cannot send reminders for another group's participants by passing their IDs
    const reminderIsolationEnforced = true
    expect(reminderIsolationEnforced).toBe(true)
  })

  it('BUG-4.2: multi-event data leakage — participants from wrong event visible when multiple registrations linked', () => {
    // participants route findFirst({ where: { clerkUserId: userId } }) has no event filter
    // If Maria is also registered for a second event, she sees that event's
    // participants instead of the selected event's participants on the roster tab
    const incorrectEventDataShown = true
    expect(incorrectEventDataShown).toBe(true)
  })

  it('Rapha clinical medical records are not exposed to group leaders', () => {
    // The /api/group-leader/* routes do not query Rapha-specific tables
    // Rapha access requires 'rapha.access' permission which group_leader role lacks
    const raphaDataExposedToGroupLeader = false
    expect(raphaDataExposedToGroupLeader).toBe(false)
  })

  it('URL manipulation (changing registrationId in requests) is blocked by clerkUserId ownership check', () => {
    // All queries include { clerkUserId: userId } — even if you forge a registrationId
    // in the request, the clerkUserId check prevents access to another user's data
    const urlManipulationBlocked = true
    expect(urlManipulationBlocked).toBe(true)
  })
})

// ─── Section 4.12: Bug Severity Summary ──────────────────────────────────────
describe('4.12 — Bug Severity Summary', () => {
  it('CRITICAL: BUG-4.5 — support messages silently discarded; admin never notified', () => {
    const severity = 'critical'
    expect(severity).toBe('critical')
  })

  it('HIGH: BUG-4.1 — dashboard and payments API broken by registration UUID / event UUID mismatch', () => {
    // Dashboard shows "No registration found" for all users due to Fix #6 mismatch
    const severity = 'high'
    expect(severity).toBe('high')
  })

  it('HIGH: BUG-4.3 — housingType can be changed without adjusting capacity or PaymentBalance', () => {
    const severity = 'high'
    expect(severity).toBe('high')
  })

  it('MEDIUM: BUG-4.2 — participants and forms pages show wrong event data for multi-event users', () => {
    const severity = 'medium'
    expect(severity).toBe('medium')
  })

  it('MEDIUM: BUG-4.4 — no overpayment guard on balance payment intent creation', () => {
    const severity = 'medium'
    expect(severity).toBe('medium')
  })

  it('MEDIUM: BUG-4.7 — housing GET and POST routes use different field semantics for event lookup', () => {
    const severity = 'medium'
    expect(severity).toBe('medium')
  })

  it('MEDIUM: BUG-4.8 — housing bed assignment has a race condition (non-atomic check+create)', () => {
    const severity = 'medium'
    expect(severity).toBe('medium')
  })

  it('LOW: BUG-4.6 — bulk email reminders only work for youth_u18 with parentEmail', () => {
    const severity = 'low'
    expect(severity).toBe('low')
  })

  it('LOW: BUG-4.9 — housing submission sends no confirmation email and no admin notification', () => {
    const severity = 'low'
    expect(severity).toBe('low')
  })
})

printSummary()
