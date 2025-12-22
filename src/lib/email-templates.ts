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

// Base email wrapper
const wrapEmail = (content: string) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <!-- ChiRho Events Logo Header -->
    <div style="text-align: center; padding: 20px 0; background-color: #1E3A5F;">
      <img src="${APP_URL}/logo-horizontal.png" alt="ChiRho Events" style="max-width: 200px; height: auto;" />
    </div>

    <div style="padding: 30px 20px;">
      ${content}

      <p style="color: #666; font-size: 12px; margin-top: 30px;">
        © 2025 ChiRho Events. All rights reserved.
      </p>
    </div>
  </div>
`

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
