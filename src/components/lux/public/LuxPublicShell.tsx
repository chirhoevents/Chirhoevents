import Link from 'next/link'
import type { ReactNode } from 'react'
import { getLuxLang } from '@/lib/lux/i18n-server'
import { dict } from '@/lib/lux/i18n'
import { getLuxBrand } from '@/lib/lux/brand'
import LanguageToggle from '@/components/lux/public/LanguageToggle'

/** Frame for public Lux pages: the parish's name and logo, a language switch, then the content */
export default async function LuxPublicShell({ organizationName, logoUrl, parishSlug, accentColor, children }: {
  organizationName: string
  logoUrl?: string | null
  parishSlug?: string | null
  accentColor?: string | null
  children: ReactNode
}) {
  const [lang, brand] = await Promise.all([getLuxLang(), getLuxBrand()])
  const t = dict(lang)
  const brandBlock = (
    <span className="flex items-center gap-3 min-w-0">
      {/* eslint-disable-next-line @next/next/no-img-element -- parish logos are uploaded URLs */}
      {logoUrl && <img src={logoUrl} alt="" className="h-10 w-10 rounded-lg object-contain bg-white border border-gray-100 shrink-0" />}
      <span className="font-semibold text-[#1E3A5F] text-lg truncate" style={{ fontFamily: 'Georgia, serif' }}>{organizationName}</span>
    </span>
  )
  return (
    <div className="min-h-screen bg-[#FAF8F3] flex flex-col" lang={lang}>
      <header className="bg-white border-b border-[#E8E2D4]" style={accentColor ? { borderTop: `4px solid ${accentColor}` } : undefined}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {parishSlug ? <Link href={`/lux/${parishSlug}`} className="min-w-0">{brandBlock}</Link> : brandBlock}
          <div className="flex items-center gap-4 shrink-0">
            {parishSlug && (
              <Link href={`/lux/${parishSlug}`} className="hidden sm:inline text-sm text-[#9C8466] hover:text-[#1E3A5F]">{t.shell.allEvents}</Link>
            )}
            <LanguageToggle lang={lang} />
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10">{children}</main>
      <footer className="py-6 flex items-center justify-center gap-2 text-xs text-gray-500">
        <span>{t.shell.poweredBy}</span>
        <Link href="/" aria-label="Lux by ChiRho Events" className="inline-flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={brand.logo} alt="Lux" className="h-5 w-auto" />
        </Link>
      </footer>
    </div>
  )
}
