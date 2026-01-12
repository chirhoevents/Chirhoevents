'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Settings,
  Home,
  Grid3X3,
  Users,
  Utensils,
  Globe,
  Trash2,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Link as LinkIcon,
  Copy,
  Check,
  Mail,
  Upload,
  FileJson,
  X,
} from 'lucide-react'
import { toast } from '@/lib/toast'

interface PorosSettingsProps {
  eventId: string
  settings: any
  onUpdate: () => void
}

// M2K specific event - hardcoded for custom portal
const M2K_EVENT_ID = 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1'
const M2K_ORG_ID = '675c8b23-70aa-4d26-b3f7-c4afdf39ebff'

export function PorosSettings({ eventId, settings: initialSettings, onUpdate }: PorosSettingsProps) {
  const [settings, setSettings] = useState(initialSettings || {})
  const [saving, setSaving] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [resetType, setResetType] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)

  // JSON import state (only for M2K event)
  const [jsonImportData, setJsonImportData] = useState<any>(null)
  const [jsonFileName, setJsonFileName] = useState<string | null>(null)
  const [jsonImportLoading, setJsonImportLoading] = useState(false)
  const [jsonUploadError, setJsonUploadError] = useState<string | null>(null)
  const [existingImport, setExistingImport] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isM2KEvent = eventId === M2K_EVENT_ID

  // Load existing JSON import on mount (only for M2K event)
  useEffect(() => {
    if (isM2KEvent) {
      fetch(`/api/admin/events/${eventId}/poros/data-import`)
        .then(res => res.json())
        .then(data => {
          if (data.dataImport) {
            setExistingImport(data.dataImport)
          }
        })
        .catch(err => console.error('Failed to load existing import:', err))
    }
  }, [eventId, isM2KEvent])

  // Generate the public portal URL
  const publicPortalUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/poros/public/${eventId}`
    : `/poros/public/${eventId}`

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(publicPortalUrl)
      setCopied(true)
      toast.success('Link copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error('Failed to copy link')
    }
  }

  // JSON file upload handler
  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setJsonUploadError(null)

    if (!file.name.endsWith('.json')) {
      setJsonUploadError('Please select a JSON file')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string)

        // Validate required fields
        if (!json.youthGroups || !Array.isArray(json.youthGroups)) {
          setJsonUploadError('Invalid JSON: missing youthGroups array')
          return
        }

        setJsonImportData(json)
        setJsonFileName(file.name)
      } catch (err) {
        setJsonUploadError('Invalid JSON format')
      }
    }
    reader.onerror = () => {
      setJsonUploadError('Failed to read file')
    }
    reader.readAsText(file)
  }

  async function uploadJsonData() {
    if (!jsonImportData) return

    setJsonImportLoading(true)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/poros/data-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonData: jsonImportData,
          fileName: jsonFileName
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const result = await response.json()
      setExistingImport(result.dataImport)
      setJsonImportData(null)
      setJsonFileName(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      toast.success('JSON data imported successfully!')
      onUpdate()
    } catch (error: any) {
      toast.error(error.message || 'Failed to import data')
    } finally {
      setJsonImportLoading(false)
    }
  }

  async function deleteJsonImport() {
    setJsonImportLoading(true)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/poros/data-import`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Delete failed')
      }

      setExistingImport(null)
      toast.success('Import data deleted')
      onUpdate()
    } catch (error) {
      toast.error('Failed to delete import data')
    } finally {
      setJsonImportLoading(false)
    }
  }

  function clearSelectedFile() {
    setJsonImportData(null)
    setJsonFileName(null)
    setJsonUploadError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  async function updateSetting(key: string, value: boolean) {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)

    setSaving(true)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      })

      if (!response.ok) {
        throw new Error('Failed to update setting')
      }

      toast.success('Setting updated')
      onUpdate()
    } catch (error) {
      // Revert on error - ensure settings is never null
      setSettings(initialSettings || {})
      toast.error('Failed to update setting')
    } finally {
      setSaving(false)
    }
  }

  function openResetDialog(type: string) {
    setResetType(type)
    setResetDialogOpen(true)
  }

  async function handleReset() {
    if (!resetType) return

    setResetting(true)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/poros/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: resetType }),
      })

      if (!response.ok) {
        throw new Error('Reset failed')
      }

      const result = await response.json()
      toast.success(result.message || 'Reset complete')
      setResetDialogOpen(false)
      onUpdate()
    } catch (error) {
      toast.error('Reset failed')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Feature Toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Feature Settings
          </CardTitle>
          <CardDescription>
            Enable or disable Poros Portal features for this event
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Housing */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Home className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <Label className="text-base font-medium">Housing</Label>
                <p className="text-sm text-muted-foreground">
                  Room assignments and building management
                </p>
              </div>
            </div>
            <Switch
              checked={settings.porosHousingEnabled ?? true}
              onCheckedChange={(checked) => updateSetting('porosHousingEnabled', checked)}
              disabled={saving}
            />
          </div>

          <Separator />

          {/* Seating */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Grid3X3 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <Label className="text-base font-medium">Seating</Label>
                <p className="text-sm text-muted-foreground">
                  Seating sections for Mass and sessions
                </p>
              </div>
            </div>
            <Switch
              checked={settings.porosSeatingEnabled ?? false}
              onCheckedChange={(checked) => updateSetting('porosSeatingEnabled', checked)}
              disabled={saving}
            />
          </div>

          <Separator />

          {/* Small Groups */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <Label className="text-base font-medium">Small Groups</Label>
                <p className="text-sm text-muted-foreground">
                  Small group assignments with SGLs
                </p>
              </div>
            </div>
            <Switch
              checked={settings.porosSmallGroupEnabled ?? false}
              onCheckedChange={(checked) => updateSetting('porosSmallGroupEnabled', checked)}
              disabled={saving}
            />
          </div>

          <Separator />

          {/* Meal Groups */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Utensils className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <Label className="text-base font-medium">Meal Colors</Label>
                <p className="text-sm text-muted-foreground">
                  Color-coded meal time assignments
                </p>
              </div>
            </div>
            <Switch
              checked={settings.porosMealColorsEnabled ?? false}
              onCheckedChange={(checked) => updateSetting('porosMealColorsEnabled', checked)}
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Public Portal Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Public Resource Portal
          </CardTitle>
          <CardDescription>
            Settings for the participant-facing portal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Enable Public Portal</Label>
              <p className="text-sm text-muted-foreground">
                Allow participants to access the public resource portal
              </p>
            </div>
            <div className="flex items-center gap-2">
              {settings.porosPublicPortalEnabled ? (
                <Badge className="bg-green-100 text-green-800">Enabled</Badge>
              ) : (
                <Badge variant="secondary">Disabled</Badge>
              )}
              <Switch
                checked={settings.porosPublicPortalEnabled ?? false}
                onCheckedChange={(checked) => updateSetting('porosPublicPortalEnabled', checked)}
                disabled={saving}
              />
            </div>
          </div>

          {settings.porosPublicPortalEnabled && (
            <>
              <Separator />

              {/* Shareable Link Section */}
              <div className="space-y-3">
                <Label className="text-base font-medium flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" />
                  Shareable Link
                </Label>
                <p className="text-sm text-muted-foreground">
                  Share this link with participants to access the public portal
                </p>
                <div className="flex gap-2">
                  <Input
                    value={publicPortalUrl}
                    readOnly
                    className="flex-1 bg-gray-50 font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={copyToClipboard}
                    className="flex-shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-2 text-green-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Email Template Button */}
              <div className="space-y-3">
                <Label className="text-base font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Send to Participants
                </Label>
                <p className="text-sm text-muted-foreground">
                  Get an email template to send to your participants
                </p>
                <Button
                  variant="outline"
                  onClick={() => setEmailDialogOpen(true)}
                  className="w-full sm:w-auto"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  View Email Template
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* M2K JSON Import - Only show for M2K event */}
      {isM2KEvent && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-600">
              <FileJson className="w-5 h-5" />
              M2K Data Import
            </CardTitle>
            <CardDescription>
              Import housing, meal, and schedule data from JSON file for the custom M2K portal view
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Import Status */}
            {existingImport && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-green-800">Data Imported</p>
                    <p className="text-sm text-green-600">
                      File: {existingImport.fileName || 'Unknown'}
                    </p>
                    <p className="text-sm text-green-600">
                      Last updated: {new Date(existingImport.updatedAt).toLocaleString()}
                    </p>
                    {existingImport.jsonData?.youthGroups && (
                      <p className="text-sm text-green-600">
                        Groups: {existingImport.jsonData.youthGroups.length}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-300 text-red-600 hover:bg-red-50"
                    onClick={deleteJsonImport}
                    disabled={jsonImportLoading}
                  >
                    {jsonImportLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* File Upload */}
            <div className="space-y-3">
              <Label className="text-base font-medium">
                {existingImport ? 'Update JSON Data' : 'Upload JSON File'}
              </Label>
              <p className="text-sm text-muted-foreground">
                Upload the m2k_2026_housing_data.json file to import all event data
              </p>

              <input
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                ref={fileInputRef}
                className="hidden"
              />

              {!jsonImportData ? (
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-dashed border-2 h-20 hover:border-blue-400 hover:bg-blue-50"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-6 h-6 text-muted-foreground" />
                    <span className="text-muted-foreground">Click to select JSON file</span>
                  </div>
                </Button>
              ) : (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileJson className="w-8 h-8 text-blue-600" />
                      <div>
                        <p className="font-medium">{jsonFileName}</p>
                        <p className="text-sm text-muted-foreground">
                          {jsonImportData.youthGroups?.length || 0} groups found
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSelectedFile}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Preview stats */}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="p-2 bg-white rounded">
                      <span className="text-muted-foreground">Groups: </span>
                      <span className="font-medium">{jsonImportData.youthGroups?.length || 0}</span>
                    </div>
                    <div className="p-2 bg-white rounded">
                      <span className="text-muted-foreground">Rooms: </span>
                      <span className="font-medium">{jsonImportData.rooms?.length || 0}</span>
                    </div>
                    <div className="p-2 bg-white rounded">
                      <span className="text-muted-foreground">Resources: </span>
                      <span className="font-medium">{jsonImportData.resources?.length || 0}</span>
                    </div>
                    <div className="p-2 bg-white rounded">
                      <span className="text-muted-foreground">Schedule Days: </span>
                      <span className="font-medium">{Object.keys(jsonImportData.schedule || {}).length}</span>
                    </div>
                  </div>

                  <Button
                    onClick={uploadJsonData}
                    disabled={jsonImportLoading}
                    className="w-full mt-4"
                  >
                    {jsonImportLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        {existingImport ? 'Update Import' : 'Import Data'}
                      </>
                    )}
                  </Button>
                </div>
              )}

              {jsonUploadError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {jsonUploadError}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Reset assignments and data. These actions cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
            <div>
              <p className="font-medium">Reset Housing Assignments</p>
              <p className="text-sm text-muted-foreground">
                Remove all room assignments
              </p>
            </div>
            <Button
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-100"
              onClick={() => openResetDialog('housing')}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
            <div>
              <p className="font-medium">Reset Small Group Assignments</p>
              <p className="text-sm text-muted-foreground">
                Remove all small group assignments
              </p>
            </div>
            <Button
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-100"
              onClick={() => openResetDialog('small_groups')}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
            <div>
              <p className="font-medium">Reset Seating Assignments</p>
              <p className="text-sm text-muted-foreground">
                Remove all seating section assignments
              </p>
            </div>
            <Button
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-100"
              onClick={() => openResetDialog('seating')}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
            <div>
              <p className="font-medium">Reset Meal Group Assignments</p>
              <p className="text-sm text-muted-foreground">
                Remove all meal color assignments
              </p>
            </div>
            <Button
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-100"
              onClick={() => openResetDialog('meal_groups')}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between p-4 bg-red-100 rounded-lg border border-red-300">
            <div>
              <p className="font-medium text-red-800">Reset All Poros Data</p>
              <p className="text-sm text-red-600">
                Delete all buildings, rooms, groups, and assignments
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => openResetDialog('all')}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Reset All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reset Confirmation Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Confirm Reset
            </DialogTitle>
            <DialogDescription>
              {resetType === 'all'
                ? 'This will delete ALL Poros data including buildings, rooms, groups, staff, and all assignments. This action cannot be undone.'
                : `This will remove all ${resetType?.replace('_', ' ')} assignments. This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReset}
              disabled={resetting}
            >
              {resetting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Template Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email Template
            </DialogTitle>
            <DialogDescription>
              Copy this email template to send to your participants
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">Subject Line</Label>
              <div className="mt-1 p-3 bg-gray-50 rounded-lg border text-sm">
                Event Resources Now Available - Access Your Portal
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Email Body</Label>
              <div className="mt-1 p-4 bg-gray-50 rounded-lg border text-sm space-y-3 whitespace-pre-line">
                <p>Hello!</p>
                <p>We&apos;re excited to share that the event resource portal is now available. You can access schedules, meal times, campus maps, and other important information all in one place.</p>
                <p><strong>Access the portal here:</strong></p>
                <p className="text-blue-600 break-all">{publicPortalUrl}</p>
                <p><strong>Tip:</strong> Add this page to your home screen for quick access during the event! Just tap the share button on your phone and select &quot;Add to Home Screen.&quot;</p>
                <p>If you have any questions, please don&apos;t hesitate to reach out.</p>
                <p>See you soon!</p>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                const emailText = `Subject: Event Resources Now Available - Access Your Portal

Hello!

We're excited to share that the event resource portal is now available. You can access schedules, meal times, campus maps, and other important information all in one place.

Access the portal here:
${publicPortalUrl}

Tip: Add this page to your home screen for quick access during the event! Just tap the share button on your phone and select "Add to Home Screen."

If you have any questions, please don't hesitate to reach out.

See you soon!`
                try {
                  await navigator.clipboard.writeText(emailText)
                  toast.success('Email template copied!')
                } catch {
                  toast.error('Failed to copy')
                }
              }}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Email
            </Button>
            <Button onClick={() => setEmailDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
