/**
 * Org Admin Onboarding Email Template
 *
 * Sent when a Master Admin creates a new organization
 * Contains step-by-step instructions for getting started
 */

interface OrgAdminOnboardingEmailProps {
  orgName: string
  orgAdminFirstName: string
  orgAdminEmail: string
  inviteLink: string
  organizationId: string
}

export function generateOrgAdminOnboardingEmail({
  orgName,
  orgAdminFirstName,
  orgAdminEmail,
  inviteLink,
  organizationId,
}: OrgAdminOnboardingEmailProps): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ChiRho Events</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">

  <!-- Header -->
  <div style="background: #1E3A5F; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 28px;">Welcome to ChiRho Events!</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">Your Catholic Event Management Platform</p>
  </div>

  <!-- Main Content -->
  <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">

    <p style="font-size: 18px; margin-top: 0;">Hi ${orgAdminFirstName},</p>

    <p>Congratulations! Your organization <strong style="color: #1E3A5F;">${orgName}</strong> has been set up on ChiRho Events. You've been assigned as an <strong>Organization Administrator</strong>.</p>

    <div style="background: #F5F1E8; border-left: 4px solid #9C8466; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; font-weight: 600; color: #1E3A5F;">You can now manage all your Catholic ministry events in one place!</p>
    </div>

    <!-- Step 1: Create Account -->
    <div style="margin: 30px 0;">
      <h2 style="color: #1E3A5F; margin-bottom: 10px; font-size: 22px;">Step 1: Create Your Account</h2>
      <p>Click the button below to create your ChiRho Events account:</p>
      <div style="text-align: center; margin: 20px 0;">
        <a href="${inviteLink}" style="display: inline-block; background: #1E3A5F; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Create My Account</a>
      </div>
      <p style="font-size: 14px; color: #666;">
        Or copy and paste this link: <a href="${inviteLink}" style="color: #9C8466;">${inviteLink}</a>
      </p>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <!-- Step 2: Set Up Stripe -->
    <div style="margin: 30px 0;">
      <h2 style="color: #1E3A5F; margin-bottom: 10px; font-size: 22px;">Step 2: Connect Stripe for Payments</h2>
      <p>To accept event registrations and payments, you'll need to connect your Stripe account:</p>
      <ol style="margin: 15px 0; padding-left: 25px;">
        <li style="margin-bottom: 10px;">Sign in to your ChiRho Events account</li>
        <li style="margin-bottom: 10px;">Go to <strong>Settings &rarr; Integrations</strong></li>
        <li style="margin-bottom: 10px;">Click <strong>"Connect Stripe"</strong></li>
        <li style="margin-bottom: 10px;">Follow the Stripe Connect onboarding process</li>
        <li style="margin-bottom: 10px;">Once connected, you can start accepting payments!</li>
      </ol>
      <div style="background: #FEF3C7; border: 1px solid #FCD34D; padding: 12px; border-radius: 6px; margin-top: 15px;">
        <p style="margin: 0; font-size: 14px; color: #92400E;">
          <strong>Tip:</strong> Don't have a Stripe account yet? No problem! The connection process will guide you through creating one. It takes about 10 minutes.
        </p>
      </div>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <!-- Step 3: Create First Event -->
    <div style="margin: 30px 0;">
      <h2 style="color: #1E3A5F; margin-bottom: 10px; font-size: 22px;">Step 3: Create Your First Event</h2>
      <p>Ready to create your first event? Here's how:</p>
      <ol style="margin: 15px 0; padding-left: 25px;">
        <li style="margin-bottom: 10px;">From your dashboard, click <strong>"+ Create New Event"</strong></li>
        <li style="margin-bottom: 10px;">Fill in event details (name, dates, location)</li>
        <li style="margin-bottom: 10px;">Set up registration settings and pricing</li>
        <li style="margin-bottom: 10px;">Configure features (housing, check-in, medical tracking)</li>
        <li style="margin-bottom: 10px;">Add your event landing page content</li>
        <li style="margin-bottom: 10px;">Review and publish!</li>
      </ol>
      <p style="font-size: 14px; color: #666; font-style: italic;">The event creation wizard walks you through each step with helpful tips.</p>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <!-- Step 4: Invite Team -->
    <div style="margin: 30px 0;">
      <h2 style="color: #1E3A5F; margin-bottom: 10px; font-size: 22px;">Step 4: Invite Your Team</h2>
      <p>You don't have to do this alone! Invite team members to help:</p>
      <ol style="margin: 15px 0; padding-left: 25px;">
        <li style="margin-bottom: 10px;">Go to <strong>Settings &rarr; Team</strong></li>
        <li style="margin-bottom: 10px;">Click <strong>"+ Invite Team Member"</strong></li>
        <li style="margin-bottom: 10px;">Enter their email and select their role:
          <ul style="margin-top: 8px; padding-left: 20px;">
            <li><strong>Org Admin:</strong> Full access (like you)</li>
            <li><strong>Event Manager:</strong> Create/manage events</li>
            <li><strong>Finance Manager:</strong> Handle payments</li>
            <li><strong>Staff:</strong> View-only access</li>
          </ul>
        </li>
        <li style="margin-bottom: 10px;">They'll receive an invitation email to join!</li>
      </ol>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <!-- Platform Features Overview -->
    <div style="margin: 30px 0;">
      <h2 style="color: #1E3A5F; margin-bottom: 10px; font-size: 22px;">What You Can Do with ChiRho Events</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="background: #F9FAFB; padding: 15px; border-radius: 6px; border: 1px solid #E5E7EB; vertical-align: top;">
            <h3 style="margin: 0 0 8px 0; color: #1E3A5F; font-size: 16px;">Registration Management</h3>
            <p style="margin: 0; font-size: 14px; color: #666;">Accept group and individual registrations, flexible pricing, deposits, early bird discounts</p>
          </td>
        </tr>
        <tr><td style="height: 10px;"></td></tr>
        <tr>
          <td style="background: #F9FAFB; padding: 15px; border-radius: 6px; border: 1px solid #E5E7EB; vertical-align: top;">
            <h3 style="margin: 0 0 8px 0; color: #1E3A5F; font-size: 16px;">Payment Processing</h3>
            <p style="margin: 0; font-size: 14px; color: #666;">Credit card and check payments, automatic invoicing, late fees, refunds</p>
          </td>
        </tr>
        <tr><td style="height: 10px;"></td></tr>
        <tr>
          <td style="background: #F9FAFB; padding: 15px; border-radius: 6px; border: 1px solid #E5E7EB; vertical-align: top;">
            <h3 style="margin: 0 0 8px 0; color: #1E3A5F; font-size: 16px;">Digital Liability Forms</h3>
            <p style="margin: 0; font-size: 14px; color: #666;">Automatic PDF generation, parent consent workflows, e-signatures, medical information tracking</p>
          </td>
        </tr>
        <tr><td style="height: 10px;"></td></tr>
        <tr>
          <td style="background: #F9FAFB; padding: 15px; border-radius: 6px; border: 1px solid #E5E7EB; vertical-align: top;">
            <h3 style="margin: 0 0 8px 0; color: #1E3A5F; font-size: 16px;">Poros: Housing Management</h3>
            <p style="margin: 0; font-size: 14px; color: #666;">Room assignments, meal groups, small groups, seminarian/SGL tracking</p>
          </td>
        </tr>
        <tr><td style="height: 10px;"></td></tr>
        <tr>
          <td style="background: #F9FAFB; padding: 15px; border-radius: 6px; border: 1px solid #E5E7EB; vertical-align: top;">
            <h3 style="margin: 0 0 8px 0; color: #1E3A5F; font-size: 16px;">SALVE: Event Check-In</h3>
            <p style="margin: 0; font-size: 14px; color: #666;">QR code scanning, name tag printing, welcome packet generation</p>
          </td>
        </tr>
        <tr><td style="height: 10px;"></td></tr>
        <tr>
          <td style="background: #F9FAFB; padding: 15px; border-radius: 6px; border: 1px solid #E5E7EB; vertical-align: top;">
            <h3 style="margin: 0 0 8px 0; color: #1E3A5F; font-size: 16px;">Rapha: Medical Platform</h3>
            <p style="margin: 0; font-size: 14px; color: #666;">Medical info access, incident reporting, allergy tracking, ADA accommodations</p>
          </td>
        </tr>
        <tr><td style="height: 10px;"></td></tr>
        <tr>
          <td style="background: #F9FAFB; padding: 15px; border-radius: 6px; border: 1px solid #E5E7EB; vertical-align: top;">
            <h3 style="margin: 0 0 8px 0; color: #1E3A5F; font-size: 16px;">Reports & Analytics</h3>
            <p style="margin: 0; font-size: 14px; color: #666;">Financial reports, registration analytics, export to CSV/Google Sheets</p>
          </td>
        </tr>
      </table>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <!-- Need Help -->
    <div style="margin: 30px 0;">
      <h2 style="color: #1E3A5F; margin-bottom: 10px; font-size: 22px;">Need Help?</h2>
      <p>We're here to support you every step of the way:</p>
      <ul style="margin: 15px 0; padding-left: 25px;">
        <li style="margin-bottom: 10px;">Email us: <a href="mailto:support@chirhoevents.com" style="color: #9C8466;">support@chirhoevents.com</a></li>
        <li style="margin-bottom: 10px;">In-app support: Click the help icon in your dashboard</li>
      </ul>
    </div>

    <!-- Call to Action -->
    <div style="background: linear-gradient(135deg, #1E3A5F 0%, #2A4A7F 100%); color: white; padding: 25px; border-radius: 8px; text-align: center; margin: 30px 0;">
      <h3 style="margin: 0 0 15px 0; font-size: 20px;">Ready to Get Started?</h3>
      <a href="${inviteLink}" style="display: inline-block; background: #9C8466; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Create My Account Now</a>
    </div>

    <!-- Footer -->
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #666; font-size: 14px;">
      <p style="margin: 5px 0;">ChiRho Events - Built by Ministry for Ministry</p>
      <p style="margin: 5px 0;">
        <a href="https://chirhoevents.com" style="color: #9C8466; text-decoration: none;">chirhoevents.com</a>
      </p>
      <p style="margin: 15px 0 5px 0; font-size: 12px; color: #999;">
        This invitation was sent to ${orgAdminEmail} for ${orgName}
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
