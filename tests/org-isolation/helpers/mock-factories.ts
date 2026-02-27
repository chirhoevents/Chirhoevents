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
