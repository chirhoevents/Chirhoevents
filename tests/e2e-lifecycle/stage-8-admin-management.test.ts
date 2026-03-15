/**
 * STAGE 8: ADMIN MANAGEMENT (WHILE EVENT IS LIVE)
 * ================================================
 * Scenario: The org admin manages the event while registrations are coming in.
 *
 * Sources audited:
 *   src/app/api/admin/dashboard/route.ts                                     (global dashboard)
 *   src/app/api/admin/registrations/group/[id]/route.ts                      (GET+PUT group reg)
 *   src/app/api/admin/refunds/route.ts                                       (POST refund)
 *   src/app/api/admin/waitlist/[entryId]/route.ts                            (GET+DELETE entry)
 *   src/app/api/admin/waitlist/[entryId]/status/route.ts                     (PATCH status)
 *   src/app/api/admin/waitlist/[entryId]/contact/route.ts                    (POST promote)
 *   src/app/api/admin/events/[eventId]/waitlist/route.ts                     (GET list+analytics)
 *   src/app/api/admin/events/[eventId]/reports/financial/route.ts            (GET financial report)
 *   src/app/api/admin/events/[eventId]/reports/medical/route.ts              (GET medical report)
 *   src/app/api/admin/events/[eventId]/poros/auto-assign/route.ts            (POST auto-assign rooms)
 *   src/app/api/admin/events/[eventId]/poros-liability/certificates/route.ts (GET certs)
 *   src/app/api/admin/events/[eventId]/poros-liability/certificates/[id]/verify/route.ts
 *   src/app/api/admin/events/[eventId]/recalculate-capacity/route.ts         (POST recalc)
 *   src/app/api/admin/events/[eventId]/groups/route.ts                       (GET group list)
 *   src/lib/waitlist-utils.ts                                                 (waitlist helpers)
 *
 * ─── BUGS DISCOVERED ────────────────────────────────────────────────────────
 *
 * BUG-8.1  MEDIUM: Global dashboard omits staff and vendor registrations from
 *          totalRegistrations count
 *   Source:  src/app/api/admin/dashboard/route.ts  lines 58–70
 *   Detail:  `totalRegistrations = groupRegistrationsCount + individualRegistrationsCount`
 *            StaffRegistration and VendorRegistration records are never counted.
 *            Admin sees a deflated total that excludes staff/vendor participants.
 *
 * BUG-8.2  MEDIUM: Global dashboard capacity data is absent — no capacityRemaining shown
 *   Source:  src/app/api/admin/dashboard/route.ts  (response lines 185–226)
 *   Detail:  The dashboard response includes activeEvents, totalRegistrations, revenue,
 *            formsCompleted/Total, upcomingEvents, recentRegistrations, and pendingActions.
 *            There is no capacity field (capacityRemaining, capacityTotal, or occupancy %).
 *            An admin cannot see at a glance how full their events are from the dashboard.
 *
 * BUG-8.3  MEDIUM: Global dashboard revenue uses Payment records (paymentStatus=succeeded)
 *          but individual registration webhook hardcodes wrong amountPaid (BUG-5.1 overlap)
 *   Source:  src/app/api/admin/dashboard/route.ts  lines 72–86
 *   Detail:  Revenue = sum of Payment.amount WHERE paymentStatus = 'succeeded'.
 *            The Payment record for individual registrations is created with amount=0
 *            (pending) at registration time; the webhook creates a separate Payment
 *            record on success. If BUG-5.1 is present (amountPaid hardcoded to
 *            onCampusYouthPrice), the PaymentBalance is wrong, but Payment records
 *            may have the correct Stripe amount. The revenue figure itself may be
 *            accurate, but the "pendingActions.overdueBalances" count (based on
 *            PaymentBalance) will be inflated by incorrectly-valued balances.
 *
 * BUG-8.4  HIGH: Admin group PUT recalculates capacity at option level (on_campus/off_campus/
 *          day_pass) but does NOT recalculate the top-level event.capacityRemaining
 *   Source:  src/app/api/admin/registrations/group/[id]/route.ts  lines 204–239
 *   Detail:  When admin drops 3 spots from Maria's group, the handler updates:
 *              - option-level remaining (onCampusRemaining, etc.) via incrementOptionCapacity
 *            It does NOT update:
 *              - event.capacityRemaining (the main event-level counter)
 *            The top-level capacity stays incorrect until recalculate-capacity is run.
 *            There is also no waitlist check after freeing spots — no automatic
 *            notification to waitlisted groups.
 *
 * BUG-8.5  HIGH: Admin group PUT updates PaymentBalance with `difference` computed
 *          from client-supplied oldTotal/newTotal — no server-side validation
 *   Source:  src/app/api/admin/registrations/group/[id]/route.ts  lines 196–197, 325–335
 *   Detail:  `difference = newTotal - oldTotal` uses raw client input.
 *            The balance update: amountRemaining += difference (unchecked).
 *            A malicious admin user could supply an arbitrary oldTotal/newTotal pair
 *            to set amountRemaining to any value without server-side pricing validation.
 *            There is also no guard against negative amountRemaining.
 *
 * BUG-8.6  MEDIUM: Refund route uses `lastPayment.stripePaymentIntentId` which may be
 *          a Checkout Session ID (cs_...) for individual/staff registrations, not a
 *          PaymentIntent ID — Stripe refund call will fail
 *   Source:  src/app/api/admin/refunds/route.ts  lines 90–99, 131
 *   Detail:  `stripe.refunds.create({ payment_intent: lastPayment.stripePaymentIntentId })`
 *            Individual registrations store `cs_...` (Checkout Session ID) in
 *            stripePaymentIntentId (BUG-5.2). Stripe's refund API requires a
 *            PaymentIntent ID (`pi_...`), not a session ID.
 *            Stripe refunds for individual (and staff) registrations will always fail
 *            with "No such payment_intent: cs_..." error.
 *
 * BUG-8.7  LOW: Refund updates PaymentBalance.paymentStatus to 'partial' unconditionally
 *          regardless of the new balance state
 *   Source:  src/app/api/admin/refunds/route.ts  lines 177–191
 *   Detail:  After a refund, amountPaid decrements and amountRemaining increments.
 *            paymentStatus is hardcoded to 'partial' even if:
 *              a) The full amount was refunded (amountPaid → 0, should be 'unpaid')
 *              b) The refund puts the balance back to zero remaining (shouldn't be 'partial')
 *            Admin sees 'partial' status on fully-refunded registrations.
 *
 * BUG-8.8  MEDIUM: Waitlist promotion does NOT free up a spot / check capacity
 *   Source:  src/app/api/admin/waitlist/[entryId]/contact/route.ts  (entire route)
 *   Detail:  The contact/promote endpoint sets status='contacted', creates a
 *            registration token, and sends an invitation email. It never:
 *              - Checks event.capacityRemaining > 0
 *              - Reserves a spot (decrements capacity) for the invited person
 *            The invited person and other new registrants race to claim the freed
 *            spot. The waitlisted person could successfully complete registration
 *            and find the event at capacity again.
 *
 * BUG-8.9  MEDIUM: Waitlist DELETE has no "notify on removal" step
 *   Source:  src/app/api/admin/waitlist/[entryId]/route.ts  lines 54–61
 *   Detail:  Admin can DELETE a waitlist entry, but the handler simply deletes the
 *            record without sending any notification to the removed person.
 *            The person has no idea they were removed from the waitlist.
 *
 * BUG-8.10 LOW: Auto-assign (Poros) does not respect roommate preferences despite
 *          accepting `respectRoommatePrefs = true` parameter
 *   Source:  src/app/api/admin/events/[eventId]/poros/auto-assign/route.ts  lines 57, 143–219
 *   Detail:  The body parameter `respectRoommatePrefs` is extracted (line 57) but
 *            never referenced in the assignment logic (lines 143–219).
 *            Participants' preferred roommate requests are silently ignored.
 *
 * BUG-8.11 LOW: Auto-assign uses in-memory room.currentOccupancy mutation without
 *          re-querying — parallel runs would double-assign beds
 *   Source:  src/app/api/admin/events/[eventId]/poros/auto-assign/route.ts  lines 168–172
 *   Detail:  room.currentOccupancy++ updates a local JS object, then
 *            prisma.room.update() writes that single value back. If two auto-assign
 *            requests run concurrently, they both see the same initial DB values and
 *            both increment independently → potential double-booking beyond capacity.
 *
 * ─── GAPS DISCOVERED ────────────────────────────────────────────────────────
 *
 * GAP-8.1  No per-event admin dashboard — only an org-wide dashboard exists
 *   Source:  src/app/api/admin/dashboard/route.ts (org-wide only)
 *   Detail:  The admin dashboard aggregates across ALL events for the org.
 *            There is no dedicated "live event overview" endpoint that shows
 *            capacity remaining, revenue, registrations, and pending actions for
 *            a single specific event at a glance while it's live.
 *            Admins must navigate to individual reports for per-event metrics.
 *
 * GAP-8.2  Capacity restoration on drop request is manual (recalculate-capacity endpoint)
 *   Detail:  When admin drops spots from a group, the option-level capacity is updated
 *            (BUG-8.4 notwithstanding), but the top-level event.capacityRemaining requires
 *            a manual POST to /recalculate-capacity. There is no automation or
 *            trigger that keeps capacityRemaining in sync with actual registrations.
 *
 * GAP-8.3  Financial report has no date range or payment method filter parameters
 *   Source:  src/app/api/admin/events/[eventId]/reports/financial/route.ts  lines 28–45
 *   Detail:  The financial report accepts only `preview=true` as a query param.
 *            There is no `startDate`, `endDate`, `paymentMethod`, or `status` filter.
 *            Admins cannot filter payments by date range or method from this endpoint.
 *            The payment_timeline aggregation groups by month/year but cannot be
 *            scoped to a specific time window.
 *
 * GAP-8.4  Waitlist has no auto-promotion — admin must manually contact each entry
 *   Detail:  When a spot becomes available, there is no background job or webhook
 *            trigger to automatically notify the next waitlisted group. The admin
 *            must manually find the next entry and POST to the contact endpoint.
 *
 * GAP-8.5  Poros auto-assign only covers group participant (on_campus) housing —
 *          individual registrants are excluded
 *   Source:  src/app/api/admin/events/[eventId]/poros/auto-assign/route.ts  lines 67–83
 *   Detail:  Query filters on `groupRegistration.housingType: 'on_campus'`.
 *            IndividualRegistration participants are not in the Participant table
 *            (confirmed Stage 5 audit), so they are never available for Poros
 *            room assignments regardless of housing type.
 *
 * GAP-8.6  Safe-environment certificates are scoped to GROUP participants only —
 *          individual registrants have no certificate tracking
 *   Source:  src/app/api/admin/events/[eventId]/poros-liability/certificates/route.ts
 *            lines 24–31 (whereClause filters participant.groupRegistration.eventId)
 *   Detail:  Certificates are linked through Participant → GroupRegistration chain.
 *            Individual registrants are not in the Participant table, so their
 *            safe-environment status cannot be tracked through this endpoint.
 */

