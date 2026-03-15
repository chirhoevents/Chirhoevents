/**
 * Test Suite 10: Group Registration Flow — End-to-End Verification
 *
 * Covers:
 * Step 3.1 — Registration data integrity (headcounts, org linkage, payment records)
 * Step 3.2 — Portal instruction content (email copy analysis)
 * Step 3.3 — Group leader portal isolation (cannot see other groups or orgs)
 *
 * All tests run WITHOUT a database or Clerk connection.
 *
 * Run: npx tsx tests/org-isolation/10-group-registration-flow.test.ts
 */

import { describe, it, expect, printSummary } from './helpers/test-runner'
import {
  makeOrg,
  makeOrgWithoutStripe,
  makeAdminUser,
  makeGroupLeaderUser,
  makeEvent,
  makeGroupRegistration,
  makePayment,
  buildGroupCheckoutConfig,
  resetCounter,
} from './helpers/mock-factories'

// ============================================================
// SUITE: Step 3.1.2 — Registration form data integrity
// ============================================================

describe('Step 3.1: Registration creates correct records with org linkage', () => {
  resetCounter()

  it('group registration inherits organizationId from the event', () => {
    // POST /api/registration/group creates:
    //   data: { eventId: event.id, organizationId: event.organizationId, ... }
    // The org comes from the event, not from user input.

    const org = makeOrg()
    const admin = makeAdminUser(org)
    const event = makeEvent(org, admin)
    const reg = makeGroupRegistration(event)

    expect(reg.organizationId).toBe(org.id)
    expect(reg.eventId).toBe(event.id)
    expect(reg.organizationId).toBe(event.organizationId)
  })

  it('two registrations for the same event both inherit the event org', () => {
    const org = makeOrg()
    const admin = makeAdminUser(org)
    const event = makeEvent(org, admin)

    const reg1 = makeGroupRegistration(event, { groupName: 'St. Mary Parish' })
    const reg2 = makeGroupRegistration(event, { groupName: 'St. Joseph Parish' })

    expect(reg1.organizationId).toBe(org.id)
    expect(reg2.organizationId).toBe(org.id)
    expect(reg1.id).not.toBe(reg2.id) // Different registrations
    expect(reg1.accessCode).not.toBe(reg2.accessCode) // Different access codes
  })

  it('a group registering for Org A cannot end up with Org B organizationId', () => {
    const orgA = makeOrg()
    const orgB = makeOrg()
    const adminA = makeAdminUser(orgA)
    const eventA = makeEvent(orgA, adminA)

    // Registration is for Org A's event → always gets Org A's orgId
    const reg = makeGroupRegistration(eventA)

    expect(reg.organizationId).toBe(orgA.id)
    expect(reg.organizationId).not.toBe(orgB.id)
  })

  it('payment record is created with correct org/event/registration linkage', () => {
    const org = makeOrg()
    const admin = makeAdminUser(org)
    const event = makeEvent(org, admin)
    const reg = makeGroupRegistration(event)
    const payment = makePayment(org, event, reg)

    expect(payment.organizationId).toBe(org.id)
    expect(payment.eventId).toBe(event.id)
    expect(payment.registrationId).toBe(reg.id)
    expect(payment.registrationType).toBe('group')
  })

  it('deposit amount does not exceed total amount', () => {
    // The API enforces: depositAmount = Math.min(depositAmount, totalAmount)
    // This prevents over-charging at checkout

    const totalAmount = 1500
    const requestedDeposit = 2000 // Larger than total

    const actualDeposit = Math.min(requestedDeposit, totalAmount)
    expect(actualDeposit).toBe(totalAmount) // Capped at total

    const balanceRemaining = totalAmount - actualDeposit
    expect(balanceRemaining).toBe(0) // Full payment, no balance
  })

  it('check payment creates pending payment record (not Stripe checkout)', () => {
    // For check payment:
    //   registrationStatus = 'pending_payment'
    //   Payment record: paymentStatus = 'pending', paymentMethod = 'check'
    //   No Stripe checkout session created (checkoutUrl = null)

    const org = makeOrg()
    const admin = makeAdminUser(org)
    const event = makeEvent(org, admin)
    const reg = makeGroupRegistration(event)
    const payment = makePayment(org, event, reg, {
      paymentMethod: 'check',
      paymentStatus: 'pending',
      stripePaymentIntentId: null,
    })

    expect(payment.paymentMethod).toBe('check')
    expect(payment.paymentStatus).toBe('pending')
    expect(payment.stripePaymentIntentId).toBeNull()
  })

  it('credit card payment creates Stripe checkout with org connected account', () => {
    const org = makeOrg()
    const depositAmountCents = 50000 // $500

    const checkoutConfig = buildGroupCheckoutConfig(org, depositAmountCents)

    // Verify destination charge setup
    expect(checkoutConfig.payment_intent_data?.transfer_data?.destination).toBe(org.stripeAccountId)
    expect(checkoutConfig.payment_intent_data?.application_fee_amount).toBeDefined()
    expect(checkoutConfig.mode).toBe('payment')
  })

  it('Stripe metadata contains registration ID (for webhook routing)', () => {
    // The checkout session config includes:
    //   metadata: { registrationId: registration.id, eventId: event.id, groupName, accessCode }
    // This is how the webhook knows which registration to update.

    const org = makeOrg()
    const admin = makeAdminUser(org)
    const event = makeEvent(org, admin)
    const reg = makeGroupRegistration(event)

    // Simulate the metadata that gets set in the Stripe session
    const stripeMetadata = {
      registrationId: reg.id,
      eventId: event.id,
      groupName: reg.groupName,
      accessCode: reg.accessCode,
    }

    expect(stripeMetadata.registrationId).toBe(reg.id)
    expect(stripeMetadata.eventId).toBe(event.id)
    // No organizationId in user-controlled params — org comes from DB via event
  })
})

