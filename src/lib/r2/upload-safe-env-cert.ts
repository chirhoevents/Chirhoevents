/**
 * Upload a Safe Environment certificate for a staff or vendor registrant
 * that an org admin has received out-of-band (e.g. by email) and is
 * uploading on the registrant's behalf.
 *
 * R2 path structure: /{orgId}/safe-env-certs/{registrationType}/{registrationId}/{timestamp}_{filename}
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

function getR2Client() {
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

export async function uploadSafeEnvCert(
  fileBuffer: Buffer,
  filename: string,
  registrationType: 'staff' | 'vendor',
  registrationId: string,
  orgId: string
): Promise<string> {
  const client = getR2Client()
  const bucketName = process.env.R2_BUCKET_NAME
  const publicUrl = process.env.R2_PUBLIC_URL

  if (!client || !bucketName || !publicUrl) {
    throw new Error('File storage not configured. Please contact administrator.')
  }

  const timestamp = Date.now()
  const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
  const key = `${orgId}/safe-env-certs/${registrationType}/${registrationId}/${timestamp}_${sanitized}`

  const ext = filename.toLowerCase().split('.').pop()
  const contentType =
    ext === 'pdf' ? 'application/pdf'
    : ext === 'png' ? 'image/png'
    : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
    : ext === 'gif' ? 'image/gif'
    : ext === 'webp' ? 'image/webp'
    : 'application/octet-stream'

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    })
  )

  return `${publicUrl}/${key}`
}
