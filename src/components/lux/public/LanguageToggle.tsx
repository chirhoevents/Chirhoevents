'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LUX_LANG_COOKIE, parseLang, type LuxLang } from '@/lib/lux/i18n'

function remember(lang: LuxLang) {
  document.cookie = `${LUX_LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`
}

/** English | Español switch for family pages. ?lang=es in a link picks Spanish too. */
export default function LanguageToggle({ lang }: { lang: LuxLang }) {
  const router = useRouter()

  useEffect(() => {
    const fromUrl = parseLang(new URLSearchParams(window.location.search).get('lang'))
    if (fromUrl && fromUrl !== lang) {
      remember(fromUrl)
      router.refresh()
    }
  }, [lang, router])

  const pick = (next: LuxLang) => {
    if (next === lang) return
    remember(next)
    router.refresh()
  }

  return (
    <div className="inline-flex rounded-full border border-[#E8E2D4] bg-white p-0.5 text-xs" role="group" aria-label="Language / Idioma">
      {(['en', 'es'] as const).map(l => (
        <button key={l} type="button" onClick={() => pick(l)} aria-pressed={lang === l}
          className={`px-2.5 py-1 rounded-full transition-colors ${lang === l ? 'bg-[#1E3A5F] text-white' : 'text-gray-600 hover:text-[#1E3A5F]'}`}>
          {l === 'en' ? 'English' : 'Español'}
        </button>
      ))}
    </div>
  )
}
