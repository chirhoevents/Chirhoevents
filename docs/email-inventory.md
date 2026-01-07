# ChiRho Events - Email Inventory

This document catalogs all email sending functionality in the ChiRho Events platform.

## Quick Reference

| Email Type | Location | Recipient | Status |
|------------|----------|-----------|--------|
| Group Registration (Check) | `api/registration/group/route.ts` | Group Leader | Implemented |
| Individual Registration | `api/registration/individual/route.ts` | Registrant | Implemented |
| Parent Liability Form | `api/liability/youth-u18/initiate/route.ts` | Parent | Implemented |
| Parent Form Completion | `api/liability/youth-u18/complete/route.ts` | Parent | Implemented |
| Group Leader Notification | `api/liability/youth-u18/complete/route.ts` | Group Leader | Implemented |
| Clergy Form Confirmation | `api/liability/clergy/submit/route.ts` | Clergy | Implemented |
| Clergy Group Leader Notify | `api/liability/clergy/submit/route.ts` | Group Leader | Implemented |
| Chaperone Form Confirmation | `api/liability/youth-o18-chaperone/submit/route.ts` | Chaperone | Implemented |
| Chaperone Group Leader Notify | `api/liability/youth-o18-chaperone/submit/route.ts` | Group Leader | Implemented |
| Payment Confirmation (Stripe) | `api/webhooks/stripe/route.ts` | Registrant | Implemented |
| Org Admin Onboarding | `api/master-admin/organizations/route.ts` | Org Admin | Implemented |
| Org Admin Resend Onboarding | `api/master-admin/organizations/[orgId]/resend-onboarding/route.ts` | Org Admin | Implemented |
| Admin Change Notification | `api/master-admin/organizations/[orgId]/change-admin/route.ts` | New Admin | Implemented |
| Team Invite | `api/admin/settings/team/route.ts` | Invitee | Implemented |
| Team Invite Resend | `api/admin/settings/team/[userId]/resend/route.ts` | Invitee | Implemented |
| Payment Recorded (Admin) | `api/admin/payments/record/route.ts` | Registrant | Implemented |
| Check Received | `api/admin/payments/[paymentId]/mark-check-received/route.ts` | Group Leader | Implemented |
| Check Payment Record | `api/admin/payments/check/record/route.ts` | Group Leader | Implemented |
| Virtual Terminal Receipt | `api/admin/virtual-terminal/process/route.ts` | Registrant | Implemented |
| Invoice Email | `api/admin/invoices/[invoiceId]/send-email/route.ts` | Registrant | Implemented |
| Refund Notification | `api/admin/refunds/route.ts` | Registrant | Implemented |
| Manual Registration | `api/admin/registrations/manual/route.ts` | Registrant | Implemented |
| Registration Update (Admin) | `api/admin/registrations/group/[id]/route.ts` | Group Leader | Implemented |
| Registration Update (Indiv) | `api/admin/registrations/individual/[id]/route.ts` | Registrant | Implemented |
| Email Resend (Admin) | `api/admin/registrations/[registrationId]/emails/route.ts` | Registrant | Implemented |
| Participant Update | `api/admin/participants/[participantId]/edit/route.ts` | Parent | Implemented |
| Bulk Email Send | `api/admin/emails/bulk-send/route.ts` | Multiple | Implemented |
| Bulk Form Reminders | `api/group-leader/forms/bulk-email-reminders/route.ts` | Parents | Implemented |
| Form Resend (Group Leader) | `api/group-leader/forms/resend-email/route.ts` | Parent | Implemented |
| Registration Edit Confirm | `api/group-leader/registration/edit/route.ts` | Group Leader | Implemented |
| Support Ticket Created | `api/support-tickets/route.ts` | Submitter | Implemented |
| Medical Incident (Rapha) | `api/admin/events/[eventId]/rapha/email/route.ts` | Parent | Implemented |
| Onboarding Request Approved | `api/master-admin/onboarding-requests/[requestId]/approve/route.ts` | Org Admin | Implemented |

---

## Email Configuration

### Environment Variables

```
RESEND_API_KEY=re_xxxxxxxxxxxxx     # Resend API key
RESEND_FROM_EMAIL=hello@chirhoevents.com  # Default from email
```

### Resend Package
- Version: 3.5.0
- Location: Each API route creates its own `new Resend()` instance

### Email Logging
All emails are logged via `src/lib/email-logger.ts` which stores:
- Organization ID
- Event ID
- Registration ID
- Recipient email
- Email type
- Subject
- HTML content
- Send status (sent/failed)
- Metadata

---