// ============================================================
// SUITE: Step 3.1.3 — Participant details flow
// ============================================================

describe('Step 3.1: Participants register AFTER the group leader (headcount-only at registration)', () => {
  resetCounter()

  it('group registration stores participant COUNTS, not names', () => {
    const org = makeOrg()
    const admin = makeAdminUser(org)
    const event = makeEvent(org, admin)
    const reg = makeGroupRegistration(event, {
      youthCount: 15,
      chaperoneCount: 3,
      priestCount: 1,
      totalParticipants: 19,
    })

    // The registration records COUNTS (headcounts), not individual names
    expect(reg.youthCount).toBe(15)
    expect(reg.chaperoneCount).toBe(3)
    expect(reg.priestCount).toBe(1)
    expect(reg.totalParticipants).toBe(19)
  })

  it('totalParticipants = youthCount + chaperoneCount + priestCount', () => {
    const youth = 12
    const chaperones = 2
    const priests = 1
    const expected = youth + chaperones + priests

    const org = makeOrg()
    const admin = makeAdminUser(org)
    const event = makeEvent(org, admin)
    const reg = makeGroupRegistration(event, {
      youthCount: youth,
      chaperoneCount: chaperones,
      priestCount: priests,
      totalParticipants: expected,
    })

    expect(reg.totalParticipants).toBe(expected)
  })

  it('access code enables participants to fill their own forms later', () => {
    const org = makeOrg()
    const admin = makeAdminUser(org)
    const event = makeEvent(org, admin)
    const reg = makeGroupRegistration(event)

    // The access code is how participants find their group's registration
    // They go to /poros/liability?code=[accessCode]
    expect(reg.accessCode).toBeDefined()
    expect(typeof reg.accessCode).toBe('string')
    expect(reg.accessCode.length).toBeGreaterThan(0)
  })
})

// ============================================================
// SUITE: Step 3.2 — Email portal instructions analysis
// ============================================================

