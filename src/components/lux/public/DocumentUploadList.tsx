'use client'

import { useState } from 'react'
import { CheckCircle2, Upload, Loader2, Clock, FileText, Search } from 'lucide-react'

export interface FamilyDocItem {
  submissionId: string
  label: string
  description: string | null
  childName: string
  programName: string
  required: boolean
  status: string
  reviewerNote: string | null
  fileName: string | null
}

const STATUS_TEXT: Record<string, { text: string; className: string; icon: typeof Clock }> = {
  approved: { text: 'Approved', className: 'text-green-700', icon: CheckCircle2 },
  received: { text: 'Received – the parish will review it', className: 'text-blue-700', icon: Clock },
  parish_lookup: { text: 'The parish will look it up', className: 'text-green-700', icon: Search },
  needs_resubmission: { text: 'Please upload a new copy', className: 'text-amber-700', icon: Upload },
  missing: { text: 'Still needed', className: 'text-amber-700', icon: Upload },
}

/** Families upload documents here; they can see the status but never download files */
export default function DocumentUploadList({ items: initial }: { items: FamilyDocItem[] }) {
  const [items, setItems] = useState(initial)
  const [uploading, setUploading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const upload = async (item: FamilyDocItem, file: File) => {
    setError(null)
    if (file.size > 10 * 1024 * 1024) { setError('That file is over 10 MB. Try a photo or a smaller scan.'); return }
    setUploading(item.submissionId)
    try {
      const form = new FormData()
      form.set('submissionId', item.submissionId)
      form.set('file', file)
      const res = await fetch('/api/lux/public/family/documents', { method: 'POST', body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setItems(list => list.map(i => (i.submissionId === item.submissionId ? { ...i, status: data.status, fileName: data.fileName, reviewerNote: null } : i)))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setUploading(null)
    }
  }

  if (items.length === 0) return <p className="text-sm text-gray-500">No documents needed.</p>
  return (
    <div className="space-y-2">
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {items.map(item => {
        const s = STATUS_TEXT[item.status] ?? STATUS_TEXT.missing
        const canUpload = ['missing', 'needs_resubmission', 'received'].includes(item.status)
        return (
          <div key={item.submissionId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg bg-[#FAF8F3] p-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 flex items-center gap-1">
                <FileText className="h-4 w-4 text-[#C8A24A]" /> {item.label} <span className="font-normal text-gray-500">· {item.childName}, {item.programName}</span>
                {!item.required && <span className="text-gray-400 font-normal"> (optional)</span>}
              </p>
              <p className={`text-xs flex items-center gap-1 mt-0.5 ${s.className}`}><s.icon className="h-3.5 w-3.5" /> {s.text}{item.fileName && item.status === 'received' ? ` (${item.fileName})` : ''}</p>
              {item.reviewerNote && item.status === 'needs_resubmission' && <p className="text-xs text-gray-600 mt-0.5">Note from the parish: {item.reviewerNote}</p>}
            </div>
            {canUpload && (
              <label className="inline-flex items-center gap-2 cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm hover:border-[#C8A24A] shrink-0">
                {uploading === item.submissionId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {item.status === 'received' ? 'Replace' : 'Upload'}
                <input type="file" accept=".pdf,image/*" className="hidden" disabled={!!uploading}
                  onChange={e => { const f = e.target.files?.[0]; if (f) upload(item, f); e.target.value = '' }} />
              </label>
            )}
          </div>
        )
      })}
    </div>
  )
}
