'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
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
  Settings,
  Home,
  Grid3X3,
  Users,
  Utensils,
  Globe,
  Bell,
  Trash2,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import { toast } from '@/lib/toast'

interface PorosSettingsProps {
  eventId: string
  settings: any
  onUpdate: () => void
}

export function PorosSettings({ eventId, settings: initialSettings, onUpdate }: PorosSettingsProps) {
  const [settings, setSettings] = useState(initialSettings || {})
  const [saving, setSaving] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [resetType, setResetType] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)

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
      // Revert on error
      setSettings(initialSettings)
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
                Allow participants to view their assignments
              </p>
            </div>
            <Switch
              checked={settings.porosPublicPortalEnabled ?? true}
              onCheckedChange={(checked) => updateSetting('porosPublicPortalEnabled', checked)}
              disabled={saving}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Publish Portal</Label>
              <p className="text-sm text-muted-foreground">
                Make the portal live for participants
              </p>
            </div>
            <div className="flex items-center gap-2">
              {settings.porosPublicPortalPublished ? (
                <Badge className="bg-green-100 text-green-800">Published</Badge>
              ) : (
                <Badge variant="secondary">Draft</Badge>
              )}
              <Switch
                checked={settings.porosPublicPortalPublished ?? false}
                onCheckedChange={(checked) => updateSetting('porosPublicPortalPublished', checked)}
                disabled={saving || !settings.porosPublicPortalEnabled}
              />
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Show Roommate Names</Label>
              <p className="text-sm text-muted-foreground">
                Display roommate names on the public portal
              </p>
            </div>
            <Switch
              checked={settings.porosShowRoommateNames ?? true}
              onCheckedChange={(checked) => updateSetting('porosShowRoommateNames', checked)}
              disabled={saving}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Show Small Group Members</Label>
              <p className="text-sm text-muted-foreground">
                Display other small group members
              </p>
            </div>
            <Switch
              checked={settings.porosShowSmallGroupMembers ?? false}
              onCheckedChange={(checked) => updateSetting('porosShowSmallGroupMembers', checked)}
              disabled={saving}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Show SGL Contact Info</Label>
              <p className="text-sm text-muted-foreground">
                Display SGL email/phone on the portal
              </p>
            </div>
            <Switch
              checked={settings.porosShowSglContact ?? true}
              onCheckedChange={(checked) => updateSetting('porosShowSglContact', checked)}
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            Email notification settings for assignments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Notify on Assignment</Label>
              <p className="text-sm text-muted-foreground">
                Send email when a participant is assigned
              </p>
            </div>
            <Switch
              checked={settings.porosNotifyOnAssignment ?? false}
              onCheckedChange={(checked) => updateSetting('porosNotifyOnAssignment', checked)}
              disabled={saving}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Notify on Changes</Label>
              <p className="text-sm text-muted-foreground">
                Send email when assignments change
              </p>
            </div>
            <Switch
              checked={settings.porosNotifyOnChange ?? true}
              onCheckedChange={(checked) => updateSetting('porosNotifyOnChange', checked)}
              disabled={saving}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Send Welcome Email</Label>
              <p className="text-sm text-muted-foreground">
                Send welcome email with all assignments
              </p>
            </div>
            <Switch
              checked={settings.porosSendWelcomeEmail ?? false}
              onCheckedChange={(checked) => updateSetting('porosSendWelcomeEmail', checked)}
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Housing Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="w-5 h-5" />
            Housing Options
          </CardTitle>
          <CardDescription>
            Additional housing configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Allow Capacity Override</Label>
              <p className="text-sm text-muted-foreground">
                Allow assigning beyond room capacity
              </p>
            </div>
            <Switch
              checked={settings.porosCapacityOverrideAllowed ?? false}
              onCheckedChange={(checked) => updateSetting('porosCapacityOverrideAllowed', checked)}
              disabled={saving}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Allow Partial Room Fills</Label>
              <p className="text-sm text-muted-foreground">
                Allow rooms with empty beds
              </p>
            </div>
            <Switch
              checked={settings.porosAllowPartialRoomFills ?? true}
              onCheckedChange={(checked) => updateSetting('porosAllowPartialRoomFills', checked)}
              disabled={saving}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Auto-Balance Rooms</Label>
              <p className="text-sm text-muted-foreground">
                Distribute participants evenly across rooms
              </p>
            </div>
            <Switch
              checked={settings.porosAutoBalanceRooms ?? true}
              onCheckedChange={(checked) => updateSetting('porosAutoBalanceRooms', checked)}
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>

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
    </div>
  )
}