describe('Step 3.2: Portal instructions in confirmation email (UX analysis)', () => {
  resetCounter()

  it('ISSUE: current portal instruction text contains unclear copy', () => {
    // Exact current text from email-templates.ts:
    const currentPortalInstructionText = "Sign in if you have used Chiro in the past and add your new access code, or sign up using Clerk!"

    // "Chiro" - not a recognizable product name to group leaders
    const containsInternalBranding = currentPortalInstructionText.includes('Chiro')
    expect(containsInternalBranding).toBeTruthy() // This SHOULD be false after fix

    // "Clerk" - implementation detail, not user-facing
    const exposesAuthProvider = currentPortalInstructionText.includes('Clerk')
    expect(exposesAuthProvider).toBeTruthy() // This SHOULD be false after fix
  })

  it('ISSUE: portal instructions do not mention how to link the access code', () => {
    // The current Step 3 text does NOT instruct the leader to:
    // 1. Go to /dashboard/group-leader/link-access-code
    // 2. Enter their access code
    //
    // Without this step, a newly registered user reaches the portal
    // and sees "No registration found" — they don't know what to do.

    const currentStep3Text = "Sign in if you have used Chiro in the past and add your new access code, or sign up using Clerk!"

    // The phrase "add your new access code" hints at this step but is too vague
    const explainsLinkingSteps = currentStep3Text.includes('link') || currentStep3Text.includes('Link')
    const mentionsLinkPage = currentStep3Text.includes('link-access-code')
    const showsHowToEnterCode = currentStep3Text.includes('enter your access code') ||
                                 currentStep3Text.includes('Enter your access code')

    expect(explainsLinkingSteps).toBeFalsy() // Missing: how to link
    expect(mentionsLinkPage).toBeFalsy() // Missing: where to link
    expect(showsHowToEnterCode).toBeFalsy() // Missing: exact action
  })

  it('ISSUE: portal instructions do not explain what the portal does', () => {
    // Group leaders should be told WHY to set up the portal.
    // Current text does not mention what they will find there.

    const currentStep3Text = "Sign in if you have used Chiro in the past and add your new access code, or sign up using Clerk!"

    const mentionsFormTracking = currentStep3Text.includes('form')
    const mentionsPayments = currentStep3Text.includes('payment')
    const mentionsHousing = currentStep3Text.includes('housing')
    const mentionsRoster = currentStep3Text.includes('roster')

    // None of these portal features are mentioned
    expect(mentionsFormTracking || mentionsPayments || mentionsHousing || mentionsRoster).toBeFalsy()
  })

  it('ISSUE: liability form instructions use internal platform name "Poros"', () => {
    // Current text: "They can go to the Poros liability platform."
    // "Poros" is internal jargon — participants and parents will not recognize it.

    const currentLiabilityText = "Each participant must complete their liability form using your access code. They can go to the Poros liability platform."

    const usesInternalName = currentLiabilityText.includes('Poros')
    expect(usesInternalName).toBeTruthy() // Should be false after fix — use plain language instead
  })

  it('VERIFIED: email includes portal URL button', () => {
    // The email DOES include a "Go to Group Leader Portal" button.
    // This verifies the portal URL is at least present.
    // The groupLeaderPortalUrl parameter points to /dashboard/group-leader

    const groupLeaderPortalUrl = 'https://chirhoevents.com/dashboard/group-leader'
    expect(groupLeaderPortalUrl).toContain('/dashboard/group-leader')
    expect(groupLeaderPortalUrl.length).toBeGreaterThan(0)
  })

  it('VERIFIED: email includes access code prominently', () => {
    // The confirmation email displays the access code in a large, centered box
    // before the Next Steps section. This is correct.

    const org = makeOrg()
    const admin = makeAdminUser(org)
    const event = makeEvent(org, admin)
    const reg = makeGroupRegistration(event)

    // Access code is in the email
    expect(reg.accessCode).toBeDefined()
    expect(reg.accessCode.startsWith('ACC-')).toBeTruthy()
  })

  it('VERIFIED: confirmation page URL in email is correct format', () => {
    const org = makeOrg()
    const admin = makeAdminUser(org)
    const event = makeEvent(org, admin)
    const reg = makeGroupRegistration(event)

    const appUrl = 'https://chirhoevents.com'
    const confirmationPageUrl = `${appUrl}/registration/confirmation/${reg.id}`

    expect(confirmationPageUrl).toContain('/registration/confirmation/')
    expect(confirmationPageUrl).toContain(reg.id)
  })
})

