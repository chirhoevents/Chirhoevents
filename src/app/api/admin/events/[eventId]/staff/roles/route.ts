import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEventAccess } from '@/lib/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params

  const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
    requireAdmin: true,
    logPrefix: '[Staff Roles]',
  })
  if (error) return error
  if (!user || !effectiveOrgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rows = await prisma.staffRegistration.findMany({
    where: { eventId, organizationId: effectiveOrgId },
    select: { role: true, isVendorStaff: true },
  })

  const counts = new Map<string, { total: number; general: number; vendor: number }>()
  for (const r of rows) {
    const bucket = counts.get(r.role) || { total: 0, general: 0, vendor: 0 }
    bucket.total++
    if (r.isVendorStaff) bucket.vendor++
    else bucket.general++
    counts.set(r.role, bucket)
  }

  const roles = Array.from(counts.entries())
    .map(([role, c]) => ({ role, ...c }))
    .sort((a, b) => b.total - a.total)

  return NextResponse.json({ roles })
}
