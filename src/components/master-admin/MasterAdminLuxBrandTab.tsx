'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Upload, RotateCcw, Loader2 } from 'lucide-react'
import type { LuxBrand } from '@/lib/lux/brand-shared'

const SLOTS: Array<{ key: keyof LuxBrand; title: string; hint: string; background: string }> = [
  { key: 'logo', title: 'Lux logo', hint: 'For white and cream backgrounds: the Lux dashboard, parish pages, emails and the homepage.', background: '#FAF8F3' },
  { key: 'logoWhite', title: 'Lux logo for dark backgrounds', hint: 'A white version, used on navy.', background: '#1E3A5F' },
  { key: 'mark', title: 'Lux mark', hint: 'The symbol alone (square), for small spaces like page footers.', background: '#FFFFFF' },
]

/** Master admin: replace the Lux logos without a code change */
export default function MasterAdminLuxBrandTab() {
  const { getToken } = useAuth()
  const [brand, setBrand] = useState<LuxBrand | null>(null)
  const [defaults, setDefaults] = useState<LuxBrand | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputs = useRef<Record<string, HTMLInputElement | null>>({})

  const call = async (url: string, init: RequestInit = {}) => {
    const token = await getToken()
    const res = await fetch(url, { ...init, headers: { ...(init.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Something went wrong')
    return data
  }

  useEffect(() => {
    call('/api/master-admin/settings/lux-brand').then(d => { setBrand(d.brand); setDefaults(d.defaults) }).catch(e => setError(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const upload = async (slot: keyof LuxBrand, file: File) => {
    setBusy(slot)
    setError(null)
    try {
      const form = new FormData()
      form.set('slot', slot)
      form.set('file', file)
      setBrand((await call('/api/master-admin/settings/lux-brand', { method: 'POST', body: form })).brand)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const reset = async (slot: keyof LuxBrand) => {
    setBusy(slot)
    setError(null)
    try {
      setBrand((await call(`/api/master-admin/settings/lux-brand?slot=${slot}`, { method: 'DELETE' })).brand)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  if (!brand) return <div className="text-gray-500">{error || 'Loading…'}</div>

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900">Lux branding</h2>
        <p className="text-sm text-gray-600 mt-1">Upload a PNG (transparent background works best). Changes show up within a minute everywhere Lux appears.</p>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
      {SLOTS.map(slot => (
        <div key={slot.key} className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col md:flex-row md:items-center gap-5">
          <div className="md:w-64 h-28 rounded-lg flex items-center justify-center border border-gray-100" style={{ background: slot.background }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={brand[slot.key]} alt={slot.title} className="max-h-20 max-w-[85%] object-contain" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900">{slot.title}</p>
            <p className="text-sm text-gray-600">{slot.hint}</p>
            {defaults && brand[slot.key] === defaults[slot.key] && <p className="text-xs text-gray-400 mt-1">Using the built-in logo</p>}
          </div>
          <div className="flex gap-2">
            <input ref={el => { inputs.current[slot.key] = el }} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) upload(slot.key, f); e.target.value = '' }} />
            <button type="button" onClick={() => inputs.current[slot.key]?.click()} disabled={!!busy}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E3A5F] text-white text-sm disabled:opacity-50">
              {busy === slot.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload
            </button>
            {defaults && brand[slot.key] !== defaults[slot.key] && (
              <button type="button" onClick={() => reset(slot.key)} disabled={!!busy}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 disabled:opacity-50">
                <RotateCcw className="h-4 w-4" /> Use built-in
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
