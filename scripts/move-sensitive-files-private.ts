/**
 * One-time move of Safe Environment certificates and letters of good
 * standing out of the public R2 bucket into the private one.
 *
 * Before this runs, these files can be opened by anyone with the link. After
 * it runs, the database holds `r2-private://` references and the files open
 * only through /api/secure-files (login + access check).
 *
 * Needs R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME,
 * R2_PUBLIC_URL, R2_PRIVATE_BUCKET_NAME and DATABASE_URL.
 *
 * 1. Dry run (changes nothing, prints counts):
 *      npx tsx scripts/move-sensitive-files-private.ts
 * 2. Copy files to the private bucket and point the database at them
 *    (originals stay in the public bucket, so this is safe to re-run):
 *      DRY_RUN=false npx tsx scripts/move-sensitive-files-private.ts
 * 3. Once you've opened a few certificates in the app and they work,
 *    delete the public copies:
 *      DRY_RUN=false DELETE_PUBLIC=true npx tsx scripts/move-sensitive-files-private.ts
 */

import { prisma } from '../src/lib/prisma'
import { moveToPrivateBucket, deleteSensitiveFile, privateRefKey, PRIVATE_REF_PREFIX } from '../src/lib/r2/private-files'

const DRY_RUN = process.env.DRY_RUN !== 'false'
const DELETE_PUBLIC = process.env.DELETE_PUBLIC === 'true'

type Column = {
  label: string
  find: (publicPrefix: string) => Promise<Array<{ id: string; value: string }>>
  update: (id: string, ref: string) => Promise<unknown>
}

const COLUMNS: Column[] = [
  {
    label: 'safe_environment_certificates.file_url',
    find: async prefix => (await prisma.safeEnvironmentCertificate.findMany({
      where: { fileUrl: { startsWith: prefix } }, select: { id: true, fileUrl: true },
    })).map(r => ({ id: r.id, value: r.fileUrl })),
    update: (id, ref) => prisma.safeEnvironmentCertificate.update({ where: { id }, data: { fileUrl: ref } }),
  },
  {
    label: 'participants.safe_environment_cert_url',
    find: async prefix => (await prisma.participant.findMany({
      where: { safeEnvironmentCertUrl: { startsWith: prefix } }, select: { id: true, safeEnvironmentCertUrl: true },
    })).map(r => ({ id: r.id, value: r.safeEnvironmentCertUrl! })),
    update: (id, ref) => prisma.participant.update({ where: { id }, data: { safeEnvironmentCertUrl: ref } }),
  },
  {
    label: 'letters_of_good_standing.file_url',
    find: async prefix => (await prisma.letterOfGoodStanding.findMany({
      where: { fileUrl: { startsWith: prefix } }, select: { id: true, fileUrl: true },
    })).map(r => ({ id: r.id, value: r.fileUrl! })),
    update: (id, ref) => prisma.letterOfGoodStanding.update({ where: { id }, data: { fileUrl: ref } }),
  },
  {
    label: 'staff_registrations.safe_environment_cert_url',
    find: async prefix => (await prisma.staffRegistration.findMany({
      where: { safeEnvironmentCertUrl: { startsWith: prefix } }, select: { id: true, safeEnvironmentCertUrl: true },
    })).map(r => ({ id: r.id, value: r.safeEnvironmentCertUrl! })),
    update: (id, ref) => prisma.staffRegistration.update({ where: { id }, data: { safeEnvironmentCertUrl: ref } }),
  },
  {
    label: 'vendor_registrations.safe_environment_cert_url',
    find: async prefix => (await prisma.vendorRegistration.findMany({
      where: { safeEnvironmentCertUrl: { startsWith: prefix } }, select: { id: true, safeEnvironmentCertUrl: true },
    })).map(r => ({ id: r.id, value: r.safeEnvironmentCertUrl! })),
    update: (id, ref) => prisma.vendorRegistration.update({ where: { id }, data: { safeEnvironmentCertUrl: ref } }),
  },
]

async function main() {
  const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/+$/, '')
  if (!publicUrl || !process.env.R2_PRIVATE_BUCKET_NAME) {
    throw new Error('Set R2_PUBLIC_URL and R2_PRIVATE_BUCKET_NAME first')
  }
  const prefix = `${publicUrl}/`
  console.log(`\n🔒 Move sensitive files to the private bucket — DRY_RUN=${DRY_RUN} DELETE_PUBLIC=${DELETE_PUBLIC}\n`)

  // Gather every row still pointing at the public bucket. The same file is
  // often referenced twice (certificate row + participant row), so copy each
  // file once.
  const rowsByColumn = new Map<Column, Array<{ id: string; value: string }>>()
  const uniqueUrls = new Set<string>()
  for (const column of COLUMNS) {
    const rows = await column.find(prefix)
    rowsByColumn.set(column, rows)
    rows.forEach(r => uniqueUrls.add(r.value))
    console.log(`  ${column.label}: ${rows.length} row(s) on the public bucket`)
  }
  console.log(`  ${uniqueUrls.size} unique file(s) to move\n`)

  if (!DRY_RUN) {
    const refByUrl = new Map<string, string>()
    let failed = 0
    for (const url of uniqueUrls) {
      try {
        const ref = await moveToPrivateBucket(url, false)
        if (ref) refByUrl.set(url, ref)
      } catch (err) {
        failed++
        console.error(`  ❌ Could not copy ${url}:`, (err as Error).message)
      }
    }
    console.log(`  Copied ${refByUrl.size} file(s), ${failed} failed`)

    let updated = 0
    for (const [column, rows] of rowsByColumn) {
      for (const row of rows) {
        const ref = refByUrl.get(row.value)
        if (!ref) continue
        await column.update(row.id, ref)
        updated++
      }
    }
    console.log(`  Updated ${updated} database row(s)\n`)
  }

  if (!DRY_RUN && DELETE_PUBLIC) {
    // A moved file keeps the same key in both buckets, so every private
    // reference names the public copy to delete. Rows still on the public
    // bucket (a copy that failed above) aren't touched.
    const movedKeys = new Set<string>()
    for (const column of COLUMNS) {
      for (const row of await column.find(PRIVATE_REF_PREFIX)) movedKeys.add(privateRefKey(row.value))
    }
    let deleted = 0
    for (const key of movedKeys) {
      try {
        await deleteSensitiveFile(`${prefix}${key}`)
        deleted++
      } catch (err) {
        console.error(`  ❌ Could not delete public copy of ${key}:`, (err as Error).message)
      }
    }
    console.log(`  Removed public copies of ${deleted} file(s)\n`)
  }

  if (DRY_RUN) console.log('  Dry run only. Re-run with DRY_RUN=false to move the files.\n')
}

main()
  .catch(err => { console.error(err); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
