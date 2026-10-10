import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { clientIp, luxAudit, requireLuxStaff } from '@/lib/lux/access'
import { viewableUrl } from '@/lib/r2/private-files'

type Params = { params: Promise<{ id: string }> }

/**
 * GET /api/lux/documents/[id]/view
 * Opens a family's document for parish staff: checks the login and org,
 * logs who opened it, and returns a link that works for 5 minutes (each
 * click makes a new one; the document itself stays stored).
 */
export async function GET(request: NextRequest, { params }: Params) {
  const { error, ctx } = await requireLuxStaff(request)
  if (error) return error
  const { id } = await params

  const submission = await prisma.luxDocumentSubmission.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: { id: true, storageRef: true, fileName: true, childId: true },
  })
  if (!submission?.storageRef) return NextResponse.json({ error: 'No file uploaded for this document.' }, { status: 404 })

  await luxAudit({
    organizationId: ctx.organizationId,
    actorUserId: ctx.user.id,
    action: 'document.viewed',
    targetType: 'lux_document',
    targetId: submission.id,
    metadata: { fileName: submission.fileName, childId: submission.childId },
    ip: clientIp(request),
  })
  const url = await viewableUrl(submission.storageRef)
  return NextResponse.json({ url }, { headers: { 'Cache-Control': 'no-store' } })
}
