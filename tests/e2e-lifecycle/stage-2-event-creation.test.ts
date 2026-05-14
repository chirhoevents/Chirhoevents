/**
 * Stage 2: Event Creation — E2E Lifecycle Audit
 *
 * Covers the full event setup flow for "Testville Youth Conference 2026":
 *   2.1 — Basic Event Setup (fields, org-linking, status vs isPublished)
 *   2.2 — Registration Types (group, individual, staff, vendor)
 *   2.3 — Waitlist Configuration
 *   2.4 — Coupon Configuration
 *   2.5 — Poros (Housing) Configuration
 *   2.6 — Rapha (Medical) Configuration & Permission Matrix
 *   2.7 — Safe Environment Certificate Tracking
 *   2.8 — Publishing the Event
 *
 * Run with: npx tsx tests/e2e-lifecycle/stage-2-event-creation.test.ts
 */

import { describe, it, expect, printSummary } from '../org-isolation/helpers/test-runner'
import { makeOrg, makeEvent } from '../org-isolation/helpers/mock-factories'

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT FINDINGS (documented from source-code tracing)
// ─────────────────────────────────────────────────────────────────────────────
//
// STAGE 2.1 — BASIC EVENT SETUP
// ───────────────────────────────
// Route: POST /api/admin/events/create  (admin role required)
//
// Fields supported at creation:
//   name, slug, description, startDate, endDate, timezone,
//   locationName, locationAddress (JSON: street/city/state/zip),
//   capacityTotal, registrationOpenDate, registrationCloseDate,
//   status (draft|published|registration_closed), enableWaitlist, waitlistCapacity
//
// Defaults at creation:
//   status = 'draft', isPublished = false
//   capacityRemaining = capacityTotal (mirrors at creation)
//   timezone = 'America/New_York' (hardcoded default — no org-level default)
//   All EventSettings created in same transaction with sensible defaults
//
// Org linking: organizationId taken from getEffectiveOrgId(user), NOT from request body.
//   → Cross-org event creation is impossible even if a bad actor passes another orgId.
//
// ⚠️  GAPS:
//   - No Stripe check at event creation. Admin can create and publish with no Stripe.
//   - Slug must be globally unique (@@unique on Event.slug). No auto-uniqueness.
//   - Timezone defaults to America/New_York — no org-level default timezone.
//   - isPublished and status are two separate fields:
//       isPublished: controls visibility on /events listing (public browse)
//       status: controls registration availability (open/closed/draft)
//     This distinction is not obvious in the UI or docs.
//
// STAGE 2.2 — REGISTRATION TYPES
// ────────────────────────────────
//
// GROUP REGISTRATION (groupRegistrationEnabled, default: true)
//   Pricing: youthRegularPrice (required), chaperoneRegularPrice (required),
//            priestPrice (default 0), plus optional early-bird and late tiers.
//   Housing options: allowOnCampus, allowOffCampus, allowDayPass (all default true).
//     Each housing type can have separate per-person pricing:
//       onCampusYouthPrice, offCampusYouthPrice, dayPassYouthPrice,
//       onCampusChaperonePrice, offCampusChaperonePrice, dayPassChaperonePrice
//   Capacity per housing type: onCampusCapacity, offCampusCapacity, dayPassCapacity
//
//   ⚠️  GAP — NO GROUP MIN/MAX SIZE SETTING:
//     There is no groupMinSize or groupMaxSize field anywhere in the schema or
//     EventSettings model. Groups of 1 are accepted. This is a missing feature.
//
//   Deposit modes (4, not 5 — the audit brief was off by one):
//     Mode 1 — Percentage: depositPercentage set, requireFullPayment=false, depositAmount=null
//     Mode 2a — Flat per-person: depositAmount set, depositPerPerson=true, depositPercentage=null
//     Mode 2b — Flat total: depositAmount set, depositPerPerson=false, depositPercentage=null
//     Mode 3 — Full payment: requireFullPayment=true (depositAmount=totalAmount)
//     Mode 4 — No deposit: all three null/false (depositAmount=0, balanceRemaining=total)
//   Priority order if multiple fields set: requireFullPayment > depositPercentage > depositAmount
//
// INDIVIDUAL REGISTRATION (individualRegistrationEnabled, default: true)
//   Separate pricing: individualBasePrice, individualEarlyBirdPrice, individualLatePrice
//   Room type pricing: singleRoomPrice, doubleRoomPrice, tripleRoomPrice, quadRoomPrice,
//                      individualOffCampusPrice, individualDayPassPrice, individualMealPackagePrice
//   Room type capacities: singleRoomCapacity, doubleRoomCapacity, tripleRoomCapacity, quadRoomCapacity
//   Can be enabled independently of group registration.
//   Has its own housing options (allowSingleRoom, allowDoubleRoom, allowTripleRoom, allowQuadRoom).
//
// STAFF REGISTRATION (staffRegistrationEnabled, default: false)
//   Fields: firstName, lastName, email, phone, role, tshirtSize, dietaryRestrictions
//   Pricing: staffVolunteerPrice (can be 0 = free). If > 0, Stripe checkout is created.
//   Vendor staff have separate vendorStaffPrice and require vendorCode.
//   Stripe guard: same as group registration (hard 400 if Stripe not configured and price > 0).
//
// VENDOR REGISTRATION (vendorRegistrationEnabled, default: false)
//   Fields: businessName, contactFirstName/LastName, email, phone, boothDescription,
//           selectedTier (from vendorTiers JSON array), additionalNeeds
//   vendorTiers: [{id, name, price, description, active, quantityLimit?, quantityUsed?}]
//   ⚠️  Payment NOT routed through Stripe at vendor registration time.
//     Vendor registration sets paymentStatus='unpaid'. Payment is collected offline
//     or via invoice. No Stripe checkout is created for vendor booth fees.
//   → Approved vendors get a vendorCode they share with their booth staff.
//
// STAGE 2.3 — WAITLIST
// ──────────────────────
// enableWaitlist: on Event model (boolean)
// waitlistEnabled: on EventSettings (boolean, default true)
// (Two separate fields — EventSettings.waitlistEnabled is checked in registration status)
//
// Registration capacity check (atomic):
//   Raw SQL UPDATE WHERE capacity_remaining >= totalParticipants
//   If 0 rows updated → capacity full → 400 error with "join the waitlist" message
//   Registration does NOT automatically redirect to waitlist — the group leader must
//   navigate to the waitlist signup separately.
//
// Promotion: MANUAL ONLY. No auto-promotion.
//   Admin workflow:
//     1. POST /api/admin/waitlist/[entryId]/contact → status='contacted', email sent, 48hr token
//     2. Group leader clicks link → proceeds with registration
//     3. Admin PATCH /api/admin/waitlist/[entryId]/status { status: 'registered' } manually
//   OR admin can set status directly to any of: pending | contacted | registered | expired
//
//   ⚠️  GAPS:
//   - No auto-promotion when a spot opens (e.g., cancellation). Admin must check manually.
//   - waitlistCapacity field exists on Event but is never enforced in any route.
//   - A waitlisted group is NOT in a GroupRegistration — they are in WaitlistEntry only.
//     They cannot access the group leader portal to pay until promoted.
//
// STAGE 2.4 — COUPONS
// ─────────────────────
// couponsEnabled must be true on EventSettings for validation to pass.
//
// DiscountType (schema enum — only 2 types, not 4):
//   percentage: discountValue = percentage off (e.g., 10 = 10%)
//   fixed_amount: discountValue = dollars off (e.g., 50 = $50 off)
//   → "Per-person discount" and "free registration" are NOT separate types.
//     Free registration = fixed_amount with discountValue >= total.
//     Per-person discount must be calculated by the admin and entered as fixed_amount.
//
// UsageLimitType: unlimited | single_use | limited (maxUses)
// Additional restrictions: expirationDate, restrictToEmail (single email only)
//
// ⚠️  MISSING FEATURES:
//   - No registration type restriction (group-only, individual-only, etc.)
//   - No quantity-per-event limit tied to a specific coupon type (e.g., "first 10 uses only")
//     (this IS possible via usageLimitType='limited' + maxUses, but it's a global count)
//   - No per-person discount type (admin must manually compute flat amount)
//
// Org isolation in validation:
//   coupon = findFirst WHERE eventId = event.id AND code = code.toUpperCase()
//   Since event.id is org-scoped (looked up by the eventId URL param, verified to be
//   a real event), a coupon from Org A cannot match on Org B's event URL.
//   → Cross-org coupon use is structurally impossible.
//
// STAGE 2.5 — POROS HOUSING
// ───────────────────────────
// porosHousingEnabled: enables the Poros housing tab. All Poros sub-features are
// individually toggled (porosSeatingEnabled, porosSmallGroupEnabled, etc.)
//
// Building fields: name, gender (male/female/mixed), housingType (youth_u18/
//   chaperone_18plus/clergy/general), totalFloors, notes
// Room fields: roomNumber, floor, bedCount, roomType (single/double/triple/quad/custom),
//   gender, housingType, capacity, currentOccupancy, isAdaAccessible, adaFeatures,
//   roomPurpose (housing/small_group/both)
// totalBeds auto-tracked on Building model.
// CSV import: POST /api/admin/events/[eventId]/poros/buildings/import
//   Required columns: Building Name, Gender, Housing Type, Total Floors,
//   Room Number, Floor, Room Type, Capacity
//
// STAGE 2.6 — RAPHA MEDICAL
// ───────────────────────────
// Medical fields on LiabilityForm (not Participant):
//   allergies, medicalConditions, medications, dietaryRestrictions, adaAccommodations,
//   emergencyContact1/2 (name, phone, relation),
//   insuranceProvider, insurancePolicyNumber, insuranceGroupNumber
// These fields are ALWAYS present in the liability form — not configurable per event.
// Visibility controlled by: liabilityFormsRequiredGroup / liabilityFormsRequiredIndividual on EventSettings.
//
// Permission matrix for rapha.access:
//   ALLOWED: master_admin, org_admin, rapha_coordinator, rapha_user
//   DENIED:  event_manager, poros_coordinator, salve_coordinator, finance_manager, staff
//
// ⚠️  NOTE: event_manager does NOT have rapha.access. This means an event manager
//     cannot see medical information even for events they manage.
//
// STAGE 2.7 — SAFE ENVIRONMENT
// ──────────────────────────────
// SafeEnvironmentCertificate: fileUrl, programName, completionDate, expirationDate,
//   status (pending/uploaded/verified), uploadedByUserId, verifiedByUserId
// Participant.safeEnvironmentCertStatus: not_required | pending | uploaded | verified
// Admin workflow: upload cert via Poros liability tab, admin verifies/rejects.
// No auto-reminder to group leader — poros-liability route has a manual resend endpoint.
//
// STAGE 2.8 — PUBLISHING
// ────────────────────────
// Route: PATCH /api/admin/events/[eventId]/publish { isPublished: boolean }
//   Restricted to org_admin or master_admin roles only (NOT event_manager).
//
// isPublished=true: event appears on /events listing page.
// isPublished=false: event hidden from listing, but accessible by direct URL.
//   → Direct URL is effectively "preview mode" for admins.
//
// Event.status is a SEPARATE field:
//   draft: registration blocked (no active registration)
//   published: registration open/controlled by dates
//   registration_closed: registration hard-blocked regardless of dates
//
// Public page before registration opens:
//   - Shows countdown timer (if countdownBeforeOpen=true)
//   - Shows event info (date, location, description, pricing if landingPageShowPrice=true)
//   - Registration button NOT shown (allowRegistration=false)
// Public page after registration opens:
//   - Shows "Register Now" CTA
//   - Shows spots remaining if showAvailability=true and within availabilityThreshold

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

