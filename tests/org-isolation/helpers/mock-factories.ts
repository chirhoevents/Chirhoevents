/**
 * Test factory helpers for creating isolated test data.
 *
 * Each factory creates complete, self-consistent test objects
 * that can be used across multiple test files.
 */

// ============================================================
// TYPE DEFINITIONS (mirrors Prisma schema)
// ============================================================

export interface MockOrganization {
  id: string
  name: string
  type: string
  contactEmail: string
  stripeAccountId: string | null
  stripeChargesEnabled: boolean
  platformFeePercentage: number
  subscriptionTier: string
  subscriptionStatus: string
  monthlyFee: number
  storageLimitGb: number
  status: string
}

export interface MockUser {
  id: string
  clerkUserId: string
  organizationId: string
  email: string
  firstName: string
  lastName: string
  role: string
  organization: { id: string; name: string; type: string }
}

export interface MockEvent {
  id: string
  organizationId: string
  name: string
  slug: string
  startDate: Date
  endDate: Date
  timezone: string
  status: string
  isPublished: boolean
  createdBy: string
}

export interface MockGroupRegistration {
  id: string
  eventId: string
  organizationId: string
  groupName: string
  groupLeaderName: string
  groupLeaderEmail: string
  groupLeaderPhone: string
  accessCode: string
  clerkUserId: string | null
  youthCount: number
  chaperoneCount: number
  priestCount: number
  totalParticipants: number
  registrationStatus: string
  housingType: string
}

export interface MockPayment {
  id: string
  organizationId: string
  eventId: string
  registrationId: string
  registrationType: string
  amount: number
  paymentType: string
  paymentMethod: string
  paymentStatus: string
  stripePaymentIntentId: string | null
  platformFeeAmount: number | null
}

// ============================================================
// UUID GENERATOR (deterministic for testing)
// ============================================================

let _counter = 0
export function testUuid(prefix: string = 'test'): string {
  _counter++
  const hex = _counter.toString(16).padStart(12, '0')
  return `00000000-0000-0000-0000-${hex.padStart(12, '0')}`
}

export function resetCounter() {
  _counter = 0
}

// ============================================================
// ORGANIZATION FACTORIES
// ============================================================

export function makeOrg(overrides: Partial<MockOrganization> = {}): MockOrganization {
  const id = overrides.id ?? testUuid('org')
  return {
    id,
    name: `Test Diocese ${id.slice(-4)}`,
    type: 'diocese',
    contactEmail: `admin-${id.slice(-4)}@test.org`,
    stripeAccountId: `acct_test_${id.slice(-4)}`,
    stripeChargesEnabled: true,
    platformFeePercentage: 1.0,
    subscriptionTier: 'basic',
    subscriptionStatus: 'active',
    monthlyFee: 99.0,
    storageLimitGb: 10,
    status: 'active',
    ...overrides,
  }
}

export function makeOrgWithoutStripe(overrides: Partial<MockOrganization> = {}): MockOrganization {
  return makeOrg({ stripeAccountId: null, stripeChargesEnabled: false, ...overrides })
}

// ============================================================
// USER FACTORIES
// ============================================================

export function makeAdminUser(
  org: MockOrganization,
  overrides: Partial<MockUser> = {}
): MockUser {
  const id = overrides.id ?? testUuid('user')
  return {
    id,
    clerkUserId: `clerk_${id.slice(-8)}`,
    organizationId: org.id,
    email: `admin-${id.slice(-4)}@${org.id.slice(-4)}.test`,
    firstName: 'Admin',
    lastName: `User-${id.slice(-4)}`,
    role: 'org_admin',
    organization: { id: org.id, name: org.name, type: org.type },
    ...overrides,
  }
}

export function makeGroupLeaderUser(
  org: MockOrganization,
  overrides: Partial<MockUser> = {}
): MockUser {
  const id = overrides.id ?? testUuid('user')
  return {
    id,
    clerkUserId: `clerk_${id.slice(-8)}`,
    organizationId: org.id,
    email: `leader-${id.slice(-4)}@group.test`,
    firstName: 'Group',
    lastName: `Leader-${id.slice(-4)}`,
    role: 'group_leader',
    organization: { id: org.id, name: org.name, type: org.type },
    ...overrides,
  }
}

