'use client'

import { useState, useEffect, useRef, CSSProperties } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Save,
  Loader2,
  Users,
  Home,
  CreditCard,
  RefreshCw,
  Download,
  Upload,
  X,
  ExternalLink,
} from 'lucide-react'
import { toast } from '@/lib/toast'
import { openBadgePrintWindow } from '@/lib/badge-renderer'

interface NameTagTemplate {
  size: 'standard' | 'large' | 'small' | 'badge_4x6' | 'business_card' | 'thermal_4x12'
  showName: boolean
  showGroup: boolean
  showParticipantType: boolean
  showHousing: boolean
  showDiocese: boolean
  showMealColor: boolean
  showQrCode: boolean
  showConferenceHeader: boolean
  conferenceHeaderText: string
  showLogo: boolean
  logoUrl: string
  // 4x6 / 4x12 header banner (top 2.5 inches)
  showHeaderBanner: boolean
  headerBannerUrl: string
  backgroundColor: string
  textColor: string
  accentColor: string
  fontFamily: string
  fontSize: 'small' | 'medium' | 'large'
  // Thermal & schedule options
  thermalMode: boolean
  showBackPanel: boolean
  backPanelColorMode: 'color' | 'bw'
}

interface GroupData {
  id: string
  groupName: string
  diocese: string | null
  participantCount: number
}

interface NameTagPreview {
  participantId: string
  firstName: string
  lastName: string
  groupName: string
  diocese: string | null
  participantType: string
  isChaperone: boolean
  isClergy: boolean
  housing: {
    building: string
    room: string
    bed: string | null
    fullLocation: string
  } | null
  mealColor: {
    name: string
    hex: string
  } | null
  qrCode?: string // Base64 data URL of QR code
}

const DEFAULT_TEMPLATE: NameTagTemplate = {
  size: 'standard',
  showName: true,
  showGroup: true,
  showParticipantType: true,
  showHousing: true,
  showDiocese: false,
  showMealColor: false,
  showQrCode: true,
  showConferenceHeader: true,
  conferenceHeaderText: '',
  showLogo: false,
  logoUrl: '',
  showHeaderBanner: false,
  headerBannerUrl: '',
  backgroundColor: '#FFFFFF',
  textColor: '#1E3A5F',
  accentColor: '#9C8466',
  fontFamily: 'sans-serif',
  fontSize: 'medium',
  thermalMode: false,
  showBackPanel: true,
  backPanelColorMode: 'color',
}

