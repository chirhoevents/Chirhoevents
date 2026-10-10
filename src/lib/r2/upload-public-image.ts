/**
 * Upload a public image (Lux logo, parish page header) to the public R2
 * bucket and return its URL. Raster images only: SVG can carry scripts.
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
}
export const MAX_PUBLIC_IMAGE_BYTES = 5 * 1024 * 1024

/** A problem with the file the user picked, or null if it's fine */
export function publicImageProblem(file: File | null): string | null {
  if (!file || file.size === 0) return 'Choose an image to upload.'
  if (file.size > MAX_PUBLIC_IMAGE_BYTES) return 'That image is over 5 MB. Please use a smaller one.'
  const ext = file.name.toLowerCase().split('.').pop() || ''
  if (!TYPES[ext]) return 'Please upload a PNG, JPG, WebP or GIF image.'
  return null
}

export async function uploadPublicImage(buffer: Buffer, keyWithoutExt: string, filename: string): Promise<string> {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const bucket = process.env.R2_BUCKET_NAME
  const publicUrl = process.env.R2_PUBLIC_URL
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    throw new Error('File storage not configured. Please contact administrator.')
  }
  const ext = filename.toLowerCase().split('.').pop() || 'png'
  const contentType = TYPES[ext]
  if (!contentType) throw new Error('Unsupported image type.')
  const key = `${keyWithoutExt}.${ext}`
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: contentType }))
  // Cache-busting so a replaced image shows right away
  return `${publicUrl}/${key}?t=${Date.now()}`
}