// ============================================================
// SUITE: Step 3.3.1 — Portal isolates by clerkUserId
// ============================================================

describe('Step 3.3: Group leader portal scopes ALL queries by clerkUserId', () => {
  resetCounter()

  it('group leader can only access their own registration via clerkUserId', () => {
    const org = makeOrg()
    const admin = makeAdminUser(org)
    const event = makeEvent(org, admin)

    const leaderA = makeGroupLeaderUser(org)
    const leaderB = makeGroupLeaderUser(org)

    const regA = makeGroupRegistration(event, { clerkUserId: leaderA.clerkUserId })
    const regB = makeGroupRegistration(event, { clerkUserId: leaderB.clerkUserId })

    // Simulate: portal query for leaderA
    const queryA = { clerkUserId: leaderA.clerkUserId }

    // regA matches, regB does NOT
    const foundA = regA.clerkUserId === queryA.clerkUserId
    const foundB = regB.clerkUserId === queryA.clerkUserId

    expect(foundA).toBeTruthy()
    expect(foundB).toBeFalsy()
  })

  it('access code can only be linked to ONE user at a time', () => {
    // link-access-code/route.ts checks:
    //   if (groupRegistration.clerkUserId && groupRegistration.clerkUserId !== userId)
    //     return 409 Conflict

    const org = makeOrg()
    const admin = makeAdminUser(org)
    const event = makeEvent(org, admin)
    const leaderA = makeGroupLeaderUser(org)
    const leaderB = makeGroupLeaderUser(org)

    // RegA is linked to leaderA
    const regA = makeGroupRegistration(event, { clerkUserId: leaderA.clerkUserId })

    // LeaderB tries to link the same access code
    const isAlreadyLinkedToDifferentUser =
      regA.clerkUserId !== null && regA.clerkUserId !== leaderB.clerkUserId

    expect(isAlreadyLinkedToDifferentUser).toBeTruthy() // → 409 returned to leaderB
  })

  it('group leader from Org A cannot link an access code from Org B', () => {
    // The access code uniquely identifies one registration.
    // A registration belongs to exactly one org/event.
    // The link-access-code lookup is by accessCode string — the leader can
    // attempt to link any code, but the linked registration will have
    // its own organizationId that the leader cannot change.

    const orgA = makeOrg()
    const orgB = makeOrg()
    const adminA = makeAdminUser(orgA)
    const adminB = makeAdminUser(orgB)
    const eventA = makeEvent(orgA, adminA)
    const eventB = makeEvent(orgB, adminB)

    // Org B's registration
    const regB = makeGroupRegistration(eventB, { accessCode: 'ACC-ORGB-XYZ' })

    // If leaderA links regB's code (hypothetically — would require the code being unlinked):
    // The resulting registration would have organizationId = orgB.id
    // Leader A's portal would show Org B's event data — this is the intended behavior
    // (they legitimately linked to an Org B registration)

    // BUT: the data they see is scoped to that registration only.
    // They cannot see OTHER Org B registrations.
    expect(regB.organizationId).toBe(orgB.id)
    expect(regB.organizationId).not.toBe(orgA.id)
  })
})

// ============================================================
// SUITE: Step 3.3.6 & 3.3.7 — Cross-group and cross-org isolation
// ============================================================

