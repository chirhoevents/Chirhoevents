import { prisma } from '@/lib/prisma'
import { DEFAULT_LUX_BRAND, LUX_BRAND_SETTING_KEYS, type LuxBrand } from '@/lib/lux/brand-shared'

let cached: { brand: LuxBrand; at: number } | null = null
const TTL_MS = 60_000

/** The current Lux logos: uploaded ones from the master admin board, or the defaults */
export async function getLuxBrand(): Promise<LuxBrand> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.brand
  try {
    const rows = await prisma.platformSetting.findMany({
      where: { settingKey: { in: Object.values(LUX_BRAND_SETTING_KEYS) } },
      select: { settingKey: true, settingValue: true },
    })
    const value = (k: keyof LuxBrand) => rows.find(r => r.settingKey === LUX_BRAND_SETTING_KEYS[k])?.settingValue || DEFAULT_LUX_BRAND[k]
    const brand = { logo: value('logo'), logoWhite: value('logoWhite'), mark: value('mark') }
    cached = { brand, at: Date.now() }
    return brand
  } catch {
    return DEFAULT_LUX_BRAND
  }
}

export function clearLuxBrandCache() {
  cached = null
}

/** Absolute URL for emails */
export function absoluteAssetUrl(url: string): string {
  if (/^https?:\/\//.test(url)) return url
  const base = (process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com').replace(/\/$/, '')
  return `${base}${url}`
}
