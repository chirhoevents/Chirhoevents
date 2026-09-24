/**
 * Attachment appendices for the Master Event Report.
 *
 * Pulls the original uploaded files (safe environment certificates, letters
 * of good standing, welcome packet inserts, schedule PDFs, ...) out of R2
 * and merges them into the report so the archive holds the actual documents,
 * not just links that die when storage is cleaned up.
 *
 * - PDFs are copied page-for-page and stamped with a small label at the top.
 * - PNG / JPEG images are placed on their own page under a label header.
 * - Anything else (or a file that can't be fetched) gets a placeholder page
 *   recording who it belonged to and where it was stored, so the gap is
 *   visible in the archive instead of silently missing.
 */

import { PDFDocument, PDFFont, StandardFonts, rgb } from 'pdf-lib'
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'

export interface ArchiveAttachment {
  /** Short label stamped on every page, e.g. "Safe Environment Certificate - Jane Doe" */
  label: string
  /** Extra lines shown on image / placeholder pages (group, program, dates, status...) */
  details: string[]
  url: string | null
}

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

/** Only files in our own R2 bucket are fetched — never arbitrary URLs. */
function r2KeyFromUrl(url: string): string | null {
  const publicUrl = process.env.R2_PUBLIC_URL
  if (!publicUrl) return null
  const base = publicUrl.replace(/\/+$/, '') + '/'
  if (!url.startsWith(base)) return null
  const raw = url.slice(base.length).split('?')[0]
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

export function isStoredFileUrl(url: string | null | undefined): boolean {
  return !!url && r2KeyFromUrl(url) !== null
}

async function fetchStoredFile(url: string): Promise<Buffer | null> {
  const key = r2KeyFromUrl(url)
  if (!key) return null

  const client = getR2Client()
  const bucket = process.env.R2_BUCKET_NAME
  if (client && bucket) {
    try {
      const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
      const bytes = await (res.Body as any)?.transformToByteArray()
      if (bytes) return Buffer.from(bytes)
    } catch (err: any) {
      console.warn(`[Master Report PDF] R2 get failed for ${key}:`, err?.message || err)
    }
  }

  // Fall back to the public URL (e.g. local dev without write credentials).
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) })
    if (res.ok) return Buffer.from(await res.arrayBuffer())
  } catch (err: any) {
    console.warn(`[Master Report PDF] fetch failed for ${url}:`, err?.message || err)
  }
  return null
}

function sniffType(buf: Buffer): 'pdf' | 'png' | 'jpeg' | 'other' {
  if (buf.length >= 4 && buf.subarray(0, 4).toString('latin1') === '%PDF') return 'pdf'
  // Some PDFs carry leading junk before the header; look a little further in.
  if (buf.subarray(0, 1024).toString('latin1').includes('%PDF-')) return 'pdf'
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png'
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg'
  return 'other'
}

/** Standard PDF fonts are WinAnsi-only; swap anything else for '?'. */
function winAnsi(text: string): string {
  return text
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '?')
}

function wrapLine(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const out: string[] = []
  let line = ''
  for (const word of winAnsi(text).split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate
      continue
    }
    if (line) out.push(line)
    // Hard-break words (URLs) longer than the line.
    let rest = word
    while (font.widthOfTextAtSize(rest, size) > maxWidth && rest.length > 1) {
      let n = rest.length
      while (n > 1 && font.widthOfTextAtSize(rest.slice(0, n), size) > maxWidth) n--
      out.push(rest.slice(0, n))
      rest = rest.slice(n)
    }
    line = rest
  }
  if (line) out.push(line)
  return out
}

const PAGE_W = 612
const PAGE_H = 792
const NAVY = rgb(0x1e / 255, 0x3a / 255, 0x5f / 255)
const GRAY = rgb(0.42, 0.45, 0.5)
const RED = rgb(0.72, 0.11, 0.11)

/** Draws the label + detail header; returns the y coordinate below it. */
function drawHeader(
  page: ReturnType<PDFDocument['addPage']>,
  item: ArchiveAttachment,
  fonts: { regular: PDFFont; bold: PDFFont },
  notice?: string
): number {
  const M = 40
  let y = PAGE_H - M - 14
  for (const line of wrapLine(item.label, fonts.bold, 14, PAGE_W - M * 2)) {
    page.drawText(line, { x: M, y, size: 14, font: fonts.bold, color: NAVY })
    y -= 18
  }
  for (const d of item.details) {
    for (const line of wrapLine(d, fonts.regular, 9.5, PAGE_W - M * 2)) {
      page.drawText(line, { x: M, y, size: 9.5, font: fonts.regular, color: GRAY })
      y -= 13
    }
  }
  if (notice) {
    y -= 8
    for (const line of wrapLine(notice, fonts.bold, 10.5, PAGE_W - M * 2)) {
      page.drawText(line, { x: M, y, size: 10.5, font: fonts.bold, color: RED })
      y -= 15
    }
  }
  page.drawLine({ start: { x: M, y: y + 4 }, end: { x: PAGE_W - M, y: y + 4 }, thickness: 0.7, color: GRAY })
  return y - 8
}

