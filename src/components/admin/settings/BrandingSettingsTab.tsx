'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Palette,
  Upload,
  Trash2,
  Save,
  Loader2,
  RotateCcw,
  Image as ImageIcon,
  LayoutGrid,
  Home,
  UserCheck,
  Stethoscope,
} from 'lucide-react'

interface BrandingData {
  logoUrl: string | null
  primaryColor: string
  secondaryColor: string
  modulesEnabled: {
    poros: boolean
    salve: boolean
    rapha: boolean
  }
}

const DEFAULT_PRIMARY = '#1E3A5F'
const DEFAULT_SECONDARY = '#9C8466'

export default function BrandingSettingsTab() {
  const [branding, setBranding] = useState<BrandingData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY)
  const [secondaryColor, setSecondaryColor] = useState(DEFAULT_SECONDARY)
  const [modules, setModules] = useState({
    poros: true,
    salve: true,
    rapha: true,
  })

  useEffect(() => {
    fetchBranding()
  }, [])

  const fetchBranding = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/settings/branding')
      if (!response.ok) throw new Error('Failed to fetch branding settings')
      const data = await response.json()
      setBranding(data.organization)
      setPrimaryColor(data.organization.primaryColor || DEFAULT_PRIMARY)
      setSecondaryColor(data.organization.secondaryColor || DEFAULT_SECONDARY)
      setModules(data.organization.modulesEnabled || { poros: true, salve: true, rapha: true })
    } catch (err) {
      console.error('Error fetching branding:', err)
      setError('Failed to load branding settings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Please upload PNG, JPEG, GIF, WebP, or SVG.')
      return
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('File size must be less than 2MB')
      return
    }

    setIsUploadingLogo(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/settings/branding/logo', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to upload logo')
      }

      const data = await response.json()
      setBranding((prev) => prev ? { ...prev, logoUrl: data.logoUrl } : null)
      setSuccessMessage('Logo uploaded successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      console.error('Error uploading logo:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload logo')
    } finally {
      setIsUploadingLogo(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDeleteLogo = async () => {
    if (!confirm('Are you sure you want to remove the logo?')) return

    try {
      const response = await fetch('/api/admin/settings/branding/logo', {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete logo')

      setBranding((prev) => prev ? { ...prev, logoUrl: null } : null)
      setSuccessMessage('Logo removed successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      console.error('Error deleting logo:', err)
      setError('Failed to remove logo')
    }
  }

  const handleSaveColors = async () => {
    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await fetch('/api/admin/settings/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryColor,
          secondaryColor,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save colors')
      }

      setSuccessMessage('Brand colors saved successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      console.error('Error saving colors:', err)
      setError(err instanceof Error ? err.message : 'Failed to save colors')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveModules = async () => {
    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await fetch('/api/admin/settings/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modulesEnabled: modules,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save modules')
      }

      setSuccessMessage('Module settings saved successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      console.error('Error saving modules:', err)
      setError(err instanceof Error ? err.message : 'Failed to save modules')
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetColors = () => {
    setPrimaryColor(DEFAULT_PRIMARY)
    setSecondaryColor(DEFAULT_SECONDARY)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#1E3A5F]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {successMessage}
        </div>
      )}

      {/* Logo Upload */}
      <Card className="bg-white border-[#D1D5DB]">
        <CardHeader>
          <CardTitle className="text-[#1E3A5F] flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Organization Logo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Upload a square logo (recommended: 200x200px). Your logo appears in the sidebar,
            on event pages, and in emails.
          </p>

          <div className="flex items-start gap-6">
            {/* Logo Preview */}
            <div className="flex-shrink-0">
              {branding?.logoUrl ? (
                <div className="relative">
                  <img
                    src={branding.logoUrl}
                    alt="Organization Logo"
                    className="w-24 h-24 rounded-lg border border-gray-200 object-cover"
                  />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                  <ImageIcon className="h-8 w-8 text-gray-400" />
                </div>
              )}
            </div>

            {/* Upload Controls */}
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                onChange={handleLogoUpload}
                className="hidden"
              />

              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingLogo}
                className="border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white"
              >
                {isUploadingLogo ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    {branding?.logoUrl ? 'Change Logo' : 'Upload Logo'}
                  </>
                )}
              </Button>

              {branding?.logoUrl && (
                <Button
                  variant="outline"
                  onClick={handleDeleteLogo}
                  className="border-red-300 text-red-600 hover:bg-red-50 ml-2"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              )}

              <p className="text-xs text-gray-500">
                PNG, JPEG, GIF, WebP, or SVG. Max 2MB.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Brand Colors */}
      <Card className="bg-white border-[#D1D5DB]">
        <CardHeader>
          <CardTitle className="text-[#1E3A5F] flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Brand Colors
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-gray-600">
            Customize the colors used throughout your organization&apos;s portal.
            These colors will be applied to buttons, headers, and accents.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Primary Color */}
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-lg border border-gray-200 cursor-pointer"
                  style={{ backgroundColor: primaryColor }}
                  onClick={() => document.getElementById('primaryColorInput')?.click()}
                />
                <div className="flex-1">
                  <Input
                    id="primaryColorInput"
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-10 w-full cursor-pointer"
                  />
                </div>
                <Input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#1E3A5F"
                  className="w-24 font-mono text-sm"
                />
              </div>
              <p className="text-xs text-gray-500">
                Used for buttons, headers, and accents. Default: Navy (#1E3A5F)
              </p>
            </div>

            {/* Secondary Color */}
            <div className="space-y-2">
              <Label htmlFor="secondaryColor">Secondary Color</Label>
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-lg border border-gray-200 cursor-pointer"
                  style={{ backgroundColor: secondaryColor }}
                  onClick={() => document.getElementById('secondaryColorInput')?.click()}
                />
                <div className="flex-1">
                  <Input
                    id="secondaryColorInput"
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="h-10 w-full cursor-pointer"
                  />
                </div>
                <Input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  placeholder="#9C8466"
                  className="w-24 font-mono text-sm"
                />
              </div>
              <p className="text-xs text-gray-500">
                Used for highlights and secondary elements. Default: Gold (#9C8466)
              </p>
            </div>
          </div>

          {/* Color Preview */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <p className="text-sm font-medium text-gray-700 mb-3">Preview</p>
            <div className="flex items-center gap-4">
              <Button
                style={{ backgroundColor: primaryColor }}
                className="text-white hover:opacity-90"
              >
                Primary Button
              </Button>
              <Button
                style={{ backgroundColor: secondaryColor }}
                className="text-white hover:opacity-90"
              >
                Secondary Button
              </Button>
              <div
                className="px-3 py-1.5 rounded text-sm font-medium"
                style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
              >
                Badge
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleSaveColors}
              disabled={isSaving}
              className="bg-[#9C8466] hover:bg-[#8a7559] text-white"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Colors
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleResetColors}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Module Toggles */}
      <Card className="bg-white border-[#D1D5DB]">
        <CardHeader>
          <CardTitle className="text-[#1E3A5F] flex items-center gap-2">
            <LayoutGrid className="h-5 w-5" />
            Enabled Features
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-gray-600">
            Choose which features your organization uses. Disabled features will be hidden
            from the sidebar and event management.
          </p>

          <div className="space-y-4">
            {/* Poros */}
            <div className="flex items-start justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Home className="h-5 w-5 text-[#1E3A5F] mt-0.5" />
                <div>
                  <p className="font-medium text-[#1E3A5F]">Poros Portal (Housing & Logistics)</p>
                  <p className="text-sm text-gray-600">
                    Manage housing assignments, seating arrangements, meal groups, and small groups
                  </p>
                </div>
              </div>
              <Switch
                checked={modules.poros}
                onCheckedChange={(checked) => setModules({ ...modules, poros: checked })}
              />
            </div>

            {/* SALVE */}
            <div className="flex items-start justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-start gap-3">
                <UserCheck className="h-5 w-5 text-[#1E3A5F] mt-0.5" />
                <div>
                  <p className="font-medium text-[#1E3A5F]">SALVE Check-In System</p>
                  <p className="text-sm text-gray-600">
                    QR code scanning and welcome packet printing for event check-in
                  </p>
                </div>
              </div>
              <Switch
                checked={modules.salve}
                onCheckedChange={(checked) => setModules({ ...modules, salve: checked })}
              />
            </div>

            {/* Rapha */}
            <div className="flex items-start justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Stethoscope className="h-5 w-5 text-[#1E3A5F] mt-0.5" />
                <div>
                  <p className="font-medium text-[#1E3A5F]">Rapha Medical Platform</p>
                  <p className="text-sm text-gray-600">
                    Medical staff access to participant health information and incident tracking
                  </p>
                </div>
              </div>
              <Switch
                checked={modules.rapha}
                onCheckedChange={(checked) => setModules({ ...modules, rapha: checked })}
              />
            </div>
          </div>

          <Button
            onClick={handleSaveModules}
            disabled={isSaving}
            className="bg-[#9C8466] hover:bg-[#8a7559] text-white"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Module Settings
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