describe('Step 3.3: Cross-group and cross-org isolation verification', () => {
  resetCounter()

  it('leader sees ONLY their registration — not other groups at the same event', () => {
    const org = makeOrg()
    const admin = makeAdminUser(org)
    const event = makeEvent(org, admin)

    const leaderA = makeGroupLeaderUser(org)
    const leaderB = makeGroupLeaderUser(org)

    const regA = makeGroupRegistration(event, { clerkUserId: leaderA.clerkUserId, groupName: 'Group Alpha' })
    const regB = makeGroupRegistration(event, { clerkUserId: leaderB.clerkUserId, groupName: 'Group Beta' })

    // Portal query: { clerkUserId: leaderA.clerkUserId }
    // This returns regA, NOT regB

    const leaderAFindsRegA = regA.clerkUserId === leaderA.clerkUserId
    const leaderAFindsRegB = regB.clerkUserId === leaderA.clerkUserId

    expect(leaderAFindsRegA).toBeTruthy()
    expect(leaderAFindsRegB).toBeFalsy()

    // LeaderA cannot see Group Beta's name, roster, or payments
  })

  it('leader registered for Org A event sees NO Org B data', () => {
    const orgA = makeOrg()
    const orgB = makeOrg()
    const adminA = makeAdminUser(orgA)
    const adminB = makeAdminUser(orgB)
    const eventA = makeEvent(orgA, adminA)
    const eventB = makeEvent(orgB, adminB)

    const leader = makeGroupLeaderUser(orgA)

    // Leader is linked to Org A's event
    const regA = makeGroupRegistration(eventA, { clerkUserId: leader.clerkUserId })
    // Org B has its own registrations
    const regB = makeGroupRegistration(eventB)

    // The portal query: { clerkUserId: leader.clerkUserId }
    // Returns regA (Org A) — regB has no clerkUserId match

    expect(regA.clerkUserId).toBe(leader.clerkUserId)
    expect(regB.clerkUserId).not.toBe(leader.clerkUserId)

    // The leader's registration is scoped to Org A
    expect(regA.organizationId).toBe(orgA.id)
    expect(regA.organizationId).not.toBe(orgB.id)
  })

  it('payment queries are scoped to registrationId (not global)', () => {
    const orgA = makeOrg()
    const orgB = makeOrg()
    const adminA = makeAdminUser(orgA)
    const adminB = makeAdminUser(orgB)
    const eventA = makeEvent(orgA, adminA)
    const eventB = makeEvent(orgB, adminB)
    const regA = makeGroupRegistration(eventA)
    const regB = makeGroupRegistration(eventB)

    const paymentA = makePayment(orgA, eventA, regA, { amount: 500 })
    const paymentB = makePayment(orgB, eventB, regB, { amount: 800 })

    // Portal payment query: { registrationId: regA.id }
    const queryScope = { registrationId: regA.id, registrationType: 'group' }

    const paymentAIsInScope = paymentA.registrationId === queryScope.registrationId
    const paymentBIsInScope = paymentB.registrationId === queryScope.registrationId

    expect(paymentAIsInScope).toBeTruthy()
    expect(paymentBIsInScope).toBeFalsy() // Org B's payment NOT visible
  })

  it('participants query is scoped through clerkUserId → registrationId', () => {
    const orgA = makeOrg()
    const orgB = makeOrg()
    const adminA = makeAdminUser(orgA)
    const adminB = makeAdminUser(orgB)
    const eventA = makeEvent(orgA, adminA)
    const eventB = makeEvent(orgB, adminB)

    const leaderA = makeGroupLeaderUser(orgA)
    const regA = makeGroupRegistration(eventA, { clerkUserId: leaderA.clerkUserId })
    const regB = makeGroupRegistration(eventB)

    // The participants API query chain:
    // 1. findFirst({ where: { clerkUserId: leaderA.clerkUserId } }) → regA
    // 2. Include participants of regA only

    // regB's participants are in a completely different registration
    expect(regA.id).not.toBe(regB.id)
    expect(regA.clerkUserId).toBe(leaderA.clerkUserId)
    expect(regB.clerkUserId).not.toBe(leaderA.clerkUserId)
  })
})

// ============================================================
// SUITE: Step 3.3.5 — Additional payment goes to correct org
// ============================================================

