/** The Lux logo files (client-safe). Master admins can replace them; see brand.ts. */

export interface LuxBrand {
  // For white and cream backgrounds
  logo: string
  // For navy backgrounds
  logoWhite: string
  // The arch mark alone, for small spaces
  mark: string
}

export const DEFAULT_LUX_BRAND: LuxBrand = {
  logo: '/lux/lux-logo.png',
  logoWhite: '/lux/lux-logo-white.png',
  mark: '/lux/lux-mark.png',
}

export const LUX_BRAND_SETTING_KEYS: Record<keyof LuxBrand, string> = {
  logo: 'lux_logo_url',
  logoWhite: 'lux_logo_white_url',
  mark: 'lux_mark_url',
}