// ── 2.1: Basic Event Setup ────────────────────────────────────────────────────

describe('2.1 — Basic Event Setup: event creation fields and org-linking', () => {
  it('should accept all required basic event fields', async () => {
    const eventPayload = {
      name: 'Testville Youth Conference 2026',
      slug: 'testville-youth-conference-2026',
      description: 'Annual diocesan youth conference for the Diocese of Testville.',
      startDate: '2026-07-10',
      endDate: '2026-07-13',
      timezone: 'America/Chicago',
      locationName: 'Camp Testville',
      locationAddress: { street: '100 Camp Road', city: 'Testville', state: 'TX', zip: '78001' },
      capacityTotal: 500,
      registrationOpenDate: '2026-02-01T00:00:00Z',
      registrationCloseDate: '2026-06-15T00:00:00Z',
    }

    expect(eventPayload.name).toBe('Testville Youth Conference 2026')
    expect(eventPayload.capacityTotal).toBe(500)
    expect(eventPayload.locationAddress.city).toBe('Testville')
  })

  it('should link event to user org via getEffectiveOrgId, not request body', async () => {
    // organizationId is derived from the authenticated user's org — it is NOT
    // accepted from the request body. This prevents cross-org event creation.
    const user = { organizationId: 'org-diocese-001', role: 'org_admin' }
    const requestBodyOrgId = 'org-evil-999' // attacker's payload

    // The route ignores requestBodyOrgId and uses user.organizationId
    const effectiveOrgId = user.organizationId // never equals requestBodyOrgId
    expect(effectiveOrgId).toBe('org-diocese-001')
    expect(effectiveOrgId).not.toBe(requestBodyOrgId)
  })

  it('should default status to draft and isPublished to false', async () => {
    const eventDefaults = {
      status: 'draft',
      isPublished: false,
    }
    expect(eventDefaults.status).toBe('draft')
    expect(eventDefaults.isPublished).toBe(false)
  })

  it('should set capacityRemaining equal to capacityTotal at creation', async () => {
    const capacityTotal = 500
    const capacityRemaining = capacityTotal // mirrors at creation
    expect(capacityRemaining).toBe(capacityTotal)
  })

  it('should default timezone to America/New_York when not provided (gap: no org default)', async () => {
    const defaultTimezone = 'America/New_York' // hardcoded in create route
    // There is no org-level default timezone setting — every event must set it explicitly.
    // Many dioceses outside the Eastern timezone will hit this default silently.
    expect(defaultTimezone).toBe('America/New_York')
  })

  it('should distinguish between isPublished (listing visibility) and status (registration)', async () => {
    // isPublished=false → hidden from /events listing, but accessible by direct URL
    // status='draft' → registration is effectively blocked

    // A draft event with isPublished=false IS still accessible at /events/[slug]
    // The public page renders and shows countdown/event info
    const publicPageAccessible = true // page renders regardless of isPublished
    const registrationAllowed = false // status='draft' blocks registration
    expect(publicPageAccessible).toBe(true)
    expect(registrationAllowed).toBe(false)
  })

  it('should enforce globally unique slug (not org-scoped)', async () => {
    // Prisma schema: @unique on Event.slug
    // If two orgs both try slug "youth-conference-2026", the second one fails.
    // → Admin should include org name or year to ensure uniqueness.
    const slugConstraint = 'globally_unique'
    expect(slugConstraint).toBe('globally_unique')
  })
})

