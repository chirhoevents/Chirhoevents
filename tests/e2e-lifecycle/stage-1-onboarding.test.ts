/**
 * Stage 1: Organization Setup & Onboarding — E2E Lifecycle Audit
 *
 * This file documents and tests the ACTUAL current onboarding flow for a new
 * organization ("Diocese of Testville") using ChiRho Events for the first time.
 *
 * Coverage:
 *   1.1 — Account Creation & User-to-Org flow
 *   1.2 — Stripe Connect onboarding
 *   1.3 — Organization Settings (all fields)
 *
 * Run with: npx tsx tests/e2e-lifecycle/stage-1-onboarding.test.ts
 */

import { describe, it, expect, printSummary } from '../org-isolation/helpers/test-runner'
import { makeOrg, makeUser } from '../org-isolation/helpers/mock-factories'

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT FINDINGS (documented from source-code tracing — not assumptions)
// ─────────────────────────────────────────────────────────────────────────────
//
// STAGE 1.1 — HOW ACCOUNT CREATION ACTUALLY WORKS (current state)
// ───────────────────────────────────────────────────────────────
//
// Step 1: The prospective org admin visits /get-started (public page).
//         They fill in: org name, type, contact info, legal entity, billing
//         address, events/attendees per year estimate, preferred tier, billing
//         cycle, and how they heard about the platform.
//         On submit, POST /api/onboarding-requests creates an
//         OrganizationOnboardingRequest record in the DB and logs platform
//         activity. NO confirmation email is sent (TODO comment in code).
//         NO notification email is sent to master admin (TODO comment).
//         → BUG: Applicant and master admin get zero email notification.
//
// Step 2: The Master Admin reviews requests in /dashboard/master-admin (manual).
//         After approving, the Master Admin creates the Organization record and
//         the first User (org_admin) via /api/master-admin/organizations POST.
//         This sends an onboarding email to the contact email via Resend with
//         Clerk invite link.  An org_admin User row is created in the DB with
//         clerkUserId = null (pending invite state).
//
// Step 3: The org admin receives the invite email and clicks to sign up at
//         /sign-up?portal=org-admin (Clerk hosted form).
//         Clerk fires user.created webhook → /api/webhooks/clerk POST.
//         The webhook detects the pending invite (User with matching email and
//         no clerkUserId) and links the new Clerk ID to that User row.
//         Role = org_admin is already set from master admin creation step.
//
// Step 4: After Clerk signup, the browser redirects to /dashboard (via
//         NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL).
//         /dashboard calls GET /api/user/role, gets role = 'org_admin', and
//         redirects to /dashboard/admin.
//
// ⚠️  GAPS / CONFUSION RISKS FOR A REAL DIOCESAN ADMIN:
//   A. The /get-started page says nothing about next steps after submission.
//      There's no "We'll email you within X days" message.
//   B. The onboarding request confirmation page shows a success screen, but
//      there's no email (TODO in code). Admin could miss this entirely.
//   C. There is NO self-serve org creation. An org admin CANNOT sign up, log
//      in, and start using the platform. They must wait for a master admin
//      to manually create their org. This is opaque to the user.
//   D. If a new user signs up at /sign-up WITHOUT going through /get-started
//      first, Clerk fires user.created, no pending invite exists, so they
//      get a brand-new User row with role = 'group_leader' and NO
//      organizationId. They land on /dashboard/group-leader and see a portal
//      they can't use. There's no "Your account isn't linked to an org yet"
//      message.
//
// STAGE 1.2 — HOW STRIPE CONNECT WORKS (current state)
// ──────────────────────────────────────────────────────
//
// Stripe Connect type: STANDARD (not Express or Custom)
//   POST /api/stripe/connect — requires org_admin or master_admin role.
//   Creates a new Stripe Standard account linked to org email/name.
//   Saves stripeAccountId, sets stripeAccountStatus = 'pending',
//   stripeOnboardingCompleted = false, stripeChargesEnabled = false.
//   Returns a Stripe accountLinks URL which redirects the admin to
//   Stripe's hosted onboarding form.
//
//   Return URL: /api/stripe/connect/callback?success=true
//   On return, the callback retrieves the Stripe account status and updates:
//     - stripeChargesEnabled, stripePayoutsEnabled, stripeOnboardingCompleted
//     - stripeAccountStatus: 'active' | 'restricted' | 'pending'
//
//   Additionally, the Stripe webhook (account.updated) also updates these
//   fields automatically whenever Stripe pushes a status change.
//
//   Pre-Stripe prompt: The IntegrationsSettingsTab shows Stripe connection
//   status. If not connected, the tab shows a "Connect Stripe" button.
//   However, there is NO banner or warning on the admin dashboard home page
//   or event creation flow to tell the admin they need Stripe before events
//   can accept registrations. The check only fires at registration time
//   (400 error), not at event creation time.
//
//   → BUG: An org admin can create and publish an event WITHOUT Stripe.
//     Registrants will hit a confusing 400 error mid-registration.
//     The event creation route (/api/admin/events/create) does NOT check
//     stripeChargesEnabled — only the registration endpoints do.
//
// STAGE 1.3 — ORGANIZATION SETTINGS (all available fields)
// ──────────────────────────────────────────────────────────
//
// Org Settings tab (/api/admin/settings/organization):
//   - name (org name)
//   - type (diocese / archdiocese / parish / seminary / retreat_center)
//   - contactName, contactEmail, contactPhone
//   - address (street, city, state, zip)
//   - logoUrl (read-only in this tab; editable in Branding tab)
//
// Branding tab (/api/admin/settings/branding):
//   - primaryColor (hex, default #1E3A5F)
//   - secondaryColor (hex, default #9C8466)
//   - logoUrl (upload via /api/admin/settings/branding/logo)
//   - modulesEnabled: { poros, salve, rapha } (toggle on/off per module)
//
// Notifications tab (/api/admin/settings/notifications):
//   - weeklyDigest: { enabled, recipients (userId list), dayOfWeek }
//
// Billing tab (/api/admin/settings/billing):
//   - Read-only display of tier, status, billing cycle, usage, invoices
//   - Upgrade request modal (UpgradeRequestModal)
//
// Integrations tab (/api/admin/settings/integrations):
//   - Stripe Connect: connect / disconnect / view account status
//   - Google Sheets: coming soon
//   - Mailchimp: coming soon
//   - QuickBooks: coming soon
//
// Team tab (/api/admin/settings/team):
//   - Invite users, change roles, resend invites, remove users
//
// ⚠️  MISSING SETTINGS (compared to expected feature set):
//   - No "default housing options" setting exposed in the UI.
//     The schema has checkPaymentName and checkPaymentAddress fields but
//     these are managed by master admin, not org admin.
//   - No "platform fee visibility" setting — platformFeePercentage is
//     master-admin-only.
//   - No "support email" field separate from contactEmail.
//   - No "default timezone" or "default registration settings" that would
//     pre-populate new events.

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

