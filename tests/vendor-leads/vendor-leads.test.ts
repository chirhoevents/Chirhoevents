/**
 * Vendor lead retrieval rules (src/lib/vendor-leads.ts). Pure logic, no
 * database needed:
 *
 *   npx tsx tests/vendor-leads/vendor-leads.test.ts
 */

import {
  buildLeadEmailContent,
  buildLeadRecipients,
  csvCell,
  formatVendorMessageHtml,
  isLeadMessagingOpen,
  isMinorIndividual,
  isMinorParticipant,
  leadMessagingClosesAt,
  sanitizeLeadNotes,
  sanitizeLeadTags,
  toVendorFacingLead,
  vendorLeadsCsv,
  vendorLeadsFrom,
  VENDOR_LEADS_FROM_EMAIL,
  type StoredLead,
} from '../../src/lib/vendor-leads'
import { parseQRCodeData } from '../../src/lib/qr-code'

let failures = 0
function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) console.log(`    ✅ ${name}`)
  else {
    failures++
    console.error(`    ❌ ${name}`, detail !== undefined ? detail : '')
  }
}
function section(title: string) {
  console.log(`\n  ${title}`)
}

function lead(overrides: Partial<StoredLead> = {}): StoredLead {
  return {
    id: 'lead-1',
    attendeeType: 'participant',
    firstName: 'Maria',
    lastName: 'Lopez',
    email: 'maria@example.com',
    phone: '555-0100',
    groupName: 'St. Anne Youth',
    parishName: 'St. Anne',
    isMinor: false,
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    notes: null,
    tags: [],
    scannedByName: null,
    scannedAt: new Date('2026-07-10T15:00:00Z'),
    unsubscribedAt: null,
    ...overrides,
  }
}

const minorLead = (id: string, first: string, leaderEmail = 'leader@example.com') =>
  lead({
    id,
    firstName: first,
    lastName: 'Smith',
    email: null,
    phone: null,
    isMinor: true,
    contactName: 'Pat Leader',
    contactEmail: leaderEmail,
    contactPhone: '555-0199',
  })

const shareNothing = { vendorLeadsSharePhone: false, vendorLeadsShareGroup: false }
const shareAll = { vendorLeadsSharePhone: true, vendorLeadsShareGroup: true }

// ─────────────────────────────────────────────────────────────
section('Who counts as a minor')
check('youth_u18 is a minor even with age 18 on file', isMinorParticipant({ participantType: 'youth_u18', age: 18 }))
check('chaperone age 17 is a minor', isMinorParticipant({ participantType: 'chaperone', age: 17 }))
check('youth_o18 age 18 is an adult', !isMinorParticipant({ participantType: 'youth_o18', age: 18 }))
check('priest is an adult', !isMinorParticipant({ participantType: 'priest', age: 45 }))
check('individual age 16 is a minor', isMinorIndividual(16))
check('individual with no age is treated as an adult', !isMinorIndividual(null))

// ─────────────────────────────────────────────────────────────
section('What vendors see')
{
  const adult = toVendorFacingLead(lead(), shareNothing)
  check('adult: email shared', adult.email === 'maria@example.com', adult)
  check('adult: phone hidden unless shared', adult.phone === null, adult)
  check('adult: group/parish hidden unless shared', adult.groupName === null && adult.parishName === null, adult)

  const adultAll = toVendorFacingLead(lead(), shareAll)
  check('adult: phone + group shown when admin shares them',
    adultAll.phone === '555-0100' && adultAll.groupName === 'St. Anne Youth' && adultAll.parishName === 'St. Anne', adultAll)

  const minor = toVendorFacingLead(minorLead('m1', 'Jimmy'), shareAll)
  check('minor: email is the group leader, not the minor', minor.email === 'leader@example.com', minor)
  check('minor: contact name is the leader', minor.contactName === 'Pat Leader', minor)
  check('minor: shared phone is the leader phone', minor.phone === '555-0199', minor)

  const minorNoPhone = toVendorFacingLead(minorLead('m1', 'Jimmy'), shareNothing)
  check('minor: leader phone hidden unless shared', minorNoPhone.phone === null, minorNoPhone)

  const unsub = toVendorFacingLead(lead({ unsubscribedAt: new Date() }), shareNothing)
  check('unsubscribed flag passes through', unsub.unsubscribed === true)
}