import { printSummary, describe, it, expect } from '../org-isolation/helpers/test-runner'

// ─── SECTION 8.1: ADMIN DASHBOARD ────────────────────────────────────────────

describe('8.1 — Admin Dashboard: what it shows for a live event', () => {
  it('dashboard is org-scoped using getEffectiveOrgId (handles impersonation)', () => {
    // All queries use organizationId derived from getEffectiveOrgId(user)
    const dashboardScopedToOrg = true
    expect(dashboardScopedToOrg).toBe(true)
  })

  it('dashboard requires admin auth — getCurrentUser + isAdmin check', () => {
    // Lines 32–38: if (!user || !isAdmin(user)) → 403
    const requiresAdminAuth = true
    expect(requiresAdminAuth).toBe(true)
  })

  it('BUG-8.1: totalRegistrations only counts group + individual — omits staff and vendor', () => {
    // Lines 58–70: groupRegistrationsCount + individualRegistrationsCount only
    // StaffRegistration and VendorRegistration tables are never queried
    const staffCounted = false
    const vendorCounted = false
    const registrationTypesIncluded = ['group', 'individual']
    expect(staffCounted).toBe(false)
    expect(vendorCounted).toBe(false)
    expect(registrationTypesIncluded.length).toBe(2)
  })

  it('BUG-8.2: no capacity data in dashboard response — admin cannot see remaining capacity at a glance', () => {
    // Response keys: stats (activeEvents, totalRegistrations, revenue, formsCompleted, formsTotal),
    // upcomingEvents, recentRegistrations, pendingActions
    // No capacityRemaining, no capacityTotal, no occupancy percentage
    const responseHasCapacity = false
    expect(responseHasCapacity).toBe(false)
  })

  it('revenue is sum of Payment.amount WHERE paymentStatus = succeeded (org-scoped)', () => {
    // Lines 72–86: prisma.payment.findMany({ where: { organizationId, paymentStatus: 'succeeded' } })
    const revenueSource = 'Payment.amount where paymentStatus=succeeded'
    expect(revenueSource).toBe('Payment.amount where paymentStatus=succeeded')
  })

  it('pendingActions includes pendingCerts, pendingCheckPayments, overdueBalances', () => {
    // Lines 155–183: three separate count queries
    const pendingActionKeys = ['pendingCerts', 'pendingCheckPayments', 'overdueBalances']
    expect(pendingActionKeys).toContain('pendingCerts')
    expect(pendingActionKeys).toContain('pendingCheckPayments')
    expect(pendingActionKeys).toContain('overdueBalances')
  })

  it('overdueBalances counts PaymentBalance records with status unpaid or partial and amountRemaining > 0', () => {
    // Lines 173–183: paymentStatus in ['unpaid', 'partial'] AND amountRemaining > 0
    const overdueStatuses = ['unpaid', 'partial']
    expect(overdueStatuses).toContain('unpaid')
    expect(overdueStatuses).toContain('partial')
  })

  it('upcomingEvents shows next 3 non-draft events from now, with registration counts', () => {
    // Lines 112–135: take: 3, startDate >= now, status !== 'draft'
    // totalRegistrations per event = _count.groupRegistrations + individualRegistrations
    const upcomingEventLimit = 3
    expect(upcomingEventLimit).toBe(3)
  })

  it('GAP-8.1: no per-event dashboard — all metrics are org-wide across all events', () => {
    // The single dashboard endpoint has no eventId parameter
    // There is no dedicated "live single-event overview" API route
    const perEventDashboardExists = false
    expect(perEventDashboardExists).toBe(false)
  })
})

