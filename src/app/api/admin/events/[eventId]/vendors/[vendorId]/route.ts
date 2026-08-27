import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEventAccess } from '@/lib/api-auth'

const EDITABLE_FIELDS = [
  'businessName',
  'contactFirstName',
  'contactLastName',
  'email',
  'phone',
  'boothDescription',
  'additionalNeeds',
] as const

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; vendorId: string }> }
) {
  const { eventId, vendorId } = await params

  const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
    requireAdmin: true,
    logPrefix: '[Vendor Edit]',
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

  const body = await request.json()
  const updates: Record<string, unknown> = {}
  for (const key of EDITABLE_FIELDS) {
    if (body[key] !== undefined) updates[key] = body[key]
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 })
  }

  const updated = await prisma.vendorRegistration.update({
    where: { id: vendor.id },
    data: updates,
  })

  return NextResponse.json({ vendor: updated })
}