## Email Templates Library

Located at: `src/lib/email-templates.ts`

### Template Functions
- `wrapEmail()` - Professional email wrapper with branding
- `emailButton()` - Styled CTA buttons
- `emailInfoBox()` - Info/success/warning/error boxes
- `emailDetailRow()` - Receipt-style detail rows

### Pre-built Templates
1. `registration_confirmation` - Registration confirmed
2. `payment_reminder` - Payment due reminder
3. `payment_received` - Payment confirmation
4. `forms_reminder` - Liability forms reminder
5. `event_update` - Event announcements
6. `welcome_access_code` - Access code delivery
7. `check_in_instructions` - Check-in details
8. `custom_message` - Custom admin message

### Specialized Templates
- `generateOrganizationWelcomeEmail()` - New org welcome
- `generateInvoiceEmail()` - Invoice with payment link
- `generateSupportTicketConfirmationEmail()` - Ticket received
- `generateSupportTicketResponseEmail()` - Ticket response
- `generatePasswordResetEmail()` - Password reset
- `generateEventReminderEmail()` - Event reminder
- `generateVirtualTerminalReceipt()` - Virtual terminal receipt
- `generateMedicalIncidentParentEmail()` - Medical incident notification
- `generateMedicalIncidentResolvedEmail()` - Incident resolved
- `generateMedicalIncidentGroupLeaderEmail()` - Group leader notification

---

## Detailed Email Inventory

### 1. Registration Emails

#### Group Registration - Check Payment
- **File:** `src/app/api/registration/group/route.ts:344`
- **Trigger:** Group registration with check payment
- **Recipient:** Group leader email
- **Subject:** `Registration Received - {eventName}`
- **Content:**
  - Access code
  - Check payment instructions
  - Registration summary
  - Next steps

#### Individual Registration
- **File:** `src/app/api/registration/individual/route.ts:372`
- **Trigger:** Individual registration completion
- **Recipient:** Registrant email
- **Subject:** Registration confirmation
- **Content:**
  - Registration details
  - Next steps

---

### 2. Liability Form Emails

#### Parent Form Request (Youth U18)
- **File:** `src/app/api/liability/youth-u18/initiate/route.ts:86`
- **Trigger:** Youth initiates liability form
- **Recipient:** Parent email
- **Subject:** `Complete Liability Form for {name} - {eventName}`
- **Content:**
  - Participant info
  - Form link with token
  - 7-day expiration warning
  - What to bring

#### Parent Form Completion
- **File:** `src/app/api/liability/youth-u18/complete/route.ts:164`
- **Trigger:** Parent completes liability form
- **Recipient:** Parent email
- **Subject:** Form completion confirmation
- **Content:**
  - Confirmation message
  - PDF attachment (if enabled)

#### Group Leader Notification (U18)
- **File:** `src/app/api/liability/youth-u18/complete/route.ts:226`
- **Trigger:** Parent completes liability form
- **Recipient:** Group leader email
- **Content:**
  - Participant name
  - Form completed notification

#### Clergy Form Confirmation
- **File:** `src/app/api/liability/clergy/submit/route.ts:188`
- **Trigger:** Clergy submits form
- **Recipient:** Clergy email
- **Content:**
  - Confirmation message

#### Chaperone Form Confirmation
- **File:** `src/app/api/liability/youth-o18-chaperone/submit/route.ts:222`
- **Trigger:** Chaperone submits form
- **Recipient:** Chaperone email
- **Content:**
  - Confirmation message

---

### 3. Payment Emails

#### Stripe Payment Confirmation
- **File:** `src/app/api/webhooks/stripe/route.ts:199`
- **Trigger:** Successful Stripe payment
- **Recipient:** Registrant email
- **Content:**
  - Payment amount
  - Receipt details
  - Remaining balance

#### Admin Payment Record
- **File:** `src/app/api/admin/payments/record/route.ts:323`
- **Trigger:** Admin records manual payment
- **Recipient:** Registrant email
- **Content:**
  - Payment confirmation
  - Updated balance

#### Check Received
- **File:** `src/app/api/admin/payments/[paymentId]/mark-check-received/route.ts:160`
- **Trigger:** Admin marks check as received
- **Recipient:** Group leader email
- **Content:**
  - Check received confirmation
  - Updated balance

#### Refund Notification
- **File:** `src/app/api/admin/refunds/route.ts:229`
- **Trigger:** Refund processed
- **Recipient:** Registrant email
- **Content:**
  - Refund amount
  - Refund reason

---

### 4. Organization/Admin Emails

