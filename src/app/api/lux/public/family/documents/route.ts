import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { clientIp, luxAudit } from '@/lib/lux/access'
import { getFamilySession } from '@/lib/lux/family-session'
import { documentUploadProblem, storeSubmissionFile } from '@/lib/lux/documents'
import { PrivateStorageNotConfiguredError } from '@/lib/r2/private-files'

/**
 * POST /api/lux/public/family/documents  (multipart: submissionId, file)
 * A family uploads a document (baptismal certificate, sponsor letter...).
 * Needs a family session for the household the document belongs to; an
 * order-limited session can only upload for that order. Families can
 * upload but never download documents.
 */
export async function POST(request: NextRequest) {
  const session = await getFamilySession(request)
  if (!session) {
    return NextResponse.json({ error: 'Your session has ended. Use the link in your email to upload documents.' }, { status: 401 })
  }

  const form = await request.formData().catch(() => null)
  const submissionId = form?.get('submissionId')
  const file = form?.get('file') as File | null
  if (typeof submissionId !== 'string') return NextResponse.json({ error: 'Missing document' }, { status: 400 })
  const problem = documentUploadProblem(file)
  if (problem) return NextResponse.json({ error: problem }, { status: 400 })

  const submission = await prisma.luxDocumentSubmission.findUnique({
    where: { id: submissionId },
    select: {
      id: true, organizationId: true, householdId: true, status: true,
      programRegistration: { select: { orderId: true, cancelledAt: true } },
    },
  })
  const allowed = submission &&
    submission.organizationId === session.organizationId &&
    submission.householdId === session.householdId &&
    (!session.orderId || submission.programRegistration.orderId === session.orderId) &&
    !submission.programRegistration.cancelledAt
  if (!allowed) return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  if (submission.status === 'approved') {
    return NextResponse.json({ error: 'This document is already approved. Contact the parish office if it needs to change.' }, { status: 400 })
  }

  try {
    const updated = await storeSubmissionFile({
      submissionId: submission.id,
      organizationId: submission.organizationId,
      file: file!,
      uploadedVia: 'family',
    })
    await luxAudit({
      organizationId: submission.organizationId,
      actorHouseholdId: session.householdId,
      action: 'document.uploaded',
      targetType: 'lux_document',
      targetId: submission.id,
      metadata: { fileName: updated.fileName, sizeBytes: updated.sizeBytes },
      ip: clientIp(request),
    })
    return NextResponse.json({ success: true, status: updated.status, fileName: updated.fileName })
  } catch (error) {
    if (error instanceof PrivateStorageNotConfiguredError) {
      console.error('[Lux documents]', error.message)
      return NextResponse.json({ error: 'Document uploads aren’t available yet. Please bring a copy to the parish office.' }, { status: 503 })
    }
    console.error('[Lux documents] Upload failed', error)
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
  }
}
