/**
 * Upload Safe Environment Certificate to Cloudflare R2 storage
 *
 * R2 path structure: /{orgId}/certificates/{participantId}/{timestamp}_{filename}
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

  const client = getR2Client()
  const bucketName = process.env.R2_BUCKET_NAME
  const publicUrl = process.env.R2_PUBLIC_URL

  if (!client || !bucketName) {
    console.error('R2 not configured - cannot upload certificate')
    throw new Error('File storage not configured. Please contact administrator.')
  }

  // Determine content type based on file extension
  const ext = filename.toLowerCase().split('.').pop()
  let contentType = 'application/octet-stream'
  if (ext === 'pdf') contentType = 'application/pdf'
  else if (ext === 'png') contentType = 'image/png'
  else if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg'
  else if (ext === 'gif') contentType = 'image/gif'
  else if (ext === 'webp') contentType = 'image/webp'

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
      })
    )

    const fileUrl = `${publicUrl}/${key}`
    console.log(`Certificate uploaded to R2: ${fileUrl}`)
    return fileUrl
  } catch (error) {
    console.error('Failed to upload certificate to R2:', error)
    throw new Error('Failed to upload certificate. Please try again.')
  }
}

/**
 * Delete certificate from Cloudflare R2 storage
 */
export async function deleteCertificate(certificateUrl: string): Promise<void> {
  const client = getR2Client()
  const bucketName = process.env.R2_BUCKET_NAME
  const publicUrl = process.env.R2_PUBLIC_URL

  if (!client || !bucketName || !publicUrl) {
    console.warn('R2 not configured - cannot delete certificate')
    return
  }

  // Extract key from URL
  const key = certificateUrl.replace(`${publicUrl}/`, '')

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
    )
    console.log(`Certificate deleted from R2: ${key}`)
  } catch (error) {
    console.error('Failed to delete certificate from R2:', error)
  }
}