async function appendOne(
  merged: PDFDocument,
  item: ArchiveAttachment,
  buf: Buffer | null,
  fonts: { regular: PDFFont; bold: PDFFont }
): Promise<boolean> {
  const placeholder = (notice: string) => {
    const page = merged.addPage([PAGE_W, PAGE_H])
    drawHeader(page, item, fonts, notice)
  }

  if (!item.url) {
    placeholder('No file was uploaded for this record.')
    return false
  }
  if (!buf) {
    placeholder(
      isStoredFileUrl(item.url)
        ? `The original file could not be retrieved from storage. It was stored at: ${item.url}`
        : `This file is stored outside ChiRho Events file storage and was not copied into the report. Location: ${item.url}`
    )
    return false
  }

  const kind = sniffType(buf)
  try {
    if (kind === 'pdf') {
      const src = await PDFDocument.load(buf, { ignoreEncryption: true })
      const pages = await merged.copyPages(src, src.getPageIndices())
      pages.forEach((p, i) => {
        merged.addPage(p)
        const { width, height } = p.getSize()
        const stamp = winAnsi(`${item.label}  -  page ${i + 1} of ${pages.length}`)
        const size = 7
        const textW = fonts.regular.widthOfTextAtSize(stamp, size)
        p.drawRectangle({ x: 10, y: height - 13, width: Math.min(textW + 8, width - 20), height: 11, color: rgb(1, 1, 1), opacity: 0.85 })
        p.drawText(stamp, { x: 14, y: height - 10, size, font: fonts.regular, color: GRAY })
      })
      return true
    }

    if (kind === 'png' || kind === 'jpeg') {
      const img = kind === 'png' ? await merged.embedPng(buf) : await merged.embedJpg(buf)
      const page = merged.addPage([PAGE_W, PAGE_H])
      const top = drawHeader(page, item, fonts)
      const M = 40
      const maxW = PAGE_W - M * 2
      const maxH = top - M
      const scale = Math.min(maxW / img.width, maxH / img.height)
      const w = img.width * scale
      const h = img.height * scale
      page.drawImage(img, { x: (PAGE_W - w) / 2, y: top - h, width: w, height: h })
      return true
    }
  } catch (err: any) {
    console.warn(`[Master Report PDF] Could not embed "${item.label}":`, err?.message || err)
    placeholder(`The file could not be embedded (it may be damaged or password-protected). Original location: ${item.url}`)
    return false
  }

  placeholder(`This file type cannot be embedded in a PDF. Original location: ${item.url}`)
  return false
}

/**
 * Appends every attachment to `merged`, downloading a few files at a time
 * so a large event doesn't hold hundreds of uploads in memory at once.
 * Items not reached before `deadline` are returned as `skipped`.
 */
export async function appendAttachments(
  merged: PDFDocument,
  items: ArchiveAttachment[],
  deadline?: number
): Promise<{ embedded: number; notEmbedded: number; skipped: ArchiveAttachment[] }> {
  const fonts = {
    regular: await merged.embedFont(StandardFonts.Helvetica),
    bold: await merged.embedFont(StandardFonts.HelveticaBold),
  }
  const BATCH = 6
  let embedded = 0
  let notEmbedded = 0
  for (let i = 0; i < items.length; i += BATCH) {
    if (deadline && Date.now() > deadline) {
      return { embedded, notEmbedded, skipped: items.slice(i) }
    }
    const batch = items.slice(i, i + BATCH)
    const files = await Promise.all(
      batch.map(it => (it.url ? fetchStoredFile(it.url) : Promise.resolve(null)))
    )
    for (let j = 0; j < batch.length; j++) {
      if (await appendOne(merged, batch[j], files[j], fonts)) embedded++
      else notEmbedded++
    }
  }
  return { embedded, notEmbedded, skipped: [] }
}

/**
 * Stores the finished report in R2 and returns its URL. The report is far
 * larger than the ~4.5 MB a serverless function can return directly once
 * uploaded certificates and forms are embedded, so the browser downloads it
 * from storage instead. Returns null when R2 isn't configured (local dev),
 * in which case the caller streams the bytes back directly.
 */
export async function uploadMasterReport(
  pdf: Buffer,
  orgId: string,
  eventId: string,
  filename: string
): Promise<string | null> {
  const client = getR2Client()
  const bucket = process.env.R2_BUCKET_NAME
  const publicUrl = process.env.R2_PUBLIC_URL
  if (!client || !bucket || !publicUrl) return null

  const key = `${orgId}/${eventId}/master-reports/${Date.now()}_${crypto.randomUUID()}/${filename}`
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: pdf,
      ContentType: 'application/pdf',
      ContentDisposition: `attachment; filename="${filename}"`,
    })
  )
  return `${publicUrl.replace(/\/+$/, '')}/${key}`
}
