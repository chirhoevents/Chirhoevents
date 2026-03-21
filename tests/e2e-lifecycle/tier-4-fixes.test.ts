/**
 * Tier 4 — Low Priority Fixes Test Suite
 *
 * Each test validates the code-level change via static analysis of the
 * modified source files (no live DB / network needed).
 */

import * as fs from 'fs'
import * as path from 'path'

const SRC = path.resolve(__dirname, '../../src')

function readSrc(rel: string) {
  return fs.readFileSync(path.join(SRC, rel), 'utf-8')
}

function pass(name: string) {
  console.log(`    ✅ ${name}`)
}
function fail(name: string, reason: string) {
  console.error(`    ❌ ${name}: ${reason}`)
  failures++
}

let failures = 0

// ---------------------------------------------------------------------------
// FIX 4.1 — Bed Assignment Race Condition
// ---------------------------------------------------------------------------
console.log('\n  FIX 4.1 — Bed assignment wrapped in transaction')
const roomAssignSrc = readSrc('app/api/admin/events/[eventId]/poros/room-assignments/route.ts')

if (roomAssignSrc.includes('prisma.$transaction')) {
  pass('uses prisma.$transaction for atomic capacity check + create')
} else {
  fail('uses prisma.$transaction for atomic capacity check + create', 'transaction not found')
}

if (roomAssignSrc.includes("P2002")) {
  pass('catches P2002 unique constraint and returns 409')
} else {
  fail('catches P2002 unique constraint and returns 409', 'P2002 handler not found')
}

if (roomAssignSrc.includes('That bed is already assigned')) {
  pass('returns descriptive message on bed conflict')
} else {
  fail('returns descriptive message on bed conflict', 'message not found')
}

if (roomAssignSrc.includes('Room is at capacity') && roomAssignSrc.includes("freshRoom")) {
  pass('re-fetches room inside transaction to prevent TOCTOU')
} else {
  fail('re-fetches room inside transaction to prevent TOCTOU', 'freshRoom not found inside transaction')
}

// ---------------------------------------------------------------------------
// FIX 4.2 — Bulk Send Count
// ---------------------------------------------------------------------------
console.log('\n  FIX 4.2 — Bulk send count reports unique recipients')
const bulkSendSrc = readSrc('app/api/admin/emails/bulk-send/route.ts')

if (bulkSendSrc.includes('results.sent + results.failed')) {
  pass('total = sent + failed (unique recipients attempted)')
} else {
  fail('total = sent + failed', 'formula not found')
}

if (!bulkSendSrc.includes('total: groupRegistrations.length')) {
  pass('does not report raw groupRegistrations.length as total')
} else {
  fail('does not report raw groupRegistrations.length as total', 'still reports raw length')
}

// ---------------------------------------------------------------------------
// FIX 4.3 — Housing Submission Notifications
// ---------------------------------------------------------------------------
console.log('\n  FIX 4.3 — Housing submission sends emails')
const housingSrc = readSrc('app/api/group-leader/housing/submit/route.ts')

if (!housingSrc.includes('// TODO: Send confirmation email')) {
  pass('TODO comment for leader email is removed')
} else {
  fail('TODO comment for leader email is removed', 'TODO still present')
}

if (!housingSrc.includes('// TODO: Notify org admin')) {
  pass('TODO comment for admin notification is removed')
} else {
  fail('TODO comment for admin notification is removed', 'TODO still present')
}

if (housingSrc.includes('Housing Preferences Submitted')) {
  pass('sends housing confirmation email to group leader')
} else {
  fail('sends housing confirmation email to group leader', 'subject text not found')
}

if (housingSrc.includes('[Admin] Housing Submitted')) {
  pass('sends admin notification email')
} else {
  fail('sends admin notification email', 'admin subject not found')
}

if (housingSrc.includes("org.contactEmail")) {
  pass('guards admin email send on org.contactEmail existence')
} else {
  fail('guards admin email send on org.contactEmail existence', 'guard not found')
}

// ---------------------------------------------------------------------------
// FIX 4.4 — Staff QR uses UUID
// ---------------------------------------------------------------------------
console.log('\n  FIX 4.4 — Staff QR code uses registration UUID')
const staffSrc = readSrc('app/api/registration/staff/route.ts')

if (!staffSrc.includes('Date.now()')) {
  pass('Date.now() no longer used for QR code data')
} else {
  fail('Date.now() no longer used for QR code data', 'Date.now() still present')
}

if (staffSrc.includes('STAFF-${registration.id}')) {
  pass('QR code data uses registration.id UUID')
} else {
  fail('QR code data uses registration.id UUID', 'pattern not found')
}

