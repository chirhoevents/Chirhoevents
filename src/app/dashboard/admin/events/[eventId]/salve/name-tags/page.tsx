'use client'

import { useState, useEffect, useRef } from 'react'
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
  Upload,
  X,
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
  showConferenceHeader: boolean
  conferenceHeaderText: string
  showLogo: boolean
  logoUrl: string
  // 4x6 Header Banner (top 2.5 inches)
  showHeaderBanner: boolean
  headerBannerUrl: string
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

  const [templateSavedAt, setTemplateSavedAt] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchData()
  }, [eventId])

  async function fetchData() {
    setLoading(true)
    try {
      const [eventRes, groupsRes, templateRes] = await Promise.all([
        fetch(`/api/admin/events/${eventId}`),
        fetch(`/api/admin/events/${eventId}/groups`),
        fetch(`/api/admin/events/${eventId}/salve/name-tag-template`),
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
      const response = await fetch(`/api/admin/events/${eventId}/salve/name-tag-template`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'logo')

      const response = await fetch(`/api/admin/events/${eventId}/salve/name-tag-image`, {
        method: 'POST',
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
      const response = await fetch(`/api/admin/events/${eventId}/salve/name-tag-image?type=logo`, {
        method: 'DELETE',
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
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'background') // Using 'background' type for banner

      const response = await fetch(`/api/admin/events/${eventId}/salve/name-tag-image`, {
        method: 'POST',
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
      const response = await fetch(`/api/admin/events/${eventId}/salve/name-tag-image?type=background`, {
        method: 'DELETE',
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

    // Special font sizes for 4x6 badge - much larger for visibility
    const badge4x6Fonts = {
      firstName: '48px',
      lastName: '40px',
      details: '20px',
      housing: '16px',
      badge: '16px'
    }

    const size = sizeStyles[template.size]
    const fonts = fontSizes[template.fontSize]
    const is4x6Badge = template.size === 'badge_4x6'
    const has4x6Banner = is4x6Badge && template.showHeaderBanner && template.headerBannerUrl

    // For 4x6 badges, force QR code display if it's not explicitly disabled
    const showQr = is4x6Badge || template.showQrCode

    // Conference header text
    const conferenceHeader = template.conferenceHeaderText || eventName || ''

    // Generate 4x6 badge with banner layout
    if (is4x6Badge) {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Name Tags - 4x6 Badges</title>
          <style>
            @page {
              size: 4in 6in;
              margin: 0;
            }
            * {
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: ${template.fontFamily === 'sans-serif' ? 'Arial, Helvetica, sans-serif' : template.fontFamily};
            }
            .badge {
              width: 4in;
              height: 6in;
              background-color: ${template.backgroundColor};
              color: ${template.textColor};
              page-break-after: always;
              position: relative;
              overflow: hidden;
              display: flex;
              flex-direction: column;
            }
            .badge:last-child {
              page-break-after: auto;
            }
            .header-banner {
              width: 4in;
              height: 2.5in;
              background-size: cover;
              background-position: center;
              background-repeat: no-repeat;
              flex-shrink: 0;
            }
            .header-banner img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            .content-area {
              flex: 1;
              display: flex;
              flex-direction: column;
              padding: 16px 20px;
              text-align: center;
            }
            .name-section {
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
            }
            .first-name {
              font-size: ${badge4x6Fonts.firstName};
              font-weight: bold;
              line-height: 1.1;
              margin-bottom: 4px;
            }
            .last-name {
              font-size: ${badge4x6Fonts.lastName};
              font-weight: bold;
              line-height: 1.1;
              margin-bottom: 12px;
            }
            .group-name {
              font-size: ${badge4x6Fonts.details};
              color: #555;
              margin-bottom: 4px;
            }
            .diocese {
              font-size: 16px;
              color: #777;
              margin-bottom: 8px;
            }
            .participant-badge {
              display: inline-block;
              background-color: ${template.accentColor};
              color: white;
              padding: 8px 20px;
              border-radius: 6px;
              font-size: ${badge4x6Fonts.badge};
              font-weight: 600;
              margin-top: 8px;
            }
            .bottom-row {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              padding: 12px 20px 16px;
              flex-shrink: 0;
            }
            .housing-info {
              font-size: ${badge4x6Fonts.housing};
              text-align: left;
              flex: 1;
              line-height: 1.3;
            }
            .housing-info strong {
              display: block;
              margin-bottom: 2px;
            }
            .qr-code {
              width: 70px;
              height: 70px;
              flex-shrink: 0;
              margin-left: 12px;
            }
            .meal-bar {
              position: absolute;
              bottom: 0;
              left: 0;
              right: 0;
              height: 12px;
            }
            /* Fallback header without banner */
            .fallback-header {
              height: 2.5in;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              background: linear-gradient(135deg, ${template.accentColor} 0%, ${template.textColor} 100%);
              color: white;
            }
            .fallback-header .event-name {
              font-size: 28px;
              font-weight: bold;
              text-align: center;
              padding: 0 20px;
            }
            .fallback-header .logo {
              max-height: 80px;
              max-width: 80%;
              margin-bottom: 12px;
            }
          </style>
        </head>
        <body>
          ${nameTags.map((tag) => `
            <div class="badge">
              ${has4x6Banner ? `
                <div class="header-banner">
                  <img src="${template.headerBannerUrl}" alt="" />
                </div>
              ` : `
                <div class="fallback-header">
                  ${template.showLogo && template.logoUrl ? `
                    <img src="${template.logoUrl}" class="logo" alt="" />
                  ` : ''}
                  ${template.showConferenceHeader && conferenceHeader ? `
                    <div class="event-name">${conferenceHeader}</div>
                  ` : ''}
                </div>
              `}

              <div class="content-area">
                <div class="name-section">
                  ${template.showName ? `
                    <div class="first-name">${tag.firstName}</div>
                    <div class="last-name">${tag.lastName}</div>
                  ` : ''}
                  ${template.showGroup ? `<div class="group-name">${tag.groupName}</div>` : ''}
                  ${template.showDiocese && tag.diocese ? `<div class="diocese">${tag.diocese}</div>` : ''}
                  ${template.showParticipantType ? `
                    <div class="participant-badge">
                      ${tag.isClergy ? 'Clergy' : tag.isChaperone ? 'Chaperone' : 'Youth'}
                    </div>
                  ` : ''}
                </div>
              </div>

              <div class="bottom-row">
                ${template.showHousing && tag.housing ? `
                  <div class="housing-info">
                    <strong>Housing:</strong>
                    ${tag.housing.fullLocation}
                  </div>
                ` : '<div></div>'}
                ${showQr && tag.qrCode ? `
                  <img class="qr-code" src="${tag.qrCode}" alt="QR" />
                ` : ''}
              </div>

              ${template.showMealColor && tag.mealColor ? `
                <div class="meal-bar" style="background-color: ${tag.mealColor.hex}"></div>
              ` : ''}
            </div>
          `).join('')}
        </body>
        </html>
      `
    }

    // Standard layout for non-4x6 badges
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Name Tags</title>
        <style>
          @page {
            size: letter;
            margin: 0.5in;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: ${template.fontFamily === 'sans-serif' ? 'Arial, Helvetica, sans-serif' : template.fontFamily};
          }
          .name-tags-container {
            display: flex;
            flex-wrap: wrap;
            gap: 0.25in;
          }
          .name-tag {
            width: ${size.width};
            height: ${size.height};
            border: 1px solid #ccc;
            border-radius: 8px;
            padding: 12px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            background-color: ${template.backgroundColor};
            color: ${template.textColor};
            page-break-inside: avoid;
            position: relative;
            overflow: hidden;
          }
          .conference-header {
            text-align: center;
            font-size: 10px;
            font-weight: 600;
            padding: 4px;
            background-color: ${template.accentColor};
            color: white;
            margin: -12px -12px 8px -12px;
            border-radius: 7px 7px 0 0;
          }
          .logo-section {
            text-align: center;
            padding: 4px 0;
          }
          .logo-section img {
            max-height: 30px;
            max-width: 100%;
          }
          .main-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
          }
          .name {
            font-size: ${fonts.name};
            font-weight: bold;
            color: ${template.textColor};
          }
          .group-name {
            font-size: ${fonts.details};
            color: #666;
            margin-top: 4px;
          }
          .diocese {
            font-size: 10px;
            color: #888;
          }
          .badge-label {
            display: inline-block;
            background-color: ${template.accentColor};
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 10px;
            margin-top: 4px;
          }
          .bottom-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: auto;
            padding-top: 8px;
          }
          .housing {
            font-size: 10px;
            text-align: left;
            flex: 1;
          }
          .qr-code {
            width: 40px;
            height: 40px;
            flex-shrink: 0;
          }
          .meal-color-bar {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 8px;
            border-radius: 0 0 7px 7px;
          }
        </style>
      </head>
      <body>
        <div class="name-tags-container">
          ${nameTags.map((tag) => `
            <div class="name-tag">
              ${template.showConferenceHeader && conferenceHeader ? `
                <div class="conference-header">${conferenceHeader}</div>
              ` : ''}
              ${template.showLogo && template.logoUrl ? `
                <div class="logo-section">
                  <img src="${template.logoUrl}" alt="Logo" />
                </div>
              ` : ''}
              <div class="main-content">
                ${template.showName ? `<div class="name">${tag.firstName} ${tag.lastName}</div>` : ''}
                ${template.showGroup ? `<div class="group-name">${tag.groupName}</div>` : ''}
                ${template.showDiocese && tag.diocese ? `<div class="diocese">${tag.diocese}</div>` : ''}
                ${template.showParticipantType ? `
                  <div class="badge-label">
                    ${tag.isClergy ? 'Clergy' : tag.isChaperone ? 'Chaperone' : 'Youth'}
                  </div>
                ` : ''}
              </div>
              <div class="bottom-row">
                ${template.showHousing && tag.housing ? `
                  <div class="housing">
                    <strong>Housing:</strong> ${tag.housing.fullLocation}
                  </div>
                ` : '<div></div>'}
                ${template.showQrCode && tag.qrCode ? `
                  <img class="qr-code" src="${tag.qrCode}" alt="QR" />
                ` : ''}
              </div>
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

            {/* Conference Header */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="showConferenceHeader"
                  checked={template.showConferenceHeader}
                  onCheckedChange={(checked) => updateTemplate('showConferenceHeader', checked)}
                />
                <Label htmlFor="showConferenceHeader" className="font-normal">Show Conference Header</Label>
              </div>
              {template.showConferenceHeader && (
                <Input
                  placeholder="Enter conference name (e.g., SALVE 2025)"
                  value={template.conferenceHeaderText}
                  onChange={(e) => updateTemplate('conferenceHeaderText', e.target.value)}
                />
              )}
            </div>

            {/* Logo */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="showLogo"
                  checked={template.showLogo}
                  onCheckedChange={(checked) => updateTemplate('showLogo', checked)}
                />
                <Label htmlFor="showLogo" className="font-normal">Show Logo</Label>
              </div>
              {template.showLogo && (
                <div className="space-y-2">
                  {/* Hidden file input */}
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />

                  {template.logoUrl ? (
                    <div className="p-3 border rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Current Logo</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleDeleteLogo}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <img
                        src={template.logoUrl}
                        alt="Logo preview"
                        className="max-h-16 mx-auto"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadingLogo}
                    >
                      {uploadingLogo ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                    </Button>
                  )}

                  {template.logoUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadingLogo}
                    >
                      {uploadingLogo ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      Replace Logo
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* 4x6 Header Banner - Only show for badge_4x6 size */}
            {template.size === 'badge_4x6' && (
              <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="showHeaderBanner"
                    checked={template.showHeaderBanner}
                    onCheckedChange={(checked) => updateTemplate('showHeaderBanner', checked)}
                  />
                  <Label htmlFor="showHeaderBanner" className="font-normal">
                    Use Custom Header Banner (Top 2.5&quot;)
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Upload a custom graphic for the top portion of the 4x6 badge. The name and info will display in the bottom half.
                </p>
                {template.showHeaderBanner && (
                  <div className="space-y-2">
                    {/* Hidden file input */}
                    <input
                      ref={bannerInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/gif,image/webp"
                      onChange={handleBannerUpload}
                      className="hidden"
                    />

                    {template.headerBannerUrl ? (
                      <div className="p-3 border rounded-lg bg-white">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">Current Banner</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDeleteBanner}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <img
                          src={template.headerBannerUrl}
                          alt="Banner preview"
                          className="max-h-24 mx-auto rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full bg-white"
                        onClick={() => bannerInputRef.current?.click()}
                        disabled={uploadingBanner}
                      >
                        {uploadingBanner ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4 mr-2" />
                        )}
                        {uploadingBanner ? 'Uploading...' : 'Upload Header Banner (4" × 2.5")'}
                      </Button>
                    )}

                    {template.headerBannerUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full bg-white"
                        onClick={() => bannerInputRef.current?.click()}
                        disabled={uploadingBanner}
                      >
                        {uploadingBanner ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4 mr-2" />
                        )}
                        Replace Banner
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

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
              {template.size === 'badge_4x6' ? (
                /* 4x6 Badge Preview */
                <div
                  className="border-2 border-dashed rounded-lg flex flex-col relative overflow-hidden"
                  style={{
                    backgroundColor: template.backgroundColor,
                    color: template.textColor,
                    width: '200px',
                    height: '300px',
                  }}
                >
                  {/* Header Banner or Fallback */}
                  {template.showHeaderBanner && template.headerBannerUrl ? (
                    <div className="w-full" style={{ height: '125px', flexShrink: 0 }}>
                      <img
                        src={template.headerBannerUrl}
                        alt="Banner"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      className="w-full flex flex-col items-center justify-center"
                      style={{
                        height: '125px',
                        flexShrink: 0,
                        background: `linear-gradient(135deg, ${template.accentColor} 0%, ${template.textColor} 100%)`,
                      }}
                    >
                      {template.showLogo && template.logoUrl && (
                        <img
                          src={template.logoUrl}
                          alt="Logo"
                          className="max-h-10 mb-1"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      )}
                      {template.showConferenceHeader && (
                        <div className="text-white text-sm font-bold text-center px-2">
                          {template.conferenceHeaderText || eventName || 'CONFERENCE'}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Content Area */}
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-3">
                    {template.showName && (
                      <>
                        <div className="font-bold text-xl leading-tight">John</div>
                        <div className="font-bold text-lg leading-tight mb-2">Doe</div>
                      </>
                    )}
                    {template.showGroup && (
                      <div className="text-xs opacity-70">St. Mary&apos;s Parish</div>
                    )}
                    {template.showDiocese && (
                      <div className="text-[10px] opacity-60">Diocese of Sample</div>
                    )}
                    {template.showParticipantType && (
                      <span
                        className="text-white text-[10px] px-2 py-0.5 rounded mt-2 font-medium"
                        style={{ backgroundColor: template.accentColor }}
                      >
                        Youth
                      </span>
                    )}
                  </div>

                  {/* Bottom Row */}
                  <div className="flex justify-between items-end p-2 pt-0">
                    {template.showHousing ? (
                      <div className="text-[8px] opacity-70 leading-tight">
                        <strong className="block">Housing:</strong>
                        Building A 101
                      </div>
                    ) : <div />}
                    {template.showQrCode && (
                      <div
                        className="bg-white border rounded flex items-center justify-center flex-shrink-0"
                        style={{ width: '35px', height: '35px' }}
                      >
                        <span className="text-[6px] text-gray-400">QR</span>
                      </div>
                    )}
                  </div>

                  {template.showMealColor && (
                    <div
                      className="absolute bottom-0 left-0 right-0 h-2"
                      style={{ backgroundColor: '#3498db' }}
                    />
                  )}
                </div>
              ) : (
                /* Standard Badge Preview */
                <div
                  className="border-2 border-dashed rounded-lg p-4 flex flex-col relative overflow-hidden"
                  style={{
                    backgroundColor: template.backgroundColor,
                    color: template.textColor,
                    width: template.size === 'small' ? '180px' : template.size === 'large' ? '280px' : '240px',
                    minHeight: template.size === 'small' ? '108px' : template.size === 'large' ? '216px' : '162px',
                  }}
                >
                  {/* Conference Header */}
                  {template.showConferenceHeader && (
                    <div
                      className="text-center py-1 text-xs font-semibold text-white -mx-4 -mt-4 mb-2"
                      style={{ backgroundColor: template.accentColor }}
                    >
                      {template.conferenceHeaderText || eventName || 'CONFERENCE'}
                    </div>
                  )}

                  {/* Logo */}
                  {template.showLogo && template.logoUrl && (
                    <div className="flex justify-center py-2">
                      <img
                        src={template.logoUrl}
                        alt="Logo"
                        className="max-h-8"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    </div>
                  )}

                  {/* Main Content - Name Centered */}
                  <div className="flex-1 flex flex-col items-center justify-center p-3 text-center">
                    {template.showName && (
                      <div
                        className="font-bold"
                        style={{
                          fontSize: template.fontSize === 'small' ? '14px' : template.fontSize === 'large' ? '18px' : '16px',
                        }}
                      >
                        John Doe
                      </div>
                    )}
                    {template.showGroup && (
                      <div className="text-sm opacity-70 mt-1">St. Mary&apos;s Parish</div>
                    )}
                    {template.showDiocese && (
                      <div className="text-xs opacity-60">Diocese of Sample</div>
                    )}
                    {template.showParticipantType && (
                      <span
                        className="text-white text-xs px-2 py-0.5 rounded mt-2"
                        style={{ backgroundColor: template.accentColor }}
                      >
                        Youth
                      </span>
                    )}
                  </div>

                  {/* Bottom row: Housing on left, QR on right */}
                  <div className="mt-auto pt-2 flex justify-between items-end">
                    {template.showHousing ? (
                      <div className="text-[10px] opacity-70">
                        <strong>Housing:</strong> Building A 101
                      </div>
                    ) : <div />}
                    {template.showQrCode && (
                      <div
                        className="bg-white border rounded flex items-center justify-center flex-shrink-0"
                        style={{ width: '30px', height: '30px' }}
                      >
                        <span className="text-[6px] text-gray-400 text-center">QR</span>
                      </div>
                    )}
                  </div>

                  {template.showMealColor && (
                    <div
                      className="absolute bottom-0 left-0 right-0 h-2 rounded-b-lg"
                      style={{ backgroundColor: '#3498db' }}
                    />
                  )}
                </div>
              )}
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