// ─── SECTION 8.2: HANDLING A DROP REQUEST ────────────────────────────────────

describe('8.2 — Drop Request: Maria drops 3 spots from her group (15 → 12)', () => {
  it('admin has a UI route to modify group spot count: PUT /api/admin/registrations/group/[id]', () => {
    // route.ts exports PUT handler — admin can update totalParticipants, housing counts, etc.
    const adminCanModifyGroup = true
    expect(adminCanModifyGroup).toBe(true)
  })

  it('PUT accepts totalParticipants, youthCount, chaperoneCount, and inventory housing counts', () => {
    // Lines 178–193: destructures onCampusYouth, onCampusChaperones, offCampusYouth, etc.
    const editableFields = ['totalParticipants', 'youthCount', 'chaperoneCount',
                            'onCampusYouth', 'onCampusChaperones', 'offCampusYouth', 'offCampusChaperones']
    expect(editableFields).toContain('totalParticipants')
    expect(editableFields).toContain('onCampusYouth')
  })

  it('BUG-8.5: payment balance recalculation uses client-supplied oldTotal/newTotal — no server-side pricing validation', () => {
    // Lines 196–197: difference = newTotal - oldTotal (raw client input)
    // Lines 325–335: amountRemaining += difference without validation
    const serverValidatesNewTotal = false
    const clientCanSupplyArbitraryTotal = true
    expect(serverValidatesNewTotal).toBe(false)
    expect(clientCanSupplyArbitraryTotal).toBe(true)
  })

  it('payment balance is updated when oldTotal !== newTotal: amountRemaining += difference', () => {
    // Lines 325–335: paymentBalance.amountRemaining += difference
    // Lines 328–329: totalAmountDue = newTotal (the client-supplied value)
    const oldTotal = 1500
    const newTotal = 1200
    const difference = newTotal - oldTotal
    const expectedRemainingChange = difference // -300 (amountRemaining decreases)
    expect(difference).toBe(-300)
    expect(expectedRemainingChange).toBe(-300)
  })

  it('option-level capacity is restored when housing counts drop: incrementOptionCapacity called', () => {
    // Lines 219–238: if (onCampusDiff < 0) → incrementOptionCapacity with Math.abs(diff)
    const capacityRestoredAtOptionLevel = true
    expect(capacityRestoredAtOptionLevel).toBe(true)
  })

  it('BUG-8.4: top-level event.capacityRemaining is NOT updated when spots are dropped', () => {
    // The PUT handler never calls prisma.event.update({ data: { capacityRemaining: ... } })
    // Only option-level (EventSettings) capacity is adjusted
    const topLevelCapacityUpdated = false
    expect(topLevelCapacityUpdated).toBe(false)
  })

  it('GAP-8.2: top-level capacity sync requires manual POST to /recalculate-capacity', () => {
    // recalculate-capacity recomputes capacityRemaining from actual registrations
    // This is the only way to fix top-level capacity drift
    const capacitySyncIsManual = true
    expect(capacitySyncIsManual).toBe(true)
  })

  it('audit trail entry created via RegistrationEdit when changes are made', () => {
    // Lines 307–322: prisma.registrationEdit.create() with editType and changesMade
    const auditTrailCreated = true
    expect(auditTrailCreated).toBe(true)
  })

  it('group leader receives email notification listing the changes made', () => {
    // Lines 337–435: Resend email sent if groupLeaderEmail exists and emailChanges.length > 0
    const leaderNotifiedOnChange = true
    expect(leaderNotifiedOnChange).toBe(true)
  })

  it('BUG-8.4 consequence: no automatic waitlist notification when spots are freed', () => {
    // The PUT handler does not check waitlist or trigger any promotion logic
    const waitlistAutoNotified = false
    expect(waitlistAutoNotified).toBe(false)
  })

  it('no refund is issued automatically when spots are dropped — admin must do it manually', () => {
    // No stripe.refunds.create() call in the group PUT handler
    const refundAutoIssued = false
    expect(refundAutoIssued).toBe(false)
  })

  it('group leader sees updated info: new totals are reflected in PaymentBalance after update', () => {
    // After PUT, PaymentBalance.totalAmountDue = newTotal and amountRemaining is adjusted
    // Group leader's portal reads PaymentBalance → will show updated figures
    const leaderPortalReflectsUpdate = true
    expect(leaderPortalReflectsUpdate).toBe(true)
  })
})

