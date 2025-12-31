/**
 * Email template library for ChiRho Events
 * All templates available for org admins to send
 */

export interface EmailTemplate {
  id: string
  name: string
  category: 'registration' | 'payment' | 'forms' | 'event' | 'general'
  description: string
  subject: string
  generateHtml: (data: any) => string
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'

/**
 * Professional email wrapper with consistent branding
 * Used by all email templates for a unified look
 */
export function wrapEmail(content: string, options?: {
  preheader?: string
  organizationName?: string
}): string {
  const orgName = options?.organizationName || 'ChiRho Events'
  const preheader = options?.preheader || ''

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${orgName}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
  <style>
    /* Reset styles */
    body { margin: 0; padding: 0; min-width: 100%; background-color: #f4f4f4; }
    table { border-collapse: collapse; width: 100%; }
    img { border: 0; display: block; outline: none; text-decoration: none; }

    /* Typography */
    body, td { font-family: 'Segoe UI', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; }
    h1 { font-size: 24px; font-weight: 700; color: #1E3A5F; margin: 0 0 16px 0; }
    h2 { font-size: 20px; font-weight: 600; color: #1E3A5F; margin: 24px 0 12px 0; }
    h3 { font-size: 18px; font-weight: 600; color: #1E3A5F; margin: 20px 0 10px 0; }
    p { margin: 0 0 16px 0; }
    a { color: #9C8466; text-decoration: underline; }

    /* Responsive */
    @media screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 0 16px !important; }
      .content { padding: 24px 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4;">
  ${preheader ? `<div style="display: none; max-height: 0; overflow: hidden;">${preheader}</div>` : ''}

  <!-- Wrapper Table -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 24px 0;">

        <!-- Email Container -->
        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1E3A5F 0%, #2d5a8c 100%); padding: 32px 40px; text-align: center;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <!-- Logo/Icon -->
                    <div style="font-size: 40px; margin-bottom: 8px;">⚓</div>
                    <div style="color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">ChiRho Events</div>
                    <div style="color: #9C8466; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px;">Catholic Event Management</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="content" style="padding: 40px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; border-top: 1px solid #e0e0e0; padding: 24px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="color: #666666; font-size: 13px; line-height: 1.5;">
                    <p style="margin: 0 0 8px 0;">
                      <strong>${orgName}</strong>
                    </p>
                    <p style="margin: 0 0 8px 0;">
                      Questions? Email <a href="mailto:support@chirhoevents.com" style="color: #9C8466;">support@chirhoevents.com</a>
                    </p>
                    <p style="margin: 0; color: #999999; font-size: 12px;">
                      © ${new Date().getFullYear()} ChiRho Events. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

/**
 * Generate a styled button for emails
 */
export function emailButton(text: string, url: string, color: 'primary' | 'secondary' | 'success' = 'primary'): string {
  const colors = {
    primary: { bg: '#1E3A5F', text: '#ffffff' },
    secondary: { bg: '#9C8466', text: '#ffffff' },
    success: { bg: '#059669', text: '#ffffff' },
  }
  const c = colors[color]

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
      <tr>
        <td style="background-color: ${c.bg}; border-radius: 6px; text-align: center;">
          <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 32px; color: ${c.text}; text-decoration: none; font-weight: 600; font-size: 16px;">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `
}

/**
 * Generate an info box for emails
 */
export function emailInfoBox(content: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): string {
  const styles = {
    info: { bg: '#EBF5FF', border: '#3B82F6', text: '#1E40AF' },
    success: { bg: '#ECFDF5', border: '#10B981', text: '#065F46' },
    warning: { bg: '#FFFBEB', border: '#F59E0B', text: '#92400E' },
    error: { bg: '#FEF2F2', border: '#EF4444', text: '#991B1B' },
  }
  const s = styles[type]

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
      <tr>
        <td style="background-color: ${s.bg}; border-left: 4px solid ${s.border}; padding: 16px 20px; border-radius: 4px;">
          <div style="color: ${s.text}; font-size: 15px;">
            ${content}
          </div>
        </td>
      </tr>
    </table>
  `
}

/**
 * Generate a detail row for receipts/invoices
 */
export function emailDetailRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; color: #666666; font-size: 14px;">${label}</td>
      <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; text-align: right; font-weight: 600; color: #1E3A5F;">${value}</td>
    </tr>
  `
}

export const emailTemplates: EmailTemplate[] = [
  {
    id: 'registration_confirmation',
    name: 'Registration Confirmation',
    category: 'registration',
    description: 'Send a registration confirmation with event details',
    subject: 'Registration Confirmed - {{eventName}}',
    generateHtml: (data) => wrapEmail(`
      <h1 style="color: #1E3A5F; margin-top: 0;">Registration Confirmed!</h1>

      <p>Thank you for registering for <strong>${data.eventName || 'the event'}</strong>!</p>

      <h3 style="color: #1E3A5F;">Registration Details</h3>
      <div style="background-color: #F5F5F5; padding: 15px; border-radius: 8px;">
        ${data.registrationDetails || '<p>Your registration has been confirmed.</p>'}
      </div>

      <h3 style="color: #1E3A5F;">Next Steps:</h3>
      <ol>
        <li><strong>Payment:</strong> Complete your payment if not already done</li>
        <li><strong>Forms:</strong> Submit all required liability forms</li>
        <li><strong>Check-In:</strong> Arrive at the event venue on time</li>
      </ol>

      <p>Questions? Reply to this email or contact the event organizer.</p>
    `),
  },
  {
    id: 'payment_reminder',
    name: 'Payment Reminder',
    category: 'payment',
    description: 'Remind registrants about outstanding payment balance',
    subject: 'Payment Reminder - {{eventName}}',
    generateHtml: (data) => wrapEmail(`
      <h1 style="color: #1E3A5F; margin-top: 0;">Payment Reminder</h1>

      <p>This is a friendly reminder about your outstanding payment for <strong>${data.eventName || 'the event'}</strong>.</p>

      <div style="background-color: #FFF3CD; border-left: 4px solid #FFB74D; padding: 15px; margin: 20px 0;">
        <h3 style="color: #F57C00; margin-top: 0;">Amount Due: $${data.amountDue || '0.00'}</h3>
        ${data.dueDate ? `<p><strong>Due Date:</strong> ${data.dueDate}</p>` : ''}
      </div>

      <h3 style="color: #1E3A5F;">Payment Options:</h3>
      <ul>
        <li><strong>Online:</strong> Pay securely through your registration portal</li>
        <li><strong>Check:</strong> Mail to the event organizer</li>
        <li><strong>In Person:</strong> Contact the event organizer to arrange payment</li>
      </ul>

      <p>If you've already made your payment, please disregard this message.</p>
    `),
  },
  {
    id: 'payment_received',
    name: 'Payment Received',
    category: 'payment',
    description: 'Confirm payment has been received',
    subject: 'Payment Received - {{eventName}}',
    generateHtml: (data) => wrapEmail(`
      <h1 style="color: #1E3A5F; margin-top: 0;">Payment Received</h1>

      <p>We have received your payment for <strong>${data.eventName || 'the event'}</strong>. Thank you!</p>

      <div style="background-color: #E8F5E9; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0;">
        <h3 style="color: #2E7D32; margin-top: 0;">Payment Details</h3>
        <p style="margin: 5px 0;"><strong>Amount:</strong> $${data.amount || '0.00'}</p>
        <p style="margin: 5px 0;"><strong>Date:</strong> ${data.paymentDate || new Date().toLocaleDateString()}</p>
        ${data.paymentMethod ? `<p style="margin: 5px 0;"><strong>Method:</strong> ${data.paymentMethod}</p>` : ''}
        ${data.remainingBalance ? `<p style="margin: 5px 0;"><strong>Remaining Balance:</strong> $${data.remainingBalance}</p>` : ''}
      </div>

      ${data.remainingBalance && parseFloat(data.remainingBalance) > 0 ? `
        <p><strong>Please note:</strong> You still have an outstanding balance of $${data.remainingBalance}.</p>
      ` : '<p>Your payment is complete! We look forward to seeing you at the event.</p>'}
    `),
  },
  {
    id: 'forms_reminder',
    name: 'Liability Forms Reminder',
    category: 'forms',
    description: 'Remind about incomplete liability forms',
    subject: 'Action Required: Complete Liability Forms - {{eventName}}',
    generateHtml: (data) => wrapEmail(`
      <h1 style="color: #1E3A5F; margin-top: 0;">Liability Forms Required</h1>

      <p>We're missing required liability forms for your registration to <strong>${data.eventName || 'the event'}</strong>.</p>

      <div style="background-color: #FFEBEE; border-left: 4px solid #F44336; padding: 15px; margin: 20px 0;">
        <h3 style="color: #C62828; margin-top: 0;">Incomplete Forms</h3>
        ${data.incompleteCount ? `<p><strong>${data.incompleteCount}</strong> participant(s) still need to complete their forms</p>` : ''}
        ${data.accessCode ? `<p><strong>Access Code:</strong> <span style="font-family: monospace; font-size: 18px; font-weight: bold;">${data.accessCode}</span></p>` : ''}
      </div>

      <h3 style="color: #1E3A5F;">Why We Need These Forms:</h3>
      <ul>
        <li>Required for all participants to attend the event</li>
        <li>Ensures we have emergency contact information</li>
        <li>Documents any medical conditions or allergies</li>
      </ul>

      <p><strong>Action Required:</strong> Please complete the forms as soon as possible to ensure your spot at the event.</p>
    `),
  },
  {
    id: 'event_update',
    name: 'Event Update/Announcement',
    category: 'event',
    description: 'Send important updates or announcements about the event',
    subject: 'Important Update: {{eventName}}',
    generateHtml: (data) => wrapEmail(`
      <h1 style="color: #1E3A5F; margin-top: 0;">Event Update</h1>

      <p>We have an important update regarding <strong>${data.eventName || 'the event'}</strong>.</p>

      <div style="background-color: #E3F2FD; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0;">
        ${data.updateMessage || '<p>Please check your registration portal for the latest information.</p>'}
      </div>

      ${data.actionRequired ? `
        <div style="background-color: #FFF3CD; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #F57C00; margin-top: 0;">Action Required:</h3>
          ${data.actionRequired}
        </div>
      ` : ''}

      <p>If you have any questions, please reply to this email or contact the event organizer.</p>
    `),
  },
  {
    id: 'welcome_access_code',
    name: 'Welcome Email with Access Code',
    category: 'registration',
    description: 'Send access code and welcome message',
    subject: 'Your Access Code - {{eventName}}',
    generateHtml: (data) => wrapEmail(`
      <h1 style="color: #1E3A5F; margin-top: 0;">Welcome!</h1>

      <p>Thank you for registering for <strong>${data.eventName || 'the event'}</strong>!</p>

      <div style="background-color: #F5F1E8; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="color: #9C8466; margin-top: 0;">Your Access Code</h2>
        <p style="font-size: 24px; font-weight: bold; color: #1E3A5F; font-family: monospace; letter-spacing: 2px; text-align: center;">
          ${data.accessCode || 'N/A'}
        </p>
        <p style="font-size: 14px; color: #666; text-align: center;">
          Save this code! You'll need it to access your group portal and complete forms.
        </p>
      </div>

      <h3 style="color: #1E3A5F;">What's Next?</h3>
      <ol>
        <li>Use your access code to log in to your group portal</li>
        <li>Add participant information</li>
        <li>Complete all required liability forms</li>
        <li>Submit payment</li>
      </ol>

      <p>Questions? We're here to help! Reply to this email anytime.</p>
    `),
  },
  {
    id: 'check_in_instructions',
    name: 'Check-In Instructions',
    category: 'event',
    description: 'Send check-in details before the event',
    subject: 'Check-In Information - {{eventName}}',
    generateHtml: (data) => wrapEmail(`
      <h1 style="color: #1E3A5F; margin-top: 0;">Event Check-In Information</h1>

      <p>We're excited to see you at <strong>${data.eventName || 'the event'}</strong>!</p>

      <h3 style="color: #1E3A5F;">Check-In Details:</h3>
      <div style="background-color: #F5F5F5; padding: 15px; border-radius: 8px;">
        ${data.checkInTime ? `<p style="margin: 5px 0;"><strong>Time:</strong> ${data.checkInTime}</p>` : ''}
        ${data.checkInLocation ? `<p style="margin: 5px 0;"><strong>Location:</strong> ${data.checkInLocation}</p>` : ''}
        ${data.parkingInfo ? `<p style="margin: 5px 0;"><strong>Parking:</strong> ${data.parkingInfo}</p>` : ''}
      </div>

      <h3 style="color: #1E3A5F;">What to Bring:</h3>
      <ul>
        ${data.accessCode ? `<li>Your access code: <strong>${data.accessCode}</strong></li>` : ''}
        <li>Photo ID for all participants</li>
        <li>Any medications needed</li>
        <li>Completed liability forms (if not already submitted)</li>
      </ul>

      <p>See you soon!</p>
    `),
  },
  {
    id: 'custom_message',
    name: 'Custom Message',
    category: 'general',
    description: 'Send a custom message to registrants',
    subject: '{{eventName}} - Message from Event Organizer',
    generateHtml: (data) => wrapEmail(`
      <h1 style="color: #1E3A5F; margin-top: 0;">${data.eventName || 'Message from Event Organizer'}</h1>

      ${data.customMessage || '<p>You have received a message from the event organizer.</p>'}

      <p>If you have any questions, please reply to this email.</p>
    `),
  },
]

/**
 * Get template by ID
 */
export function getTemplateById(templateId: string): EmailTemplate | undefined {
  return emailTemplates.find(t => t.id === templateId)
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: EmailTemplate['category']): EmailTemplate[] {
  return emailTemplates.filter(t => t.category === category)
}

/**
 * Replace placeholders in subject line
 */
export function processSubject(subject: string, data: any): string {
  return subject.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || match)
}

/**
 * Generate Virtual Terminal receipt email
 */
/**
 * Generate medical incident notification email for parents
 */
export function generateMedicalIncidentParentEmail({
  parentName,
  participantName,
  eventName,
  incidentType,
  severity,
  incidentTime,
  description,
  treatment,
  staffName,
  organizationName,
  organizationPhone,
}: {
  parentName: string
  participantName: string
  eventName: string
  incidentType: string
  severity: string
  incidentTime: string
  description: string
  treatment: string
  staffName: string
  organizationName: string
  organizationPhone?: string
}): string {
  const severityColors = {
    minor: { bg: '#D1FAE5', border: '#059669', text: '#065F46' },
    moderate: { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' },
    severe: { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B' },
  }

  const colors = severityColors[severity as keyof typeof severityColors] || severityColors.moderate

  const incidentTypeLabels: Record<string, string> = {
    injury: 'Injury',
    illness: 'Illness',
    allergic_reaction: 'Allergic Reaction',
    medication_administration: 'Medication Administration',
    other: 'Medical Incident',
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #1E3A5F; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: #0077BE; color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 30px; background: #F5F5F5; }
          .incident-box { background: ${colors.bg}; border-left: 4px solid ${colors.border}; padding: 20px; margin: 20px 0; }
          .incident-title { color: ${colors.text}; font-weight: bold; font-size: 18px; margin: 0 0 10px 0; }
          .detail-row { margin: 10px 0; }
          .detail-label { font-weight: bold; color: #6B7280; }
          .footer { text-align: center; padding: 20px; color: #6B7280; font-size: 12px; background: #E5E7EB; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Medical Incident Notification</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">${eventName}</p>
          </div>

          <div class="content">
            <p>Dear ${parentName},</p>

            <p>This is to inform you that your child, <strong>${participantName}</strong>, was involved in a medical incident at ${eventName}.</p>

            <div class="incident-box">
              <p class="incident-title">${incidentTypeLabels[incidentType] || 'Medical Incident'}</p>
              <p style="color: ${colors.text}; text-transform: uppercase; font-size: 12px; margin: 0;">
                Severity: ${severity.toUpperCase()}
              </p>
            </div>

            <div class="detail-row">
              <span class="detail-label">Time:</span> ${incidentTime}
            </div>

            <div class="detail-row">
              <span class="detail-label">What Happened:</span>
              <p style="margin: 5px 0;">${description}</p>
            </div>

            <div class="detail-row">
              <span class="detail-label">Treatment Provided:</span>
              <p style="margin: 5px 0;">${treatment}</p>
            </div>

            <div class="detail-row">
              <span class="detail-label">Treated By:</span> ${staffName}
            </div>

            <p style="margin-top: 20px;">
              ${severity === 'severe'
                ? `<strong>Due to the severity of this incident, please contact us immediately.</strong>`
                : `Your child is being well cared for. We will keep you updated on their condition.`
              }
            </p>

            ${organizationPhone ? `
              <p>If you have any questions or concerns, please call us at: <strong>${organizationPhone}</strong></p>
            ` : ''}

            <p>
              Sincerely,<br>
              <strong>${organizationName} Medical Staff</strong>
            </p>
          </div>

          <div class="footer">
            <p>This is an automated notification from Rapha Medical Platform</p>
            <p>&copy; ${new Date().getFullYear()} ${organizationName}. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `
}

/**
 * Generate medical incident resolved notification email for parents
 */
export function generateMedicalIncidentResolvedEmail({
  parentName,
  participantName,
  eventName,
  incidentType,
  resolutionNotes,
  disposition,
  organizationName,
}: {
  parentName: string
  participantName: string
  eventName: string
  incidentType: string
  resolutionNotes: string
  disposition: string
  organizationName: string
}): string {
  const dispositionLabels: Record<string, string> = {
    returned_to_activities: 'has returned to regular activities',
    resting_in_health_office: 'is resting in the health office',
    sent_home: 'has been sent home',
    hospitalized: 'has been taken to the hospital',
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #1E3A5F; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: #059669; color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 30px; background: #F5F5F5; }
          .success-box { background: #D1FAE5; border: 1px solid #059669; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #6B7280; font-size: 12px; background: #E5E7EB; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Incident Resolved</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">${eventName}</p>
          </div>

          <div class="content">
            <p>Dear ${parentName},</p>

            <p>We're pleased to inform you that the medical incident involving <strong>${participantName}</strong> has been resolved.</p>

            <div class="success-box">
              <p style="margin: 0; color: #065F46;">
                <strong>Good news!</strong> ${participantName} ${dispositionLabels[disposition] || 'is doing well'}.
              </p>
            </div>

            ${resolutionNotes ? `
              <p><strong>Resolution Notes:</strong></p>
              <p>${resolutionNotes}</p>
            ` : ''}

            <p>If you have any questions, please don't hesitate to contact us.</p>

            <p>
              Sincerely,<br>
              <strong>${organizationName} Medical Staff</strong>
            </p>
          </div>

          <div class="footer">
            <p>This is an automated notification from Rapha Medical Platform</p>
            <p>&copy; ${new Date().getFullYear()} ${organizationName}. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `
}

/**
 * Generate medical incident notification email for group leaders
 */
export function generateMedicalIncidentGroupLeaderEmail({
  groupLeaderName,
  participantName,
  eventName,
  incidentType,
  severity,
  organizationName,
}: {
  groupLeaderName: string
  participantName: string
  eventName: string
  incidentType: string
  severity: string
  organizationName: string
}): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #1E3A5F; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: #0077BE; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .notice { background: #FEF3C7; border: 1px solid #F59E0B; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .footer { text-align: center; padding: 15px; color: #6B7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 20px;">Medical Incident Notification</h1>
          </div>

          <div class="content">
            <p>Dear ${groupLeaderName},</p>

            <p>This is to inform you that a participant in your group has been involved in a medical incident.</p>

            <div class="notice">
              <p style="margin: 0;"><strong>Participant:</strong> ${participantName}</p>
              <p style="margin: 5px 0 0;"><strong>Incident Type:</strong> ${incidentType}</p>
              <p style="margin: 5px 0 0;"><strong>Severity:</strong> ${severity}</p>
            </div>

            <p>Our medical staff is handling the situation. No action is required from you at this time. We will keep you informed of any updates.</p>

            <p style="font-size: 12px; color: #6B7280;">
              Note: For privacy reasons, detailed medical information is not included in this notification.
            </p>

            <p>
              - ${organizationName} Medical Staff
            </p>
          </div>

          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${organizationName}</p>
          </div>
        </div>
      </body>
    </html>
  `
}

export function generateVirtualTerminalReceipt({
  recipientName,
  eventName,
  amount,
  paymentMethod,
  cardLast4,
  cardBrand,
  processedBy,
  notes,
  newBalance,
  organizationName
}: {
  recipientName: string
  eventName: string
  amount: number
  paymentMethod: string
  cardLast4?: string
  cardBrand?: string
  processedBy: string
  notes?: string
  newBalance: number
  organizationName: string
}): string {
  const paymentMethodDisplay =
    paymentMethod === 'card' && cardLast4
      ? `${cardBrand || 'Card'} ending in ${cardLast4}`
      : paymentMethod === 'check'
      ? 'Check'
      : paymentMethod === 'cash'
      ? 'Cash'
      : 'Credit Card'

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #1E3A5F; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: #1E3A5F; color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .header p { margin: 10px 0 0; opacity: 0.9; }
          .content { background: #F5F1E8; padding: 30px; }
          .receipt-box { background: white; border: 2px solid #9C8466; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .amount { font-size: 32px; font-weight: bold; color: #1E3A5F; margin: 10px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #E5E7EB; }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { color: #6B7280; font-size: 14px; }
          .detail-value { font-weight: 600; color: #1E3A5F; text-align: right; }
          .footer { text-align: center; padding: 20px; color: #6B7280; font-size: 12px; }
          .balance-box { margin-top: 15px; padding-top: 15px; border-top: 2px solid #9C8466; }
          .success-box { background: #D1FAE5; border: 1px solid #059669; padding: 15px; border-radius: 6px; margin: 20px 0; }
          .success-text { margin: 0; color: #065F46; }
          .warning-box { background: #FEF3C7; border: 1px solid #F59E0B; padding: 15px; border-radius: 6px; margin: 20px 0; }
          .warning-text { margin: 0; color: #92400E; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Received</h1>
            <p>Payment processed by ${organizationName} staff</p>
          </div>

          <div class="content">
            <p>Dear ${recipientName},</p>

            <p>This email confirms that a payment has been processed by our staff for your registration.</p>

            <div class="receipt-box">
              <h2 style="margin-top: 0; color: #1E3A5F;">Payment Details</h2>

              <div style="text-align: center; margin: 20px 0;">
                <div style="color: #6B7280; font-size: 14px;">Amount Paid</div>
                <div class="amount">$${amount.toFixed(2)}</div>
              </div>

              <div class="detail-row">
                <span class="detail-label">Event</span>
                <span class="detail-value">${eventName}</span>
              </div>

              <div class="detail-row">
                <span class="detail-label">Payment Method</span>
                <span class="detail-value">${paymentMethodDisplay}</span>
              </div>

              <div class="detail-row">
                <span class="detail-label">Processed By</span>
                <span class="detail-value">${processedBy}</span>
              </div>

              <div class="detail-row">
                <span class="detail-label">Date</span>
                <span class="detail-value">${new Date().toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}</span>
              </div>

              ${notes ? `
                <div class="detail-row">
                  <span class="detail-label">Notes</span>
                  <span class="detail-value">${notes}</span>
                </div>
              ` : ''}

              <div class="balance-box">
                <div class="detail-row" style="border-bottom: none;">
                  <span class="detail-label" style="font-size: 16px;">Remaining Balance</span>
                  <span class="detail-value" style="font-size: 20px; color: ${newBalance > 0 ? '#1E3A5F' : '#059669'};">
                    $${newBalance.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            ${newBalance > 0 ? `
              <div class="warning-box">
                <p class="warning-text">
                  <strong>Outstanding Balance:</strong> You still have a balance of $${newBalance.toFixed(2)}.
                  Please make your final payment before the event.
                </p>
              </div>
            ` : `
              <div class="success-box">
                <p class="success-text">
                  <strong>Paid in Full!</strong> Your registration is fully paid. We look forward to seeing you at the event!
                </p>
              </div>
            `}

            <p>If you have any questions about this payment, please contact us.</p>

            <p>
              Thank you,<br>
              <strong>${organizationName}</strong>
            </p>
          </div>

          <div class="footer">
            <p>This is an automated receipt. Please save this email for your records.</p>
            <p>&copy; ${new Date().getFullYear()} ${organizationName}. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `
}

/**
 * Generate welcome email for new organizations
 */
export function generateOrganizationWelcomeEmail({
  adminName,
  organizationName,
  subscriptionPlan,
  loginUrl,
}: {
  adminName: string
  organizationName: string
  subscriptionPlan: string
  loginUrl: string
}): string {
  return wrapEmail(`
    <h1>Welcome to ChiRho Events!</h1>

    <p>Dear ${adminName},</p>

    <p>Congratulations! Your organization <strong>${organizationName}</strong> has been approved and your account is now active.</p>

    ${emailInfoBox(`
      <strong>Your Subscription:</strong> ${subscriptionPlan}<br>
      <strong>Organization:</strong> ${organizationName}
    `, 'success')}

    <h2>Getting Started</h2>
    <p>Here's what you can do with ChiRho Events:</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;">
          <strong style="color: #1E3A5F;">1. Create Your First Event</strong>
          <p style="margin: 4px 0 0; color: #666; font-size: 14px;">Set up registration, pricing tiers, and deadlines</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;">
          <strong style="color: #1E3A5F;">2. Customize Liability Forms</strong>
          <p style="margin: 4px 0 0; color: #666; font-size: 14px;">Configure youth, chaperone, and clergy forms for your diocese</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;">
          <strong style="color: #1E3A5F;">3. Invite Your Team</strong>
          <p style="margin: 4px 0 0; color: #666; font-size: 14px;">Add staff members and assign roles</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 0;">
          <strong style="color: #1E3A5F;">4. Configure Payments</strong>
          <p style="margin: 4px 0 0; color: #666; font-size: 14px;">Connect Stripe to accept online payments</p>
        </td>
      </tr>
    </table>

    ${emailButton('Access Your Dashboard', loginUrl, 'primary')}

    <h2>Need Help?</h2>
    <p>Our team is here to support you during your first 30 days with priority onboarding assistance:</p>
    <ul>
      <li>Email: <a href="mailto:support@chirhoevents.com">support@chirhoevents.com</a></li>
      <li>Documentation: <a href="https://chirhoevents.com/docs">chirhoevents.com/docs</a></li>
    </ul>

    <p>Welcome to the ChiRho family. We're honored to serve your ministry!</p>
  `, { organizationName: 'ChiRho Events' })
}

/**
 * Generate invoice email with payment details
 */
export function generateInvoiceEmail({
  recipientName,
  organizationName,
  invoiceNumber,
  invoiceDate,
  dueDate,
  amount,
  lineItems,
  paymentUrl,
  isPastDue,
}: {
  recipientName: string
  organizationName: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  amount: number
  lineItems: Array<{ description: string; amount: number }>
  paymentUrl: string
  isPastDue?: boolean
}): string {
  const lineItemsHtml = lineItems.map(item => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5; color: #333;">${item.description}</td>
      <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5; text-align: right; font-weight: 600; color: #1E3A5F;">$${item.amount.toFixed(2)}</td>
    </tr>
  `).join('')

  return wrapEmail(`
    <h1>Invoice from ChiRho Events</h1>

    <p>Dear ${recipientName},</p>

    ${isPastDue ? emailInfoBox(`
      <strong>Payment Past Due</strong><br>
      This invoice was due on ${dueDate}. Please submit payment as soon as possible to avoid service interruption.
    `, 'warning') : `
      <p>Please find your invoice details below for <strong>${organizationName}</strong>.</p>
    `}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0; background: #f9f9f9; border-radius: 8px; padding: 20px;">
      <tr>
        <td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${emailDetailRow('Invoice Number', invoiceNumber)}
            ${emailDetailRow('Invoice Date', invoiceDate)}
            ${emailDetailRow('Due Date', dueDate)}
          </table>
        </td>
      </tr>
    </table>

    <h2>Invoice Details</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0;">
      ${lineItemsHtml}
      <tr>
        <td style="padding: 16px 0; font-weight: 700; font-size: 18px; color: #1E3A5F;">Total Due</td>
        <td style="padding: 16px 0; text-align: right; font-weight: 700; font-size: 18px; color: #1E3A5F;">$${amount.toFixed(2)}</td>
      </tr>
    </table>

    ${emailButton('Pay Now', paymentUrl, 'primary')}

    <h2>Payment Options</h2>
    <ul>
      <li><strong>Online:</strong> Click the button above to pay securely with credit card</li>
      <li><strong>Check:</strong> Make payable to "ChiRho Events" and mail to our billing address</li>
      <li><strong>ACH/Wire:</strong> Contact us for bank transfer details</li>
    </ul>

    <p style="font-size: 14px; color: #666;">
      If you have any questions about this invoice, please contact our billing team at
      <a href="mailto:billing@chirhoevents.com">billing@chirhoevents.com</a>.
    </p>
  `, { organizationName: 'ChiRho Events', preheader: `Invoice ${invoiceNumber} - $${amount.toFixed(2)} due ${dueDate}` })
}

/**
 * Generate support ticket confirmation email
 */
export function generateSupportTicketConfirmationEmail({
  userName,
  ticketId,
  ticketSubject,
  ticketMessage,
  ticketCategory,
  ticketPriority,
}: {
  userName: string
  ticketId: string
  ticketSubject: string
  ticketMessage: string
  ticketCategory: string
  ticketPriority: string
}): string {
  const priorityColors: Record<string, 'info' | 'warning' | 'error'> = {
    low: 'info',
    medium: 'info',
    high: 'warning',
    urgent: 'error',
  }

  return wrapEmail(`
    <h1>Support Ticket Received</h1>

    <p>Dear ${userName},</p>

    <p>Thank you for contacting ChiRho Events support. We've received your request and will respond as soon as possible.</p>

    ${emailInfoBox(`
      <strong>Ticket ID:</strong> #${ticketId}<br>
      <strong>Priority:</strong> ${ticketPriority.charAt(0).toUpperCase() + ticketPriority.slice(1)}<br>
      <strong>Category:</strong> ${ticketCategory}
    `, priorityColors[ticketPriority] || 'info')}

    <h2>Your Request</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0; background: #f9f9f9; border-radius: 8px;">
      <tr>
        <td style="padding: 20px;">
          <p style="margin: 0 0 8px; font-weight: 600; color: #1E3A5F;">${ticketSubject}</p>
          <p style="margin: 0; color: #666; white-space: pre-wrap;">${ticketMessage}</p>
        </td>
      </tr>
    </table>

    <h2>What Happens Next?</h2>
    <ul>
      <li>Our support team will review your ticket within 24 hours</li>
      <li>You'll receive an email when we respond</li>
      <li>You can reply to this email to add more information</li>
    </ul>

    <p style="font-size: 14px; color: #666;">
      Reference your ticket ID <strong>#${ticketId}</strong> in any follow-up communications.
    </p>
  `, { organizationName: 'ChiRho Events', preheader: `Support ticket #${ticketId} received - we'll respond within 24 hours` })
}

/**
 * Generate support ticket response email
 */
export function generateSupportTicketResponseEmail({
  userName,
  ticketId,
  ticketSubject,
  responseMessage,
  responderName,
  isResolved,
}: {
  userName: string
  ticketId: string
  ticketSubject: string
  responseMessage: string
  responderName: string
  isResolved?: boolean
}): string {
  return wrapEmail(`
    <h1>${isResolved ? 'Ticket Resolved' : 'Response to Your Ticket'}</h1>

    <p>Dear ${userName},</p>

    ${isResolved ? emailInfoBox(`
      <strong>Good news!</strong> Your support ticket has been resolved. If you have any further questions, feel free to reply to this email.
    `, 'success') : `
      <p>We've responded to your support ticket.</p>
    `}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0; background: #f0f7ff; border-left: 4px solid #3B82F6; border-radius: 4px;">
      <tr>
        <td style="padding: 20px;">
          <p style="margin: 0 0 4px; font-size: 12px; color: #666;">Ticket #${ticketId}: ${ticketSubject}</p>
        </td>
      </tr>
    </table>

    <h2>Response from ${responderName}</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0; background: #f9f9f9; border-radius: 8px;">
      <tr>
        <td style="padding: 20px;">
          <div style="color: #333; white-space: pre-wrap;">${responseMessage}</div>
        </td>
      </tr>
    </table>

    ${!isResolved ? `
      <p><strong>Need to follow up?</strong> Simply reply to this email and your response will be added to the ticket.</p>
    ` : `
      <p>Thank you for using ChiRho Events. We're always here to help!</p>
    `}

    <p style="font-size: 14px; color: #666; margin-top: 24px;">
      — ChiRho Events Support Team
    </p>
  `, { organizationName: 'ChiRho Events', preheader: isResolved ? `Ticket #${ticketId} resolved` : `New response to ticket #${ticketId}` })
}

/**
 * Generate password reset email
 */
export function generatePasswordResetEmail({
  userName,
  resetUrl,
  expiresIn,
}: {
  userName: string
  resetUrl: string
  expiresIn: string
}): string {
  return wrapEmail(`
    <h1>Reset Your Password</h1>

    <p>Dear ${userName},</p>

    <p>We received a request to reset your password for your ChiRho Events account.</p>

    ${emailButton('Reset Password', resetUrl, 'primary')}

    ${emailInfoBox(`
      <strong>This link expires in ${expiresIn}.</strong><br>
      If you didn't request a password reset, you can safely ignore this email.
    `, 'warning')}

    <p>For security reasons:</p>
    <ul>
      <li>Never share this link with anyone</li>
      <li>ChiRho Events will never ask for your password via email</li>
      <li>If you didn't request this reset, please contact support</li>
    </ul>

    <p style="font-size: 14px; color: #666;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${resetUrl}" style="word-break: break-all;">${resetUrl}</a>
    </p>
  `, { organizationName: 'ChiRho Events', preheader: 'Reset your ChiRho Events password' })
}

/**
 * Generate event reminder email
 */
export function generateEventReminderEmail({
  participantName,
  eventName,
  eventDate,
  eventLocation,
  checkInTime,
  accessCode,
  organizationName,
  additionalInfo,
}: {
  participantName: string
  eventName: string
  eventDate: string
  eventLocation: string
  checkInTime?: string
  accessCode?: string
  organizationName: string
  additionalInfo?: string
}): string {
  return wrapEmail(`
    <h1>Event Reminder</h1>

    <p>Dear ${participantName},</p>

    <p>This is a reminder that <strong>${eventName}</strong> is coming up soon!</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0; background: #f9f9f9; border-radius: 8px; padding: 20px;">
      <tr>
        <td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${emailDetailRow('Event', eventName)}
            ${emailDetailRow('Date', eventDate)}
            ${emailDetailRow('Location', eventLocation)}
            ${checkInTime ? emailDetailRow('Check-In Time', checkInTime) : ''}
            ${accessCode ? emailDetailRow('Access Code', accessCode) : ''}
          </table>
        </td>
      </tr>
    </table>

    ${additionalInfo ? `
      <h2>Important Information</h2>
      <p>${additionalInfo}</p>
    ` : ''}

    <h2>Checklist Before You Arrive</h2>
    <ul>
      <li>Ensure all liability forms are completed</li>
      <li>Have your access code ready for check-in</li>
      <li>Review the event schedule and packing list</li>
      <li>Bring any required medications or documents</li>
    </ul>

    <p>We look forward to seeing you!</p>

    <p style="font-size: 14px; color: #666;">
      — ${organizationName}
    </p>
  `, { organizationName, preheader: `${eventName} is coming up on ${eventDate}` })
}
