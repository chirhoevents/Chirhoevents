/**
 * From address for Poros liability-form emails (parent requests, reminders,
 * completion confirmations, access codes).
 *
 * Kept separate from RESEND_FROM_EMAIL so liability mail is visibly distinct
 * from general event mail. Any address on the verified chirhoevents.com
 * Resend domain can send; Reply-To still routes replies to the organizer.
 */
export const POROS_FROM = `ChiRho Poros <${
  process.env.RESEND_POROS_FROM_EMAIL || 'poros@chirhoevents.com'
}>`

/**
 * "Complete your teen's liability form" email for a parent/guardian, used when
 * the link is resent or a reminder goes out (by an admin or the group leader).
 *
 * The expiry line is worked out from the token's real expiry date: a resend
 * reuses a still-valid token, so a fixed "expires in N days" is often wrong.
 */
export function buildParentLiabilityFormEmail({
  firstName,
  lastName,
  eventName,
  parentLink,
  expiresAt,
}: {
  firstName: string
  lastName: string
  eventName: string
  parentLink: string
  expiresAt: Date | null
}): { subject: string; html: string } {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'

  let expiryText = 'If this link stops working, contact us for a new one.'
  if (expiresAt) {
    const msLeft = expiresAt.getTime() - Date.now()
    const daysLeft = Math.round(msLeft / (24 * 60 * 60 * 1000))
    const expiresIn = msLeft < 24 * 60 * 60 * 1000
      ? 'within 24 hours'
      : `in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`
    expiryText = `This link expires ${expiresIn}. If it expires before you complete the form, contact us for a new one.`
  }

  return {
    subject: `ACTION REQUIRED: Complete ${firstName} ${lastName}'s liability form - ${eventName}`,
    html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; padding: 20px 0; background-color: #1E3A5F;">
            <img src="${appUrl}/Poros logo.png" alt="ChiRho Events" style="max-width: 250px; height: auto;" />
          </div>

          <div style="background-color: #B91C1C; padding: 12px 20px; text-align: center;">
            <p style="color: #ffffff; margin: 0; font-weight: bold; font-size: 14px; letter-spacing: 0.5px;">
              ⚠️ REMINDER — REGISTRATION IS NOT COMPLETE
            </p>
          </div>

          <div style="padding: 30px 20px;">
            <h1 style="color: #1E3A5F; margin-top: 0;">Complete ${firstName}'s Liability Form</h1>

            <p>Hi,</p>

            <p>
              <strong>${firstName} ${lastName}</strong> is registered for
              <strong>${eventName}</strong>, but <strong>they cannot attend until you complete
              and sign their liability form</strong>. As their parent/guardian, only you can complete this step.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${parentLink}" style="display: inline-block; padding: 15px 30px; background-color: #B91C1C; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                Complete Form Now (Takes ~5 Minutes)
              </a>
            </div>

            <p style="color: #666; font-size: 14px;">
              Or copy and paste this link into your browser:<br>
              <a href="${parentLink}" style="color: #1E3A5F;">${parentLink}</a>
            </p>

            <div style="background-color: #FFF3CD; padding: 15px; border-left: 4px solid #FFC107; margin: 20px 0;">
              <p style="color: #856404; margin: 0; font-size: 14px;">
                ${expiryText}
              </p>
            </div>

            <p style="margin-top: 30px;">Pax Christi,<br><strong>ChiRho Events Team</strong></p>

            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

            <p style="color: #666; font-size: 12px; text-align: center;">
              © ${new Date().getFullYear()} ChiRho Events. All rights reserved.
            </p>
          </div>
        </div>
      `,
  }
}
