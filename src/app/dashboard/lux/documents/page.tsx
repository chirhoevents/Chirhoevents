'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { FileText, Mail, Download, Lock } from 'lucide-react'
import { useAuth } from '@clerk/nextjs'
import { useLux, useLuxApi } from '@/contexts/LuxContext'
import { toast } from '@/lib/toast'
import { downloadFromApi } from '@/lib/lux/download'
import { formatDateTime, formatShortDate } from '@/lib/lux/format'
import { DOCUMENT_STATUS_LABELS } from '@/lib/lux/program-status'
import { Badge, Button, Card, EmptyState, ErrorNote, PageHeader, Select, Spinner, Tabs } from '@/components/lux/ui'
import DocumentPanel, { DOC_TONE, type PanelDocument } from '@/components/lux/DocumentPanel'

type View = 'review' | 'lookup' | 'missing' | 'approved'
interface Row extends PanelDocument {
  label: string
  required: boolean
  childName: string
  householdId: string
  familyName: string
  programId: string
  programName: string
}
interface Data {
  view: View
  counts: Record<View, number>
  programs: Array<{ id: string; name: string }>
  documents: Row[]
}

const EMPTY: Record<View, { title: string; description: string }> = {
  review: { title: 'Nothing to review', description: 'Documents families upload show up here for you to check.' },
  lookup: { title: 'No parish lookups', description: 'When a family says their child was baptized here, it shows up here so you can check your register.' },
  missing: { title: 'Nothing missing', description: 'Every required document is in. Thank you!' },
  approved: { title: 'Nothing approved yet', description: 'Approved documents stay here, viewable by your staff, until you delete them.' },
}

function DocumentsInner() {
  const api = useLuxApi()
  const { info } = useLux()
  const { getToken } = useAuth()
  const router = useRouter()
  const search = useSearchParams()
  const view = (['review', 'lookup', 'missing', 'approved'].includes(search.get('view') || '') ? search.get('view') : 'review') as View
  const programId = search.get('programId') || ''
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<Row | null>(null)
  const [reminding, setReminding] = useState(false)

  const load = useCallback(() => {
    const params = new URLSearchParams({ view, ...(programId ? { programId } : {}) })
    api<Data>(`/api/lux/documents?${params}`).then(setData).catch(e => setError(e.message))
  }, [api, view, programId])
  useEffect(() => { load() }, [load])

  const go = (next: { view?: View; programId?: string }) => {
    const params = new URLSearchParams({ view: next.view ?? view })
    const p = next.programId ?? programId
    if (p) params.set('programId', p)
    router.replace(`/dashboard/lux/documents?${params}`)
  }

  const remindAll = async () => {
    if (!data) return
    const families = new Set(data.documents.map(d => d.householdId)).size
    if (!confirm(`Email ${families} famil${families === 1 ? 'y' : 'ies'} a list of what they still need to upload, with a link to upload it?`)) return
    setReminding(true)
    try {
      const r = await api<{ sent: number }>('/api/lux/reminders', { method: 'POST', json: programId ? { programId } : {} })
      toast.success(r.sent ? `Reminders sent to ${r.sent} famil${r.sent === 1 ? 'y' : 'ies'}` : 'Nothing to remind about')
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setReminding(false)
    }
  }

  const exportMissing = async () => {
    try {
      await downloadFromApi(getToken, `/api/lux/exports/outstanding-documents${programId ? `?programId=${programId}` : ''}`, 'outstanding-documents.csv')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  if (error) return <ErrorNote message={error} />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Baptismal certificates and other records families upload. Stored privately; each time you open one, it’s logged."
        actions={data && data.programs.length > 1 && (
          <Select value={programId} onChange={e => go({ programId: e.target.value })} className="w-64">
            <option value="">All programs</option>
            {data.programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        )}
      />

      <Card>
        <Tabs value={view} onChange={v => go({ view: v })} tabs={[
          { value: 'review', label: `To review${data ? ` (${data.counts.review})` : ''}` },
          { value: 'lookup', label: `Parish lookups${data ? ` (${data.counts.lookup})` : ''}` },
          { value: 'missing', label: `Missing${data ? ` (${data.counts.missing})` : ''}` },
          { value: 'approved', label: `Approved${data ? ` (${data.counts.approved})` : ''}` },
        ]} />

        {!data || data.view !== view ? <Spinner /> : (
          <>
            {view === 'missing' && data.documents.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {info.canManage && <Button onClick={remindAll} loading={reminding}><Mail className="h-4 w-4" /> Email reminders</Button>}
                <Button variant="secondary" onClick={exportMissing}><Download className="h-4 w-4" /> Export list</Button>
              </div>
            )}
            {data.documents.length === 0 ? <EmptyState icon={<FileText className="h-6 w-6" />} {...EMPTY[view]} /> : (
              <div className="divide-y divide-[#F0EBDF] -mx-5">
                {data.documents.map(d => (
                  <button key={d.id} type="button" onClick={() => setOpen(d)} className="w-full text-left flex items-center gap-4 px-5 py-3 hover:bg-[#FAF8F3]">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{d.label} <span className="font-normal text-gray-500">· {d.childName}</span></p>
                      <p className="text-xs text-gray-500 truncate">
                        <Link href={`/dashboard/lux/households/${d.householdId}`} onClick={e => e.stopPropagation()} className="hover:underline">{d.familyName}</Link> · {d.programName}
                        {d.uploadedAt && ` · uploaded ${formatShortDate(d.uploadedAt)}`}
                        {view === 'missing' && d.lastReminderAt && ` · reminded ${formatDateTime(d.lastReminderAt)}`}
                      </p>
                    </div>
                    {d.hasFile && <Lock className="h-4 w-4 text-gray-300" aria-label="Stored privately" />}
                    <Badge tone={DOC_TONE[d.status]}>{DOCUMENT_STATUS_LABELS[d.status] ?? d.status}</Badge>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </Card>

      <DocumentPanel document={open} label={open?.label ?? ''} childName={open?.childName ?? ''} onClose={() => setOpen(null)} onChanged={load} />
    </div>
  )
}

export default function LuxDocumentsPage() {
  return <Suspense fallback={<Spinner />}><DocumentsInner /></Suspense>
}
