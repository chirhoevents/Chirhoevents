/**
 * Org Admin Onboarding Email Template
 *
 * Sent when an organization is approved or created, and whenever a master
 * admin resends onboarding. It has to work on its own for self-serve plans
 * (Chapel/Parish get no onboarding call), so every step says exactly where to
 * click and links to the matching section of the help docs.
 */

import { getTier, resolveModuleAccess } from '@/lib/subscription-tiers'

/**
 * Where onboarding questions go: shown in the email and used as its reply-to,
 * so new org admins reach the ChiRho team directly.
 */
export const ONBOARDING_SUPPORT_EMAIL = 'chirhoevents@gmail.com'

/** How the org's setup / basic access fee is handled in this email. */
export type OnboardingBilling =
  // A secure link to pay the fee online; the subscription starts after payment
  | { mode: 'online'; amount: number; label: string; payUrl: string }
  // The ChiRho team invoices this org by hand (e.g. an annual check)
  | { mode: 'manual'; note?: string | null }

export interface OrgAdminOnboardingEmailProps {
  orgName: string
  orgAdminFirstName: string
  orgAdminEmail: string
  inviteLink: string
  organizationId: string
  /** The admin already created their login, so step 1 becomes "sign in". */
  hasAccount?: boolean
  tierKey?: string | null
  billingCycle?: string | null
  /** What the org pays each billing cycle (per month, or per year if annual). */
  planPrice?: number | null
  modulesEnabled?: unknown
  /** Plain-text note from the ChiRho team, shown above the checklist. */
  personalMessage?: string | null
  personalMessageFrom?: string | null
  billing?: OnboardingBilling | null
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatMoney(amount: number): string {
  return Number.isInteger(amount)
    ? `$${amount.toLocaleString('en-US')}`
    : `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function generateOrgAdminOnboardingEmail({
  orgName,
  orgAdminFirstName,
  orgAdminEmail,
  inviteLink,
  hasAccount = false,
  tierKey,
  billingCycle,
  planPrice,
  modulesEnabled,
  personalMessage,
  personalMessageFrom,
  billing,
}: OrgAdminOnboardingEmailProps): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'
  const org = escapeHtml(orgName)
  const firstName = escapeHtml(orgAdminFirstName)
  const adminEmail = escapeHtml(orgAdminEmail)
  const tier = tierKey ? getTier(tierKey) : undefined
  const modules = tier ? resolveModuleAccess(modulesEnabled, tier.key) : null
  const cycleUnit = billingCycle === 'annual' ? 'year' : 'month'

  const docsUrl = (section: string) => `${appUrl}/docs?section=${section}`
  const docLink = (section: string, title: string) =>
    `<a href="${docsUrl(section)}" style="color: #9C8466; font-weight: 600;">${title}</a>`
  const guides = (links: [string, string][]) =>
    `<p style="margin: 10px 0 0 0; font-size: 14px; color: #555;"><strong style="color: #1E3A5F;">Step-by-step guide${links.length > 1 ? 's' : ''}:</strong> ${links
      .map(([section, title]) => docLink(section, title))
      .join(' &middot; ')}</p>`
  const where = (text: string) =>
    `<span style="background: #F5F1E8; color: #1E3A5F; padding: 1px 6px; border-radius: 4px; font-weight: 600; white-space: nowrap;">${text}</span>`
  const button = (href: string, label: string, background = '#1E3A5F') =>
    `<a href="${href}" style="display: inline-block; background: ${background}; color: #ffffff; padding: 13px 26px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">${label}</a>`

  let stepNumber = 0
  const step = (title: string, body: string) => {
    stepNumber++
    return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 28px 0;">
      <tr>
        <td width="44" valign="top">
          <div style="width: 32px; height: 32px; line-height: 32px; border-radius: 16px; background: #1E3A5F; color: #ffffff; text-align: center; font-weight: bold; font-size: 15px;">${stepNumber}</div>
        </td>
        <td valign="top">
          <h3 style="margin: 4px 0 8px 0; color: #1E3A5F; font-size: 18px;">${title}</h3>
          ${body}
        </td>
      </tr>
    </table>`
  }