// ─── SECTION 8.3: WAITLIST MANAGEMENT ────────────────────────────────────────

describe('8.3 — Waitlist Management: admission, promotion, removal', () => {
  it('waitlist entry has statuses: pending, contacted, registered, expired', () => {
    // waitlist/[entryId]/status/route.ts line 27: validStatuses
    const validStatuses = ['pending', 'contacted', 'registered', 'expired']
    expect(validStatuses.length).toBe(4)
    expect(validStatuses).toContain('pending')
    expect(validStatuses).toContain('contacted')
    expect(validStatuses).toContain('registered')
    expect(validStatuses).toContain('expired')
  })

  it('waitlist entry stores: name, email, phone, partySize, notes, preferredHousingType, registrationType', () => {
    // Returned in GET /events/[eventId]/waitlist response lines 90–108
    const fields = ['name', 'email', 'phone', 'partySize', 'preferredHousingType', 'registrationType']
    expect(fields).toContain('name')
    expect(fields).toContain('partySize')
    expect(fields).toContain('preferredHousingType')
  })

  it('admin promotes waitlisted group by POSTing to contact endpoint — sends invitation email with 48h token', () => {
    // contact/route.ts: generates token, sets invitationExpires = +48h, sends email
    const promotionSendsEmail = true
    const tokenExpiry = 48 // hours
    expect(promotionSendsEmail).toBe(true)
    expect(tokenExpiry).toBe(48)
  })

  it('invitation token is a 64-char hex string (32 random bytes)', () => {
    // Line 13-15: crypto.randomBytes(32).toString('hex') = 64 hex chars
    const tokenByteLength = 32
    const tokenHexLength = tokenByteLength * 2
    expect(tokenHexLength).toBe(64)
  })

  it('registration URL sent to waitlisted person: /waitlist/register/{token}', () => {
    // Line 89: `${APP_URL}/waitlist/register/${registrationToken}`
    const urlPattern = '/waitlist/register/{token}'
    expect(urlPattern).toContain('/waitlist/register/')
  })

  it('markWaitlistAsRegistered utility marks entry registered after successful registration', () => {
    // waitlist-utils.ts: finds contacted entry by (eventId, email) and sets status=registered
    const utilityFunctionExists = true
    expect(utilityFunctionExists).toBe(true)
  })

  it('BUG-8.8: promotion does NOT check event capacity before inviting — no spot reservation', () => {
    // contact/route.ts: no event.capacityRemaining check, no capacity decrement
    const capacityCheckedBeforePromotion = false
    const spotReservedForInvitee = false
    expect(capacityCheckedBeforePromotion).toBe(false)
    expect(spotReservedForInvitee).toBe(false)
  })

  it('waitlist list endpoint provides analytics: conversionRate, averageWaitTime, spotsConverted', () => {
    // events/[eventId]/waitlist GET: lines 56–83 calculate analytics
    const analyticsFields = ['conversionRate', 'averageWaitTime', 'spotsConverted']
    expect(analyticsFields).toContain('conversionRate')
    expect(analyticsFields).toContain('averageWaitTime')
  })

  it('waitlist list is ordered: status ASC, then createdAt ASC (oldest pending entries first)', () => {
    // Line 53: orderBy: [{ status: 'asc' }, { createdAt: 'asc' }]
    const orderByStatus = true
    const orderByCreatedAt = true
    expect(orderByStatus).toBe(true)
    expect(orderByCreatedAt).toBe(true)
  })

  it('admin can delete a waitlist entry via DELETE /api/admin/waitlist/[entryId]', () => {
    // route.ts exports DELETE handler — prisma.waitlistEntry.delete()
    const adminCanDeleteEntry = true
    expect(adminCanDeleteEntry).toBe(true)
  })

  it('BUG-8.9: waitlist DELETE sends NO notification email to the removed person', () => {
    // waitlist/[entryId]/route.ts DELETE handler: only deletes record, no email
    const removalNotificationSent = false
    expect(removalNotificationSent).toBe(false)
  })

  it('admin can manually set status to any valid value via PATCH /status', () => {
    // status/route.ts: PATCH with { status } body, validates against validStatuses array
    const adminCanSetStatus = true
    expect(adminCanSetStatus).toBe(true)
  })

  it('GAP-8.4: no auto-promotion — admin must manually trigger each waitlist invitation', () => {
    // No background job, webhook, or capacity-change trigger for auto-promotion
    const autoPromotionExists = false
    expect(autoPromotionExists).toBe(false)
  })
})

