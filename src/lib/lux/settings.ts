import { parseFeeRules, type FeeRules } from '@/lib/lux/family-fees'

/**
 * Organization.luxSettings. Parishes edit fee rules and office payment
 * instructions in Lux settings; `limits` is set only by master admins.
 */
export interface LuxOrgSettings {
  feeRules: FeeRules
  officePaymentInstructions: string
}

export function parseLuxSettings(raw: unknown): LuxOrgSettings {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    feeRules: parseFeeRules(s.feeRules),
    officePaymentInstructions: typeof s.officePaymentInstructions === 'string' ? s.officePaymentInstructions : '',
  }
}

/** Merge parish-editable settings into the stored JSON without touching master-admin limits */
export function mergeLuxSettings(raw: unknown, patch: Partial<LuxOrgSettings>): Record<string, unknown> {
  const current = (raw && typeof raw === 'object' ? { ...(raw as Record<string, unknown>) } : {})
  if (patch.feeRules) current.feeRules = parseFeeRules(patch.feeRules)
  if (patch.officePaymentInstructions !== undefined) current.officePaymentInstructions = String(patch.officePaymentInstructions).slice(0, 2000)
  return current
}