export function makeMasterAdmin(overrides: Partial<MockUser> = {}): MockUser {
  const id = overrides.id ?? testUuid('user')
  return {
    id,
    clerkUserId: `clerk_${id.slice(-8)}`,
    organizationId: 'platform-admin',
    email: `master@chirhoevents.com`,
    firstName: 'Master',
    lastName: 'Admin',
    role: 'master_admin',
    organization: { id: 'platform-admin', name: 'ChiRho Platform', type: 'platform' },
    ...overrides,
  }
}

// ============================================================
// EVENT FACTORIES
// ============================================================

export function makeEvent(
  org: MockOrganization,
  createdByUser: MockUser,
  overrides: Partial<MockEvent> = {}
): MockEvent {
  const id = overrides.id ?? testUuid('event')
  const name = overrides.name ?? `Test Event ${id.slice(-4)}`
  return {
    id,
    organizationId: org.id,
    name,
    slug: `test-event-${id.slice(-4)}`,
    startDate: new Date('2025-07-01'),
    endDate: new Date('2025-07-04'),
    timezone: 'America/New_York',
    status: 'registration_open',
    isPublished: true,
    createdBy: createdByUser.id,
    ...overrides,
  }
}

// ============================================================
// REGISTRATION FACTORIES
// ============================================================

export function makeGroupRegistration(
  event: MockEvent,
  overrides: Partial<MockGroupRegistration> = {}
): MockGroupRegistration {
  const id = overrides.id ?? testUuid('grp')
  return {
    id,
    eventId: event.id,
    organizationId: event.organizationId,
    groupName: `St. Test Parish ${id.slice(-4)}`,
    groupLeaderName: `Leader ${id.slice(-4)}`,
    groupLeaderEmail: `leader-${id.slice(-4)}@parish.test`,
    groupLeaderPhone: '555-0100',
    accessCode: `ACC-${id.slice(-6).toUpperCase()}`,
    clerkUserId: null,
    youthCount: 10,
    chaperoneCount: 2,
    priestCount: 1,
    totalParticipants: 13,
    registrationStatus: 'pending_forms',
    housingType: 'on_campus',
    ...overrides,
  }
}

// ============================================================
// PAYMENT FACTORIES
// ============================================================

export function makePayment(
  org: MockOrganization,
  event: MockEvent,
  registration: MockGroupRegistration,
  overrides: Partial<MockPayment> = {}
): MockPayment {
  const id = overrides.id ?? testUuid('pay')
  return {
    id,
    organizationId: org.id,
    eventId: event.id,
    registrationId: registration.id,
    registrationType: 'group',
    amount: 500.0,
    paymentType: 'deposit',
    paymentMethod: 'card',
    paymentStatus: 'succeeded',
    stripePaymentIntentId: `pi_test_${id.slice(-8)}`,
    platformFeeAmount: 5.0,
    ...overrides,
  }
}

// ============================================================
// STRIPE CHECKOUT CONFIG BUILDER (mirrors actual route logic)
// ============================================================

export interface StripeCheckoutConfig {
  payment_method_types: string[]
  mode: string
  payment_intent_data?: {
    application_fee_amount?: number
    transfer_data?: { destination: string }
  }
}

/**
 * Simulates the checkout config construction in registration/group/route.ts
 * to verify that org stripe account routing is correct.
 */
export function buildGroupCheckoutConfig(
  org: MockOrganization,
  depositAmountCents: number
): StripeCheckoutConfig {
  const platformFeePercentage = org.platformFeePercentage || 1
  const platformFeeAmount = Math.round(depositAmountCents * (platformFeePercentage / 100))

  const config: StripeCheckoutConfig = {
    payment_method_types: ['card'],
    mode: 'payment',
  }

  if (org.stripeAccountId) {
    config.payment_intent_data = {
      application_fee_amount: platformFeeAmount,
      transfer_data: {
        destination: org.stripeAccountId,
      },
    }
  }
  // else: no payment_intent_data — payment goes to platform account

  return config
}