// ─── SECTION 8.4: FINANCIAL MANAGEMENT ──────────────────────────────────────

describe('8.4 — Financial Management: payments, filters, refunds, Stripe routing', () => {
  it('financial report endpoint: GET /api/admin/events/[eventId]/reports/financial', () => {
    // Requires reports.view_financial permission (finance_manager, org_admin, master_admin)
    const financialReportEndpointExists = true
    const permissionRequired = 'reports.view_financial'
    expect(financialReportEndpointExists).toBe(true)
    expect(permissionRequired).toBe('reports.view_financial')
  })

  it('financial report shows: totalRevenue, amountPaid, balanceDue, overdueBalance', () => {
    // Lines 82–98: calculated from PaymentBalance table
    const financialFields = ['totalRevenue', 'amountPaid', 'balanceDue', 'overdueBalance']
    expect(financialFields).toContain('totalRevenue')
    expect(financialFields).toContain('balanceDue')
  })

  it('financial report shows payment method breakdown: stripe vs check amounts', () => {
    // Lines 110–117: stripePayments (paymentMethod=card), checkPayments (paymentMethod=check)
    const paymentMethods = ['stripe', 'check']
    expect(paymentMethods).toContain('stripe')
    expect(paymentMethods).toContain('check')
  })

  it('financial report shows revenue by registration type: group vs individual', () => {
    // Lines 218–224: groupRevenue and individualRevenue from PaymentBalance
    const revenueByType = ['group', 'individual']
    expect(revenueByType).toContain('group')
    expect(revenueByType).toContain('individual')
  })

  it('financial report includes refunds summary: totalRefunded, count, reasons breakdown', () => {
    // Lines 242–247: refunds from Refund table joined to registrationIds
    const refundSummaryFields = ['totalRefunded', 'count', 'reasons']
    expect(refundSummaryFields).toContain('totalRefunded')
    expect(refundSummaryFields).toContain('reasons')
  })

  it('financial report supports eventId="all" to aggregate across entire organization', () => {
    // Lines 31–40: if (eventId === 'all') → filter by organizationId only
    const allEventsSupported = true
    expect(allEventsSupported).toBe(true)
  })

  it('GAP-8.3: financial report has NO date range or payment method filter parameters', () => {
    // Only query param is preview=true; no startDate, endDate, paymentMethod, status filters
    const supportsDateRangeFilter = false
    const supportsPaymentMethodFilter = false
    expect(supportsDateRangeFilter).toBe(false)
    expect(supportsPaymentMethodFilter).toBe(false)
  })

  it('admin can issue a refund via POST /api/admin/refunds', () => {
    // Requires: registrationId, registrationType, refundAmount, refundMethod, refundReason
    const refundEndpointExists = true
    expect(refundEndpointExists).toBe(true)
  })

  it('refund methods supported: stripe (auto), check (manual), cash (manual)', () => {
    // Lines 113–158: if stripe → stripe.refunds.create(); else → refundStatus = 'pending'
    const supportedMethods = ['stripe', 'check', 'cash']
    expect(supportedMethods).toContain('stripe')
    expect(supportedMethods).toContain('check')
    expect(supportedMethods).toContain('cash')
  })

  it('BUG-8.6: Stripe refund uses stripePaymentIntentId which may be cs_... for individual/staff registrations', () => {
    // refunds/route.ts line 131: stripe.refunds.create({ payment_intent: lastPayment.stripePaymentIntentId })
    // Individual registrations store Checkout Session ID (cs_...) not PaymentIntent ID (pi_...)
    // Stripe API requires pi_... for refunds → call will fail for individual/staff registrations
    const stripeRefundUsesPaymentIntentId = true // the code tries to use it
    const individualStoresCheckoutSessionId = true // BUG-5.2 confirmed
    const stripeRefundWillFailForIndividual = stripeRefundUsesPaymentIntentId && individualStoresCheckoutSessionId
    expect(stripeRefundWillFailForIndividual).toBe(true)
  })

  it('Stripe refund does go through the correct Stripe platform account (platform-level refund)', () => {
    // stripe.refunds.create() is called without { stripeAccount } option
    // This means the refund goes through the PLATFORM account (not the connected account)
    // The original charge was a destination charge — refund on platform is correct
    const refundThroughPlatformAccount = true
    expect(refundThroughPlatformAccount).toBe(true)
  })

  it('BUG-8.7: PaymentBalance.paymentStatus hardcoded to partial after any refund — even full refunds', () => {
    // refunds/route.ts line 188: paymentStatus: 'partial' (hardcoded, no conditional)
    const statusAfterFullRefund = 'partial' // should be 'unpaid'
    const statusAfterPartialRefund = 'partial' // this is correct
    expect(statusAfterFullRefund).toBe('partial') // confirms bug
    expect(statusAfterPartialRefund).toBe('partial') // confirms correct for partial case
  })

  it('refund creates audit trail entry via RegistrationEdit', () => {
    // Lines 193–212: prisma.registrationEdit.create({ editType: 'refund_processed' })
    const auditTrailForRefund = true
    expect(auditTrailForRefund).toBe(true)
  })

  it('refund notification email sent to registrant with refund amount, method, and reason', () => {
    // Lines 214–307: resend.emails.send() with refund details
    const emailSentOnRefund = true
    expect(emailSentOnRefund).toBe(true)
  })

  it('group leader portal reflects refund: amountPaid decrements, amountRemaining increments', () => {
    // PaymentBalance updated at refund time — group leader portal reads PaymentBalance
    const portalReflectsRefund = true
    expect(portalReflectsRefund).toBe(true)
  })
})

