/**
 * Upload a letter of good standing to private R2 storage
 *
 * R2 path structure: /{orgId}/letters-of-good-standing/{eventId}/{timestamp}_{filename}
 *
 * Returns the value to store on the record: a private reference that staff
 * open through /api/secure-files (see src/lib/r2/private-files.ts).
 */

import { contentTypeForFilename, uploadSensitiveFile } from '@/lib/r2/private-files'

export async function uploadLetter(
  fileBuffer: Buffer,
  filename: string,
  orgId: string,
  eventId: string
): Promise<string> {
  const timestamp = Date.now()
  const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
  const key = `${orgId}/letters-of-good-standing/${eventId}/${timestamp}_${sanitized}`

  return uploadSensitiveFile(fileBuffer, key, contentTypeForFilename(filename))
}
