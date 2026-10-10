'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Trash2, CreditCard, Building2, ShieldCheck, HeartPulse } from 'lucide-react'
import { useLux, useLuxApi } from '@/contexts/LuxContext'
import { toast } from '@/lib/toast'
import QuestionEditor, { type EditableQuestion } from '@/components/lux/QuestionEditor'
import {
  Button, Card, ErrorNote, Field, Select, TextArea, TextInput, Toggle,
} from '@/components/lux/ui'
import {
  DEFAULT_SIMPLE_EVENT_CONFIG, DEFAULT_WAIVER_TEXT, type FieldMode, type SimpleEventConfig,
} from '@/lib/lux/simple-event'

interface EditableTicket {
  id?: string
  key: string
  name: string
  price: string
  capacity: string
  description: string
}

export interface SimpleEventFormValue {
  id?: string
  title: string
  description: string
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  timezone: string
  locationName: string
  locationAddress: string
  capacity: number | null
  closeDate: string
  tickets: Array<{ id?: string; name: string; price: number; capacity: number | null; description: string }>
  questions: Array<{ id?: string; questionText: string; questionType: EditableQuestion['questionType']; options: string[]; required: boolean }>
  config: SimpleEventConfig
  contactName: string
  contactEmail: string
  contactPhone: string
  status?: string
}

const key = () => Math.random().toString(36).slice(2)

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix', 'America/Los_Angeles',
  'America/Anchorage', 'Pacific/Honolulu', 'America/Puerto_Rico',
]

function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York'
  } catch {
    return 'America/New_York'
  }
}

