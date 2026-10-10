'use client'

import { dict, type LuxLang } from '@/lib/lux/i18n'

export default function FamilySignOut({ slug, lang = 'en' }: { slug: string; lang?: LuxLang }) {
  return (
    <button
      type="button"
      className="text-sm text-gray-500 hover:text-[#1E3A5F] underline"
      onClick={async () => {
        await fetch('/api/lux/public/family/logout', { method: 'POST' }).catch(() => null)
        window.location.href = `/lux/${slug}`
      }}
    >
      {dict(lang).family.signOut}
    </button>
  )
}
