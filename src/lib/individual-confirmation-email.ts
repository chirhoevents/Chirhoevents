import {
  eventOffersHousing,
  type IndividualHousingSettings,
  individualAttendanceLines,
  individualLiabilityEmailBlock,
  individualLiabilityFormUrl,
  organizerMessageBlock,
} from '@/lib/individual-registration'

interface ConfirmedRegistration {
  id: string
  firstName: string
  lastName: string
  email: string
  age: number | null
  confirmationCode: string | null
  ticketType: string | null
  housingType: string | null
  roomType: string | null
  includesMealPackage?: boolean | null
  dayPassName?: string | null
  /** The minor's parent link, if this is an under-18 registration at a youth event */
  parentToken?: string | null
}

interface ConfirmedEvent {
  name: string
  startDate: Date
  endDate: Date
  settings: (IndividualHousingSettings & {
    liabilityFormsRequiredIndividual?: boolean | null
    confirmationEmailMessage?: string | null
    registrationInstructions?: string | null
  }) | null
  organization: {
    name: string
    logoUrl?: string | null
    contactEmail?: string | null
    contactPhone?: string | null
    website?: string | null
  }
}

type ConfirmedPayment =
  | { method: 'card'; receiptUrl: string | null }
  // Nothing to pay (free event or a 100% coupon)
  | { method: 'free' }

/**
 * "Registration Confirmed" email for an individual whose registration is
 * complete: sent by the Stripe webhook after a card payment, or right away
 * when there's nothing to pay.
 */