  // ---- Personal note -------------------------------------------------------
  const note = personalMessage?.trim()
  const personalNoteHtml = note
    ? `
    <div style="background: #F5F1E8; border-left: 4px solid #9C8466; padding: 16px 18px; margin: 24px 0; border-radius: 4px;">
      <p style="margin: 0 0 8px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #9C8466; font-weight: bold;">A note from ${escapeHtml(personalMessageFrom?.trim() || 'the ChiRho Events team')}</p>
      <p style="margin: 0; color: #1E3A5F;">${escapeHtml(note).replace(/\r?\n/g, '<br>')}</p>
    </div>`
    : ''

  // ---- Plan at a glance ----------------------------------------------------
  const planRow = (label: string, value: string) => `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #E5E7EB; color: #666; width: 48%;">${label}</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #E5E7EB; color: #1E3A5F; font-weight: 600;">${value}</td>
        </tr>`
  const included = (on: boolean) =>
    on ? 'Included' : '<span style="color: #999; font-weight: normal;">Not included</span>'
  const supportLabel = !tier
    ? 'Email support'
    : tier.isSelfServe
      ? 'Self-serve: help docs + email support'
      : tier.includesSetupCall
        ? 'Email support + a 1-hour onboarding call'
        : 'Email support'
  const planHtml = tier
    ? `
    <div style="margin: 30px 0;">
      <h2 style="color: #1E3A5F; margin: 0 0 10px 0; font-size: 20px;">Your plan at a glance</h2>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 15px;">
        ${planRow('Plan', `${tier.name}${planPrice ? ` &mdash; ${formatMoney(planPrice)}/${cycleUnit}` : ''}`)}
        ${planRow('Events per year', tier.eventsPerYear === null ? 'Unlimited' : String(tier.eventsPerYear))}
        ${planRow('People registered per year', tier.maxPeoplePerYear === null ? 'Unlimited' : `Up to ${tier.maxPeoplePerYear.toLocaleString('en-US')}`)}
        ${planRow('File storage', `${tier.storageGb} GB`)}
        ${modules ? planRow('Poros housing &amp; room assignments', included(modules.poros)) : ''}
        ${modules ? planRow('SALVE check-in &amp; name tags', included(modules.salve)) : ''}
        ${modules ? planRow('Rapha medical &amp; incident tracking', included(modules.rapha)) : ''}
        ${planRow('Support', supportLabel)}
      </table>
    </div>`
    : ''

  // ---- Checklist -----------------------------------------------------------
  const loginStep = hasAccount
    ? step(
        'Sign in to your dashboard',
        `<p style="margin: 0 0 14px 0;">You've already created your login, so just sign in with <strong>${adminEmail}</strong> to reach your admin dashboard.</p>
        <div>${button(`${appUrl}/sign-in`, 'Sign In')}</div>`
      )
    : step(
        'Create your login',
        `<p style="margin: 0 0 14px 0;">Click the button below to create your password. This link is just for you &mdash; it connects your new login to <strong>${org}</strong> as its administrator. We recommend signing up with <strong>${adminEmail}</strong>, the address this email was sent to.</p>
        <div>${button(inviteLink, 'Create My Login')}</div>
        <p style="margin: 10px 0 0 0; font-size: 13px; color: #666;">Button not working? Copy and paste this link into your browser:<br><a href="${inviteLink}" style="color: #9C8466; word-break: break-all;">${inviteLink}</a></p>
        <p style="margin: 10px 0 0 0; font-size: 14px; color: #555;">After this, you can always sign in at <a href="${appUrl}/sign-in" style="color: #9C8466;">${appUrl.replace(/^https?:\/\//, '')}/sign-in</a>.</p>`
      )

