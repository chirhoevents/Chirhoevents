import { parseFeeRules, type FeeRules } from '@/lib/lux/family-fees'

/** How a parish's public Lux page looks */
export interface ParishPageSettings {
  headerImageUrl: string | null
  // Blank = "Welcome to {parish}"
  headline: string
  headlineEs: string
  // Blank = the standard intro
  message: string
  messageEs: string
  // A highlighted notice at the top (deadline, office hours change...)
  announcement: string
  announcementEs: string
  // Hex color for buttons and accents; null = Lux gold
  accentColor: string | null
}

/**
 * Organization.luxSettings. Parishes edit fee rules, office payment
 * instructions and their page in Lux settings; `limits` is set only by
 * master admins.
 */
export interface LuxOrgSettings {
  feeRules: FeeRules
  officePaymentInstructions: string
  page: ParishPageSettings
}

const HEX_RE = /^#[0-9a-f]{6}$/i
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '')

export function parsePageSettings(raw: unknown): ParishPageSettings {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    headerImageUrl: typeof p.headerImageUrl === 'string' && /^https?:\/\//.test(p.headerImageUrl) ? p.headerImageUrl : null,
    headline: text(p.headline, 120),
    headlineEs: text(p.headlineEs, 120),
    message: text(p.message, 2000),
    messageEs: text(p.messageEs, 2000),
    announcement: text(p.announcement, 500),
    announcementEs: text(p.announcementEs, 500),
    accentColor: typeof p.accentColor === 'string' && HEX_RE.test(p.accentColor) ? p.accentColor : null,
  }
}

export function parseLuxSettings(raw: unknown): LuxOrgSettings {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    feeRules: parseFeeRules(s.feeRules),
    officePaymentInstructions: typeof s.officePaymentInstructions === 'string' ? s.officePaymentInstructions : '',
    page: parsePageSettings(s.page),
  }
}

/** Merge parish-editable settings into the stored JSON without touching master-admin limits */
export function mergeLuxSettings(raw: unknown, patch: Partial<LuxOrgSettings>): Record<string, unknown> {
  const current = (raw && typeof raw === 'object' ? { ...(raw as Record<string, unknown>) } : {})
  if (patch.feeRules) current.feeRules = parseFeeRules(patch.feeRules)
  if (patch.officePaymentInstructions !== undefined) current.officePaymentInstructions = String(patch.officePaymentInstructions).slice(0, 2000)
  if (patch.page) current.page = parsePageSettings({ ...(current.page as object | undefined), ...patch.page })
  return current
}

/** A darker shade of the accent color for hover states */
export function accentHover(hex: string | null): string | null {
  if (!hex || !HEX_RE.test(hex)) return null
  const n = parseInt(hex.slice(1), 16)
  const shade = (c: number) => Math.max(0, Math.round(c * 0.88)).toString(16).padStart(2, '0')
  return `#${shade(n >> 16)}${shade((n >> 8) & 255)}${shade(n & 255)}`
}
