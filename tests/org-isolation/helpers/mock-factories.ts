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