  let billingStep = ''
  if (billing?.mode === 'online') {
    billingStep = step(
      `Pay your ${escapeHtml(billing.label)}`,
      `<p style="margin: 0 0 14px 0;">Your one-time ${escapeHtml(billing.label.toLowerCase())} is <strong>${formatMoney(billing.amount)}</strong>. Pay it securely online by card:</p>
      <div>${button(billing.payUrl, `Pay ${formatMoney(billing.amount)} ${escapeHtml(billing.label)}`, '#9C8466')}</div>
      ${tier && planPrice ? `<p style="margin: 12px 0 0 0;">Once it's paid, your ${tier.name} subscription (${formatMoney(planPrice)}/${cycleUnit}) starts automatically on the same card &mdash; there's nothing else to set up.</p>` : ''}
      ${guides([['subscription-billing', 'How Subscription Billing Works']])}`
    )
  } else if (billing?.mode === 'manual') {
    const manualNote = billing.note?.trim()
    billingStep = step(
      'Billing &mdash; nothing to pay online',
      `<p style="margin: 0;">${manualNote ? escapeHtml(manualNote).replace(/\r?\n/g, '<br>') : "We'll send your invoice separately, so there's nothing to pay online right now."}</p>
      <p style="margin: 10px 0 0 0; font-size: 14px; color: #555;">Questions about billing? Just reply to this email.</p>`
    )
  }

  const profileStep = step(
    'Complete your organization profile',
    `<p style="margin: 0 0 8px 0;">From your dashboard, open ${where('Settings &rarr; Organization')} and check your organization's name, contact details, and address.</p>
    <p style="margin: 0;">Then open ${where('Settings &rarr; Branding')} to upload your logo and choose your colors. They appear on your public registration pages.</p>
    ${guides([['setup', 'Setting Up Your Organization']])}`
  )

  const stripeStep = step(
    'Connect Stripe so you can collect registration payments',
    `<p style="margin: 0 0 8px 0;">Registration payments go straight from your attendees to your organization's bank account through Stripe. ChiRho Events never holds your money. To turn on online payments:</p>
    <ol style="margin: 0 0 8px 0; padding-left: 22px;">
      <li style="margin-bottom: 6px;">Go to ${where('Settings &rarr; Integrations')}</li>
      <li style="margin-bottom: 6px;">Confirm the <strong>Stripe Account Email</strong>, then click <strong>Connect Stripe</strong></li>
      <li style="margin-bottom: 6px;">Stripe will ask for your organization's legal name, EIN (tax ID), the bank account for payouts, and to verify your identity. Have those handy; it takes about 15 minutes</li>
      <li style="margin-bottom: 6px;">When Stripe sends you back, click <strong>Sync Status from Stripe</strong></li>
    </ol>
    <p style="margin: 0; font-size: 14px; color: #555;">Don't have a Stripe account yet? No problem. The connection process walks you through creating one. Each registration payment carries Stripe's processing fee (2.9% + $0.30) and a 1% ChiRho platform fee; these are separate from your subscription.</p>
    ${guides([['stripe-connect', 'Connecting Stripe to Accept Payments']])}`
  )

  const eventLimit = tier
    ? `<p style="margin: 10px 0 0 0; font-size: 14px; color: #555;">Your ${tier.name} plan includes <strong>${tier.eventsPerYear === null ? 'unlimited events' : `${tier.eventsPerYear} event${tier.eventsPerYear === 1 ? '' : 's'} per year`}</strong>${tier.maxPeoplePerYear === null ? '' : ` for up to <strong>${tier.maxPeoplePerYear.toLocaleString('en-US')} people</strong>`}.</p>`
    : ''
  const wizardSteps: [string, string][] = [
    ['Basic Information', 'Event name, whether groups, individuals, or both can register, dates and times, location, description, and total capacity'],
    ['Registration Settings', 'When registration opens and closes, early-bird and late pricing deadlines, and the final payment deadline'],
    ['Features &amp; Modules', 'Optional extras: housing or day passes, t-shirts, meal packages, add-ons, coupon codes, and staff or vendor registration'],
    ['Pricing', 'What each type of attendee pays, such as youth, chaperones, or individuals'],
    ['Contact &amp; Instructions', 'Who attendees should contact with questions, and how they can pay'],
    ['Landing Page', 'The public page people see when they go to register'],
    ['Review &amp; Publish', 'Look everything over, then click <strong>Publish Event</strong>, or <strong>Save as Draft</strong> to come back later'],
  ]
  const eventStep = step(
    'Build your first event',
    `<p style="margin: 0 0 12px 0;">Click ${where('Events')} in the left sidebar, then <strong>Create New Event</strong>. A 7-step wizard walks you through everything, and you can move back and forth between steps as you go:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 15px; border: 1px solid #E5E7EB; border-radius: 6px; border-collapse: separate;">
      ${wizardSteps
        .map(
          ([name, detail], i) => `
      <tr>
        <td valign="top" style="padding: 10px 12px; ${i > 0 ? 'border-top: 1px solid #E5E7EB; ' : ''}width: 36%; color: #1E3A5F; font-weight: 600;">${i + 1}. ${name}</td>
        <td valign="top" style="padding: 10px 12px 10px 0; ${i > 0 ? 'border-top: 1px solid #E5E7EB; ' : ''}color: #555;">${detail}</td>
      </tr>`
        )
        .join('')}
    </table>
    <p style="margin: 12px 0 0 0;">Nothing is public until you publish, and you can edit the event afterward. Liability and consent forms are set up separately under ${where('Liability Forms')} in the sidebar.</p>
    ${eventLimit}
    ${guides([
      ['create-event', 'Creating Your First Event'],
      ['pricing-setup', 'Pricing &amp; Registration'],
      ['housing-daypass', 'Housing &amp; Day Pass Options'],
      ['liability-individual', 'Liability Forms'],
      ['landing-page', 'Customizing Your Landing Page'],
    ])}`
  )