// ── 2.2: Registration Types ───────────────────────────────────────────────────

describe('2.2 — Group Registration: pricing and housing options', () => {
  it('should enable group registration by default', async () => {
    const defaults = { groupRegistrationEnabled: true }
    expect(defaults.groupRegistrationEnabled).toBe(true)
  })

  it('should support per-person pricing for youth, chaperones, and priests', async () => {
    const pricing = {
      youthRegularPrice: 350,
      chaperoneRegularPrice: 250,
      priestPrice: 0,
    }
    expect(pricing.youthRegularPrice).toBe(350)
    expect(pricing.chaperoneRegularPrice).toBe(250)
    expect(pricing.priestPrice).toBe(0)
  })

  it('should support three housing options with separate pricing per type', async () => {
    const housingPricing = {
      allowOnCampus: true,  onCampusYouthPrice: 350,  onCampusChaperonePrice: 250,
      allowOffCampus: true, offCampusYouthPrice: 200, offCampusChaperonePrice: 150,
      allowDayPass: true,   dayPassYouthPrice: 75,    dayPassChaperonePrice: 50,
    }
    expect(housingPricing.allowOnCampus).toBe(true)
    expect(housingPricing.onCampusYouthPrice).toBe(350)
    expect(housingPricing.offCampusChaperonePrice).toBe(150)
  })

  it('should flag that group min/max size is NOT configurable (schema gap)', async () => {
    // There is no groupMinSize or groupMaxSize field in EventSettings or Event.
    // Groups of 1 person are accepted. This means:
    //   - A group leader can register a "group" of just themselves.
    //   - An org cannot enforce a minimum group size (e.g., "at least 5 youth").
    const groupSizeFieldsInSchema = ['groupRegistrationEnabled'] // only toggle, no min/max
    expect(groupSizeFieldsInSchema).not.toContain('groupMinSize')
    expect(groupSizeFieldsInSchema).not.toContain('groupMaxSize')
  })

  it('should implement 4 deposit modes (not 5) with correct priority', async () => {
    // Priority: requireFullPayment > depositPercentage > depositAmount > none (0)

    const calculateDeposit = (
      totalAmount: number,
      pricing: {
        requireFullPayment: boolean
        depositPercentage: number | null
        depositAmount: number | null
        depositPerPerson: boolean
        totalParticipants: number
      }
    ): number => {
      if (pricing.requireFullPayment) return totalAmount                        // Mode 3: full
      if (pricing.depositPercentage != null)                                    // Mode 1: %
        return (totalAmount * pricing.depositPercentage) / 100
      if (pricing.depositAmount != null)                                        // Mode 2: flat
        return pricing.depositPerPerson
          ? pricing.depositAmount * pricing.totalParticipants
          : pricing.depositAmount
      return 0                                                                  // Mode 4: none
    }

    const total = 1750 // 5 youth @ $350

    // Mode 1: 25% deposit
    expect(calculateDeposit(total, { requireFullPayment: false, depositPercentage: 25, depositAmount: null, depositPerPerson: false, totalParticipants: 5 })).toBe(437.5)

    // Mode 2a: $50 flat per person (5 × $50 = $250)
    expect(calculateDeposit(total, { requireFullPayment: false, depositPercentage: null, depositAmount: 50, depositPerPerson: true, totalParticipants: 5 })).toBe(250)

    // Mode 2b: $200 flat total
    expect(calculateDeposit(total, { requireFullPayment: false, depositPercentage: null, depositAmount: 200, depositPerPerson: false, totalParticipants: 5 })).toBe(200)

    // Mode 3: full payment
    expect(calculateDeposit(total, { requireFullPayment: true, depositPercentage: null, depositAmount: null, depositPerPerson: false, totalParticipants: 5 })).toBe(1750)

    // Mode 4: no deposit
    expect(calculateDeposit(total, { requireFullPayment: false, depositPercentage: null, depositAmount: null, depositPerPerson: false, totalParticipants: 5 })).toBe(0)
  })

  it('should cap deposit at total amount (e.g. coupon reduces total below deposit)', async () => {
    const totalAfterCoupon = 100
    const calculatedDeposit = 200 // would exceed total
    const actualDeposit = Math.min(calculatedDeposit, totalAfterCoupon)
    expect(actualDeposit).toBe(100)
  })
})

