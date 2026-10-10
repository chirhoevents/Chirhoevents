'use client'

import { useState } from 'react'
import { Loader2, Mail } from 'lucide-react'

/** "Registered before?" — ask for a sign-in link by email */
export default function FamilyLinkRequest({ slug, compact = false }: { slug: string; compact?: boolean }) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setState('sending')
    setMessage(null)
    try {
      const res = await fetch('/api/lux/public/family/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, email }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.')
      setMessage(data.message)
      setState('sent')
    } catch (err) {
      setMessage((err as Error).message)
      setState('idle')
    }
  }

  if (state === 'sent') {
    return (
      <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-800 flex gap-2">
        <Mail className="h-5 w-5 shrink-0" /> {message}
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
        placeholder="The email you registered with"
        className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#C8A24A]/50"
        aria-label="Email"
      />
      <button type="submit" disabled={state === 'sending'}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1E3A5F] px-5 py-2.5 text-white font-medium disabled:bg-gray-300">
        {state === 'sending' && <Loader2 className="h-4 w-4 animate-spin" />} Email me a link
      </button>
      {message && <p className="text-sm text-red-600">{message}</p>}
    </form>
  )
}
