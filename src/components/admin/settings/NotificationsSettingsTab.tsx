'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Mail, Send, Loader2, CheckCircle, AlertCircle, Calendar, Users } from 'lucide-react'
import { toast } from '@/lib/toast'

interface Recipient {
  id: string
  email: string
  firstName: string
  lastName: string
}

interface WeeklyDigestSettings {
  enabled: boolean
  recipients: string[]
  dayOfWeek: number
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

export default function NotificationsSettingsTab() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [availableRecipients, setAvailableRecipients] = useState<Recipient[]>([])
  const [settings, setSettings] = useState<WeeklyDigestSettings>({
    enabled: false,
    recipients: [],
    dayOfWeek: 0,
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings/notifications')
      if (!response.ok) throw new Error('Failed to fetch settings')

      const data = await response.json()
      setSettings(data.weeklyDigest)
      setAvailableRecipients(data.availableRecipients)
    } catch (error) {
      console.error('Error fetching notification settings:', error)
      toast.error('Failed to load notification settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weeklyDigest: settings }),
      })

      if (!response.ok) throw new Error('Failed to save settings')

      toast.success('Notification settings saved successfully')
    } catch (error) {
      console.error('Error saving notification settings:', error)
      toast.error('Failed to save notification settings')
    } finally {
      setSaving(false)
    }
  }

  const handleSendTest = async () => {
    if (settings.recipients.length === 0) {
      toast.error('Please select at least one recipient first')
      return
    }

    setSendingTest(true)
    try {
      const response = await fetch('/api/admin/settings/notifications', {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Failed to send test digest')

      const result = await response.json()
      toast.success(`Test digest sent to ${result.results?.[0]?.recipients || 0} recipient(s)`)
    } catch (error) {
      console.error('Error sending test digest:', error)
      toast.error('Failed to send test digest')
    } finally {
      setSendingTest(false)
    }
  }

  const toggleRecipient = (email: string) => {
    setSettings(prev => ({
      ...prev,
      recipients: prev.recipients.includes(email)
        ? prev.recipients.filter(r => r !== email)
        : [...prev.recipients, email],
    }))
  }

  const selectAllRecipients = () => {
    setSettings(prev => ({
      ...prev,
      recipients: availableRecipients.map(r => r.email),
    }))
  }

  const clearAllRecipients = () => {
    setSettings(prev => ({
      ...prev,
      recipients: [],
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#1E3A5F]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Weekly Digest Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#1E3A5F]/10 rounded-lg">
              <Mail className="h-5 w-5 text-[#1E3A5F]" />
            </div>
            <div>
              <CardTitle>Weekly Email Digest</CardTitle>
              <CardDescription>
                Receive a weekly summary of registrations, revenue, tickets, and action items
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Switch
                id="digest-enabled"
                checked={settings.enabled}
                onCheckedChange={(checked) =>
                  setSettings(prev => ({ ...prev, enabled: checked }))
                }
              />
              <Label htmlFor="digest-enabled" className="font-medium cursor-pointer">
                Enable Weekly Digest
              </Label>
            </div>
            <Badge
              variant={settings.enabled ? 'default' : 'secondary'}
              className={settings.enabled ? 'bg-green-600 text-white' : ''}
            >
              {settings.enabled ? 'Active' : 'Disabled'}
            </Badge>
          </div>

          {settings.enabled && (
            <>
              {/* Day of Week Selection */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <Label>Send digest on</Label>
                </div>
                <Select
                  value={settings.dayOfWeek.toString()}
                  onValueChange={(value) =>
                    setSettings(prev => ({ ...prev, dayOfWeek: parseInt(value) }))
                  }
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map(day => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">
                  The digest will be sent early morning (around 6 AM) on the selected day
                </p>
              </div>

              {/* Recipients Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <Label>Recipients</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAllRecipients}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearAllRecipients}
                    >
                      Clear
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
                  {availableRecipients.map(recipient => (
                    <div
                      key={recipient.id}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleRecipient(recipient.email)}
                    >
                      <Checkbox
                        checked={settings.recipients.includes(recipient.email)}
                        onCheckedChange={() => toggleRecipient(recipient.email)}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {recipient.firstName} {recipient.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{recipient.email}</p>
                      </div>
                      {settings.recipients.includes(recipient.email) && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                  ))}

                  {availableRecipients.length === 0 && (
                    <div className="p-4 text-center text-gray-500">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p>No admin users found</p>
                    </div>
                  )}
                </div>

                {settings.recipients.length > 0 && (
                  <p className="text-sm text-gray-600">
                    <strong>{settings.recipients.length}</strong> recipient(s) selected
                  </p>
                )}
              </div>

              {/* What's Included Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">What&apos;s included in the digest:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Revenue summary (weekly + total)</li>
                  <li>• Upcoming events with registration counts</li>
                  <li>• Registration and participant stats</li>
                  <li>• Form completion status</li>
                  <li>• Pending payments and overdue balances</li>
                  <li>• Action items requiring attention</li>
                  <li>• Recent activity (payments, registrations)</li>
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <Button
          onClick={handleSendTest}
          disabled={sendingTest || !settings.enabled || settings.recipients.length === 0}
          className="bg-[#1E3A5F] hover:bg-[#2d5a8c] text-white"
        >
          {sendingTest ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send Test Digest Now
            </>
          )}
        </Button>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#1E3A5F] hover:bg-[#2d5a8c] text-white"
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
    </div>
  )
}