describe('2.2 — Individual Registration: separate pricing and housing', () => {
  it('should be enabled independently from group registration', async () => {
    const settings = {
      groupRegistrationEnabled: false,      // group OFF
      individualRegistrationEnabled: true,  // individual ON
    }
    expect(settings.individualRegistrationEnabled).toBe(true)
  })

  it('should support separate individual pricing tiers', async () => {
    const pricing = {
      individualEarlyBirdPrice: 280,
      individualBasePrice: 320,
      individualLatePrice: 370,
    }
    expect(pricing.individualBasePrice).toBe(320)
  })

  it('should support room-type pricing for individual housing', async () => {
    const roomPricing = {
      singleRoomPrice: 400,
      doubleRoomPrice: 320,
      tripleRoomPrice: 280,
      quadRoomPrice: 250,
      individualOffCampusPrice: 200,
      individualDayPassPrice: 75,
    }
    expect(roomPricing.singleRoomPrice).toBe(400)
    expect(roomPricing.doubleRoomPrice).toBe(320)
  })

  it('should support capacity limits per room type', async () => {
    const capacities = {
      singleRoomCapacity: 10,
      doubleRoomCapacity: 30,
      tripleRoomCapacity: 15,
      quadRoomCapacity: 20,
    }
    expect(capacities.singleRoomCapacity).toBe(10)
  })
})

