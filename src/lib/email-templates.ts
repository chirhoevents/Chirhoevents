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
                    <!-- Logo -->
                    <img src="${APP_URL}/light-logo-horizontal.png" alt="ChiRho Events" width="220" style="max-width: 220px; height: auto;" />
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
 * Master Admin Email Templates
 * These templates are available for the master admin to send to any email address
 */

export interface MasterAdminEmailTemplate {
  id: string
  name: string
  description: string
  category: 'invitation' | 'announcement' | 'follow_up' | 'general'
  defaultSubject: string
  generateHtml: (data: {
    recipientName?: string
    customMessage?: string
    eventName?: string
    eventDate?: string
    eventLocation?: string
    eventDescription?: string
    ctaUrl?: string
    ctaText?: string
    senderName?: string
  }) => string
}

export const masterAdminEmailTemplates: MasterAdminEmailTemplate[] = [
  {
    id: 'event_invitation',
    name: 'Event Invitation',
    category: 'invitation',
    description: 'Invite someone to register for an event',
    defaultSubject: "You're Invited: {{eventName}}",
    generateHtml: (data) => wrapEmail(`
      <h1 style="color: #1E3A5F; margin-top: 0;">You're Invited!</h1>

      ${data.recipientName ? `<p>Dear ${data.recipientName},</p>` : '<p>Hello,</p>'}

      <p>We are excited to invite you to <strong>${data.eventName || 'our upcoming event'}</strong>!</p>

      ${data.eventDate || data.eventLocation ? `
        <div style="background-color: #F5F1E8; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #9C8466; margin-top: 0;">Event Details</h3>
          ${data.eventDate ? `<p style="margin: 5px 0;"><strong>Date:</strong> ${data.eventDate}</p>` : ''}
          ${data.eventLocation ? `<p style="margin: 5px 0;"><strong>Location:</strong> ${data.eventLocation}</p>` : ''}
        </div>
      ` : ''}

      ${data.eventDescription ? `
        <div style="margin: 20px 0;">
          ${data.eventDescription}
        </div>
      ` : ''}

      ${data.customMessage ? `
        <div style="margin: 20px 0;">
          ${data.customMessage}
        </div>
      ` : ''}

      ${data.ctaUrl ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.ctaUrl}" style="display: inline-block; background-color: #1E3A5F; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
            ${data.ctaText || 'Register Now'}
          </a>
        </div>
      ` : ''}

      <p>We hope to see you there!</p>

      ${data.senderName ? `
        <p style="margin-top: 30px;">
          Warmly,<br>
          <strong>${data.senderName}</strong><br>
          ChiRho Events
        </p>
      ` : ''}
    `, { organizationName: 'ChiRho Events', preheader: `You're invited to ${data.eventName || 'an upcoming event'}` }),
  },
  {
    id: 'general_invitation',
    name: 'General Invitation',
    category: 'invitation',
    description: 'A flexible invitation template for any purpose',
    defaultSubject: 'Invitation from ChiRho Events',
    generateHtml: (data) => wrapEmail(`
      <h1 style="color: #1E3A5F; margin-top: 0;">You're Invited</h1>

      ${data.recipientName ? `<p>Dear ${data.recipientName},</p>` : '<p>Hello,</p>'}

      <div style="margin: 20px 0;">
        ${data.customMessage || '<p>We would like to invite you to learn more about what we have to offer.</p>'}
      </div>

      ${data.ctaUrl ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.ctaUrl}" style="display: inline-block; background-color: #1E3A5F; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
            ${data.ctaText || 'Learn More'}
          </a>
        </div>
      ` : ''}

      ${data.senderName ? `
        <p style="margin-top: 30px;">
          Best regards,<br>
          <strong>${data.senderName}</strong><br>
          ChiRho Events
        </p>
      ` : ''}
    `, { organizationName: 'ChiRho Events', preheader: 'You have received an invitation from ChiRho Events' }),
  },
  {
    id: 'organization_invitation',
    name: 'Organization Invitation',
    category: 'invitation',
    description: 'Invite a diocese or organization to join ChiRho Events',
    defaultSubject: 'Invitation to Join ChiRho Events - Technology Built for Catholic Ministry',
    generateHtml: (data) => wrapEmail(`
      <h1 style="color: #1E3A5F; margin-top: 0; text-align: center;">Join the ChiRho Events Family</h1>

      <p style="text-align: center; font-style: italic; color: #9C8466; margin-bottom: 30px;">
        "For where two or three gather in my name, there am I with them." - Matthew 18:20
      </p>

      ${data.recipientName ? `<p>Dear ${data.recipientName},</p>` : '<p>Dear Friend in Christ,</p>'}

      <p>Grace and peace to you!</p>

      <p>We are reaching out with great joy to invite your organization to join <strong>ChiRho Events</strong> - a comprehensive event management platform created by Catholic ministry leaders, for Catholic ministry leaders. Our name comes from the ancient Chi-Rho symbol, one of the earliest Christograms used by early Christians, reminding us that Christ is at the center of everything we do.</p>

      <p>We understand the unique challenges of organizing faith-based events - from youth retreats and confirmation camps to diocesan conferences and parish gatherings. That is why we built ChiRho Events: to handle the administrative burdens so you can focus on what matters most - <strong>bringing people closer to Christ</strong>.</p>

      <div style="background-color: #1E3A5F; color: white; padding: 25px; border-radius: 8px; margin: 30px 0; text-align: center;">
        <h2 style="margin-top: 0; color: white;">Our Mission</h2>
        <p style="font-size: 18px; margin-bottom: 0;">To serve the Church by providing exceptional technology that empowers ministries to create transformative faith experiences.</p>
      </div>

      <h2 style="color: #1E3A5F; border-bottom: 2px solid #9C8466; padding-bottom: 10px;">Complete Event Management Suite</h2>

      <div style="background-color: #F5F1E8; padding: 25px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #9C8466; margin-top: 0;">Registration Management</h3>
        <ul style="margin: 10px 0; padding-left: 20px; color: #1E3A5F;">
          <li>Group registrations for parishes, schools, and youth groups</li>
          <li>Individual registrations with customizable forms</li>
          <li>Flexible pricing tiers and early bird discounts</li>
          <li>Automatic confirmation emails and reminders</li>
          <li>Waitlist management for popular events</li>
        </ul>
      </div>

      <div style="background-color: #F5F1E8; padding: 25px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #9C8466; margin-top: 0;">Secure Payment Processing</h3>
        <ul style="margin: 10px 0; padding-left: 20px; color: #1E3A5F;">
          <li>Credit card payments via Stripe (PCI compliant)</li>
          <li>Check and cash payment tracking</li>
          <li>Payment plans and partial payments</li>
          <li>Automatic invoicing and receipts</li>
          <li>Financial reporting and reconciliation</li>
        </ul>
      </div>

      <div style="background-color: #F5F1E8; padding: 25px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #9C8466; margin-top: 0;">Digital Liability Forms</h3>
        <ul style="margin: 10px 0; padding-left: 20px; color: #1E3A5F;">
          <li>Custom liability and medical release forms</li>
          <li>Electronic signatures from parents/guardians</li>
          <li>Automatic PDF generation and storage</li>
          <li>Safe Environment certification tracking</li>
        </ul>
      </div>

      <div style="background-color: #F5F1E8; padding: 25px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #9C8466; margin-top: 0;">POROS - Housing and Logistics</h3>
        <p style="color: #666; font-style: italic; margin-top: 5px;">Named after the Greek word for "passage" or "way"</p>
        <ul style="margin: 10px 0; padding-left: 20px; color: #1E3A5F;">
          <li>Room and bed assignments</li>
          <li>Meal group organization</li>
          <li>Small group assignments</li>
          <li>ADA accommodation tracking</li>
          <li>Staff and volunteer management</li>
        </ul>
      </div>

      <div style="background-color: #F5F1E8; padding: 25px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #9C8466; margin-top: 0;">SALVE - Check-In System</h3>
        <p style="color: #666; font-style: italic; margin-top: 5px;">The traditional Catholic greeting meaning "Hail" or "Welcome"</p>
        <ul style="margin: 10px 0; padding-left: 20px; color: #1E3A5F;">
          <li>QR code check-in for fast processing</li>
          <li>Professional name tag printing</li>
          <li>Real-time attendance tracking</li>
          <li>Welcome packet generation</li>
        </ul>
      </div>

      <div style="background-color: #F5F1E8; padding: 25px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #9C8466; margin-top: 0;">RAPHA - Medical Management</h3>
        <p style="color: #666; font-style: italic; margin-top: 5px;">Hebrew for "healer" - as in Jehovah Rapha, "The Lord Who Heals"</p>
        <ul style="margin: 10px 0; padding-left: 20px; color: #1E3A5F;">
          <li>Secure medical information access</li>
          <li>Allergy and dietary restriction tracking</li>
          <li>Medical incident reporting and documentation</li>
          <li>Emergency contact quick access</li>
        </ul>
      </div>

      <h2 style="color: #1E3A5F; border-bottom: 2px solid #9C8466; padding-bottom: 10px;">Why Organizations Choose ChiRho Events</h2>

      <div style="margin: 20px 0;">
        <p><strong style="color: #1E3A5F;">Built for Catholic Ministry</strong> - We understand the unique needs of dioceses, parishes, and Catholic organizations because we come from that world.</p>
        <p><strong style="color: #1E3A5F;">Secure and Compliant</strong> - Your data is protected with enterprise-grade security. We take the protection of minor information seriously.</p>
        <p><strong style="color: #1E3A5F;">Easy to Use</strong> - Intuitive interfaces for administrators and group leaders. No technical expertise required.</p>
        <p><strong style="color: #1E3A5F;">Dedicated Support</strong> - Our team is here to help you succeed with training, onboarding, and ongoing support.</p>
      </div>

      ${data.customMessage ? `
        <div style="background-color: #fff; border-left: 4px solid #9C8466; padding: 20px; margin: 30px 0;">
          ${data.customMessage}
        </div>
      ` : ''}

      <div style="text-align: center; margin: 40px 0;">
        <p style="font-size: 18px; color: #1E3A5F; margin-bottom: 20px;"><strong>Ready to transform how you manage events?</strong></p>
        <a href="${data.ctaUrl || 'https://chirhoevents.com'}" style="display: inline-block; background-color: #1E3A5F; color: white; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 18px;">
          ${data.ctaText || 'Schedule a Demo'}
        </a>
        <p style="margin-top: 15px; color: #666;">
          Or visit us at <a href="https://chirhoevents.com" style="color: #1E3A5F;">chirhoevents.com</a>
        </p>
      </div>

      <div style="background-color: #1E3A5F; color: white; padding: 25px; border-radius: 8px; margin: 30px 0; text-align: center;">
        <p style="font-size: 16px; margin: 0; font-style: italic;">
          "Whatever you do, work at it with all your heart, as working for the Lord, not for human masters."
          <br>- Colossians 3:23
        </p>
      </div>

      <p>We would be honored to serve your organization and support your mission of bringing souls to Christ. Please do not hesitate to reach out with any questions - we are here to help!</p>

      <p>May God bless your ministry abundantly.</p>

      ${data.senderName ? `
        <p style="margin-top: 30px;">
          In Christ,<br>
          <strong>${data.senderName}</strong><br>
          ChiRho Events Team<br>
          <a href="https://chirhoevents.com" style="color: #1E3A5F;">chirhoevents.com</a>
        </p>
      ` : `
        <p style="margin-top: 30px;">
          In Christ,<br>
          <strong>The ChiRho Events Team</strong><br>
          <a href="https://chirhoevents.com" style="color: #1E3A5F;">chirhoevents.com</a>
        </p>
      `}
    `, { organizationName: 'ChiRho Events', preheader: 'Discover how ChiRho Events can help your Catholic ministry thrive' }),
  },
  {
    id: 'announcement',
    name: 'General Announcement',
    category: 'announcement',
    description: 'Send an announcement or update',
    defaultSubject: 'Important Announcement from ChiRho Events',
    generateHtml: (data) => wrapEmail(`
      <h1 style="color: #1E3A5F; margin-top: 0;">${data.eventName || 'Announcement'}</h1>

      ${data.recipientName ? `<p>Dear ${data.recipientName},</p>` : '<p>Hello,</p>'}

      <div style="margin: 20px 0;">
        ${data.customMessage || '<p>We have an important update to share with you.</p>'}
      </div>

      ${data.ctaUrl ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.ctaUrl}" style="display: inline-block; background-color: #1E3A5F; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
            ${data.ctaText || 'Learn More'}
          </a>
        </div>
      ` : ''}

      ${data.senderName ? `
        <p style="margin-top: 30px;">
          Best regards,<br>
          <strong>${data.senderName}</strong><br>
          ChiRho Events
        </p>
      ` : ''}
    `, { organizationName: 'ChiRho Events' }),
  },
  {
    id: 'follow_up',
    name: 'Follow Up',
    category: 'follow_up',
    description: 'Follow up with someone after a meeting or conversation',
    defaultSubject: 'Following Up - ChiRho Events',
    generateHtml: (data) => wrapEmail(`
      <h1 style="color: #1E3A5F; margin-top: 0;">Following Up</h1>

      ${data.recipientName ? `<p>Dear ${data.recipientName},</p>` : '<p>Hello,</p>'}

      <p>Thank you for taking the time to speak with us about ChiRho Events. We wanted to follow up on our conversation.</p>

      ${data.customMessage ? `
        <div style="margin: 20px 0;">
          ${data.customMessage}
        </div>
      ` : ''}

      ${data.ctaUrl ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.ctaUrl}" style="display: inline-block; background-color: #1E3A5F; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
            ${data.ctaText || 'Get Started'}
          </a>
        </div>
      ` : ''}

      <p>Please don't hesitate to reach out if you have any questions. We're here to help!</p>

      ${data.senderName ? `
        <p style="margin-top: 30px;">
          Best regards,<br>
          <strong>${data.senderName}</strong><br>
          ChiRho Events
        </p>
      ` : ''}
    `, { organizationName: 'ChiRho Events', preheader: 'Following up on our conversation' }),
  },
  {
    id: 'welcome',
    name: 'Welcome Email',
    category: 'general',
    description: 'Welcome a new user or contact to ChiRho Events',
    defaultSubject: 'Welcome to ChiRho Events!',
    generateHtml: (data) => wrapEmail(`
      <h1 style="color: #1E3A5F; margin-top: 0;">Welcome to ChiRho Events!</h1>

      ${data.recipientName ? `<p>Dear ${data.recipientName},</p>` : '<p>Hello,</p>'}

      <p>We are thrilled to welcome you to the <strong>ChiRho Events</strong> family! Whether you are here to organize events, manage registrations, or participate in life-changing experiences, we are here to support you every step of the way.</p>

      <div style="background-color: #F5F1E8; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #9C8466; margin-top: 0;">Getting Started</h3>
        <ul style="margin: 10px 0; padding-left: 20px; color: #1E3A5F;">
          <li>Explore your dashboard to see available events</li>
          <li>Set up your profile and preferences</li>
          <li>Browse our help resources if you need guidance</li>
          <li>Reach out to our support team anytime</li>
        </ul>
      </div>

      ${data.customMessage ? `
        <div style="margin: 20px 0;">
          ${data.customMessage}
        </div>
      ` : ''}

      ${data.ctaUrl ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.ctaUrl}" style="display: inline-block; background-color: #1E3A5F; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
            ${data.ctaText || 'Get Started'}
          </a>
        </div>
      ` : ''}

      <p>We are committed to helping you create meaningful, faith-filled experiences. If you have any questions, simply reply to this email or visit our support center.</p>

      <p>Welcome aboard!</p>

      ${data.senderName ? `
        <p style="margin-top: 30px;">
          God bless,<br>
          <strong>${data.senderName}</strong><br>
          ChiRho Events Team
        </p>
      ` : `
        <p style="margin-top: 30px;">
          God bless,<br>
          <strong>The ChiRho Events Team</strong>
        </p>
      `}
    `, { organizationName: 'ChiRho Events', preheader: 'Welcome to the ChiRho Events family!' }),
  },
  {
    id: 'custom',
    name: 'Custom Email',
    category: 'general',
    description: 'A blank template for custom messages',
    defaultSubject: 'Message from ChiRho Events',
    generateHtml: (data) => wrapEmail(`
      ${data.recipientName ? `<p>Dear ${data.recipientName},</p>` : ''}

      <div style="margin: 20px 0;">
        ${data.customMessage || '<p>Please compose your message.</p>'}
      </div>

      ${data.ctaUrl ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.ctaUrl}" style="display: inline-block; background-color: #1E3A5F; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
            ${data.ctaText || 'Click Here'}
          </a>
        </div>
      ` : ''}

      ${data.senderName ? `
        <p style="margin-top: 30px;">
          Best regards,<br>
          <strong>${data.senderName}</strong><br>
          ChiRho Events
        </p>
      ` : ''}
    `, { organizationName: 'ChiRho Events' }),
  },
]

/**
 * Get master admin template by ID
 */
export function getMasterAdminTemplateById(templateId: string): MasterAdminEmailTemplate | undefined {
  return masterAdminEmailTemplates.find(t => t.id === templateId)
}

/**
 * Get master admin templates by category
 */
export function getMasterAdminTemplatesByCategory(category: MasterAdminEmailTemplate['category']): MasterAdminEmailTemplate[] {
  return masterAdminEmailTemplates.filter(t => t.category === category)
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

/**
 * Generate group registration confirmation email with QR code and next steps
 */
/**
 * Generate waitlist confirmation email when someone joins the waitlist
 */
export function generateWaitlistConfirmationEmail({
  name,
  eventName,
  position,
  partySize,
  organizationName,
  eventUrl,
}: {
  name: string
  eventName: string
  position: number
  partySize: number
  organizationName: string
  eventUrl?: string
}): string {
  return wrapEmail(`
    <h1>You're on the Waitlist!</h1>

    <p>Dear ${name},</p>

    <p>Thank you for your interest in <strong>${eventName}</strong>. You have been added to the waitlist.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0; background: #f0f7ff; border-radius: 8px; padding: 20px; text-align: center;">
      <tr>
        <td>
          <p style="margin: 0; font-size: 14px; color: #666;">Your Position in Line</p>
          <p style="margin: 8px 0 0 0; font-size: 48px; font-weight: bold; color: #1E3A5F;">#${position}</p>
          ${partySize > 1 ? `<p style="margin: 8px 0 0 0; font-size: 14px; color: #666;">Requesting ${partySize} spots</p>` : ''}
        </td>
      </tr>
    </table>

    <h2>What Happens Next?</h2>
    <ul>
      <li><strong>We'll notify you</strong> if a spot becomes available</li>
      <li><strong>Check your email</strong> - you'll receive an invitation to register when it's your turn</li>
      <li><strong>Act quickly</strong> - invitations are time-sensitive</li>
    </ul>

    ${emailInfoBox(`
      <strong>No action required right now.</strong><br>
      We'll contact you as soon as a spot opens up. Make sure to add our email to your contacts so you don't miss the notification!
    `, 'info')}

    ${eventUrl ? emailButton('View Event Details', eventUrl, 'secondary') : ''}

    <p>Thank you for your patience. We hope to see you at the event!</p>

    <p style="font-size: 14px; color: #666;">
      — ${organizationName}
    </p>
  `, { organizationName, preheader: `You're #${position} on the waitlist for ${eventName}` })
}

