import { cookies, headers } from 'next/headers'
import { LUX_LANG_COOKIE, resolveLang, type LuxLang } from '@/lib/lux/i18n'

/** The family's language for this request: their choice, else their browser's */
export async function getLuxLang(): Promise<LuxLang> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()])
  return resolveLang(cookieStore.get(LUX_LANG_COOKIE)?.value, headerStore.get('accept-language'))
}
