'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Download, Loader2, Search } from 'lucide-react'

interface Settings {
  vendorLeadsEnabled: boolean
  vendorLeadsSharePhone: boolean
  vendorLeadsShareGroup: boolean
}

interface AdminLead {
  id: string
  vendorId: string
  businessName: string
  attendeeType: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  groupName: string | null
  parishName: string | null
  isMinor: boolean
  contactName: string | null
  contactEmail: string | null
  notes: string | null
  tags: string[]
  scannedByName: string | null
  scannedAt: string
  unsubscribed: boolean
}

interface AdminMessage {
  id: string
  vendorId: string
  businessName: string
  subject: string
  body: string
  recipients: number
  emailsSent: number
  emailsFailed: number
  createdAt: string
}

interface LeadsData {
  settings: Settings
  messagingClosesAt: string
  totals: { leads: number; uniqueAttendees: number; minors: number; messages: number; emailsSent: number }
  summary: Array<{
    vendorId: string
    businessName: string
    leadCount: number
    minorLeadCount: number
    messageCount: number
    emailsSent: number
  }>
  leads: AdminLead[]
  messages: AdminMessage[]
}

export default function AdminVendorLeadsPage() {
  const params = useParams()
  const eventId = params.eventId as string
  const { getToken } = useAuth()

  const [data, setData] = useState<LeadsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState<keyof Settings | null>(null)
  const [vendorFilter, setVendorFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [openMessageId, setOpenMessageId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const token = await getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }, [getToken])

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/events/${eventId}/vendors/leads`, { headers: await authHeaders() })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [eventId, authHeaders])

  useEffect(() => {
    load()
  }, [load])

  const updateSetting = async (key: keyof Settings, value: boolean) => {
    if (!data) return
    setSaving(key)
    const previous = data.settings
    setData({ ...data, settings: { ...data.settings, [key]: value } })
    try {
      const res = await fetch(`/api/admin/events/${eventId}/vendors/leads`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ [key]: value }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save')
      setData((d) => (d ? { ...d, settings: json.settings } : d))
    } catch (err) {
      setData((d) => (d ? { ...d, settings: previous } : d))
      alert(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(null)
    }
  }

  const exportCsv = async () => {
    setExporting(true)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/vendors/leads?format=csv`, { headers: await authHeaders() })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'vendor-leads.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  const filteredLeads = useMemo(() => {
    if (!data) return []
    const q = search.trim().toLowerCase()
    return data.leads.filter((l) => {
      if (vendorFilter !== 'all' && l.vendorId !== vendorFilter) return false
      if (!q) return true
      return [l.firstName, l.lastName, l.email, l.contactEmail, l.groupName, l.parishName, l.notes, l.businessName, ...l.tags]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    })
  }, [data, search, vendorFilter])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#1E3A5F]" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-20">
        <p className="text-red-600">{error || 'Failed to load'}</p>
        <Button onClick={load} className="mt-4">Retry</Button>
      </div>
    )
  }

  const toggles: Array<{ key: keyof Settings; label: string; help: string; disabled?: boolean }> = [
    {
      key: 'vendorLeadsEnabled',
      label: 'Let vendors scan badges for leads',
      help: 'Approved vendors get a lead scanner in their vendor portal. Name and email are always shared.',
    },
    {
      key: 'vendorLeadsSharePhone',
      label: 'Also share phone numbers',
      help: "Adults' phone numbers (for minors, the group leader's).",
      disabled: !data.settings.vendorLeadsEnabled,
    },
    {
      key: 'vendorLeadsShareGroup',
      label: 'Also share parish / group',
      help: 'The group and parish name the attendee registered with.',
      disabled: !data.settings.vendorLeadsEnabled,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href={`/dashboard/admin/events/${eventId}/vendors`}
            className="text-sm text-[#6B7280] hover:text-[#1E3A5F] flex items-center mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Vendors
          </Link>
          <h1 className="text-2xl font-bold text-[#1E3A5F]">Vendor Lead Retrieval</h1>
          <p className="text-[#6B7280]">
            Every badge vendors scanned and every email they sent. Vendors can email leads until{' '}
            {new Date(data.messagingClosesAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={exporting || data.leads.length === 0}>
          {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          Export All Leads
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-[#1E3A5F]">Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {toggles.map((t) => (
            <div key={t.key} className="flex items-start justify-between gap-4">
              <div>
                <Label htmlFor={t.key} className="font-medium">{t.label}</Label>
                <p className="text-sm text-[#6B7280]">{t.help}</p>
              </div>
              <Switch
                id={t.key}
                checked={data.settings[t.key]}
                disabled={t.disabled || saving !== null}
                onCheckedChange={(v) => updateSetting(t.key, v)}
              />
            </div>
          ))}
          <p className="text-xs text-[#6B7280] border-t pt-3">
            Attendees under 18: vendors never see the minor&apos;s own contact info. Their lead lists the group leader
            (or, for individual registrations, the registration contact), and follow-up emails ask that adult to pass
            the message on to the family. Emails come from vendors@chirhoevents.com with replies going to the vendor.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Leads', value: data.totals.leads },
          { label: 'Attendees scanned', value: data.totals.uniqueAttendees },
          { label: 'Minor leads', value: data.totals.minors },
          { label: 'Messages sent', value: data.totals.messages },
          { label: 'Emails delivered', value: data.totals.emailsSent },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-[#1E3A5F]">{s.value}</p>
              <p className="text-sm text-[#6B7280]">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-[#1E3A5F]">By Vendor</CardTitle>
        </CardHeader>
        <CardContent>
          {data.summary.length === 0 ? (
            <p className="text-[#6B7280]">No approved vendors yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Minors</TableHead>
                  <TableHead className="text-right">Messages</TableHead>
                  <TableHead className="text-right">Emails</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.summary.map((v) => (
                  <TableRow key={v.vendorId}>
                    <TableCell className="font-medium">{v.businessName}</TableCell>
                    <TableCell className="text-right">{v.leadCount}</TableCell>
                    <TableCell className="text-right">{v.minorLeadCount}</TableCell>
                    <TableCell className="text-right">{v.messageCount}</TableCell>
                    <TableCell className="text-right">{v.emailsSent}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-[#1E3A5F]">Messages Vendors Sent</CardTitle>
        </CardHeader>
        <CardContent>
          {data.messages.length === 0 ? (
            <p className="text-[#6B7280]">No vendor has emailed their leads yet.</p>
          ) : (
            <ul className="divide-y">
              {data.messages.map((m) => (
                <li key={m.id} className="py-3">
                  <button
                    type="button"
                    className="w-full text-left flex flex-col sm:flex-row sm:justify-between gap-1"
                    onClick={() => setOpenMessageId(openMessageId === m.id ? null : m.id)}
                  >
                    <span>
                      <span className="font-medium text-[#1F2937]">{m.subject}</span>
                      <span className="text-[#6B7280]"> · {m.businessName}</span>
                    </span>
                    <span className="text-sm text-[#6B7280]">
                      {m.emailsSent} sent{m.emailsFailed ? `, ${m.emailsFailed} failed` : ''} ·{' '}
                      {new Date(m.createdAt).toLocaleString()}
                    </span>
                  </button>
                  {openMessageId === m.id && (
                    <p className="mt-2 text-sm text-[#1F2937] whitespace-pre-wrap bg-[#F9FAFB] p-3 rounded">{m.body}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-[#1E3A5F]">All Leads</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm"
              aria-label="Filter by vendor"
            >
              <option value="all">All vendors</option>
              {data.summary.map((v) => (
                <option key={v.vendorId} value={v.vendorId}>{v.businessName}</option>
              ))}
            </select>
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="pl-9" />
            </div>
          </div>
          {filteredLeads.length === 0 ? (
            <p className="text-[#6B7280]">No leads.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Attendee</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Group / Parish</TableHead>
                    <TableHead>Tags &amp; Notes</TableHead>
                    <TableHead>Scanned</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>
                        <p className="font-medium">{l.firstName} {l.lastName}</p>
                        {l.isMinor && <p className="text-xs text-amber-700">Minor</p>}
                        {l.unsubscribed && <p className="text-xs text-[#9CA3AF]">Unsubscribed</p>}
                      </TableCell>
                      <TableCell>{l.businessName}</TableCell>
                      <TableCell className="text-sm">
                        {l.isMinor ? (
                          <>
                            <p>{l.contactName || 'Group leader'}</p>
                            <p className="text-[#6B7280]">{l.contactEmail}</p>
                          </>
                        ) : (
                          <>
                            <p>{l.email || '—'}</p>
                            {l.phone && <p className="text-[#6B7280]">{l.phone}</p>}
                          </>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {[l.groupName, l.parishName].filter(Boolean).join(' / ') || '—'}
                      </TableCell>
                      <TableCell className="text-sm max-w-xs">
                        {l.tags.length > 0 && <p className="text-[#1E3A5F]">{l.tags.join(', ')}</p>}
                        {l.notes && <p className="text-[#6B7280] line-clamp-2">{l.notes}</p>}
                      </TableCell>
                      <TableCell className="text-sm text-[#6B7280] whitespace-nowrap">
                        {new Date(l.scannedAt).toLocaleString()}
                        {l.scannedByName && <p>by {l.scannedByName}</p>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
