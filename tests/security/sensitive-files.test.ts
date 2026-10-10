/**
 * Sensitive file storage (Safe Environment certificates, letters of good standing)
 *
 * These used to be uploaded to the public R2 bucket and their permanent
 * public URLs handed to the browser. Now they go to a private bucket, the
 * database stores an `r2-private://` reference, and the browser only ever
 * sees /api/secure-files links, which check login before redirecting to a
 * short-lived signed URL.
 *
 * No network or R2 account needed: S3Client.send is stubbed and presigning is
 * computed locally.
 *
 * Run: npx tsx tests/security/sensitive-files.test.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { S3Client } from '@aws-sdk/client-s3'

process.env.R2_ACCOUNT_ID = 'acct'
process.env.R2_ACCESS_KEY_ID = 'key'
process.env.R2_SECRET_ACCESS_KEY = 'secret'
process.env.R2_BUCKET_NAME = 'public-bucket'
process.env.R2_PUBLIC_URL = 'https://files.example.com'

const sent: Array<{ name: string; input: any }> = []
S3Client.prototype.send = (async function (command: any) {
  sent.push({ name: command.constructor.name, input: command.input })
  return {}
}) as any

const SRC = path.resolve(__dirname, '../../src')
const readSrc = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf-8')

let failures = 0
function check(name: string, ok: boolean) {
  if (ok) console.log(`    ✅ ${name}`)
  else { console.error(`    ❌ ${name}`); failures++ }
}

async function main() {
  const files = await import('../../src/lib/r2/private-files')

  console.log('\n  Uploads')
  process.env.R2_PRIVATE_BUCKET_NAME = 'private-bucket'
  sent.length = 0
  const ref = await files.uploadSensitiveFile(Buffer.from('pdf'), 'org/certificates/p1/1_cert.pdf', 'application/pdf')
  check('stores a private reference, not a URL', ref === 'r2-private://org/certificates/p1/1_cert.pdf')
  check('writes to the private bucket', sent[0]?.name === 'PutObjectCommand' && sent[0].input.Bucket === 'private-bucket')

  delete process.env.R2_PRIVATE_BUCKET_NAME
  sent.length = 0
  const origError = console.error
  console.error = () => {}
  const fallback = await files.uploadSensitiveFile(Buffer.from('pdf'), 'org/certificates/p1/2_cert.pdf', 'application/pdf')
  console.error = origError
  check('falls back to the public bucket only while the private one is not configured',
    fallback === 'https://files.example.com/org/certificates/p1/2_cert.pdf' && sent[0]?.input.Bucket === 'public-bucket')
  process.env.R2_PRIVATE_BUCKET_NAME = 'private-bucket'

  console.log('\n  Viewing')
  const signed = await files.viewableUrl(ref)
  const signedUrl = new URL(signed)
  check('private files open through a signed link to the private bucket',
    signedUrl.pathname.includes('private-bucket') || signedUrl.hostname.startsWith('private-bucket'))
  check('the signed link expires after 5 minutes', signedUrl.searchParams.get('X-Amz-Expires') === '300')
  check('the signed link is not the public URL', !signed.startsWith('https://files.example.com'))
  check('legacy public URLs still open until they are moved',
    (await files.viewableUrl('https://files.example.com/old.pdf')) === 'https://files.example.com/old.pdf')

  check('API responses get a login-checked link', files.secureFileLink('letter', 'abc', ref) === '/api/secure-files/letter/abc')
  check('no link when there is no file', files.secureFileLink('letter', 'abc', null) === null)

  console.log('\n  Migration copy keeps the same key')
  sent.length = 0
  const moved = await files.moveToPrivateBucket('https://files.example.com/org/letters-of-good-standing/e1/3_letter.pdf', false)
  check('returns the private reference for the same key', moved === 'r2-private://org/letters-of-good-standing/e1/3_letter.pdf')
  check('copies public → private without deleting', sent.length === 1 && sent[0].name === 'CopyObjectCommand' &&
    sent[0].input.Bucket === 'private-bucket' && sent[0].input.CopySource === 'public-bucket/org/letters-of-good-standing/e1/3_letter.pdf')
  check('ignores URLs outside our bucket', (await files.moveToPrivateBucket('https://evil.example.com/x.pdf', false)) === null)

  console.log('\n  Upload helpers and API routes')
  for (const helper of ['lib/r2/upload-certificate.ts', 'lib/r2/upload-letter.ts', 'lib/r2/upload-safe-env-cert.ts']) {
    const src = readSrc(helper)
    check(`${helper} uploads through uploadSensitiveFile`, src.includes('uploadSensitiveFile') && !src.includes('R2_PUBLIC_URL'))
  }

  const routesThatReturnFiles = [
    'app/api/admin/events/[eventId]/poros-liability/certificates/route.ts',
    'app/api/admin/events/[eventId]/poros-liability/forms/[formId]/certificate/route.ts',
    'app/api/admin/events/[eventId]/letters-of-good-standing/route.ts',
    'app/api/admin/events/[eventId]/staff/route.ts',
    'app/api/admin/events/[eventId]/staff/[staffId]/route.ts',
    'app/api/admin/events/[eventId]/staff/[staffId]/safe-env-cert/route.ts',
    'app/api/admin/events/[eventId]/vendors/route.ts',
    'app/api/admin/events/[eventId]/vendors/[vendorId]/route.ts',
    'app/api/admin/events/[eventId]/vendors/[vendorId]/safe-env-cert/route.ts',
    'app/api/group-leader/certificates/route.ts',
    'app/api/group-leader/certificates/upload/route.ts',
  ]
  for (const route of routesThatReturnFiles) {
    check(`${route} returns secureFileLink`, readSrc(route).includes('secureFileLink('))
  }

  const viewer = readSrc('app/api/secure-files/[kind]/[id]/route.ts')
  check('viewer checks org admin access', viewer.includes('verifyEventAccess(') && viewer.includes('requireAdmin: true'))
  check('viewer lets a group leader open only their own group\'s files', /groupRegistration\.findFirst\(\{\s*where: \{ id: file\.groupRegistrationId, clerkUserId \}/.test(viewer))
  check('viewer responses are never cached', viewer.includes("'Cache-Control': 'no-store'"))

  const reports = readSrc('lib/reports/master-report-attachments.ts')
  check('master PDF report reads private files from the private bucket', reports.includes('R2_PRIVATE_BUCKET_NAME') && reports.includes('isPrivateRef'))

  console.log(failures ? `\n  ${failures} check(s) failed\n` : '\n  All checks passed\n')
  process.exit(failures ? 1 : 0)
}

main().catch(err => { console.error(err); process.exit(1) })