export default function NameTagDesignerPage() {
  const params = useParams()
  const { getToken } = useAuth()
  const eventId = params.eventId as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [eventName, setEventName] = useState('')
  const [template, setTemplate] = useState<NameTagTemplate>(DEFAULT_TEMPLATE)
  const [groups, setGroups] = useState<GroupData[]>([])
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [previewData, setPreviewData] = useState<NameTagPreview[]>([])

  const [templateSavedAt, setTemplateSavedAt] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [scheduleCount, setScheduleCount] = useState<number | null>(null)
  const [scheduleEntries, setScheduleEntries] = useState<any[]>([])
  const logoInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchData()
  }, [eventId])

  async function fetchData() {
    setLoading(true)
    try {
      const token = await getToken()
      const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {}

      const [eventRes, groupsRes, templateRes, scheduleRes] = await Promise.all([
        fetch(`/api/admin/events/${eventId}`, { headers }),
        fetch(`/api/admin/events/${eventId}/groups`, { headers }),
        fetch(`/api/admin/events/${eventId}/salve/name-tag-template`, { headers }),
        fetch(`/api/admin/events/${eventId}/poros/schedule`, { headers }),
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

      // Load saved template if available
      if (templateRes.ok) {
        const templateData = await templateRes.json()
        if (templateData.template) {
          setTemplate(templateData.template)
        }
        if (templateData.savedAt) {
          setTemplateSavedAt(templateData.savedAt)
        }
      }

      // Load schedule entries (requires poros.access; silently skip if forbidden)
      if (scheduleRes.ok) {
        const scheduleData = await scheduleRes.json()
        const entries = scheduleData.schedule || []
        setScheduleCount(entries.length)
        setScheduleEntries(entries)
      } else {
        setScheduleCount(0)
        setScheduleEntries([])
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveTemplate() {
    setSaving(true)
    try {
      const token = await getToken()
      const response = await fetch(`/api/admin/events/${eventId}/salve/name-tag-template`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ template }),
      })

      if (response.ok) {
        const data = await response.json()
        setTemplateSavedAt(data.savedAt)
        toast.success('Template saved successfully')
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to save template')
      }
    } catch (error) {
      console.error('Save template error:', error)
      toast.error('Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  function updateTemplate(key: keyof NameTagTemplate, value: any) {
    setTemplate((prev) => ({ ...prev, [key]: value }))
  }

  async function handleLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingLogo(true)
    try {
      const token = await getToken()
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'logo')

      const response = await fetch(`/api/admin/events/${eventId}/salve/name-tag-image`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        updateTemplate('logoUrl', data.imageUrl)
        updateTemplate('showLogo', true)
        toast.success('Logo uploaded successfully')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to upload logo')
      }
    } catch (error) {
      console.error('Logo upload error:', error)
      toast.error('Failed to upload logo')
    } finally {
      setUploadingLogo(false)
      // Reset the input so the same file can be selected again
      if (logoInputRef.current) {
        logoInputRef.current.value = ''
      }
    }
  }

  async function handleDeleteLogo() {
    try {
      const token = await getToken()
      const response = await fetch(`/api/admin/events/${eventId}/salve/name-tag-image?type=logo`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })

      if (response.ok) {
        updateTemplate('logoUrl', '')
        toast.success('Logo deleted')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete logo')
      }
    } catch (error) {
      console.error('Logo delete error:', error)
      toast.error('Failed to delete logo')
    }
  }

  async function handleBannerUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingBanner(true)
    try {
      const token = await getToken()
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'background') // Using 'background' type for banner

      const response = await fetch(`/api/admin/events/${eventId}/salve/name-tag-image`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        updateTemplate('headerBannerUrl', data.imageUrl)
        updateTemplate('showHeaderBanner', true)
        toast.success('Header banner uploaded successfully')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to upload banner')
      }
    } catch (error) {
      console.error('Banner upload error:', error)
      toast.error('Failed to upload banner')
    } finally {
      setUploadingBanner(false)
      if (bannerInputRef.current) {
        bannerInputRef.current.value = ''
      }
    }
  }

  async function handleDeleteBanner() {
    try {
      const token = await getToken()
      const response = await fetch(`/api/admin/events/${eventId}/salve/name-tag-image?type=background`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })

      if (response.ok) {
        updateTemplate('headerBannerUrl', '')
        toast.success('Header banner deleted')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete banner')
      }
    } catch (error) {
      console.error('Banner delete error:', error)
      toast.error('Failed to delete banner')
    }
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

  async function handlePreview() {
    if (selectedGroups.size === 0) {
      toast.error('Please select at least one group')
      return
    }

    setGenerating(true)
    try {
      const token = await getToken()
      // Fetch a sample of name tags for preview
      const firstGroupId = Array.from(selectedGroups)[0]
      const response = await fetch(`/api/admin/events/${eventId}/salve/generate-name-tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          groupId: firstGroupId,
          templateOverride: template,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setPreviewData(data.nameTags.slice(0, 6))
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
      const allNameTags: any[] = []
      let lastSchedule: any[] = []

      for (const groupId of Array.from(selectedGroups)) {
        const response = await fetch(`/api/admin/events/${eventId}/salve/generate-name-tags`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ groupId, templateOverride: template }),
        })

        if (response.ok) {
          const data = await response.json()
          allNameTags.push(...data.nameTags)
          if (data.schedule?.length) lastSchedule = data.schedule
        }
      }

      // Also use the locally-loaded schedule as fallback (no need for a second API round-trip)
      if (!lastSchedule.length && scheduleEntries.length) lastSchedule = scheduleEntries

      toast.success(`Generated ${allNameTags.length} name tags. Opening print dialog...`)
      openBadgePrintWindow(allNameTags, template, eventName, lastSchedule)
    } catch (error) {
      console.error('Generate error:', error)
      toast.error('Failed to generate name tags')
    } finally {
      setGenerating(false)
    }
  }

  async function handleExportPrePrintRoll() {
    if (selectedGroups.size === 0) {
      toast.error('Please select at least one group')
      return
    }

    setGenerating(true)
    try {
      const token = await getToken()
      const allNameTags: any[] = []
      let lastSchedule: any[] = []

      for (const groupId of Array.from(selectedGroups)) {
        const response = await fetch(`/api/admin/events/${eventId}/salve/generate-name-tags`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ groupId, templateOverride: template }),
        })

        if (response.ok) {
          const data = await response.json()
          allNameTags.push(...data.nameTags)
          if (data.schedule?.length) lastSchedule = data.schedule
        }
      }

      if (!lastSchedule.length && scheduleEntries.length) lastSchedule = scheduleEntries

      toast.success(`Exporting ${allNameTags.length} badges for pre-print roll...`)
      openBadgePrintWindow(allNameTags, template, eventName, lastSchedule, { cropMarks: true })
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export badges')
    } finally {
      setGenerating(false)
    }
  }

  const selectedCount = selectedGroups.size
  const totalParticipants = groups
    .filter((g) => selectedGroups.has(g.id))
    .reduce((sum, g) => sum + g.participantCount, 0)

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
          <span className="text-navy font-medium">Name Tags</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-navy">Name Tag Designer</h1>
            <p className="text-muted-foreground">Design and print name tags for {eventName}</p>
          </div>

          <div className="flex gap-2 items-center">
            {templateSavedAt && (
              <span className="text-sm text-muted-foreground">
                Last saved: {new Date(templateSavedAt).toLocaleString()}
              </span>
            )}
            <Button onClick={handleSaveTemplate} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Template
            </Button>
            <Link href={`/dashboard/admin/events/${eventId}/salve`}>
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Check-In
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Template Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs defaultValue="layout" className="w-full">
              <TabsList className="w-full rounded-none border-b grid grid-cols-3">
                <TabsTrigger value="layout">Layout</TabsTrigger>
                <TabsTrigger value="fields">Fields</TabsTrigger>
                <TabsTrigger value="style">Style</TabsTrigger>
              </TabsList>

              {/* ─── LAYOUT TAB ─── */}
              <TabsContent value="layout" className="p-4 space-y-5">
                {/* Size */}
                <div className="space-y-2">
                  <Label>Badge Size</Label>
                  <Select value={template.size} onValueChange={(value) => updateTemplate('size', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="thermal_4x12">Thermal Roll (4&quot; × 12&quot; fanfold)</SelectItem>
                      <SelectItem value="badge_4x6">Badge (4&quot; × 6&quot;, 1 per page)</SelectItem>
                      <SelectItem value="standard">Standard (3.5&quot; × 2.25&quot;)</SelectItem>
                      <SelectItem value="large">Large (4&quot; × 3&quot;)</SelectItem>
                      <SelectItem value="small">Small (2.5&quot; × 1.5&quot;)</SelectItem>
                      <SelectItem value="business_card">Business Card (3.5&quot; × 2&quot;, 10 per page)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Font Size */}
                <div className="space-y-2">
                  <Label>Font Size</Label>
                  <Select value={template.fontSize} onValueChange={(value) => updateTemplate('fontSize', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Font Family */}
                <div className="space-y-2">
                  <Label>Font Family</Label>
                  <Select value={template.fontFamily} onValueChange={(value) => updateTemplate('fontFamily', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sans-serif">Sans-serif (Arial)</SelectItem>
                      <SelectItem value="serif">Serif (Georgia)</SelectItem>
                      <SelectItem value="monospace">Monospace (Courier)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Conference Header */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="showConferenceHeader" checked={template.showConferenceHeader} onCheckedChange={(checked) => updateTemplate('showConferenceHeader', checked)} />
                    <Label htmlFor="showConferenceHeader" className="font-normal">Conference header bar</Label>
                  </div>
                  {template.showConferenceHeader && (
                    <Input
                      placeholder={eventName || 'e.g., SALVE 2025'}
                      value={template.conferenceHeaderText}
                      onChange={(e) => updateTemplate('conferenceHeaderText', e.target.value)}
                    />
                  )}
                </div>

                {/* Header Banner — 4x6 / thermal only */}
                {(template.size === 'badge_4x6' || template.size === 'thermal_4x12') && (
                  <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2">
                      <Checkbox id="showHeaderBanner" checked={template.showHeaderBanner} onCheckedChange={(checked) => updateTemplate('showHeaderBanner', checked)} />
                      <Label htmlFor="showHeaderBanner" className="font-normal">Custom header image (top 2.5&quot;)</Label>
                    </div>
                    <p className="text-xs text-muted-foreground">Replaces the gradient header with your own graphic.</p>
                    {template.showHeaderBanner && (
                      <div className="space-y-2">
                        <input ref={bannerInputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={handleBannerUpload} className="hidden" />
                        {template.headerBannerUrl ? (
                          <div className="p-2 border rounded bg-white">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-muted-foreground">Current banner</span>
                              <Button variant="ghost" size="sm" onClick={handleDeleteBanner} className="h-6 w-6 p-0 text-red-500 hover:bg-red-50"><X className="w-3 h-3" /></Button>
                            </div>
                            <img src={template.headerBannerUrl} alt="Banner" className="max-h-20 mx-auto rounded" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                            <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => bannerInputRef.current?.click()} disabled={uploadingBanner}>
                              {uploadingBanner ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />} Replace
                            </Button>
                          </div>
                        ) : (
                          <Button variant="outline" className="w-full bg-white" onClick={() => bannerInputRef.current?.click()} disabled={uploadingBanner}>
                            {uploadingBanner ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                            {uploadingBanner ? 'Uploading…' : 'Upload banner image'}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Back Panel — thermal only */}
                {template.size === 'thermal_4x12' && (
                  <div className="space-y-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                    <div className="flex items-center justify-between">
                      <Label className="font-medium text-indigo-800">Back Panel (Schedule)</Label>
                      <Link href={`/dashboard/admin/events/${eventId}/poros`} className="text-xs text-indigo-600 hover:underline flex items-center gap-1" target="_blank">
                        Manage schedule <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                    <div className="text-xs rounded bg-white border border-indigo-100 px-2 py-1.5">
                      {scheduleCount === null ? (
                        <span className="text-muted-foreground">Checking schedule…</span>
                      ) : scheduleCount === 0 ? (
                        <span className="text-amber-600">⚠ No schedule entries yet — add them in the Poros module.</span>
                      ) : (
                        <span className="text-green-700">✓ {scheduleCount} schedule {scheduleCount === 1 ? 'entry' : 'entries'} ready</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="showBackPanel" checked={template.showBackPanel} onCheckedChange={(checked) => updateTemplate('showBackPanel', checked)} />
                      <Label htmlFor="showBackPanel" className="font-normal">Print back panel (event schedule)</Label>
                    </div>
                    {template.showBackPanel && (
                      <div className="space-y-1">
                        <Label className="text-xs">Color mode</Label>
                        <Select value={template.backPanelColorMode} onValueChange={(value) => updateTemplate('backPanelColorMode', value)}>
                          <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="color">Color (accent color headers)</SelectItem>
                            <SelectItem value="bw">Black &amp; White (thermal-safe)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* ─── FIELDS TAB ─── */}
              <TabsContent value="fields" className="p-4 space-y-3">
                <p className="text-xs text-muted-foreground mb-1">Choose what information prints on each badge.</p>

                {[
                  { id: 'showName', label: 'Name' },
                  { id: 'showGroup', label: 'Group / Parish name' },
                  { id: 'showDiocese', label: 'Diocese' },
                  { id: 'showParticipantType', label: 'Participant type badge (Youth / Chaperone / Clergy)' },
                  { id: 'showHousing', label: 'Housing assignment' },
                  { id: 'showMealColor', label: 'Meal color indicator' },
                  { id: 'showQrCode', label: 'QR code' },
                ].map(({ id, label }) => (
                  <div key={id} className="flex items-start gap-2">
                    <Checkbox
                      id={id}
                      checked={template[id as keyof NameTagTemplate] as boolean}
                      onCheckedChange={(checked) => updateTemplate(id as keyof NameTagTemplate, checked)}
                      className="mt-0.5"
                    />
                    <Label htmlFor={id} className="font-normal leading-snug">{label}</Label>
                  </div>
                ))}

                {template.showMealColor && template.thermalMode && (
                  <p className="text-xs text-muted-foreground bg-gray-50 rounded p-2 mt-1">
                    Thermal mode is on — meal color prints as text (e.g., &ldquo;Meal: Blue&rdquo;) instead of a color bar.
                  </p>
                )}
              </TabsContent>

              {/* ─── STYLE TAB ─── */}
              <TabsContent value="style" className="p-4 space-y-5">
                {/* Logo */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="showLogo" checked={template.showLogo} onCheckedChange={(checked) => updateTemplate('showLogo', checked)} />
                    <Label htmlFor="showLogo" className="font-normal">Show logo</Label>
                  </div>
                  {template.showLogo && (
                    <div className="space-y-2">
                      <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml" onChange={handleLogoUpload} className="hidden" />
                      {template.logoUrl ? (
                        <div className="p-3 border rounded-lg bg-gray-50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">Current logo</span>
                            <Button variant="ghost" size="sm" onClick={handleDeleteLogo} className="h-6 w-6 p-0 text-red-500 hover:bg-red-50"><X className="w-4 h-4" /></Button>
                          </div>
                          <img src={template.logoUrl} alt="Logo" className="max-h-16 mx-auto" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                            {uploadingLogo ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />} Replace
                          </Button>
                        </div>
                      ) : (
                        <Button variant="outline" className="w-full" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                          {uploadingLogo ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                          {uploadingLogo ? 'Uploading…' : 'Upload logo'}
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <div className="border-t" />

                {/* Colors */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Colors</Label>
                    {template.thermalMode && (
                      <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">Disabled in B&amp;W mode</span>
                    )}
                  </div>
                  <div className={`grid grid-cols-3 gap-3 ${template.thermalMode ? 'opacity-40 pointer-events-none' : ''}`}>
                    <div>
                      <Label className="text-xs mb-1 block">Background</Label>
                      <Input type="color" value={template.backgroundColor} onChange={(e) => updateTemplate('backgroundColor', e.target.value)} className="h-10 p-1 w-full" disabled={template.thermalMode} />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Text</Label>
                      <Input type="color" value={template.textColor} onChange={(e) => updateTemplate('textColor', e.target.value)} className="h-10 p-1 w-full" disabled={template.thermalMode} />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Accent</Label>
                      <Input type="color" value={template.accentColor} onChange={(e) => updateTemplate('accentColor', e.target.value)} className="h-10 p-1 w-full" disabled={template.thermalMode} />
                    </div>
                  </div>
                </div>

                <div className="border-t" />

                {/* Thermal Printer Mode */}
                <div className="space-y-2 p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Checkbox id="thermalMode" checked={template.thermalMode} onCheckedChange={(checked) => updateTemplate('thermalMode', checked)} />
                    <Label htmlFor="thermalMode" className="font-medium">Thermal printer mode (B&amp;W)</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Forces white background and black text. Color fills become outlines. Meal colors print as text labels. Logo images still print.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Live Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Live Preview
              {template.thermalMode && (
                <span className="text-xs font-normal bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">B&amp;W</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              // Mirror badge-renderer.ts effectiveColors()
              const pBg = template.thermalMode ? '#FFFFFF' : template.backgroundColor
              const pText = template.thermalMode ? '#000000' : template.textColor
              const pAccent = template.thermalMode ? '#444444' : template.accentColor

              const typeBadgeStyle: CSSProperties = template.thermalMode
                ? { border: '1px solid #000', color: '#000', background: 'none', fontSize: '8px', padding: '1px 6px', borderRadius: '3px', marginTop: '4px', display: 'inline-block' }
                : { backgroundColor: pAccent, color: 'white', fontSize: '8px', padding: '1px 6px', borderRadius: '3px', marginTop: '4px', display: 'inline-block' }

              const headerStyle: CSSProperties = template.thermalMode
                ? { background: '#e0e0e0', color: '#000' }
                : { background: `linear-gradient(135deg, ${pAccent} 0%, ${pText} 100%)`, color: 'white' }

              const MealSection = ({ compact = false }: { compact?: boolean }) => {
                if (!template.showMealColor) return null
                if (template.thermalMode) {
                  return <div style={{ borderTop: '1px solid #ccc', textAlign: 'center', fontSize: compact ? '7px' : '9px', padding: '2px 0', color: '#000' }}>Meal: Blue</div>
                }
                return <div style={{ height: compact ? '4px' : '6px', background: '#3498db', flexShrink: 0 }} />
              }

              const QRBox = ({ size }: { size: number }) => (
                <div style={{ width: size, height: size, background: '#fff', border: '1px solid #ccc', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {/* Mini QR grid approximation */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '1px', width: size - 6, height: size - 6 }}>
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div key={i} style={{ background: [0,1,5,6,4,9,15,20,21,24,23,19,14,12,7,18,16,2,22,11].includes(i) ? (template.thermalMode ? '#000' : '#1E3A5F') : 'transparent' }} />
                    ))}
                  </div>
                </div>
              )

              if (template.size === 'thermal_4x12') {
                return (
                  <div className="flex flex-col items-center">
                    {/* Front panel */}
                    <div style={{ width: 160, height: 200, background: pBg, color: pText, border: '1px solid #ccc', borderRadius: '6px 6px 0 0', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                      {template.showHeaderBanner && template.headerBannerUrl ? (
                        <img src={template.headerBannerUrl} style={{ width: '100%', height: 90, objectFit: 'cover', flexShrink: 0 }} alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      ) : (
                        <div style={{ ...headerStyle, height: 90, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          {template.showLogo && template.logoUrl && (
                            <img src={template.logoUrl} style={{ maxHeight: 30, maxWidth: '80%' }} alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          )}
                          {template.showConferenceHeader && (
                            <div style={{ fontSize: '11px', fontWeight: 700, textAlign: 'center', padding: '0 8px' }}>{template.conferenceHeaderText || eventName || 'CONFERENCE'}</div>
                          )}
                        </div>
                      )}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6px', textAlign: 'center' }}>
                        {template.showName && <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>John Doe</div>}
                        {template.showGroup && <div style={{ fontSize: 9, opacity: 0.7, marginTop: 2 }}>St. Mary&apos;s Parish</div>}
                        {template.showDiocese && <div style={{ fontSize: 8, opacity: 0.6 }}>Diocese of Sample</div>}
                        {template.showParticipantType && <span style={typeBadgeStyle}>Youth</span>}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '4px 6px' }}>
                        {template.showHousing && <div style={{ fontSize: 7, opacity: 0.7, flex: 1 }}><strong>Housing:</strong><br />Bldg A 101</div>}
                        {template.showQrCode && <QRBox size={28} />}
                      </div>
                      <MealSection compact />
                    </div>
                    {/* Fold indicator */}
                    <div style={{ width: 160, borderTop: '1px dashed #aaa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px 0', background: '#f9f9f9' }}>
                      <span style={{ fontSize: 7, color: '#aaa', letterSpacing: 2 }}>✂ FOLD HERE ✂</span>
                    </div>
                    {/* Back panel */}
                    <div style={{ width: 160, height: 200, background: '#f8f8f8', border: '1px solid #ccc', borderRadius: '0 0 6px 6px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      {template.showBackPanel ? (() => {
                        if (scheduleCount === null) {
                          return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: 8 }}>Loading…</div>
                        }
                        if (scheduleCount === 0) {
                          return <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: 8, textAlign: 'center', padding: 8, lineHeight: 1.6 }}>No schedule entries yet.<br /><span style={{ fontSize: 7 }}>Add entries in Poros.</span></div>
                        }
                        // Build real schedule preview grouped by day, rotated 180° like the real back panel
                        const dayMap = new Map<string, typeof scheduleEntries>()
                        for (const e of scheduleEntries) {
                          if (!dayMap.has(e.day)) dayMap.set(e.day, [])
                          dayMap.get(e.day)!.push(e)
                        }
                        const dayColor = template.thermalMode ? '#000' : '#555'
                        return (
                          <div style={{ transform: 'rotate(180deg)', padding: '6px 7px', overflowY: 'auto', maxHeight: 200, width: '100%', boxSizing: 'border-box' }}>
                            {Array.from(dayMap.entries()).map(([day, entries]) => (
                              <div key={day} style={{ marginBottom: 5 }}>
                                <div style={{ fontWeight: 700, fontSize: 7, textTransform: 'uppercase', borderBottom: `1px solid ${dayColor}`, marginBottom: 2, paddingBottom: 1, color: dayColor }}>{day}</div>
                                {entries.map((e: any, i: number) => (
                                  <div key={i} style={{ display: 'flex', gap: 3, marginBottom: 1, lineHeight: 1.3, alignItems: 'baseline' }}>
                                    <span style={{ fontSize: 6, color: '#666', minWidth: 38, flexShrink: 0, whiteSpace: 'nowrap' }}>{e.endTime ? `${e.startTime}–${e.endTime}` : e.startTime}</span>
                                    <span style={{ fontSize: 7, flex: 1, wordBreak: 'break-word' }}>{e.title}{e.location ? ` · ${e.location}` : ''}</span>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        )
                      })() : (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 9, textAlign: 'center', padding: 8 }}>
                          Back panel disabled
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 text-center">Thermal Roll: 4&quot; × 12&quot; fanfold</p>
                  </div>
                )
              }

              if (template.size === 'business_card') {
                return (
                  <div className="flex flex-col items-center gap-3">
                    <div style={{ width: 210, height: 120, background: pBg, color: pText, border: '1px solid #ccc', borderRadius: 4, padding: '8px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                      {template.showLogo && template.logoUrl && (
                        <img src={template.logoUrl} style={{ maxHeight: 20, maxWidth: '70%', marginBottom: 3 }} alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      )}
                      {template.showName && <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>John Doe</div>}
                      {template.showGroup && <div style={{ fontSize: 9, opacity: 0.7, marginTop: 2 }}>St. Mary&apos;s Parish</div>}
                      {template.showParticipantType && <span style={typeBadgeStyle}>Youth</span>}
                      {template.showQrCode && <QRBox size={22} />}
                    </div>
                    <p className="text-xs text-muted-foreground">Business Card: 3.5&quot; × 2&quot; — 10 per Letter page</p>
                  </div>
                )
              }

              if (template.size === 'badge_4x6') {
                return (
                  <div className="flex flex-col items-center gap-3">
                    <div style={{ width: 200, height: 300, background: pBg, color: pText, border: '1px solid #ccc', borderRadius: 6, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                      {template.showHeaderBanner && template.headerBannerUrl ? (
                        <img src={template.headerBannerUrl} style={{ width: '100%', height: 125, objectFit: 'cover', flexShrink: 0 }} alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      ) : (
                        <div style={{ ...headerStyle, height: 125, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          {template.showLogo && template.logoUrl && (
                            <img src={template.logoUrl} style={{ maxHeight: 40, maxWidth: '80%' }} alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          )}
                          {template.showConferenceHeader && (
                            <div style={{ fontSize: 13, fontWeight: 700, textAlign: 'center', padding: '0 12px' }}>{template.conferenceHeaderText || eventName || 'CONFERENCE'}</div>
                          )}
                        </div>
                      )}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px', textAlign: 'center' }}>
                        {template.showName && <><div style={{ fontWeight: 700, fontSize: 20, lineHeight: 1.1 }}>John</div><div style={{ fontWeight: 700, fontSize: 17, lineHeight: 1.1, marginBottom: 6 }}>Doe</div></>}
                        {template.showGroup && <div style={{ fontSize: 11, opacity: 0.7 }}>St. Mary&apos;s Parish</div>}
                        {template.showDiocese && <div style={{ fontSize: 9, opacity: 0.6 }}>Diocese of Sample</div>}
                        {template.showParticipantType && <span style={{ ...typeBadgeStyle, fontSize: '10px', marginTop: 6, padding: '3px 10px' }}>Youth</span>}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '6px 10px' }}>
                        {template.showHousing ? <div style={{ fontSize: 8, opacity: 0.7, lineHeight: 1.4, flex: 1 }}><strong>Housing:</strong><br />Building A 101</div> : <div />}
                        {template.showQrCode && <QRBox size={35} />}
                      </div>
                      <MealSection />
                    </div>
                    <p className="text-xs text-muted-foreground">Badge: 4&quot; × 6&quot; — 1 per page</p>
                  </div>
                )
              }

              // small / standard / large
              const w = template.size === 'small' ? 180 : template.size === 'large' ? 280 : 240
              const h = template.size === 'small' ? 108 : template.size === 'large' ? 186 : 162
              const namePx = template.fontSize === 'small' ? 12 : template.fontSize === 'large' ? 18 : 15
              const detailPx = template.fontSize === 'small' ? 8 : template.fontSize === 'large' ? 12 : 10
              const sizeLabel = template.size === 'small' ? 'Small: 2.5" × 1.5"' : template.size === 'large' ? 'Large: 4" × 3"' : 'Standard: 3.5" × 2.25"'

              return (
                <div className="flex flex-col items-center gap-3">
                  <div style={{ width: w, height: h, background: pBg, color: pText, border: '1px solid #ccc', borderRadius: 6, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                    {template.showConferenceHeader && (
                      <div style={{ background: template.thermalMode ? '#e0e0e0' : pAccent, color: template.thermalMode ? '#000' : 'white', textAlign: 'center', fontSize: 8, fontWeight: 600, padding: '3px 0', flexShrink: 0 }}>
                        {template.conferenceHeaderText || eventName || 'CONFERENCE'}
                      </div>
                    )}
                    {template.showLogo && template.logoUrl && (
                      <div style={{ textAlign: 'center', padding: '3px 0', flexShrink: 0 }}>
                        <img src={template.logoUrl} style={{ maxHeight: 22, maxWidth: '80%' }} alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      </div>
                    )}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6px', textAlign: 'center' }}>
                      {template.showName && <div style={{ fontWeight: 700, fontSize: namePx, lineHeight: 1.2 }}>John Doe</div>}
                      {template.showGroup && <div style={{ fontSize: detailPx, opacity: 0.7, marginTop: 2 }}>St. Mary&apos;s Parish</div>}
                      {template.showDiocese && <div style={{ fontSize: detailPx - 1, opacity: 0.6 }}>Diocese of Sample</div>}
                      {template.showParticipantType && <span style={typeBadgeStyle}>Youth</span>}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '3px 6px', flexShrink: 0 }}>
                      {template.showHousing ? <div style={{ fontSize: 7, opacity: 0.7, flex: 1 }}><strong>Housing:</strong> Bldg A 101</div> : <div />}
                      {template.showQrCode && <QRBox size={22} />}
                    </div>
                    <MealSection compact />
                  </div>
                  <p className="text-xs text-muted-foreground">{sizeLabel}</p>
                </div>
              )
            })()}
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

            <ScrollArea className="h-[300px]">
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
                <strong>{selectedCount}</strong> groups selected ({totalParticipants} name tags)
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
                  Preview Name Tags
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
                  Generate & Print ({totalParticipants})
                </Button>

                {template.size === 'thermal_4x12' && (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={handleExportPrePrintRoll}
                    disabled={generating || selectedCount === 0}
                  >
                    {generating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Export for Pre-Print Roll
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview Modal */}
      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Name Tag Preview</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4">
            {previewData.map((tag, index) => (
              <div
                key={index}
                className="border-2 rounded-lg flex flex-col relative overflow-hidden"
                style={{
                  backgroundColor: template.backgroundColor,
                  color: template.textColor,
                  minHeight: '140px',
                }}
              >
                {/* Conference Header */}
                {template.showConferenceHeader && (
                  <div
                    className="text-center py-1 text-xs font-semibold text-white"
                    style={{ backgroundColor: template.accentColor }}
                  >
                    {template.conferenceHeaderText || eventName || 'CONFERENCE'}
                  </div>
                )}

                {/* Logo */}
                {template.showLogo && template.logoUrl && (
                  <div className="flex justify-center py-1">
                    <img
                      src={template.logoUrl}
                      alt="Logo"
                      className="max-h-6"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </div>
                )}

                {/* Main Content - Name Centered */}
                <div className="flex-1 flex flex-col items-center justify-center p-2 text-center">
                  {template.showName && (
                    <div className="font-bold text-lg">{tag.firstName} {tag.lastName}</div>
                  )}
                  {template.showGroup && (
                    <div className="text-xs opacity-70 mt-1">{tag.groupName}</div>
                  )}
                  {template.showDiocese && tag.diocese && (
                    <div className="text-xs opacity-60">{tag.diocese}</div>
                  )}
                  {template.showParticipantType && (
                    <span
                      className="text-white text-xs px-2 py-0.5 rounded mt-2"
                      style={{ backgroundColor: template.accentColor }}
                    >
                      {tag.isClergy ? 'Clergy' : tag.isChaperone ? 'Chaperone' : 'Youth'}
                    </span>
                  )}
                </div>

                {/* Bottom Section - Housing and QR Code */}
                <div className="flex items-end justify-between p-2 pt-0">
                  {template.showHousing && tag.housing ? (
                    <div className="text-xs opacity-70 flex-1">
                      <strong>Housing:</strong> {tag.housing.fullLocation}
                    </div>
                  ) : (
                    <div className="flex-1" />
                  )}
                  {template.showQrCode && (
                    <div
                      className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center"
                      style={{ border: `1px solid ${template.accentColor}` }}
                    >
                      <span className="text-[6px] text-gray-500">QR</span>
                    </div>
                  )}
                </div>

                {template.showMealColor && tag.mealColor && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-2 rounded-b-lg"
                    style={{ backgroundColor: tag.mealColor.hex }}
                  />
                )}
              </div>
            ))}
          </div>

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
              Print All ({totalParticipants})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