/**
 * Generate waitlist invitation email when a spot opens up
 */
export function generateWaitlistInvitationEmail({
  name,
  eventName,
  partySize,
  organizationName,
  registrationUrl,
  expiresIn,
}: {
  name: string
  eventName: string
  partySize: number
  organizationName: string
  registrationUrl: string
  expiresIn?: string
}): string {
  return wrapEmail(`
    <h1>A Spot is Available!</h1>

    <p>Dear ${name},</p>

    <p>Great news! A spot has opened up for <strong>${eventName}</strong>, and you're next in line!</p>

    ${emailInfoBox(`
      <strong>You have been invited to register!</strong><br>
      ${partySize > 1 ? `We have ${partySize} spots reserved for you.` : 'Your spot is reserved.'}
      ${expiresIn ? ` Please complete your registration within ${expiresIn}.` : ''}
    `, 'success')}

    <div style="text-align: center; margin: 30px 0;">
      ${emailButton('Register Now', registrationUrl, 'primary')}
    </div>

    <h2>Important Notes</h2>
    <ul>
      <li><strong>Don't wait</strong> - this invitation is time-sensitive</li>
      <li><strong>Complete your registration</strong> to secure your spot</li>
      <li>If you no longer wish to attend, simply ignore this email and the spot will go to the next person</li>
    </ul>

    ${expiresIn ? emailInfoBox(`
      <strong>Time-Sensitive:</strong> This invitation expires in ${expiresIn}. After that, your spot will be offered to the next person on the waitlist.
    `, 'warning') : ''}

    <p>If you have any questions, please don't hesitate to reach out.</p>

    <p style="font-size: 14px; color: #666;">
      — ${organizationName}
    </p>
  `, { organizationName, preheader: `A spot opened up for ${eventName} - Register now!` })
}

