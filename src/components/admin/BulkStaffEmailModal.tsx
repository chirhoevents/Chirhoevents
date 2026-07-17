'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Mail, Users, Building2 } from 'lucide-react'

interface Props {
  eventId: string
  open: boolean
  onClose: () => void
}

interface RoleRow {
  role: string
  total: number
  general: number
  vendor: number
}

type Audience = 'all' | 'general' | 'vendor'

export default function BulkStaffEmailModal({ eventId, open, onClose }: Props) {
  const { getToken } = useAuth()
  const [roles, setRoles] = useState<RoleRow[]>([])
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set())
  const [audience, setAudience] = useState<Audience>('all')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    ;(async () => {
      setLoading(true)
      try {
        const token = await getToken()
        const res = await fetch(`/api/admin/events/${eventId}/staff/roles`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (res.ok) {
          const data = await res.json()
          setRoles(data.roles || [])
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [open, eventId, getToken])

  useEffect(() => {
    if (!open) {
      setSubject('')
      setMessage('')
      setAudience('all')
      setSelectedRoles(new Set())
    }
  }, [open])

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) => {
      const next = new Set(prev)
      if (next.has(role)) next.delete(role)
      else next.add(role)
      return next
    })
  }

  const audienceCount = (audience === 'general'
    ? roles.reduce((s, r) => s + r.general, 0)
    : audience === 'vendor'
    ? roles.reduce((s, r) => s + r.vendor, 0)
    : roles.reduce((s, r) => s + r.total, 0))

  const recipientCount = selectedRoles.size === 0
    ? audienceCount
    : roles
        .filter((r) => selectedRoles.has(r.role))
        .reduce((s, r) =>
          s + (audience === 'general' ? r.general : audience === 'vendor' ? r.vendor : r.total),
          0)

  const send = async () => {
    if (!subject.trim() || !message.trim()) {
      alert('Subject and message are required.')
      return
    }
    if (recipientCount === 0) {
      alert('No recipients match the current filter.')
      return
    }
    if (!confirm(`Send this email to ${recipientCount} recipient${recipientCount === 1 ? '' : 's'}?`)) {
      return
    }
    setSending(true)
    try {
      const token = await getToken()
      const res = await fetch(`/api/admin/events/${eventId}/staff/bulk-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          subject,
          message,
          audience,
          roles: Array.from(selectedRoles),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(`Failed: ${data.error || res.statusText}`)
        return
      }
      const data = await res.json()
      alert(`Sent to ${data.sent} of ${data.total} recipient${data.total === 1 ? '' : 's'}${data.failed ? ` (${data.failed} failed)` : ''}.`)
      onClose()
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Email Staff & Volunteers</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-[#1E3A5F]">Audience</Label>
            <div className="flex gap-2 mt-2">
              {(['all', 'general', 'vendor'] as Audience[]).map((a) => (
                <Button
                  key={a}
                  size="sm"
                  variant={audience === a ? 'default' : 'outline'}
                  onClick={() => setAudience(a)}
                >
                  {a === 'all' && 'All Staff'}
                  {a === 'general' && <><Users className="h-4 w-4 mr-1" />General</>}
                  {a === 'vendor' && <><Building2 className="h-4 w-4 mr-1" />Vendor Booth</>}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-[#1E3A5F]">
              Filter by role <span className="text-xs text-gray-500 font-normal">(optional — leave empty to include all roles)</span>
            </Label>
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-[#1E3A5F]" />
              </div>
            ) : roles.length === 0 ? (
              <p className="text-sm text-gray-500 mt-2">No roles yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2 mt-2">
                {roles.map((r) => {
                  const c = audience === 'general' ? r.general : audience === 'vendor' ? r.vendor : r.total
                  if (c === 0) return null
                  const isSelected = selectedRoles.has(r.role)
                  return (
                    <button
                      key={r.role}
                      type="button"
                      onClick={() => toggleRole(r.role)}
                      className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                        isSelected
                          ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                          : 'bg-white text-[#1E3A5F] border-gray-300 hover:border-[#1E3A5F]'
                      }`}
                    >
                      {r.role} ({c})
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Volunteer meeting Friday 7pm"
            />
          </div>

          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hi team,&#10;&#10;Just a reminder..."
              rows={8}
            />
            <p className="text-xs text-gray-500 mt-1">
              Each email is personalized with the recipient&apos;s first name. Blank lines become paragraphs.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-3 flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-[#1E3A5F]" />
            <span>
              Will send to <strong>{recipientCount}</strong> recipient{recipientCount === 1 ? '' : 's'}.
            </span>
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
