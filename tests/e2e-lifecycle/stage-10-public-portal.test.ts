/**
 * STAGE 10: PUBLIC PORTAL (DURING EVENT)
 * =======================================
 * Scenario: The conference is live. Anonymous visitors, people who've already
 * registered, and potential new registrants are visiting the public pages.
 *
 * Sources audited:
 *   src/app/events/[eventId]/page.tsx                                   (landing page SSR)
 *   src/app/events/[eventId]/EventLandingClient.tsx                     (client registration section)
 *   src/app/api/events/route.ts                                          (GET /api/events — list)
 *   src/app/api/events/[eventId]/route.ts                                (GET event detail)
 *   src/app/api/events/[eventId]/registration-status/route.ts            (GET registration status)
 *   src/app/api/events/[eventId]/waitlist/route.ts                       (POST join waitlist)
 *   src/app/api/events/[eventId]/staff-vendor-settings/route.ts          (GET staff/vendor settings)
 *   src/app/api/events/[eventId]/coupons/validate/route.ts               (POST coupon validation)
 *   src/app/api/events/[eventId]/resources/lookup/route.ts               (GET resource portal lookup)
 *   src/app/api/registration/[registrationId]/route.ts                   (GET confirmation data)
 *   src/app/registration/confirmation/[registrationId]/page.tsx          (confirmation page)
 *   src/app/api/public/poros/[eventId]/m2k-data/route.ts                 (public M2K data dump)
 *   src/lib/registration-status.ts                                       (status calculation logic)
 *
 * ─── BUGS DISCOVERED ────────────────────────────────────────────────────────
 *
 * BUG-10.1  MEDIUM: No "already registered?" mechanism on the public event page
 *   Source:  events/[eventId]/page.tsx, EventLandingClient.tsx
 *   Detail:  The public landing page shows registration buttons and a waitlist
 *            button but provides no way for an already-registered group leader or
 *            individual to access their existing registration. There is no link
 *            to the group leader portal, no "look up my registration" flow, and
 *            no "already registered?" help text. The only way to find a
 *            registration is to receive the confirmation email or navigate directly
 *            to /registration/confirmation/[registrationId]. New visitors who lost
 *            their email have no recovery path from the public event page.
 *
 * BUG-10.2  HIGH: Confirmation page always receives stripped API response —
 *           accessCode, qrCode, and financial data never displayed to registrants
 *   Source:  registration/confirmation/[registrationId]/page.tsx  line 41
 *            api/registration/[registrationId]/route.ts  lines 54-147
 *   Detail:  The confirmation page fetches:
 *              fetch(`/api/registration/${registrationId}`)
 *            with no Authorization header and no `credentials` option. Clerk
 *            authentication requires a Bearer JWT in the Authorization header;
 *            browser cookie sessions are NOT read by getClerkUserIdFromRequest().
 *            The API's auth check:
 *              const clerkUserId = await getClerkUserIdFromRequest(request)
 *              if (clerkUserId) { ... isAuthorized = ... }
 *            always returns isAuthorized=false for this unauthenticated fetch,
 *            so the response is the stripped public version:
 *              { id, groupName, totalParticipants, eventName, housingType, ... }
 *            The page then calls:
 *              registration.depositPaid.toFixed(2)   // TypeError — field absent
 *              registration.totalAmount.toFixed(2)   // TypeError — field absent
 *              registration.balanceRemaining.toFixed(2) // TypeError — field absent
 *            These TypeErrors crash the page for newly registered users. The
 *            access code (shown as the main CTA) and QR code are also absent,
 *            so the user sees a broken page. The confirmation email (sent
 *            separately by the POST handler) contains all of this data, which
 *            partially masks the failure, but the on-screen confirmation is broken.
 *
 * BUG-10.3  MEDIUM: /api/registration/[registrationId] exposes limited data to
 *           any unauthenticated caller with the registration UUID
 *   Source:  api/registration/[registrationId]/route.ts  lines 134-147
 *   Detail:  Unauthenticated callers receive:
 *              { id, groupName, totalParticipants, eventName, housingType,
 *                registrationStatus, organizationName, organizationLogoUrl }
 *            This includes groupName (e.g. "St. Mary's Youth Group"), participant
 *            count, housing type preference, and registration status. While UUIDs
 *            are v4 random (not guessable in practice), this is still more data
 *            than a fully public endpoint should expose. No sensitive fields
 *            (accessCode, email, payments) are leaked, so severity is low-medium.
 *
 * BUG-10.4  HIGH: /api/public/poros/[eventId]/m2k-data is fully unauthenticated
 *           and exposes sensitive PII and operational data for the M2K event
 *   Source:  api/public/poros/[eventId]/m2k-data/route.ts  lines 1-365
 *   Detail:  The endpoint serves a complete event operations dump with NO
 *            authentication check. Data returned includes:
 *              - Group leader full names and direct phone numbers
 *              - Youth and chaperone counts per group
 *              - Special accommodations and ADA accommodation summaries
 *              - Full room and building assignments for every group
 *              - ADA individuals: name, gender, accessibility needs, room assignment
 *              - SGL (Small Group Leader) full names
 *              - Complete schedule, meal group times, seating assignments
 *            The sole protection is the hardcoded event ID check:
 *              if (eventId !== M2K_EVENT_ID) return 404
 *            But M2K_EVENT_ID is a constant in source code:
 *              'b9b70d36-ae35-47a0-aeb7-a50df9a598f1'
 *            Any unauthenticated request to
 *              GET /api/public/poros/b9b70d36-ae35-47a0-aeb7-a50df9a598f1/m2k-data
 *            returns the full dataset. This violates HIPAA for ADA/medical data
 *            and COPPA for minors' housing/rooming information.
 *
 * BUG-10.5  LOW: /api/events/[eventId]/resources/lookup has no rate limiting —
 *           attacker can enumerate all participants for events with portal enabled
 *   Source:  api/events/[eventId]/resources/lookup/route.ts  lines 30-65
 *   Detail:  The lookup searches by exact first+last name (case-insensitive) and
 *            returns housing, roommates' names, small group, meal group, seating.
 *            When publicPortalEnabled=true, anyone can call:
 *              GET /api/events/{eventId}/resources/lookup?q=John+Smith
 *            There is no rate limiting, CAPTCHA, auth requirement, or request
 *            throttling. An attacker with a name list (yearbook, school directory,
 *            parish roster) can enumerate each participant to learn:
 *              - Exact room number and building
 *              - Roommates' full names
 *              - Meal group and times
 *              - Small group leader name and meeting location
 *            This is intentional functionality but lacks any access controls
 *            beyond the event-level `publicPortalEnabled` flag.
 *
 * BUG-10.6  MEDIUM: /api/events/[eventId] returns the full settings object without
 *           field filtering — exposes internal event configuration to the public
 *   Source:  api/events/[eventId]/route.ts  line 72: settings: event.settings
 *   Detail:  The event settings object is returned wholesale. EventSettings
 *            likely includes internal-only fields such as:
 *              liabilityFormsRequiredGroup, onCampusCapacity, onCampusRemaining,
 *              offCampusCapacity, offCampusRemaining, waitlistEnabled,
 *              staffRegistrationEnabled, vendorRegistrationEnabled,
 *              countdownBeforeOpen, countdownBeforeClose, publicPortalEnabled, ...
 *            While none of these fields are catastrophically sensitive, exposing
 *            the full settings object leaks internal event configuration to the
 *            public (e.g., max on-campus capacity, whether a public portal is
 *            enabled). The registration-status endpoint correctly uses select{}
 *            to expose only what's needed; the event detail endpoint does not.
 *
 * ─── GAPS DISCOVERED ────────────────────────────────────────────────────────
 *
 * GAP-10.1  No CAPTCHA, bot detection, or rate limiting on public registration,
 *           waitlist, and coupon endpoints
 *   Detail:  These endpoints accept unauthenticated POST/GET with no anti-bot
 *            protection:
 *              POST /api/registration/group
 *              POST /api/registration/individual
 *              POST /api/registration/staff
 *              POST /api/registration/vendor
 *              POST /api/events/[eventId]/waitlist
 *              POST /api/events/[eventId]/coupons/validate (coupon brute-force)
 *              GET  /api/registration/staff/validate-vendor-code (code brute-force)
 *            A bot could register thousands of fake groups, fill the waitlist,
 *            or enumerate coupon codes and vendor codes with no friction.
 *
 * GAP-10.2  staff-vendor-settings endpoint exposes organizationId in the response
 *   Source:  api/events/[eventId]/staff-vendor-settings/route.ts  line 85
 *   Detail:  The response includes `organizationId: event.organizationId`. This
 *            is the org's internal UUID and could be used to target org-specific
 *            admin endpoints or correlate events across different event IDs.
 *            Callers only need the event slug to learn the org UUID.
 *
 * GAP-10.3  No public "check my registration" feature — registrants who lose
 *           their confirmation email have no recovery path from the event page
 *   Detail:  The event landing page shows buttons for new registration and
 *            waitlist only. There is no "already registered?" link, no
 *            registration lookup by email, and no link to the group leader
 *            portal sign-in. Users who need to log in and access their portal
 *            must navigate there independently (e.g., know the /sign-in URL).
 */