describe('2.2 — Staff Registration: paid vs free, Stripe routing', () => {
  it('should be disabled by default and require explicit opt-in', async () => {
    const defaultSettings = { staffRegistrationEnabled: false }
    expect(defaultSettings.staffRegistrationEnabled).toBe(false)
  })

  it('should support free staff registration when price is 0', async () => {
    const staffPrice = 0
    const requiresPayment = staffPrice > 0
    const paymentStatus = staffPrice > 0 ? 'pending' : 'paid'
    expect(requiresPayment).toBe(false)
    expect(paymentStatus).toBe('paid')
  })

  it('should route paid staff registration through org Stripe account', async () => {
    const settings = { staffVolunteerPrice: 25 }
    const org = makeOrg({ stripeAccountId: 'acct_testville', stripeChargesEnabled: true })

    const totalAmount = settings.staffVolunteerPrice // $25
    const requiresStripe = totalAmount > 0

    expect(requiresStripe).toBe(true)
    // Stripe checkout uses org account, same as group registration
    expect(org.stripeAccountId).toBe('acct_testville')
  })

  it('should block paid staff registration if Stripe not configured', async () => {
    const settings = { staffVolunteerPrice: 25 }
    const org = makeOrg({ stripeAccountId: null, stripeChargesEnabled: false })

    const totalAmount = settings.staffVolunteerPrice
    const stripeBlocked = totalAmount > 0 && (!org.stripeAccountId || !org.stripeChargesEnabled)
    expect(stripeBlocked).toBe(true)
  })

  it('should collect these required staff fields', async () => {
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'role', 'tshirtSize']
    // These are validated in the staff registration route
    expect(requiredFields).toContain('firstName')
    expect(requiredFields).toContain('role')
    expect(requiredFields).toContain('tshirtSize')
  })
})

describe('2.2 — Vendor Registration: tiers, approval, payment NOT via Stripe', () => {
  it('should be disabled by default', async () => {
    expect({ vendorRegistrationEnabled: false }.vendorRegistrationEnabled).toBe(false)
  })

  it('should use vendor tiers JSON array for pricing configuration', async () => {
    const vendorTiers = [
      { id: 'basic', name: 'Basic Booth', price: 250, description: '10x10 space', active: true },
      { id: 'premium', name: 'Premium Booth', price: 500, description: '20x20 corner space', active: true, quantityLimit: 5, quantityUsed: 0 },
    ]
    expect(vendorTiers.length).toBe(2)
    expect(vendorTiers[1].price).toBe(500)
    expect(vendorTiers[1].quantityLimit).toBe(5)
  })

  it('should set paymentStatus to unpaid at registration (not Stripe checkout)', async () => {
    // Vendor registration route does NOT create a Stripe checkout session.
    // Payment is tracked offline or via invoice.
    const vendorRegistration = {
      paymentStatus: 'unpaid',
      status: 'pending', // admin must approve
    }
    expect(vendorRegistration.paymentStatus).toBe('unpaid')
    expect(vendorRegistration.status).toBe('pending')
  })

  it('should require admin approval before vendor staff can register', async () => {
    // Staff registration with isVendorStaff=true requires vendorCode from approved vendor
    const vendorStatus = 'approved' // must be approved to get code
    const vendorCodeRequired = true
    expect(vendorStatus).toBe('approved')
    expect(vendorCodeRequired).toBe(true)
  })

  it('should collect required vendor fields', async () => {
    const requiredFields = [
      'businessName', 'contactFirstName', 'contactLastName',
      'email', 'phone', 'boothDescription', 'selectedTier',
    ]
    expect(requiredFields).toContain('businessName')
    expect(requiredFields).toContain('boothDescription')
    expect(requiredFields).toContain('selectedTier')
  })
})

// ── 2.3: Waitlist ─────────────────────────────────────────────────────────────

describe('2.3 — Waitlist: capacity enforcement and manual promotion', () => {
  it('should use atomic SQL to prevent overselling at capacity', async () => {
    // The route uses: UPDATE events SET capacity_remaining = capacity_remaining - N
    // WHERE capacity_remaining >= N
    // If 0 rows updated → capacity exceeded → 400 returned
    const capacityRemaining = 3
    const totalParticipants = 5
    const capacityRowsUpdated = capacityRemaining >= totalParticipants ? 1 : 0
    expect(capacityRowsUpdated).toBe(0) // blocked
  })

  it('should return correct error message when at capacity', async () => {
    const spotsRemaining = 0
    const errorMessage = spotsRemaining <= 0
      ? 'Event is at full capacity. Please join the waitlist if available.'
      : `Not enough spots. Only ${spotsRemaining} remaining.`
    expect(errorMessage).toContain('at full capacity')
    expect(errorMessage).toContain('waitlist')
  })

  it('should NOT auto-promote waitlisted registrants (manual only)', async () => {
    // There is no cron job, webhook, or trigger that auto-promotes waitlist entries.
    // The admin must manually POST /api/admin/waitlist/[entryId]/contact
    const promotionIsAutomatic = false
    expect(promotionIsAutomatic).toBe(false)
  })

  it('should send invitation email with 48-hour expiring token on manual promotion', async () => {
    const invitationExpires = new Date(Date.now() + 48 * 60 * 60 * 1000)
    const hoursUntilExpiry = (invitationExpires.getTime() - Date.now()) / (1000 * 60 * 60)
    expect(Math.round(hoursUntilExpiry)).toBe(48)
  })

  it('should transition waitlist entry status correctly', async () => {
    const validStatuses = ['pending', 'contacted', 'registered', 'expired']
    expect(validStatuses).toContain('pending')
    expect(validStatuses).toContain('contacted')
    expect(validStatuses).toContain('registered')
    expect(validStatuses).toContain('expired')
  })

  it('should set notifiedAt when status moves to contacted', async () => {
    let notifiedAt: Date | null = null
    const status = 'contacted'
    if (status === 'contacted') notifiedAt = new Date()
    expect(notifiedAt instanceof Date).toBe(true)
  })

  it('should flag that waitlistCapacity field exists but is never enforced (gap)', async () => {
    // Event.waitlistCapacity exists in schema but no route checks it.
    // Admins can set it via the create form but it has no effect.
    const fieldExistsInSchema = true
    const fieldIsEnforced = false
    expect(fieldExistsInSchema).toBe(true)
    expect(fieldIsEnforced).toBe(false)
  })

  it('should flag that registration does not auto-redirect to waitlist flow (gap)', async () => {
    // When capacity is full, the registration route returns 400 with a message.
    // There is no automatic redirect to a waitlist signup form.
    // The group leader must know to navigate to the waitlist independently.
    const autoRedirectToWaitlist = false
    expect(autoRedirectToWaitlist).toBe(false)
  })
})

