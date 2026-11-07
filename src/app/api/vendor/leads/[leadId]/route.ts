import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { findVendorByCode, leadAccessBlockedReason, leadSettings } from '@/lib/vendor-leads-server'
import { sanitizeLeadNotes, sanitizeLeadTags, toVendorFacingLead } from '@/lib/vendor-leads'

type Params = { params: Promise<{ leadId: string }> }

/**
 * PATCH /api/vendor/leads/:leadId  { code, notes?, tags? }
 * Update a lead's notes/tags. Owner or booth staff.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { leadId } = await params
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const found = await findVendorByCode(body.code)
    if (!found) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    const { vendor } = found

    const blocked = leadAccessBlockedReason(vendor)
    if (blocked) return NextResponse.json({ error: blocked }, { status: 403 })

    const lead = await prisma.vendorLead.findFirst({
      where: { id: leadId, vendorRegistrationId: vendor.id },
    })
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    const data: { notes?: string | null; tags?: string[] } = {}
    if ('notes' in body) data.notes = sanitizeLeadNotes(body.notes)
    if ('tags' in body) data.tags = sanitizeLeadTags(body.tags)

    const updated = await prisma.vendorLead.update({ where: { id: lead.id }, data })
    return NextResponse.json({ lead: toVendorFacingLead(updated, leadSettings(vendor)) })
  } catch (error) {
    console.error('[Vendor Lead PATCH] Error:', error)
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
  }
}

/**
 * DELETE /api/vendor/leads/:leadId?code=...
 * Remove a mis-scan. Vendor contact (access code) only.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { leadId } = await params
    const code = new URL(request.url).searchParams.get('code')

    const found = await findVendorByCode(code)
    if (!found) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    if (found.role !== 'owner') {
      return NextResponse.json({ error: 'Only the main vendor contact can remove leads.' }, { status: 403 })
    }

    const result = await prisma.vendorLead.deleteMany({
      where: { id: leadId, vendorRegistrationId: found.vendor.id },
    })
    if (result.count === 0) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Vendor Lead DELETE] Error:', error)
    return NextResponse.json({ error: 'Failed to remove lead' }, { status: 500 })
  }
}
