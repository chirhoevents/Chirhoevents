import { uploadLetter } from '@/lib/r2/upload-letter'
import { incrementOrgStorage } from '@/lib/storage/track-storage'

/**
 * Shared rules for letter of good standing files, used by the registrant
 * (Poros), group leader and admin upload routes.
 */

export const LETTER_ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
])
export const LETTER_MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

/** Returns an error message when the file can't be accepted, otherwise null. */
export function validateLetterFile(file: File | null): string | null {
  if (!file || typeof file === 'string' || file.size === 0) return 'Please choose a file to upload'
  if (!LETTER_ALLOWED_MIME_TYPES.has(file.type)) return 'Only PDF, JPEG, and PNG files are accepted'
  if (file.size > LETTER_MAX_FILE_SIZE) return 'File size must be less than 10 MB'
  return null
}

/**
 * Uploads the file to private storage, counts it against the organization's
 * storage, and returns the fields to save on the LetterOfGoodStanding record.
 */
export async function storeLetterFile(file: File, organizationId: string, eventId: string) {
  const buffer = Buffer.from(await file.arrayBuffer())
  const fileUrl = await uploadLetter(buffer, file.name, organizationId, eventId)
  await incrementOrgStorage(organizationId, file.size)
  return {
    fileUrl,
    originalFilename: file.name,
    fileSizeBytes: BigInt(file.size),
    uploadedAt: new Date(),
  }
}

/** Participant types that need a letter, from the event's settings. */
export function lettersRequiredFor(setting: unknown): string[] {
  return Array.isArray(setting)
    ? setting.filter((t): t is string => typeof t === 'string')
    : ['priest', 'deacon', 'seminarian']
}
