/**
 * Private file storage for sensitive uploads (Safe Environment certificates,
 * letters of good standing, and later Lux sacramental documents).
 *
 * The main R2 bucket is served at a public URL, so anything in it can be
 * opened by anyone who has the link, forever. Sensitive files go to a second
 * bucket (R2_PRIVATE_BUCKET_NAME) that has no public access. The database
 * stores a reference like `r2-private://<key>` instead of a URL; staff open
 * the file through /api/secure-files, which checks their login and then
 * hands the browser a link that works for a few minutes. Every click on
 * "View" makes a fresh link, so the file itself stays viewable for as long as
 * it's stored.
 *
 * Until R2_PRIVATE_BUCKET_NAME is set, uploads fall back to the public bucket
 * (logged loudly) so certificate uploads keep working during the switchover.
 */

import { S3Client, PutObjectCommand, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export const PRIVATE_REF_PREFIX = 'r2-private://'

// How long a viewing link stays valid after staff click "View"
export const SIGNED_URL_TTL_SECONDS = 5 * 60

function getR2Client(): S3Client | null {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  if (!accountId || !accessKeyId || !secretAccessKey) return null

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })
}

export class PrivateStorageNotConfiguredError extends Error {
  constructor() {
    super('Secure document storage isn’t set up yet (R2_PRIVATE_BUCKET_NAME).')
  }
}

export function privateBucketConfigured(): boolean {
  return !!process.env.R2_PRIVATE_BUCKET_NAME
}

export function isPrivateRef(stored: string | null | undefined): boolean {
  return !!stored && stored.startsWith(PRIVATE_REF_PREFIX)
}

export function privateRefKey(stored: string): string {
  return stored.slice(PRIVATE_REF_PREFIX.length)
}

export function contentTypeForFilename(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop()
  if (ext === 'pdf') return 'application/pdf'
  if (ext === 'png') return 'image/png'
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'gif') return 'image/gif'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'heic') return 'image/heic'
  return 'application/octet-stream'
}

/**
 * Upload a sensitive file. Returns the value to store in the database: a
 * `r2-private://` reference, or (only while the private bucket isn't
 * configured) a public URL.
 */
export async function uploadSensitiveFile(
  fileBuffer: Buffer,
  key: string,
  contentType: string,
  options: {
    // Children's sacramental records never fall back to the public bucket
    requirePrivate?: boolean
  } = {}
): Promise<string> {
  const client = getR2Client()
  if (!client) {
    throw new Error('File storage not configured. Please contact administrator.')
  }

  const privateBucket = process.env.R2_PRIVATE_BUCKET_NAME
  if (privateBucket) {
    await client.send(new PutObjectCommand({ Bucket: privateBucket, Key: key, Body: fileBuffer, ContentType: contentType }))
    return `${PRIVATE_REF_PREFIX}${key}`
  }
  if (options.requirePrivate) {
    throw new PrivateStorageNotConfiguredError()
  }

  const publicBucket = process.env.R2_BUCKET_NAME
  const publicUrl = process.env.R2_PUBLIC_URL
  if (!publicBucket || !publicUrl) {
    throw new Error('File storage not configured. Please contact administrator.')
  }
  console.error(
    `[private-files] R2_PRIVATE_BUCKET_NAME is not set - storing sensitive file ${key} in the PUBLIC bucket. ` +
    'Create a private R2 bucket and set R2_PRIVATE_BUCKET_NAME.'
  )
  await client.send(new PutObjectCommand({ Bucket: publicBucket, Key: key, Body: fileBuffer, ContentType: contentType }))
  return `${publicUrl}/${key}`
}

/**
 * Turn a stored value into a link the browser can open right now. Private
 * references get a short-lived signed link; legacy public URLs (files not yet
 * moved by scripts/move-sensitive-files-private.ts) are returned as-is.
 */
export async function viewableUrl(stored: string): Promise<string> {
  if (!isPrivateRef(stored)) return stored

  const client = getR2Client()
  const privateBucket = process.env.R2_PRIVATE_BUCKET_NAME
  if (!client || !privateBucket) {
    throw new Error('Private file storage is not configured.')
  }
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: privateBucket, Key: privateRefKey(stored) }),
    { expiresIn: SIGNED_URL_TTL_SECONDS }
  )
}

/**
 * Delete a sensitive file, whether it's a private reference or a legacy
 * public URL.
 */
export async function deleteSensitiveFile(stored: string): Promise<void> {
  const client = getR2Client()
  if (!client) return

  if (isPrivateRef(stored)) {
    const privateBucket = process.env.R2_PRIVATE_BUCKET_NAME
    if (!privateBucket) return
    await client.send(new DeleteObjectCommand({ Bucket: privateBucket, Key: privateRefKey(stored) }))
    return
  }

  const publicBucket = process.env.R2_BUCKET_NAME
  const publicUrl = process.env.R2_PUBLIC_URL
  if (!publicBucket || !publicUrl || !stored.startsWith(`${publicUrl}/`)) return
  await client.send(new DeleteObjectCommand({ Bucket: publicBucket, Key: stored.slice(publicUrl.length + 1).split('?')[0] }))
}

/**
 * Move one object from the public bucket to the private one and return its
 * new reference. Used by the one-time migration script.
 */
export async function moveToPrivateBucket(publicFileUrl: string, deleteOriginal: boolean): Promise<string | null> {
  const client = getR2Client()
  const publicBucket = process.env.R2_BUCKET_NAME
  const publicUrl = process.env.R2_PUBLIC_URL
  const privateBucket = process.env.R2_PRIVATE_BUCKET_NAME
  if (!client || !publicBucket || !publicUrl || !privateBucket) {
    throw new Error('R2_BUCKET_NAME, R2_PUBLIC_URL and R2_PRIVATE_BUCKET_NAME must all be set')
  }
  if (!publicFileUrl.startsWith(`${publicUrl}/`)) return null

  const key = decodeURIComponent(publicFileUrl.slice(publicUrl.length + 1).split('?')[0])
  await client.send(new CopyObjectCommand({
    Bucket: privateBucket,
    Key: key,
    CopySource: `${publicBucket}/${key.split('/').map(encodeURIComponent).join('/')}`,
  }))
  if (deleteOriginal) {
    await client.send(new DeleteObjectCommand({ Bucket: publicBucket, Key: key }))
  }
  return `${PRIVATE_REF_PREFIX}${key}`
}

/**
 * The link to put in API responses for a sensitive file. It points at the
 * login-checked /api/secure-files route instead of the file itself, so the
 * real storage location never reaches the browser.
 */
export type SecureFileKind = 'safe-env-cert' | 'letter' | 'participant-cert' | 'staff-cert' | 'vendor-cert'

export function secureFileLink(kind: SecureFileKind, id: string, stored: string | null | undefined): string | null {
  return stored ? `/api/secure-files/${kind}/${id}` : null
}
