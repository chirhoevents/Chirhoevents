/**
 * Run all organization isolation tests.
 *
 * Usage:
 *   # Unit tests only (no database required):
 *   npx tsx tests/org-isolation/run-all.ts
 *
 *   # All tests including database integration tests:
 *   DATABASE_URL="postgresql://user:pass@host/testdb" npx tsx tests/org-isolation/run-all.ts
 */

import { execSync } from 'child_process'
import path from 'path'

const projectRoot = path.resolve(__dirname, '../..')

const testFiles = [
  '02-auth-layer.test.ts',
  '03-payment-isolation.test.ts',
  '05-group-leader-isolation.test.ts',
  '06-debug-endpoint-vulnerability.test.ts',
  '07-webhook-payment-isolation.test.ts',
  '08-public-registration-endpoint.test.ts',
  '09-refund-and-payment-routing.test.ts',
  '10-group-registration-flow.test.ts',
  '11-payment-integrity.test.ts',
  '12-reporting-isolation.test.ts',
  '13-edge-cases.test.ts',
  '14-security-checklist.test.ts',
]

// Database-required tests (skip if DATABASE_URL not set)
const dbTestFiles = [
  '01-data-model.test.ts',
  '04-api-endpoint-isolation.test.ts',
]

const hasDatabase = !!process.env.DATABASE_URL

console.log('='.repeat(70))
console.log('ChiRho Events — Organization Isolation Test Suite')
console.log('='.repeat(70))
console.log(`Date: ${new Date().toISOString()}`)
console.log(`Database tests: ${hasDatabase ? 'ENABLED' : 'SKIPPED (DATABASE_URL not set)'}`)
console.log('='.repeat(70) + '\n')

const filesToRun = hasDatabase ? [...testFiles, ...dbTestFiles] : testFiles

let totalPassed = 0
let totalFailed = 0
let totalFiles = 0
const failedFiles: string[] = []

for (const file of filesToRun) {
  totalFiles++
  const filePath = path.join(__dirname, file)
  console.log(`\nRunning: ${file}`)
  console.log('-'.repeat(50))

  try {
    execSync(`npx tsx "${filePath}"`, {
      cwd: projectRoot,
      stdio: 'inherit',
      env: { ...process.env },
    })
    totalPassed++
  } catch {
    totalFailed++
    failedFiles.push(file)
  }
}

console.log('\n' + '='.repeat(70))
console.log('FINAL SUMMARY')
console.log('='.repeat(70))
console.log(`Test files run: ${totalFiles}`)
console.log(`Files passed:   ${totalPassed}`)
console.log(`Files failed:   ${totalFailed}`)

if (failedFiles.length > 0) {
  console.log('\nFailed files:')
  for (const f of failedFiles) {
    console.log(`  ✗ ${f}`)
  }
}

if (!hasDatabase) {
  console.log('\n⚠️  Skipped database tests (set DATABASE_URL to run all tests):')
  for (const f of dbTestFiles) {
    console.log(`  - ${f}`)
  }
}

console.log('='.repeat(70))

if (totalFailed > 0) {
  process.exit(1)
}
