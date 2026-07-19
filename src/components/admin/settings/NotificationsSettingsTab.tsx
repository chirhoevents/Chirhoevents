'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Mail, Send, Loader2, CheckCircle, AlertCircle, Users, BellOff, Forward } from 'lucide-react'
import { toast } from '@/lib/toast'

interface Recipient {
  id: string
  email: string
  firstName: string
  lastName: string
}

interface WeeklyDigestSettings {
  disabled: boolean
  recipients: string[]
}

interface UpdateEmailSettings {
  disabled: boolean
}

export default function NotificationsSettingsTab() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [availableRecipients, setAvailableRecipients] = useState<Recipient[]>([])
  const [settings, setSettings] = useState<WeeklyDigestSettings>({
    disabled: false,
    recipients: [],
  })
  const [updateEmailSettings, setUpdateEmailSettings] = useState<UpdateEmailSettings>({
    disabled: false,
  })
  const [adHocRecipients, setAdHocRecipients] = useState('')
  const [sendingAdHoc, setSendingAdHoc] = useState(false)

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
      if (data.updateEmails) {
        setUpdateEmailSettings(data.updateEmails)
      }
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
        body: JSON.stringify({ weeklyDigest: settings, updateEmails: updateEmailSettings }),
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
    if (settings.recipients.length === 0 && availableRecipients.length === 0) {
      toast.error('No admin users found to send to')
      return
    }

    setSendingTest(true)
    try {
      const response = await fetch('/api/admin/settings/notifications', {
        method: 'POST',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.error || 'Failed to send test digest')
      }

      const sent: number = result.results?.[0]?.recipients || 0
      const failures: { email: string; error: string }[] = result.failures || []

      if (sent === 0) {
        const detail = failures[0]?.error ? `: ${failures[0].error}` : ''
        toast.error(`Test digest failed to send${detail}`)
      } else if (failures.length > 0) {
        toast.success(`Test digest sent to ${sent} recipient(s) — ${failures.length} failed`)
      } else {
        toast.success(`Test digest sent to ${sent} recipient(s)`)
      }
    } catch (error) {
      console.error('Error sending test digest:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to send test digest')
    } finally {
      setSendingTest(false)
    }
  }

  const handleSendAdHoc = async () => {
    const emails = adHocRecipients
      .split(/[,\s;]+/)
      .map(e => e.trim())
      .filter(Boolean)

    if (emails.length === 0) {
      toast.error('Enter at least one email address')
      return
    }

    setSendingAdHoc(true)
    try {
      const response = await fetch('/api/admin/settings/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients: emails, asTest: false }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.error || 'Failed to send digest')
      }

      const sent: number = result.results?.[0]?.recipients || 0
      const failures: { email: string; error: string }[] = result.failures || []

      if (sent === 0) {
        const detail = failures[0]?.error ? `: ${failures[0].error}` : ''
        toast.error(`Digest failed to send${detail}`)
      } else if (failures.length > 0) {
        toast.success(`Digest sent to ${sent} recipient(s) — ${failures.length} failed`)
      } else {
        toast.success(`Digest sent to ${sent} recipient(s)`)
        setAdHocRecipients('')
      }
    } catch (error) {
      console.error('Error sending ad-hoc digest:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to send digest')
    } finally {
      setSendingAdHoc(false)
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
                Sends every <strong>Monday around 10 AM Eastern</strong> with the past week&apos;s registrations, revenue, waitlist activity, and action items. On by default &mdash; turn off below if you don&apos;t want it.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Turn Off Toggle (opt-out) */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Switch
                id="digest-disabled"
                checked={settings.disabled}
                onCheckedChange={(checked) =>
                  setSettings(prev => ({ ...prev, disabled: checked }))
                }
              />
              <Label htmlFor="digest-disabled" className="font-medium cursor-pointer">
                Turn off the weekly digest
              </Label>
            </div>
            <Badge
              variant={settings.disabled ? 'destructive' : 'default'}
              className={settings.disabled ? '' : 'bg-green-600 text-white'}
            >
              {settings.disabled ? 'Off' : 'On &mdash; Mondays'}
            </Badge>
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
                  disabled={settings.disabled}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllRecipients}
                  disabled={settings.disabled}
                >
                  Clear
                </Button>
              </div>
            </div>

            <p className="text-sm text-gray-500">
              Leave everyone unchecked to send to all admins on your organization; check individual people to limit who gets it.
            </p>

            <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
              {availableRecipients.map(recipient => (
                <div
                  key={recipient.id}
                  className={`flex items-center gap-3 p-3 hover:bg-gray-50 ${settings.disabled ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
                  onClick={() => !settings.disabled && toggleRecipient(recipient.email)}
                >
                  <Checkbox
                    checked={settings.recipients.includes(recipient.email)}
                    onCheckedChange={() => toggleRecipient(recipient.email)}
                    disabled={settings.disabled}
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
              <li>• Upcoming events with registration and waitlist counts</li>
              <li>• Waitlist activity (new signups, invites, conversions)</li>
              <li>• Registration and participant stats</li>
              <li>• Form completion status</li>
              <li>• Pending payments and overdue balances</li>
              <li>• Action items requiring attention</li>
              <li>• Recent activity (payments, registrations)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Send Digest Now Card (ad-hoc) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#1E3A5F]/10 rounded-lg">
              <Forward className="h-5 w-5 text-[#1E3A5F]" />
            </div>
            <div>
              <CardTitle>Send Digest Now</CardTitle>
              <CardDescription>
                Send the current week&apos;s digest immediately to specific people. Useful for one-off shares or to preview the live layout.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ad-hoc-recipients">Recipient email(s)</Label>
            <Input
              id="ad-hoc-recipients"
              placeholder="alice@example.com, bob@example.com"
              value={adHocRecipients}
              onChange={(e) => setAdHocRecipients(e.target.value)}
              disabled={sendingAdHoc}
            />
            <p className="text-sm text-gray-500">
              Separate multiple emails with commas. Uses the most recent 7 days of data.
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleSendAdHoc}
              disabled={sendingAdHoc || adHocRecipients.trim().length === 0}
              className="bg-[#1E3A5F] hover:bg-[#2d5a8c] text-white"
            >
              {sendingAdHoc ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Digest Now
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Participant Update Emails Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#1E3A5F]/10 rounded-lg">
              <BellOff className="h-5 w-5 text-[#1E3A5F]" />
            </div>
            <div>
              <CardTitle>Participant Update Emails</CardTitle>
              <CardDescription>
                Control whether group leaders receive email notifications when participant information is updated by an admin
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Switch
                id="update-emails-disabled"
                checked={updateEmailSettings.disabled}
                onCheckedChange={(checked) =>
                  setUpdateEmailSettings({ disabled: checked })
                }
              />
              <div>
                <Label htmlFor="update-emails-disabled" className="font-medium cursor-pointer">
                  Disable participant update emails
                </Label>
                <p className="text-sm text-gray-500 mt-0.5">
                  When enabled, group leaders will not receive emails when participant details are edited
                </p>
              </div>
            </div>
            <Badge
              variant={updateEmailSettings.disabled ? 'destructive' : 'secondary'}
              className={updateEmailSettings.disabled ? '' : 'bg-green-100 text-green-800'}
            >
              {updateEmailSettings.disabled ? 'Emails Off' : 'Emails On'}
            </Badge>
          </div>

          {updateEmailSettings.disabled && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
              <strong>Note:</strong> Group leaders will not be notified by email when participant information is updated. This is useful when performing bulk updates across many participants.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <Button
          onClick={handleSendTest}
          disabled={sendingTest || settings.disabled || (settings.recipients.length === 0 && availableRecipients.length === 0)}
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
