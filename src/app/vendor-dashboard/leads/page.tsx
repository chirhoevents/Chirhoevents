'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Scanner } from '@yudiel/react-qr-scanner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Download,
  Loader2,
  Mail,
  QrCode,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react'

interface Lead {
  id: string
  attendeeType: string
  firstName: string
  lastName: string
  isMinor: boolean
  email: string | null
  contactName: string | null
  phone: string | null
  groupName: string | null
  parishName: string | null
  notes: string | null
  tags: string[]
  scannedByName: string | null
  scannedAt: string
  unsubscribed: boolean
}

interface SentMessage {
  id: string
  subject: string
  emailsSent: number
  emailsFailed: number
  leadCount: number
  createdAt: string
}

interface LeadsResponse {
  role: 'owner' | 'staff'
  enabled: boolean
  blockedReason: string | null
  sharing: { phone: boolean; group: boolean }
  vendor: { businessName: string }
  event: { id: string; name: string }
  suggestedTags: string[]
  messaging: { open: boolean; closesAt: string }
  leads: Lead[]
  messages: SentMessage[]
}

const SCANNER_NAME_KEY = 'chirho-vendor-scanner-name'

function readStoredName(): string {
  try {
    return localStorage.getItem(SCANNER_NAME_KEY) || ''
  } catch {
    return ''
  }
}

function storeName(name: string) {
  try {
    localStorage.setItem(SCANNER_NAME_KEY, name)
  } catch {
    // private mode etc. — not important
  }
}

function LeadEditor({
  lead,
  suggestedTags,
  onSave,
  saving,
}: {
  lead: Lead
  suggestedTags: string[]
  onSave: (notes: string, tags: string[]) => void
  saving: boolean
}) {
  const [notes, setNotes] = useState(lead.notes || '')
  const [tags, setTags] = useState<string[]>(lead.tags)
  const [customTag, setCustomTag] = useState('')

  useEffect(() => {
    setNotes(lead.notes || '')
    setTags(lead.tags)
  }, [lead.id, lead.notes, lead.tags])

  const allTags = Array.from(new Set([...suggestedTags, ...tags]))
  const toggle = (t: string) =>
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))

  const addCustom = () => {
    const t = customTag.trim()
    if (t && !tags.includes(t)) setTags([...tags, t])
    setCustomTag('')
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {allTags.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => toggle(t)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              tags.includes(t)
                ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                : 'bg-white text-[#1E3A5F] border-[#D1D5DB] hover:border-[#1E3A5F]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={customTag}
          onChange={(e) => setCustomTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addCustom()
            }
          }}
          placeholder="Add your own tag"
          maxLength={40}
        />
        <Button type="button" variant="outline" onClick={addCustom}>
          Add
        </Button>
      </div>
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (what were they interested in?)"
        rows={3}
        maxLength={2000}
      />
      <Button
        onClick={() => onSave(notes, tags)}
        disabled={saving}
        className="w-full bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white"
      >
        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Save
      </Button>
    </div>
  )
}

function LeadContactLine({ lead }: { lead: Lead }) {
  if (lead.isMinor) {
    return (
      <p className="text-sm text-amber-700">
        Minor: follow-up goes to {lead.contactName || 'their group leader'}
        {lead.email ? ` (${lead.email})` : ''}
      </p>
    )
  }
  return <p className="text-sm text-[#6B7280]">{lead.email || 'No email on file'}</p>
}