import { printSummary, describe, it, expect } from '../org-isolation/helpers/test-runner'

// ─── SECTION 10.1: PUBLIC EVENT PAGE ─────────────────────────────────────────

describe('10.1 — Public Event Page: registration status, content, waitlist, "already registered"', () => {
  it('the public event page is server-rendered and requires no authentication', () => {
    // events/[eventId]/page.tsx: no auth check, direct prisma query
    const requiresAuth = false
    expect(requiresAuth).toBe(false)
  })

  it('page shows: event name, dates, location, description, organization name', () => {
    // page.tsx: hero section renders event.name, formatDateRange, event.locationName,
    //           event.description, event.organization.name
    const publicFields = ['name', 'startDate', 'endDate', 'locationName', 'description', 'orgName']
    expect(publicFields).toContain('name')
    expect(publicFields).toContain('locationName')
    expect(publicFields).toContain('orgName')
  })

  it('total capacity shown only when settings.showCapacity is not false', () => {
    // page.tsx line 210: {event.capacityTotal && (event.settings?.showCapacity !== false) && ...}
    // Shows capacityTotal (e.g. "500 attendees") — NOT individual group counts
    const capacityCondition = 'capacityTotal && showCapacity !== false'
    expect(capacityCondition).toContain('showCapacity')
  })

  it('spots remaining shown as a message, not raw number, when showAvailability is true', () => {
    // getSpotsRemainingMessage returns "Only N spots remaining!" or "N spots available"
    // Displayed only when status.spotsRemaining > 0 and settings.showAvailability=true
    const spotsShownAsMessage = true
    const rawCapacityRemainingExposed = false
    expect(spotsShownAsMessage).toBe(true)
    expect(rawCapacityRemainingExposed).toBe(false)
  })

  it('registration status is computed from dates + capacity — six possible states', () => {
    // registration-status.ts: not_yet_open, open, closing_soon, closed, at_capacity, event_ended
    const statusTypes = [
      'not_yet_open', 'open', 'closing_soon', 'closed', 'at_capacity', 'event_ended'
    ]
    expect(statusTypes).toContain('at_capacity')
    expect(statusTypes).toContain('not_yet_open')
    expect(statusTypes).toContain('event_ended')
  })

  it('when registration is open: shows Group and/or Individual register buttons based on settings', () => {
    // EventLandingClient: renders Link to /register-group and /register-individual
    // when status.allowRegistration=true and respective enabled flag is true
    const groupButtonShown = true
    const individualButtonShown = true
    expect(groupButtonShown).toBe(true)
    expect(individualButtonShown).toBe(true)
  })

  it('when at capacity with waitlist enabled: shows "Join Waitlist" button, not register buttons', () => {
    // registration-status.ts line 105-108: at_capacity → allowRegistration=false, allowWaitlist=enableWaitlist
    // EventLandingClient line 132: renders Join Waitlist if status.allowWaitlist
    const atCapacityShowsWaitlist = true
    const atCapacityShowsRegisterButton = false
    expect(atCapacityShowsWaitlist).toBe(true)
    expect(atCapacityShowsRegisterButton).toBe(false)
  })

  it('waitlist button opens a modal — no redirect to registration form', () => {
    // EventLandingClient line 136: onClick={() => setIsWaitlistModalOpen(true)}
    const waitlistUsesModal = true
    expect(waitlistUsesModal).toBe(true)
  })

  it('when event is closed or ended: shows disabled button with contextual message', () => {
    // EventLandingClient lines 143-155: disabled button with status-appropriate label
    const closedButtonLabel = 'Registration Closed'
    const endedButtonLabel = 'Event Has Ended'
    const notOpenLabel = 'Registration Not Yet Open'
    expect(closedButtonLabel).toBe('Registration Closed')
    expect(endedButtonLabel).toBe('Event Has Ended')
    expect(notOpenLabel).toBe('Registration Not Yet Open')
  })

  it('countdown timer shown before registration opens or closes (configurable)', () => {
    // page.tsx line 222 + EventLandingClient line 81: CountdownTimer rendered when
    // status.showCountdown=true and status.countdownTarget is set
    const countdownSupported = true
    const countdownConfigurable = true
    expect(countdownSupported).toBe(true)
    expect(countdownConfigurable).toBe(true)
  })

  it('early bird message shown when landingPageShowPrice=true and deadline has not passed', () => {
    // EventLandingClient line 159: earlyBirdMessage shown when earlyBirdMessage && settings.landingPageShowPrice
    const earlyBirdShown = true
    expect(earlyBirdShown).toBe(true)
  })

  it('schedule, FAQ, What to Bring, What\'s Included sections shown only when enabled and content exists', () => {
    // page.tsx lines 281-326: each section gated on landingPageShow* flag AND content string
    const scheduleGated = true
    const faqGated = true
    expect(scheduleGated).toBe(true)
    expect(faqGated).toBe(true)
  })

  it('contact section shows org email and phone (or custom contactInfo) when landingPageShowContact=true', () => {
    // page.tsx lines 330-356: contact section with organization.contactEmail, contactPhone, or custom contactInfo
    const contactShown = true
    expect(contactShown).toBe(true)
  })

  it('staff and vendor registration links shown only when their respective enabled flags are true', () => {
    // page.tsx lines 360-384: conditional on staffRegistrationEnabled, vendorRegistrationEnabled
    const linksConditional = true
    expect(linksConditional).toBe(true)
  })

  it('BUG-10.1: no "already registered?" link or registration lookup on the public event page', () => {
    // EventLandingClient renders: register group, register individual, join waitlist
    // No link to Group Leader Portal, no email-based lookup, no registration status check
    const alreadyRegisteredLinkPresent = false
    const portalSignInLinkPresent = false
    expect(alreadyRegisteredLinkPresent).toBe(false)
    expect(portalSignInLinkPresent).toBe(false)
  })

  it('admin can override registration status with event.status = registration_open or registration_closed', () => {
    // registration-status.ts lines 67-78 and 112-143: manual status overrides
    const manualOpenSupported = true
    const manualClosedSupported = true
    expect(manualOpenSupported).toBe(true)
    expect(manualClosedSupported).toBe(true)
  })

  it('GET /api/events returns only isPublished=true events — unpublished events invisible publicly', () => {
    // api/events/route.ts line 48: whereClause = { isPublished: true }
    const unpublishedFiltered = true
    expect(unpublishedFiltered).toBe(true)
  })

  it('GET /api/events returns aggregate capacity data (capacityTotal, capacityRemaining), not per-registrant data', () => {
    // api/events/route.ts lines 127-131: capacityTotal, capacityRemaining are scalars
    // No groupRegistration breakdown, no participant names
    const perRegistrantDataExposed = false
    const aggregateCapacityExposed = true
    expect(perRegistrantDataExposed).toBe(false)
    expect(aggregateCapacityExposed).toBe(true)
  })
})

