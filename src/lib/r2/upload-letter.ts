import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

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
    credentials: { accessKeyId, secretAccessKey },
  })
}

export async function uploadLetter(
  fileBuffer: Buffer,
  filename: string,
  orgId: string,
  eventId: string
): Promise<string> {
  const client = getR2Client()
  const bucketName = process.env.R2_BUCKET_NAME
  const publicUrl = process.env.R2_PUBLIC_URL

  if (!client || !bucketName) {
    throw new Error('File storage not configured. Please contact administrator.')
  }

  const timestamp = Date.now()
  const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
  const key = `${orgId}/letters-of-good-standing/${eventId}/${timestamp}_${sanitized}`

  const ext = filename.toLowerCase().split('.').pop()
  let contentType = 'application/octet-stream'
  if (ext === 'pdf') contentType = 'application/pdf'
  else if (ext === 'png') contentType = 'image/png'
  else if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg'

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