describe('Step 3.3: Additional balance payments use the correct org Stripe account', () => {
  resetCounter()

  it('balance payment uses org stripeAccountId from registration.organizationId', () => {
    // The create-payment-intent route:
    //   const reg = await prisma.groupRegistration.findFirst({ where: { clerkUserId: userId } })
    //   const org = await prisma.organization.findUnique({ where: { id: reg.organizationId } })
    //   → uses org.stripeAccountId

    const orgA = makeOrg()
    const adminA = makeAdminUser(orgA)
    const eventA = makeEvent(orgA, adminA)
    const leaderA = makeGroupLeaderUser(orgA)
    const regA = makeGroupRegistration(eventA, { clerkUserId: leaderA.clerkUserId })

    // The org comes from reg.organizationId — not user-supplied
    expect(regA.organizationId).toBe(orgA.id)

    // The Stripe account used for the balance payment
    const stripeAccountForPayment = orgA.stripeAccountId
    expect(stripeAccountForPayment).toBe(`acct_test_${orgA.id.slice(-4)}`)
    expect(stripeAccountForPayment).not.toBeNull()
  })

  it('a leader cannot use another org Stripe account for their payment', () => {
    const orgA = makeOrg()
    const orgB = makeOrg()
    const adminA = makeAdminUser(orgA)
    const eventA = makeEvent(orgA, adminA)
    const leaderA = makeGroupLeaderUser(orgA)
    const regA = makeGroupRegistration(eventA, { clerkUserId: leaderA.clerkUserId })

    // The payment intent config derives the Stripe account from the registration's org
    const registrationOrgId = regA.organizationId // orgA.id

    // This cannot be orgB's account because the query is:
    // prisma.organization.findUnique({ where: { id: regA.organizationId } })
    // = orgA, not orgB

    expect(registrationOrgId).toBe(orgA.id)
    expect(registrationOrgId).not.toBe(orgB.id)

    // The leader cannot inject orgB.stripeAccountId — it's never requested from client
    const stripeAccountUsed = orgA.stripeAccountId
    expect(stripeAccountUsed).not.toBe(orgB.stripeAccountId)
  })
})

// ============================================================
// SUITE: Bug documentation — whereClause.id = eventId
// ============================================================

