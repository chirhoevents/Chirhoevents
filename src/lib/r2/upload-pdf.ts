/**
 * Upload PDF to Cloudflare R2 storage
 *
 * R2 path structure: /{orgId}/{eventId}/liability-forms/{formId}.pdf
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

export async function uploadLiabilityFormPDF(
  pdfBuffer: Buffer,
  formId: string,
  orgId: string,
  eventId: string
): Promise<string> {
  const filename = `${formId}.pdf`
  const key = `${orgId}/${eventId}/liability-forms/${filename}`

  const client = getR2Client()
  const bucketName = process.env.R2_BUCKET_NAME
  const publicUrl = process.env.R2_PUBLIC_URL

  if (!client || !bucketName) {
    console.error('R2 not configured - cannot upload PDF')
    throw new Error('File storage not configured. Please contact administrator.')
  }

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
      })
    )

    const fileUrl = `${publicUrl}/${key}`
    console.log(`PDF uploaded to R2: ${fileUrl}`)
    return fileUrl
  } catch (error) {
    console.error('Failed to upload PDF to R2:', error)
    throw new Error('Failed to upload PDF. Please try again.')
  }
}

/**
 * Delete PDF from Cloudflare R2 storage
 */
export async function deleteLiabilityFormPDF(pdfUrl: string): Promise<void> {
  const client = getR2Client()
  const bucketName = process.env.R2_BUCKET_NAME
  const publicUrl = process.env.R2_PUBLIC_URL

  if (!client || !bucketName || !publicUrl) {
    console.warn('R2 not configured - cannot delete PDF')
    return
  }

  // Extract key from URL
  const key = pdfUrl.replace(`${publicUrl}/`, '')

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
    )
    console.log(`PDF deleted from R2: ${key}`)
  } catch (error) {
    console.error('Failed to delete PDF from R2:', error)
  }
}
