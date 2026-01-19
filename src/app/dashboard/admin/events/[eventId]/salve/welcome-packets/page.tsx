'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Printer,
  Settings,
  Eye,
  Loader2,
  Users,
  FileText,
  Plus,
  Trash2,
  GripVertical,
  Calendar,
  Map,
  Phone,
  Home,
  Upload,
  File,
  ExternalLink,
} from 'lucide-react'
import { toast } from '@/lib/toast'
import { generateMultiplePacketsHTML, type PacketData, type PrintSettings } from '@/lib/welcome-packet-print'

interface PacketSettings {
  includeSchedule: boolean
  includeMap: boolean
  includeRoster: boolean
  includeHousingAssignments: boolean
  includeEmergencyContacts: boolean
  includeInvoice: boolean
}

interface MissingResources {
  campusMap: boolean
  mealSchedule: boolean
  eventSchedule: boolean
  emergencyProcedures: boolean
}

interface PacketInsert {
  id: string
  name: string
  fileUrl: string
  fileType: 'pdf' | 'image'
  imageUrls: string[] | null
  displayOrder: number
  isActive: boolean
}

interface GroupData {
  id: string
  groupName: string
  diocese: string | null
  participantCount: number
}

interface PacketPreview {
  event: {
    name: string
    organizationName: string
    logoUrl: string | null
    dates: string
  }
  group: {
    id: string
    name: string
    diocese: string | null
    accessCode: string
    contactEmail: string
    contactPhone: string
  }
  mealColor: {
    name: string
    colorHex: string
    saturdayBreakfast: string | null
    saturdayLunch: string | null
    saturdayDinner: string | null
    sundayBreakfast: string | null
  } | null
  smallGroup: {
    sgl: string | null
    religious: string | null
    meetingRoom: string | null
  } | null
  participants: {
    total: number
    youth: number
    chaperones: number
    clergy: number
    list: any[]
  }
  housing: {
    totalRooms: number
    summary: any[]
  }
  inserts: any[]
}

const DEFAULT_SETTINGS: PacketSettings = {
  includeSchedule: true,
  includeMap: true,
  includeRoster: true,
  includeHousingAssignments: true,
  includeEmergencyContacts: true,
  includeInvoice: false,
}

