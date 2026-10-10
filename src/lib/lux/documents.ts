import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { contentTypeForFilename, deleteSensitiveFile, uploadSensitiveFile } from '@/lib/r2/private-files'
import { incrementOrgStorage, decrementOrgStorage } from '@/lib/storage/track-storage'

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024
const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'])
const ALLOWED_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png', 'heic', 'heif', 'webp'])

/** Check a family or staff upload before storing it. Returns an error message or null. */
export function documentUploadProblem(file: File | null): string | null {
  if (!file || typeof file === 'string' || file.size === 0) return 'Choose a file to upload.'
  if (file.size > MAX_DOCUMENT_BYTES) return 'That file is larger than 10 MB. Try a photo or a smaller scan.'
  const ext = file.name.toLowerCase().split('.').pop() || ''
  if (!ALLOWED_EXTENSIONS.has(ext) && !ALLOWED_TYPES.has(file.type)) return 'Please upload a PDF or a photo (JPG, PNG, HEIC).'
  return null
}

/**
 * Store a document for a submission in the private bucket (never public)
 * under a random key, replacing any earlier copy. The earlier file is only
 * deleted when no other submission still points at it (documents can be
 * reused across programs).
 */
export async function storeSubmissionFile(params: {
  submissionId: string
  organizationId: string
  file: File
  uploadedVia: 'family' | 'staff'
  staffUserId?: string
}) {
  const submission = await prisma.luxDocumentSubmission.findUnique({ where: { id: params.submissionId } })
  if (!submission) throw new Error('Document not found')

  const buffer = Buffer.from(await params.file.arrayBuffer())
  const ext = params.file.name.toLowerCase().split('.').pop() || 'bin'
  const key = `${params.organizationId}/lux-documents/${randomUUID()}.${ext.replace(/[^a-z0-9]/g, '').slice(0, 5) || 'bin'}`
  const contentType = ALLOWED_TYPES.has(params.file.type) ? params.file.type : contentTypeForFilename(params.file.name)
  const storageRef = await uploadSensitiveFile(buffer, key, contentType, { requirePrivate: true })

  const previous = submission.storageRef
  const updated = await prisma.luxDocumentSubmission.update({
    where: { id: submission.id },
    data: {
      storageRef,
      fileName: params.file.name.slice(0, 255),
      contentType,
      sizeBytes: params.file.size,
      uploadedAt: new Date(),
      uploadedVia: params.uploadedVia,
      status: params.uploadedVia === 'staff' ? 'approved' : 'received',
      reviewedById: params.uploadedVia === 'staff' ? params.staffUserId ?? null : null,
      reviewedAt: params.uploadedVia === 'staff' ? new Date() : null,
      reviewerNote: null,
    },
  })
  await incrementOrgStorage(params.organizationId, params.file.size)
  if (previous) await deleteFileIfUnused(previous, submission.sizeBytes, params.organizationId)
  return updated
}

/** Delete a stored file unless another submission still uses it */
export async function deleteFileIfUnused(storageRef: string, sizeBytes: number | null, organizationId: string) {
  const stillUsed = await prisma.luxDocumentSubmission.count({ where: { storageRef } })
  if (stillUsed > 0) return
  try {
    await deleteSensitiveFile(storageRef)
    if (sizeBytes) await decrementOrgStorage(organizationId, sizeBytes)
  } catch (error) {
    console.error('[Lux documents] Could not delete file', error)
  }
}

/**
 * Remove the files for these submissions (staff "delete documents", or the
 * retention setting) and mark them missing again.
 */
export async function deleteSubmissionFiles(submissionIds: string[], organizationId: string): Promise<number> {
  const submissions = await prisma.luxDocumentSubmission.findMany({
    where: { id: { in: submissionIds }, organizationId, storageRef: { not: null } },
    select: { id: true, storageRef: true, sizeBytes: true },
  })
  await prisma.luxDocumentSubmission.updateMany({
    where: { id: { in: submissions.map(s => s.id) } },
    data: {
      storageRef: null, fileName: null, contentType: null, sizeBytes: null, uploadedAt: null, uploadedVia: null,
      status: 'missing', reviewerNote: 'File deleted',
    },
  })
  const refs = new Map(submissions.map(s => [s.storageRef!, s.sizeBytes]))
  for (const [ref, size] of refs) await deleteFileIfUnused(ref, size, organizationId)
  return submissions.length
}