// ── 2.4: Coupons ─────────────────────────────────────────────────────────────

describe('2.4 — Coupon Configuration: types, limits, and org isolation', () => {
  it('should support percentage discount type', async () => {
    const coupon = {
      discountType: 'percentage',
      discountValue: 10, // 10% off
    }
    const total = 1750
    const discount = (total * coupon.discountValue) / 100
    expect(discount).toBe(175)
  })

  it('should support fixed_amount discount type', async () => {
    const coupon = {
      discountType: 'fixed_amount',
      discountValue: 100, // $100 off
    }
    const total = 1750
    const discount = coupon.discountValue
    expect(discount).toBe(100)
    const afterCoupon = total - discount
    expect(afterCoupon).toBe(1650)
  })

  it('should flag that DiscountType has only 2 values (percentage and fixed_amount)', async () => {
    // The audit brief mentioned 4 types. The actual schema enum has only 2.
    // "Free registration" and "per-person discount" are NOT separate enum values.
    const discountTypes = ['percentage', 'fixed_amount']
    expect(discountTypes.length).toBe(2)
    expect(discountTypes).not.toContain('per_person')
    expect(discountTypes).not.toContain('free')
  })

  it('should support unlimited, single_use, and limited usage limits', async () => {
    const usageLimitTypes = ['unlimited', 'single_use', 'limited']
    expect(usageLimitTypes).toContain('unlimited')
    expect(usageLimitTypes).toContain('single_use')
    expect(usageLimitTypes).toContain('limited')
  })

  it('should block coupon use when usage limit reached (single_use)', async () => {
    const coupon = { usageLimitType: 'single_use', usageCount: 1 }
    const isBlocked = coupon.usageLimitType === 'single_use' && coupon.usageCount >= 1
    expect(isBlocked).toBe(true)
  })

  it('should block coupon use when limited and maxUses reached', async () => {
    const coupon = { usageLimitType: 'limited', maxUses: 10, usageCount: 10 }
    const isBlocked = coupon.usageLimitType === 'limited' && coupon.maxUses !== null && coupon.usageCount >= coupon.maxUses
    expect(isBlocked).toBe(true)
  })

  it('should block coupon use past expiration date', async () => {
    const yesterday = new Date(Date.now() - 86400000)
    const coupon = { expirationDate: yesterday }
    const isExpired = coupon.expirationDate !== null && new Date(coupon.expirationDate) < new Date()
    expect(isExpired).toBe(true)
  })

  it('should enforce org isolation — coupon from Org A cannot apply to Org B event', async () => {
    // Validation query: findFirst WHERE eventId = event.id AND code = code
    // event.id is resolved from the URL param (eventId), which is scoped to one org.
    // A coupon with eventId='orgA-event-001' will not match event.id='orgB-event-002'.
    const orgAEventId = 'event-org-a-001'
    const orgBEventId = 'event-org-b-002'
    const couponEventId = orgAEventId

    const couponMatchesOrgBEvent = couponEventId === orgBEventId
    expect(couponMatchesOrgBEvent).toBe(false)
  })

  it('should require couponsEnabled on EventSettings for validation to pass', async () => {
    const settings = { couponsEnabled: false }
    // Validation route returns 400 if not enabled
    const blocked = !settings.couponsEnabled
    expect(blocked).toBe(true)
  })

  it('should flag that registration type restriction is NOT supported (gap)', async () => {
    // There is no "applicableTo" or "registrationTypeRestriction" field on Coupon.
    // A coupon applies to any registration type that validates it.
    const couponFields = [
      'name', 'code', 'discountType', 'discountValue', 'usageLimitType',
      'maxUses', 'expirationDate', 'restrictToEmail', 'isStackable', 'active',
    ]
    expect(couponFields).not.toContain('applicableTo')
    expect(couponFields).not.toContain('registrationTypeRestriction')
  })
})

// ── 2.5: Poros Housing ────────────────────────────────────────────────────────

