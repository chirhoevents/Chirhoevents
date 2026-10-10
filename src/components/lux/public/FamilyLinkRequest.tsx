'use client'

import { useState } from 'react'
import { Loader2, Mail } from 'lucide-react'
import { dict, type LuxLang } from '@/lib/lux/i18n'

/** "Registered before?" — ask for a sign-in link by email */
export default function FamilyLinkRequest({ slug, compact = false, lang = 'en' }: { slug: string; compact?: boolean; lang?: LuxLang }) {
  const t = dict(lang).link
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setState('sending')
    setError(null)
    try {
      const res = await fetch('/api/lux/public/family/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, email, language: lang }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || t.failed)
      setState('sent')
    } catch (err) {
      setError((err as Error).message)
      setState('idle')
    }
  }

  if (state === 'sent') {
    return (
      <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-800 flex gap-2">
        <Mail className="h-5 w-5 shrink-0" /> {t.sent}
      </div>
    )
  }
  return (
    <form onSubmit={submit} className={compact ? 'flex flex-col sm:flex-row gap-2' : 'space-y-3'}>
      <input
        type="email"
        required
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder={t.placeholder}
        className="flex-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#C8A24A]/50"
        aria-label={dict(lang).common.email}
      />
      <button type="submit" disabled={state === 'sending'}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1E3A5F] px-5 py-2.5 text-white font-medium disabled:bg-gray-300">
        {state === 'sending' && <Loader2 className="h-4 w-4 animate-spin" />} {t.button}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  )
}