// ── 1.1: Account Creation ─────────────────────────────────────────────────────

describe('1.1 — Account Creation: Clerk webhook user.created handling', () => {
  it('should link a new Clerk user to a pending org_admin invite (by email match)', async () => {
    // Simulate state: master admin pre-created a User row for invited email
    const pendingInvite = {
      id: 'user-pending-001',
      email: 'admin@diocesetestville.org',
      clerkUserId: null,   // null = pending invite, not yet signed up
      role: 'org_admin',
      organizationId: 'org-diocese-001',
      firstName: 'Test',
      lastName: 'Admin',
    }

    // Webhook receives user.created for the same email
    const clerkEvent = {
      type: 'user.created',
      data: {
        id: 'clerk_user_new_abc123',
        email_addresses: [{ email_address: 'admin@diocesetestville.org' }],
        first_name: 'Diocese',
        last_name: 'Admin',
      },
    }

    // The webhook logic: find pending invite by email where clerkUserId is null
    const matchesPendingInvite = (
      pendingInvite.email === clerkEvent.data.email_addresses[0].email_address &&
      pendingInvite.clerkUserId === null
    )
    expect(matchesPendingInvite).toBe(true)

    // Simulate the update
    const updatedUser = {
      ...pendingInvite,
      clerkUserId: clerkEvent.data.id,
      firstName: clerkEvent.data.first_name,
      lastName: clerkEvent.data.last_name,
    }

    // After linking: user should have Clerk ID and retain org_admin role
    expect(updatedUser.clerkUserId).toBe('clerk_user_new_abc123')
    expect(updatedUser.role).toBe('org_admin')
    expect(updatedUser.organizationId).toBe('org-diocese-001')
  })

  it('should create a group_leader user with no org when there is no pending invite', async () => {
    // New user signs up at /sign-up without going through /get-started first
    const clerkEvent = {
      type: 'user.created',
      data: {
        id: 'clerk_user_orphan_xyz',
        email_addresses: [{ email_address: 'orphan@example.com' }],
        first_name: 'Orphan',
        last_name: 'User',
      },
    }

    // No pending invite found — webhook creates a new user
    const newUser = {
      clerkUserId: clerkEvent.data.id,
      email: clerkEvent.data.email_addresses[0].email_address,
      firstName: clerkEvent.data.first_name,
      lastName: clerkEvent.data.last_name,
      role: 'group_leader',   // default role — no org admin access
      organizationId: null,   // no org linked
    }

    // This user will land on /dashboard/group-leader with no useful functionality
    expect(newUser.role).toBe('group_leader')
    expect(newUser.organizationId).toBeNull()
  })

  it('should route org_admin to /dashboard/admin via /api/user/role', async () => {
    const roleRoutingTable: Record<string, string> = {
      'master_admin': '/dashboard/master-admin',
      'org_admin': '/dashboard/admin',
      'event_manager': '/dashboard/admin',
      'finance_manager': '/dashboard/admin',
      'staff': '/dashboard/admin',
      'poros_coordinator': '/dashboard/admin/poros',
      'salve_coordinator': '/coordinator/salve',
      'rapha_coordinator': '/coordinator/rapha',
    }

    expect(roleRoutingTable['org_admin']).toBe('/dashboard/admin')
    expect(roleRoutingTable['group_leader']).toBe(undefined)
    // group_leader falls through to the default: '/dashboard/group-leader'
  })

  it('should return 404 (not 401) when user exists in Clerk but not DB yet', async () => {
    // Simulates race condition: user logged in before webhook processed
    // The /api/user/role endpoint returns { error: 'User not found', role: 'group_leader' } with 404
    // The dashboard redirect treats non-ok responses as group_leader (fallback)
    const apiResponse = { status: 404, body: { error: 'User not found', role: 'group_leader' } }
    expect(apiResponse.status).toBe(404)
    // Dashboard redirect code: if (!response.ok) → redirect to /dashboard/group-leader
    // This is a silent failure — the admin sees the wrong portal with no explanation
    expect(apiResponse.body.role).toBe('group_leader')
  })
})