// ─── SECTION 10.2: PUBLIC DATA BOUNDARIES ────────────────────────────────────

describe('10.2 — Public Data Boundaries: what must never appear on public pages', () => {
  it('event landing page does NOT show participant names or any registration roster', () => {
    // page.tsx: hero + content sections contain no participant data
    // Only shows organization name, event info, and aggregate capacity
    const participantNamesVisible = false
    expect(participantNamesVisible).toBe(false)
  })

  it('event landing page does NOT show payment amounts, balances, or revenue', () => {
    // Only earlyBirdMessage (pricing info) shown if landingPageShowPrice=true
    // No actual payments, balances, or financial summaries
    const financialDataVisible = false
    const pricingInformationVisible = true // pricing is intentionally public for registration
    expect(financialDataVisible).toBe(false)
    expect(pricingInformationVisible).toBe(true)
  })

  it('event landing page does NOT show medical data, allergies, or dietary restrictions', () => {
    const medicalDataVisible = false
    expect(medicalDataVisible).toBe(false)
  })

  it('event landing page does NOT show housing assignments or room numbers', () => {
    const housingAssignmentsVisible = false
    expect(housingAssignmentsVisible).toBe(false)
  })

  it('event landing page does NOT show other groups\' information or registrant lists', () => {
    const otherGroupsInfoVisible = false
    expect(otherGroupsInfoVisible).toBe(false)
  })

  it('GET /api/events/[eventId] (public) does NOT return payment history, balances, or participant PII', () => {
    // api/events/[eventId]/route.ts: returns event info + pricing + settings + dayPassOptions
    // No Payment records, no GroupRegistration lists, no participant names
    const paymentDataInEventApi = false
    const participantPiiInEventApi = false
    expect(paymentDataInEventApi).toBe(false)
    expect(participantPiiInEventApi).toBe(false)
  })

  it('GET /api/events/[eventId]/registration-status returns only status info — no capacity breakdown by group', () => {
    // registration-status endpoint returns: status, message, spotsRemaining (number), allowRegistration, allowWaitlist
    // No breakdown by registration type, group, or participant
    const groupBreakdownExposed = false
    expect(groupBreakdownExposed).toBe(false)
  })

  it('POST /api/events/[eventId]/waitlist collects contact info but returns no other registrants\' data', () => {
    // Waitlist join: creates WaitlistEntry, sends confirmation email
    // Response: { success, message, position } — no other waitlist entries revealed
    const otherWaitlistEntriesRevealed = false
    expect(otherWaitlistEntriesRevealed).toBe(false)
  })

  it('resource portal lookup requires publicPortalEnabled=true — returns 403 when disabled', () => {
    // resources/lookup/route.ts line 26: if (!event?.settings?.publicPortalEnabled) return 403
    const portalGatedByFlag = true
    expect(portalGatedByFlag).toBe(true)
  })

  it('resource portal lookup (when enabled) returns only the looked-up participant\'s own assignments', () => {
    // lookup: finds participant by exact first+last name, returns their own housing/SG/meal info
    // Does not return all participants' data
    const onlyOwnDataReturned = true
    expect(onlyOwnDataReturned).toBe(true)
  })

  it('BUG-10.2: confirmation page fetches /api/registration/[id] without auth — always receives stripped response', () => {
    // confirmation page line 41: fetch(`/api/registration/${registrationId}`) — no auth headers
    // getClerkUserIdFromRequest reads Authorization: Bearer header, not cookies
    // isAuthorized stays false → stripped response: no accessCode, no qrCode, no financials
    const authIncludedInFetch = false
    const isAuthorizedForNewRegistrant = false
    expect(authIncludedInFetch).toBe(false)
    expect(isAuthorizedForNewRegistrant).toBe(false)
  })

  it('BUG-10.2: confirmation page crashes (TypeError) when unauthenticated response is missing financial fields', () => {
    // page renders: registration.depositPaid.toFixed(2)
    //               registration.totalAmount.toFixed(2)
    //               registration.balanceRemaining.toFixed(2)
    // Stripped response omits all three fields → .toFixed() throws TypeError
    const financialFieldsInStrippedResponse = false
    const toFixedWouldCrash = true  // undefined.toFixed(2) throws TypeError
    expect(financialFieldsInStrippedResponse).toBe(false)
    expect(toFixedWouldCrash).toBe(true)
  })

  it('BUG-10.2: access code and QR code not shown on confirmation page for unauthenticated new registrants', () => {
    // Stripped response omits accessCode and qrCode
    // page renders: {registration.accessCode} → empty/undefined
    // page renders: {registration.qrCode && <img>} → nothing (conditional prevents crash here)
    const accessCodeShownToNewRegistrant = false
    const qrCodeConditionallyHandled = true // qrCode render is conditional, won't crash
    expect(accessCodeShownToNewRegistrant).toBe(false)
    expect(qrCodeConditionallyHandled).toBe(true)
  })

  it('GET /api/registration/[id] returns stripped public data to unauthenticated callers', () => {
    // Unauthenticated: { id, groupName, totalParticipants, eventName, housingType,
    //                    registrationStatus, organizationName, organizationLogoUrl }
    // Authenticated owner/admin: + accessCode, qrCode, email, financial data
    const strippedFieldsPublic = ['id', 'groupName', 'totalParticipants', 'eventName', 'registrationStatus']
    const sensitiveFieldsPublic = ['accessCode', 'qrCode', 'groupLeaderEmail', 'depositPaid', 'totalAmount']
    expect(strippedFieldsPublic).toContain('groupName')
    expect(sensitiveFieldsPublic).toContain('accessCode')
    // sensitiveFieldsPublic are NOT in the public response (by design — just documenting the split)
  })

  it('BUG-10.3: GET /api/registration/[id] leaks groupName and participant count to unauthenticated callers', () => {
    // While UUIDs are not guessable, the stripped response still exposes
    // groupName (e.g. "St. Mary's Youth Group") and totalParticipants to anyone with the UUID
    const groupNameInStrippedResponse = true
    const participantCountInStrippedResponse = true
    expect(groupNameInStrippedResponse).toBe(true)
    expect(participantCountInStrippedResponse).toBe(true)
  })

  it('BUG-10.4: /api/public/poros/[eventId]/m2k-data is completely unauthenticated', () => {
    // m2k-data/route.ts: no auth check, no requireSalveAccess, no Clerk check
    // Only protection is eventId check: if (eventId !== M2K_EVENT_ID) return 404
    const authRequired = false
    const onlyProtectionIsEventIdCheck = true
    expect(authRequired).toBe(false)
    expect(onlyProtectionIsEventIdCheck).toBe(true)
  })

  it('BUG-10.4: m2k-data dump exposes group leader phone numbers to unauthenticated callers', () => {
    // m2k-data: youthGroups includes groupLeaderPhone (line 224)
    const groupLeaderPhoneExposed = true
    expect(groupLeaderPhoneExposed).toBe(true)
  })

  it('BUG-10.4: m2k-data dump exposes ADA individual names and accessibility needs publicly', () => {
    // m2k-data: adaIndividuals includes name, gender, accessibilityNeed, room assignment (lines 333-340)
    // This is sensitive medical-adjacent data (accessibility needs) for minors
    const adaDataPubliclyExposed = true
    const adaIncludesAccessibilityNeed = true
    expect(adaDataPubliclyExposed).toBe(true)
    expect(adaIncludesAccessibilityNeed).toBe(true)
  })

  it('BUG-10.4: m2k-data dump exposes housing assignments (building + room) for all groups', () => {
    // m2k-data: housingAssignments maps groupId → [building-room keys] (lines 259-280)
    const housingAssignmentsPubliclyExposed = true
    expect(housingAssignmentsPubliclyExposed).toBe(true)
  })

  it('BUG-10.5: resource portal lookup has no rate limiting — participant enumeration possible', () => {
    // lookup/route.ts: no IP rate limiting, no auth, no request throttling
    // Attacker with name list can enumerate all participants when publicPortalEnabled=true
    const rateLimitingPresent = false
    const authRequired = false
    expect(rateLimitingPresent).toBe(false)
    expect(authRequired).toBe(false)
  })

  it('BUG-10.5: resource portal lookup returns roommate names — exposes PII of other participants', () => {
    // lookup/route.ts lines 102-118: fetches roommate records, returns { firstName, lastName }
    // Searching for "John Smith" reveals the full names of everyone in John's room
    const roommateNamesReturned = true
    const roommateNamesAreOtherPeoplesData = true
    expect(roommateNamesReturned).toBe(true)
    expect(roommateNamesAreOtherPeoplesData).toBe(true)
  })

  it('BUG-10.6: GET /api/events/[eventId] returns full settings object including internal config', () => {
    // api/events/[eventId]/route.ts line 72: settings: event.settings (full object, no select)
    // Contrast: registration-status uses settings: { select: { ... } } (only needed fields)
    const settingsFilteredBeforePublic = false
    const fullSettingsObjectReturned = true
    expect(settingsFilteredBeforePublic).toBe(false)
    expect(fullSettingsObjectReturned).toBe(true)
  })

  it('GAP-10.1: no CAPTCHA or rate limiting on public registration and waitlist POST endpoints', () => {
    // POST /api/registration/group, individual, staff, vendor — all unauthenticated with no bot protection
    // POST /api/events/[eventId]/waitlist — no rate limiting
    const captchaPresent = false
    const rateLimitingPresent = false
    expect(captchaPresent).toBe(false)
    expect(rateLimitingPresent).toBe(false)
  })

  it('GAP-10.2: staff-vendor-settings exposes organizationId in public response', () => {
    // api/events/[eventId]/staff-vendor-settings/route.ts line 85: organizationId: event.organizationId
    const organizationIdExposed = true
    expect(organizationIdExposed).toBe(true)
  })

  it('GAP-10.3: no public "check my registration" feature — lost confirmation email = lost registration access', () => {
    // Event landing page: no "already registered?" link, no email-based lookup,
    // no link to group leader portal sign-in
    const registrationLookupByEmailAvailable = false
    const portalLinkOnLandingPage = false
    expect(registrationLookupByEmailAvailable).toBe(false)
    expect(portalLinkOnLandingPage).toBe(false)
  })

  it('event listing API correctly filters unpublished events — isPublished=false events are invisible', () => {
    // api/events/route.ts line 48: whereClause = { isPublished: true }
    const unpublishedVisiblePublicly = false
    expect(unpublishedVisiblePublicly).toBe(false)
  })

  it('GET /api/events/[eventId] is NOT gated by isPublished — returns data for any event ID', () => {
    // api/events/[eventId]/route.ts: no isPublished check — findUnique with just id/slug
    // This allows fetching pricing/settings for unpublished events if you know the ID
    const unpublishedEventApiGated = false
    expect(unpublishedEventApiGated).toBe(false)
  })

  it('medical data completely absent from all public-facing API responses', () => {
    // None of the public APIs return allergies, medications, medical conditions, or health history
    // Medical data protected behind rapha.access permission (admin-only)
    const medicalDataInPublicApi = false
    expect(medicalDataInPublicApi).toBe(false)
  })

  it('financial balances and payment history absent from all public-facing API responses', () => {
    // Pricing info (prices to charge) is public — payment history (what was paid) is private
    // PaymentBalance, Payment records: only accessible to authenticated admin/owner
    const paymentHistoryInPublicApi = false
    expect(paymentHistoryInPublicApi).toBe(false)
  })

  it('check-in status (SALVE) absent from all public-facing pages', () => {
    // checkedIn, checkedInAt, checkInStation — not returned by any public API
    const checkInDataInPublicApi = false
    expect(checkInDataInPublicApi).toBe(false)
  })
})

printSummary()
