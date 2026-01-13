'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  Users,
  Clock,
  AlertTriangle,
  RefreshCw,
  Settings,
  Activity,
  Trash2,
} from 'lucide-react'

interface QueueSettings {
  queueEnabled: boolean
  maxConcurrentGroup: number
  maxConcurrentIndividual: number
  groupSessionTimeout: number
  individualSessionTimeout: number
  allowTimeExtension: boolean
  extensionDuration: number
  queueStartTime: string | null
  queueEndTime: string | null
  waitingRoomMessage: string | null
}

interface QueueStats {
  queueEnabled: boolean
  activeGroupSessions: number
  activeIndividualSessions: number
  waitingGroupUsers: number
  waitingIndividualUsers: number
  maxConcurrentGroup: number
  maxConcurrentIndividual: number
  recentActivity: Array<{
    id: string
    registrationType: string
    status: string
    queuePosition: number | null
    enteredQueueAt: string
    admittedAt: string | null
    expiresAt: string | null
    completedAt: string | null
  }>
}

export default function QueueSettingsPage() {
  const params = useParams()
  const { getToken } = useAuth()
  const eventId = params.eventId as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [settings, setSettings] = useState<QueueSettings | null>(null)
  const [stats, setStats] = useState<QueueStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Fetch settings and stats
  const fetchData = useCallback(async () => {
    try {
      const token = await getToken()
      const headers = { Authorization: `Bearer ${token}` }

      const [settingsRes, statsRes] = await Promise.all([
        fetch(`/api/admin/events/${eventId}/queue/settings`, { headers }),
        fetch(`/api/admin/events/${eventId}/queue/stats`, { headers }),
      ])

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json()
        setSettings(settingsData)
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }

      setError(null)
    } catch (err) {
      console.error('Error fetching queue data:', err)
      setError('Failed to load queue settings')
    } finally {
      setLoading(false)
    }
  }, [eventId, getToken])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-refresh stats every 10 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const token = await getToken()
        const res = await fetch(`/api/admin/events/${eventId}/queue/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
      } catch (err) {
        console.error('Error refreshing stats:', err)
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [eventId, getToken])

  // Save settings
  const handleSave = async () => {
    if (!settings) return

    setSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const token = await getToken()
      const res = await fetch(`/api/admin/events/${eventId}/queue/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      })

      if (!res.ok) {
        throw new Error('Failed to save settings')
      }

      const updatedSettings = await res.json()
      setSettings(updatedSettings)
      setSuccessMessage('Queue settings saved successfully!')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  // Clear stuck sessions
  const handleClearSessions = async () => {
    if (!confirm('Are you sure you want to clear all stuck sessions? This will admit the next people in line.')) {
      return
    }

    setClearing(true)
    setError(null)

    try {
      const token = await getToken()
      const res = await fetch(`/api/admin/events/${eventId}/queue/clear`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        throw new Error('Failed to clear sessions')
      }

      const result = await res.json()
      setSuccessMessage(`Cleared ${result.clearedSessions} sessions, admitted ${result.newlyAdmitted} users`)
      setTimeout(() => setSuccessMessage(null), 5000)

      // Refresh stats
      fetchData()
    } catch (err: any) {
      setError(err.message || 'Failed to clear sessions')
    } finally {
      setClearing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-navy" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-navy">Virtual Queue Settings</h1>
          <p className="text-gray-600">
            Manage high-traffic registration with a virtual waiting room
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-navy hover:bg-navy/90 text-white"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </Button>
      </div>

      {/* Status Messages */}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Enable Queue */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Queue Configuration
              </CardTitle>
              <CardDescription>
                Enable the virtual queue to manage high-traffic registration periods
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Enable Virtual Queue</Label>
                  <p className="text-sm text-gray-500">
                    When enabled, users will be placed in a queue during high traffic
                  </p>
                </div>
                <Switch
                  checked={settings?.queueEnabled || false}
                  onCheckedChange={(checked) =>
                    setSettings(s => s ? { ...s, queueEnabled: checked } : null)
                  }
                />
              </div>

              {/* Concurrent Limits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label>Max Concurrent Group Registrations</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={settings?.maxConcurrentGroup || 10}
                    onChange={(e) =>
                      setSettings(s => s ? { ...s, maxConcurrentGroup: parseInt(e.target.value) || 10 } : null)
                    }
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Recommended: 5-10 for group registrations
                  </p>
                </div>
                <div>
                  <Label>Max Concurrent Individual Registrations</Label>
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    value={settings?.maxConcurrentIndividual || 40}
                    onChange={(e) =>
                      setSettings(s => s ? { ...s, maxConcurrentIndividual: parseInt(e.target.value) || 40 } : null)
                    }
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Recommended: 20-40 for individual registrations
                  </p>
                </div>
              </div>

              {/* Session Timeouts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label>Group Session Timeout (seconds)</Label>
                  <Input
                    type="number"
                    min={60}
                    max={3600}
                    value={settings?.groupSessionTimeout || 600}
                    onChange={(e) =>
                      setSettings(s => s ? { ...s, groupSessionTimeout: parseInt(e.target.value) || 600 } : null)
                    }
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {Math.floor((settings?.groupSessionTimeout || 600) / 60)} minutes
                  </p>
                </div>
                <div>
                  <Label>Individual Session Timeout (seconds)</Label>
                  <Input
                    type="number"
                    min={60}
                    max={3600}
                    value={settings?.individualSessionTimeout || 420}
                    onChange={(e) =>
                      setSettings(s => s ? { ...s, individualSessionTimeout: parseInt(e.target.value) || 420 } : null)
                    }
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {Math.floor((settings?.individualSessionTimeout || 420) / 60)} minutes
                  </p>
                </div>
              </div>

              {/* Time Extension */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <Label className="text-base">Allow Time Extension</Label>
                    <p className="text-sm text-gray-500">
                      Let users request one additional time extension
                    </p>
                  </div>
                  <Switch
                    checked={settings?.allowTimeExtension ?? true}
                    onCheckedChange={(checked) =>
                      setSettings(s => s ? { ...s, allowTimeExtension: checked } : null)
                    }
                  />
                </div>
                {settings?.allowTimeExtension && (
                  <div>
                    <Label>Extension Duration (seconds)</Label>
                    <Input
                      type="number"
                      min={60}
                      max={1800}
                      value={settings?.extensionDuration || 300}
                      onChange={(e) =>
                        setSettings(s => s ? { ...s, extensionDuration: parseInt(e.target.value) || 300 } : null)
                      }
                      className="mt-1 max-w-[200px]"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {Math.floor((settings?.extensionDuration || 300) / 60)} minutes extra
                    </p>
                  </div>
                )}
              </div>

              {/* Schedule */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label>Queue Start Time (optional)</Label>
                  <Input
                    type="datetime-local"
                    value={settings?.queueStartTime ? new Date(settings.queueStartTime).toISOString().slice(0, 16) : ''}
                    onChange={(e) =>
                      setSettings(s => s ? { ...s, queueStartTime: e.target.value || null } : null)
                    }
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Auto-enable queue at this time
                  </p>
                </div>
                <div>
                  <Label>Queue End Time (optional)</Label>
                  <Input
                    type="datetime-local"
                    value={settings?.queueEndTime ? new Date(settings.queueEndTime).toISOString().slice(0, 16) : ''}
                    onChange={(e) =>
                      setSettings(s => s ? { ...s, queueEndTime: e.target.value || null } : null)
                    }
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Auto-disable queue after this time
                  </p>
                </div>
              </div>

              {/* Custom Message */}
              <div className="pt-4 border-t">
                <Label>Waiting Room Message (optional)</Label>
                <Textarea
                  value={settings?.waitingRoomMessage || ''}
                  onChange={(e) =>
                    setSettings(s => s ? { ...s, waitingRoomMessage: e.target.value || null } : null)
                  }
                  placeholder="Enter a custom message to display to users in the waiting room..."
                  className="mt-1"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Column */}
        <div className="space-y-6">
          {/* Live Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Live Queue Status
              </CardTitle>
              <CardDescription>
                Real-time queue monitoring (updates every 10s)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Group Stats */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-blue-900">Group Registration</span>
                  <Badge variant={stats?.activeGroupSessions === stats?.maxConcurrentGroup ? 'destructive' : 'secondary'}>
                    {stats?.activeGroupSessions || 0}/{stats?.maxConcurrentGroup || 10}
                  </Badge>
                </div>
                <div className="text-sm text-blue-700">
                  <div className="flex justify-between">
                    <span>Active Sessions:</span>
                    <span className="font-medium">{stats?.activeGroupSessions || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Waiting:</span>
                    <span className="font-medium">{stats?.waitingGroupUsers || 0}</span>
                  </div>
                </div>
              </div>

              {/* Individual Stats */}
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-green-900">Individual Registration</span>
                  <Badge variant={stats?.activeIndividualSessions === stats?.maxConcurrentIndividual ? 'destructive' : 'secondary'}>
                    {stats?.activeIndividualSessions || 0}/{stats?.maxConcurrentIndividual || 40}
                  </Badge>
                </div>
                <div className="text-sm text-green-700">
                  <div className="flex justify-between">
                    <span>Active Sessions:</span>
                    <span className="font-medium">{stats?.activeIndividualSessions || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Waiting:</span>
                    <span className="font-medium">{stats?.waitingIndividualUsers || 0}</span>
                  </div>
                </div>
              </div>

              {/* Queue Status */}
              <div className="pt-4 border-t">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      settings?.queueEnabled ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  />
                  <span className="text-sm">
                    Queue is {settings?.queueEnabled ? 'enabled' : 'disabled'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Queue Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={fetchData}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Stats
              </Button>

              <Button
                variant="destructive"
                className="w-full"
                onClick={handleClearSessions}
                disabled={clearing}
              >
                {clearing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Clearing...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Stuck Sessions
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-500 text-center">
                Clears expired sessions and admits next in line
              </p>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          {stats?.recentActivity && stats.recentActivity.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {stats.recentActivity.slice(0, 10).map((entry) => (
                    <div
                      key={entry.id}
                      className="text-xs flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <div>
                        <Badge variant="outline" className="text-[10px]">
                          {entry.registrationType}
                        </Badge>
                        <span className={`ml-2 ${
                          entry.status === 'active' ? 'text-green-600' :
                          entry.status === 'completed' ? 'text-blue-600' :
                          entry.status === 'waiting' ? 'text-orange-600' :
                          'text-gray-600'
                        }`}>
                          {entry.status}
                        </span>
                      </div>
                      {entry.queuePosition && (
                        <span className="text-gray-500">#{entry.queuePosition}</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