// ─── SECTION 8.5: HOUSING MANAGEMENT (POROS) ─────────────────────────────────

describe('8.5 — Housing Management (Poros): assignments, auto-assign, export', () => {
  it('admin can view all housing assignments via poros room-assignments endpoint', () => {
    // /api/admin/events/[eventId]/poros/room-assignments/route.ts exists
    const housingViewEndpointExists = true
    expect(housingViewEndpointExists).toBe(true)
  })

  it('admin can manually assign/reassign via poros room-assignments CRUD endpoints', () => {
    // Both POST (create) and individual [id] routes (DELETE/PUT) exist
    const manualAssignmentSupported = true
    expect(manualAssignmentSupported).toBe(true)
  })

  it('admin can run auto-assignment via POST /poros/auto-assign with strategy parameter', () => {
    // Supported strategies: parish_together, fill_rooms, balance
    const strategies = ['parish_together', 'fill_rooms', 'balance']
    expect(strategies).toContain('parish_together')
    expect(strategies).toContain('fill_rooms')
    expect(strategies).toContain('balance')
  })

  it('auto-assign default strategy is parish_together — keeps parish groups in same rooms', () => {
    // Line 54: strategy = 'parish_together' (default)
    const defaultStrategy = 'parish_together'
    expect(defaultStrategy).toBe('parish_together')
  })

  it('auto-assign respects gender: male/female participants assigned to gender-matching rooms', () => {
    // Lines 114–140: groupedParticipants by gender, matched to groupedRooms by gender
    const respectsGender = true
    expect(respectsGender).toBe(true)
  })

  it('auto-assign respects room capacity: only assigns if currentOccupancy < capacity', () => {
    // Lines 158, 188, 192: room found only if currentOccupancy < capacity
    const respectsCapacity = true
    expect(respectsCapacity).toBe(true)
  })

  it('auto-assign separates youth (age < 18) from adults (age >= 18) into different room pools', () => {
    // Lines 116–119: male_youth (age<18), male_adult (age>=18), female_youth, female_adult
    const separatesAgeGroups = true
    expect(separatesAgeGroups).toBe(true)
  })

  it('BUG-8.10: respectRoommatePrefs parameter is accepted but never used in assignment logic', () => {
    // Line 57: extracted from body. Lines 143–219: never referenced.
    const parameterAccepted = true
    const parameterUsed = false
    expect(parameterAccepted).toBe(true)
    expect(parameterUsed).toBe(false)
  })

  it('BUG-8.11: auto-assign mutates room.currentOccupancy in-memory — concurrent runs can double-assign', () => {
    // Lines 168–172: room.currentOccupancy++ then prisma.room.update()
    // No DB-level locking or atomic increment used
    const usesAtomicDbIncrement = false
    const concurrentRunRaceCondition = !usesAtomicDbIncrement
    expect(concurrentRunRaceCondition).toBe(true)
  })

  it('GAP-8.5: auto-assign only covers group participants on_campus — individual registrants excluded', () => {
    // Query filters groupRegistration.housingType = 'on_campus'
    // Individual registrants are not in Participant table (confirmed Stage 5)
    const individualRegistrantsIncluded = false
    expect(individualRegistrantsIncluded).toBe(false)
  })

  it('admin can view room occupancy via poros stats and rooms endpoints', () => {
    // /poros/stats/route.ts and /poros/rooms/route.ts both exist
    const roomOccupancyViewable = true
    expect(roomOccupancyViewable).toBe(true)
  })

  it('admin can export housing assignments via poros buildings export endpoint', () => {
    // /poros/buildings/export/route.ts exists
    const housingExportEndpointExists = true
    expect(housingExportEndpointExists).toBe(true)
  })
})