/**
 * Simulates the payment intent config in group-leader/payments/create-payment-intent/route.ts
 */
export interface StripePaymentIntentConfig {
  amount: number
  currency: string
  application_fee_amount?: number
  transfer_data?: { destination: string }
}

export function buildGroupLeaderPaymentIntentConfig(
  org: MockOrganization,
  amountInCents: number
): StripePaymentIntentConfig {
  const platformFeePercentage = org.platformFeePercentage || 1
  const platformFeeAmount = Math.round(amountInCents * (platformFeePercentage / 100))

  const config: StripePaymentIntentConfig = {
    amount: amountInCents,
    currency: 'usd',
  }

  if (org.stripeAccountId) {
    config.application_fee_amount = platformFeeAmount
    config.transfer_data = {
      destination: org.stripeAccountId,
    }
  }

  return config
}

// ============================================================
// REPORTING TYPES & FACTORIES
// ============================================================

export interface MockParticipant {
  id: string
  registrationId: string          // groupRegistrationId
  organizationId: string
  eventId: string
  firstName: string
  lastName: string
  age: number
  gender: string
  participantType: string
  email: string
  // Medical fields (rapha)
  allergies: string | null
  dietaryRestrictions: string | null
  medicalConditions: string | null
  medications: string | null
  adaAccommodations: string | null
  emergencyContact1Name: string
  emergencyContact1Phone: string
  // Check-in (salve)
  checkedIn: boolean
  checkInTime: Date | null
  // Housing (poros)
  roomId: string | null
  bedLabel: string | null
}

export interface MockLiabilityForm {
  id: string
  participantId: string
  organizationId: string
  eventId: string
  allergies: string | null
  dietaryRestrictions: string | null
  medicalConditions: string | null
  medications: string | null
  adaAccommodations: string | null
  completedAt: Date | null
}

export interface MockRoomAllocation {
  id: string
  eventId: string
  organizationId: string
  roomId: string
  buildingName: string
  roomNumber: string
  gender: string
  capacity: number
  assignedCount: number
}

export interface MockCheckInLog {
  id: string
  eventId: string
  organizationId: string
  participantId: string
  participantName: string
  checkInTime: Date
  checkedInBy: string
}

export interface MockReportDataset {
  org: MockOrganization
  event: MockEvent
  registrations: MockGroupRegistration[]
  participants: MockParticipant[]
  forms: MockLiabilityForm[]
  rooms: MockRoomAllocation[]
  checkInLogs: MockCheckInLog[]
  payments: MockPayment[]
}

export function makeParticipant(
  reg: MockGroupRegistration,
  org: MockOrganization,
  event: MockEvent,
  overrides: Partial<MockParticipant> = {}
): MockParticipant {
  const id = overrides.id ?? testUuid('part')
  return {
    id,
    registrationId: reg.id,
    organizationId: org.id,
    eventId: event.id,
    firstName: `First${id.slice(-4)}`,
    lastName: `Last${id.slice(-4)}`,
    age: 17,
    gender: 'male',
    participantType: 'youth_under_18',
    email: `participant-${id.slice(-4)}@test.com`,
    allergies: null,
    dietaryRestrictions: null,
    medicalConditions: null,
    medications: null,
    adaAccommodations: null,
    emergencyContact1Name: `Parent ${id.slice(-4)}`,
    emergencyContact1Phone: '555-0199',
    checkedIn: false,
    checkInTime: null,
    roomId: null,
    bedLabel: null,
    ...overrides,
  }
}

export function makeParticipantWithMedical(
  reg: MockGroupRegistration,
  org: MockOrganization,
  event: MockEvent,
  overrides: Partial<MockParticipant> = {}
): MockParticipant {
  return makeParticipant(reg, org, event, {
    allergies: 'Peanuts, tree nuts',
    dietaryRestrictions: 'Gluten-free',
    medicalConditions: 'Asthma',
    medications: 'Albuterol inhaler',
    adaAccommodations: 'Wheelchair access required',
    ...overrides,
  })
}

