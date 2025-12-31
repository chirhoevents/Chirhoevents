/**
 * Upload Organization Logo to Cloudflare R2 storage
 *
 * R2 path structure: /{orgId}/branding/logo.{ext}
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

export async function uploadLogo(
  fileBuffer: Buffer,
  filename: string,
  orgId: string
): Promise<string> {
  const ext = filename.toLowerCase().split('.').pop() || 'png'
  const key = `${orgId}/branding/logo.${ext}`

  const client = getR2Client()
  const bucketName = process.env.R2_BUCKET_NAME
  const publicUrl = process.env.R2_PUBLIC_URL

  if (!client || !bucketName) {
    console.error('R2 not configured - cannot upload logo')
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
        // Add cache busting by including timestamp in metadata
        Metadata: {
          'upload-timestamp': Date.now().toString(),
        },
      })
    )

    // Add timestamp for cache busting
    const fileUrl = `${publicUrl}/${key}?t=${Date.now()}`
    console.log(`Logo uploaded to R2: ${fileUrl}`)
    return fileUrl
  } catch (error) {
    console.error('Failed to upload logo to R2:', error)
    throw new Error('Failed to upload logo. Please try again.')
  }
}

/**
 * Delete logo from Cloudflare R2 storage
 */
export async function deleteLogo(orgId: string): Promise<void> {
  const client = getR2Client()
  const bucketName = process.env.R2_BUCKET_NAME

  if (!client || !bucketName) {
    console.warn('R2 not configured - cannot delete logo')
    return
  }

  // Try to delete common extensions
  const extensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']

  for (const ext of extensions) {
    const key = `${orgId}/branding/logo.${ext}`
    try {
      await client.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: key,
        })
      )
      console.log(`Logo deleted from R2: ${key}`)
    } catch {
      // Ignore errors for non-existent files
    }
  }
}