// ─────────────────────────────────────────────────────────────
section('Tags and notes')
check('tags trimmed, de-duplicated case-insensitively',
  JSON.stringify(sanitizeLeadTags(['  Vocations info ', 'vocations INFO', 'Retreat'])) === JSON.stringify(['Vocations info', 'Retreat']),
  sanitizeLeadTags(['  Vocations info ', 'vocations INFO', 'Retreat']))
check('non-strings and empty tags dropped', sanitizeLeadTags([1, null, '', '  ', 'ok']).length === 1)
check('at most 10 tags', sanitizeLeadTags(Array.from({ length: 20 }, (_, i) => `t${i}`)).length === 10)
check('long tags cut to 40 chars', sanitizeLeadTags(['x'.repeat(100)])[0].length === 40)
check('non-array tags → []', sanitizeLeadTags('Vocations').length === 0)
check('blank notes → null', sanitizeLeadNotes('   ') === null)
check('notes capped at 2000 chars', (sanitizeLeadNotes('a'.repeat(3000)) || '').length === 2000)

// ─────────────────────────────────────────────────────────────
section('CSV')
check('formula-looking cells are neutralised', csvCell('=HYPERLINK("x")') === `"'=HYPERLINK(""x"")"`, csvCell('=HYPERLINK("x")'))
check('+ and @ prefixes neutralised', csvCell('+1 555') === "'+1 555" && csvCell('@cmd') === "'@cmd")
check('commas quoted', csvCell('Lopez, Maria') === '"Lopez, Maria"')
check('null → empty', csvCell(null) === '')
{
  const leads = [toVendorFacingLead(lead(), shareNothing), toVendorFacingLead(minorLead('m1', 'Jimmy'), shareNothing)]
  const csv = vendorLeadsCsv(leads, shareNothing)
  const header = csv.split('\n')[0]
  check('no Phone/Group columns when not shared', !header.includes('Phone') && !header.includes('Parish'), header)
  check('minor row says to contact the leader', csv.includes('Minor: contact Pat Leader'), csv)
  check('minor row never has a minor email', !csv.includes('jimmy'), csv)

  const csvAll = vendorLeadsCsv(leads.map(() => toVendorFacingLead(lead(), shareAll)), shareAll)
  const headerAll = csvAll.split('\n')[0]
  check('Phone/Group/Parish columns when shared', headerAll.includes('Phone') && headerAll.includes('Group') && headerAll.includes('Parish'), headerAll)
}

// ─────────────────────────────────────────────────────────────
section('Follow-up email recipients')
{
  const leads = [
    { ...lead({ id: 'a1' }), unsubscribeToken: 't-a1' },
    { ...lead({ id: 'a2', email: 'MARIA@example.com' }), unsubscribeToken: 't-a2' }, // same person scanned via another badge
    { ...minorLead('m1', 'Jimmy'), unsubscribeToken: 't-m1' },
    { ...minorLead('m2', 'Ana'), unsubscribeToken: 't-m2' },
    { ...minorLead('m3', 'Luke', 'other-leader@example.com'), unsubscribeToken: 't-m3' },
    { ...lead({ id: 'u1', email: 'gone@example.com', unsubscribedAt: new Date() }), unsubscribeToken: 't-u1' },
    { ...lead({ id: 'n1', email: null }), unsubscribeToken: 't-n1' },
  ]
  const { recipients, skipped } = buildLeadRecipients(leads)
  check('unsubscribed + no-email leads skipped', skipped === 2, skipped)
  check('one email per address (adult duplicates merged, case-insensitive)',
    recipients.filter((r) => r.kind === 'adult').length === 1, recipients)
  const leaders = recipients.filter((r) => r.kind === 'leader') as Array<Extract<(typeof recipients)[number], { kind: 'leader' }>>
  check('one email per group leader', leaders.length === 2, leaders)
  const pat = leaders.find((r) => r.email === 'leader@example.com')
  check('leader email lists every minor from their group', !!pat && pat.minorNames.join('|') === 'Jimmy Smith|Ana Smith', pat)
  check('no recipient is ever a minor', recipients.every((r) => r.email !== null && !r.email.includes('jimmy')))

  const html = buildLeadEmailContent({
    recipient: pat!,
    messageHtml: '<p>Hello</p>',
    businessName: 'Sisters of Life',
    eventName: 'Steubenville East',
    unsubscribeUrl: 'https://chirhoevents.com/vendor-leads/unsubscribe/abc',
  })
  check('leader email names the teens and asks to pass it on',
    html.includes('Jimmy Smith and Ana Smith') && html.includes('passing it along'), html)
  check('email includes unsubscribe link', html.includes('/vendor-leads/unsubscribe/abc'))
}