export function makeLiabilityForm(
  participant: MockParticipant,
  overrides: Partial<MockLiabilityForm> = {}
): MockLiabilityForm {
  const id = overrides.id ?? testUuid('form')
  return {
    id,
    participantId: participant.id,
    organizationId: participant.organizationId,
    eventId: participant.eventId,
    allergies: participant.allergies,
    dietaryRestrictions: participant.dietaryRestrictions,
    medicalConditions: participant.medicalConditions,
    medications: participant.medications,
    adaAccommodations: participant.adaAccommodations,
    completedAt: new Date('2025-06-15'),
    ...overrides,
  }
}

export function makeRoomAllocation(
  org: MockOrganization,
  event: MockEvent,
  overrides: Partial<MockRoomAllocation> = {}
): MockRoomAllocation {
  const id = overrides.id ?? testUuid('room')
  return {
    id,
    eventId: event.id,
    organizationId: org.id,
    roomId: `room-${id.slice(-4)}`,
    buildingName: `Building ${id.slice(-4)}`,
    roomNumber: `${Math.floor(Math.random() * 300) + 100}`,
    gender: 'male',
    capacity: 8,
    assignedCount: 4,
    ...overrides,
  }
}

export function makeCheckInLog(
  participant: MockParticipant,
  org: MockOrganization,
  overrides: Partial<MockCheckInLog> = {}
): MockCheckInLog {
  const id = overrides.id ?? testUuid('chk')
  return {
    id,
    eventId: participant.eventId,
    organizationId: org.id,
    participantId: participant.id,
    participantName: `${participant.firstName} ${participant.lastName}`,
    checkInTime: new Date('2025-07-01T08:00:00Z'),
    checkedInBy: `staff-${id.slice(-4)}`,
    ...overrides,
  }
}

/**
 * Build a complete two-org dataset for cross-org leakage tests.
 * OrgA and OrgB have overlapping event dates and all report data types.
 */
export function buildTwoOrgDataset(): {
  orgA: MockReportDataset
  orgB: MockReportDataset
} {
  resetCounter()

  const orgA = makeOrg({ name: 'Diocese Alpha' })
  const orgB = makeOrg({ name: 'Diocese Beta' })
  const adminA = makeAdminUser(orgA)
  const adminB = makeAdminUser(orgB)

  // Overlapping event dates
  const eventA = makeEvent(orgA, adminA, {
    name: 'Alpha Youth Rally 2025',
    startDate: new Date('2025-07-01'),
    endDate: new Date('2025-07-04'),
  })
  const eventB = makeEvent(orgB, adminB, {
    name: 'Beta Youth Conference 2025',
    startDate: new Date('2025-07-02'),   // Overlaps with A
    endDate: new Date('2025-07-05'),
  })

  const regA1 = makeGroupRegistration(eventA, { groupName: 'Alpha St. Mary Parish', youthCount: 15, totalParticipants: 18 })
  const regA2 = makeGroupRegistration(eventA, { groupName: 'Alpha St. Joseph Parish', youthCount: 10, totalParticipants: 12 })
  const regB1 = makeGroupRegistration(eventB, { groupName: 'Beta St. Peter Parish', youthCount: 20, totalParticipants: 24 })
  const regB2 = makeGroupRegistration(eventB, { groupName: 'Beta Holy Family Parish', youthCount: 8, totalParticipants: 10 })

  const partA1 = makeParticipantWithMedical(regA1, orgA, eventA, { firstName: 'AliceAlpha', lastName: 'Smith' })
  const partA2 = makeParticipant(regA1, orgA, eventA, { firstName: 'BobAlpha', lastName: 'Jones', checkedIn: true, checkInTime: new Date('2025-07-01T09:00:00Z') })
  const partB1 = makeParticipantWithMedical(regB1, orgB, eventB, { firstName: 'CarolBeta', lastName: 'Davis', allergies: 'Shellfish, dairy' })
  const partB2 = makeParticipant(regB1, orgB, eventB, { firstName: 'DanBeta', lastName: 'Wilson', checkedIn: true, checkInTime: new Date('2025-07-02T09:00:00Z') })

  const formA1 = makeLiabilityForm(partA1)
  const formA2 = makeLiabilityForm(partA2)
  const formB1 = makeLiabilityForm(partB1)
  const formB2 = makeLiabilityForm(partB2)

  const roomA = makeRoomAllocation(orgA, eventA, { buildingName: 'Alpha Hall', gender: 'male' })
  const roomB = makeRoomAllocation(orgB, eventB, { buildingName: 'Beta Hall', gender: 'female' })

  const logA = makeCheckInLog(partA2, orgA)
  const logB = makeCheckInLog(partB2, orgB)

  const payA = makePayment(orgA, eventA, regA1, { amount: 1500, paymentStatus: 'succeeded' })
  const payB = makePayment(orgB, eventB, regB1, { amount: 2000, paymentStatus: 'succeeded' })

  return {
    orgA: {
      org: orgA, event: eventA,
      registrations: [regA1, regA2],
      participants: [partA1, partA2],
      forms: [formA1, formA2],
      rooms: [roomA],
      checkInLogs: [logA],
      payments: [payA],
    },
    orgB: {
      org: orgB, event: eventB,
      registrations: [regB1, regB2],
      participants: [partB1, partB2],
      forms: [formB1, formB2],
      rooms: [roomB],
      checkInLogs: [logB],
      payments: [payB],
    },
  }
}

