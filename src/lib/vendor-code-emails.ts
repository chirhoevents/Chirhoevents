/**
 * Shared "what are my codes and what do I do with them" block for vendor emails.
 *
 * A vendor ends up with up to three different codes, each for a different
 * person and purpose. Both the approval email and the "resend codes" email use
 * this so the explanation is identical everywhere.
 *
 *   VND-XXXXXX           Staff Code      → shared with booth staff
 *   VNDACC-XXXXXXXX      Portal Code     → private, the vendor contact's login
 *   VNDPOR-YYYY-XXXXXX   Liability Code  → private, only when the event
 *                                          requires liability forms
 */

import { emailButton, emailInfoBox } from '@/lib/email-templates'

export interface VendorCodesGuideInput {
  baseUrl: string
  eventSlug: string
  eventName: string
  /** VND-XXXXXX: for booth staff */
  vendorCode: string
  /** VNDACC-XXXXXXXX: vendor contact's portal login */
  accessCode: string
  /** VNDPOR-YYYY-XXXXXX: only present when the event requires liability forms */
  porosAccessCode?: string | null
  /** Where to send the Safe Environment certificate if they don't have it handy */
  supportEmail?: string | null
}

export function vendorPortalUrl(baseUrl: string, accessCode: string): string {
  return `${baseUrl}/vendor-dashboard?code=${encodeURIComponent(accessCode)}`
}

export function vendorStaffRegistrationUrl(baseUrl: string, eventSlug: string): string {
  return `${baseUrl}/events/${eventSlug}/register-staff`
}

export function vendorLiabilityUrl(baseUrl: string, porosAccessCode: string): string {
  return `${baseUrl}/poros?code=${encodeURIComponent(porosAccessCode)}`
}

function codeBlock(code: string): string {
  return `<div style="font-family: monospace; font-size: 26px; font-weight: bold; letter-spacing: 3px; color: #1E3A5F; margin: 8px 0 4px 0;">${code}</div>`
}