  const registrationStep = step(
    'Open registration and share your link',
    `<p style="margin: 0 0 8px 0;">When your event looks right, make it visible and open registration. Then share the registration link wherever your people will see it: the bulletin, your website, social media, or email.</p>
    <p style="margin: 0;">As people sign up, they appear under ${where('Registrations')}. From there you can track payments, record checks and cash, email attendees, and export lists. ${where('Reports')} has your financial and attendance reports.</p>
    ${guides([
      ['event-visibility', 'Event Visibility &amp; Registration Status'],
      ['manage-registrations', 'Managing Registrations &amp; Payments'],
      ['email-participants', 'Emailing Participants'],
      ['coupon-codes', 'Coupon &amp; Discount Codes'],
      ['reports', 'Generating Reports'],
    ])}`
  )

  const teamStep = step(
    'Invite your team (optional)',
    `<p style="margin: 0;">Have others helping you run the event? Go to ${where('Settings &rarr; Team')} and click <strong>Invite Team Member</strong>. You choose what each person can do, from full admin access down to view-only, and they'll get their own email invitation.</p>
    ${guides([['team', 'Managing Your Team']])}`
  )

  // ---- Help docs library ---------------------------------------------------
  const docGroup = (heading: string, links: [string, string][]) => `
      <p style="margin: 16px 0 6px 0; font-weight: bold; color: #1E3A5F;">${heading}</p>
      <ul style="margin: 0; padding-left: 22px; font-size: 15px;">
        ${links.map(([section, title]) => `<li style="margin-bottom: 4px;">${docLink(section, title)}</li>`).join('')}
      </ul>`
  const moduleDocs: [string, string][] = []
  if (modules?.poros) moduleDocs.push(['poros-enable', 'Enabling Poros (housing) for an event'])
  if (modules?.salve) moduleDocs.push(['salve-checkin', 'Using SALVE for check-in'])
  if (modules?.rapha) moduleDocs.push(['rapha-medical', 'Using Rapha for medical info'])