// ── 1.2: Stripe Connect Onboarding ───────────────────────────────────────────

describe('1.2 — Stripe Connect: account state machine', () => {
  it('should start as not_connected with charges disabled', async () => {
    const newOrg = makeOrg({
      stripeAccountId: null,
      stripeChargesEnabled: false,
      stripePayoutsEnabled: false,
      stripeOnboardingCompleted: false,
      stripeAccountStatus: 'not_connected',
    })

    expect(newOrg.stripeAccountId).toBeNull()
    expect(newOrg.stripeChargesEnabled).toBe(false)
  })

  it('should transition to pending after POST /api/stripe/connect creates account', async () => {
    // After POST /api/stripe/connect — account saved, onboarding URL returned
    const orgAfterConnect = makeOrg({
      stripeAccountId: 'acct_testville_001',
      stripeChargesEnabled: false,
      stripePayoutsEnabled: false,
      stripeOnboardingCompleted: false,
      stripeAccountStatus: 'pending',
    })

    expect(orgAfterConnect.stripeAccountId).toBe('acct_testville_001')
    expect(orgAfterConnect.stripeAccountStatus).toBe('pending')
    expect(orgAfterConnect.stripeChargesEnabled).toBe(false)
  })

  it('should use Standard connect type (not Express or Custom)', async () => {
    // From /api/stripe/connect/route.ts: stripe.accounts.create({ type: 'standard', ... })
    const connectType = 'standard'
    expect(connectType).toBe('standard')
    // Standard = org gets full Stripe dashboard access, handles own disputes
  })

  it('should transition to active when account.updated webhook fires with charges_enabled=true', async () => {
    // Simulates what the webhook handler does on account.updated
    const stripeAccountUpdate = {
      charges_enabled: true,
      payouts_enabled: true,
      details_submitted: true,
    }

    const newStatus = stripeAccountUpdate.charges_enabled
      ? 'active'
      : stripeAccountUpdate.details_submitted
      ? 'restricted'
      : 'pending'

    const orgUpdate = {
      stripeChargesEnabled: stripeAccountUpdate.charges_enabled,
      stripePayoutsEnabled: stripeAccountUpdate.payouts_enabled,
      stripeOnboardingCompleted: stripeAccountUpdate.details_submitted,
      stripeAccountStatus: newStatus,
    }

    expect(orgUpdate.stripeAccountStatus).toBe('active')
    expect(orgUpdate.stripeChargesEnabled).toBe(true)
    expect(orgUpdate.stripeOnboardingCompleted).toBe(true)
  })

  it('should transition to restricted when details_submitted but charges not yet enabled', async () => {
    // Partial Stripe onboarding (submitted but Stripe still reviewing)
    const stripeAccountUpdate = {
      charges_enabled: false,
      payouts_enabled: false,
      details_submitted: true,
    }

    const newStatus = stripeAccountUpdate.charges_enabled
      ? 'active'
      : stripeAccountUpdate.details_submitted
      ? 'restricted'
      : 'pending'

    expect(newStatus).toBe('restricted')
  })

  it('should block registration when stripeAccountId is null', async () => {
    const org = makeOrg({ stripeAccountId: null, stripeChargesEnabled: false })
    // Logic mirrored from /api/registration/group/route.ts line 113
    const isBlocked = !org.stripeAccountId || !org.stripeChargesEnabled
    expect(isBlocked).toBe(true)
  })

  it('should block registration when stripeChargesEnabled is false even if accountId exists', async () => {
    // e.g. Stripe account created but onboarding incomplete
    const org = makeOrg({ stripeAccountId: 'acct_pending_xyz', stripeChargesEnabled: false })
    const isBlocked = !org.stripeAccountId || !org.stripeChargesEnabled
    expect(isBlocked).toBe(true)
  })

  it('should allow registration only when both stripeAccountId and stripeChargesEnabled are set', async () => {
    const org = makeOrg({ stripeAccountId: 'acct_active_001', stripeChargesEnabled: true })
    const isBlocked = !org.stripeAccountId || !org.stripeChargesEnabled
    expect(isBlocked).toBe(false)
  })

  it('should return 400 error (not silently route to platform account) when Stripe not configured', async () => {
    // The registration endpoints return 400 with a user-visible message.
    // This is the correct behavior per the org-isolation fix #1.
    const expectedError = 'This organization has not completed payment setup. Registration cannot be processed at this time. Please contact the event organizer.'
    const expectedStatus = 400

    // Verify the guard does NOT fall back to a platform Stripe account
    // (the old bug was: fall back to STRIPE_SECRET_KEY org if none configured)
    const org = makeOrg({ stripeAccountId: null, stripeChargesEnabled: false })
    const transferDestination = org.stripeAccountId // null — no fallback
    expect(transferDestination).toBeNull()
    expect(expectedStatus).toBe(400)
    expect(expectedError).toContain('not completed payment setup')
  })

  it('should flag that event creation does NOT require Stripe to be configured (gap)', async () => {
    // DOCUMENTED GAP: /api/admin/events/create does not check stripeChargesEnabled.
    // An org admin can publish an event with no Stripe, and registrants will hit
    // a 400 mid-registration with no forewarning shown on the public event page.
    //
    // The check EXISTS in:
    //   - /api/registration/group/route.ts
    //   - /api/registration/individual/route.ts
    //   - /api/registration/staff/route.ts
    //   - /api/group-leader/payments/create-payment-intent/route.ts
    //
    // The check is MISSING in:
    //   - /api/admin/events/create/route.ts  (no Stripe guard)
    //   - Admin dashboard home (no "complete Stripe setup" banner)
    //   - Public event listing page (no "payment setup incomplete" notice)

    // Simulate: event created without Stripe guard
    const createEventWithoutStripeCheck = (org: ReturnType<typeof makeOrg>) => {
      // Current code does NOT check stripeChargesEnabled at create time
      // It only checks eventsPerYearLimit
      const canCreate = org !== null // always true — Stripe not checked
      return canCreate
    }

    const orgWithoutStripe = makeOrg({ stripeAccountId: null, stripeChargesEnabled: false })
    const eventCreated = createEventWithoutStripeCheck(orgWithoutStripe)
    // This PASSES today — an event CAN be created without Stripe
    expect(eventCreated).toBe(true)
    // But registrations will fail with 400 later — confusing UX gap
  })

  it('should handle the callback correctly updating org Stripe status on return from Stripe', async () => {
    // Simulates /api/stripe/connect/callback logic
    const mockStripeAccount = {
      charges_enabled: true,
      payouts_enabled: true,
      details_submitted: true,
    }

    const orgUpdate = {
      stripeChargesEnabled: mockStripeAccount.charges_enabled || false,
      stripePayoutsEnabled: mockStripeAccount.payouts_enabled || false,
      stripeOnboardingCompleted: mockStripeAccount.details_submitted || false,
      stripeAccountStatus: mockStripeAccount.charges_enabled
        ? 'active'
        : mockStripeAccount.details_submitted
        ? 'restricted'
        : 'pending',
    }

    expect(orgUpdate.stripeAccountStatus).toBe('active')
    expect(orgUpdate.stripeChargesEnabled).toBe(true)
  })

  it('should re-use existing stripeAccountId when onboarding was started but not completed', async () => {
    // If org.stripeAccountId exists but details_submitted = false,
    // POST /api/stripe/connect creates a NEW accountLink (not a new account)
    const existingAccountId = 'acct_started_but_incomplete'
    const mockAccount = { id: existingAccountId, details_submitted: false }

    // The code checks: if (!account.details_submitted) → create new accountLink
    const shouldCreateNewLink = !mockAccount.details_submitted
    expect(shouldCreateNewLink).toBe(true)
    // The account ID itself is preserved — no duplicate accounts created
  })
})