function VendorLeadsContent() {
  const searchParams = useSearchParams()
  const code = searchParams.get('code') || ''

  const [data, setData] = useState<LeadsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [scannerOpen, setScannerOpen] = useState(false)
  const [scanBusy, setScanBusy] = useState(false)
  const [scanMessage, setScanMessage] = useState<{ type: 'ok' | 'dup' | 'error'; text: string } | null>(null)
  const [justScanned, setJustScanned] = useState<Lead | null>(null)
  const [scannerName, setScannerName] = useState('')

  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [composeOpen, setComposeOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<string | null>(null)

  useEffect(() => {
    setScannerName(readStoredName())
  }, [])

  const load = useCallback(async () => {
    if (!code) {
      setError('No access code provided. Open this page from your vendor portal.')
      setLoading(false)
      return
    }
    try {
      const res = await fetch(`/api/vendor/leads?code=${encodeURIComponent(code)}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load leads')
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leads')
    } finally {
      setLoading(false)
    }
  }, [code])

  useEffect(() => {
    load()
  }, [load])

  const upsertLead = (lead: Lead) => {
    setData((prev) => {
      if (!prev) return prev
      const exists = prev.leads.some((l) => l.id === lead.id)
      return {
        ...prev,
        leads: exists ? prev.leads.map((l) => (l.id === lead.id ? lead : l)) : [lead, ...prev.leads],
      }
    })
  }

  // The camera reports the same badge many times a second; the ref stops a
  // second request starting before the first one's state update lands.
  const scanInFlight = useRef(false)

  const handleScan = async (raw: string) => {
    if (scanInFlight.current) return
    scanInFlight.current = true
    setScanBusy(true)
    setScanMessage(null)
    try {
      const res = await fetch('/api/vendor/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, qrData: raw, scannedByName: scannerName || undefined }),
      })
      const json = await res.json()
      if (!res.ok) {
        setScanMessage({ type: 'error', text: json.error || 'Could not save that badge' })
        return
      }
      const lead: Lead = json.lead
      upsertLead(lead)
      setJustScanned(lead)
      setScannerOpen(false)
      setScanMessage(
        json.alreadyScanned
          ? { type: 'dup', text: `${lead.firstName} ${lead.lastName} is already on your list.` }
          : { type: 'ok', text: `Added ${lead.firstName} ${lead.lastName}` }
      )
    } catch {
      setScanMessage({ type: 'error', text: 'Network error. Try again.' })
    } finally {
      scanInFlight.current = false
      setScanBusy(false)
    }
  }

  const saveLead = async (lead: Lead, notes: string, tags: string[]) => {
    setSavingId(lead.id)
    try {
      const res = await fetch(`/api/vendor/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, notes, tags }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save')
      upsertLead(json.lead)
      if (justScanned?.id === lead.id) setJustScanned(null)
      setExpandedId(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSavingId(null)
    }
  }

  const deleteLead = async (lead: Lead) => {
    if (!confirm(`Remove ${lead.firstName} ${lead.lastName} from your leads?`)) return
    const res = await fetch(`/api/vendor/leads/${lead.id}?code=${encodeURIComponent(code)}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      alert(json.error || 'Failed to remove lead')
      return
    }
    setData((prev) => (prev ? { ...prev, leads: prev.leads.filter((l) => l.id !== lead.id) } : prev))
    setSelected((prev) => {
      const next = new Set(prev)
      next.delete(lead.id)
      return next
    })
    if (justScanned?.id === lead.id) setJustScanned(null)
  }

  const sendMessage = async () => {
    if (!data) return
    const leadIds = selected.size > 0 ? Array.from(selected) : undefined
    const count = selected.size > 0 ? selected.size : data.leads.length
    if (!confirm(`Send this email to ${count} lead${count === 1 ? '' : 's'}?`)) return
    setSending(true)
    setSendResult(null)
    try {
      const res = await fetch('/api/vendor/leads/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subject, message, leadIds }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to send')
      setSendResult(
        `Sent ${json.sent} email${json.sent === 1 ? '' : 's'}` +
          (json.failed ? `, ${json.failed} failed` : '') +
          (json.skipped ? `, ${json.skipped} skipped (no email or unsubscribed)` : '') +
          '.'
      )
      setSubject('')
      setMessage('')
      setSelected(new Set())
      load()
    } catch (err) {
      setSendResult(err instanceof Error ? err.message : 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  const filtered = useMemo(() => {
    if (!data) return []
    const q = search.trim().toLowerCase()
    if (!q) return data.leads
    return data.leads.filter((l) =>
      [l.firstName, l.lastName, l.email, l.groupName, l.parishName, l.notes, ...l.tags]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    )
  }, [data, search])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1E3A5F]" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-[#1E3A5F] mb-2">Unable to open lead scanner</h2>
          <p className="text-[#6B7280] mb-4">{error || 'Vendor not found'}</p>
          <Link href="/vendor-portal">
            <Button className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white">Vendor Portal</Button>
          </Link>
        </Card>
      </div>
    )
  }

  const isOwner = data.role === 'owner'
  const closesAt = new Date(data.messaging.closesAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      <header className="bg-[#1E3A5F] text-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Image src="/light-logo-horizontal.png" alt="ChiRho Events" width={120} height={30} className="h-7 w-auto" />
            <div className="min-w-0">
              <p className="text-xs text-white/70">Lead Scanner</p>
              <p className="font-semibold truncate">{data.vendor.businessName}</p>
            </div>
          </div>
          {isOwner && (
            <Link href={`/vendor-dashboard?code=${encodeURIComponent(code)}`} className="text-sm text-white/80 hover:text-white flex items-center gap-1 shrink-0">
              <ArrowLeft className="h-4 w-4" /> Portal
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {!data.enabled ? (
          <Card className="p-6 text-center">
            <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
            <p className="text-[#1F2937]">{data.blockedReason}</p>
          </Card>
        ) : (
          <>
            {/* Scan */}
            <Card className="p-5 space-y-4">
              <div>
                <h1 className="text-xl font-semibold text-[#1E3A5F]">{data.event.name}</h1>
                <p className="text-sm text-[#6B7280]">
                  Scan the QR code on an attendee&apos;s name badge to add them to your leads.
                  {' '}{data.leads.length} lead{data.leads.length === 1 ? '' : 's'} so far.
                </p>
              </div>

              <div>
                <label className="text-sm text-[#6B7280]" htmlFor="scanner-name">Your name (optional, shows who scanned)</label>
                <Input
                  id="scanner-name"
                  value={scannerName}
                  onChange={(e) => {
                    setScannerName(e.target.value)
                    storeName(e.target.value)
                  }}
                  placeholder="e.g. Sr. Maria"
                  maxLength={255}
                />
              </div>

              {scannerOpen ? (
                <div className="space-y-3">
                  <div className="rounded-lg overflow-hidden border-4 border-[#9C8466] relative">
                    <Scanner
                      onScan={(result) => {
                        const raw = result?.[0]?.rawValue
                        if (raw) handleScan(raw.trim())
                      }}
                      onError={() => setScanMessage({ type: 'error', text: 'Camera unavailable. Check camera permissions.' })}
                      paused={scanBusy}
                      constraints={{ facingMode: 'environment' }}
                      styles={{
                        container: { width: '100%', paddingTop: '100%', position: 'relative' },
                        video: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' },
                      }}
                    />
                    {scanBusy && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2 className="h-10 w-10 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => setScannerOpen(false)}>
                    <X className="h-4 w-4 mr-2" /> Close camera
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => {
                    setScanMessage(null)
                    setScannerOpen(true)
                  }}
                  className="w-full h-14 text-lg bg-[#9C8466] hover:bg-[#8B7355] text-white"
                >
                  <QrCode className="h-6 w-6 mr-2" /> Scan Badge
                </Button>
              )}

              {scanMessage && (
                <div
                  className={`rounded-lg p-3 text-sm flex items-start gap-2 ${
                    scanMessage.type === 'ok'
                      ? 'bg-green-50 text-green-800'
                      : scanMessage.type === 'dup'
                        ? 'bg-blue-50 text-blue-800'
                        : 'bg-red-50 text-red-800'
                  }`}
                >
                  {scanMessage.type === 'error' ? (
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  )}
                  {scanMessage.text}
                </div>
              )}

              {justScanned && (
                <div className="border border-[#E5E7EB] rounded-lg p-4 space-y-3">
                  <div>
                    <p className="font-semibold text-[#1F2937]">
                      {justScanned.firstName} {justScanned.lastName}
                    </p>
                    <LeadContactLine lead={justScanned} />
                  </div>
                  <LeadEditor
                    lead={justScanned}
                    suggestedTags={data.suggestedTags}
                    saving={savingId === justScanned.id}
                    onSave={(notes, tags) => saveLead(justScanned, notes, tags)}
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setJustScanned(null)
                      setScanMessage(null)
                      setScannerOpen(true)
                    }}
                  >
                    <QrCode className="h-4 w-4 mr-2" /> Scan next badge
                  </Button>
                </div>
              )}
            </Card>

            {/* Owner tools */}
            {isOwner && (
              <Card className="p-5 space-y-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    asChild={data.leads.length > 0}
                    variant="outline"
                    className="flex-1 border-[#1E3A5F] text-[#1E3A5F]"
                    disabled={data.leads.length === 0}
                  >
                    {data.leads.length > 0 ? (
                      <a href={`/api/vendor/leads/export?code=${encodeURIComponent(code)}`}>
                        <Download className="h-4 w-4 mr-2" /> Download CSV
                      </a>
                    ) : (
                      <span>
                        <Download className="h-4 w-4 mr-2" /> Download CSV
                      </span>
                    )}
                  </Button>
                  <Button
                    className="flex-1 bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white"
                    disabled={data.leads.length === 0 || !data.messaging.open}
                    onClick={() => setComposeOpen((o) => !o)}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Email {selected.size > 0 ? `${selected.size} selected` : 'all leads'}
                  </Button>
                </div>
                <p className="text-xs text-[#6B7280]">
                  {data.messaging.open
                    ? `Emails are sent through ChiRho Events and replies come straight to you. You can email leads until ${closesAt}.`
                    : `Emailing leads closed on ${closesAt}. You can still download your CSV.`}
                  {' '}For attendees under 18, your message goes to their group leader, who is asked to pass it on to the family.
                </p>

                {composeOpen && data.messaging.open && (
                  <div className="space-y-3 border-t pt-4">
                    <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" maxLength={150} />
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Your message. ChiRho adds a greeting and an unsubscribe link."
                      rows={6}
                      maxLength={5000}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={sending || !subject.trim() || !message.trim()}
                      className="w-full bg-[#9C8466] hover:bg-[#8B7355] text-white"
                    >
                      {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                      Send
                    </Button>
                  </div>
                )}
                {sendResult && <p className="text-sm text-[#1E3A5F]">{sendResult}</p>}

                {data.messages.length > 0 && (
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium text-[#1E3A5F] mb-2">Sent messages</p>
                    <ul className="space-y-1 text-sm text-[#6B7280]">
                      {data.messages.map((m) => (
                        <li key={m.id} className="flex justify-between gap-3">
                          <span className="truncate">{m.subject}</span>
                          <span className="shrink-0">
                            {m.emailsSent} sent · {new Date(m.createdAt).toLocaleDateString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            )}

            {/* Lead list */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-[#1E3A5F]">Your Leads</h2>
                {isOwner && data.leads.length > 0 && (
                  <button
                    type="button"
                    className="text-sm text-[#1E3A5F] underline"
                    onClick={() =>
                      setSelected((prev) =>
                        prev.size === filtered.length ? new Set() : new Set(filtered.map((l) => l.id))
                      )
                    }
                  >
                    {selected.size === filtered.length && filtered.length > 0 ? 'Clear selection' : 'Select all'}
                  </button>
                )}
              </div>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, tag, notes" className="pl-9" />
              </div>

              {filtered.length === 0 ? (
                <p className="text-center text-[#6B7280] py-6">
                  {data.leads.length === 0 ? 'No leads yet. Scan a badge to get started.' : 'No leads match your search.'}
                </p>
              ) : (
                <ul className="divide-y divide-[#E5E7EB]">
                  {filtered.map((lead) => (
                    <li key={lead.id} className="py-3">
                      <div className="flex items-start gap-3">
                        {isOwner && (
                          <input
                            type="checkbox"
                            className="mt-1.5 h-4 w-4"
                            checked={selected.has(lead.id)}
                            onChange={() =>
                              setSelected((prev) => {
                                const next = new Set(prev)
                                if (next.has(lead.id)) next.delete(lead.id)
                                else next.add(lead.id)
                                return next
                              })
                            }
                            aria-label={`Select ${lead.firstName} ${lead.lastName}`}
                          />
                        )}
                        <button
                          type="button"
                          className="flex-1 text-left min-w-0"
                          onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
                        >
                          <p className="font-medium text-[#1F2937]">
                            {lead.firstName} {lead.lastName}
                            {lead.unsubscribed && <span className="ml-2 text-xs text-[#9CA3AF]">(unsubscribed)</span>}
                          </p>
                          <LeadContactLine lead={lead} />
                          {(lead.phone || lead.groupName || lead.parishName) && (
                            <p className="text-sm text-[#6B7280]">
                              {[lead.phone, lead.groupName, lead.parishName].filter(Boolean).join(' · ')}
                            </p>
                          )}
                          {lead.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {lead.tags.map((t) => (
                                <span key={t} className="px-2 py-0.5 rounded-full bg-[#F5F1E8] text-xs text-[#1E3A5F]">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                          {lead.notes && <p className="text-sm text-[#1F2937] mt-1 line-clamp-2">{lead.notes}</p>}
                          <p className="text-xs text-[#9CA3AF] mt-1">
                            {new Date(lead.scannedAt).toLocaleString()}
                            {lead.scannedByName ? ` · by ${lead.scannedByName}` : ''}
                          </p>
                        </button>
                        {isOwner && (
                          <button
                            type="button"
                            onClick={() => deleteLead(lead)}
                            className="text-[#9CA3AF] hover:text-red-500 p-1"
                            aria-label={`Remove ${lead.firstName} ${lead.lastName}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      {expandedId === lead.id && (
                        <div className="mt-3">
                          <LeadEditor
                            lead={lead}
                            suggestedTags={data.suggestedTags}
                            saving={savingId === lead.id}
                            onSave={(notes, tags) => saveLead(lead, notes, tags)}
                          />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}
      </main>
    </div>
  )
}

export default function VendorLeadsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F1E8] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#1E3A5F]" />
        </div>
      }
    >
      <VendorLeadsContent />
    </Suspense>
  )
}
