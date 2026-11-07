import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { findVendorByCode, leadAccessBlockedReason, leadSettings } from '@/lib/vendor-leads-server'
import { toVendorFacingLead, vendorLeadsCsv } from '@/lib/vendor-leads'

/**
 * GET /api/vendor/leads/export?code=...
 * CSV of the vendor's leads. Vendor contact (access code) only.
 */
export async function GET(request: NextRequest) {
  try {
    const code = new URL(request.url).searchParams.get('code')
    const found = await findVendorByCode(code)
    if (!found) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    if (found.role !== 'owner') {
      return NextResponse.json({ error: 'Only the main vendor contact can export leads.' }, { status: 403 })
    }
    const { vendor } = found

    const blocked = leadAccessBlockedReason(vendor)
    if (blocked) return NextResponse.json({ error: blocked }, { status: 403 })

    const settings = leadSettings(vendor)
    const leads = await prisma.vendorLead.findMany({
      where: { vendorRegistrationId: vendor.id },
      orderBy: { scannedAt: 'asc' },
    })

    const csv = vendorLeadsCsv(leads.map((l) => toVendorFacingLead(l, settings)), settings)
    const safeName = vendor.businessName.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'vendor'

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeName}-leads.csv"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[Vendor Leads Export] Error:', error)
    return NextResponse.json({ error: 'Failed to export leads' }, { status: 500 })
  }
}
