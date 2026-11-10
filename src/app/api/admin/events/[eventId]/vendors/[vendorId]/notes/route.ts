import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEventAccess } from '@/lib/api-auth'
import { logVendorActivity } from '@/lib/vendor-admin'

/** Add a private admin note to a vendor (never shown to the vendor). */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; vendorId: string }> }
) {
  const { eventId, vendorId } = await params
  const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
    requireAdmin: true,
    logPrefix: '[Vendor Note]',
  })
  if (error) return error
  if (!user || !effectiveOrgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const vendor = await prisma.vendorRegistration.findFirst({
    where: { id: vendorId, eventId, organizationId: effectiveOrgId },
    select: { id: true },
  })
  if (!vendor) {
    return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))
  const note = String(body.note || '').trim()
  if (!note) {
    return NextResponse.json({ error: 'Note cannot be empty' }, { status: 400 })
  }
  if (note.length > 5000) {
    return NextResponse.json({ error: 'Note is too long (5000 characters max)' }, { status: 400 })
  }

  await logVendorActivity({
    vendorId: vendor.id,
    organizationId: effectiveOrgId,
    userId: user.id,
    editType: 'info_updated',
    action: 'note',
    note,
  })

  return NextResponse.json({ success: true })
}
