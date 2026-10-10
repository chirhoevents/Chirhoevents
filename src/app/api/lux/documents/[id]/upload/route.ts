import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { clientIp, luxAudit, requireLuxStaff } from '@/lib/lux/access'
import { documentUploadProblem, storeSubmissionFile } from '@/lib/lux/documents'
import { PrivateStorageNotConfiguredError } from '@/lib/r2/private-files'

type Params = { params: Promise<{ id: string }> }

/** POST /api/lux/documents/[id]/upload (multipart: file): staff upload a document a family brought in */
export async function POST(request: NextRequest, { params }: Params) {
  const { error, ctx } = await requireLuxStaff(request, { manage: true })
  if (error) return error
  const { id } = await params

  const submission = await prisma.luxDocumentSubmission.findFirst({ where: { id, organizationId: ctx.organizationId }, select: { id: true } })
  if (!submission) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

  const form = await request.formData().catch(() => null)
  const file = form?.get('file') as File | null
  const problem = documentUploadProblem(file)
  if (problem) return NextResponse.json({ error: problem }, { status: 400 })

  try {
    const updated = await storeSubmissionFile({
      submissionId: id,
      organizationId: ctx.organizationId,
      file: file!,
      uploadedVia: 'staff',
      staffUserId: ctx.user.id,
    })
    await luxAudit({
      organizationId: ctx.organizationId,
      actorUserId: ctx.user.id,
      action: 'document.uploaded',
      targetType: 'lux_document',
      targetId: id,
      metadata: { fileName: updated.fileName, by: 'staff' },
      ip: clientIp(request),
    })
    return NextResponse.json({ success: true, status: updated.status })
  } catch (err) {
    if (err instanceof PrivateStorageNotConfiguredError) {
      return NextResponse.json({ error: 'Secure document storage isn’t set up yet. Ask ChiRho Events support to finish setup.' }, { status: 503 })
    }
    console.error('[Lux documents] Staff upload failed', err)
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
  }
}
