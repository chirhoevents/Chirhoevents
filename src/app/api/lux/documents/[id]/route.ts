import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { clientIp, luxAudit, requireLuxStaff } from '@/lib/lux/access'
import { deleteSubmissionFiles } from '@/lib/lux/documents'

type Params = { params: Promise<{ id: string }> }
const STATUSES = ['missing', 'received', 'approved', 'needs_resubmission', 'parish_lookup']

/**
 * PATCH /api/lux/documents/[id]  { status, note? }
 * Staff review: approve, ask for a new copy (with a note the family sees),
 * mark a parish lookup done (approved), etc.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const { error, ctx } = await requireLuxStaff(request, { manage: true })
  if (error) return error
  const { id } = await params
  const { status, note } = await request.json().catch(() => ({}))
  if (!STATUSES.includes(status)) return NextResponse.json({ error: 'Unknown status' }, { status: 400 })

  const submission = await prisma.luxDocumentSubmission.findFirst({ where: { id, organizationId: ctx.organizationId } })
  if (!submission) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

  const updated = await prisma.luxDocumentSubmission.update({
    where: { id },
    data: {
      status,
      reviewerNote: typeof note === 'string' ? note.trim().slice(0, 1000) || null : submission.reviewerNote,
      reviewedById: ctx.user.id,
      reviewedAt: new Date(),
    },
  })
  await luxAudit({
    organizationId: ctx.organizationId,
    actorUserId: ctx.user.id,
    action: 'document.status_changed',
    targetType: 'lux_document',
    targetId: id,
    metadata: { from: submission.status, to: status, note: updated.reviewerNote },
    ip: clientIp(request),
  })
  return NextResponse.json({ success: true, status: updated.status })
}

/** DELETE /api/lux/documents/[id]: delete the stored file (the requirement goes back to missing) */
export async function DELETE(request: NextRequest, { params }: Params) {
  const { error, ctx } = await requireLuxStaff(request, { manage: true })
  if (error) return error
  const { id } = await params
  const submission = await prisma.luxDocumentSubmission.findFirst({ where: { id, organizationId: ctx.organizationId }, select: { id: true } })
  if (!submission) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

  const count = await deleteSubmissionFiles([id], ctx.organizationId)
  await luxAudit({
    organizationId: ctx.organizationId,
    actorUserId: ctx.user.id,
    action: 'document.deleted',
    targetType: 'lux_document',
    targetId: id,
    ip: clientIp(request),
  })
  return NextResponse.json({ success: true, deleted: count })
}
