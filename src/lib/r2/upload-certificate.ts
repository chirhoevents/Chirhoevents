/**
 * Upload Safe Environment Certificate to private R2 storage
 *
 * R2 path structure: /{orgId}/certificates/{participantId}/{timestamp}_{filename}
 *
 * Returns the value to store on the record: a private reference that staff
 * open through /api/secure-files (see src/lib/r2/private-files.ts).
 */

import { contentTypeForFilename, deleteSensitiveFile, uploadSensitiveFile } from '@/lib/r2/private-files'

export async function uploadCertificate(
  fileBuffer: Buffer,
  filename: string,
  participantId: string,
  orgId: string,
  eventId: string
): Promise<string> {
  const timestamp = Date.now()
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
  const key = `${orgId}/certificates/${participantId}/${timestamp}_${sanitizedFilename}`

  try {
    const stored = await uploadSensitiveFile(fileBuffer, key, contentTypeForFilename(filename))
    console.log(`Certificate uploaded to R2: ${key}`)
    return stored
  } catch (error) {
    console.error('Failed to upload certificate to R2:', error)
    throw new Error('Failed to upload certificate. Please try again.')
  }
}

/**
 * Delete certificate from R2 storage (private reference or legacy public URL)
 */
export async function deleteCertificate(certificateRef: string): Promise<void> {
  try {
    await deleteSensitiveFile(certificateRef)
  } catch (error) {
    console.error('Failed to delete certificate from R2:', error)
  }
}
