/**
 * Database side of vendor lead retrieval (see src/lib/vendor-leads.ts for
 * the rules). Vendors have no accounts: the portal signs in with codes.
 *
 *   - accessCode  → "owner": the vendor contact. Full lead access, CSV export,
 *                   follow-up emails, deleting leads.
 *   - vendorCode  → "staff": the code shared with booth workers. They can scan
 *                   badges and add notes/tags, nothing else.
 */

import { prisma } from '@/lib/prisma'
import { parseQRCodeData } from '@/lib/qr-code'
import { isMinorIndividual, isMinorParticipant } from '@/lib/vendor-leads'

export type VendorLeadRole = 'owner' | 'staff'

const vendorLeadInclude = {
  event: {
    select: {
      id: true,
      name: true,
      slug: true,
      endDate: true,
      timezone: true,
      status: true,
      archivedAt: true,
      organizationId: true,
      organization: { select: { name: true, contactEmail: true } },
      settings: {
        select: {
          contactEmail: true,
          vendorLeadsEnabled: true,
          vendorLeadsSharePhone: true,
          vendorLeadsShareGroup: true,
        },
      },
    },
  },
} as const

export async function findVendorByCode(code: string | null | undefined) {
  const trimmed = (code || '').trim()
  if (!trimmed) return null

  const byAccess = await prisma.vendorRegistration.findUnique({
    where: { accessCode: trimmed },
    include: vendorLeadInclude,
  })
  if (byAccess) return { vendor: byAccess, role: 'owner' as VendorLeadRole }

  const byVendorCode = await prisma.vendorRegistration.findUnique({
    where: { vendorCode: trimmed },
    include: vendorLeadInclude,
  })
  if (byVendorCode) return { vendor: byVendorCode, role: 'staff' as VendorLeadRole }

  return null
}

export type VendorWithEvent = NonNullable<Awaited<ReturnType<typeof findVendorByCode>>>['vendor']

export function leadSettings(vendor: VendorWithEvent) {
  const s = vendor.event.settings
  return {
    vendorLeadsEnabled: !!s?.vendorLeadsEnabled,
    vendorLeadsSharePhone: !!s?.vendorLeadsSharePhone,
    vendorLeadsShareGroup: !!s?.vendorLeadsShareGroup,
  }
}

/**
 * Why this vendor can't use lead retrieval right now, or null if they can.
 */
export function leadAccessBlockedReason(vendor: VendorWithEvent): string | null {
  if (vendor.status !== 'approved') return 'Lead scanning is available once your booth is approved.'
  if (!vendor.event.settings?.vendorLeadsEnabled) {
    return 'Lead scanning is not turned on for this event. Contact the event organizer if you expected it.'
  }
  return null
}

/** Snapshot of a scanned attendee, ready to store as a VendorLead. */
export interface BadgeSnapshot {
  attendeeType: 'participant' | 'individual' | 'staff' | 'vendor'
  attendeeId: string
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
}

type ResolveResult = { ok: true; snapshot: BadgeSnapshot } | { ok: false; error: string; status: number }

/**
 * Work out who a scanned badge belongs to at this event. Badges carry either
 * a bare UUID (group participants, staff, vendors) or a small JSON blob
 * (individual registrations).
 */
export async function resolveBadge(
  qrData: string,
  eventId: string,
  scanningVendorId: string
): Promise<ResolveResult> {
  const parsed = parseQRCodeData((qrData || '').trim())

  if (parsed.type === 'group') {
    return { ok: false, status: 400, error: 'That looks like a group code, not a name badge. Scan the QR code on a badge.' }
  }

  if (parsed.type === 'individual' && parsed.registrationId) {
    if (parsed.eventId && parsed.eventId !== eventId) {
      return { ok: false, status: 404, error: 'This badge is for a different event.' }
    }
    const snap = await individualSnapshot(parsed.registrationId, eventId)
    return snap ? { ok: true, snapshot: snap } : { ok: false, status: 404, error: 'Badge not found for this event.' }
  }

  if (parsed.type !== 'participant' || !parsed.participantId) {
    return { ok: false, status: 400, error: "Couldn't read that QR code. Make sure you're scanning an event name badge." }
  }

  const id = parsed.participantId

  const participant = await prisma.participant.findFirst({
    where: { id, groupRegistration: { eventId, cancelledAt: null } },
    include: {
      groupRegistration: {
        select: {
          groupName: true,
          parishName: true,
          groupLeaderName: true,
          groupLeaderEmail: true,
          groupLeaderPhone: true,
        },
      },
    },
  })
  if (participant) {
    const g = participant.groupRegistration
    const minor = isMinorParticipant({ participantType: participant.participantType, age: participant.age })
    return {
      ok: true,
      snapshot: {
        attendeeType: 'participant',
        attendeeId: participant.id,
        firstName: participant.preferredName?.trim() || participant.firstName,
        lastName: participant.lastName,
        email: minor ? null : participant.email || null,
        phone: null,
        groupName: g.groupName,
        parishName: g.parishName,
        isMinor: minor,
        contactName: minor ? g.groupLeaderName : null,
        contactEmail: minor ? g.groupLeaderEmail : null,
        contactPhone: minor ? g.groupLeaderPhone : null,
      },
    }
  }

  const staff = await prisma.staffRegistration.findFirst({ where: { id, eventId } })
  if (staff) {
    if (staff.vendorRegistrationId === scanningVendorId) {
      return { ok: false, status: 400, error: "That's one of your own booth staff." }
    }
    return {
      ok: true,
      snapshot: {
        attendeeType: 'staff',
        attendeeId: staff.id,
        firstName: staff.firstName,
        lastName: staff.lastName,
        email: staff.email,
        phone: staff.phone,
        groupName: staff.role || null,
        parishName: null,
        isMinor: false,
        contactName: null,
        contactEmail: null,
        contactPhone: null,
      },
    }
  }

  const vendor = await prisma.vendorRegistration.findFirst({ where: { id, eventId } })
  if (vendor) {
    if (vendor.id === scanningVendorId) {
      return { ok: false, status: 400, error: "That's your own badge." }
    }
    return {
      ok: true,
      snapshot: {
        attendeeType: 'vendor',
        attendeeId: vendor.id,
        firstName: vendor.contactFirstName,
        lastName: vendor.contactLastName,
        email: vendor.email,
        phone: vendor.phone,
        groupName: vendor.businessName,
        parishName: null,
        isMinor: false,
        contactName: null,
        contactEmail: null,
        contactPhone: null,
      },
    }
  }

  const individual = await individualSnapshot(id, eventId)
  if (individual) return { ok: true, snapshot: individual }

  return { ok: false, status: 404, error: 'Badge not found for this event.' }
}

async function individualSnapshot(registrationId: string, eventId: string): Promise<BadgeSnapshot | null> {
  const reg = await prisma.individualRegistration.findFirst({
    where: { id: registrationId, eventId, cancelledAt: null },
  })
  if (!reg) return null
  const minor = isMinorIndividual(reg.age)
  return {
    attendeeType: 'individual',
    attendeeId: reg.id,
    firstName: reg.preferredName?.trim() || reg.firstName,
    lastName: reg.lastName,
    email: minor ? null : reg.email,
    phone: minor ? null : reg.phone,
    groupName: null,
    parishName: null,
    isMinor: minor,
    // A minor registering on their own: the registration's email/emergency
    // contact is the adult on file, so follow-up goes there.
    contactName: minor ? reg.emergencyContact1Name || null : null,
    contactEmail: minor ? reg.email : null,
    contactPhone: minor ? reg.emergencyContact1Phone || null : null,
  }
}
