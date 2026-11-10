import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEventAccess } from '@/lib/api-auth'
import { logVendorActivity } from '@/lib/vendor-admin'

/**
 * Move a vendor back to "pending" — re-open a rejected application, or undo
 * an approval — so it can be reviewed again. Codes, invoice and payments are
 * kept; re-approving from the Review dialog replaces the invoice and resends
 * the approval email.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; vendorId: string }> }
) {
  const { eventId, vendorId } = await params
  const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
    requireAdmin: true,
    logPrefix: '[Vendor Status]',
  })
  if (error) return error
  if (!user || !effectiveOrgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const vendor = await prisma.vendorRegistration.findFirst({
    where: { id: vendorId, eventId, organizationId: effectiveOrgId },
    select: { id: true, status: true },
  })
  if (!vendor) {
    return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))
  if (body.status !== 'pending') {
    return NextResponse.json({ error: 'Only moving a vendor back to pending is supported here.' }, { status: 400 })
  }
  if (vendor.status === 'pending') {
    return NextResponse.json({ error: 'Vendor is already pending.' }, { status: 400 })
  }

  await prisma.vendorRegistration.update({
    where: { id: vendor.id },
    data: { status: 'pending', rejectionReason: null, approvedAt: null },
  })

  await logVendorActivity({
    vendorId: vendor.id,
    organizationId: effectiveOrgId,
    userId: user.id,
    editType: 'info_updated',
    action: vendor.status === 'rejected' ? 'reopened' : 'approval_revoked',
    details: { from: vendor.status, to: 'pending' },
    note: String(body.reason || '').trim() || null,
  })

  return NextResponse.json({ success: true })
}
