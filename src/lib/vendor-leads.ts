/**
 * Vendor lead retrieval: approved vendors scan attendee badges at their booth,
 * then follow up through ChiRho after the event.
 *
 * Rules (kept here so the vendor portal, admin view, CSV exports and the
 * master report all apply them the same way):
 *   - Anyone with a badge can be scanned; scanning at the booth is consent.
 *   - Vendors always get name + email. Phone and parish/group are only shared
 *     when the event admin turns them on (EventSettings.vendorLeadsShare*).
 *   - A minor's own contact info is never stored or shared. Their lead points
 *     at their group leader (or the individual registration's contact), and
 *     follow-up emails ask that adult to pass the message on to the family.
 *   - Follow-up emails go out from their own sender (vendors@), never the
 *     general events or Poros addresses, with Reply-To set to the vendor.
 *   - Vendors can email leads until 30 days after the event ends.
 *
 * Everything in this file is pure (no database) so it can be unit tested.
 */

import { getEventEndsAt, type EventEndFields } from '@/lib/event-ended'

// ─── Sender ──────────────────────────────────────────────────────────────

/** Address vendor follow-up emails are sent from (own sender, not events@ / poros@). */
export const VENDOR_LEADS_FROM_EMAIL =
  process.env.RESEND_VENDOR_FROM_EMAIL || 'vendors@chirhoevents.com'

