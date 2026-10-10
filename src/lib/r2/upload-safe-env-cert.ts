/**
 * Upload a Safe Environment certificate for a staff or vendor registrant
 * that an org admin has received out-of-band (e.g. by email) and is
 * uploading on the registrant's behalf.
 *
 * R2 path structure: /{orgId}/safe-env-certs/{registrationType}/{registrationId}/{timestamp}_{filename}
 *
 * Returns the value to store on the record: a private reference that staff
 * open through /api/secure-files (see src/lib/r2/private-files.ts).
 */

import { contentTypeForFilename, uploadSensitiveFile } from '@/lib/r2/private-files'

export async function uploadSafeEnvCert(
  fileBuffer: Buffer,
  filename: string,
  registrationType: 'staff' | 'vendor',
  registrationId: string,
  orgId: string
): Promise<string> {
  const timestamp = Date.now()
  const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
  const key = `${orgId}/safe-env-certs/${registrationType}/${registrationId}/${timestamp}_${sanitized}`

  return uploadSensitiveFile(fileBuffer, key, contentTypeForFilename(filename))
}