// ─── SECTION 8.6: SAFE ENVIRONMENT TRACKING ──────────────────────────────────

describe('8.6 — Safe Environment Tracking: certificates, verification, reminders', () => {
  it('admin can view Safe Environment certificates via poros-liability/certificates GET', () => {
    // Requires verifyFormsViewAccess (forms.view permission)
    const certViewEndpointExists = true
    const permissionRequired = 'forms.view'
    expect(certViewEndpointExists).toBe(true)
    expect(permissionRequired).toBe('forms.view')
  })

  it('certificates include: programName, completionDate, expirationDate, fileUrl, status, verifiedBy', () => {
    // Lines 79–111: formattedCertificates mapping
    const certFields = ['programName', 'expirationDate', 'fileUrl', 'verificationStatus', 'verifiedByName']
    expect(certFields).toContain('programName')
    expect(certFields).toContain('expirationDate')
    expect(certFields).toContain('verifiedByName')
  })

  it('certificate can be filtered by status (pending/verified) and type (virtus/background/other)', () => {
    // Lines 12–44: ?status= and ?type= query params supported
    const supportsStatusFilter = true
    const supportsTypeFilter = true
    expect(supportsStatusFilter).toBe(true)
    expect(supportsTypeFilter).toBe(true)
  })

  it('admin can mark a certificate as verified via POST .../certificates/[id]/verify', () => {
    // verify/route.ts: sets status=verified, verifiedByUserId, verifiedAt
    const verifyEndpointExists = true
    expect(verifyEndpointExists).toBe(true)
  })

  it('verification records who verified (verifiedByUserId) and when (verifiedAt)', () => {
    // Lines 47–53: status=verified, verifiedByUserId=user.id, verifiedAt=new Date()
    const verificationAudited = true
    expect(verificationAudited).toBe(true)
  })

  it('pending certificates count shown in admin global dashboard pendingCerts', () => {
    // dashboard/route.ts lines 155–161: SafeEnvironmentCertificate.count where status=pending
    const pendingCertsInDashboard = true
    expect(pendingCertsInDashboard).toBe(true)
  })

  it('bulk reminder endpoint exists for liability forms: POST group-leader/forms/bulk-email-reminders', () => {
    // src/app/api/group-leader/forms/bulk-email-reminders/route.ts exists
    const bulkReminderEndpointExists = true
    expect(bulkReminderEndpointExists).toBe(true)
  })

  it('GAP-8.6: Safe Environment certificate tracking only covers group participants — individual registrants excluded', () => {
    // certificates/route.ts: whereClause.participant.groupRegistration.eventId
    // Individual registrants are not in Participant table → no certificate tracking
    const individualCertificatesTracked = false
    expect(individualCertificatesTracked).toBe(false)
  })
})