#### Org Admin Onboarding
- **File:** `src/emails/org-admin-onboarding.ts`
- **Trigger:** Master admin creates organization
- **Recipient:** Org admin email
- **Subject:** `Welcome to ChiRho Events!`
- **Content:**
  - Account creation link
  - Stripe setup instructions
  - Event creation guide
  - Team invitation guide
  - Platform features overview

#### Team Member Invite
- **File:** `src/emails/org-admin-onboarding.ts:generateTeamInviteEmail()`
- **Trigger:** Admin invites team member
- **Recipient:** Invitee email
- **Content:**
  - Invitation from inviter
  - Role description
  - Accept invitation button

---

### 5. Support Emails

#### Support Ticket Created
- **File:** `src/app/api/support-tickets/route.ts:139`
- **Trigger:** User submits support ticket
- **Recipient:** Submitter email
- **Content:**
  - Ticket ID
  - Ticket details
  - Response timeline

---

### 6. Medical (Rapha) Emails

#### Medical Incident Notification
- **File:** `src/app/api/admin/events/[eventId]/rapha/email/route.ts:181`
- **Trigger:** Medical staff logs incident
- **Recipient:** Parent email
- **Content:**
  - Incident details
  - Treatment provided
  - Contact information

---

## Test Email Endpoint

Location: `src/app/api/test-email/route.ts`

**GET** `/api/test-email` - Shows test form UI (development only)

**POST** `/api/test-email` - Send test email
```json
{
  "to": "test@example.com",
  "type": "basic|registration|access-code|parent|payment|org-welcome"
}
```

---

## Branding Standards

All emails should follow these standards:

### Colors
- Primary: `#1E3A5F` (Navy blue)
- Secondary: `#9C8466` (Gold/brown)
- Background: `#F5F1E8` (Cream)

### Taglines
- "Built by Ministry for Ministry"
- "Catholic Event Management"

### Important Notes
- Use "Catholic ministry events" (NOT "youth ministry")
- Include reply-to: support@chirhoevents.com
- Include footer with privacy/terms links
- Use professional email wrapper from email-templates.ts

---

## Resend Dashboard

Monitor email delivery at: https://resend.com/emails

Check domain status at: https://resend.com/domains

---

## Domain Setup Requirements

For production, ensure chirhoevents.com is verified in Resend with:
- SPF record
- DKIM records (3 required)
- MX record for bounce handling

For development/testing, use the default .resend.dev domain.

---

## Inbound Email Handling

### Overview

ChiRho Events can receive inbound emails via Resend webhooks. When someone emails support@chirhoevents.com (or other configured addresses), the system:

1. Stores the raw email in `received_emails` table
2. Creates an `InboundSupportTicket`
3. Sends auto-reply with ticket number
4. Forwards email to configured addresses

### Database Models

- **ReceivedEmail** - Raw storage of all inbound emails
- **EmailForward** - Routing configuration per email address
- **InboundSupportTicket** - Support tickets from external senders
- **InboundTicketReply** - Replies on inbound tickets

### Webhook Endpoint

**Location:** `src/app/api/webhooks/resend-inbound/route.ts`

**URL:** `https://chirhoevents.com/api/webhooks/resend-inbound`

### Email Addresses

| Address | Purpose | Auto-Reply | Create Ticket |
|---------|---------|------------|---------------|
| support@chirhoevents.com | Main support | Yes | Yes |
| info@chirhoevents.com | General inquiries | Yes | Yes |
| billing@chirhoevents.com | Billing questions | Yes | Yes |
| legal@chirhoevents.com | Legal matters | No | Yes |
| privacy@chirhoevents.com | Privacy/GDPR | No | Yes |

### Setup Instructions

1. **Add Environment Variable:**
   ```
   RESEND_WEBHOOK_SECRET=whsec_xxxxx
   ```

2. **Run Database Migration:**
   ```bash
   npx prisma db push
   ```

3. **Seed Email Forwards:**
   ```bash
   npx tsx prisma/seed-email-forwards.ts
   ```

4. **Configure Resend Webhook:**
   - Go to https://resend.com/webhooks
   - Add webhook URL: `https://chirhoevents.com/api/webhooks/resend-inbound`
   - Select event: `email.received`
   - Copy webhook secret to environment variables

5. **Verify Domain for Receiving:**
   - Add MX records for inbound email
   - Configure subdomain if needed

### Testing Inbound Emails

For development testing:
1. Use ngrok: `ngrok http 3000`
2. Update webhook URL in Resend dashboard
3. Send test email to configured address
4. Check database for ticket creation

---

Last Updated: January 2026