// ============================================================
// REPORT QUERY SIMULATORS (mirror actual WHERE clause logic)
// ============================================================

/**
 * Simulates the access gate: verifyEventAccess(request, eventId)
 * Returns false if user's org does not own the event → 403 would be returned.
 */
export function simulateEventAccessGate(
  userOrgId: string,
  userRole: string,
  eventOrgId: string
): { allowed: boolean; status: number; reason: string } {
  if (userRole === 'master_admin') {
    return { allowed: true, status: 200, reason: 'master_admin has unrestricted access' }
  }
  if (eventOrgId !== userOrgId) {
    return { allowed: false, status: 403, reason: `Organization mismatch: user=${userOrgId}, event=${eventOrgId}` }
  }
  return { allowed: true, status: 200, reason: 'org match' }
}

/**
 * Simulates the WHERE clause used by most report routes after access is verified:
 *   { eventId }
 * Data is scoped to the event → scoped to the org via the access gate.
 */
export function queryByEventId<T extends { eventId: string }>(
  data: T[],
  eventId: string
): T[] {
  return data.filter(d => d.eventId === eventId)
}

/**
 * Simulates the explicit organizationId filter used by financial + forms/export routes:
 *   { organizationId }
 */
export function queryByOrgId<T extends { organizationId: string }>(
  data: T[],
  orgId: string
): T[] {
  return data.filter(d => d.organizationId === orgId)
}

/**
 * Simulates the "all events" query with ORG filter (financial route correct behavior):
 *   { organizationId: effectiveOrgId }
 */
export function queryAllEventsByOrg<T extends { organizationId: string }>(
  data: T[],
  orgId: string
): T[] {
  return data.filter(d => d.organizationId === orgId)
}

/**
 * Simulates the BUGGY "all events" query WITHOUT org filter:
 *   {} (no filter) → returns everything
 */
export function queryAllEventsNoFilter<T>(data: T[]): T[] {
  return [...data]
}

// ============================================================
// PAYMENT BALANCE FACTORY (mirrors PaymentBalance Prisma model)
// ============================================================

export interface MockPaymentBalance {
  id: string
  organizationId: string
  eventId: string
  registrationId: string
  registrationType: string
  totalAmountDue: number
  amountPaid: number
  amountRemaining: number
  lateFeesApplied: number
  lastPaymentDate: Date | null
  paymentStatus: 'unpaid' | 'partial' | 'paid_full' | 'overpaid' | 'pending_check_payment'
}

