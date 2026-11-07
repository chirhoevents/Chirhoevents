import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rate-limit'
import {
  findVendorByCode,
  leadAccessBlockedReason,
  leadSettings,
  resolveBadge,
} from '@/lib/vendor-leads-server'
import {
  isLeadMessagingOpen,
  leadMessagingClosesAt,
  sanitizeLeadNotes,
  sanitizeLeadTags,
  SUGGESTED_LEAD_TAGS,
  toVendorFacingLead,
} from '@/lib/vendor-leads'

/**
 * GET /api/vendor/leads?code=...
 * Lead list for the vendor portal. Works with the vendor's access code
 * (owner) or the booth-staff vendor code (staff).
 */
export async function GET(request: NextRequest) {
  try {
    const code = new URL(request.url).searchParams.get('code')
    const found = await findVendorByCode(code)
    if (!found) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })

    const { vendor, role } = found
    const settings = leadSettings(vendor)
    const blocked = leadAccessBlockedReason(vendor)

    const base = {
      role,
      enabled: !blocked,
      blockedReason: blocked,
      sharing: {
        phone: settings.vendorLeadsSharePhone,
        group: settings.vendorLeadsShareGroup,
      },
      vendor: { businessName: vendor.businessName },
      event: { id: vendor.event.id, name: vendor.event.name },
      suggestedTags: SUGGESTED_LEAD_TAGS,
      messaging: {
        open: isLeadMessagingOpen(vendor.event),
        closesAt: leadMessagingClosesAt(vendor.event).toISOString(),
      },
    }

    if (blocked) return NextResponse.json({ ...base, leads: [], messages: [] })

    const leads = await prisma.vendorLead.findMany({
      where: { vendorRegistrationId: vendor.id },
      orderBy: { scannedAt: 'desc' },
    })

    const messages =
      role === 'owner'
        ? await prisma.vendorLeadMessage.findMany({
            where: { vendorRegistrationId: vendor.id },
            orderBy: { createdAt: 'desc' },
            select: { id: true, subject: true, emailsSent: true, emailsFailed: true, createdAt: true, leadIds: true },
          })
        : []

    return NextResponse.json({
      ...base,
      leads: leads.map((l) => toVendorFacingLead(l, settings)),
      messages: messages.map((m) => ({
        id: m.id,
        subject: m.subject,
        emailsSent: m.emailsSent,
        emailsFailed: m.emailsFailed,
        leadCount: Array.isArray(m.leadIds) ? m.leadIds.length : 0,
        createdAt: m.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('[Vendor Leads GET] Error:', error)
    return NextResponse.json({ error: 'Failed to load leads' }, { status: 500 })
  }
}

/**
 * POST /api/vendor/leads  { code, qrData, scannedByName?, notes?, tags? }
 * Record a scanned badge. Scanning the same person twice returns the
 * existing lead instead of creating a duplicate.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const found = await findVendorByCode(body.code)
    if (!found) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    const { vendor } = found

    const blocked = leadAccessBlockedReason(vendor)
    if (blocked) return NextResponse.json({ error: blocked }, { status: 403 })

    const limit = checkRateLimit(`vendor-lead-scan:${vendor.id}`, { limit: 120, windowMs: 60_000 })
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Too many scans. Wait a moment and try again.' }, { status: 429 })
    }

    const qrData = typeof body.qrData === 'string' ? body.qrData.slice(0, 2000) : ''
    if (!qrData.trim()) return NextResponse.json({ error: 'No QR code data' }, { status: 400 })

    const resolved = await resolveBadge(qrData, vendor.eventId, vendor.id)
    if (!resolved.ok) return NextResponse.json({ error: resolved.error }, { status: resolved.status })
    const snap = resolved.snapshot

    const existing = await prisma.vendorLead.findUnique({
      where: {
        vendor_lead_unique_attendee: {
          vendorRegistrationId: vendor.id,
          attendeeType: snap.attendeeType,
          attendeeId: snap.attendeeId,
        },
      },
    })

    const settings = leadSettings(vendor)
    if (existing) {
      return NextResponse.json({ lead: toVendorFacingLead(existing, settings), alreadyScanned: true })
    }

    const scannedByName =
      typeof body.scannedByName === 'string' ? body.scannedByName.trim().slice(0, 255) || null : null

    let lead
    try {
      lead = await prisma.vendorLead.create({
        data: {
          ...snap,
          vendorRegistrationId: vendor.id,
          eventId: vendor.eventId,
          organizationId: vendor.organizationId,
          notes: sanitizeLeadNotes(body.notes),
          tags: sanitizeLeadTags(body.tags),
          scannedByName,
        },
      })
    } catch (err: any) {
      // Two booth phones scanning the same badge at once: the unique index wins.
      if (err?.code === 'P2002') {
        const again = await prisma.vendorLead.findUnique({
          where: {
            vendor_lead_unique_attendee: {
              vendorRegistrationId: vendor.id,
              attendeeType: snap.attendeeType,
              attendeeId: snap.attendeeId,
            },
          },
        })
        if (again) return NextResponse.json({ lead: toVendorFacingLead(again, settings), alreadyScanned: true })
      }
      throw err
    }

    return NextResponse.json({ lead: toVendorFacingLead(lead, settings), alreadyScanned: false }, { status: 201 })
  } catch (error) {
    console.error('[Vendor Leads POST] Error:', error)
    return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 })
  }
}
