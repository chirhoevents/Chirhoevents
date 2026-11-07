import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEventAccess } from '@/lib/api-auth'
import { adminLeadsCsv, leadMessagingClosesAt, sanitizeLeadTags } from '@/lib/vendor-leads'

type Params = { params: Promise<{ eventId: string }> }

/**
 * GET /api/admin/events/:eventId/vendors/leads[?format=csv]
 *
 * Everything vendors did with lead retrieval at this event: the settings,
 * every lead (full stored details, including minors' group-leader contact)
 * and every follow-up message vendors sent through ChiRho.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const { eventId } = await params
  const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
    requireAdmin: true,
    logPrefix: '[GET Vendor Leads]',
  })
  if (error) return error
  if (!user || !effectiveOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [event, leads, messages, vendors] = await Promise.all([
      prisma.event.findFirst({
        where: { id: eventId, organizationId: effectiveOrgId },
        select: {
          name: true,
          endDate: true,
          timezone: true,
          settings: {
            select: { vendorLeadsEnabled: true, vendorLeadsSharePhone: true, vendorLeadsShareGroup: true },
          },
        },
      }),
      prisma.vendorLead.findMany({
        where: { eventId, organizationId: effectiveOrgId },
        include: { vendorRegistration: { select: { businessName: true } } },
        orderBy: { scannedAt: 'asc' },
      }),
      prisma.vendorLeadMessage.findMany({
        where: { eventId, organizationId: effectiveOrgId },
        include: { vendorRegistration: { select: { businessName: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.vendorRegistration.findMany({
        where: { eventId, organizationId: effectiveOrgId, status: 'approved' },
        select: { id: true, businessName: true },
        orderBy: { businessName: 'asc' },
      }),
    ])
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

    const format = new URL(request.url).searchParams.get('format')
    if (format === 'csv') {
      const csv = adminLeadsCsv(leads.map((l) => ({ ...l, vendorBusinessName: l.vendorRegistration.businessName })))
      const safe = event.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'event'
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${safe}-vendor-leads.csv"`,
          'Cache-Control': 'no-store',
        },
      })
    }

    const summary = vendors.map((v) => {
      const own = leads.filter((l) => l.vendorRegistrationId === v.id)
      const sent = messages.filter((m) => m.vendorRegistrationId === v.id)
      return {
        vendorId: v.id,
        businessName: v.businessName,
        leadCount: own.length,
        minorLeadCount: own.filter((l) => l.isMinor).length,
        messageCount: sent.length,
        emailsSent: sent.reduce((sum, m) => sum + m.emailsSent, 0),
      }
    })

    return NextResponse.json({
      settings: {
        vendorLeadsEnabled: !!event.settings?.vendorLeadsEnabled,
        vendorLeadsSharePhone: !!event.settings?.vendorLeadsSharePhone,
        vendorLeadsShareGroup: !!event.settings?.vendorLeadsShareGroup,
      },
      messagingClosesAt: leadMessagingClosesAt(event).toISOString(),
      totals: {
        leads: leads.length,
        uniqueAttendees: new Set(leads.map((l) => `${l.attendeeType}:${l.attendeeId}`)).size,
        minors: leads.filter((l) => l.isMinor).length,
        messages: messages.length,
        emailsSent: messages.reduce((sum, m) => sum + m.emailsSent, 0),
      },
      summary,
      leads: leads.map((l) => ({
        id: l.id,
        vendorId: l.vendorRegistrationId,
        businessName: l.vendorRegistration.businessName,
        attendeeType: l.attendeeType,
        firstName: l.firstName,
        lastName: l.lastName,
        email: l.email,
        phone: l.phone,
        groupName: l.groupName,
        parishName: l.parishName,
        isMinor: l.isMinor,
        contactName: l.contactName,
        contactEmail: l.contactEmail,
        notes: l.notes,
        tags: sanitizeLeadTags(l.tags),
        scannedByName: l.scannedByName,
        scannedAt: l.scannedAt.toISOString(),
        unsubscribed: !!l.unsubscribedAt,
      })),
      messages: messages.map((m) => ({
        id: m.id,
        vendorId: m.vendorRegistrationId,
        businessName: m.vendorRegistration.businessName,
        subject: m.subject,
        body: m.body,
        recipients: Array.isArray(m.leadIds) ? m.leadIds.length : 0,
        emailsSent: m.emailsSent,
        emailsFailed: m.emailsFailed,
        createdAt: m.createdAt.toISOString(),
      })),
    })
  } catch (err) {
    console.error('[GET Vendor Leads] Error:', err)
    return NextResponse.json({ error: 'Failed to load vendor leads' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/events/:eventId/vendors/leads
 * { vendorLeadsEnabled?, vendorLeadsSharePhone?, vendorLeadsShareGroup? }
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const { eventId } = await params
  const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
    requireAdmin: true,
    logPrefix: '[PATCH Vendor Lead Settings]',
  })
  if (error) return error
  if (!user || !effectiveOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    const data: Record<string, boolean> = {}
    for (const key of ['vendorLeadsEnabled', 'vendorLeadsSharePhone', 'vendorLeadsShareGroup'] as const) {
      if (typeof body[key] === 'boolean') data[key] = body[key]
    }
    if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

    const event = await prisma.event.findFirst({
      where: { id: eventId, organizationId: effectiveOrgId },
      select: { id: true, settings: { select: { id: true } } },
    })
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    if (!event.settings) return NextResponse.json({ error: 'Event settings not found' }, { status: 404 })

    const updated = await prisma.eventSettings.update({
      where: { id: event.settings.id },
      data,
      select: { vendorLeadsEnabled: true, vendorLeadsSharePhone: true, vendorLeadsShareGroup: true },
    })
    return NextResponse.json({ settings: updated })
  } catch (err) {
    console.error('[PATCH Vendor Lead Settings] Error:', err)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
