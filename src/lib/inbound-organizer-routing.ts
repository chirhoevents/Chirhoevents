import { prisma } from '@/lib/prisma'
import { resolveReplyTo } from '@/lib/email-reply-to'

/**
 * Inbound mail from event registrants (group leaders, participants, parents,
 * staff, vendors, waitlisted people) that lands in a ChiRho inbox is almost
 * always a question for the event organizer — "how many chaperones do we
 * need?", "can I change my t-shirt size?". This module decides whether an
 * inbound email should be handed to the organizer instead of becoming a
 * ChiRho support ticket.
 */

// ChiRho inboxes whose registrant mail belongs to the organizer. Platform-only
// inboxes (billing@, legal@, privacy@) are deliberately not listed.
function organizerRoutableInboxes(): Set<string> {
  return new Set(
    [
      'support@chirhoevents.com',
      'events@chirhoevents.com',
      'notifications@chirhoevents.com',
      process.env.RESEND_FROM_EMAIL,
      process.env.RESEND_REPLY_FROM_EMAIL,
    ]
      .filter((a): a is string => !!a)
      .map((a) => a.trim().toLowerCase())
  )
}

// Roles that make a sender a ChiRho customer (org staff), not a registrant.
// Their mail to support@ is about the platform and must stay with ChiRho.
const ORG_STAFF_ROLES = [
  'master_admin',
  'org_admin',
  'event_manager',
  'finance_manager',
  'poros_coordinator',
  'salve_coordinator',
  'rapha_coordinator',
] as const

// How long after an event ends we still treat it as the one being asked about.
const RECENT_EVENT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

export function extractEmailAddress(value: string | null | undefined): string {
  if (!value) return ''
  const match = value.match(/<([^>]+)>/)
  return (match ? match[1] : value).trim().toLowerCase()
}

/**
 * Out-of-office and other auto-replies. These are noise for the organizer, so
 * they are never forwarded.
 */
export function isAutoReply(
  subject: string | null | undefined,
  headers?: Record<string, string> | null
): boolean {
  const autoSubmitted = headers?.['auto-submitted'] ?? headers?.['Auto-Submitted']
  if (autoSubmitted && autoSubmitted.toLowerCase() !== 'no') return true
  return /^\s*(automatic reply|auto[- ]?reply|autoreply|out of (the )?office|undeliverable|delivery status notification)\b/i.test(
    subject || ''
  )
}

export function isAddressedToRoutableInbox(addresses: (string | null | undefined)[]): boolean {
  const inboxes = organizerRoutableInboxes()
  return addresses.some((a) => inboxes.has(extractEmailAddress(a)))
}

type CandidateEvent = {
  name: string
  startDate: Date
  endDate: Date
  archivedAt: Date | null
  settings: { contactEmail: string | null } | null
  organization: { name: string; contactEmail: string }
}

const eventSelect = {
  name: true,
  startDate: true,
  endDate: true,
  archivedAt: true,
  settings: { select: { contactEmail: true } },
  organization: { select: { name: true, contactEmail: true } },
} as const

export type OrganizerRoute = {
  contactEmail: string
  eventName: string
  organizationName: string
}

/**
 * Find the organizer contact for an event the sender is registered for, or
 * null when the sender isn't a registrant (or is org staff themselves).
 */
export async function findOrganizerForSender(senderEmail: string): Promise<OrganizerRoute | null> {
  const email = senderEmail.trim().toLowerCase()
  if (!email || email.endsWith('@chirhoevents.com')) return null

  const ci = { equals: email, mode: 'insensitive' as const }

  const [orgStaff, orgContact] = await Promise.all([
    prisma.user.findFirst({
      where: { email: ci, role: { in: [...ORG_STAFF_ROLES] } },
      select: { id: true },
    }),
    prisma.organization.findFirst({ where: { contactEmail: ci }, select: { id: true } }),
  ])
  if (orgStaff || orgContact) return null

  const recent = { orderBy: { createdAt: 'desc' as const }, take: 10 }
  const [groups, individuals, participants, staff, vendors, waitlist] = await Promise.all([
    prisma.groupRegistration.findMany({
      where: {
        OR: [
          { groupLeaderEmail: ci },
          { alternativeContact1Email: ci },
          { alternativeContact2Email: ci },
        ],
      },
      select: { event: { select: eventSelect } },
      ...recent,
    }),
    prisma.individualRegistration.findMany({
      where: { email: ci },
      select: { event: { select: eventSelect } },
      ...recent,
    }),
    prisma.participant.findMany({
      where: { OR: [{ email: ci }, { parentEmail: ci }] },
      select: { groupRegistration: { select: { event: { select: eventSelect } } } },
      ...recent,
    }),
    prisma.staffRegistration.findMany({
      where: { email: ci },
      select: { event: { select: eventSelect } },
      ...recent,
    }),
    prisma.vendorRegistration.findMany({
      where: { email: ci },
      select: { event: { select: eventSelect } },
      ...recent,
    }),
    prisma.waitlistEntry.findMany({
      where: { email: ci },
      select: { event: { select: eventSelect } },
      ...recent,
    }),
  ])

  const events: CandidateEvent[] = [
    ...groups.map((r) => r.event),
    ...individuals.map((r) => r.event),
    ...participants.map((p) => p.groupRegistration.event),
    ...staff.map((r) => r.event),
    ...vendors.map((r) => r.event),
    ...waitlist.map((r) => r.event),
  ]
  if (events.length === 0) return null

  // Prefer the soonest event that hasn't wrapped up yet; otherwise the most
  // recent one they were part of.
  const cutoff = Date.now() - RECENT_EVENT_WINDOW_MS
  const current = events
    .filter((e) => !e.archivedAt && new Date(e.endDate).getTime() >= cutoff)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
  const event =
    current[0] ??
    [...events].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0]

  const contactEmail = resolveReplyTo(event.settings, event.organization, '').toLowerCase()
  // Never "route" back into a ChiRho inbox or to the sender themselves.
  if (!contactEmail || contactEmail.endsWith('@chirhoevents.com') || contactEmail === email) {
    return null
  }

  return {
    contactEmail,
    eventName: event.name,
    organizationName: event.organization.name,
  }
}
