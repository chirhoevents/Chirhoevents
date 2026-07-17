'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Mail } from 'lucide-react'

interface Props {
  eventId: string
  open: boolean
  onClose: () => void
  counts: { all: number; approved: number; pending: number }
}

type Filter = 'all' | 'approved' | 'pending'

export default function BulkVendorEmailModal({ eventId, open, onClose, counts }: Props) {
  const { getToken } = useAuth()
  const [status, setStatus] = useState<Filter>('approved')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!open) {
      setSubject('')
      setMessage('')
      setStatus('approved')
    }
  }, [open])

  const recipientCount = counts[status]

  const send = async () => {
    if (!subject.trim() || !message.trim()) {
      alert('Subject and message are required.')
      return
    }
    if (recipientCount === 0) {
      alert('No recipients match the current filter.')
      return
    }
    if (!confirm(`Send this email to ${recipientCount} vendor${recipientCount === 1 ? '' : 's'}?`)) {
      return
    }
    setSending(true)
    try {
      const token = await getToken()
      const res = await fetch(`/api/admin/events/${eventId}/vendors/bulk-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ subject, message, status }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(`Failed: ${data.error || res.statusText}`)
        return
      }
      const data = await res.json()
      alert(`Sent to ${data.sent} of ${data.total} vendor${data.total === 1 ? '' : 's'}${data.failed ? ` (${data.failed} failed)` : ''}.`)
      onClose()
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Email Vendors</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-[#1E3A5F]">Recipients</Label>
            <div className="flex gap-2 mt-2">
              {(['approved', 'pending', 'all'] as Filter[]).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={status === s ? 'default' : 'outline'}
                  onClick={() => setStatus(s)}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)} ({counts[s]})
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="v-subject">Subject</Label>
            <Input
              id="v-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Setup instructions for Saturday"
            />
          </div>

          <div>
            <Label htmlFor="v-message">Message</Label>
            <Textarea
              id="v-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hi,&#10;&#10;Here are the setup instructions..."
              rows={8}
            />
            <p className="text-xs text-gray-500 mt-1">
              Each email is personalized with the vendor contact&apos;s first name.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-3 flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-[#1E3A5F]" />
            <span>Will send to <strong>{recipientCount}</strong> vendor{recipientCount === 1 ? '' : 's'}.</span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={sending}>Cancel</Button>
          <Button onClick={send} disabled={sending || recipientCount === 0} className="bg-[#1E3A5F] hover:bg-[#2d4a6f]">
            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
            Send to {recipientCount}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
