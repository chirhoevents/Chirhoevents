'use client'

import { useRef, useState } from 'react'
import { Eye, Upload, CheckCircle2, RotateCcw, Search, Trash2, Mail } from 'lucide-react'
import { useLux, useLuxApi } from '@/contexts/LuxContext'
import { useAuth } from '@clerk/nextjs'
import { toast } from '@/lib/toast'
import { DOCUMENT_STATUS_LABELS } from '@/lib/lux/program-status'
import { formatDateTime } from '@/lib/lux/format'
import { Badge, Button, Field, Modal, TextArea } from '@/components/lux/ui'

export interface PanelDocument {
  id: string
  status: string
  fileName: string | null
  uploadedAt: string | null
  uploadedVia: string | null
  reviewerNote: string | null
  lastReminderAt: string | null
  hasFile: boolean
}

export const DOC_TONE: Record<string, 'gray' | 'green' | 'amber' | 'red' | 'blue'> = {
  missing: 'red',
  received: 'blue',
  approved: 'green',
  needs_resubmission: 'amber',
  parish_lookup: 'amber',
}

/**
 * Review one document: open it (each click makes a fresh 5-minute link;
 * every open is logged), approve it, ask for a new copy, mark a parish
 * lookup done, upload a copy the family brought in, or delete the file.
 */
export default function DocumentPanel({ document, label, childName, onClose, onChanged }: {
  document: PanelDocument | null
  label: string
  childName: string
  onClose: () => void
  onChanged: () => void
}) {
  const api = useLuxApi()
  const { getToken } = useAuth()
  const { info } = useLux()
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  if (!document) return null

  const open = async () => {
    setBusy('view')
    // Open the tab first so pop-up blockers allow it, then point it at the file
    const tab = window.open('', '_blank')
    try {
      const { url } = await api<{ url: string }>(`/api/lux/documents/${document.id}/view`)
      if (tab) tab.location.href = url
      else window.location.href = url
    } catch (e) {
      tab?.close()
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const setStatus = async (status: string, success: string, withNote = false) => {
    setBusy(status)
    try {
      await api(`/api/lux/documents/${document.id}`, { method: 'PATCH', json: { status, note: withNote ? note : undefined } })
      toast.success(success)
      onChanged()
      onClose()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const uploadFile = async (file: File) => {
    setBusy('upload')
    try {
      const form = new FormData()
      form.set('file', file)
      const token = await getToken()
      const res = await fetch(`/api/lux/documents/${document.id}/upload`, {
        method: 'POST',
        body: form,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      toast.success('Uploaded and approved')
      onChanged()
      onClose()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const remove = async () => {
    if (!confirm('Delete this file? The family will be asked for it again.')) return
    setBusy('delete')
    try {
      await api(`/api/lux/documents/${document.id}`, { method: 'DELETE' })
      toast.success('File deleted')
      onChanged()
      onClose()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const remind = async () => {
    setBusy('remind')
    try {
      const result = await api('/api/lux/reminders', { method: 'POST', json: { submissionIds: [document.id] } })
      toast.success(result.sent ? 'Reminder sent' : 'Nothing to remind about')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Modal open onClose={onClose} title={`${label} – ${childName}`}>
      <div className="space-y-4 text-sm">
        <div className="flex items-center gap-2">
          <Badge tone={DOC_TONE[document.status]}>{DOCUMENT_STATUS_LABELS[document.status] ?? document.status}</Badge>
          {document.lastReminderAt && <span className="text-xs text-gray-500">Reminder sent {formatDateTime(document.lastReminderAt)}</span>}
        </div>
        {document.hasFile ? (
          <div className="rounded-lg bg-[#FAF8F3] p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-gray-800 truncate">{document.fileName}</p>
              <p className="text-xs text-gray-500">
                Uploaded {formatDateTime(document.uploadedAt)}{document.uploadedVia === 'staff' ? ' by staff' : document.uploadedVia === 'reused' ? ' (on file from an earlier program)' : ' by the family'}
              </p>
            </div>
            <Button variant="secondary" onClick={open} loading={busy === 'view'}><Eye className="h-4 w-4" /> Open</Button>
          </div>
        ) : (
          <p className="text-gray-600">
            {document.status === 'parish_lookup'
              ? 'The family says this child was baptized here. Look it up in the parish register, then mark it found.'
              : 'Nothing uploaded yet.'}
          </p>
        )}
        {document.reviewerNote && <p className="text-gray-600"><span className="text-gray-500">Note:</span> {document.reviewerNote}</p>}

        {info.canManage && (
          <>
            <div className="flex flex-wrap gap-2">
              {document.status !== 'approved' && (document.hasFile || document.status === 'parish_lookup') && (
                <Button onClick={() => setStatus('approved', document.status === 'parish_lookup' ? 'Marked as found in the parish records' : 'Approved')} loading={busy === 'approved'}>
                  {document.status === 'parish_lookup' ? <><Search className="h-4 w-4" /> Found in our records</> : <><CheckCircle2 className="h-4 w-4" /> Approve</>}
                </Button>
              )}
              <input ref={fileInput} type="file" accept=".pdf,image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = '' }} />
              <Button variant="secondary" onClick={() => fileInput.current?.click()} loading={busy === 'upload'}>
                <Upload className="h-4 w-4" /> {document.hasFile ? 'Replace with a copy we have' : 'Upload a copy we have'}
              </Button>
              {['missing', 'needs_resubmission'].includes(document.status) && (
                <Button variant="ghost" onClick={remind} loading={busy === 'remind'}><Mail className="h-4 w-4" /> Email a reminder</Button>
              )}
            </div>
            {document.hasFile && document.status !== 'needs_resubmission' && (
              <div className="border-t border-[#F0EBDF] pt-4 space-y-2">
                <Field label="Need a new copy?" hint="The family sees this note in their reminder.">
                  <TextArea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="The photo is too blurry to read the baptism date." />
                </Field>
                <Button variant="secondary" onClick={() => setStatus('needs_resubmission', 'Asked the family for a new copy', true)} loading={busy === 'needs_resubmission'}>
                  <RotateCcw className="h-4 w-4" /> Ask for a new copy
                </Button>
              </div>
            )}
            {document.hasFile && (
              <div className="border-t border-[#F0EBDF] pt-4">
                <Button variant="danger" onClick={remove} loading={busy === 'delete'}><Trash2 className="h-4 w-4" /> Delete this file</Button>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