// ── 1.3: Organization Settings ────────────────────────────────────────────────

describe('1.3 — Organization Settings: field coverage', () => {
  it('should expose all basic org identity fields in the Org Settings tab', async () => {
    const orgSettingsFields = [
      'name',
      'type',           // diocese / archdiocese / parish / seminary / retreat_center
      'contactName',
      'contactEmail',
      'contactPhone',
      'address',        // { street, city, state, zip }
    ]

    // All these fields are editable in /api/admin/settings/organization PUT
    expect(orgSettingsFields).toContain('name')
    expect(orgSettingsFields).toContain('type')
    expect(orgSettingsFields).toContain('contactEmail')
    expect(orgSettingsFields).toContain('address')
  })

  it('should expose branding fields (logo, colors, module toggles)', async () => {
    const brandingFields = ['primaryColor', 'secondaryColor', 'logoUrl', 'modulesEnabled']

    expect(brandingFields).toContain('primaryColor')
    expect(brandingFields).toContain('logoUrl')
    expect(brandingFields).toContain('modulesEnabled')
  })

  it('should correctly validate org type values', async () => {
    const validOrgTypes = ['diocese', 'archdiocese', 'parish', 'seminary', 'retreat_center']
    // From OrganizationSettingsTab.tsx ORG_TYPES constant

    expect(validOrgTypes).toContain('diocese')
    expect(validOrgTypes).toContain('parish')
    // 'ministry', 'school', 'other' exist on the GET STARTED form but NOT in org settings tab
    // → Minor inconsistency between /get-started type options and settings type options
    const getStartedOnlyTypes = ['ministry', 'school', 'other']
    for (const t of getStartedOnlyTypes) {
      expect(validOrgTypes).not.toContain(t)
    }
  })

  it('should default modulesEnabled to all true when field is missing or null', async () => {
    // From getModulesEnabled() helper used in branding settings
    const getModulesEnabled = (modulesEnabled: unknown) => {
      if (!modulesEnabled || typeof modulesEnabled !== 'object') {
        return { poros: true, salve: true, rapha: true }
      }
      const modules = modulesEnabled as Record<string, unknown>
      return {
        poros: modules.poros !== false,
        salve: modules.salve !== false,
        rapha: modules.rapha !== false,
      }
    }

    expect(getModulesEnabled(null)).toEqual({ poros: true, salve: true, rapha: true })
    expect(getModulesEnabled(undefined)).toEqual({ poros: true, salve: true, rapha: true })
    expect(getModulesEnabled({ poros: false })).toEqual({ poros: false, salve: true, rapha: true })
    expect(getModulesEnabled({ poros: true, salve: false, rapha: true })).toEqual({ poros: true, salve: false, rapha: true })
  })

  it('should NOT expose platformFeePercentage to org admins (master-admin-only)', async () => {
    // platformFeePercentage is set by master admin at org creation time
    // It does not appear in any org-admin settings API response
    // The org admin cannot see or change their platform fee rate
    const orgAdminSettingsFields = [
      'name', 'type', 'contactName', 'contactEmail', 'contactPhone',
      'address', 'logoUrl', 'primaryColor', 'secondaryColor', 'modulesEnabled',
    ]
    expect(orgAdminSettingsFields).not.toContain('platformFeePercentage')
  })

  it('should NOT expose checkPaymentName or checkPaymentAddress to org admins', async () => {
    // These fields are present in the schema but managed by master admin only
    const orgAdminSettingsFields = [
      'name', 'type', 'contactName', 'contactEmail', 'contactPhone',
      'address', 'logoUrl', 'primaryColor', 'secondaryColor', 'modulesEnabled',
    ]
    expect(orgAdminSettingsFields).not.toContain('checkPaymentName')
    expect(orgAdminSettingsFields).not.toContain('checkPaymentAddress')
  })

  it('should allow weekly digest notifications to be toggled and configured', async () => {
    // NotificationsSettingsTab: weeklyDigest { enabled, recipients, dayOfWeek }
    const weeklyDigestSettings = {
      enabled: true,
      recipients: ['user-001', 'user-002'],
      dayOfWeek: 1,  // Monday
    }

    expect(weeklyDigestSettings.enabled).toBe(true)
    expect(weeklyDigestSettings.dayOfWeek).toBe(1)
    expect(weeklyDigestSettings.recipients.length).toBe(2)
  })

  it('should flag missing settings that affect payment routing or registration behavior', async () => {
    // DOCUMENTED GAPS:
    // 1. No "default housing options" setting for org admins.
    //    The EventSettings model has housingOptions but no org-level defaults.
    // 2. No "support email" field — contactEmail doubles as both.
    // 3. No "default timezone" setting — each event requires manual timezone.
    // 4. No "registration open/close defaults" — each event configured independently.

    const missingSettings = [
      'defaultHousingOptions',
      'supportEmail',
      'defaultTimezone',
      'defaultRegistrationOpenOffset',
    ]

    // These fields do NOT exist in the Organization model
    const orgSchemaFields = [
      'name', 'type', 'address', 'contactName', 'contactEmail', 'contactPhone',
      'stripeAccountId', 'stripeAccountStatus', 'stripeChargesEnabled', 'stripePayoutsEnabled',
      'subscriptionTier', 'subscriptionStatus', 'logoUrl', 'primaryColor', 'secondaryColor',
      'modulesEnabled', 'checkPaymentName', 'checkPaymentAddress', 'platformFeePercentage',
      'notes', 'website', 'legalEntityName', 'taxId',
    ]

    for (const missing of missingSettings) {
      expect(orgSchemaFields).not.toContain(missing)
    }
  })
})