export function buildIndividualConfirmedEmail({
  registration,
  event,
  payment,
}: {
  registration: ConfirmedRegistration
  event: ConfirmedEvent
  payment: ConfirmedPayment
}): { subject: string; html: string } {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'
  const liabilityRequired = !!event.settings?.liabilityFormsRequiredIndividual
  const isMinor = registration.age != null && registration.age < 18
  const attendanceLines = individualAttendanceLines({
    ticketType: registration.ticketType,
    housingType: registration.housingType,
    roomType: registration.roomType,
    housingOffered: eventOffersHousing(event.settings, event.startDate, event.endDate),
    dayPassName: registration.dayPassName,
    settings: event.settings,
    includesMealPackage: registration.includesMealPackage,
  })

  const paymentBlock = payment.method === 'card'
    ? `
      <div style="background-color: #D4EDDA; padding: 20px; border-left: 4px solid #28A745; margin: 20px 0;">
        <h3 style="color: #155724; margin-top: 0;">✓ Payment Confirmed</h3>
        <p style="margin: 5px 0; color: #155724;"><strong>Status:</strong> Paid in Full</p>
        <p style="margin: 5px 0; color: #155724;"><strong>Payment Method:</strong> Credit Card</p>
        ${payment.receiptUrl ? `<p style="margin: 5px 0; color: #155724;"><a href="${payment.receiptUrl}" style="color: #1E3A5F; font-weight: bold;">View Stripe Receipt</a></p>` : ''}
      </div>
    `
    : `
      <div style="background-color: #D4EDDA; padding: 20px; border-left: 4px solid #28A745; margin: 20px 0;">
        <h3 style="color: #155724; margin-top: 0;">✓ No Payment Required</h3>
        <p style="margin: 5px 0; color: #155724;">There is nothing to pay for this registration.</p>
      </div>
    `

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; padding: 20px 0; background-color: #1E3A5F;">
        ${event.organization.logoUrl
          ? `<img src="${appUrl}/logo-horizontal-white.png" alt="${event.organization.name}" style="max-height: 80px; max-width: 300px;" />`
          : `<h1 style="color: white; margin: 0;">${event.organization.name}</h1>`
        }
      </div>

      <div style="padding: 30px 20px;">
        <h1 style="color: #1E3A5F; margin-top: 0;">✅ Registration Confirmed!</h1>

        <p>Dear ${registration.firstName},</p>

        <p>Thank you for registering for <strong>${event.name}</strong>! ${payment.method === 'card'
          ? 'Your payment has been received and your registration is complete.'
          : 'Your registration is complete.'}</p>

        ${organizerMessageBlock(event.settings?.confirmationEmailMessage)}

        <div style="background-color: #E8F4F8; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #1E3A5F;">
          <h2 style="color: #1E3A5F; margin-top: 0;">Your Confirmation Code</h2>
          <div style="background-color: white; padding: 15px; border-radius: 5px; display: inline-block; margin: 10px 0;">
            <span style="font-size: 28px; font-weight: bold; color: #1E3A5F; letter-spacing: 2px; font-family: 'Courier New', monospace;">${registration.confirmationCode || 'N/A'}</span>
          </div>
          <p style="font-size: 14px; color: #666; margin-top: 10px;">
            Keep this code safe! You'll need it to look up your registration.
          </p>
        </div>

        ${paymentBlock}

        <div style="background-color: #F5F5F5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <h3 style="color: #1E3A5F; margin-top: 0;">Your Check-In QR Code</h3>
          <p style="font-size: 16px; color: #1E3A5F; margin: 15px 0;">
            <strong>View and download your QR code on your confirmation page:</strong>
          </p>
          <a href="${appUrl}/registration/confirmation/individual/${registration.id}"
             style="display: inline-block; background-color: #1E3A5F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 0;">
            View My QR Code
          </a>
          <p style="font-size: 14px; color: #666; margin-top: 15px;">
            <strong>Save this QR code!</strong> You'll need it for check-in at the event.
          </p>
        </div>

        <h3 style="color: #1E3A5F;">Registration Summary</h3>
        <div style="background-color: #F5F5F5; padding: 15px; border-radius: 8px;">
          <p style="margin: 5px 0;"><strong>Name:</strong> ${registration.firstName} ${registration.lastName}</p>
          <p style="margin: 5px 0;"><strong>Email:</strong> ${registration.email}</p>
          ${attendanceLines.map(line => `<p style="margin: 5px 0;"><strong>${line.label}:</strong> ${line.value}</p>`).join('')}
        </div>

        <h3 style="color: #1E3A5F;">Next Steps:</h3>
        <ol>
          <li><strong>Save Your QR Code:</strong> Visit your confirmation page to download your QR code for check-in.</li>
          ${liabilityRequired ? `
          <li><strong>${isMinor ? 'Parent/Guardian Completes the Liability Form' : 'Complete Your Liability Form'}:</strong> Use the button below${isMinor ? ` — a parent or guardian must fill out and sign ${registration.firstName}'s form` : ''}.</li>
          ` : ''}
          <li><strong>Check-In:</strong> Bring your QR code (on your phone or printed) to check in at the event.</li>
          <li><strong>Prepare:</strong> Review your confirmation details and pack accordingly.</li>
        </ol>

        ${liabilityRequired ? individualLiabilityEmailBlock({
          url: individualLiabilityFormUrl(appUrl, registration.confirmationCode, isMinor ? registration.parentToken : null),
          isMinor,
          participantFirstName: registration.firstName,
        }) : ''}

        ${event.settings?.registrationInstructions ? `
          <div style="background-color: #F0F8FF; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1E3A5F; margin-top: 0;">Important Information</h3>
            <p style="white-space: pre-line;">${event.settings.registrationInstructions}</p>
          </div>
        ` : ''}

        <p>We can't wait to see you at ${event.name}!</p>

        <div style="background-color: #E8F4FD; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1E3A5F;">
          <h3 style="color: #1E3A5F; margin-top: 0;">Need to Make Changes?</h3>
          <p style="color: #333; margin-bottom: 8px;">
            Individual registrations are managed by <strong>${event.organization.name}</strong>.
            Please contact the organizer directly:
          </p>
          ${event.organization.contactEmail ? `<p style="margin: 4px 0;">📧 <a href="mailto:${event.organization.contactEmail}" style="color: #1E3A5F;">${event.organization.contactEmail}</a></p>` : ''}
          ${event.organization.contactPhone ? `<p style="margin: 4px 0;">📞 <a href="tel:${event.organization.contactPhone}" style="color: #1E3A5F;">${event.organization.contactPhone}</a></p>` : ''}
          ${event.organization.website ? `<p style="margin: 4px 0;">🌐 <a href="${event.organization.website}" style="color: #1E3A5F;">${event.organization.website}</a></p>` : ''}
        </div>

        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          © ${new Date().getFullYear()} ${event.organization.name}. All rights reserved.
        </p>
      </div>
    </div>
  `

  return { subject: `Registration Confirmed - ${event.name}`, html }
}