if (staffSrc.includes("qrCode: ''") || staffSrc.includes("qrCode: \"\"")) {
  pass('registration created with placeholder qrCode before UUID is known')
} else {
  fail('registration created with placeholder qrCode', 'placeholder not found')
}

// ---------------------------------------------------------------------------
// FIX 4.5 — Staff deduplication
// ---------------------------------------------------------------------------
console.log('\n  FIX 4.5 — Staff registration deduplication')

if (staffSrc.includes("already registered as staff")) {
  pass('returns clear error when staff already registered for event')
} else {
  fail('returns clear error when staff already registered for event', 'message not found')
}

if (staffSrc.includes('staffRegistration.findFirst') && staffSrc.includes('email') && staffSrc.includes("eventId: event.id")) {
  pass('queries by email + eventId to detect duplicates')
} else {
  fail('queries by email + eventId', 'dedup query not found')
}

if (staffSrc.includes("status: 409") || staffSrc.includes("{ status: 409 }")) {
  pass('returns 409 on duplicate staff registration')
} else {
  fail('returns 409 on duplicate staff registration', '409 status not found')
}

// ---------------------------------------------------------------------------
// FIX 4.6 — Poros access code gate
// ---------------------------------------------------------------------------
console.log('\n  FIX 4.6 — Poros access code gate uses correct flag')

if (!staffSrc.includes('liabilityFormsRequiredGroup)')) {
  pass('no longer gates solely on liabilityFormsRequiredGroup')
} else {
  // It's ok if used in a ||  expression — check it's not the ONLY condition
  const onlyGroupFlag = staffSrc.match(/if \(event\.settings\.liabilityFormsRequiredGroup\)/)
  if (!onlyGroupFlag) {
    pass('no longer gates solely on liabilityFormsRequiredGroup')
  } else {
    fail('no longer gates solely on liabilityFormsRequiredGroup', 'still gates on group flag alone')
  }
}

if (staffSrc.includes('liabilityFormsRequiredGroup || event.settings.liabilityFormsRequiredIndividual')) {
  pass('gates on group OR individual liability flag')
} else {
  fail('gates on group OR individual liability flag', 'combined condition not found')
}

// ---------------------------------------------------------------------------
// FIX 4.7 — Event slug error message
// ---------------------------------------------------------------------------
console.log('\n  FIX 4.7 — Event slug conflict returns clear error')
const createEventSrc = readSrc('app/api/admin/events/create/route.ts')
const updateEventSrc = readSrc('app/api/admin/events/[eventId]/route.ts')

if (createEventSrc.includes('P2002') && createEventSrc.includes('slug')) {
  pass('create route catches P2002 slug conflict')
} else {
  fail('create route catches P2002 slug conflict', 'handler not found')
}

if (createEventSrc.includes('This URL path is already in use')) {
  pass('create route returns clear slug conflict message')
} else {
  fail('create route returns clear slug conflict message', 'message not found')
}

if (createEventSrc.includes('slugConflict: true')) {
  pass('create route includes slugConflict flag in response')
} else {
  fail('create route includes slugConflict flag in response', 'flag not found')
}

if (updateEventSrc.includes('P2002') && updateEventSrc.includes('This URL path is already in use')) {
  pass('update route also handles slug conflict')
} else {
  fail('update route also handles slug conflict', 'handler not found in update route')
}

// ---------------------------------------------------------------------------
// FIX 4.8 — Day pass pricing
// ---------------------------------------------------------------------------
console.log('\n  FIX 4.8 — Day pass pricing uses DayPassOption.price')
const indivRegSrc = readSrc('app/api/registration/individual/route.ts')

if (indivRegSrc.includes('dayPassOption.findUnique') && indivRegSrc.includes("body.dayPassOptionId")) {
  pass('queries DayPassOption.price when dayPassOptionId is provided')
} else {
  fail('queries DayPassOption.price when dayPassOptionId is provided', 'query not found')
}

if (indivRegSrc.includes('individualDayPassPrice')) {
  pass('falls back to individualDayPassPrice when no option-specific price')
} else {
  fail('falls back to individualDayPassPrice', 'fallback not found')
}

// ---------------------------------------------------------------------------
// FIX 4.9 — Export all org filter
// ---------------------------------------------------------------------------
console.log('\n  FIX 4.9 — Export all adds org filter for eventId=all')
const exportAllSrc = readSrc('app/api/admin/events/[eventId]/reports/export-all/route.ts')

