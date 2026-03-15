/**
 * Mock factories for org-isolation tests.
 * These create in-memory objects that mimic the Prisma shapes.
 */

export function makeOrg(overrides: Partial<any> = {}) {
  return {
    id: 'org-a-000',
    name: 'Test Org A',
    status: 'active',
    stripeAccountId: 'acct_test123',
    stripeChargesEnabled: true,
    platformFeePercentage: 1,
    ...overrides,
  }
}

export function makeEvent(orgId: string, overrides: Partial<any> = {}) {
  return {
    id: 'event-001',
    name: 'Test Event',
    organizationId: orgId,
    capacityTotal: 100,
    capacityRemaining: 100,
    pricing: {
      youthRegularPrice: 100,
      chaperoneRegularPrice: 80,
      priestPrice: 0,
      requireFullPayment: false,
      depositPercentage: 25,
      depositAmount: null,
      depositPerPerson: false,
    },
    organization: makeOrg({ id: orgId }),
    ...overrides,
  }
}

export function makeGroupRegistration(orgId: string, eventId: string, overrides: Partial<any> = {}) {
  return {
    id: 'reg-001',
    organizationId: orgId,
    eventId,
    groupName: 'Test Group',
    groupLeaderEmail: 'leader@example.com',
    clerkUserId: 'clerk_user_001',
    accessCode: 'TESTCODE',
    registrationStatus: 'incomplete',
    totalParticipants: 5,
    housingType: 'on_campus',
    ...overrides,
  }
}

export function makeUser(overrides: Partial<any> = {}) {
  return {
    id: 'user-001',
    clerkUserId: 'clerk_user_001',
    email: 'user@example.com',
    role: 'admin',
    organizationId: 'org-a-000',
    ...overrides,
  }
}
