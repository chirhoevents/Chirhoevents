'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Trash2, Megaphone } from 'lucide-react'
import { useLuxApi } from '@/contexts/LuxContext'
import { toast } from '@/lib/toast'
import { Button, Card, Field, TextArea, TextInput, cx } from '@/components/lux/ui'
import { dict } from '@/lib/lux/i18n'

export interface ParishPageDraft {
  headerImageUrl: string | null
  headline: string
  headlineEs: string
  message: string
  messageEs: string
  announcement: string
  announcementEs: string
  accentColor: string | null
}

const SWATCHES: Array<{ label: string; value: string | null }> = [
  { label: 'Lux gold', value: null },
  { label: 'Navy', value: '#1E3A5F' },
  { label: 'Marian blue', value: '#2F6DB5' },
  { label: 'Burgundy', value: '#8B1E3F' },
  { label: 'Forest', value: '#2F6B4F' },
  { label: 'Purple', value: '#5B3F8C' },
]

const HEX_RE = /^#[0-9a-f]{6}$/i

/**
 * How the parish's public page looks: a header photo, the welcome text (with
 * optional Spanish), an announcement and the button color. The photo saves as
 * soon as it's chosen; the text saves with the rest of the settings.
 */
export default function ParishPageEditor({ value, onChange, parishName, disabled }: {
  value: ParishPageDraft
  onChange: (next: ParishPageDraft) => void
  parishName: string
  disabled?: boolean
}) {
  const api = useLuxApi()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [showSpanish, setShowSpanish] = useState(!!(value.headlineEs || value.messageEs || value.announcementEs))
  const [customColor, setCustomColor] = useState(value.accentColor && !SWATCHES.some(s => s.value === value.accentColor) ? value.accentColor : '')
  const set = (patch: Partial<ParishPageDraft>) => onChange({ ...value, ...patch })
  const accent = value.accentColor ?? '#C8A24A'

  const upload = async (file: File) => {
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await api<{ headerImageUrl: string }>('/api/lux/settings/header-image', { method: 'POST', body: form })
      set({ headerImageUrl: res.headerImageUrl })
      toast.success('Header photo saved')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const removePhoto = async () => {
    setUploading(true)
    try {
      await api('/api/lux/settings/header-image', { method: 'DELETE' })
      set({ headerImageUrl: null })
      toast.success('Header photo removed')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const headline = value.headline || `Welcome to ${parishName}`
  const message = value.message || dict('en').parish.intro

  return (
    <Card title="How your page looks" description="Make the page feel like your parish: a photo of your church, a welcome and your colors.">
      <div className="space-y-5">
        {/* Preview */}
        <div className="rounded-xl border border-[#E8E2D4] overflow-hidden bg-[#FAF8F3]">
          {value.headerImageUrl ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- uploaded by the parish */}
              <img src={value.headerImageUrl} alt="" className="w-full h-40 sm:h-52 object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 text-white">
                <p className="text-xl sm:text-2xl font-semibold drop-shadow" style={{ fontFamily: 'Georgia, serif' }}>{headline}</p>
                <p className="mt-1 text-sm text-white/90 line-clamp-2 drop-shadow whitespace-pre-line">{message}</p>
              </div>
            </div>
          ) : (
            <div className="text-center px-4 py-8">
              <p className="text-xl sm:text-2xl font-semibold text-[#1E3A5F]" style={{ fontFamily: 'Georgia, serif' }}>{headline}</p>
              <p className="mt-1 text-sm text-gray-600 line-clamp-2 whitespace-pre-line">{message}</p>
            </div>
          )}
          <div className="p-4 space-y-3">
            {value.announcement && (
              <div className="rounded-lg border bg-white p-3 flex gap-2 text-sm text-gray-800" style={{ borderColor: accent }}>
                <Megaphone className="h-4 w-4 shrink-0 mt-0.5" style={{ color: accent }} />
                <span className="line-clamp-2 whitespace-pre-line">{value.announcement}</span>
              </div>
            )}
            <span className="inline-block rounded-lg px-4 py-2 text-sm font-medium text-white" style={{ backgroundColor: accent }}>Register</span>
          </div>
        </div>

        <Field label="Header photo" hint="A wide photo works best, like your church or a parish celebration. PNG, JPG or WebP up to 5 MB.">
          <div className="flex flex-wrap gap-2">
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) upload(f) }} />
            <Button variant="secondary" onClick={() => fileRef.current?.click()} loading={uploading} disabled={disabled}>
              <ImagePlus className="h-4 w-4" /> {value.headerImageUrl ? 'Change photo' : 'Upload a photo'}
            </Button>
            {value.headerImageUrl && (
              <Button variant="ghost" onClick={removePhoto} disabled={disabled || uploading}><Trash2 className="h-4 w-4" /> Remove</Button>
            )}
          </div>
        </Field>

        <Field label="Headline" hint={`Leave blank for “Welcome to ${parishName}”.`}>
          <TextInput value={value.headline} maxLength={120} onChange={e => set({ headline: e.target.value })} disabled={disabled}
            placeholder={`Welcome to ${parishName}`} />
        </Field>
        <Field label="Welcome message" hint="Leave blank for the standard message.">
          <TextArea rows={3} value={value.message} maxLength={2000} onChange={e => set({ message: e.target.value })} disabled={disabled}
            placeholder={dict('en').parish.intro} />
        </Field>
        <Field label="Announcement" hint="Optional. Shown in a box near the top, like a deadline or a change in office hours.">
          <TextArea rows={2} value={value.announcement} maxLength={500} onChange={e => set({ announcement: e.target.value })} disabled={disabled}
            placeholder="Faith formation registration closes August 31." />
        </Field>

        <div>
          <button type="button" className="text-sm font-medium text-[#1E3A5F] underline underline-offset-2" onClick={() => setShowSpanish(!showSpanish)}>
            {showSpanish ? 'Hide Spanish text' : 'Add Spanish text (optional)'}
          </button>
          <p className="text-xs text-gray-500 mt-1">Families can switch the page to Spanish. Everything else on the page is translated for you; add your own words here, or they’ll see the English you wrote above.</p>
        </div>
        {showSpanish && (
          <div className="space-y-4 rounded-xl border border-[#E8E2D4] p-4">
            <Field label="Headline in Spanish">
              <TextInput value={value.headlineEs} maxLength={120} onChange={e => set({ headlineEs: e.target.value })} disabled={disabled}
                placeholder={dict('es').parish.welcome(parishName)} />
            </Field>
            <Field label="Welcome message in Spanish">
              <TextArea rows={3} value={value.messageEs} maxLength={2000} onChange={e => set({ messageEs: e.target.value })} disabled={disabled}
                placeholder={dict('es').parish.intro} />
            </Field>
            <Field label="Announcement in Spanish">
              <TextArea rows={2} value={value.announcementEs} maxLength={500} onChange={e => set({ announcementEs: e.target.value })} disabled={disabled} />
            </Field>
          </div>
        )}

        <Field label="Button color">
          <div className="flex flex-wrap items-center gap-2">
            {SWATCHES.map(s => (
              <button key={s.label} type="button" title={s.label} disabled={disabled}
                onClick={() => { set({ accentColor: s.value }); setCustomColor('') }}
                className={cx('h-9 w-9 rounded-full border-2 transition', value.accentColor === s.value ? 'border-[#1E3A5F] scale-110' : 'border-white shadow')}
                style={{ backgroundColor: s.value ?? '#C8A24A' }}>
                <span className="sr-only">{s.label}</span>
              </button>
            ))}
            <label className="flex items-center gap-2 text-sm text-gray-600 ml-1">
              <input type="color" disabled={disabled} value={customColor || accent}
                onChange={e => { setCustomColor(e.target.value); set({ accentColor: e.target.value }) }}
                className="h-9 w-12 cursor-pointer rounded border border-gray-300 bg-white" />
              Your own
            </label>
            {customColor && !HEX_RE.test(customColor) && <span className="text-xs text-red-600">Pick a color</span>}
          </div>
        </Field>
      </div>
    </Card>
  )
}