// Sortable insert item component
function SortableInsertItem({
  insert,
  onDelete,
  onToggleActive,
}: {
  insert: PacketInsert
  onDelete: (id: string) => void
  onToggleActive: (id: string, isActive: boolean) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: insert.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-3 rounded-lg border bg-white ${
        isDragging ? 'shadow-lg' : ''
      } ${!insert.isActive ? 'opacity-60' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <File className="w-4 h-4 text-navy" />
          <span className="font-medium truncate">{insert.name}</span>
        </div>
        {insert.fileUrl && (
          <a
            href={insert.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gold hover:underline flex items-center gap-1 mt-1"
          >
            <ExternalLink className="w-3 h-3" />
            View PDF
          </a>
        )}
      </div>

      <Switch
        checked={insert.isActive}
        onCheckedChange={(checked) => onToggleActive(insert.id, checked)}
      />

      <Button
        size="sm"
        variant="ghost"
        onClick={() => onDelete(insert.id)}
        className="text-red-500 hover:text-red-700 hover:bg-red-50"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  )
}

export default function WelcomePacketsPage() {
  const params = useParams()
  const { getToken } = useAuth()
  const eventId = params.eventId as string

  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [eventName, setEventName] = useState('')
  const [settings, setSettings] = useState<PacketSettings>(DEFAULT_SETTINGS)
  const [inserts, setInserts] = useState<PacketInsert[]>([])
  const [groups, setGroups] = useState<GroupData[]>([])
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [previewData, setPreviewData] = useState<PacketPreview | null>(null)
  const [isAddInsertModalOpen, setIsAddInsertModalOpen] = useState(false)
  const [newInsertName, setNewInsertName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [missingResources, setMissingResources] = useState<MissingResources>({
    campusMap: true,
    mealSchedule: true,
    eventSchedule: true,
    emergencyProcedures: true,
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    fetchData()
  }, [eventId])

  async function fetchData() {
    setLoading(true)
    try {
      const token = await getToken()
      const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {}

      const [eventRes, groupsRes, insertsRes, packetRes] = await Promise.all([
        fetch(`/api/admin/events/${eventId}`, { headers }),
        fetch(`/api/admin/events/${eventId}/groups`, { headers }),
        fetch(`/api/admin/events/${eventId}/salve/inserts`, { headers }),
        fetch(`/api/admin/events/${eventId}/salve/generate-packet`, { headers }),
      ])

      if (eventRes.ok) {
        const eventData = await eventRes.json()
        setEventName(eventData.name || 'Event')
      }

      if (groupsRes.ok) {
        const groupsData = await groupsRes.json()
        setGroups(groupsData.map((g: any) => ({
          id: g.id,
          groupName: g.groupName,
          diocese: g.diocese,
          participantCount: g._count?.participants || g.participantCount || 0,
        })))
      }

      if (insertsRes.ok) {
        const insertsData = await insertsRes.json()
        setInserts(insertsData.inserts || [])
      }

      if (packetRes.ok) {
        const packetData = await packetRes.json()
        if (packetData.missingResources) {
          setMissingResources(packetData.missingResources)
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  function updateSettings(key: keyof PacketSettings, value: boolean) {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  function toggleGroup(groupId: string) {
    setSelectedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  function selectAllGroups() {
    setSelectedGroups(new Set(groups.map((g) => g.id)))
  }

  function deselectAllGroups() {
    setSelectedGroups(new Set())
  }

  // File drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingFile(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingFile(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingFile(false)

    const file = e.dataTransfer.files[0]
    const isPdf = file?.type === 'application/pdf'
    const isImage = file?.type.startsWith('image/')

    if (file && (isPdf || isImage)) {
      setSelectedFile(file)
      // Use filename without extension as default name
      if (!newInsertName) {
        const nameWithoutExt = file.name.replace(/\.(pdf|png|jpg|jpeg|webp)$/i, '')
        setNewInsertName(nameWithoutExt)
      }
    } else {
      toast.error('Only PDF and image files (PNG, JPG, WEBP) are accepted')
    }
  }, [newInsertName])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const isPdf = file.type === 'application/pdf'
      const isImage = file.type.startsWith('image/')

      if (isPdf || isImage) {
        setSelectedFile(file)
        if (!newInsertName) {
          const nameWithoutExt = file.name.replace(/\.(pdf|png|jpg|jpeg|webp)$/i, '')
          setNewInsertName(nameWithoutExt)
        }
      } else {
        toast.error('Only PDF and image files (PNG, JPG, WEBP) are accepted')
      }
    }
  }

  async function handleUploadInsert() {
    if (!newInsertName.trim()) {
      toast.error('Name is required')
      return
    }

    if (!selectedFile) {
      toast.error('Please select a PDF file')
      return
    }

    setUploading(true)
    try {
      const token = await getToken()
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('name', newInsertName.trim())

      const response = await fetch(`/api/admin/events/${eventId}/salve/inserts`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setInserts((prev) => [...prev, data.insert])
        setNewInsertName('')
        setSelectedFile(null)
        setIsAddInsertModalOpen(false)
        toast.success('Insert uploaded successfully')
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to upload insert')
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload insert')
    } finally {
      setUploading(false)
    }
  }

  async function handleDeleteInsert(id: string) {
    try {
      const token = await getToken()
      const response = await fetch(
        `/api/admin/events/${eventId}/salve/inserts?id=${id}`,
        {
          method: 'DELETE',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        }
      )

      if (response.ok) {
        setInserts((prev) => prev.filter((i) => i.id !== id))
        toast.success('Insert deleted')
      } else {
        toast.error('Failed to delete insert')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete insert')
    }
  }

  async function handleToggleActive(id: string, isActive: boolean) {
    try {
      const token = await getToken()
      const response = await fetch(`/api/admin/events/${eventId}/salve/inserts`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ insertId: id, isActive }),
      })

      if (response.ok) {
        setInserts((prev) =>
          prev.map((i) => (i.id === id ? { ...i, isActive } : i))
        )
      } else {
        toast.error('Failed to update insert')
      }
    } catch (error) {
      console.error('Toggle error:', error)
      toast.error('Failed to update insert')
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = inserts.findIndex((i) => i.id === active.id)
      const newIndex = inserts.findIndex((i) => i.id === over.id)

      const reordered = arrayMove(inserts, oldIndex, newIndex)
      setInserts(reordered)

      // Update order in database
      try {
        const token = await getToken()
        await fetch(`/api/admin/events/${eventId}/salve/inserts`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            inserts: reordered.map((insert, index) => ({
              id: insert.id,
              displayOrder: index,
            })),
          }),
        })
      } catch (error) {
        console.error('Reorder error:', error)
        toast.error('Failed to save order')
      }
    }
  }

  async function handlePreview() {
    if (selectedGroups.size === 0) {
      toast.error('Please select at least one group')
      return
    }

    setGenerating(true)
    try {
      const token = await getToken()
      const firstGroupId = Array.from(selectedGroups)[0]
      const response = await fetch(`/api/admin/events/${eventId}/salve/generate-packet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ groupId: firstGroupId }),
      })

      if (response.ok) {
        const data = await response.json()
        setPreviewData(data)
        setIsPreviewModalOpen(true)
      } else {
        toast.error('Failed to generate preview')
      }
    } catch (error) {
      console.error('Preview error:', error)
      toast.error('Failed to generate preview')
    } finally {
      setGenerating(false)
    }
  }

  async function handleGenerateAndPrint() {
    if (selectedGroups.size === 0) {
      toast.error('Please select at least one group')
      return
    }

    setGenerating(true)
    try {
      const token = await getToken()
      const allPackets = []

      for (const groupId of Array.from(selectedGroups)) {
        const response = await fetch(`/api/admin/events/${eventId}/salve/generate-packet`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ groupId }),
        })

        if (response.ok) {
          const data = await response.json()
          allPackets.push(data)
        }
      }

      toast.success(`Generated ${allPackets.length} welcome packets. Opening print dialog...`)

      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(generatePrintableHTML(allPackets, settings))
        printWindow.document.close()
        printWindow.print()
      }
    } catch (error) {
      console.error('Generate error:', error)
      toast.error('Failed to generate packets')
    } finally {
      setGenerating(false)
    }
  }

  function generatePrintableHTML(packets: any[], settings: PacketSettings): string {
    // Get active inserts that have images (can be embedded directly)
    const activeInserts = inserts.filter(i => i.isActive)

    // Convert to the shared PacketData format
    const packetData: PacketData[] = packets.map(packet => ({
      event: {
        name: packet.event?.name || 'Event',
        organizationName: packet.event?.organizationName,
        logoUrl: packet.event?.logoUrl,
      },
      group: {
        id: packet.group?.id || '',
        name: packet.group?.name || 'Group',
        diocese: packet.group?.diocese,
        accessCode: packet.group?.accessCode || '',
        contactEmail: packet.group?.contactEmail,
        contactPhone: packet.group?.contactPhone,
      },
      mealColor: packet.mealColor,
      smallGroup: packet.smallGroup,
      participants: {
        total: packet.participants?.total || 0,
        youth: packet.participants?.youth || 0,
        chaperones: packet.participants?.chaperones || 0,
        clergy: packet.participants?.clergy || 0,
        list: packet.participants?.list || [],
      },
      housing: {
        totalRooms: packet.housing?.totalRooms || 0,
        summary: packet.housing?.summary || [],
      },
      resources: packet.resources,
      inserts: packet.inserts,
      invoice: packet.invoice,
    }))

    // Convert settings to the shared PrintSettings format
    const printSettings: PrintSettings = {
      includeSchedule: settings.includeSchedule,
      includeMap: settings.includeMap,
      includeRoster: settings.includeRoster,
      includeHousingAssignments: settings.includeHousingAssignments,
      includeHousingColumn: settings.includeHousingAssignments,
      includeEmergencyContacts: settings.includeEmergencyContacts,
      includeInvoice: settings.includeInvoice,
    }

    return generateMultiplePacketsHTML(packetData, printSettings, activeInserts)
  }

  const selectedCount = selectedGroups.size
  const activeInserts = inserts.filter((i) => i.isActive)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-navy" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/dashboard/admin" className="hover:text-navy">Dashboard</Link>
          <span>/</span>
          <Link href="/dashboard/admin/events" className="hover:text-navy">Events</Link>
          <span>/</span>
          <Link href={`/dashboard/admin/events/${eventId}`} className="hover:text-navy">{eventName}</Link>
          <span>/</span>
          <Link href={`/dashboard/admin/events/${eventId}/salve`} className="hover:text-navy">SALVE</Link>
          <span>/</span>
          <span className="text-navy font-medium">Welcome Packets</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-navy">Welcome Packets</h1>
            <p className="text-muted-foreground">Generate and print welcome packets for {eventName}</p>
          </div>

          <div className="flex gap-2">
            <Link href={`/dashboard/admin/events/${eventId}/salve`}>
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Check-In
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Missing Resources Warning */}
      {(missingResources.campusMap || missingResources.mealSchedule || missingResources.eventSchedule) && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700 font-medium">
                Missing Resources
              </p>
              <ul className="list-disc list-inside text-sm text-yellow-700 mt-2">
                {missingResources.campusMap && <li>Campus map not uploaded</li>}
                {missingResources.mealSchedule && <li>Meal schedule not configured</li>}
                {missingResources.eventSchedule && <li>Event schedule not added</li>}
              </ul>
              <p className="text-sm text-yellow-700 mt-2">
                <Link
                  href={`/dashboard/admin/events/${eventId}/poros`}
                  className="underline font-medium hover:text-yellow-800"
                >
                  Go to Poros Portal to add these resources
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Packet Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Packet Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label>Include Sections</Label>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="includeSchedule"
                  checked={settings.includeSchedule}
                  onCheckedChange={(checked) => updateSettings('includeSchedule', !!checked)}
                />
                <Label htmlFor="includeSchedule" className="font-normal flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Event Schedule
                  {missingResources.eventSchedule && <span className="text-yellow-600 text-xs">(not configured)</span>}
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="includeMap"
                  checked={settings.includeMap}
                  onCheckedChange={(checked) => updateSettings('includeMap', !!checked)}
                />
                <Label htmlFor="includeMap" className="font-normal flex items-center gap-2">
                  <Map className="w-4 h-4" />
                  Campus Map
                  {missingResources.campusMap && <span className="text-yellow-600 text-xs">(not uploaded)</span>}
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="includeRoster"
                  checked={settings.includeRoster}
                  onCheckedChange={(checked) => updateSettings('includeRoster', !!checked)}
                />
                <Label htmlFor="includeRoster" className="font-normal flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Participant Roster
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="includeHousingAssignments"
                  checked={settings.includeHousingAssignments}
                  onCheckedChange={(checked) => updateSettings('includeHousingAssignments', !!checked)}
                />
                <Label htmlFor="includeHousingAssignments" className="font-normal flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Housing Assignments
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="includeEmergencyContacts"
                  checked={settings.includeEmergencyContacts}
                  onCheckedChange={(checked) => updateSettings('includeEmergencyContacts', !!checked)}
                />
                <Label htmlFor="includeEmergencyContacts" className="font-normal flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Emergency Contacts
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="includeInvoice"
                  checked={settings.includeInvoice}
                  onCheckedChange={(checked) => updateSettings('includeInvoice', !!checked)}
                />
                <Label htmlFor="includeInvoice" className="font-normal flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Invoice / Payment Summary
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Custom Inserts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              PDF Inserts
              {activeInserts.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeInserts.length} active
                </Badge>
              )}
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setIsAddInsertModalOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Upload
            </Button>
          </CardHeader>
          <CardContent>
            {inserts.length === 0 ? (
              <div className="text-center py-8">
                <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-3">No PDF inserts uploaded yet</p>
                <Button variant="outline" onClick={() => setIsAddInsertModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Upload PDF
                </Button>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={inserts.map((i) => i.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {inserts.map((insert) => (
                      <SortableInsertItem
                        key={insert.id}
                        insert={insert}
                        onDelete={handleDeleteInsert}
                        onToggleActive={handleToggleActive}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {inserts.length > 0 && (
              <p className="text-xs text-muted-foreground mt-4 text-center">
                Drag to reorder. Toggle to include/exclude from packets.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Group Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Select Groups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Button variant="outline" size="sm" onClick={selectAllGroups}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAllGroups}>
                Deselect All
              </Button>
            </div>

            <ScrollArea className="h-[250px]">
              <div className="space-y-2">
                {groups.map((group) => (
                  <label
                    key={group.id}
                    className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                      selectedGroups.has(group.id)
                        ? 'bg-navy/5 border-navy'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <Checkbox
                      checked={selectedGroups.has(group.id)}
                      onCheckedChange={() => toggleGroup(group.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{group.groupName}</div>
                      {group.diocese && (
                        <div className="text-xs text-muted-foreground truncate">
                          {group.diocese}
                        </div>
                      )}
                    </div>
                    <Badge variant="secondary">{group.participantCount}</Badge>
                  </label>
                ))}
              </div>
            </ScrollArea>

            <div className="mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground mb-4">
                <strong>{selectedCount}</strong> groups selected
              </div>

              <div className="space-y-2">
                <Button
                  className="w-full"
                  onClick={handlePreview}
                  disabled={generating || selectedCount === 0}
                  variant="outline"
                >
                  {generating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Eye className="w-4 h-4 mr-2" />
                  )}
                  Preview Packet
                </Button>

                <Button
                  className="w-full"
                  onClick={handleGenerateAndPrint}
                  disabled={generating || selectedCount === 0}
                >
                  {generating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Printer className="w-4 h-4 mr-2" />
                  )}
                  Generate & Print ({selectedCount})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upload Insert Modal */}
      <Dialog open={isAddInsertModalOpen} onOpenChange={setIsAddInsertModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Insert</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="insertName">Insert Name</Label>
              <Input
                id="insertName"
                placeholder="e.g., Campus Map, Event Schedule"
                value={newInsertName}
                onChange={(e) => setNewInsertName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>File</Label>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDraggingFile
                    ? 'border-navy bg-navy/5'
                    : selectedFile
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <File className="w-8 h-8 text-green-600" />
                    <div className="text-left">
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFile(null)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground mb-2">
                      Drag and drop a file here, or
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Browse Files
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,application/pdf,image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <p className="text-xs text-muted-foreground mt-3">
                      Images (PNG, JPG, WEBP) recommended for easy printing. PDFs also accepted.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddInsertModalOpen(false)
                setNewInsertName('')
                setSelectedFile(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUploadInsert}
              disabled={uploading || !selectedFile || !newInsertName.trim()}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Insert
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Welcome Packet Preview</DialogTitle>
          </DialogHeader>

          {previewData && (
            <div className="py-4 space-y-6">
              <div className="text-center border-b-2 border-gold pb-4">
                <h2 className="text-2xl font-bold text-navy">{previewData.event.name}</h2>
                <p className="text-gold">{previewData.event.organizationName}</p>
              </div>

              <div className="bg-beige p-4 rounded-lg text-center">
                <h3 className="text-xl font-semibold">Salve!</h3>
                <p className="text-muted-foreground">Welcome to {previewData.event.name}</p>
              </div>

              <div className="text-center">
                <h3 className="text-xl font-bold text-navy">{previewData.group.name}</h3>
                {previewData.group.diocese && (
                  <p className="text-muted-foreground">{previewData.group.diocese}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Access Code:</strong> {previewData.group.accessCode}</div>
                <div><strong>Contact Email:</strong> {previewData.group.contactEmail}</div>
                <div><strong>Total Participants:</strong> {previewData.participants.total}</div>
                <div>
                  <strong>Breakdown:</strong> {previewData.participants.youth} Youth,{' '}
                  {previewData.participants.chaperones} Chaperones,{' '}
                  {previewData.participants.clergy} Clergy
                </div>
              </div>

              {/* Meal Color */}
              {previewData.mealColor && (
                <div className="p-4 rounded-lg border-l-4" style={{ borderLeftColor: previewData.mealColor.colorHex, backgroundColor: `${previewData.mealColor.colorHex}10` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full" style={{ backgroundColor: previewData.mealColor.colorHex }} />
                    <strong>Meal Color: {previewData.mealColor.name}</strong>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Saturday</strong>
                      {previewData.mealColor.saturdayBreakfast && <p>Breakfast: {previewData.mealColor.saturdayBreakfast}</p>}
                      {previewData.mealColor.saturdayLunch && <p>Lunch: {previewData.mealColor.saturdayLunch}</p>}
                      {previewData.mealColor.saturdayDinner && <p>Dinner: {previewData.mealColor.saturdayDinner}</p>}
                    </div>
                    <div>
                      <strong>Sunday</strong>
                      {previewData.mealColor.sundayBreakfast && <p>Breakfast: {previewData.mealColor.sundayBreakfast}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* Small Group */}
              {previewData.smallGroup && (previewData.smallGroup.sgl || previewData.smallGroup.religious || previewData.smallGroup.meetingRoom) && (
                <div className="p-4 rounded-lg bg-beige">
                  <strong className="text-navy">Small Group</strong>
                  <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                    {previewData.smallGroup.sgl && <div><strong>SGL:</strong> {previewData.smallGroup.sgl}</div>}
                    {previewData.smallGroup.religious && <div><strong>Religious:</strong> {previewData.smallGroup.religious}</div>}
                    {previewData.smallGroup.meetingRoom && <div className="col-span-2"><strong>Meeting Room:</strong> {previewData.smallGroup.meetingRoom}</div>}
                  </div>
                </div>
              )}

              {settings.includeRoster && (
                <div>
                  <h4 className="font-semibold text-gold border-b pb-2 mb-2">Participant Roster</h4>
                  <div className="max-h-[200px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-beige sticky top-0">
                        <tr>
                          <th className="text-left p-2">Name</th>
                          <th className="text-left p-2">Type</th>
                          {settings.includeHousingAssignments && (
                            <th className="text-left p-2">Housing</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.participants.list.map((p: any, i: number) => (
                          <tr key={i} className="border-b">
                            <td className="p-2">{p.name}</td>
                            <td className="p-2">
                              {p.isClergy ? 'Clergy' : p.isChaperone ? 'Chaperone' : 'Youth'}
                            </td>
                            {settings.includeHousingAssignments && (
                              <td className="p-2">
                                {p.housing
                                  ? `${p.housing.building} ${p.housing.room}${p.housing.bed ? ` - Bed ${p.housing.bed}` : ''}`
                                  : 'TBD'}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeInserts.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gold border-b pb-2 mb-2">PDF Inserts</h4>
                  <div className="space-y-2">
                    {activeInserts.map((insert) => (
                      <div key={insert.id} className="flex items-center gap-2 p-2 bg-beige rounded">
                        <File className="w-4 h-4 text-navy" />
                        <span>{insert.name}</span>
                        {insert.fileUrl && (
                          <a
                            href={insert.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gold hover:underline text-sm ml-auto"
                          >
                            View PDF
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewModalOpen(false)}>
              Close
            </Button>
            <Button onClick={handleGenerateAndPrint} disabled={generating}>
              {generating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Printer className="w-4 h-4 mr-2" />
              )}
              Print All ({selectedCount})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
