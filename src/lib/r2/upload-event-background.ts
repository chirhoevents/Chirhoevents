/**
 * Upload Event Background Image to Cloudflare R2 storage
 *
 * R2 path structure: /{orgId}/events/{eventId}/background.{ext}
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

// Initialize S3 client for R2
function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!accountId || !accessKeyId || !secretAccessKey) {
    console.warn('R2 credentials not configured - uploads will fail')
    return null
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })
}

export async function uploadEventBackground(
  fileBuffer: Buffer,
  filename: string,
  orgId: string,
  eventId: string
): Promise<string> {
  const ext = filename.toLowerCase().split('.').pop() || 'jpg'
  const key = `${orgId}/events/${eventId}/background.${ext}`

  const client = getR2Client()
  const bucketName = process.env.R2_BUCKET_NAME
  const publicUrl = process.env.R2_PUBLIC_URL

  if (!client || !bucketName) {
    console.error('R2 not configured - cannot upload event background')
    throw new Error('File storage not configured. Please contact administrator.')
  }

  // Determine content type
  let contentType = 'image/jpeg'
  if (ext === 'png') contentType = 'image/png'
  else if (ext === 'gif') contentType = 'image/gif'
  else if (ext === 'webp') contentType = 'image/webp'

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        Metadata: {
          'upload-timestamp': Date.now().toString(),
        },
      })
    )

    // Add timestamp for cache busting
    const fileUrl = `${publicUrl}/${key}?t=${Date.now()}`
    console.log(`Event background uploaded to R2: ${fileUrl}`)
    return fileUrl
  } catch (error) {
    console.error('Failed to upload event background to R2:', error)
    throw new Error('Failed to upload background image. Please try again.')
  }
}

/**
 * Delete event background from Cloudflare R2 storage
 */
export async function deleteEventBackground(orgId: string, eventId: string): Promise<void> {
  const client = getR2Client()
  const bucketName = process.env.R2_BUCKET_NAME

  if (!client || !bucketName) {
    console.warn('R2 not configured - cannot delete event background')
    return
  }

  // Try to delete common extensions
  const extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp']

  for (const ext of extensions) {
    const key = `${orgId}/events/${eventId}/background.${ext}`
    try {
      await client.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: key,
        })
      )
      console.log(`Event background deleted from R2: ${key}`)
    } catch {
      // Ignore errors for non-existent files
    }
  }
}
