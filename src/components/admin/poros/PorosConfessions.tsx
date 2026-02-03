'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Trash2,
  Loader2,
  Edit,
  Church,
  MapPin,
  Clock,
  Calendar,
  ExternalLink,
  Link as LinkIcon,
  Check,
  AlertCircle,
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/lib/toast'

interface Confession {
  id: string
  day: string
  startTime: string
  endTime: string | null
  location: string
  description: string | null
  isActive: boolean
  order: number
}

interface PorosConfessionsProps {
  eventId: string
}

const DAYS = [
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'monday', label: 'Monday' },
]

export function PorosConfessions({ eventId }: PorosConfessionsProps) {
  const [confessions, setConfessions] = useState<Confession[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingConfession, setEditingConfession] = useState<Confession | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Reconciliation guide
  const [reconciliationGuideUrl, setReconciliationGuideUrl] = useState('')
  const [savedGuideUrl, setSavedGuideUrl] = useState('')
  const [savingGuideUrl, setSavingGuideUrl] = useState(false)
  const [guideSaved, setGuideSaved] = useState(false)

  // Form state
  const [formDay, setFormDay] = useState('saturday')
  const [formStartTime, setFormStartTime] = useState('')
  const [formEndTime, setFormEndTime] = useState('')
  const [formLocation, setFormLocation] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)

  useEffect(() => {
    loadConfessions()
    loadSettings()
  }, [eventId])

  async function loadConfessions() {
    try {
      const response = await fetch(`/api/admin/events/${eventId}/poros/confessions`)
      if (response.ok) {
        const data = await response.json()
        setConfessions(data.confessions || [])
      }
    } catch (error) {
      console.error('Failed to load confessions:', error)
      toast.error('Failed to load confession times')
    } finally {
      setLoading(false)
    }
  }

  async function loadSettings() {
    try {
      const response = await fetch(`/api/admin/events/${eventId}/settings`)
      if (response.ok) {
        const data = await response.json()
        const url = data.confessionsReconciliationGuideUrl || ''
        setReconciliationGuideUrl(url)
        setSavedGuideUrl(url)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  const guideUrlDirty = reconciliationGuideUrl !== savedGuideUrl

  async function saveGuideUrl() {
    setSavingGuideUrl(true)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confessionsReconciliationGuideUrl: reconciliationGuideUrl || null }),
      })
      if (!response.ok) throw new Error('Failed to save')
      setSavedGuideUrl(reconciliationGuideUrl)
      setGuideSaved(true)
      toast.success('Reconciliation guide link saved successfully!')
      setTimeout(() => setGuideSaved(false), 3000)
    } catch {
      toast.error('Failed to save reconciliation guide link')
    } finally {
      setSavingGuideUrl(false)
    }
  }

  function openCreateDialog() {
    setEditingConfession(null)
    setFormDay('saturday')
    setFormStartTime('')
    setFormEndTime('')
    setFormLocation('')
    setFormDescription('')
    setFormIsActive(true)
    setDialogOpen(true)
  }

  function openEditDialog(confession: Confession) {
    setEditingConfession(confession)
    setFormDay(confession.day)
    setFormStartTime(confession.startTime)
    setFormEndTime(confession.endTime || '')
    setFormLocation(confession.location)
    setFormDescription(confession.description || '')
    setFormIsActive(confession.isActive)
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!formDay || !formStartTime || !formLocation) {
      toast.error('Day, start time, and location are required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        day: formDay,
        startTime: formStartTime,
        endTime: formEndTime || null,
        location: formLocation,
        description: formDescription || null,
        isActive: formIsActive,
      }

      let response
      if (editingConfession) {
        response = await fetch(`/api/admin/events/${eventId}/poros/confessions/${editingConfession.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        response = await fetch(`/api/admin/events/${eventId}/poros/confessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to save')
      }

      toast.success(editingConfession ? 'Confession time updated' : 'Confession time created')
      setDialogOpen(false)
      loadConfessions()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save confession time')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(confession: Confession) {
    try {
      const response = await fetch(`/api/admin/events/${eventId}/poros/confessions/${confession.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !confession.isActive }),
      })

      if (!response.ok) throw new Error('Failed to update')

      setConfessions(prev =>
        prev.map(c => c.id === confession.id ? { ...c, isActive: !c.isActive } : c)
      )
      toast.success(confession.isActive ? 'Confession time deactivated' : 'Confession time activated')
    } catch {
      toast.error('Failed to update confession time')
    }
  }

  async function handleDelete() {
    if (!deletingId) return

    setSaving(true)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/poros/confessions/${deletingId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete')

      toast.success('Confession time deleted')
      setDeleteDialogOpen(false)
      setDeletingId(null)
      loadConfessions()
    } catch {
      toast.error('Failed to delete confession time')
    } finally {
      setSaving(false)
    }
  }

  function confirmDelete(id: string) {
    setDeletingId(id)
    setDeleteDialogOpen(true)
  }

  // Group confessions by day
  const confessionsByDay = confessions.reduce((acc, c) => {
    if (!acc[c.day]) acc[c.day] = []
    acc[c.day].push(c)
    return acc
  }, {} as Record<string, Confession[]>)

  const dayOrder = ['thursday', 'friday', 'saturday', 'sunday', 'monday']
  const sortedDays = Object.keys(confessionsByDay).sort(
    (a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b)
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Church className="w-5 h-5" />
                Confession Times
              </CardTitle>
              <CardDescription>
                Manage confession time slots and locations for participants
              </CardDescription>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add Time Slot
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {confessions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Church className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">No confession times added yet</p>
              <p className="text-sm mt-1">Add time slots so participants know when and where confessions are available</p>
              <Button onClick={openCreateDialog} variant="outline" className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Add First Time Slot
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedDays.map(day => (
                <div key={day}>
                  <h3 className="font-semibold text-lg capitalize mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    {day}
                  </h3>
                  <div className="space-y-2">
                    {confessionsByDay[day].map(confession => (
                      <div
                        key={confession.id}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          confession.isActive
                            ? 'bg-white border-gray-200'
                            : 'bg-gray-50 border-gray-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 text-sm font-semibold text-blue-600 min-w-[120px]">
                            <Clock className="w-4 h-4" />
                            {confession.startTime}
                            {confession.endTime && ` - ${confession.endTime}`}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">{confession.location}</span>
                              {!confession.isActive && (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                            </div>
                            {confession.description && (
                              <p className="text-sm text-muted-foreground mt-1 ml-6">
                                {confession.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={confession.isActive}
                            onCheckedChange={() => toggleActive(confession)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(confession)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => confirmDelete(confession.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reconciliation Guide Link */}
      <Card className={guideUrlDirty ? 'border-amber-300 ring-1 ring-amber-200' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LinkIcon className="w-4 h-4" />
            Reconciliation Guide
          </CardTitle>
          <CardDescription>
            Add a link to a reconciliation/examination of conscience guide that will be shown to participants
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              value={reconciliationGuideUrl}
              onChange={(e) => {
                setReconciliationGuideUrl(e.target.value)
                setGuideSaved(false)
              }}
              placeholder="https://example.com/reconciliation-guide"
              className="flex-1"
            />
            <Button
              onClick={saveGuideUrl}
              disabled={savingGuideUrl}
              variant={guideUrlDirty ? 'default' : 'outline'}
              className={guideUrlDirty ? 'bg-navy hover:bg-navy/90 animate-pulse-once' : ''}
            >
              {savingGuideUrl ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : guideSaved ? (
                <Check className="w-4 h-4 mr-2 text-green-400" />
              ) : null}
              {guideSaved ? 'Saved!' : 'Save Link'}
            </Button>
          </div>
          {guideUrlDirty && (
            <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              You have unsaved changes — click &quot;Save Link&quot; to keep them
            </p>
          )}
          {guideSaved && !guideUrlDirty && (
            <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              Link saved successfully
            </p>
          )}
          {reconciliationGuideUrl && !guideUrlDirty && !guideSaved && (
            <a
              href={reconciliationGuideUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mt-2"
            >
              <ExternalLink className="w-3 h-3" />
              Preview link
            </a>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingConfession ? 'Edit Confession Time' : 'Add Confession Time'}
            </DialogTitle>
            <DialogDescription>
              {editingConfession
                ? 'Update this confession time slot'
                : 'Add a new confession time slot for participants'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Day</Label>
              <Select value={formDay} onValueChange={setFormDay}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a day" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map(d => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Input
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                  placeholder="e.g. 2:00 PM"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>End Time (optional)</Label>
                <Input
                  value={formEndTime}
                  onChange={(e) => setFormEndTime(e.target.value)}
                  placeholder="e.g. 4:00 PM"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Location</Label>
              <Input
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                placeholder="e.g. Chapel, Confession Room 1"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Description (optional)</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Additional details about this confession time..."
                className="mt-1"
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={formIsActive}
                onCheckedChange={setFormIsActive}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingConfession ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Confession Time</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this confession time slot? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