export function generateGroupRegistrationConfirmationEmail({
  groupName,
  groupLeaderName,
  eventName,
  accessCode,
  confirmationPageUrl,
  totalParticipants,
  totalAmount,
  depositAmount,
  balanceRemaining,
  paymentMethod,
  checkPayableTo,
  checkMailingAddress,
  registrationInstructions,
  customMessage,
  organizationName,
  porosLiabilityUrl,
  groupLeaderPortalUrl,
}: {
  groupName: string
  groupLeaderName: string
  eventName: string
  accessCode: string
  confirmationPageUrl: string
  totalParticipants: number
  totalAmount: number
  depositAmount: number
  balanceRemaining: number
  paymentMethod: 'card' | 'check'
  checkPayableTo?: string
  checkMailingAddress?: string
  registrationInstructions?: string
  customMessage?: string
  organizationName: string
  porosLiabilityUrl: string
  groupLeaderPortalUrl: string
}): string {
  const formatCurrency = (amount: number) => `$${(amount / 100).toFixed(2)}`

  const paymentSection = paymentMethod === 'check' ? `
    <h2>Payment Information</h2>
    <p>You have selected to pay by check. Please mail your payment to:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0; background: #fff3cd; border-radius: 8px; padding: 16px; border-left: 4px solid #ffc107;">
      <tr>
        <td>
          <p style="margin: 0;"><strong>Make check payable to:</strong> ${checkPayableTo || organizationName}</p>
          ${checkMailingAddress ? `<p style="margin: 8px 0 0 0;"><strong>Mail to:</strong><br>${checkMailingAddress.replace(/\n/g, '<br>')}</p>` : ''}
          <p style="margin: 8px 0 0 0;"><strong>Amount Due:</strong> ${formatCurrency(depositAmount)}</p>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: #666;">Please include your group name "${groupName}" on the memo line.</p>
        </td>
      </tr>
    </table>
  ` : `
    <h2>Payment Confirmed</h2>
    <p>Your deposit of <strong>${formatCurrency(depositAmount)}</strong> has been successfully processed.</p>
  `

  return wrapEmail(`
    <h1>Registration Confirmed!</h1>

    <p>Dear ${groupLeaderName},</p>

    <p>Thank you for registering <strong>${groupName}</strong> for <strong>${eventName}</strong>!</p>

    ${customMessage ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0; background: #f0f7ff; border-radius: 8px; padding: 16px; border-left: 4px solid #1a73e8;">
      <tr>
        <td>
          <p style="margin: 0;">${customMessage.replace(/\n/g, '<br>')}</p>
        </td>
      </tr>
    </table>
    ` : ''}

    <!-- Access Code -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0; background: #e8f4fd; border-radius: 8px; padding: 20px; text-align: center;">
      <tr>
        <td>
          <p style="margin: 0; font-size: 14px; color: #666;">Your Group Access Code</p>
          <p style="margin: 8px 0 0 0; font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1a73e8;">${accessCode}</p>
        </td>
      </tr>
    </table>

    <!-- View QR Code Button -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0; text-align: center;">
      <tr>
        <td align="center">
          <p style="margin: 0 0 12px 0; font-size: 14px; color: #666;">Your QR code for check-in is available on your confirmation page</p>
          ${emailButton('View QR Code & Confirmation', confirmationPageUrl, 'primary')}
        </td>
      </tr>
    </table>

    <!-- Registration Summary -->
    <h2>Registration Summary</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0; background: #f9f9f9; border-radius: 8px; padding: 20px;">
      <tr>
        <td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${emailDetailRow('Group Name', groupName)}
            ${emailDetailRow('Event', eventName)}
            ${emailDetailRow('Total Participants', totalParticipants.toString())}
            ${emailDetailRow('Total Amount', formatCurrency(totalAmount))}
            ${emailDetailRow('Deposit Paid', formatCurrency(depositAmount))}
            ${emailDetailRow('Balance Remaining', formatCurrency(balanceRemaining))}
          </table>
        </td>
      </tr>
    </table>

    ${paymentSection}

    <!-- Next Steps -->
    <h2>Next Steps</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0;">
      <tr>
        <td>
          <!-- Step 1: Mail Your Check -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
            <tr>
              <td width="40" valign="top" style="padding-right: 12px;">
                <div style="width: 32px; height: 32px; background: #1a73e8; border-radius: 50%; color: white; font-weight: bold; text-align: center; line-height: 32px;">1</div>
              </td>
              <td valign="top">
                <p style="margin: 0; font-weight: bold;">Mail Your Check</p>
                <p style="margin: 4px 0 0 0; font-size: 14px; color: #666;">Send your check using the instructions above.</p>
              </td>
            </tr>
          </table>

          <!-- Step 2: Complete Liability Forms -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
            <tr>
              <td width="40" valign="top" style="padding-right: 12px;">
                <div style="width: 32px; height: 32px; background: #1a73e8; border-radius: 50%; color: white; font-weight: bold; text-align: center; line-height: 32px;">2</div>
              </td>
              <td valign="top">
                <p style="margin: 0; font-weight: bold;">Complete Liability Forms</p>
                <p style="margin: 4px 0 0 0; font-size: 14px; color: #666;">Each participant must complete their liability form using your access code. They can go to the Poros liability platform.</p>
                ${emailButton('Go to Poros Liability', porosLiabilityUrl, 'primary')}
              </td>
            </tr>
          </table>

          <!-- Step 3: Set Up Group Leader Dashboard -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
            <tr>
              <td width="40" valign="top" style="padding-right: 12px;">
                <div style="width: 32px; height: 32px; background: #1a73e8; border-radius: 50%; color: white; font-weight: bold; text-align: center; line-height: 32px;">3</div>
              </td>
              <td valign="top">
                <p style="margin: 0; font-weight: bold;">Set Up Your Group Leader Dashboard</p>
                <p style="margin: 4px 0 0 0; font-size: 14px; color: #666;">Sign in if you have used Chiro in the past and add your new access code, or sign up using Clerk!</p>
                ${emailButton('Go to Group Leader Portal', groupLeaderPortalUrl, 'secondary')}
              </td>
            </tr>
          </table>

          <!-- Step 4: Sent a Check? -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
            <tr>
              <td width="40" valign="top" style="padding-right: 12px;">
                <div style="width: 32px; height: 32px; background: #1a73e8; border-radius: 50%; color: white; font-weight: bold; text-align: center; line-height: 32px;">4</div>
              </td>
              <td valign="top">
                <p style="margin: 0; font-weight: bold;">Sent a Check?</p>
                <p style="margin: 4px 0 0 0; font-size: 14px; color: #666;">We'll email you once your check is received and processed.</p>
              </td>
            </tr>
          </table>

          <!-- Step 5: QR Code Email -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
            <tr>
              <td width="40" valign="top" style="padding-right: 12px;">
                <div style="width: 32px; height: 32px; background: #1a73e8; border-radius: 50%; color: white; font-weight: bold; text-align: center; line-height: 32px;">5</div>
              </td>
              <td valign="top">
                <p style="margin: 0; font-weight: bold;">Check-In Information Coming Soon</p>
                <p style="margin: 4px 0 0 0; font-size: 14px; color: #666;">You will receive an email with your QR code for check-in and further instructions closer to the Conference!</p>
              </td>
            </tr>
          </table>

          <!-- Step 6: Questions -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
            <tr>
              <td width="40" valign="top" style="padding-right: 12px;">
                <div style="width: 32px; height: 32px; background: #1a73e8; border-radius: 50%; color: white; font-weight: bold; text-align: center; line-height: 32px;">6</div>
              </td>
              <td valign="top">
                <p style="margin: 0; font-weight: bold;">Questions?</p>
                <p style="margin: 4px 0 0 0; font-size: 14px; color: #666;">Reply to this email or contact the event organizer.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${registrationInstructions ? `
      <h2>Additional Instructions</h2>
      <p>${registrationInstructions}</p>
    ` : ''}

    <p style="font-size: 14px; color: #666;">
      — ${organizationName}
    </p>
  `, { organizationName, preheader: `Registration confirmed for ${groupName} - ${eventName}` })
}
