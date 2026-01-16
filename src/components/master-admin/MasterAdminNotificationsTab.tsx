'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Mail, Send, Loader2, Calendar, Plus, X } from 'lucide-react'
import { toast } from '@/lib/toast'

interface MasterDigestSettings {
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

export default function MasterAdminNotificationsTab() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [settings, setSettings] = useState<MasterDigestSettings>({
    enabled: false,
    recipients: [],
    dayOfWeek: 0,
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/master-admin/settings/notifications')
      if (!response.ok) throw new Error('Failed to fetch settings')

      const data = await response.json()
      setSettings(data.masterDigest || {
        enabled: false,
        recipients: [],
        dayOfWeek: 0,
      })
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
      const response = await fetch('/api/master-admin/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masterDigest: settings }),
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
      toast.error('Please add at least one recipient first')
      return
    }

    setSendingTest(true)
    try {
      const response = await fetch('/api/master-admin/settings/notifications', {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Failed to send test digest')

      const result = await response.json()
      toast.success(`Test digest sent to ${result.sentCount || 0} recipient(s)`)
    } catch (error) {
      console.error('Error sending test digest:', error)
      toast.error('Failed to send test digest')
    } finally {
      setSendingTest(false)
    }
  }

  const addRecipient = () => {
    if (!newEmail || !newEmail.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }
    if (settings.recipients.includes(newEmail)) {
      toast.error('This email is already added')
      return
    }
    setSettings(prev => ({
      ...prev,
      recipients: [...prev.recipients, newEmail],
    }))
    setNewEmail('')
  }

  const removeRecipient = (email: string) => {
    setSettings(prev => ({
      ...prev,
      recipients: prev.recipients.filter(r => r !== email),
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Weekly Digest Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Mail className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle>Master Admin Weekly Digest</CardTitle>
              <CardDescription>
                Receive a weekly summary of platform-wide support tickets, organization requests, and financial data
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

              {/* Recipients */}
              <div className="space-y-3">
                <Label>Recipients</Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addRecipient()}
                  />
                  <Button onClick={addRecipient} variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {settings.recipients.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {settings.recipients.map(email => (
                      <Badge key={email} variant="secondary" className="py-1 px-3">
                        {email}
                        <button
                          onClick={() => removeRecipient(email)}
                          className="ml-2 hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* What's Included Info */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-medium text-purple-900 mb-2">What&apos;s included in the master admin digest:</h4>
                <ul className="text-sm text-purple-800 space-y-1">
                  <li>&#8226; Open support tickets summary</li>
                  <li>&#8226; New organization requests</li>
                  <li>&#8226; Platform-wide revenue and financials</li>
                  <li>&#8226; Active organizations overview</li>
                  <li>&#8226; System health and pending items</li>
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={handleSendTest}
          disabled={sendingTest || !settings.enabled || settings.recipients.length === 0}
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
          className="bg-purple-600 hover:bg-purple-700"
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
