import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLuxStaff, luxAudit, clientIp } from '@/lib/lux/access'
import { deleteSubmissionFiles } from '@/lib/lux/documents'

type Params = { params: Promise<{ id: string }> }

/**
 * DELETE /api/lux/households/[id]/documents
 * Permanently delete every file this family has uploaded (a privacy request,
 * or the parish's records are complete). The checklist items stay, marked
 * as needed again, except ones the parish already approved.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  const { error, ctx } = await requireLuxStaff(request, { manage: true })
  if (error) return error
  const { id } = await params

  const household = await prisma.luxHousehold.findFirst({ where: { id, organizationId: ctx.organizationId }, select: { id: true } })
  if (!household) return NextResponse.json({ error: 'Family not found' }, { status: 404 })

  const submissions = await prisma.luxDocumentSubmission.findMany({
    where: { householdId: id, organizationId: ctx.organizationId, storageRef: { not: null } },
    select: { id: true },
  })
  const deleted = await deleteSubmissionFiles(submissions.map(s => s.id), ctx.organizationId, {
    keepApproved: true,
    note: 'File deleted at the family’s or parish’s request',
  })
  await luxAudit({
    organizationId: ctx.organizationId, actorUserId: ctx.user.id, action: 'household.documents_deleted',
    targetType: 'lux_household', targetId: id, metadata: { files: deleted }, ip: clientIp(request),
  })
  return NextResponse.json({ success: true, deleted })
}