  const docsHtml = `
    <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 24px; margin: 10px 0 30px 0;">
      <h2 style="color: #1E3A5F; margin: 0 0 8px 0; font-size: 20px;">Everything else is in the help docs</h2>
      <p style="margin: 0 0 14px 0;">Every part of ChiRho Events has a step-by-step guide in our help docs. Whenever you're not sure how something works, start there; it's the fastest way to an answer.</p>
      <p style="margin: 0 0 6px 0; font-weight: bold; color: #1E3A5F;">How the help docs work</p>
      <ul style="margin: 0 0 18px 0; padding-left: 22px;">
        <li style="margin-bottom: 6px;"><strong>Finding them:</strong> go to <a href="${appUrl}/docs" style="color: #9C8466;">${appUrl.replace(/^https?:\/\//, '')}/docs</a>, or click <strong>Documentation</strong> in the menu at the top of our homepage. We suggest bookmarking it.</li>
        <li style="margin-bottom: 6px;"><strong>Getting around:</strong> guides are grouped in the left-hand menu by who they're for: <em>Getting Started</em>, <em>For Organization Admins</em> (that's you), <em>For Group Leaders</em>, <em>For Participants</em>, and <em>For Vendors</em>.</li>
        <li style="margin-bottom: 6px;"><strong>Searching:</strong> type a topic into the search bar at the top, like &ldquo;coupon&rdquo; or &ldquo;refund&rdquo;, to jump straight to the right guide.</li>
        <li style="margin-bottom: 6px;"><strong>Sharing:</strong> every guide has its own link. Send the Group Leader and Participant guides to the people registering for your event, so they can help themselves too.</li>
      </ul>
      <div>${button(docsUrl('setup'), 'Open the Help Docs')}</div>
      ${docGroup('Getting started', [
        ['setup', 'Setting Up Your Organization'],
        ['stripe-connect', 'Connecting Stripe to Accept Payments'],
        ['subscription-billing', 'How Subscription Billing Works'],
      ])}
      ${docGroup('Building your event', [
        ['create-event', 'Creating Your First Event'],
        ['pricing-setup', 'Setting Up Pricing &amp; Registration'],
        ['housing-daypass', 'Housing &amp; Day Pass Options'],
        ['liability-individual', 'Liability Forms for Individuals'],
        ['landing-page', 'Customizing Your Landing Page'],
        ['access-codes', 'Managing Access Codes (group registration)'],
      ])}
      ${docGroup('Running registration', [
        ['event-visibility', 'Event Visibility &amp; Registration Status'],
        ['capacity-management', 'Managing Capacity'],
        ['waitlist-queue', 'Waitlist &amp; Queue System'],
        ['manage-registrations', 'Managing Registrations &amp; Payments'],
        ['virtual-terminal', 'Taking Payments by Phone'],
        ['email-participants', 'Emailing Participants'],
      ])}
      ${docGroup('Reports, surveys &amp; your team', [
        ['reports', 'Generating Reports'],
        ['custom-reports', 'Custom Report Builder'],
        ['surveys', 'Post-Event Surveys'],
        ['team', 'Managing Your Team'],
        ['notifications', 'Notifications &amp; Email Digest'],
      ])}
      ${moduleDocs.length > 0 ? docGroup('Your add-on modules', moduleDocs) : ''}
      <p style="margin: 18px 0 0 0; font-size: 14px; color: #555;"><strong>Registering groups?</strong> Point your group leaders to the ${docLink('register-group', 'For Group Leaders')} guides, which walk them through registering, paying, and completing forms.</p>
    </div>`

