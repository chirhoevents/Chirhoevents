import type { Resend } from '@/lib/resend'
import { resolveReplyTo } from '@/lib/email-reply-to'

type Change = { old: unknown; new: unknown }

// Fields from a RegistrationEdit's changesMade that the group leader is told
// about, in the order they appear in the email. Leader contact fields are left
// out on purpose (the leader is the one receiving the email).
const EMAIL_FIELDS: Array<[key: string, label: string]> = [
  ['groupName', 'Group Name'],
  ['parishName', 'Parish Name'],
  ['housingType', 'Housing Type'],
  ['totalParticipants', 'Total Participants'],
  ['onCampusTotal', 'On-Campus Total'],
  ['offCampusTotal', 'Off-Campus Total'],
  ['dayPassTotal', 'Day Pass Total'],
]

/**
 * Turn a group edit (the same shape stored in RegistrationEdit) into the
 * bullet lines shown in the "Registration Updated" email.
 */
export function buildGroupUpdateEmailChanges(edit: {
  changesMade: Record<string, unknown> | null
  oldTotal: number | null
  newTotal: number | null
  forfeitedDeposit?: number
  droppedSpots?: number
}): string[] {
  const changes = (edit.changesMade || {}) as Record<string, Change | undefined>
  const lines: string[] = []

  for (const [key, label] of EMAIL_FIELDS) {
    const change = changes[key]
    if (change && typeof change === 'object' && 'old' in change && 'new' in change) {
      lines.push(`${label}: ${change.old ?? 'N/A'} → ${change.new ?? 'N/A'}`)
    }
  }

  if (edit.oldTotal !== null && edit.newTotal !== null && edit.oldTotal !== edit.newTotal) {
    lines.push(`Total Amount Due: $${edit.oldTotal.toFixed(2)} → $${edit.newTotal.toFixed(2)}`)
  }

  let forfeited = edit.forfeitedDeposit ?? 0
  let dropped = edit.droppedSpots ?? 0
  // Past edits only keep the forfeited deposit as display text, e.g.
  // "$100.00 (5 dropped spots) — non-refundable, ..."
  const depositNote = changes.depositForfeited?.new
  if (!forfeited && typeof depositNote === 'string') {
    const match = depositNote.match(/^\$([\d,.]+) \((\d+) dropped/)
    if (match) {
      forfeited = Number(match[1].replace(/,/g, ''))
      dropped = Number(match[2])
    }
  }
  if (forfeited > 0) {
    lines.push(
      `Note: the $${forfeited.toFixed(2)} deposit already paid for the ${dropped} dropped spot${dropped === 1 ? '' : 's'} is non-refundable and does not reduce the amount still owed.`
    )
  }

  return lines
}

/**
 * Send the "Registration Updated" email to a group leader. Resend reports most
 * failures (bad address, rejected payload) as a returned error rather than a
 * throw, so this throws on either so callers can tell the admin it failed.
 */
export async function sendGroupUpdateEmail(
  resend: Resend,
  params: {
    to: string
    groupLeaderName: string
    event: {
      name: string
      settings: { contactEmail?: string | null } | null
      organization: { contactEmail?: string | null } | null
    }
    changes: string[]
    adminNotes?: string | null
  }
): Promise<void> {
  const { to, groupLeaderName, event, changes, adminNotes } = params

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #1E3A5F; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; }
        .info-box { background-color: white; border-left: 4px solid #1E3A5F; padding: 15px; margin: 20px 0; }
        .changes-list { background-color: #FFF4E6; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; }
        .changes-list ul { margin: 10px 0; padding-left: 20px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'}/logo-horizontal.png" alt="ChiRho Events" style="max-width: 180px; height: auto; margin-bottom: 12px;" />
          <h1>Registration Updated</h1>
        </div>
        <div class="content">
          <p>Hello ${groupLeaderName},</p>

          <p>Your group registration for <strong>${event.name}</strong> has been updated by event administrators.</p>

          <div class="changes-list">
            <h3 style="margin-top: 0; color: #F59E0B;">Changes Made</h3>
            <ul>
              ${changes.map((change) => `<li>${change}</li>`).join('')}
            </ul>
          </div>

          ${adminNotes ? `
            <div class="info-box" style="background-color: #E8F4FD;">
              <h3 style="margin-top: 0; color: #1E3A5F;">Admin Notes</h3>
              <p style="margin: 0;">${adminNotes}</p>
            </div>
          ` : ''}

          <p>If you have any questions about these changes, please contact the event organizers.</p>

          <p>Thank you!</p>
        </div>
        <div class="footer">
          <p>This is an automated message from ChiRho Events.</p>
          <p>${event.name}</p>
        </div>
      </div>
    </body>
    </html>
  `

  const { error } = await resend.emails.send({
    from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
    reply_to: resolveReplyTo(event.settings, event.organization),
    to,
    subject: `Registration Updated - ${event.name}`,
    html,
  })
  if (error) {
    throw new Error(error.message)
  }
}
