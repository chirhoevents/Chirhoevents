'use client'

import { useState, useEffect, useRef } from 'react'
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
  Download,
  Upload,
  Megaphone,
  AlertTriangle,
  AlertCircle,
  Bell,
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
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

interface Announcement {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'urgent'
  startDate: string | null
  endDate: string | null
  isActive: boolean
}

export function PorosResources({ eventId, eventStartDate, eventEndDate }: PorosResourcesProps) {
  const [resources, setResources] = useState<Resource[]>([])
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Dialog states
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false)
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [announcementDialogOpen, setAnnouncementDialogOpen] = useState(false)

  // Form states
  const [editingResource, setEditingResource] = useState<Resource | null>(null)
  const [editingSchedule, setEditingSchedule] = useState<ScheduleEntry | null>(null)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)

  // New item form data
  const [newResource, setNewResource] = useState({ name: '', type: 'link', url: '' })
  const [newSchedule, setNewSchedule] = useState({ day: 'day1', startTime: '', endTime: '', title: '', location: '' })
  const [newAnnouncement, setNewAnnouncement] = useState<{ title: string; message: string; type: 'info' | 'warning' | 'urgent'; startDate: string; endDate: string; isActive: boolean }>({ title: '', message: '', type: 'info', startDate: '', endDate: '', isActive: true })

  // Schedule import
  const [importing, setImporting] = useState(false)
  const scheduleFileInputRef = useRef<HTMLInputElement>(null)

  // Common day names for events
  const DAY_NAMES: Record<string, string> = {
    'friday': 'Friday',
    'saturday': 'Saturday',
    'sunday': 'Sunday',
    'monday': 'Monday',
    'tuesday': 'Tuesday',
    'wednesday': 'Wednesday',
    'thursday': 'Thursday',
    'day1': 'Day 1',
    'day2': 'Day 2',
    'day3': 'Day 3',
    'day4': 'Day 4',
    'day5': 'Day 5',
  }

  // Get display name for a day
  const getDayDisplayName = (day: string) => {
    return DAY_NAMES[day.toLowerCase()] || day.charAt(0).toUpperCase() + day.slice(1)
  }

  // Generate days based on event dates OR from existing schedule entries
  const getDays = () => {
    // First check if we have schedule entries with specific days
    const existingDays = new Set(scheduleEntries.map(e => e.day.toLowerCase()))

    // Common day order for sorting
    const dayOrder = ['friday', 'saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'day1', 'day2', 'day3', 'day4', 'day5']

    if (existingDays.size > 0) {
      // Use the days from existing entries, sorted properly
      return Array.from(existingDays).sort((a, b) => {
        const aIndex = dayOrder.indexOf(a)
        const bIndex = dayOrder.indexOf(b)
        if (aIndex === -1 && bIndex === -1) return a.localeCompare(b)
        if (aIndex === -1) return 1
        if (bIndex === -1) return -1
        return aIndex - bIndex
      })
    }

    // Fall back to generating days from event dates
    if (!eventStartDate || !eventEndDate) {
      return ['friday', 'saturday', 'sunday']
    }
    const start = new Date(eventStartDate)
    const end = new Date(eventEndDate)
    const days: string[] = []
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    let current = new Date(start)
    while (current <= end) {
      days.push(dayNames[current.getDay()])
      current.setDate(current.getDate() + 1)
    }
    return days.length > 0 ? days : ['friday', 'saturday', 'sunday']
  }

  const days = getDays()

  useEffect(() => {
    fetchData()
  }, [eventId])

  async function fetchData() {
    setLoading(true)
    try {
      const [resourcesRes, scheduleRes, announcementsRes] = await Promise.all([
        fetch(`/api/admin/events/${eventId}/poros/resources`),
        fetch(`/api/admin/events/${eventId}/poros/schedule`),
        fetch(`/api/admin/events/${eventId}/poros/announcements`),
      ])

      if (resourcesRes.ok) {
        const data = await resourcesRes.json()
        setResources(data.resources || [])
      }

      if (scheduleRes.ok) {
        const data = await scheduleRes.json()
        setScheduleEntries(data.schedule || [])
      }

      if (announcementsRes.ok) {
        const data = await announcementsRes.json()
        setAnnouncements(data.announcements || [])
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

  // Announcement functions
  async function saveAnnouncement() {
    setSaving(true)
    try {
      const data = editingAnnouncement || newAnnouncement
      const method = editingAnnouncement ? 'PUT' : 'POST'
      const url = editingAnnouncement
        ? `/api/admin/events/${eventId}/poros/announcements/${editingAnnouncement.id}`
        : `/api/admin/events/${eventId}/poros/announcements`

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          startDate: data.startDate || null,
          endDate: data.endDate || null,
        }),
      })

      if (!response.ok) throw new Error('Failed to save announcement')

      toast.success(editingAnnouncement ? 'Announcement updated' : 'Announcement added')
      setAnnouncementDialogOpen(false)
      setEditingAnnouncement(null)
      setNewAnnouncement({ title: '', message: '', type: 'info', startDate: '', endDate: '', isActive: true })
      fetchData()
    } catch (error) {
      toast.error('Failed to save announcement')
    } finally {
      setSaving(false)
    }
  }

  async function deleteAnnouncement(id: string) {
    try {
      const response = await fetch(`/api/admin/events/${eventId}/poros/announcements/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete')
      toast.success('Announcement deleted')
      fetchData()
    } catch (error) {
      toast.error('Failed to delete announcement')
    }
  }

  async function toggleAnnouncementActive(announcement: Announcement) {
    try {
      const response = await fetch(`/api/admin/events/${eventId}/poros/announcements/${announcement.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !announcement.isActive }),
      })
      if (!response.ok) throw new Error('Failed to update')
      toast.success(announcement.isActive ? 'Announcement hidden' : 'Announcement shown')
      fetchData()
    } catch (error) {
      toast.error('Failed to update announcement')
    }
  }

  function getAnnouncementTypeIcon(type: string) {
    switch (type) {
      case 'urgent':
        return <AlertTriangle className="w-5 h-5 text-red-600" />
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-amber-600" />
      default:
        return <Bell className="w-5 h-5 text-blue-600" />
    }
  }

  function getAnnouncementTypeBadge(type: string) {
    switch (type) {
      case 'urgent':
        return <Badge variant="destructive">Urgent</Badge>
      case 'warning':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Warning</Badge>
      default:
        return <Badge variant="secondary">Info</Badge>
    }
  }

  // Download schedule CSV template
  function downloadScheduleTemplate() {
    const headers = ['day', 'start_time', 'end_time', 'title', 'location']
    const exampleRows = [
      ['friday', '5:00 PM', '6:30 PM', 'Arrival / Registration', 'Various'],
      ['friday', '7:00 PM', '8:00 PM', 'Opening Session', 'Main Hall'],
      ['friday', '8:30 PM', '9:30 PM', 'Holy Mass', 'Chapel'],
      ['saturday', '7:30 AM', '8:30 AM', 'Breakfast', 'Dining Hall'],
      ['saturday', '9:00 AM', '10:00 AM', 'Keynote Speaker', 'Main Hall'],
      ['saturday', '10:15 AM', '11:15 AM', 'Breakout Sessions', 'Various'],
      ['sunday', '8:00 AM', '9:00 AM', 'Breakfast', 'Dining Hall'],
      ['sunday', '10:00 AM', '11:30 AM', 'Closing Mass', 'Chapel'],
      ['sunday', '12:00 PM', '', 'Departure', 'All Exits'],
    ]

    const csvContent = [
      headers.join(','),
      ...exampleRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'schedule_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Import schedule from CSV
  async function handleScheduleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      const text = await file.text()
      // Handle different line endings and filter empty lines
      const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(line => line.trim())

      if (lines.length < 2) {
        throw new Error('CSV must have a header row and at least one data row')
      }

      // Better CSV parsing function that handles quoted fields
      function parseCSVLine(line: string): string[] {
        const result: string[] = []
        let current = ''
        let inQuotes = false

        for (let i = 0; i < line.length; i++) {
          const char = line[i]

          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim())
            current = ''
          } else {
            current += char
          }
        }
        result.push(current.trim())
        return result
      }

      // Parse header
      const header = parseCSVLine(lines[0]).map(h => h.toLowerCase())
      const dayIndex = header.findIndex(h => h === 'day')
      const startTimeIndex = header.findIndex(h => h === 'start_time' || h === 'starttime' || h === 'start time')
      const endTimeIndex = header.findIndex(h => h === 'end_time' || h === 'endtime' || h === 'end time')
      const titleIndex = header.findIndex(h => h === 'title' || h === 'event' || h === 'event_name')
      const locationIndex = header.findIndex(h => h === 'location')

      if (dayIndex === -1 || startTimeIndex === -1 || titleIndex === -1) {
        throw new Error(`CSV must have day, start_time, and title columns. Found columns: ${header.join(', ')}`)
      }

      // Parse data rows
      const entries = []
      const errors: string[] = []

      for (let i = 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i])

        const day = row[dayIndex] || ''
        const startTime = row[startTimeIndex] || ''
        const title = row[titleIndex] || ''

        // Skip empty rows
        if (!day && !startTime && !title) {
          continue
        }

        // Validate required fields
        if (!day || !startTime || !title) {
          errors.push(`Row ${i + 1}: Missing required field (day="${day}", start_time="${startTime}", title="${title}")`)
          continue
        }

        entries.push({
          day: day.toLowerCase(),
          startTime: startTime,
          endTime: endTimeIndex !== -1 && row[endTimeIndex] ? row[endTimeIndex] : null,
          title: title,
          location: locationIndex !== -1 && row[locationIndex] ? row[locationIndex] : null,
        })
      }

      if (entries.length === 0) {
        const errorMsg = errors.length > 0
          ? `No valid entries found. Errors:\n${errors.slice(0, 5).join('\n')}`
          : 'No valid entries found in CSV'
        throw new Error(errorMsg)
      }

      // Send to API
      const response = await fetch(`/api/admin/events/${eventId}/poros/schedule/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to import schedule')
      }

      const result = await response.json()

      if (errors.length > 0) {
        toast.success(`Imported ${result.count} entries (${errors.length} rows skipped)`)
      } else {
        toast.success(`Imported ${result.count} schedule entries`)
      }
      fetchData()
    } catch (error) {
      console.error('CSV import error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to import schedule')
    } finally {
      setImporting(false)
      if (scheduleFileInputRef.current) {
        scheduleFileInputRef.current.value = ''
      }
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
              <p>Resources, announcements, and schedule entries you add here will be visible on the public portal for participants.</p>
              <p className="mt-1"><strong>Meal Times:</strong> Configure meal times in the <strong>Meal Groups</strong> tab - each color group has its own breakfast, lunch, and dinner times.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Announcements Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="w-5 h-5" />
                Announcements
              </CardTitle>
              <CardDescription>
                Temporary notices and updates for participants (can be time-limited)
              </CardDescription>
            </div>
            <Button onClick={() => {
              setEditingAnnouncement(null)
              setNewAnnouncement({ title: '', message: '', type: 'info', startDate: '', endDate: '', isActive: true })
              setAnnouncementDialogOpen(true)
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Announcement
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {announcements.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No announcements added yet. Create one to notify participants of important updates.
            </p>
          ) : (
            <div className="space-y-3">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className={`flex items-start justify-between p-4 rounded-lg ${
                    !announcement.isActive ? 'bg-gray-100 opacity-60' :
                    announcement.type === 'urgent' ? 'bg-red-50 border border-red-200' :
                    announcement.type === 'warning' ? 'bg-amber-50 border border-amber-200' :
                    'bg-blue-50 border border-blue-200'
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1">
                    {getAnnouncementTypeIcon(announcement.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{announcement.title}</p>
                        {getAnnouncementTypeBadge(announcement.type)}
                        {!announcement.isActive && (
                          <Badge variant="outline" className="text-gray-500">Hidden</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{announcement.message}</p>
                      {(announcement.startDate || announcement.endDate) && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {announcement.startDate && `From: ${new Date(announcement.startDate).toLocaleDateString()}`}
                          {announcement.startDate && announcement.endDate && ' • '}
                          {announcement.endDate && `Until: ${new Date(announcement.endDate).toLocaleDateString()}`}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Switch
                      checked={announcement.isActive}
                      onCheckedChange={() => toggleAnnouncementActive(announcement)}
                      aria-label="Toggle announcement visibility"
                    />
                    <Button variant="ghost" size="sm" onClick={() => {
                      setEditingAnnouncement({
                        ...announcement,
                        startDate: announcement.startDate ? announcement.startDate.split('T')[0] : null,
                        endDate: announcement.endDate ? announcement.endDate.split('T')[0] : null,
                      })
                      setAnnouncementDialogOpen(true)
                    }}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteAnnouncement(announcement.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={downloadScheduleTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Template
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => scheduleFileInputRef.current?.click()}
                disabled={importing}
              >
                {importing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Import CSV
              </Button>
              <input
                type="file"
                ref={scheduleFileInputRef}
                onChange={handleScheduleImport}
                accept=".csv"
                className="hidden"
              />
              <Button onClick={() => {
                setEditingSchedule(null)
                setNewSchedule({ day: days[0] || 'day1', startTime: '', endTime: '', title: '', location: '' })
                setScheduleDialogOpen(true)
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Entry
              </Button>
            </div>
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
                    <h4 className="font-semibold text-lg mb-3">{getDayDisplayName(day)}</h4>
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
                    <SelectItem key={day} value={day}>{getDayDisplayName(day)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Input
                  value={editingSchedule?.startTime || newSchedule.startTime}
                  onChange={(e) => editingSchedule
                    ? setEditingSchedule({ ...editingSchedule, startTime: e.target.value })
                    : setNewSchedule({ ...newSchedule, startTime: e.target.value })
                  }
                  placeholder="e.g., 9:00 AM"
                />
              </div>
              <div>
                <Label>End Time (optional)</Label>
                <Input
                  value={editingSchedule?.endTime || newSchedule.endTime}
                  onChange={(e) => editingSchedule
                    ? setEditingSchedule({ ...editingSchedule, endTime: e.target.value })
                    : setNewSchedule({ ...newSchedule, endTime: e.target.value })
                  }
                  placeholder="e.g., 10:00 AM"
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

      {/* Announcement Dialog */}
      <Dialog open={announcementDialogOpen} onOpenChange={setAnnouncementDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAnnouncement ? 'Edit Announcement' : 'Add Announcement'}</DialogTitle>
            <DialogDescription>
              Create a notice for participants (e.g., schedule changes, reminders)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={editingAnnouncement?.title || newAnnouncement.title}
                onChange={(e) => editingAnnouncement
                  ? setEditingAnnouncement({ ...editingAnnouncement, title: e.target.value })
                  : setNewAnnouncement({ ...newAnnouncement, title: e.target.value })
                }
                placeholder="e.g., Schedule Change"
              />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea
                value={editingAnnouncement?.message || newAnnouncement.message}
                onChange={(e) => editingAnnouncement
                  ? setEditingAnnouncement({ ...editingAnnouncement, message: e.target.value })
                  : setNewAnnouncement({ ...newAnnouncement, message: e.target.value })
                }
                placeholder="Enter the announcement message..."
                rows={4}
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select
                value={editingAnnouncement?.type || newAnnouncement.type}
                onValueChange={(value: 'info' | 'warning' | 'urgent') => editingAnnouncement
                  ? setEditingAnnouncement({ ...editingAnnouncement, type: value })
                  : setNewAnnouncement({ ...newAnnouncement, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-blue-600" />
                      Info - General notice
                    </div>
                  </SelectItem>
                  <SelectItem value="warning">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      Warning - Important notice
                    </div>
                  </SelectItem>
                  <SelectItem value="urgent">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      Urgent - Critical notice
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date (optional)</Label>
                <Input
                  type="date"
                  value={editingAnnouncement?.startDate || newAnnouncement.startDate}
                  onChange={(e) => editingAnnouncement
                    ? setEditingAnnouncement({ ...editingAnnouncement, startDate: e.target.value })
                    : setNewAnnouncement({ ...newAnnouncement, startDate: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">When to start showing</p>
              </div>
              <div>
                <Label>End Date (optional)</Label>
                <Input
                  type="date"
                  value={editingAnnouncement?.endDate || newAnnouncement.endDate}
                  onChange={(e) => editingAnnouncement
                    ? setEditingAnnouncement({ ...editingAnnouncement, endDate: e.target.value })
                    : setNewAnnouncement({ ...newAnnouncement, endDate: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">When to stop showing</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={editingAnnouncement?.isActive ?? newAnnouncement.isActive}
                onCheckedChange={(checked) => editingAnnouncement
                  ? setEditingAnnouncement({ ...editingAnnouncement, isActive: checked })
                  : setNewAnnouncement({ ...newAnnouncement, isActive: checked })
                }
              />
              <Label htmlFor="isActive">Show on public portal</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnnouncementDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveAnnouncement} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