  // ---- Support expectations ------------------------------------------------
  let supportHtml = ''
  if (tier?.isSelfServe) {
    supportHtml = `
    <div style="background: #FEF3C7; border: 1px solid #FCD34D; padding: 16px 18px; border-radius: 6px; margin: 0 0 30px 0;">
      <p style="margin: 0 0 8px 0; font-weight: bold; color: #92400E;">How support works on the ${tier.name} plan</p>
      <p style="margin: 0 0 8px 0; color: #92400E;">Your plan is self-serve, which is what keeps it affordable. It doesn't include an onboarding call or setup done for you, so this email and the help docs are your guide.</p>
      <p style="margin: 0 0 8px 0; color: #92400E;">Questions are always welcome. Email <a href="mailto:${ONBOARDING_SUPPORT_EMAIL}" style="color: #92400E;">${ONBOARDING_SUPPORT_EMAIL}</a> or reply to this email any time, and we'll point you in the right direction.</p>
      <p style="margin: 0; color: #92400E;">Want us to set things up for you or train your team? Hands-on help is available at <strong>$90/hour</strong>. Just reply to ask.</p>
    </div>`
  } else if (tier?.includesSetupCall) {
    supportHtml = `
    <div style="background: #ECFDF5; border: 1px solid #A7F3D0; padding: 16px 18px; border-radius: 6px; margin: 0 0 30px 0;">
      <p style="margin: 0 0 8px 0; font-weight: bold; color: #065F46;">Your onboarding call</p>
      <p style="margin: 0; color: #065F46;">Your ${tier.name} plan includes a 1-hour onboarding call. Reply to this email to schedule it. It works best after you've created your login, so we can work in your account together.</p>
    </div>`
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ChiRho Events</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 640px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">

  <!-- Header -->
  <div style="background: #1E3A5F; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <img src="${appUrl}/logo-horizontal.png" alt="ChiRho Events" style="max-width: 180px; height: auto; margin-bottom: 16px;" />
    <h1 style="margin: 0; font-size: 28px;">Welcome to ChiRho Events!</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">${org} is ready to set up</p>
  </div>

  <!-- Main Content -->
  <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">

    <p style="font-size: 18px; margin-top: 0;">Hi ${firstName},</p>

    <p>Your organization <strong style="color: #1E3A5F;">${org}</strong> is set up on ChiRho Events, and you're its <strong>Organization Administrator</strong>.</p>

    <p>This email is your setup checklist. It covers everything you need to go from here to taking registrations. Each step tells you where to click and links to a detailed guide in our help docs, so keep it handy.</p>

    <p>And if you have any questions along the way, just reply to this email or write to <a href="mailto:${ONBOARDING_SUPPORT_EMAIL}" style="color: #9C8466; font-weight: 600;">${ONBOARDING_SUPPORT_EMAIL}</a>. We're happy to help.</p>

    ${personalNoteHtml}

    ${planHtml}

    <h2 style="color: #1E3A5F; margin: 30px 0 18px 0; font-size: 22px;">Your setup checklist</h2>

    ${loginStep}
    ${billingStep}
    ${profileStep}
    ${stripeStep}
    ${eventStep}
    ${registrationStep}
    ${teamStep}

    ${docsHtml}

    ${supportHtml}

    <!-- Need Help -->
    <div style="margin: 0 0 10px 0;">
      <h2 style="color: #1E3A5F; margin: 0 0 10px 0; font-size: 20px;">Questions? We're here</h2>
      <ul style="margin: 0; padding-left: 22px;">
        <li style="margin-bottom: 6px;"><strong>Email us:</strong> <a href="mailto:${ONBOARDING_SUPPORT_EMAIL}" style="color: #9C8466;">${ONBOARDING_SUPPORT_EMAIL}</a>, or just reply to this email</li>
        <li style="margin-bottom: 6px;"><strong>Help docs:</strong> <a href="${appUrl}/docs" style="color: #9C8466;">${appUrl.replace(/^https?:\/\//, '')}/docs</a>, also linked as <strong>Documentation</strong> at the top of our homepage</li>
        <li style="margin-bottom: 6px;"><strong>From your dashboard:</strong> click <strong>Support</strong> in the left sidebar to open a support ticket</li>
      </ul>
    </div>

    <p style="margin-top: 24px;">Welcome aboard!<br><strong>The ChiRho Events Team</strong></p>

    <!-- Footer -->
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #666; font-size: 14px;">
      <p style="margin: 5px 0;">ChiRho Events - Built by Ministry for Ministry</p>
      <p style="margin: 5px 0;">
        <a href="https://chirhoevents.com" style="color: #9C8466; text-decoration: none;">chirhoevents.com</a>
      </p>
      <p style="margin: 15px 0 5px 0; font-size: 12px; color: #999;">
        This email was sent to ${adminEmail} as the administrator of ${org}.
      </p>
    </div>

  </div>
</body>
</html>
  `.trim()
}

/**
 * Generate a simpler team member invitation email
 */
interface TeamInviteEmailProps {
  inviteFirstName: string
  inviteEmail: string
  inviterFirstName: string
  inviterLastName: string
  organizationName: string
  role: string
  inviteLink: string
}

export function generateTeamInviteEmail({
  inviteFirstName,
  inviteEmail,
  inviterFirstName,
  inviterLastName,
  organizationName,
  role,
  inviteLink,
}: TeamInviteEmailProps): string {
  const roleDescriptions: Record<string, string> = {
    org_admin: `
      <ul style="margin: 10px 0; padding-left: 25px;">
        <li>Full access to all features</li>
        <li>Create and manage events</li>
        <li>View all registrations and payments</li>
        <li>Invite team members</li>
        <li>Access all reports</li>
      </ul>
    `,
    event_manager: `
      <ul style="margin: 10px 0; padding-left: 25px;">
        <li>Create and manage events</li>
        <li>Manage housing (Poros)</li>
        <li>Handle check-in (SALVE)</li>
        <li>View event registrations</li>
      </ul>
    `,
    finance_manager: `
      <ul style="margin: 10px 0; padding-left: 25px;">
        <li>Process payments</li>
        <li>Apply late fees</li>
        <li>Generate financial reports</li>
        <li>View payment history</li>
      </ul>
    `,
    poros_coordinator: `
      <ul style="margin: 10px 0; padding-left: 25px;">
        <li>Manage housing assignments</li>
        <li>View room allocations</li>
        <li>Access Poros portal</li>
      </ul>
    `,
    salve_coordinator: `
      <ul style="margin: 10px 0; padding-left: 25px;">
        <li>Manage event check-in</li>
        <li>Print name tags</li>
        <li>Access SALVE portal</li>
      </ul>
    `,
    rapha_coordinator: `
      <ul style="margin: 10px 0; padding-left: 25px;">
        <li>Access medical information</li>
        <li>Log and track incidents</li>
        <li>Access Rapha portal</li>
      </ul>
    `,
    staff: `
      <ul style="margin: 10px 0; padding-left: 25px;">
        <li>View-only access to events</li>
        <li>View registrations and reports</li>
      </ul>
    `,
  }

  const roleNames: Record<string, string> = {
    org_admin: 'Organization Admin',
    event_manager: 'Event Manager',
    finance_manager: 'Finance Manager',
    poros_coordinator: 'Poros Coordinator',
    salve_coordinator: 'SALVE Coordinator',
    rapha_coordinator: 'Rapha Coordinator',
    staff: 'Staff / Viewer',
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You've Been Invited to ChiRho Events</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">

  <!-- Header -->
  <div style="background: #1E3A5F; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <img src="${process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'}/logo-horizontal.png" alt="ChiRho Events" style="max-width: 180px; height: auto; margin-bottom: 16px;" />
    <h1 style="margin: 0; font-size: 28px;">You've Been Invited!</h1>
  </div>

  <!-- Main Content -->
  <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 18px; margin-top: 0;">Hi ${inviteFirstName},</p>

    <p><strong>${inviterFirstName} ${inviterLastName}</strong> has invited you to join <strong style="color: #1E3A5F;">${organizationName}</strong> on ChiRho Events.</p>

    <div style="background: #F5F1E8; padding: 15px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0 0 5px 0; font-size: 14px; color: #666;">Your role:</p>
      <p style="margin: 0; font-size: 18px; font-weight: 600; color: #1E3A5F;">${roleNames[role] || role}</p>
    </div>

    <h3 style="color: #1E3A5F; margin-top: 25px;">What You'll Be Able To Do:</h3>
    ${roleDescriptions[role] || '<ul style="margin: 10px 0; padding-left: 25px;"><li>Team member access</li></ul>'}

    <div style="text-align: center; margin: 30px 0;">
      <a href="${inviteLink}" style="display: inline-block; background: #1E3A5F; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
        Accept Invitation & Create Account
      </a>
    </div>

    <p style="font-size: 14px; color: #666;">
      Or copy and paste this link:<br>
      <a href="${inviteLink}" style="color: #9C8466;">${inviteLink}</a>
    </p>

    <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">

    <!-- Footer -->
    <div style="text-align: center; color: #666; font-size: 14px;">
      <p style="margin: 5px 0;">ChiRho Events - Built by Ministry for Ministry</p>
      <p style="margin: 15px 0 5px 0; font-size: 12px; color: #999;">
        This invitation was sent to ${inviteEmail}.<br>
        If you weren't expecting this, you can safely ignore this email.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim()
}
