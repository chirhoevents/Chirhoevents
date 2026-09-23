'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Archive, ArchiveRestore, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ArchiveEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  eventName: string
  /** 'archive' moves the event to the archive; 'restore' brings it back. */
  mode: 'archive' | 'restore'
  onDone: () => void
}

export default function ArchiveEventDialog({
  open,
  onOpenChange,
  eventId,
  eventName,
  mode,
  onDone,
}: ArchiveEventDialogProps) {
  const { getToken } = useAuth()
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    setWorking(true)
    setError(null)
    try {
      const token = await getToken()
      const response = await fetch(`/api/admin/events/${eventId}/archive`, {
        method: mode === 'archive' ? 'POST' : 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Request failed')
      }
      onOpenChange(false)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setWorking(false)
    }
  }

  const isArchive = mode === 'archive'

  return (
    <Dialog open={open} onOpenChange={(o) => !working && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-[#1E3A5F]">
            {isArchive ? 'Archive' : 'Restore'} &ldquo;{eventName}&rdquo;?
          </DialogTitle>
          <DialogDescription asChild>
            {isArchive ? (
              <div className="space-y-2 text-sm text-[#6B7280]">
                <p>
                  The event will be removed from your dashboard stats, event lists, check-in
                  and housing tools, and the public website.
                </p>
                <p>
                  Nothing is deleted. You can still view its stats, setup and reports (including
                  the master report) from <strong>Events → Archived Events</strong>, and restore
                  it at any time.
                </p>
                <p>Tip: download the master report before archiving if you need a copy on file.</p>
              </div>
            ) : (
              <p className="text-sm text-[#6B7280]">
                The event will show up again in your dashboard, event lists and tools. If it was
                published, its public page will be visible again.
              </p>
            )}
          </DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={working}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={working}
            className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white"
          >
            {working ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : isArchive ? (
              <Archive className="h-4 w-4 mr-2" />
            ) : (
              <ArchiveRestore className="h-4 w-4 mr-2" />
            )}
            {isArchive ? 'Archive Event' : 'Restore Event'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