/** "St. Joseph Books via ChiRho Events <vendors@chirhoevents.com>" */
export function vendorLeadsFrom(businessName: string): string {
  // Strip characters that would break the display-name part of the header.
  const name = businessName.replace(/["<>\r\n]/g, '').trim().slice(0, 80) || 'Event Vendor'
  return `"${name} via ChiRho Events" <${VENDOR_LEADS_FROM_EMAIL}>`
}

// ─── Messaging window ────────────────────────────────────────────────────

export const LEAD_MESSAGING_WINDOW_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000

/** Vendors can email leads until 30 days after the event ends. */
export function leadMessagingClosesAt(event: Pick<EventEndFields, 'endDate' | 'timezone'>): Date {
  return new Date(getEventEndsAt(event).getTime() + LEAD_MESSAGING_WINDOW_DAYS * DAY_MS)
}

export function isLeadMessagingOpen(
  event: Pick<EventEndFields, 'endDate' | 'timezone'>,
  now: Date = new Date()
): boolean {
  return now.getTime() < leadMessagingClosesAt(event).getTime()
}

/** Max follow-up sends per vendor in a rolling 24 hours (stops a vendor spamming leads). */
export const MAX_LEAD_MESSAGES_PER_DAY = 5

// ─── Minors ──────────────────────────────────────────────────────────────

export function isMinorParticipant(p: { participantType: string; age: number | null | undefined }): boolean {
  if (p.participantType === 'youth_u18') return true
  return typeof p.age === 'number' && p.age < 18
}

export function isMinorIndividual(age: number | null | undefined): boolean {
  return typeof age === 'number' && age < 18
}

// ─── Tags & notes ────────────────────────────────────────────────────────

export const MAX_LEAD_TAGS = 10
export const MAX_LEAD_TAG_LENGTH = 40
export const MAX_LEAD_NOTES_LENGTH = 2000

/** Clean a client-supplied tag list: strings only, trimmed, de-duplicated, capped. */
export function sanitizeLeadTags(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of input) {
    if (typeof raw !== 'string') continue
    const tag = raw.trim().replace(/\s+/g, ' ').slice(0, MAX_LEAD_TAG_LENGTH)
    const key = tag.toLowerCase()
    if (!tag || seen.has(key)) continue
    seen.add(key)
    out.push(tag)
    if (out.length >= MAX_LEAD_TAGS) break
  }
  return out
}

export function sanitizeLeadNotes(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const notes = input.trim().slice(0, MAX_LEAD_NOTES_LENGTH)
  return notes || null
}

/** Quick-tap tags offered in the scanner. Vendors can type their own too. */
export const SUGGESTED_LEAD_TAGS = [
  'Wants more info',
  'Vocations info',
  'Retreat info',
  'Interested in buying',
  'Follow up soon',
]

// ─── Shaping leads for vendors ───────────────────────────────────────────

export interface LeadSharingSettings {
  vendorLeadsSharePhone: boolean
  vendorLeadsShareGroup: boolean
}

/** A VendorLead row as stored (the subset the helpers need). */
export interface StoredLead {
  id: string
  attendeeType: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  groupName: string | null
  parishName: string | null
  isMinor: boolean
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
  notes: string | null
  tags: unknown
  scannedByName: string | null
  scannedAt: Date | string
  unsubscribedAt: Date | string | null
}

/** What a vendor sees for one lead (never a minor's own contact info). */
export interface VendorFacingLead {
  id: string
  attendeeType: string
  firstName: string
  lastName: string
  isMinor: boolean
  /** Where follow-up goes: the attendee (adults) or their group leader / registration contact (minors). */
  email: string | null
  /** Only for minors: the adult the email goes to. */
  contactName: string | null
  phone: string | null
  groupName: string | null
  parishName: string | null
  notes: string | null
  tags: string[]
  scannedByName: string | null
  scannedAt: string
  unsubscribed: boolean
}

function iso(d: Date | string): string {
  return typeof d === 'string' ? d : d.toISOString()
}

export function toVendorFacingLead(lead: StoredLead, settings: LeadSharingSettings): VendorFacingLead {
  const minor = lead.isMinor
  return {
    id: lead.id,
    attendeeType: lead.attendeeType,
    firstName: lead.firstName,
    lastName: lead.lastName,
    isMinor: minor,
    email: minor ? lead.contactEmail : lead.email,
    contactName: minor ? lead.contactName : null,
    phone: settings.vendorLeadsSharePhone ? (minor ? lead.contactPhone : lead.phone) : null,
    groupName: settings.vendorLeadsShareGroup ? lead.groupName : null,
    parishName: settings.vendorLeadsShareGroup ? lead.parishName : null,
    notes: lead.notes,
    tags: sanitizeLeadTags(lead.tags),
    scannedByName: lead.scannedByName,
    scannedAt: iso(lead.scannedAt),
    unsubscribed: !!lead.unsubscribedAt,
  }
}

// ─── CSV ─────────────────────────────────────────────────────────────────

/**
 * Escape one CSV cell. Cells starting with = + - @ (or tab / CR) are
 * prefixed with ' so spreadsheet apps don't run vendor-typed notes or
 * attendee names as formulas.
 */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  let s = String(value)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`
  return s
}

function attendeeTypeLabel(type: string): string {
  switch (type) {
    case 'participant': return 'Group participant'
    case 'individual': return 'Individual'
    case 'staff': return 'Staff / volunteer'
    case 'vendor': return 'Vendor'
    default: return type
  }
}

export function leadContactNote(lead: Pick<VendorFacingLead, 'isMinor' | 'contactName'>): string {
  if (!lead.isMinor) return ''
  return `Minor: contact ${lead.contactName || 'their group leader'} to pass info to the family`
}

/** CSV the vendor downloads. Phone / parish / group columns only appear when shared. */
export function vendorLeadsCsv(leads: VendorFacingLead[], settings: LeadSharingSettings): string {
  const headers = ['First Name', 'Last Name', 'Email', 'Contact Note']
  if (settings.vendorLeadsSharePhone) headers.push('Phone')
  if (settings.vendorLeadsShareGroup) headers.push('Group', 'Parish')
  headers.push('Attendee Type', 'Tags', 'Notes', 'Scanned By', 'Scanned At', 'Unsubscribed')

  const rows = leads.map((l) => {
    const row: unknown[] = [l.firstName, l.lastName, l.email, leadContactNote(l)]
    if (settings.vendorLeadsSharePhone) row.push(l.phone)
    if (settings.vendorLeadsShareGroup) row.push(l.groupName, l.parishName)
    row.push(
      attendeeTypeLabel(l.attendeeType),
      l.tags.join('; '),
      l.notes,
      l.scannedByName,
      l.scannedAt,
      l.unsubscribed ? 'Yes' : ''
    )
    return row.map(csvCell).join(',')
  })
  return [headers.map(csvCell).join(','), ...rows].join('\n')
}

/** Admin CSV: every lead at the event, with full stored details. */
export function adminLeadsCsv(
  leads: Array<StoredLead & { vendorBusinessName: string }>
): string {
  const headers = [
    'Vendor', 'First Name', 'Last Name', 'Attendee Type', 'Minor', 'Attendee Email', 'Attendee Phone',
    'Group', 'Parish', 'Contact Name (minors)', 'Contact Email (minors)', 'Contact Phone (minors)',
    'Tags', 'Notes', 'Scanned By', 'Scanned At', 'Unsubscribed',
  ]
  const rows = leads.map((l) => [
    l.vendorBusinessName, l.firstName, l.lastName, attendeeTypeLabel(l.attendeeType), l.isMinor ? 'Yes' : 'No',
    l.email, l.phone, l.groupName, l.parishName, l.contactName, l.contactEmail, l.contactPhone,
    sanitizeLeadTags(l.tags).join('; '), l.notes, l.scannedByName, iso(l.scannedAt), l.unsubscribedAt ? 'Yes' : '',
  ].map(csvCell).join(','))
  return [headers.map(csvCell).join(','), ...rows].join('\n')
}

// ─── Follow-up email recipients ──────────────────────────────────────────

export type LeadRecipient =
  | { kind: 'adult'; email: string; firstName: string; leadIds: string[]; unsubscribeToken: string }
  | {
      kind: 'leader'
      email: string
      contactName: string | null
      /** Minors from this leader's group who stopped by */
      minorNames: string[]
      leadIds: string[]
      unsubscribeToken: string
    }

/**
 * Turn selected leads into emails to send: one per adult, and one per group
 * leader covering every minor from their group (so a leader with five teens
 * who stopped by gets one email, not five). Unsubscribed leads and leads
 * with no email are skipped.
 */
export function buildLeadRecipients(
  leads: Array<Pick<StoredLead, 'id' | 'firstName' | 'lastName' | 'email' | 'isMinor' | 'contactName' | 'contactEmail' | 'unsubscribedAt'> & { unsubscribeToken: string }>
): { recipients: LeadRecipient[]; skipped: number } {
  const byEmail = new Map<string, LeadRecipient>()
  let skipped = 0

  for (const lead of leads) {
    if (lead.unsubscribedAt) { skipped++; continue }
    const target = (lead.isMinor ? lead.contactEmail : lead.email)?.trim()
    if (!target) { skipped++; continue }
    const key = `${lead.isMinor ? 'leader' : 'adult'}:${target.toLowerCase()}`
    const existing = byEmail.get(key)

    if (lead.isMinor) {
      const name = `${lead.firstName} ${lead.lastName}`.trim()
      if (existing && existing.kind === 'leader') {
        existing.minorNames.push(name)
        existing.leadIds.push(lead.id)
      } else {
        byEmail.set(key, {
          kind: 'leader',
          email: target,
          contactName: lead.contactName,
          minorNames: [name],
          leadIds: [lead.id],
          unsubscribeToken: lead.unsubscribeToken,
        })
      }
    } else if (existing) {
      existing.leadIds.push(lead.id)
    } else {
      byEmail.set(key, {
        kind: 'adult',
        email: target,
        firstName: lead.firstName,
        leadIds: [lead.id],
        unsubscribeToken: lead.unsubscribeToken,
      })
    }
  }

  return { recipients: Array.from(byEmail.values()), skipped }
}

// ─── Email bodies ────────────────────────────────────────────────────────

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export const MAX_LEAD_SUBJECT_LENGTH = 150
export const MAX_LEAD_MESSAGE_LENGTH = 5000

/**
 * Vendor-written plain text → safe email HTML. Unlike formatPlainTextForEmail
 * this never passes HTML through: vendors are outside parties, so every
 * character is escaped and only paragraphs / line breaks are kept.
 */
export function formatVendorMessageHtml(text: string): string {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map((block) => block.split('\n').map((l) => escapeHtml(l.trim())).filter(Boolean).join('<br>'))
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 12px 0;">${p}</p>`)
    .join('\n')
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] || ''
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
}

