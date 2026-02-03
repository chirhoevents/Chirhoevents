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
  Sun,
  MapPin,
  Clock,
  Calendar,
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/lib/toast'

interface Adoration {
  id: string
  day: string
  startTime: string
  endTime: string | null
  location: string
  description: string | null
  isActive: boolean
  order: number
}

interface PorosAdorationProps {
  eventId: string
}

const DAYS = [
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'monday', label: 'Monday' },
]

export function PorosAdoration({ eventId }: PorosAdorationProps) {
  const [adorations, setAdorations] = useState<Adoration[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAdoration, setEditingAdoration] = useState<Adoration | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Form state
  const [formDay, setFormDay] = useState('saturday')
  const [formStartTime, setFormStartTime] = useState('')
  const [formEndTime, setFormEndTime] = useState('')
  const [formLocation, setFormLocation] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)

  useEffect(() => {
    loadAdorations()
  }, [eventId])

  async function loadAdorations() {
    try {
      const response = await fetch(`/api/admin/events/${eventId}/poros/adoration`)
      if (response.ok) {
        const data = await response.json()
        setAdorations(data.adorations || [])
      }
    } catch (error) {
      console.error('Failed to load adorations:', error)
      toast.error('Failed to load adoration times')
    } finally {
      setLoading(false)
    }
  }

  function openCreateDialog() {
    setEditingAdoration(null)
    setFormDay('saturday')
    setFormStartTime('')
    setFormEndTime('')
    setFormLocation('')
    setFormDescription('')
    setFormIsActive(true)
    setDialogOpen(true)
  }

  function openEditDialog(adoration: Adoration) {
    setEditingAdoration(adoration)
    setFormDay(adoration.day)
    setFormStartTime(adoration.startTime)
    setFormEndTime(adoration.endTime || '')
    setFormLocation(adoration.location)
    setFormDescription(adoration.description || '')
    setFormIsActive(adoration.isActive)
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
      if (editingAdoration) {
        response = await fetch(`/api/admin/events/${eventId}/poros/adoration/${editingAdoration.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        response = await fetch(`/api/admin/events/${eventId}/poros/adoration`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to save')
      }

      toast.success(editingAdoration ? 'Adoration time updated' : 'Adoration time created')
      setDialogOpen(false)
      loadAdorations()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save adoration time')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(adoration: Adoration) {
    try {
      const response = await fetch(`/api/admin/events/${eventId}/poros/adoration/${adoration.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !adoration.isActive }),
      })

      if (!response.ok) throw new Error('Failed to update')

      setAdorations(prev =>
        prev.map(a => a.id === adoration.id ? { ...a, isActive: !a.isActive } : a)
      )
      toast.success(adoration.isActive ? 'Adoration time deactivated' : 'Adoration time activated')
    } catch {
      toast.error('Failed to update adoration time')
    }
  }

  async function handleDelete() {
    if (!deletingId) return

    setSaving(true)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/poros/adoration/${deletingId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete')

      toast.success('Adoration time deleted')
      setDeleteDialogOpen(false)
      setDeletingId(null)
      loadAdorations()
    } catch {
      toast.error('Failed to delete adoration time')
    } finally {
      setSaving(false)
    }
  }

  function confirmDelete(id: string) {
    setDeletingId(id)
    setDeleteDialogOpen(true)
  }

  // Group adorations by day
  const adorationsByDay = adorations.reduce((acc, a) => {
    if (!acc[a.day]) acc[a.day] = []
    acc[a.day].push(a)
    return acc
  }, {} as Record<string, Adoration[]>)

  const dayOrder = ['thursday', 'friday', 'saturday', 'sunday', 'monday']
  const sortedDays = Object.keys(adorationsByDay).sort(
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
                <Sun className="w-5 h-5" />
                Adoration Times
              </CardTitle>
              <CardDescription>
                Manage adoration time slots and locations for participants
              </CardDescription>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add Time Slot
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {adorations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Sun className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">No adoration times added yet</p>
              <p className="text-sm mt-1">Add time slots so participants know when and where adoration is available</p>
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
                    {adorationsByDay[day].map(adoration => (
                      <div
                        key={adoration.id}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          adoration.isActive
                            ? 'bg-white border-gray-200'
                            : 'bg-gray-50 border-gray-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 text-sm font-semibold text-rose-600 min-w-[120px]">
                            <Clock className="w-4 h-4" />
                            {adoration.startTime}
                            {adoration.endTime && ` - ${adoration.endTime}`}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">{adoration.location}</span>
                              {!adoration.isActive && (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                            </div>
                            {adoration.description && (
                              <p className="text-sm text-muted-foreground mt-1 ml-6">
                                {adoration.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={adoration.isActive}
                            onCheckedChange={() => toggleActive(adoration)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(adoration)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => confirmDelete(adoration.id)}
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAdoration ? 'Edit Adoration Time' : 'Add Adoration Time'}
            </DialogTitle>
            <DialogDescription>
              {editingAdoration
                ? 'Update this adoration time slot'
                : 'Add a new adoration time slot for participants'}
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
                placeholder="e.g. Chapel, Adoration Room"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Description (optional)</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Additional details about this adoration time..."
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
              {editingAdoration ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Adoration Time</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this adoration time slot? This action cannot be undone.
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