if (exportAllSrc.includes('organizationId: effectiveOrgId')) {
  pass('applies organizationId filter when eventId is all')
} else {
  fail('applies organizationId filter when eventId is all', 'filter not found')
}

if (!exportAllSrc.includes("eventId === 'all' ? {}")) {
  pass('no longer uses empty filter {} for all-events case')
} else {
  fail('no longer uses empty filter {} for all-events case', 'empty filter still present')
}

// ---------------------------------------------------------------------------
// FIX 4.10 — Medical export filename
// ---------------------------------------------------------------------------
console.log('\n  FIX 4.10 — Medical export filename has CONFIDENTIAL_ prefix')
const medExportSrc = readSrc('app/api/admin/events/[eventId]/reports/medical/export/route.ts')

const confPdfMatch = medExportSrc.match(/filename="CONFIDENTIAL_medical_report_.*\.pdf"/)
if (confPdfMatch) {
  pass('PDF filename starts with CONFIDENTIAL_')
} else {
  fail('PDF filename starts with CONFIDENTIAL_', 'prefix not found')
}

const confCsvMatch = medExportSrc.match(/filename="CONFIDENTIAL_medical_report_.*\.csv"/)
if (confCsvMatch) {
  pass('CSV filename starts with CONFIDENTIAL_')
} else {
  fail('CSV filename starts with CONFIDENTIAL_', 'prefix not found')
}

// ---------------------------------------------------------------------------
// FIX 4.11 — Registration lookup API
// ---------------------------------------------------------------------------
console.log('\n  FIX 4.11 — Registration lookup endpoint exists')
const lookupSrc = readSrc('app/api/events/[eventId]/lookup-registration/route.ts')

if (lookupSrc.includes('groupRegistration.findFirst') && lookupSrc.includes('accessCode')) {
  pass('looks up group registration by email + accessCode')
} else {
  fail('looks up group registration by email + accessCode', 'group lookup not found')
}

if (lookupSrc.includes('individualRegistration.findFirst') && lookupSrc.includes('confirmationCode')) {
  pass('looks up individual registration by email + confirmationCode')
} else {
  fail('looks up individual registration by email + confirmationCode', 'individual lookup not found')
}

if (lookupSrc.includes('found: false') && lookupSrc.includes('status: 404')) {
  pass('returns 404 with found:false on no match (avoids email enumeration)')
} else {
  fail('returns 404 with found:false on no match', 'not found response missing')
}

if (lookupSrc.includes('confirmationUrl') && lookupSrc.includes('portalUrl')) {
  pass('returns portal/confirmation URL for client navigation')
} else {
  fail('returns portal/confirmation URL for client navigation', 'URL fields not found')
}

// ---------------------------------------------------------------------------
// FIX 4.12 — Roommate prefs note
// ---------------------------------------------------------------------------
console.log('\n  FIX 4.12 — Roommate prefs surfaced as note in response')
const autoAssignSrc = readSrc('app/api/admin/events/[eventId]/poros/auto-assign/route.ts')

if (autoAssignSrc.includes('roommatePrefsNote')) {
  pass('response includes roommatePrefsNote when prefs were requested')
} else {
  fail('response includes roommatePrefsNote', 'roommatePrefsNote not found')
}

if (autoAssignSrc.includes('Manual assignment is required')) {
  pass('note explains that manual assignment is needed')
} else {
  fail('note explains that manual assignment is needed', 'explanation not found')
}

// ---------------------------------------------------------------------------
// FIX 4.13 — Auto-assign mutex
// ---------------------------------------------------------------------------
console.log('\n  FIX 4.13 — Auto-assign mutex prevents concurrent runs')

if (autoAssignSrc.includes('autoAssignRunning') && autoAssignSrc.includes('new Set')) {
  pass('in-memory Set used as mutex')
} else {
  fail('in-memory Set used as mutex', 'Set not found')
}

if (autoAssignSrc.includes('autoAssignRunning.has(eventId)')) {
  pass('checks mutex before starting auto-assign')
} else {
  fail('checks mutex before starting auto-assign', 'mutex check not found')
}

if (autoAssignSrc.includes('autoAssignRunning.add(eventId)') && autoAssignSrc.includes('autoAssignRunning.delete(eventId)')) {
  pass('adds and removes eventId from mutex Set')
} else {
  fail('adds and removes eventId from mutex Set', 'add/delete not found')
}

if (autoAssignSrc.includes('} finally {') && autoAssignSrc.indexOf('autoAssignRunning.delete') > autoAssignSrc.indexOf('finally')) {
  pass('mutex is released in finally block (always runs)')
} else {
  fail('mutex is released in finally block', 'finally/delete ordering wrong')
}

