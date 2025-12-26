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
  Calendar,
  Clock,
  FileText,
  Link as LinkIcon,
  Plus,
  Trash2,
  Loader2,
  Edit,
  ExternalLink,
  MapPin,
  Info,
} from 'lucide-react'
import { toast } from '@/lib/toast'

interface PorosResourcesProps {
  eventId: string
  eventStartDate?: string
  eventEndDate?: string
}

interface Resource {
  id: string
  name: string
  type: string
  url: string
}

interface ScheduleEntry {
  id: string
  day: string
  startTime: string
  endTime: string | null
  title: string
  location: string | null
}

export function PorosResources({ eventId, eventStartDate, eventEndDate }: PorosResourcesProps) {
  const [resources, setResources] = useState<Resource[]>([])
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Dialog states
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false)
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)

  // Form states
  const [editingResource, setEditingResource] = useState<Resource | null>(null)
  const [editingSchedule, setEditingSchedule] = useState<ScheduleEntry | null>(null)

  // New item form data
  const [newResource, setNewResource] = useState({ name: '', type: 'link', url: '' })
  const [newSchedule, setNewSchedule] = useState({ day: 'day1', startTime: '', endTime: '', title: '', location: '' })

  // Generate days based on event dates
  const getDays = () => {
    if (!eventStartDate || !eventEndDate) {
      return ['day1', 'day2', 'day3']
    }
    const start = new Date(eventStartDate)
    const end = new Date(eventEndDate)
    const days: string[] = []
    let current = new Date(start)
    let dayNum = 1
    while (current <= end) {
      days.push(`day${dayNum}`)
      current.setDate(current.getDate() + 1)
      dayNum++
    }
    return days.length > 0 ? days : ['day1', 'day2', 'day3']
  }

  const days = getDays()

  useEffect(() => {
    fetchData()
  }, [eventId])

  async function fetchData() {
    setLoading(true)
    try {
      const [resourcesRes, scheduleRes] = await Promise.all([
        fetch(`/api/admin/events/${eventId}/poros/resources`),
        fetch(`/api/admin/events/${eventId}/poros/schedule`),
      ])

      if (resourcesRes.ok) {
        const data = await resourcesRes.json()
        setResources(data.resources || [])
      }

      if (scheduleRes.ok) {
        const data = await scheduleRes.json()
        setScheduleEntries(data.schedule || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Resource functions
  async function saveResource() {
    setSaving(true)
    try {
      const data = editingResource || newResource
      const method = editingResource ? 'PUT' : 'POST'
      const url = editingResource
        ? `/api/admin/events/${eventId}/poros/resources/${editingResource.id}`
        : `/api/admin/events/${eventId}/poros/resources`

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error('Failed to save resource')

      toast.success(editingResource ? 'Resource updated' : 'Resource added')
      setResourceDialogOpen(false)
      setEditingResource(null)
      setNewResource({ name: '', type: 'link', url: '' })
      fetchData()
    } catch (error) {
      toast.error('Failed to save resource')
    } finally {
      setSaving(false)
    }
  }

  async function deleteResource(id: string) {
    try {
      const response = await fetch(`/api/admin/events/${eventId}/poros/resources/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete')
      toast.success('Resource deleted')
      fetchData()
    } catch (error) {
      toast.error('Failed to delete resource')
    }
  }

  // Schedule functions
  async function saveScheduleEntry() {
    setSaving(true)
    try {
      const data = editingSchedule || newSchedule
      const method = editingSchedule ? 'PUT' : 'POST'
      const url = editingSchedule
        ? `/api/admin/events/${eventId}/poros/schedule/${editingSchedule.id}`
        : `/api/admin/events/${eventId}/poros/schedule`

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error('Failed to save schedule entry')

      toast.success(editingSchedule ? 'Schedule updated' : 'Schedule entry added')
      setScheduleDialogOpen(false)
      setEditingSchedule(null)
      setNewSchedule({ day: 'day1', startTime: '', endTime: '', title: '', location: '' })
      fetchData()
    } catch (error) {
      toast.error('Failed to save schedule entry')
    } finally {
      setSaving(false)
    }
  }

  async function deleteScheduleEntry(id: string) {
    try {
      const response = await fetch(`/api/admin/events/${eventId}/poros/schedule/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete')
      toast.success('Schedule entry deleted')
      fetchData()
    } catch (error) {
      toast.error('Failed to delete schedule entry')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">About Resources</p>
              <p>Resources and schedule entries you add here will be visible on the public portal for participants.</p>
              <p className="mt-1"><strong>Meal Times:</strong> Configure meal times in the <strong>Meal Groups</strong> tab - each color group has its own breakfast, lunch, and dinner times.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resources Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Resources
              </CardTitle>
              <CardDescription>
                Links and documents for participants (campus map, schedule PDF, etc.)
              </CardDescription>
            </div>
            <Button onClick={() => {
              setEditingResource(null)
              setNewResource({ name: '', type: 'link', url: '' })
              setResourceDialogOpen(true)
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Resource
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {resources.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No resources added yet. Add links to campus maps, schedules, or other documents.
            </p>
          ) : (
            <div className="space-y-3">
              {resources.map((resource) => (
                <div key={resource.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {resource.type === 'map' ? (
                      <MapPin className="w-5 h-5 text-blue-600" />
                    ) : resource.type === 'pdf' ? (
                      <FileText className="w-5 h-5 text-red-600" />
                    ) : (
                      <LinkIcon className="w-5 h-5 text-green-600" />
                    )}
                    <div>
                      <p className="font-medium">{resource.name}</p>
                      <p className="text-sm text-muted-foreground truncate max-w-md">{resource.url}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={resource.url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </a>
                    <Button variant="ghost" size="sm" onClick={() => {
                      setEditingResource(resource)
                      setResourceDialogOpen(true)
                    }}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteResource(resource.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Schedule
              </CardTitle>
              <CardDescription>
                Event schedule entries organized by day
              </CardDescription>
            </div>
            <Button onClick={() => {
              setEditingSchedule(null)
              setNewSchedule({ day: days[0] || 'day1', startTime: '', endTime: '', title: '', location: '' })
              setScheduleDialogOpen(true)
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Entry
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {scheduleEntries.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No schedule entries added yet.
            </p>
          ) : (
            <div className="space-y-6">
              {days.map((day) => {
                const dayEntries = scheduleEntries.filter(e => e.day === day)
                if (dayEntries.length === 0) return null
                return (
                  <div key={day}>
                    <h4 className="font-semibold text-lg mb-3 capitalize">{day.replace('day', 'Day ')}</h4>
                    <div className="space-y-2">
                      {dayEntries.sort((a, b) => a.startTime.localeCompare(b.startTime)).map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-4">
                            <Badge variant="outline" className="font-mono">
                              {entry.startTime}{entry.endTime && ` - ${entry.endTime}`}
                            </Badge>
                            <div>
                              <p className="font-medium">{entry.title}</p>
                              {entry.location && (
                                <p className="text-sm text-muted-foreground">{entry.location}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => {
                              setEditingSchedule(entry)
                              setScheduleDialogOpen(true)
                            }}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteScheduleEntry(entry.id)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resource Dialog */}
      <Dialog open={resourceDialogOpen} onOpenChange={setResourceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingResource ? 'Edit Resource' : 'Add Resource'}</DialogTitle>
            <DialogDescription>
              Add a link or document for participants
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={editingResource?.name || newResource.name}
                onChange={(e) => editingResource
                  ? setEditingResource({ ...editingResource, name: e.target.value })
                  : setNewResource({ ...newResource, name: e.target.value })
                }
                placeholder="e.g., Campus Map"
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select
                value={editingResource?.type || newResource.type}
                onValueChange={(value) => editingResource
                  ? setEditingResource({ ...editingResource, type: value })
                  : setNewResource({ ...newResource, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="link">Link</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="map">Map</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>URL</Label>
              <Input
                value={editingResource?.url || newResource.url}
                onChange={(e) => editingResource
                  ? setEditingResource({ ...editingResource, url: e.target.value })
                  : setNewResource({ ...newResource, url: e.target.value })
                }
                placeholder="https://..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResourceDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveResource} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSchedule ? 'Edit Schedule Entry' : 'Add Schedule Entry'}</DialogTitle>
            <DialogDescription>
              Add an event to the schedule
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Day</Label>
              <Select
                value={editingSchedule?.day || newSchedule.day}
                onValueChange={(value) => editingSchedule
                  ? setEditingSchedule({ ...editingSchedule, day: value })
                  : setNewSchedule({ ...newSchedule, day: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {days.map((day) => (
                    <SelectItem key={day} value={day}>{day.replace('day', 'Day ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={editingSchedule?.startTime || newSchedule.startTime}
                  onChange={(e) => editingSchedule
                    ? setEditingSchedule({ ...editingSchedule, startTime: e.target.value })
                    : setNewSchedule({ ...newSchedule, startTime: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>End Time (optional)</Label>
                <Input
                  type="time"
                  value={editingSchedule?.endTime || newSchedule.endTime}
                  onChange={(e) => editingSchedule
                    ? setEditingSchedule({ ...editingSchedule, endTime: e.target.value })
                    : setNewSchedule({ ...newSchedule, endTime: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Title</Label>
              <Input
                value={editingSchedule?.title || newSchedule.title}
                onChange={(e) => editingSchedule
                  ? setEditingSchedule({ ...editingSchedule, title: e.target.value })
                  : setNewSchedule({ ...newSchedule, title: e.target.value })
                }
                placeholder="e.g., Opening Mass"
              />
            </div>
            <div>
              <Label>Location (optional)</Label>
              <Input
                value={editingSchedule?.location || newSchedule.location}
                onChange={(e) => editingSchedule
                  ? setEditingSchedule({ ...editingSchedule, location: e.target.value })
                  : setNewSchedule({ ...newSchedule, location: e.target.value })
                }
                placeholder="e.g., Main Chapel"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveScheduleEntry} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