export default function SimpleEventForm({ initial, soldByOption }: {
  initial?: SimpleEventFormValue
  soldByOption?: Record<string, number>
}) {
  const router = useRouter()
  const api = useLuxApi()
  const { info } = useLux()
  const isEdit = !!initial?.id
  const isDraft = !initial || initial.status === 'draft'

  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [startDate, setStartDate] = useState(initial?.startDate ?? '')
  const [multiDay, setMultiDay] = useState(!!initial && initial.endDate !== initial.startDate)
  const [endDate, setEndDate] = useState(initial?.endDate ?? '')
  const [startTime, setStartTime] = useState(initial?.startTime ?? '')
  const [endTime, setEndTime] = useState(initial?.endTime ?? '')
  const [timezone, setTimezone] = useState(initial?.timezone ?? browserTimezone())
  const [locationName, setLocationName] = useState(initial?.locationName ?? '')
  const [locationAddress, setLocationAddress] = useState(initial?.locationAddress ?? '')
  const [capacity, setCapacity] = useState(initial?.capacity ? String(initial.capacity) : '')
  const [closeDate, setCloseDate] = useState(initial?.closeDate ?? '')
  const [tickets, setTickets] = useState<EditableTicket[]>(
    initial?.tickets.length
      ? initial.tickets.map(t => ({
          id: t.id, key: key(), name: t.name, price: t.price ? String(t.price) : '0',
          capacity: t.capacity === null ? '' : String(t.capacity), description: t.description,
        }))
      : [{ key: key(), name: 'General admission', price: '0', capacity: '', description: '' }]
  )
  const [questions, setQuestions] = useState<EditableQuestion[]>(
    (initial?.questions ?? []).map(q => ({ ...q, key: key() }))
  )
  const [config, setConfig] = useState<SimpleEventConfig>(initial?.config ?? DEFAULT_SIMPLE_EVENT_CONFIG)
  const [contactName, setContactName] = useState(initial?.contactName ?? '')
  const [contactEmail, setContactEmail] = useState(initial?.contactEmail ?? '')
  const [contactPhone, setContactPhone] = useState(initial?.contactPhone ?? '')
  const [saving, setSaving] = useState<null | 'draft' | 'publish'>(null)
  const [error, setError] = useState<string | null>(null)

  const hasPaidTickets = useMemo(() => tickets.some(t => Number(t.price) > 0), [tickets])
  const patchConfig = (patch: Partial<SimpleEventConfig>) => setConfig(c => ({ ...c, ...patch }))
  const updateTicket = (index: number, patch: Partial<EditableTicket>) =>
    setTickets(ts => ts.map((t, i) => (i === index ? { ...t, ...patch } : t)))

  const addAdultChild = () => {
    const first = tickets[0]
    const onlyDefault = tickets.length === 1 && first && !first.id && first.name === 'General admission'
    const preset: EditableTicket[] = [
      { key: key(), name: 'Adult', price: first?.price || '0', capacity: '', description: '' },
      { key: key(), name: 'Child (under 12)', price: '0', capacity: '', description: '' },
    ]
    setTickets(onlyDefault ? preset : [...tickets, ...preset])
  }

  const payload = () => ({
    title,
    description,
    startDate,
    endDate: multiDay && endDate ? endDate : startDate,
    startTime: startTime || null,
    endTime: endTime || null,
    timezone,
    locationName,
    locationAddress,
    capacity: capacity ? Number(capacity) : null,
    closeDate: closeDate || null,
    tickets: tickets.map(t => ({
      id: t.id,
      name: t.name,
      price: Number(t.price || 0),
      capacity: t.capacity === '' ? null : Number(t.capacity),
      description: t.description,
    })),
    questions: questions.map(q => ({ ...q, options: q.options.map(o => o.trim()).filter(Boolean) })),
    config,
    contactName,
    contactEmail,
    contactPhone,
  })

  const save = async (publish: boolean) => {
    setError(null)
    setSaving(publish ? 'publish' : 'draft')
    try {
      let id = initial?.id
      if (isEdit) {
        await api(`/api/lux/events/${id}`, { method: 'PUT', json: payload() })
      } else {
        const created = await api<{ event: { id: string } }>('/api/lux/events', { method: 'POST', json: payload() })
        id = created.event.id
      }
      if (publish && isDraft) {
        try {
          await api(`/api/lux/events/${id}/status`, { method: 'POST', json: { action: 'publish' } })
          toast.success('Published! Registration is open.')
        } catch (publishError) {
          toast.error((publishError as Error).message, { duration: 6000 })
          router.push(`/dashboard/lux/events/${id}`)
          return
        }
      } else {
        toast.success(isEdit ? 'Changes saved' : 'Draft saved')
      }
      router.push(`/dashboard/lux/events/${id}`)
    } catch (e) {
      setError((e as Error).message)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSaving(null)
    }
  }

  const fieldModeSelect = (value: FieldMode, onChange: (v: FieldMode) => void) => (
    <Select value={value} onChange={e => onChange(e.target.value as FieldMode)} className="w-40">
      <option value="required">Required</option>
      <option value="optional">Optional</option>
      <option value="hidden">Don&apos;t ask</option>
    </Select>
  )

  return (
    <div className="space-y-5 max-w-3xl">
      <ErrorNote message={error} />

      <Card title="The basics" description="What families will see on the sign-up page.">
        <div className="space-y-4">
          <Field label="Title" required>
            <TextInput value={title} onChange={e => setTitle(e.target.value)} placeholder="Lenten Fish Fry" maxLength={255} />
          </Field>
          <Field label="Short description" hint="A sentence or two. Line breaks are kept.">
            <TextArea value={description} onChange={e => setDescription(e.target.value)} rows={4}
              placeholder="Join us in the parish hall for fried fish, mac and cheese, and fellowship." />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={multiDay ? 'Start date' : 'Date'} required>
              <TextInput type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </Field>
            {multiDay ? (
              <Field label="End date" required>
                <TextInput type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} />
              </Field>
            ) : (
              <div className="flex items-end pb-2">
                <button type="button" className="text-sm text-[#9C8466] hover:text-[#1E3A5F]" onClick={() => { setMultiDay(true); setEndDate(startDate) }}>
                  + More than one day (e.g. a retreat)
                </button>
              </div>
            )}
            <Field label="Starts at" hint="Optional">
              <TextInput type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </Field>
            <Field label="Ends at" hint="Optional">
              <TextInput type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Location">
              <TextInput value={locationName} onChange={e => setLocationName(e.target.value)} placeholder="Parish Hall" />
            </Field>
            <Field label="Address" hint="Optional">
              <TextInput value={locationAddress} onChange={e => setLocationAddress(e.target.value)} placeholder="123 Main St, Springfield, IL" />
            </Field>
          </div>
          <Field label="Time zone">
            <Select value={timezone} onChange={e => setTimezone(e.target.value)} className="sm:w-72">
              {[...new Set([timezone, ...TIMEZONES])].map(tz => <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>)}
            </Select>
          </Field>
        </div>
      </Card>

      <Card title="Tickets" description="Use one ticket type, or a few (adult, child...). A $0 ticket makes it a free sign-up.">
        <div className="space-y-3">
          {tickets.map((t, index) => {
            const sold = t.id ? soldByOption?.[t.id] ?? 0 : 0
            return (
              <div key={t.key} className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-12 sm:col-span-5">
                  <TextInput value={t.name} onChange={e => updateTicket(index, { name: e.target.value })} placeholder="Ticket name" maxLength={100} aria-label="Ticket name" />
                </div>
                <div className="col-span-5 sm:col-span-3 relative">
                  <span className="absolute left-3 top-2 text-sm text-gray-400">$</span>
                  <TextInput type="number" min="0" step="0.01" value={t.price} onChange={e => updateTicket(index, { price: e.target.value })}
                    className="pl-6" aria-label="Price" />
                </div>
                <div className="col-span-5 sm:col-span-3">
                  <TextInput type="number" min={sold || 0} value={t.capacity} onChange={e => updateTicket(index, { capacity: e.target.value })}
                    placeholder="No limit" aria-label="Limit for this ticket" />
                  {sold > 0 && <p className="text-xs text-gray-500 mt-1">{sold} sold</p>}
                </div>
                <div className="col-span-2 sm:col-span-1 flex justify-end">
                  <button type="button" onClick={() => setTickets(ts => ts.filter((_, i) => i !== index))} disabled={tickets.length === 1}
                    className="p-2 rounded text-red-600 hover:bg-red-50 disabled:opacity-30" aria-label="Remove ticket">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="secondary" onClick={() => setTickets(ts => [...ts, { key: key(), name: '', price: '0', capacity: '', description: '' }])}>
              <Plus className="h-4 w-4" /> Add a ticket type
            </Button>
            <Button variant="ghost" onClick={addAdultChild}>Add Adult + Child</Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-[#E8E2D4]">
            <Field label="Total capacity" hint="People across all tickets. Blank = no limit.">
              <TextInput type="number" min="1" value={capacity} onChange={e => setCapacity(e.target.value)} placeholder="No limit" />
            </Field>
            <Field label="Most per registration" hint="Tickets one person can buy">
              <TextInput type="number" min="1" max="100" value={config.maxPerRegistration}
                onChange={e => patchConfig({ maxPerRegistration: Math.max(1, Number(e.target.value) || 1) })} />
            </Field>
            <Field label="Registration closes" hint="Blank = when the event starts">
              <TextInput type="datetime-local" value={closeDate} onChange={e => setCloseDate(e.target.value)} />
            </Field>
          </div>
        </div>
      </Card>

      <Card title="What to ask" description="Name and email are always collected so we can send a confirmation.">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-800">Phone number</span>
            {fieldModeSelect(config.phoneField, v => patchConfig({ phoneField: v }))}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-800">Mailing address</span>
            {fieldModeSelect(config.addressField, v => patchConfig({ addressField: v }))}
          </div>
          <div className="pt-3 border-t border-[#E8E2D4]">
            <p className="text-sm font-medium text-gray-800 mb-2">Your own questions</p>
            <QuestionEditor questions={questions} onChange={setQuestions} />
          </div>
        </div>
      </Card>

      <Card title="Payment" description={hasPaidTickets ? 'How people can pay for paid tickets.' : 'All tickets are free, so nobody will be asked to pay.'}>
        <div className="divide-y divide-[#F0EBDF]">
          <div className="flex items-start gap-3">
            <CreditCard className="h-5 w-5 text-[#9C8466] mt-2.5" />
            <div className="flex-1">
              <Toggle
                checked={config.onlinePayment}
                onChange={v => patchConfig({ onlinePayment: v })}
                label="Pay online by card"
                description={info.paymentsReady
                  ? 'Paid straight to your parish’s Stripe account.'
                  : <>Needs Stripe connected first. <Link href="/dashboard/lux/settings?tab=integrations" className="underline">Connect Stripe</Link></>}
              />
            </div>
          </div>
          <div className="flex items-start gap-3 pt-2">
            <Building2 className="h-5 w-5 text-[#9C8466] mt-2.5" />
            <div className="flex-1">
              <Toggle
                checked={config.officePayment.enabled}
                onChange={v => patchConfig({ officePayment: { ...config.officePayment, enabled: v } })}
                label="Pay at the parish office"
                description="They register now and bring cash or a check. You mark it paid."
              />
              {config.officePayment.enabled && (
                <Field label="Instructions" hint="Shown on the confirmation, e.g. office hours or who to make checks out to." className="mt-2 mb-2">
                  <TextArea value={config.officePayment.instructions} rows={2}
                    onChange={e => patchConfig({ officePayment: { ...config.officePayment, instructions: e.target.value } })}
                    placeholder="Make checks payable to St. Mary's Parish. Office hours: Mon–Fri 9–4." />
                </Field>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card title="Optional extras">
        <div className="divide-y divide-[#F0EBDF]">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-[#9C8466] mt-2.5" />
            <div className="flex-1">
              <Toggle
                checked={config.waiver.enabled}
                onChange={v => patchConfig({ waiver: { ...config.waiver, enabled: v } })}
                label="Require a waiver"
                description="They check a box and type their name to sign."
              />
              {config.waiver.enabled && (
                <div className="mb-2">
                  <TextArea value={config.waiver.text} rows={5}
                    onChange={e => patchConfig({ waiver: { ...config.waiver, text: e.target.value } })} />
                  <button type="button" className="text-xs text-[#9C8466] mt-1"
                    onClick={() => patchConfig({ waiver: { ...config.waiver, text: DEFAULT_WAIVER_TEXT } })}>
                    Use the standard wording
                  </button>
                </div>
              )}
            </div>
          </div>
          {info.modulesEnabled.rapha && (
            <div className="flex items-start gap-3 pt-2">
              <HeartPulse className="h-5 w-5 text-[#9C8466] mt-2.5" />
              <div className="flex-1">
                <Toggle
                  checked={config.medical.enabled}
                  onChange={v => patchConfig({ medical: { enabled: v } })}
                  label="Ask about allergies and medical needs"
                  description="Allergies, conditions, medications and an emergency contact."
                />
              </div>
            </div>
          )}
          <div className="pt-3 space-y-4">
            <Field label="Message on the confirmation" hint="Optional: what to bring, where to park, etc.">
              <TextArea value={config.confirmationMessage} rows={3}
                onChange={e => patchConfig({ confirmationMessage: e.target.value })} />
            </Field>
            <Field label="This event is in" className="sm:w-72">
              <Select value={config.language ?? ''} onChange={e => patchConfig({ language: e.target.value || null })}>
                <option value="">Not specified</option>
                <option value="en">English</option>
                <option value="es">Spanish (Español)</option>
                <option value="bilingual">English and Spanish</option>
              </Select>
            </Field>
          </div>
        </div>
      </Card>

      <Card title="Who to contact with questions" description="Replies to confirmation emails go here. Leave blank to use your parish’s main contact.">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Name"><TextInput value={contactName} onChange={e => setContactName(e.target.value)} /></Field>
          <Field label="Email"><TextInput type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} /></Field>
          <Field label="Phone"><TextInput value={contactPhone} onChange={e => setContactPhone(e.target.value)} maxLength={20} /></Field>
        </div>
      </Card>

      <div className="flex flex-wrap justify-end gap-2 pb-8">
        <Button variant="ghost" href={isEdit ? `/dashboard/lux/events/${initial!.id}` : '/dashboard/lux/programs'}>Cancel</Button>
        {isDraft && (
          <Button variant="secondary" onClick={() => save(false)} loading={saving === 'draft'} disabled={!!saving}>
            Save draft
          </Button>
        )}
        <Button variant={isDraft ? 'gold' : 'primary'} onClick={() => save(isDraft)} loading={isDraft ? saving === 'publish' : !!saving} disabled={!!saving}>
          {isDraft ? 'Save & publish' : 'Save changes'}
        </Button>
      </div>
    </div>
  )
}