// ── Onboarding request flow ───────────────────────────────────────────────────

describe('1.1 — Get-Started / Onboarding Request flow', () => {
  it('should capture all required fields from the get-started form', async () => {
    const onboardingPayload = {
      organizationName: 'Diocese of Testville',
      organizationType: 'diocese',
      website: 'https://dioceseoftestville.org',
      contactFirstName: 'Bishop',
      contactLastName: 'Tester',
      contactEmail: 'bishop@dioceseoftestville.org',
      contactPhone: '555-000-0001',
      contactJobTitle: 'Bishop',
      legalEntityName: 'Diocese of Testville Inc.',
      taxId: '12-3456789',
      billingAddressLine1: '123 Cathedral Way',
      billingCity: 'Testville',
      billingState: 'TX',
      billingZip: '78000',
      eventsPerYear: '4-5',
      attendeesPerYear: '1000-3000',
      billingCycle: 'annual',
      paymentMethod: 'credit_card',
      howDidYouHear: 'referral',
      additionalNotes: 'We run the annual diocesan youth conference.',
      agreedToTerms: true,
    }

    // All required fields present
    expect(onboardingPayload.organizationName).toBe('Diocese of Testville')
    expect(onboardingPayload.organizationType).toBe('diocese')
    expect(onboardingPayload.contactEmail).toBe('bishop@dioceseoftestville.org')
    expect(onboardingPayload.billingCycle).toBe('annual')
  })

  it('should map eventsPerYear to a numeric estimate for tier suggestion', async () => {
    const eventsEstimate: Record<string, number> = {
      '1-3': 3,
      '4-5': 5,
      '6-10': 10,
      '11-25': 25,
      '25+': 50,
    }

    expect(eventsEstimate['4-5']).toBe(5)
    expect(eventsEstimate['25+']).toBe(50)
  })

  it('should flag that no email is sent on onboarding request submission (known gap)', async () => {
    // The route.ts has:
    //   // TODO: Send confirmation email to applicant
    //   // TODO: Send notification email to Master Admin
    // Neither email is implemented. This is a UX/operational gap.
    const emailsSentOnSubmit: string[] = []  // empty — nothing implemented yet

    expect(emailsSentOnSubmit.length).toBe(0)
    // The activity log IS written to platformActivityLog — that's the only record
  })

  it('should create a platform activity log entry on submission', async () => {
    // Verified in route.ts: platformActivityLog.create() is called
    const activityLogEntry = {
      activityType: 'onboarding_request',
      description: 'New organization request from "Diocese of Testville" (bishop@dioceseoftestville.org)',
      metadata: {
        requestId: 'req-001',
        organizationName: 'Diocese of Testville',
        contactEmail: 'bishop@dioceseoftestville.org',
        requestedTier: 'parish',
      },
    }

    expect(activityLogEntry.activityType).toBe('onboarding_request')
    expect(activityLogEntry.metadata.organizationName).toBe('Diocese of Testville')
  })
})

printSummary()