// ---------------------------------------------------------------------------
// FIX 4.14 — Individual registrants in poros-liability stats
// ---------------------------------------------------------------------------
console.log('\n  FIX 4.14 — Poros-liability stats includes individual registrants')
const liabilityStatsSrc = readSrc('app/api/admin/events/[eventId]/poros-liability/stats/route.ts')

if (liabilityStatsSrc.includes('individualRegistration.count') && liabilityStatsSrc.includes('safeEnvironmentCertStatus')) {
  pass('counts individual safe env cert status in stats')
} else {
  fail('counts individual safe env cert status in stats', 'individual count not found')
}

if (liabilityStatsSrc.includes('indivVerifiedCerts') && liabilityStatsSrc.includes('groupVerifiedCerts')) {
  pass('combines group and individual verified cert counts')
} else {
  fail('combines group and individual verified cert counts', 'combined count not found')
}

if (liabilityStatsSrc.includes("safeEnvironmentCertStatus: 'verified'") &&
    liabilityStatsSrc.includes("safeEnvironmentCertStatus: 'pending'")) {
  pass('queries individual verified and pending cert counts separately')
} else {
  fail('queries individual verified and pending cert counts separately', 'status queries not found')
}

// ---------------------------------------------------------------------------
// FIX 4.15 — Check-in export
// ---------------------------------------------------------------------------
console.log('\n  FIX 4.15 — Check-in export endpoint')
const checkInExportSrc = readSrc('app/api/admin/events/[eventId]/reports/check-in/export/route.ts')

if (checkInExportSrc.includes('participant.findMany') && checkInExportSrc.includes('checkedIn: true')) {
  pass('queries checked-in group participants')
} else {
  fail('queries checked-in group participants', 'participant query not found')
}

if (checkInExportSrc.includes('individualRegistration.findMany') && checkInExportSrc.includes('checkedIn: true')) {
  pass('queries checked-in individual registrants')
} else {
  fail('queries checked-in individual registrants', 'individual query not found')
}

if (checkInExportSrc.includes('Check-In Time') && checkInExportSrc.includes('Station')) {
  pass('CSV includes Check-In Time and Station columns')
} else {
  fail('CSV includes Check-In Time and Station columns', 'columns not found')
}

if (checkInExportSrc.includes('check_in_') && checkInExportSrc.includes('.csv')) {
  pass('returns CSV file with check_in_ prefix')
} else {
  fail('returns CSV file with check_in_ prefix', 'filename not found')
}

// ---------------------------------------------------------------------------
// FIX 4.16 — ZIP bundle export
// ---------------------------------------------------------------------------
console.log('\n  FIX 4.16 — ZIP bundle export')
const bundleSrc = readSrc('app/api/admin/events/[eventId]/reports/bundle/route.ts')

if (bundleSrc.includes('buildZip') && bundleSrc.includes('0x04034b50')) {
  pass('builds valid ZIP format (local file header signature)')
} else {
  fail('builds valid ZIP format', 'ZIP local header signature not found')
}

if (bundleSrc.includes('0x02014b50')) {
  pass('ZIP includes central directory entries')
} else {
  fail('ZIP includes central directory entries', 'central dir signature not found')
}

if (bundleSrc.includes('0x06054b50')) {
  pass('ZIP includes end-of-central-directory record')
} else {
  fail('ZIP includes end-of-central-directory record', 'EOCD signature not found')
}

if (bundleSrc.includes('deflateRawSync')) {
  pass('uses deflate compression for ZIP entries')
} else {
  fail('uses deflate compression for ZIP entries', 'deflateRawSync not found')
}

if (bundleSrc.includes("application/zip") && bundleSrc.includes('export_bundle_')) {
  pass('returns application/zip content-type with export_bundle_ filename')
} else {
  fail('returns application/zip with correct filename', 'content-type/filename not found')
}

if (bundleSrc.includes('rapha.access') && bundleSrc.includes('CONFIDENTIAL_medical_')) {
  pass('medical export gated on rapha.access permission')
} else {
  fail('medical export gated on rapha.access', 'rapha guard not found')
}

if (bundleSrc.includes('omittedFiles') && bundleSrc.includes('README.txt')) {
  pass('includes README.txt listing files and noting omitted exports')
} else {
  fail('includes README.txt with omitted files note', 'README not found')
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
const total = 57  // update if test count changes
const passed = total - failures
console.log('\n' + '='.repeat(50))
console.log(`  Results: ${passed} passed, ${failures} failed`)
console.log('='.repeat(50) + '\n')

if (failures > 0) process.exit(1)