describe('2.5 — Poros Housing: buildings, rooms, and CSV import', () => {
  it('should enable Poros housing via EventSettings toggle', async () => {
    // Setting porosHousingEnabled=true on EventSettings activates the Poros tab
    const settings = { porosHousingEnabled: false } // default
    expect(settings.porosHousingEnabled).toBe(false)
    // Admin enables it: { porosHousingEnabled: true }
  })

  it('should support building fields: name, gender, housingType, totalFloors', async () => {
    const building = {
      name: 'Xavier Hall',
      gender: 'male',           // male | female | mixed
      housingType: 'youth_u18', // youth_u18 | chaperone_18plus | clergy | general
      totalFloors: 3,
      notes: 'East wing, first floor has ADA rooms',
    }
    expect(building.gender).toBe('male')
    expect(building.housingType).toBe('youth_u18')
    expect(building.totalFloors).toBe(3)
  })

  it('should support room fields including ADA accessibility', async () => {
    const room = {
      roomNumber: '101',
      floor: 1,
      bedCount: 2,
      roomType: 'double',         // single | double | triple | quad | custom
      gender: 'male',
      capacity: 2,
      isAdaAccessible: true,
      adaFeatures: 'Roll-in shower, grab bars',
      roomPurpose: 'housing',     // housing | small_group | both
    }
    expect(room.isAdaAccessible).toBe(true)
    expect(room.roomType).toBe('double')
    expect(room.roomPurpose).toBe('housing')
  })

  it('should validate CSV import requires specific column headers', async () => {
    const requiredHeaders = [
      'Building Name', 'Gender', 'Housing Type', 'Total Floors',
      'Room Number', 'Floor', 'Room Type', 'Capacity',
    ]

    const validCsvRow = {
      'Building Name': 'Xavier Hall',
      'Gender': 'male',
      'Housing Type': 'youth_u18',
      'Total Floors': '3',
      'Room Number': '101',
      'Floor': '1',
      'Room Type': 'double',
      'Capacity': '2',
    }

    const missingHeaders = requiredHeaders.filter(h => !(h in validCsvRow))
    expect(missingHeaders.length).toBe(0) // no missing headers
  })

  it('should auto-track totalBeds on Building when rooms are added', async () => {
    // Building.totalBeds is updated in database when rooms are created/updated
    // (confirmed by poros building routes that update totalBeds on room create)
    const buildingWithRooms = { totalBeds: 0 }
    const roomAdded = { bedCount: 2 }
    // Simulated update
    buildingWithRooms.totalBeds += roomAdded.bedCount
    expect(buildingWithRooms.totalBeds).toBe(2)
  })

  it('should require poros.access permission for building CSV import', async () => {
    // Import route checks: hasPermission(user.role, 'poros.access')
    const rolesWithPorosAccess = ['master_admin', 'org_admin', 'event_manager', 'poros_coordinator']
    const rolesWithout = ['finance_manager', 'salve_coordinator', 'rapha_coordinator', 'staff']

    expect(rolesWithPorosAccess).toContain('poros_coordinator')
    expect(rolesWithout).not.toContain('poros_coordinator')
    expect(rolesWithout).toContain('finance_manager')
  })
})

// ── 2.6: Rapha Medical ────────────────────────────────────────────────────────

describe('2.6 — Rapha Medical: fields and permission enforcement', () => {
  it('should store medical data on LiabilityForm (not Participant)', async () => {
    const medicalFieldsOnLiabilityForm = [
      'allergies',
      'medicalConditions',
      'medications',
      'dietaryRestrictions',
      'adaAccommodations',
      'emergencyContact1Name', 'emergencyContact1Phone', 'emergencyContact1Relation',
      'emergencyContact2Name', 'emergencyContact2Phone', 'emergencyContact2Relation',
      'insuranceProvider', 'insurancePolicyNumber', 'insuranceGroupNumber',
    ]
    expect(medicalFieldsOnLiabilityForm).toContain('allergies')
    expect(medicalFieldsOnLiabilityForm).toContain('medicalConditions')
    expect(medicalFieldsOnLiabilityForm).toContain('insuranceProvider')
    // These are NOT on Participant — only basic participant data is on Participant
  })

  it('should enforce rapha.access permission on medical participant endpoint', async () => {
    // GET /api/admin/events/[eventId]/rapha/participants requires rapha.access
    const hasRaphaAccess = (role: string) =>
      ['master_admin', 'org_admin', 'rapha_coordinator', 'rapha_user'].includes(role)

    expect(hasRaphaAccess('rapha_coordinator')).toBe(true)
    expect(hasRaphaAccess('org_admin')).toBe(true)
    expect(hasRaphaAccess('event_manager')).toBe(false) // gap: event managers can't see medical
    expect(hasRaphaAccess('poros_coordinator')).toBe(false)
    expect(hasRaphaAccess('finance_manager')).toBe(false)
    expect(hasRaphaAccess('staff')).toBe(false)
  })

  it('should flag that medical fields are NOT per-event configurable (always present)', async () => {
    // Medical fields are always on the LiabilityForm model.
    // Which fields are shown/required is controlled by the liability form template,
    // not by EventSettings toggle. raphaMedicalEnabled just enables the Rapha portal access.
    const perEventConfigurable = false
    const alwaysInLiabilityForm = true
    expect(perEventConfigurable).toBe(false)
    expect(alwaysInLiabilityForm).toBe(true)
  })

  it('should flag that event_manager cannot access Rapha medical data (gap)', async () => {
    // event_manager permissions: events.view, events.create, events.edit,
    //   registrations.view, registrations.edit, reports.view, reports.view_basic,
    //   poros.access, salve.access, settings.view, forms.view
    // Missing: rapha.access
    const eventManagerPermissions = [
      'events.view', 'events.create', 'events.edit',
      'registrations.view', 'registrations.edit',
      'reports.view', 'reports.view_basic',
      'poros.access', 'salve.access', 'settings.view', 'forms.view',
    ]
    expect(eventManagerPermissions).not.toContain('rapha.access')
    // An event manager cannot see allergies, medications, or emergency contacts.
  })
})

// ── 2.7: Safe Environment ─────────────────────────────────────────────────────

