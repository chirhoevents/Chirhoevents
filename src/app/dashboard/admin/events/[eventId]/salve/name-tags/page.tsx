'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
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
} from 'lucide-react'
import { toast } from '@/lib/toast'

interface NameTagTemplate {
  size: 'standard' | 'large' | 'small' | 'badge_4x6'
  showName: boolean
  showGroup: boolean
  showParticipantType: boolean
  showHousing: boolean
  showDiocese: boolean
  showMealColor: boolean
  showSmallGroup: boolean
  showQrCode: boolean
  backgroundColor: string
  textColor: string
  accentColor: string
  fontFamily: string
  fontSize: 'small' | 'medium' | 'large'
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
  showSmallGroup: false,
  showQrCode: false,
  backgroundColor: '#FFFFFF',
  textColor: '#1E3A5F',
  accentColor: '#9C8466',
  fontFamily: 'sans-serif',
  fontSize: 'medium',
}

export default function NameTagDesignerPage() {
  const params = useParams()
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

  useEffect(() => {
    fetchData()
  }, [eventId])

  async function fetchData() {
    setLoading(true)
    try {
      const [eventRes, groupsRes] = await Promise.all([
        fetch(`/api/admin/events/${eventId}`),
        fetch(`/api/admin/events/${eventId}/groups`),
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
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  function updateTemplate(key: keyof NameTagTemplate, value: any) {
    setTemplate((prev) => ({ ...prev, [key]: value }))
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
      // Fetch a sample of name tags for preview
      const firstGroupId = Array.from(selectedGroups)[0]
      const response = await fetch(`/api/admin/events/${eventId}/salve/generate-name-tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: firstGroupId,
          templateId: null,
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
      // Generate name tags for all selected groups
      const allNameTags = []

      for (const groupId of Array.from(selectedGroups)) {
        const response = await fetch(`/api/admin/events/${eventId}/salve/generate-name-tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            groupId,
            templateId: null,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          allNameTags.push(...data.nameTags)
        }
      }

      // Open print dialog with generated name tags
      // In production, this would generate a PDF
      toast.success(`Generated ${allNameTags.length} name tags. Opening print dialog...`)

      // Create a printable window
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(generatePrintableHTML(allNameTags, template))
        printWindow.document.close()
        printWindow.print()
      }
    } catch (error) {
      console.error('Generate error:', error)
      toast.error('Failed to generate name tags')
    } finally {
      setGenerating(false)
    }
  }

  function generatePrintableHTML(nameTags: any[], template: NameTagTemplate): string {
    const sizeStyles = {
      small: { width: '2.5in', height: '1.5in' },
      standard: { width: '3.5in', height: '2.25in' },
      large: { width: '4in', height: '3in' },
      badge_4x6: { width: '4in', height: '6in' },
    }

    const fontSizes: Record<string, { name: string; details: string; housing?: string }> = {
      small: { name: '16px', details: '10px' },
      medium: { name: '20px', details: '12px' },
      large: { name: '24px', details: '14px' },
    }

    // Special font sizes for 4x6 badge
    const badge4x6Fonts = { name: '32px', details: '16px', housing: '14px' }

    const size = sizeStyles[template.size]
    const fonts = template.size === 'badge_4x6' ? badge4x6Fonts : fontSizes[template.fontSize]
    const is4x6Badge = template.size === 'badge_4x6'

    // For 4x6 badges, force QR code display if it's not explicitly disabled
    const showQr = is4x6Badge || template.showQrCode

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Name Tags</title>
        <style>
          @page {
            size: ${is4x6Badge ? '4in 6in' : 'letter'};
            margin: ${is4x6Badge ? '0' : '0.5in'};
          }
          body {
            margin: 0;
            padding: 0;
            font-family: ${template.fontFamily};
          }
          .name-tags-container {
            display: flex;
            flex-wrap: wrap;
            gap: ${is4x6Badge ? '0' : '0.25in'};
          }
          .name-tag {
            width: ${size.width};
            height: ${size.height};
            border: ${is4x6Badge ? 'none' : '1px solid #ccc'};
            border-radius: ${is4x6Badge ? '0' : '8px'};
            padding: ${is4x6Badge ? '20px' : '12px'};
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            background-color: ${template.backgroundColor};
            color: ${template.textColor};
            page-break-inside: avoid;
            ${is4x6Badge ? 'page-break-after: always;' : ''}
          }
          .name-tag .header {
            border-bottom: ${is4x6Badge ? '4px' : '2px'} solid ${template.accentColor};
            padding-bottom: ${is4x6Badge ? '16px' : '8px'};
            margin-bottom: ${is4x6Badge ? '16px' : '8px'};
            text-align: ${is4x6Badge ? 'center' : 'left'};
          }
          .name-tag .name {
            font-size: ${fonts.name};
            font-weight: bold;
            color: ${template.textColor};
          }
          .name-tag .details {
            font-size: ${fonts.details};
            color: #666;
          }
          .name-tag .badge {
            display: inline-block;
            background-color: ${template.accentColor};
            color: white;
            padding: ${is4x6Badge ? '6px 16px' : '2px 8px'};
            border-radius: 4px;
            font-size: ${is4x6Badge ? '14px' : '10px'};
            margin-top: ${is4x6Badge ? '8px' : '4px'};
            ${is4x6Badge ? 'align-self: center;' : ''}
          }
          .name-tag .housing {
            ${is4x6Badge ? '' : 'margin-top: auto;'}
            padding-top: ${is4x6Badge ? '16px' : '8px'};
            border-top: 1px dashed #ccc;
            font-size: ${is4x6Badge ? (fonts.housing || fonts.details) : fonts.details};
            ${is4x6Badge ? 'text-align: center;' : ''}
          }
          .name-tag .meal-color-bar {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: ${is4x6Badge ? '16px' : '8px'};
            border-radius: ${is4x6Badge ? '0' : '0 0 8px 8px'};
          }
          .name-tag {
            position: relative;
            overflow: hidden;
          }
          .name-tag .qr-section {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 16px 0;
          }
          .name-tag .qr-code {
            width: ${is4x6Badge ? '180px' : '80px'};
            height: ${is4x6Badge ? '180px' : '80px'};
          }
          .name-tag .qr-label {
            font-size: 10px;
            color: #666;
            margin-top: 8px;
            text-align: center;
          }
          .name-tag .content-section {
            display: flex;
            flex-direction: column;
            ${is4x6Badge ? 'align-items: center;' : ''}
          }
        </style>
      </head>
      <body>
        <div class="name-tags-container">
          ${nameTags.map((tag) => `
            <div class="name-tag">
              <div class="header">
                ${template.showName ? `<div class="name">${tag.firstName} ${tag.lastName}</div>` : ''}
                ${template.showGroup ? `<div class="details">${tag.groupName}</div>` : ''}
                ${template.showDiocese && tag.diocese ? `<div class="details">${tag.diocese}</div>` : ''}
              </div>
              <div class="content-section">
                ${template.showParticipantType ? `
                  <div class="badge">
                    ${tag.isClergy ? 'Clergy' : tag.isChaperone ? 'Chaperone' : 'Youth'}
                  </div>
                ` : ''}
              </div>
              ${showQr && tag.qrCode ? `
                <div class="qr-section">
                  <img class="qr-code" src="${tag.qrCode}" alt="QR Code" />
                  <div class="qr-label">Scan for check-in</div>
                </div>
              ` : ''}
              ${template.showHousing && tag.housing ? `
                <div class="housing">
                  <strong>Housing:</strong> ${tag.housing.fullLocation}
                </div>
              ` : ''}
              ${template.showMealColor && tag.mealColor ? `
                <div class="meal-color-bar" style="background-color: ${tag.mealColor.hex}"></div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </body>
      </html>
    `
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Template Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Size */}
            <div className="space-y-2">
              <Label>Tag Size</Label>
              <Select
                value={template.size}
                onValueChange={(value) => updateTemplate('size', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small (2.5&quot; x 1.5&quot;)</SelectItem>
                  <SelectItem value="standard">Standard (3.5&quot; x 2.25&quot;)</SelectItem>
                  <SelectItem value="large">Large (4&quot; x 3&quot;)</SelectItem>
                  <SelectItem value="badge_4x6">Badge (4&quot; x 6&quot;) - With QR Code</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Font Size */}
            <div className="space-y-2">
              <Label>Font Size</Label>
              <Select
                value={template.fontSize}
                onValueChange={(value) => updateTemplate('fontSize', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Display Options */}
            <div className="space-y-3">
              <Label>Display Options</Label>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="showName"
                  checked={template.showName}
                  onCheckedChange={(checked) => updateTemplate('showName', checked)}
                />
                <Label htmlFor="showName" className="font-normal">Show Name</Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="showGroup"
                  checked={template.showGroup}
                  onCheckedChange={(checked) => updateTemplate('showGroup', checked)}
                />
                <Label htmlFor="showGroup" className="font-normal">Show Group Name</Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="showDiocese"
                  checked={template.showDiocese}
                  onCheckedChange={(checked) => updateTemplate('showDiocese', checked)}
                />
                <Label htmlFor="showDiocese" className="font-normal">Show Diocese</Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="showParticipantType"
                  checked={template.showParticipantType}
                  onCheckedChange={(checked) => updateTemplate('showParticipantType', checked)}
                />
                <Label htmlFor="showParticipantType" className="font-normal">Show Participant Type</Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="showHousing"
                  checked={template.showHousing}
                  onCheckedChange={(checked) => updateTemplate('showHousing', checked)}
                />
                <Label htmlFor="showHousing" className="font-normal">Show Housing Assignment</Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="showMealColor"
                  checked={template.showMealColor}
                  onCheckedChange={(checked) => updateTemplate('showMealColor', checked)}
                />
                <Label htmlFor="showMealColor" className="font-normal">Show Meal Color Bar</Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="showQrCode"
                  checked={template.showQrCode}
                  onCheckedChange={(checked) => updateTemplate('showQrCode', checked)}
                />
                <Label htmlFor="showQrCode" className="font-normal">Show QR Code</Label>
              </div>
            </div>

            {/* Colors */}
            <div className="space-y-3">
              <Label>Colors</Label>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Background</Label>
                  <Input
                    type="color"
                    value={template.backgroundColor}
                    onChange={(e) => updateTemplate('backgroundColor', e.target.value)}
                    className="h-10 p-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Text</Label>
                  <Input
                    type="color"
                    value={template.textColor}
                    onChange={(e) => updateTemplate('textColor', e.target.value)}
                    className="h-10 p-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Accent</Label>
                  <Input
                    type="color"
                    value={template.accentColor}
                    onChange={(e) => updateTemplate('accentColor', e.target.value)}
                    className="h-10 p-1"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Live Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <div
                className={`border-2 border-dashed rounded-lg p-4 flex flex-col relative overflow-hidden ${
                  template.size === 'badge_4x6' ? 'text-center' : ''
                }`}
                style={{
                  backgroundColor: template.backgroundColor,
                  color: template.textColor,
                  width: template.size === 'small' ? '180px' : template.size === 'large' ? '280px' : template.size === 'badge_4x6' ? '200px' : '240px',
                  minHeight: template.size === 'small' ? '108px' : template.size === 'large' ? '216px' : template.size === 'badge_4x6' ? '300px' : '162px',
                }}
              >
                <div
                  className="border-b-2 pb-2 mb-2"
                  style={{ borderColor: template.accentColor }}
                >
                  {template.showName && (
                    <div
                      className="font-bold"
                      style={{
                        fontSize: template.size === 'badge_4x6' ? '20px' : template.fontSize === 'small' ? '14px' : template.fontSize === 'large' ? '18px' : '16px',
                      }}
                    >
                      John Doe
                    </div>
                  )}
                  {template.showGroup && (
                    <div className="text-xs opacity-70">St. Mary&apos;s Parish</div>
                  )}
                  {template.showDiocese && (
                    <div className="text-xs opacity-70">Diocese of Sample</div>
                  )}
                </div>

                {template.showParticipantType && (
                  <span
                    className={`text-white text-xs px-2 py-0.5 rounded ${
                      template.size === 'badge_4x6' ? 'self-center' : 'self-start'
                    }`}
                    style={{ backgroundColor: template.accentColor }}
                  >
                    Youth
                  </span>
                )}

                {(template.showQrCode || template.size === 'badge_4x6') && (
                  <div className="flex-1 flex flex-col items-center justify-center py-4">
                    <div
                      className="bg-white border rounded flex items-center justify-center"
                      style={{
                        width: template.size === 'badge_4x6' ? '100px' : '60px',
                        height: template.size === 'badge_4x6' ? '100px' : '60px',
                      }}
                    >
                      <span className="text-[8px] text-gray-400 text-center">QR Code</span>
                    </div>
                    <span className="text-[8px] text-gray-400 mt-1">Scan for check-in</span>
                  </div>
                )}

                {template.showHousing && (
                  <div className="mt-auto pt-2 border-t border-dashed text-xs opacity-70">
                    <strong>Housing:</strong> Building A 101 - Bed A
                  </div>
                )}
                {template.showMealColor && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-2 rounded-b-lg"
                    style={{ backgroundColor: '#3498db' }}
                  />
                )}
              </div>
            </div>

            <div className="text-center mt-4 text-sm text-muted-foreground">
              {template.size === 'small' && 'Small: 2.5" × 1.5"'}
              {template.size === 'standard' && 'Standard: 3.5" × 2.25"'}
              {template.size === 'large' && 'Large: 4" × 3"'}
              {template.size === 'badge_4x6' && 'Badge: 4" × 6" (1 per page)'}
            </div>
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
                className="border-2 rounded-lg p-3 flex flex-col relative overflow-hidden"
                style={{
                  backgroundColor: template.backgroundColor,
                  color: template.textColor,
                }}
              >
                <div
                  className="border-b-2 pb-2 mb-2"
                  style={{ borderColor: template.accentColor }}
                >
                  {template.showName && (
                    <div className="font-bold">{tag.firstName} {tag.lastName}</div>
                  )}
                  {template.showGroup && (
                    <div className="text-xs opacity-70">{tag.groupName}</div>
                  )}
                  {template.showDiocese && tag.diocese && (
                    <div className="text-xs opacity-70">{tag.diocese}</div>
                  )}
                </div>

                {template.showParticipantType && (
                  <span
                    className="self-start text-white text-xs px-2 py-0.5 rounded"
                    style={{ backgroundColor: template.accentColor }}
                  >
                    {tag.isClergy ? 'Clergy' : tag.isChaperone ? 'Chaperone' : 'Youth'}
                  </span>
                )}

                {template.showHousing && tag.housing && (
                  <div className="mt-auto pt-2 border-t border-dashed text-xs opacity-70">
                    <strong>Housing:</strong> {tag.housing.fullLocation}
                  </div>
                )}

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