// ─────────────────────────────────────────────────────────────
section('Message safety')
{
  const html = formatVendorMessageHtml('Hi <b>there</b>\n<script>alert(1)</script>\n\nSecond <p>para</p>')
  check('vendor HTML is always escaped (no passthrough)', !html.includes('<b>') && !html.includes('<script>') && html.includes('&lt;script&gt;'), html)
  check('paragraphs kept', (html.match(/<p /g) || []).length === 2, html)

  const injected = buildLeadEmailContent({
    recipient: { kind: 'adult', email: 'a@b.c', firstName: '<img src=x>', leadIds: ['1'], unsubscribeToken: 't' },
    messageHtml: '',
    businessName: 'Evil <script>',
    eventName: 'Event',
    unsubscribeUrl: 'https://x/y',
  })
  check('names and business are escaped in the email', !injected.includes('<img') && !injected.includes('<script>'), injected)
}

// ─────────────────────────────────────────────────────────────
section('Sender')
check('dedicated vendors@ sender (not events@/poros@/notifications@)', VENDOR_LEADS_FROM_EMAIL === 'vendors@chirhoevents.com')
check('From uses the business name', vendorLeadsFrom('Sisters of Life') === '"Sisters of Life via ChiRho Events" <vendors@chirhoevents.com>', vendorLeadsFrom('Sisters of Life'))
check('From strips header-breaking characters', !/["<>\r\n]/.test(vendorLeadsFrom('Bad"<x>\r\nBcc: evil').split(' via ')[0].slice(1)), vendorLeadsFrom('Bad"<x>\r\nBcc: evil'))

// ─────────────────────────────────────────────────────────────
section('30-day messaging window')
{
  const event = { endDate: new Date('2026-07-12T00:00:00Z'), timezone: 'America/New_York' }
  const closes = leadMessagingClosesAt(event)
  // Event ends at midnight after Jul 12 (Eastern) = Jul 13 04:00 UTC; +30 days = Aug 12 04:00 UTC
  check('closes 30 days after the event ends', closes.toISOString() === '2026-08-12T04:00:00.000Z', closes.toISOString())
  check('open during the event', isLeadMessagingOpen(event, new Date('2026-07-11T12:00:00Z')))
  check('open 29 days after', isLeadMessagingOpen(event, new Date('2026-08-11T12:00:00Z')))
  check('closed after 30 days', !isLeadMessagingOpen(event, new Date('2026-08-12T05:00:00Z')))
}

// ─────────────────────────────────────────────────────────────
section('Badge QR formats the scanner accepts')
{
  const uuid = '3f2b6c1e-8a4d-4f5b-9c2e-1a2b3c4d5e6f'
  check('bare UUID badge → participant/staff/vendor id', parseQRCodeData(uuid).participantId === uuid)
  const individual = parseQRCodeData(JSON.stringify({ registration_id: uuid, event_id: 'e1', type: 'individual', name: 'X' }))
  check('individual JSON badge → registration id', individual.type === 'individual' && individual.registrationId === uuid, individual)
  check('group access code is not a badge', parseQRCodeData('ABC123').type === 'group')
}

console.log(failures ? `\n  ${failures} check(s) failed\n` : '\n  All checks passed\n')
process.exit(failures ? 1 : 0)
