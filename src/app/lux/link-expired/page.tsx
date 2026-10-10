import Link from 'next/link'
import { getLuxLang } from '@/lib/lux/i18n-server'
import { dict } from '@/lib/lux/i18n'
import { getLuxBrand } from '@/lib/lux/brand'

export const metadata = { title: 'Link expired' }

/** Where a used, expired or broken family link lands */
export default async function LinkExpiredPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams
  const [lang, brand] = await Promise.all([getLuxLang(), getLuxBrand()])
  const t = dict(lang).linkExpired
  const reasons: Record<string, string> = { used: t.used, expired: t.expired, invalid: t.invalid }
  return (
    <div className="min-h-screen bg-[#FAF8F3] flex items-center justify-center px-4" lang={lang}>
      <div className="max-w-md w-full bg-white rounded-2xl border border-[#E8E2D4] p-8 text-center shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={brand.logo} alt="Lux" className="h-12 w-auto mx-auto" />
        <h1 className="text-xl font-semibold text-[#1E3A5F] mt-5">{t.title}</h1>
        <p className="text-gray-600 mt-2">{reasons[reason ?? ''] ?? reasons.invalid}</p>
        <p className="text-gray-600 mt-2">{t.instructions}</p>
        <Link href="/" className="inline-block mt-6 text-sm text-[#9C8466] underline">{t.home}</Link>
      </div>
    </div>
  )
}