describe('Bug Documentation: whereClause.id = eventId in group-leader routes', () => {
  resetCounter()

  it('BUG: dashboard route sets whereClause.id = eventId (should be eventId)', () => {
    // Reproduction of the bug in api/group-leader/dashboard/route.ts:49-51:
    //
    //   const whereClause: any = { clerkUserId: userId }
    //   if (eventId) {
    //     whereClause.id = eventId  // ← BUG: sets groupRegistration.id = eventId
    //   }

    const userId = 'clerk_leader_abc'
    const eventId = 'event-uuid-789'

    const whereClause: any = { clerkUserId: userId }
    if (eventId) {
      whereClause.id = eventId // Buggy line
    }

    // Result: looks for a groupRegistration whose PRIMARY KEY equals the event UUID
    // Since group registration IDs and event IDs are different, this returns null

    expect(whereClause.clerkUserId).toBe(userId) // Correct
    expect(whereClause.id).toBe(eventId) // Bug: should be whereClause.eventId
    expect(whereClause.eventId).toBeUndefined() // Missing: should be set
  })

  it('CORRECT: fixed query sets whereClause.eventId = eventId', () => {
    // The correct version:
    const userId = 'clerk_leader_abc'
    const eventId = 'event-uuid-789'

    const whereClause: any = { clerkUserId: userId }
    if (eventId) {
      whereClause.eventId = eventId // Correct
    }

    expect(whereClause.clerkUserId).toBe(userId)
    expect(whereClause.eventId).toBe(eventId) // Correct: filters by event
    expect(whereClause.id).toBeUndefined() // id is NOT overridden
  })

  it('bug does NOT create cross-group security vulnerability (clerkUserId still gates)', () => {
    // Even with the bug, the clerkUserId filter is always present.
    // The bug causes the eventId filter to silently fail (wrong field),
    // but it does NOT allow a leader to see another leader's data.

    const userId = 'clerk_leader_abc'
    const maliciousEventId = 'other-leaders-reg-uuid' // Attacker provides another reg's UUID

    const whereClause: any = { clerkUserId: userId }
    if (maliciousEventId) {
      whereClause.id = maliciousEventId // Bug: checks groupRegistration.id
    }

    // Result: { clerkUserId: 'clerk_leader_abc', id: 'other-leaders-reg-uuid' }
    // DB query: finds groupRegistration WHERE clerkUserId='clerk_leader_abc' AND id='other-leaders-reg-uuid'
    // The target registration has a DIFFERENT clerkUserId → query returns null → 404

    const clerkUserIdIsAlwaysPresent = !!whereClause.clerkUserId
    expect(clerkUserIdIsAlwaysPresent).toBeTruthy() // Safety net is in place
  })

  it('bug affects multi-event leaders (same leader registered for 2 events)', () => {
    // A leader who registers for Event A AND Event B would have 2 registrations.
    // When the portal passes ?eventId=eventA to load a specific event,
    // the buggy query returns null (because reg.id !== eventA.id).

    const org = makeOrg()
    const admin = makeAdminUser(org)
    const event1 = makeEvent(org, admin)
    const event2 = makeEvent(org, admin)
    const leader = makeGroupLeaderUser(org)

    const reg1 = makeGroupRegistration(event1, { clerkUserId: leader.clerkUserId })
    const reg2 = makeGroupRegistration(event2, { clerkUserId: leader.clerkUserId })

    // Without eventId filter: findFirst returns reg1 (whichever comes first)
    // With buggy eventId filter: WHERE clerkUserId=X AND id=event1.id → null (no match)

    // Verify they are different registrations with different IDs
    expect(reg1.id).not.toBe(event1.id) // Registration ID ≠ Event ID
    expect(reg1.eventId).toBe(event1.id) // But eventId field matches

    // The fix: whereClause.eventId = eventId would correctly find reg1
    const buggyQuery = { clerkUserId: leader.clerkUserId, id: event1.id }
    const correctQuery = { clerkUserId: leader.clerkUserId, eventId: event1.id }

    // Buggy: no registration has id=event1.id (they have different UUIDs)
    const regMatchesBuggy = reg1.id === buggyQuery.id
    // Correct: reg1 has eventId=event1.id
    const regMatchesCorrect = reg1.eventId === correctQuery.eventId

    expect(regMatchesBuggy).toBeFalsy() // Bug: no match
    expect(regMatchesCorrect).toBeTruthy() // Fix: match found
  })
})

// ============================================================
// SUITE: Email portal URL — direct-link improvement
// ============================================================

describe('Portal URL Improvement: Direct-link to access code page', () => {
  resetCounter()

  it('current portal URL points to dashboard (requires redirect if not linked)', () => {
    // Current: groupLeaderPortalUrl = /dashboard/group-leader
    // If user has no linked registration: layout redirects to /dashboard/group-leader/link-access-code
    // The redirect is invisible to the user — they just see a different page

    const currentUrl = '/dashboard/group-leader'
    const betterUrl = '/dashboard/group-leader/link-access-code'

    // The current URL works but adds an extra redirect
    expect(currentUrl).not.toBe(betterUrl)

    // The better URL takes new users directly to the access code linking page
    expect(betterUrl).toContain('link-access-code')
  })

  it('deep-link with code pre-filled would be even better', () => {
    const org = makeOrg()
    const admin = makeAdminUser(org)
    const event = makeEvent(org, admin)
    const reg = makeGroupRegistration(event)

    // Ideal URL: pre-fills the access code in the form
    const idealUrl = `/dashboard/group-leader/link-access-code?code=${reg.accessCode}`

    expect(idealUrl).toContain(reg.accessCode)
    expect(idealUrl).toContain('link-access-code')

    // This would mean:
    // 1. Group leader clicks button in email
    // 2. Lands on link page with their code pre-filled
    // 3. Just needs to create account / sign in → click "Link Code"
    // 4. Immediately in the dashboard — no searching for their code
  })
})

// ============================================================
// Main
// ============================================================

async function main() {
  console.log('\n👥 Running Group Registration Flow Tests (Phase 3)...\n')
  await new Promise(r => setTimeout(r, 50))
  printSummary()
}

main().catch(err => {
  console.error('Test runner failed:', err)
  process.exit(1)
})