function stepHeader(n: number, title: string, tag: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0 8px 0;">
      <tr>
        <td width="40" valign="top" style="padding-right: 12px;">
          <div style="width: 32px; height: 32px; background: #1E3A5F; border-radius: 50%; color: #ffffff; font-weight: bold; text-align: center; line-height: 32px;">${n}</div>
        </td>
        <td valign="top">
          <p style="margin: 0; font-size: 18px; font-weight: bold; color: #1E3A5F;">${title}</p>
          <p style="margin: 2px 0 0 0; font-size: 13px; color: #666666;">${tag}</p>
        </td>
      </tr>
    </table>`
}

export function vendorCodesGuideHtml(input: VendorCodesGuideInput): string {
  const { baseUrl, eventSlug, eventName, vendorCode, accessCode, porosAccessCode, supportEmail } = input
  const hasLiability = !!porosAccessCode

  const portalUrl = vendorPortalUrl(baseUrl, accessCode)
  const staffUrl = vendorStaffRegistrationUrl(baseUrl, eventSlug)
  const liabilityUrl = porosAccessCode ? vendorLiabilityUrl(baseUrl, porosAccessCode) : null

  const summaryRow = (label: string, code: string, who: string, what: string, last = false) => `
    <tr>
      <td style="padding: 12px 10px; ${last ? '' : 'border-bottom: 1px solid #e5e5e5;'} vertical-align: top;">
        <strong style="color: #1E3A5F;">${label}</strong><br>
        <span style="font-family: monospace; font-size: 13px; color: #444444;">${code}</span>
      </td>
      <td style="padding: 12px 10px; ${last ? '' : 'border-bottom: 1px solid #e5e5e5;'} vertical-align: top; font-size: 14px; color: #444444;">
        <strong>${who}</strong><br>${what}
      </td>
    </tr>`

  const summary = `
    <h2>Your codes at a glance</h2>
    <p style="font-size: 14px; color: #444444;">
      Each code below is for a <strong>different person</strong> and a <strong>different job</strong>,
      so please don&rsquo;t use one in place of another.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 12px 0; background: #f9f9f9; border-radius: 8px;">
      ${summaryRow(
        'Vendor Portal Code',
        accessCode,
        'You (keep private)',
        'Logs you into your vendor portal to pay your invoice, upload your logo and see your booth staff.'
      )}
      ${
        hasLiability
          ? summaryRow(
              'Liability Form Code',
              porosAccessCode!,
              'You (keep private)',
              'Used on the liability form page to complete your own liability form and Safe Environment certificate.'
            )
          : ''
      }
      ${summaryRow(
        'Booth Staff Code',
        vendorCode,
        'Your booth staff (share it)',
        'Each person working your booth enters this when they register. Do not use it to log in or for the liability form.',
        true
      )}
    </table>`

  let n = 1
  const steps: string[] = []

  // Step: portal
  steps.push(`
    ${stepHeader(n++, 'Pay your invoice in your vendor portal', 'For you &middot; uses your Vendor Portal Code')}
    <p style="font-size: 14px; color: #444444; margin: 0 0 8px 0;">
      Open your portal to see your invoice and pay online, upload your logo, and check which booth staff have registered.
      This link already includes your code, so you can just click it. If the portal asks for a code, enter:
    </p>
    ${codeBlock(accessCode)}
    <p style="font-size: 12px; color: #999999; margin: 0 0 12px 0;">Keep this private. It controls payment and all of your booth&rsquo;s information.</p>
    ${emailButton('Open My Vendor Portal', portalUrl, 'primary')}`)

  // Step: liability (only when required)
  if (hasLiability && liabilityUrl) {
    steps.push(`
    ${stepHeader(n++, 'Complete your liability form', 'For you &middot; uses your Liability Form Code &middot; required for this event')}
    <p style="font-size: 14px; color: #444444; margin: 0 0 8px 0;">
      This event requires every vendor contact to complete a liability form and provide a Safe Environment certificate.
      This form is for <strong>you only</strong>. Your booth staff complete their own (see the next step).
      Click the button, or go to the liability form page and enter this code:
    </p>
    ${codeBlock(porosAccessCode!)}
    ${emailButton('Complete My Liability Form', liabilityUrl, 'primary')}
    ${
      supportEmail
        ? `<p style="font-size: 13px; color: #666666; text-align: center; margin-top: 8px;">
        Don&rsquo;t have your Safe Environment certificate handy? You can finish the form now and email a copy to
        <a href="mailto:${supportEmail}" style="color: #1E3A5F;">${supportEmail}</a>, and we&rsquo;ll add it to your record.
      </p>`
        : ''
    }`)
  }

  // Step: booth staff
  steps.push(`
    ${stepHeader(n++, 'Have your booth staff register', 'For your staff &middot; uses your Booth Staff Code')}
    <p style="font-size: 14px; color: #444444; margin: 0 0 8px 0;">
      Send everyone who will work your booth the registration link below and your Booth Staff Code.
      Each person registers on their own, entering their own name and details, plus this code so they&rsquo;re linked to your booth:
    </p>
    ${codeBlock(vendorCode)}
    ${emailButton('Booth Staff Registration', staffUrl, 'secondary')}
    <p style="font-size: 13px; color: #666666; text-align: center; margin: 8px 0 0 0;">Or copy this link: <a href="${staffUrl}" style="color: #1E3A5F;">${staffUrl}</a></p>
    ${
      hasLiability
        ? `<p style="font-size: 13px; color: #666666; margin-top: 12px;">After registering, each staff member receives their own personal liability form code by email. They fill out their own form with it. They never need yours.</p>`
        : ''
    }`)

  const intro = emailInfoBox(
    `<strong>Keep this email.</strong> It has everything you need for <strong>${eventName}</strong>: what each code is for, who should use it, and what to do next.`,
    'info'
  )

  return `${intro}${summary}<h2>What to do next</h2>${steps.join('')}`
}
