'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
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
  Trash2,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Upload,
  FileJson,
  X,
} from 'lucide-react'
import { toast } from '@/lib/toast'
import { POROS_AREAS, POROS_FEATURES, isPorosFeatureOn, type PorosFeatureArea } from './poros-features'

interface PorosSettingsProps {
  eventId: string
  settings: any
  saving?: boolean
  onToggle: (key: string, value: boolean) => void
  onUpdate: () => void
}

// M2K specific event - hardcoded for custom portal
const M2K_EVENT_ID = 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1'
const M2K_ORG_ID = '675c8b23-70aa-4d26-b3f7-c4afdf39ebff'

export function PorosSettings({ eventId, settings, saving, onToggle, onUpdate }: PorosSettingsProps) {
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [resetType, setResetType] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)

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
      {/* Feature Toggles, grouped by work area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Features
          </CardTitle>
          <CardDescription>
            Every Poros feature in one list. You can also turn each one on or off right inside its own section.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {(Object.keys(POROS_AREAS) as PorosFeatureArea[]).map((area) => (
            <div key={area} className="space-y-3">
              <div>
                <h3 className="font-semibold text-navy">{POROS_AREAS[area].label}</h3>
                <p className="text-sm text-muted-foreground">{POROS_AREAS[area].description}</p>
              </div>
              <div className="rounded-lg border divide-y">
                {POROS_FEATURES.filter((f) => f.area === area).map((feature) => {
                  const Icon = feature.icon
                  return (
                    <div key={feature.key} className="flex items-center justify-between gap-4 p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${feature.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <Label htmlFor={feature.key} className="text-base font-medium">
                            {feature.label}
                          </Label>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Manage in: <span className="font-medium">{feature.location}</span>
                          </p>
                        </div>
                      </div>
                      <Switch
                        id={feature.key}
                        checked={isPorosFeatureOn(settings, feature.key)}
                        onCheckedChange={(checked) => onToggle(feature.key, checked)}
                        disabled={saving}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
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
                      <span className="text-muted-foreground">Meal Colors: </span>
                      <span className="font-medium">{jsonImportData.activeColors?.length || Object.keys(jsonImportData.mealTimes || {}).length}</span>
                    </div>
                    <div className="p-2 bg-white rounded">
                      <span className="text-muted-foreground">Resources: </span>
                      <span className="font-medium">{jsonImportData.resources?.length || 0}</span>
                    </div>
                    <div className="p-2 bg-white rounded">
                      <span className="text-muted-foreground">Schedule Days: </span>
                      <span className="font-medium">{Object.keys(jsonImportData.schedule || {}).length}</span>
                    </div>
                    <div className="p-2 bg-white rounded">
                      <span className="text-muted-foreground">With Seminarian: </span>
                      <span className="font-medium">{jsonImportData.youthGroups?.filter((g: any) => g.seminarianSgl)?.length || 0}</span>
                    </div>
                    <div className="p-2 bg-white rounded">
                      <span className="text-muted-foreground">With Religious: </span>
                      <span className="font-medium">{jsonImportData.youthGroups?.filter((g: any) => g.religious)?.length || 0}</span>
                    </div>
                    <div className="p-2 bg-white rounded">
                      <span className="text-muted-foreground">Off-Campus: </span>
                      <span className="font-medium">{jsonImportData.youthGroups?.filter((g: any) => g.stayingOffCampus)?.length || 0}</span>
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
                Clear every group's small group meeting room, SGLs, and religious
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

    </div>
  )
}