/**
 * Inner HTML for one follow-up email (wrapped by wrapEmail by the caller).
 * `messageHtml` is the vendor's message, already escaped/formatted.
 */
export function buildLeadEmailContent({
  recipient,
  messageHtml,
  businessName,
  eventName,
  unsubscribeUrl,
}: {
  recipient: LeadRecipient
  messageHtml: string
  businessName: string
  eventName: string
  unsubscribeUrl: string
}): string {
  const biz = escapeHtml(businessName)
  const evt = escapeHtml(eventName)

  const intro =
    recipient.kind === 'adult'
      ? `<p>Hi ${escapeHtml(recipient.firstName)},</p>
         <p>Thanks for stopping by the <strong>${biz}</strong> booth at <strong>${evt}</strong>. Here is a message from them:</p>`
      : `<p>Hi ${escapeHtml(recipient.contactName || 'there')},</p>
         <p><strong>${escapeHtml(joinNames(recipient.minorNames))}</strong> from your group stopped by the
         <strong>${biz}</strong> booth at <strong>${evt}</strong> and ${recipient.minorNames.length > 1 ? 'were' : 'was'}
         interested in more information. Because ${recipient.minorNames.length > 1 ? 'they are minors' : 'they are a minor'},
         this message was sent to you instead of to them directly. Would you mind passing it along to
         ${recipient.minorNames.length > 1 ? 'their families' : 'their family'}?</p>`

  return `
    ${intro}
    <div style="border-left:3px solid #9C8466;padding:8px 16px;margin:16px 0;background:#F9FAFB;">
      ${messageHtml}
    </div>
    <p style="font-size:13px;color:#666;">
      Reply to this email to reach ${biz} directly.
    </p>
    <p style="margin-top:24px;font-size:12px;color:#888;">
      You're receiving this because a badge was scanned at ${biz}'s booth at ${evt}.
      ChiRho Events delivered it on their behalf.
      <a href="${escapeHtml(unsubscribeUrl)}" style="color:#888;">Stop emails from ${biz}</a>.
    </p>
  `
}
