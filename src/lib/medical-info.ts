/**
 * Helpers for medical free-text fields on liability forms.
 *
 * Users often type "none", "N/A", or similar to satisfy a required-looking
 * field even though they have nothing to report. Treat those as no info so
 * the admin UI doesn't flag the registration as having medical needs.
 */

const NO_INFO_TOKENS = new Set([
  '',
  'none',
  'no',
  'na',
  'n/a',
  'nope',
  'nothing',
  'null',
])

export function hasRealMedicalText(value: string | null | undefined): boolean {
  if (!value) return false
  const normalized = value.trim().toLowerCase().replace(/\.+$/, '')
  if (!normalized) return false
  return !NO_INFO_TOKENS.has(normalized)
}

export function sanitizeMedicalText(value: string | null | undefined): string {
  return hasRealMedicalText(value) ? (value as string).trim() : ''
}

export function hasAnyMedicalInfo(record: {
  allergies?: string | null
  medications?: string | null
  medicalConditions?: string | null
}): boolean {
  return (
    hasRealMedicalText(record.allergies) ||
    hasRealMedicalText(record.medications) ||
    hasRealMedicalText(record.medicalConditions)
  )
}
