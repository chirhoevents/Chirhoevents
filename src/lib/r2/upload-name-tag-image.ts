/**
 * Upload Name Tag Images to Cloudflare R2 storage
 *
 * R2 path structure: /{eventId}/name-tags/{type}.{ext}
 * Types: logo, background
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

export type NameTagImageType = 'logo' | 'background'

export async function uploadNameTagImage(
  fileBuffer: Buffer,
  filename: string,
  eventId: string,
  imageType: NameTagImageType
): Promise<string> {
  const ext = filename.toLowerCase().split('.').pop() || 'png'
  const key = `${eventId}/name-tags/${imageType}.${ext}`

  const client = getR2Client()
  const bucketName = process.env.R2_BUCKET_NAME
  const publicUrl = process.env.R2_PUBLIC_URL

  if (!client || !bucketName) {
    console.error('R2 not configured - cannot upload name tag image')
    throw new Error('File storage not configured. Please contact administrator.')
  }

  // Determine content type
  let contentType = 'image/png'
  if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg'
  else if (ext === 'gif') contentType = 'image/gif'
  else if (ext === 'webp') contentType = 'image/webp'
  else if (ext === 'svg') contentType = 'image/svg+xml'

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
    console.log(`Name tag ${imageType} uploaded to R2: ${fileUrl}`)
    return fileUrl
  } catch (error) {
    console.error(`Failed to upload name tag ${imageType} to R2:`, error)
    throw new Error(`Failed to upload ${imageType}. Please try again.`)
  }
}

export async function deleteNameTagImage(
  eventId: string,
  imageType: NameTagImageType
): Promise<void> {
  const client = getR2Client()
  const bucketName = process.env.R2_BUCKET_NAME

  if (!client || !bucketName) {
    console.warn('R2 not configured - cannot delete name tag image')
    return
  }

  // Try to delete common extensions
  const extensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']

  for (const ext of extensions) {
    const key = `${eventId}/name-tags/${imageType}.${ext}`
    try {
      await client.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: key,
        })
      )
      console.log(`Name tag ${imageType} deleted from R2: ${key}`)
    } catch {
      // Ignore errors for non-existent files
    }
  }
}