export function makePaymentBalance(
  org: MockOrganization,
  event: MockEvent,
  registration: MockGroupRegistration,
  overrides: Partial<MockPaymentBalance> = {}
): MockPaymentBalance {
  const id = overrides.id ?? testUuid('bal')
  const totalAmountDue = overrides.totalAmountDue ?? 1500
  const amountPaid = overrides.amountPaid ?? 0
  const amountRemaining = overrides.amountRemaining ?? (totalAmountDue - amountPaid)

  let paymentStatus: MockPaymentBalance['paymentStatus'] = 'unpaid'
  if (amountPaid >= totalAmountDue) paymentStatus = 'paid_full'
  else if (amountPaid > 0) paymentStatus = 'partial'

  return {
    id,
    organizationId: org.id,
    eventId: event.id,
    registrationId: registration.id,
    registrationType: 'group',
    totalAmountDue,
    amountPaid,
    amountRemaining,
    lateFeesApplied: 0,
    lastPaymentDate: amountPaid > 0 ? new Date('2025-06-01') : null,
    paymentStatus,
    ...overrides,
  }
}

// ============================================================
// WEBHOOK METADATA BUILDER
// ============================================================

export interface WebhookPaymentIntentMetadata {
  registrationId: string
  registrationType: string
  groupName: string
  eventId: string
  organizationId: string
  platformFeeAmount: string
  notes?: string
}

/**
 * Builds the Stripe payment intent metadata as set by the server at checkout creation.
 * At webhook time, Stripe returns this metadata unchanged (protected by signature).
 */
export function buildWebhookPaymentIntentMetadata(
  reg: MockGroupRegistration,
  org: MockOrganization,
  platformFeeAmount: number = 500
): WebhookPaymentIntentMetadata {
  return {
    registrationId: reg.id,
    registrationType: 'group',
    groupName: reg.groupName,
    eventId: reg.eventId,
    organizationId: org.id,
    platformFeeAmount: platformFeeAmount.toString(),
  }
}

// ============================================================
// INSTALLMENT PAYMENT SUMMARY (for partial payment tracking)
// ============================================================

export interface InstallmentSummary {
  registrationId: string
  organizationId: string
  totalAmountDue: number
  payments: Array<{ id: string; amount: number; paymentStatus: string; paymentType: string }>
  amountPaid: number
  amountRemaining: number
  isFullyPaid: boolean
}

// ============================================================
// EDGE-CASE FACTORIES (Phase 6)
// ============================================================

export type OrgStatus = 'active' | 'suspended' | 'deactivated' | 'pending'

export interface MockEventCapacity {
  eventId: string
  organizationId: string
  capacityTotal: number | null
  capacityRemaining: number | null
  onCampusTotal: number | null
  onCampusRemaining: number | null
  offCampusTotal: number | null
  offCampusRemaining: number | null
  status: string  // 'registration_open' | 'registration_closed' | 'cancelled'
}

export interface MockRegistrationAttempt {
  groupName: string
  groupLeaderEmail: string
  youthCount: number
  chaperoneCount: number
  priestCount: number
  housingType: string
  paymentMethod: 'card' | 'check'
  eventId: string
  organizationId: string
}

export interface MockRegistrationResult {
  success: boolean
  httpStatus: number
  error?: string
  registrationId?: string
  registrationStatus?: string  // 'incomplete' | 'pending_payment'
  capacityDecrementedBeforeStripe: boolean
  stripeSessionCreated: boolean
  rollbackOccurred: boolean
}

/**
 * Build an event with specific capacity settings for edge-case tests.
 */
export function makeEventWithCapacity(
  org: MockOrganization,
  createdByUser: MockUser,
  capacity: {
    total: number
    remaining: number
    onCampusTotal?: number
    onCampusRemaining?: number
  },
  overrides: Partial<MockEvent> = {}
): MockEvent & { capacityTotal: number; capacityRemaining: number } {
  const event = makeEvent(org, createdByUser, overrides)
  return {
    ...event,
    capacityTotal: capacity.total,
    capacityRemaining: capacity.remaining,
  } as MockEvent & { capacityTotal: number; capacityRemaining: number }
}

/**
 * Simulates the capacity check logic from registration/group/route.ts lines 119-135.
 * Returns what the API would return before creating any records.
 */