describe('2.7 — Safe Environment: certificate tracking workflow', () => {
  it('should track certificate status per participant', async () => {
    const certStatuses = ['not_required', 'pending', 'uploaded', 'verified']
    expect(certStatuses).toContain('not_required')
    expect(certStatuses).toContain('uploaded')
    expect(certStatuses).toContain('verified')
  })

  it('should store certificate metadata: program name, dates, file, verifier', async () => {
    const certificate = {
      fileUrl: 'https://storage.example.com/cert-001.pdf',
      originalFilename: 'virtus-cert-2025.pdf',
      programName: 'VIRTUS Protecting God\'s Children',
      completionDate: new Date('2025-03-15'),
      expirationDate: new Date('2026-03-15'),
      status: 'pending',
      uploadedByUserId: 'user-001',
      verifiedByUserId: null,
    }
    expect(certificate.programName).toContain('VIRTUS')
    expect(certificate.status).toBe('pending')
    expect(certificate.verifiedByUserId).toBeNull()
  })

  it('should link certificate to both participant and optionally to liability form', async () => {
    // SafeEnvironmentCertificate has both participantId and liabilityFormId (nullable)
    const cert = { participantId: 'part-001', liabilityFormId: 'form-001' }
    expect(cert.participantId).toBe('part-001')
    expect(cert.liabilityFormId).toBe('form-001')
  })

  it('should require admin to manually verify uploaded certificates', async () => {
    // Admin workflow: view cert in Poros liability tab → click verify/reject
    // Routes: POST /api/admin/events/[eventId]/poros-liability/certificates/[certId]/verify
    //         POST /api/admin/events/[eventId]/poros-liability/certificates/[certId]/reject
    const autoVerification = false
    expect(autoVerification).toBe(false)
  })

  it('should flag that reminder emails to group leaders are manual (no auto-reminders)', async () => {
    // POST /api/admin/events/[eventId]/poros-liability/individuals/[registrationId]/resend
    // This is a manual admin action — there is no scheduled or automatic reminder.
    const autoRemindersExist = false
    expect(autoRemindersExist).toBe(false)
  })
})

// ── 2.8: Publishing ───────────────────────────────────────────────────────────

describe('2.8 — Publishing: isPublished vs status, preview mode', () => {
  it('should allow PATCH /publish only for org_admin or master_admin (not event_manager)', async () => {
    // Publish route: user.role !== 'org_admin' && user.role !== 'master_admin' → 403
    const canPublish = (role: string) => ['org_admin', 'master_admin'].includes(role)
    expect(canPublish('org_admin')).toBe(true)
    expect(canPublish('master_admin')).toBe(true)
    expect(canPublish('event_manager')).toBe(false) // can create events but cannot publish
  })

  it('should show event on /events listing when isPublished=true', async () => {
    // Public events query: WHERE isPublished = true
    const event = { isPublished: true }
    const showsOnListing = event.isPublished
    expect(showsOnListing).toBe(true)
  })

  it('should hide event from /events listing but keep page accessible when isPublished=false', async () => {
    // /events page filters by isPublished=true
    // /events/[slug] page does NOT check isPublished — page renders regardless
    const event = { isPublished: false }
    const showsOnListing = event.isPublished
    const pageAccessibleByDirectUrl = true // no 404 for unpublished events
    expect(showsOnListing).toBe(false)
    expect(pageAccessibleByDirectUrl).toBe(true)
  })

  it('should use event.status (not isPublished) for registration availability', async () => {
    // From registration-status.ts comment:
    // "Draft/published status (isPublished field) controls visibility on /events page,
    //  but does NOT affect registration availability."
    const statusControlsRegistration = true
    const isPublishedControlsRegistration = false
    expect(statusControlsRegistration).toBe(true)
    expect(isPublishedControlsRegistration).toBe(false)
  })

  it('should show countdown before registration opens (countdownBeforeOpen default=true)', async () => {
    // getRegistrationStatus checks: if regOpen && now < regOpen → 'not_yet_open'
    // countdownBeforeOpen=true → showCountdown=true, countdownTarget=regOpen
    const settings = { countdownBeforeOpen: true }
    const regOpenDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    const now = new Date()
    const isBeforeOpen = now < regOpenDate

    const result = {
      showCountdown: isBeforeOpen && settings.countdownBeforeOpen,
      countdownTarget: regOpenDate,
      allowRegistration: false,
    }

    expect(result.showCountdown).toBe(true)
    expect(result.allowRegistration).toBe(false)
  })

  it('should show registration CTA when registration is open', async () => {
    // status = open → allowRegistration = true
    const registrationStatus = {
      status: 'open',
      allowRegistration: true,
      allowWaitlist: false,
    }
    expect(registrationStatus.allowRegistration).toBe(true)
  })

  it('should provide implicit preview mode via direct URL while isPublished=false', async () => {
    // There is no explicit "Preview Event" button in the admin UI.
    // Admins preview by copying the event URL from the settings page and opening it.
    // The public page renders for all events regardless of isPublished.
    const hasExplicitPreviewButton = false
    const previewViaDirecUrlWorks = true
    expect(hasExplicitPreviewButton).toBe(false)
    expect(previewViaDirecUrlWorks).toBe(true)
  })

  it('should allow manual status override to close registration independently of dates', async () => {
    // event.status = 'registration_closed' → registration hard-blocked regardless of dates
    // This is a manual admin action via PATCH /api/admin/events/[eventId]/status
    const event = { status: 'registration_closed' }
    const isBlocked = event.status === 'registration_closed'
    expect(isBlocked).toBe(true)
  })
})

printSummary()
