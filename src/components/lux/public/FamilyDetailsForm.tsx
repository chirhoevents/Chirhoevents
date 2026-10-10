'use client'

import { useState } from 'react'
import { Loader2, Pencil } from 'lucide-react'
import { dict, type LuxLang } from '@/lib/lux/i18n'

export interface FamilyDetails {
  guardian1FirstName: string; guardian1LastName: string; email: string; phone: string; street: string; city: string; state: string; zip: string
  guardian2FirstName: string; guardian2LastName: string; guardian2Email: string; guardian2Phone: string
  emergencyContactName: string; emergencyContactPhone: string
}
export interface FamilyChildDetails { id: string; firstName: string; lastName: string; grade: string; allergies: string; medicalNotes: string; school: string }

const input = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A24A]/50'

/** Families confirm or update their contact details and children's health notes */
export default function FamilyDetailsForm({ initial, kids, lang = 'en' }: { initial: FamilyDetails; kids: FamilyChildDetails[]; lang?: LuxLang }) {
  const t = dict(lang)
  const f = t.family
  const [editing, setEditing] = useState(false)
  const [h, setH] = useState(initial)
  const [children, setChildren] = useState(kids)
  const [saved, setSaved] = useState({ h: initial, children: kids })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const field = (key: keyof FamilyDetails, label: string, type = 'text') => (
    <label className="block">
      <span className="block text-xs text-gray-600 mb-1">{label}</span>
      <input className={input} type={type} value={h[key]} onChange={e => setH({ ...h, [key]: e.target.value })} />
    </label>
  )

  const save = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/lux/public/family', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ household: h, children }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || f.couldNotSave)
      setSaved({ h, children })
      setMessage({ ok: true, text: f.saved })
      setEditing(false)
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message })
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    return (
      <div className="text-sm space-y-1">
        <p className="font-medium text-gray-900">{h.guardian1FirstName} {h.guardian1LastName}{h.guardian2FirstName ? ` & ${h.guardian2FirstName} ${h.guardian2LastName}` : ''}</p>
        <p className="text-gray-600">{h.email} · {h.phone}</p>
        {h.street && <p className="text-gray-600">{h.street}, {h.city} {h.state} {h.zip}</p>}
        {h.emergencyContactName && <p className="text-gray-600">{f.emergency(`${h.emergencyContactName} ${h.emergencyContactPhone}`)}</p>}
        {message && <p className={message.ok ? 'text-green-700' : 'text-red-600'}>{message.text}</p>}
        <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-[#9C8466] hover:text-[#1E3A5F] mt-2"><Pencil className="h-4 w-4" /> {f.update}</button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {field('guardian1FirstName', t.common.firstName)}
        {field('guardian1LastName', t.common.lastName)}
        {field('email', t.common.email, 'email')}
        {field('phone', t.common.phone, 'tel')}
        <div className="sm:col-span-2">{field('street', t.common.street)}</div>
        {field('city', t.common.city)}
        <div className="grid grid-cols-2 gap-3">{field('state', t.common.state)}{field('zip', t.common.zip)}</div>
        {field('guardian2FirstName', f.secondFirst)}
        {field('guardian2LastName', f.secondLast)}
        {field('guardian2Email', f.secondEmail, 'email')}
        {field('guardian2Phone', f.secondPhone, 'tel')}
        {field('emergencyContactName', f.emergencyName)}
        {field('emergencyContactPhone', f.emergencyPhone, 'tel')}
      </div>
      {children.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-800">{f.healthNotes}</p>
          {children.map((c, i) => (
            <div key={c.id} className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg bg-[#FAF8F3] p-3">
              <p className="sm:col-span-3 text-sm font-medium">{c.firstName}</p>
              <input className={input} placeholder={t.common.allergies} value={c.allergies} onChange={e => setChildren(cs => cs.map((x, j) => j === i ? { ...x, allergies: e.target.value } : x))} />
              <input className={input} placeholder={t.common.medicalNotes} value={c.medicalNotes} onChange={e => setChildren(cs => cs.map((x, j) => j === i ? { ...x, medicalNotes: e.target.value } : x))} />
              <input className={input} placeholder={t.common.school} value={c.school} onChange={e => setChildren(cs => cs.map((x, j) => j === i ? { ...x, school: e.target.value } : x))} />
            </div>
          ))}
        </div>
      )}
      {message && !message.ok && <p className="text-sm text-red-600">{message.text}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#1E3A5F] px-4 py-2 text-white text-sm">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} {t.common.save}
        </button>
        <button type="button" onClick={() => { setEditing(false); setH(saved.h); setChildren(saved.children) }} className="px-4 py-2 text-sm text-gray-600">{t.common.cancel}</button>
      </div>
    </div>
  )
}