export function simulateCapacityCheck(
  capacityRemaining: number | null,
  capacityTotal: number | null,
  requestedParticipants: number
): { allowed: boolean; status: number; error?: string; spotsRemaining?: number } {
  if (capacityTotal === null || capacityRemaining === null) {
    return { allowed: true, status: 200 } // No capacity limit configured
  }
  if (capacityRemaining <= 0) {
    return { allowed: false, status: 400, error: 'Event is at full capacity.', spotsRemaining: 0 }
  }
  if (capacityRemaining < requestedParticipants) {
    return {
      allowed: false,
      status: 400,
      error: `Not enough spots available. Only ${capacityRemaining} spot${capacityRemaining === 1 ? '' : 's'} remaining.`,
      spotsRemaining: capacityRemaining,
    }
  }
  return { allowed: true, status: 200, spotsRemaining: capacityRemaining }
}

/**
 * Simulates the READ-CHECK-DECREMENT pattern (non-atomic) used in the route.
 * Demonstrates the TOCTOU race condition.
 *
 * In the real code:
 *   Step 1: event = prisma.event.findUnique()  ← reads capacityRemaining
 *   Step 2: if (capacityRemaining < totalParticipants) return 400  ← checks
 *   Step 3: prisma.event.update({ capacityRemaining: { decrement: n } })  ← decrements
 *
 * Between steps 1 and 3, another request can read the same capacityRemaining.
 */
export function simulateConcurrentCapacityChecks(
  initialRemaining: number,
  registrations: Array<{ name: string; participants: number }>
): Array<{ name: string; participants: number; passedCheck: boolean; error?: string }> {
  // All registrations READ the same initial capacity (concurrent)
  const results = registrations.map(reg => {
    const check = simulateCapacityCheck(initialRemaining, initialRemaining + 100, reg.participants)
    return {
      name: reg.name,
      participants: reg.participants,
      passedCheck: check.allowed,
      error: check.error,
    }
  })
  return results
}

/**
 * Simulates the actual capacity after sequential decrements.
 * In the real code, each successful registration decrements via:
 *   prisma.event.update({ capacityRemaining: Math.max(0, current - n) })
 */
export function simulateCapacityAfterRegistrations(
  initialRemaining: number,
  successfulRegistrations: number[]
): number {
  return successfulRegistrations.reduce(
    (remaining, n) => Math.max(0, remaining - n),
    initialRemaining
  )
}

/**
 * Simulates the registration creation flow order from group/route.ts.
 * Returns a record describing what was created and at what step.
 */
export function simulateRegistrationFlow(params: {
  org: MockOrganization
  event: MockEvent & { capacityTotal?: number; capacityRemaining?: number }
  request: MockRegistrationAttempt
  stripeWillSucceed: boolean
  stripeWillThrow: boolean
}): {
  capacityCheckPassed: boolean
  registrationCreated: boolean
  capacityDecrementedStep: number | null  // step number (1-based) when this happened
  stripeStep: number | null
  registrationStatus: string | null
  orphanedOnStripeFailure: boolean
  finalState: 'complete' | 'incomplete' | 'never_created' | 'error'
} {
  const { org, event, request, stripeWillSucceed, stripeWillThrow } = params

  // Step 1: Capacity check (line 119-135)
  const capacityCheck = simulateCapacityCheck(
    event.capacityRemaining ?? null,
    event.capacityTotal ?? null,
    request.youthCount + request.chaperoneCount + request.priestCount
  )
  if (!capacityCheck.allowed) {
    return {
      capacityCheckPassed: false,
      registrationCreated: false,
      capacityDecrementedStep: null,
      stripeStep: null,
      registrationStatus: null,
      orphanedOnStripeFailure: false,
      finalState: 'never_created',
    }
  }

  // Step 2: Registration record created (line 318) — BEFORE Stripe
  const registrationStatus = request.paymentMethod === 'check' ? 'pending_payment' : 'incomplete'

  // Step 3: Capacity decremented (line 409) — still BEFORE Stripe
  const capacityDecrementedStep = 3

  // Step 4: Stripe checkout (line 594 for card)
  if (request.paymentMethod === 'card') {
    if (stripeWillThrow) {
      // Stripe API call throws → registration already exists → orphaned
      return {
        capacityCheckPassed: true,
        registrationCreated: true,
        capacityDecrementedStep,
        stripeStep: 4,
        registrationStatus,  // 'incomplete' — never updated
        orphanedOnStripeFailure: true,
        finalState: 'incomplete',  // Stays 'incomplete' forever without admin cleanup
      }
    }
    if (!stripeWillSucceed) {
      // Checkout session created but payment never completed
      return {
        capacityCheckPassed: true,
        registrationCreated: true,
        capacityDecrementedStep,
        stripeStep: 4,
        registrationStatus,  // 'incomplete'
        orphanedOnStripeFailure: false,  // Session exists, not orphaned yet
        finalState: 'incomplete',
      }
    }
  }

  return {
    capacityCheckPassed: true,
    registrationCreated: true,
    capacityDecrementedStep,
    stripeStep: request.paymentMethod === 'card' ? 4 : null,
    registrationStatus: request.paymentMethod === 'check' ? 'pending_payment' : 'incomplete',
    orphanedOnStripeFailure: false,
    finalState: request.paymentMethod === 'check' ? 'complete' : 'incomplete',
  }
}