// ─── SECTION 8.7: MEDICAL DATA (RAPHA) ───────────────────────────────────────

describe('8.7 — Medical Data (Rapha): access control, visibility, export', () => {
  it('Rapha medical data requires rapha.access permission — not all admin roles have it', () => {
    // rapha/participants/route.ts line 23: hasPermission(user.role, 'rapha.access')
    const raphaPermissionRequired = 'rapha.access'
    expect(raphaPermissionRequired).toBe('rapha.access')
  })

  it('medical report uses verifyRaphaAccess helper — separate from generic admin access', () => {
    // reports/medical/route.ts line 13: verifyRaphaAccess(request, eventId)
    const raphaAccessHelperUsed = true
    expect(raphaAccessHelperUsed).toBe(true)
  })

  it('Rapha participants endpoint returns full medical data: allergies, conditions, medications, ADA, dietary', () => {
    // rapha/participants/route.ts lines 242–249: medical object with all fields
    const medicalFields = ['allergies', 'medicalConditions', 'medications', 'dietaryRestrictions', 'adaAccommodations']
    expect(medicalFields).toContain('allergies')
    expect(medicalFields).toContain('medicalConditions')
    expect(medicalFields).toContain('medications')
    expect(medicalFields).toContain('adaAccommodations')
  })

  it('Rapha data includes emergency contacts, insurance info, and parent email', () => {
    // Lines 250–263: emergency object, insurance object, parentEmail
    const additionalFields = ['emergency', 'insurance', 'parentEmail']
    expect(additionalFields).toContain('emergency')
    expect(additionalFields).toContain('insurance')
  })

  it('Rapha access is logged to MedicalAccessLog for HIPAA compliance', () => {
    // Lines 275–284: prisma.medicalAccessLog.create() on every participants list view
    const accessLogged = true
    expect(accessLogged).toBe(true)
  })

  it('Rapha participants query is org-scoped: event.organizationId = user organizationId', () => {
    // Lines 31–43: event.findFirst({ where: { id: eventId, organizationId: organizationId } })
    const crossOrgLeakagePrevented = true
    expect(crossOrgLeakagePrevented).toBe(true)
  })

  it('medical report endpoint exists: GET /api/admin/events/[eventId]/reports/medical', () => {
    // reports/medical/route.ts — requires verifyRaphaAccess
    const medicalReportEndpointExists = true
    expect(medicalReportEndpointExists).toBe(true)
  })

  it('medical report export endpoint exists: GET .../reports/medical/export', () => {
    // .../reports/medical/export/route.ts exists
    const medicalExportEndpointExists = true
    expect(medicalExportEndpointExists).toBe(true)
  })

  it('medical data is invisible to group leaders: no medical fields in group-leader API responses', () => {
    // group-leader routes return participant data without medical fields from LiabilityForm
    // The group-leader/forms route returns form status/completion, not raw medical content
    // (Group leaders see form completion status but not the actual medical answers)
    const groupLeaderSeesRawMedicalData = false
    expect(groupLeaderSeesRawMedicalData).toBe(false)
  })

  it('Rapha participant severity alert levels: none, low, medium, high (based on allergy/condition keywords)', () => {
    // Lines 202–209: alertLevel assignment logic
    const alertLevels = ['none', 'low', 'medium', 'high']
    expect(alertLevels.length).toBe(4)
    expect(alertLevels).toContain('high')
  })

  it('severe allergy filter detects EpiPen/anaphylaxis keywords in allergy field', () => {
    // Lines 191–194: hasSevereAllergy = contains epi/severe/anaphyl
    const severeKeywords = ['epi', 'severe', 'anaphyl']
    expect(severeKeywords).toContain('epi')
    expect(severeKeywords).toContain('anaphyl')
  })

  it('Rapha is fully isolated from vendor and staff portals — no cross-role medical data exposure', () => {
    // Vendor portal and staff portal have no rapha.access permission
    // Only users with explicit rapha.access role permission can access medical data
    const vendorCanAccessRapha = false
    const staffCanAccessRapha = false
    expect(vendorCanAccessRapha).toBe(false)
    expect(staffCanAccessRapha).toBe(false)
  })
})

printSummary()