/**
 * Simulates link-access-code logic from the route.
 */
export function simulateLinkAccessCode(
  registration: MockGroupRegistration,
  requestingUserId: string
): { status: number; success: boolean; error?: string; message?: string } {
  // Code not found
  if (!registration) {
    return { status: 404, success: false, error: 'Invalid access code' }
  }
  // Already linked to a DIFFERENT user
  if (registration.clerkUserId && registration.clerkUserId !== requestingUserId) {
    return { status: 409, success: false, error: 'This access code is already linked to another account' }
  }
  // Already linked to THIS user (idempotent)
  if (registration.clerkUserId === requestingUserId) {
    return { status: 200, success: true, message: 'Access code already linked to your account' }
  }
  // New link
  return { status: 200, success: true, message: 'Access code linked successfully' }
}

/**
 * Simulates the dashboard findFirst logic (returns first registration by clerkUserId).
 * Reproduces the single-registration limitation and the whereClause.id=eventId bug.
 */
export function simulateDashboardQuery(
  registrations: MockGroupRegistration[],
  clerkUserId: string,
  eventId?: string
): MockGroupRegistration | null {
  const matches = registrations.filter(r => r.clerkUserId === clerkUserId)
  if (matches.length === 0) return null

  if (eventId) {
    // Buggy: whereClause.id = eventId → filters by registration.id, not registration.eventId
    const buggyMatch = matches.find(r => r.id === eventId)
    return buggyMatch ?? null
  }

  // findFirst → returns first match (by insertion order)
  return matches[0]
}

/**
 * Simulates the CORRECT dashboard query with eventId filter (the fix).
 */
export function simulateDashboardQueryFixed(
  registrations: MockGroupRegistration[],
  clerkUserId: string,
  eventId?: string
): MockGroupRegistration | null {
  const matches = registrations.filter(r => r.clerkUserId === clerkUserId)
  if (matches.length === 0) return null

  if (eventId) {
    // Correct: filter by registration.eventId
    return matches.find(r => r.eventId === eventId) ?? null
  }

  return matches[0]
}

/**
 * Simulates the balance recalculation logic from the webhook handler.
 * Recalculates from all succeeded payments — idempotent.
 */
export function buildInstallmentSummary(
  org: MockOrganization,
  reg: MockGroupRegistration,
  payments: MockPayment[],
  totalAmountDue: number
): InstallmentSummary {
  const succeededPayments = payments.filter(p => p.paymentStatus === 'succeeded')
  const amountPaid = succeededPayments.reduce((sum, p) => sum + p.amount, 0)
  const amountRemaining = totalAmountDue - amountPaid

  return {
    registrationId: reg.id,
    organizationId: org.id,
    totalAmountDue,
    payments,
    amountPaid,
    amountRemaining,
    isFullyPaid: amountRemaining <= 0,
  }
}
