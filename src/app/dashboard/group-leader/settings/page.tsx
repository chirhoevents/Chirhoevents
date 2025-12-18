'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  User,
  Bell,
  HelpCircle,
  Save,
  Copy,
  Check,
  BookOpen,
  Video,
  FileText,
  Mail,
  Download,
  Trash2,
  Lock,
  CheckCircle,
  Plus,
  X,
  Calendar,
  Link as LinkIcon,
  ChevronDown,
} from 'lucide-react'

interface UserInfo {
  name: string
  email: string
  phone: string
  groupName: string
  parishName: string | null
  dioceseName: string | null
  memberSince: string
}

interface LinkedEvent {
  id: string
  eventId: string
  accessCode: string
  eventName: string
  eventDates: string
  groupName: string
  linkedAt: string
}

interface UserPreferences {
  id: string
  phone: string | null
  profilePhotoUrl: string | null

  // Notification Settings
  emailRegistrationConfirmation: boolean
  emailPaymentReceived: boolean
  emailPaymentReminders: boolean
  emailPaymentOverdue: boolean
  emailRegistrationUpdated: boolean
  emailFormCompleted: boolean
  emailFormReminders: boolean
  emailAllFormsComplete: boolean
  emailFormEdited: boolean
  emailEventAnnouncements: boolean
  emailScheduleChanges: boolean
  emailDeadlines: boolean
  emailWeeklyUpdates: boolean
  emailParticipantAdded: boolean
  emailParticipantRemoved: boolean
  emailCertificateVerified: boolean
  emailNewsletter: boolean
  emailNewEvents: boolean
  emailTips: boolean
  notificationFrequency: string
  quietHoursEnabled: boolean
  quietHoursStart: string | null
  quietHoursEnd: string | null
}

export default function SettingsPage() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [linkedEvents, setLinkedEvents] = useState<LinkedEvent[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [copySuccess, setCopySuccess] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [activeTab, setActiveTab] = useState('account')

  // Add code state
  const [showAddCode, setShowAddCode] = useState(false)
  const [newAccessCode, setNewAccessCode] = useState('')
  const [addingCode, setAddingCode] = useState(false)
  const [addCodeError, setAddCodeError] = useState('')

  // Support form state
  const [supportSubject, setSupportSubject] = useState('')
  const [supportMessage, setSupportMessage] = useState('')
  const [includeContactInfo, setIncludeContactInfo] = useState(true)
  const [sendingSupport, setSendingSupport] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/group-leader/settings')
      if (response.ok) {
        const data = await response.json()
        setUserInfo(data.userInfo)
        setLinkedEvents(data.linkedEvents)
        setPreferences(data.preferences)
        // Set first event as selected if not already set
        if (data.linkedEvents.length > 0 && !selectedEventId) {
          setSelectedEventId(data.linkedEvents[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!preferences) return

    setSaving(true)
    try {
      const response = await fetch('/api/group-leader/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      })

      if (response.ok) {
        setSaveSuccess(true)
        setLastSaved(new Date())
        setTimeout(() => setSaveSuccess(false), 3000)
      }
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleAddCode = async () => {
    if (!newAccessCode.trim()) {
      setAddCodeError('Please enter an access code')
      return
    }

    setAddingCode(true)
    setAddCodeError('')

    try {
      const response = await fetch('/api/group-leader/settings/link-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode: newAccessCode.trim() }),
      })

      const data = await response.json()

      if (response.ok) {
        // Refresh the linked events
        await fetchSettings()
        setNewAccessCode('')
        setShowAddCode(false)
        alert('Access code linked successfully!')
      } else {
        setAddCodeError(data.error || 'Failed to link access code')
      }
    } catch (error) {
      console.error('Error adding code:', error)
      setAddCodeError('Failed to link access code')
    } finally {
      setAddingCode(false)
    }
  }

  const handleUnlinkCode = async (registrationId: string, eventName: string) => {
    if (!confirm(`Are you sure you want to unlink "${eventName}"? You will lose access to this event's dashboard.`)) {
      return
    }

    try {
      const response = await fetch('/api/group-leader/settings/unlink-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId }),
      })

      const data = await response.json()

      if (response.ok) {
        // Refresh the linked events
        await fetchSettings()
        alert('Event unlinked successfully')
      } else {
        alert(data.error || 'Failed to unlink event')
      }
    } catch (error) {
      console.error('Error unlinking code:', error)
      alert('Failed to unlink event')
    }
  }

  const handleSendSupportMessage = async () => {
    if (!supportSubject || !supportMessage) {
      alert('Please fill in both subject and message')
      return
    }

    setSendingSupport(true)
    try {
      const response = await fetch('/api/group-leader/support/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: supportSubject,
          message: supportMessage,
          includeContactInfo,
        }),
      })

      if (response.ok) {
        alert('Your message has been sent successfully!')
        setSupportSubject('')
        setSupportMessage('')
      }
    } catch (error) {
      console.error('Error sending support message:', error)
      alert('Failed to send message. Please try again.')
    } finally {
      setSendingSupport(false)
    }
  }

  const copyAccessCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopySuccess(code)
    setTimeout(() => setCopySuccess(null), 2000)
  }

  const updatePreference = (key: string, value: any) => {
    if (preferences) {
      setPreferences({ ...preferences, [key]: value })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-[#1E3A5F]">Loading settings...</div>
      </div>
    )
  }

  if (!preferences || !userInfo) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-600">Failed to load settings</div>
      </div>
    )
  }

  const selectedEvent = linkedEvents.find((e) => e.id === selectedEventId)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">
            Settings
          </h1>
          <div className="flex items-center space-x-3">
            {linkedEvents.length > 1 && (
              <div className="flex items-center space-x-2">
                <Label className="text-sm text-[#6B7280]">Event:</Label>
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                  <SelectTrigger className="w-[300px] bg-white border-[#D1D5DB]">
                    <SelectValue>
                      {selectedEvent ? (
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-[#9C8466]" />
                          <span className="font-medium">{selectedEvent.eventName}</span>
                          <span className="text-sm text-[#6B7280]">({selectedEvent.eventDates})</span>
                        </div>
                      ) : (
                        'Select event'
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {linkedEvents.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{event.eventName}</span>
                          <span className="text-sm text-[#6B7280]">{event.eventDates}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {linkedEvents.length === 1 && (
              <p className="text-[#6B7280]">
                Manage your account and notification preferences
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {lastSaved && (
            <span className="text-sm text-[#6B7280]">
              Last saved: {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#9C8466] hover:bg-[#8B7355] text-white"
          >
            {saving ? (
              <>Saving...</>
            ) : saveSuccess ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Saved
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white border border-[#D1D5DB] p-1">
          <TabsTrigger value="account" className="data-[state=active]:bg-[#9C8466] data-[state=active]:text-white">
            <User className="h-4 w-4 mr-2" />
            Account
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-[#9C8466] data-[state=active]:text-white">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="support" className="data-[state=active]:bg-[#9C8466] data-[state=active]:text-white">
            <HelpCircle className="h-4 w-4 mr-2" />
            Help & Support
          </TabsTrigger>
        </TabsList>

        {/* ACCOUNT TAB */}
        <TabsContent value="account" className="space-y-6">
          <Card className="p-6 bg-white border-[#D1D5DB]">
            <h2 className="text-xl font-semibold text-[#1E3A5F] mb-6">
              Account Information
            </h2>

            <div className="space-y-6">
              {/* Profile Photo */}
              <div>
                <Label className="text-[#1E3A5F]">Profile Photo</Label>
                <div className="flex items-center space-x-4 mt-2">
                  <div className="h-20 w-20 rounded-full bg-[#F5F1E8] flex items-center justify-center relative overflow-hidden">
                    {preferences.profilePhotoUrl ? (
                      <Image
                        src={preferences.profilePhotoUrl}
                        alt="Profile"
                        fill
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-10 w-10 text-[#9C8466]" />
                    )}
                  </div>
                  <div className="text-sm text-[#6B7280]">
                    <p>Profile photo management coming soon</p>
                  </div>
                </div>
              </div>

              {/* Name */}
              <div>
                <Label htmlFor="name" className="text-[#1E3A5F]">Name</Label>
                <Input
                  id="name"
                  value={userInfo.name}
                  disabled
                  className="mt-1 bg-[#F9FAFB]"
                />
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email" className="text-[#1E3A5F]">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={userInfo.email}
                  disabled
                  className="mt-1 bg-[#F9FAFB]"
                />
                <p className="text-sm text-amber-600 mt-1 flex items-center">
                  <span className="mr-1">⚠️</span>
                  Email is managed by your authentication provider
                </p>
              </div>

              {/* Phone */}
              <div>
                <Label htmlFor="phone" className="text-[#1E3A5F]">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={preferences.phone || ''}
                  onChange={(e) => updatePreference('phone', e.target.value)}
                  placeholder="(918) 555-1234"
                  className="mt-1"
                />
              </div>

              <div className="border-t border-[#D1D5DB] pt-6">
                <h3 className="text-lg font-semibold text-[#1E3A5F] mb-4">
                  Group/Organization Information
                </h3>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="groupName" className="text-[#1E3A5F]">Group Name</Label>
                    <Input
                      id="groupName"
                      value={userInfo.groupName}
                      disabled
                      className="mt-1 bg-[#F9FAFB]"
                    />
                  </div>

                  <div>
                    <Label htmlFor="parishName" className="text-[#1E3A5F]">Parish/Organization</Label>
                    <Input
                      id="parishName"
                      value={userInfo.parishName || ''}
                      disabled
                      className="mt-1 bg-[#F9FAFB]"
                    />
                  </div>

                  <div>
                    <Label htmlFor="diocese" className="text-[#1E3A5F]">Diocese</Label>
                    <Input
                      id="diocese"
                      value={userInfo.dioceseName || ''}
                      disabled
                      className="mt-1 bg-[#F9FAFB]"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-[#D1D5DB] pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-[#1E3A5F]">
                      Linked Events
                    </h3>
                    <p className="text-sm text-[#6B7280]">
                      Manage your event access codes
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowAddCode(true)}
                    className="bg-[#9C8466] hover:bg-[#8B7355] text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Event Code
                  </Button>
                </div>

                {showAddCode && (
                  <Card className="p-4 mb-4 bg-[#F5F1E8] border-[#9C8466]">
                    <Label htmlFor="newCode" className="text-[#1E3A5F]">
                      Enter Access Code
                    </Label>
                    <div className="flex items-center space-x-2 mt-2">
                      <Input
                        id="newCode"
                        value={newAccessCode}
                        onChange={(e) => {
                          setNewAccessCode(e.target.value.toUpperCase())
                          setAddCodeError('')
                        }}
                        placeholder="ABC-XYZ-123"
                        className="flex-1"
                        disabled={addingCode}
                      />
                      <Button
                        onClick={handleAddCode}
                        disabled={addingCode || !newAccessCode.trim()}
                        className="bg-[#9C8466] hover:bg-[#8B7355] text-white"
                      >
                        {addingCode ? 'Adding...' : 'Link Code'}
                      </Button>
                      <Button
                        onClick={() => {
                          setShowAddCode(false)
                          setNewAccessCode('')
                          setAddCodeError('')
                        }}
                        variant="outline"
                        disabled={addingCode}
                      >
                        Cancel
                      </Button>
                    </div>
                    {addCodeError && (
                      <p className="text-sm text-red-600 mt-2">{addCodeError}</p>
                    )}
                  </Card>
                )}

                <div className="space-y-3">
                  {linkedEvents.map((event) => (
                    <Card key={event.id} className="p-4 bg-white border-[#D1D5DB]">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Calendar className="h-5 w-5 text-[#9C8466]" />
                            <h4 className="font-semibold text-[#1E3A5F]">{event.eventName}</h4>
                          </div>
                          <div className="space-y-1 text-sm text-[#6B7280]">
                            <p><strong>Dates:</strong> {event.eventDates}</p>
                            <p><strong>Group:</strong> {event.groupName}</p>
                            <div className="flex items-center space-x-2">
                              <strong>Access Code:</strong>
                              <code className="font-mono bg-[#F9FAFB] px-2 py-1 rounded border border-[#E5E7EB]">
                                {event.accessCode}
                              </code>
                              <Button
                                onClick={() => copyAccessCode(event.accessCode)}
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2"
                              >
                                {copySuccess === event.accessCode ? (
                                  <Check className="h-3 w-3 text-green-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                            <p className="text-xs">
                              Linked: {new Date(event.linkedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleUnlinkCode(event.id, event.eventName)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Unlink
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>

                {linkedEvents.length === 0 && (
                  <div className="text-center py-8 text-[#6B7280]">
                    <LinkIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No events linked yet</p>
                    <p className="text-sm">Add an access code to get started</p>
                  </div>
                )}
              </div>

              <div className="border-t border-[#D1D5DB] pt-6">
                <h3 className="text-lg font-semibold text-[#1E3A5F] mb-4">
                  Account Details
                </h3>

                <div className="space-y-3">
                  <div>
                    <Label className="text-[#1E3A5F]">Role</Label>
                    <p className="text-[#1F2937] mt-1">Group Leader</p>
                  </div>

                  <div>
                    <Label className="text-[#1E3A5F]">Member Since</Label>
                    <p className="text-[#1F2937] mt-1">
                      {new Date(userInfo.memberSince).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>

                  <div>
                    <Label className="text-[#1E3A5F]">Total Linked Events</Label>
                    <p className="text-[#1F2937] mt-1">{linkedEvents.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* NOTIFICATIONS TAB */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="p-6 bg-white border-[#D1D5DB]">
            <h2 className="text-xl font-semibold text-[#1E3A5F] mb-2">
              Email Notifications
            </h2>
            <p className="text-[#6B7280] mb-6">
              Manage what email notifications you receive
            </p>

            <div className="space-y-6">
              {/* Registration & Payment */}
              <div>
                <h3 className="font-semibold text-[#1E3A5F] mb-3">Registration & Payment</h3>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <Checkbox
                      checked={preferences.emailRegistrationConfirmation}
                      onCheckedChange={(checked) =>
                        updatePreference('emailRegistrationConfirmation', checked)
                      }
                    />
                    <span className="ml-2 text-[#1F2937]">Registration confirmation</span>
                  </label>
                  <label className="flex items-center">
                    <Checkbox
                      checked={preferences.emailPaymentReceived}
                      onCheckedChange={(checked) =>
                        updatePreference('emailPaymentReceived', checked)
                      }
                    />
                    <span className="ml-2 text-[#1F2937]">Payment received</span>
                  </label>
                  <label className="flex items-center">
                    <Checkbox
                      checked={preferences.emailPaymentReminders}
                      onCheckedChange={(checked) =>
                        updatePreference('emailPaymentReminders', checked)
                      }
                    />
                    <span className="ml-2 text-[#1F2937]">Payment reminders (balance due)</span>
                  </label>
                  <label className="flex items-center">
                    <Checkbox
                      checked={preferences.emailPaymentOverdue}
                      onCheckedChange={(checked) =>
                        updatePreference('emailPaymentOverdue', checked)
                      }
                    />
                    <span className="ml-2 text-[#1F2937]">Payment overdue notices</span>
                  </label>
                  <label className="flex items-center">
                    <Checkbox
                      checked={preferences.emailRegistrationUpdated}
                      onCheckedChange={(checked) =>
                        updatePreference('emailRegistrationUpdated', checked)
                      }
                    />
                    <span className="ml-2 text-[#1F2937]">Registration updated by admin</span>
                  </label>
                </div>
              </div>

              {/* Liability Forms */}
              <div className="border-t border-[#D1D5DB] pt-6">
                <h3 className="font-semibold text-[#1E3A5F] mb-3">Liability Forms</h3>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <Checkbox
                      checked={preferences.emailFormCompleted}
                      onCheckedChange={(checked) =>
                        updatePreference('emailFormCompleted', checked)
                      }
                    />
                    <span className="ml-2 text-[#1F2937]">Form completed by participant</span>
                  </label>
                  <label className="flex items-center">
                    <Checkbox
                      checked={preferences.emailFormReminders}
                      onCheckedChange={(checked) =>
                        updatePreference('emailFormReminders', checked)
                      }
                    />
                    <span className="ml-2 text-[#1F2937]">Form reminders (incomplete forms)</span>
                  </label>
                  <label className="flex items-center">
                    <Checkbox
                      checked={preferences.emailAllFormsComplete}
                      onCheckedChange={(checked) =>
                        updatePreference('emailAllFormsComplete', checked)
                      }
                    />
                    <span className="ml-2 text-[#1F2937]">All forms completed celebration</span>
                  </label>
                  <label className="flex items-center">
                    <Checkbox
                      checked={preferences.emailFormEdited}
                      onCheckedChange={(checked) =>
                        updatePreference('emailFormEdited', checked)
                      }
                    />
                    <span className="ml-2 text-[#1F2937]">Form edited by admin</span>
                  </label>
                </div>
              </div>

              {/* Event Updates */}
              <div className="border-t border-[#D1D5DB] pt-6">
                <h3 className="font-semibold text-[#1E3A5F] mb-3">Event Updates</h3>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <Checkbox
                      checked={preferences.emailEventAnnouncements}
                      onCheckedChange={(checked) =>
                        updatePreference('emailEventAnnouncements', checked)
                      }
                    />
                    <span className="ml-2 text-[#1F2937]">Event announcements from organizers</span>
                  </label>
                  <label className="flex items-center">
                    <Checkbox
                      checked={preferences.emailScheduleChanges}
                      onCheckedChange={(checked) =>
                        updatePreference('emailScheduleChanges', checked)
                      }
                    />
                    <span className="ml-2 text-[#1F2937]">Schedule changes</span>
                  </label>
                  <label className="flex items-center">
                    <Checkbox
                      checked={preferences.emailDeadlines}
                      onCheckedChange={(checked) =>
                        updatePreference('emailDeadlines', checked)
                      }
                    />
                    <span className="ml-2 text-[#1F2937]">Important deadlines (registration close, etc.)</span>
                  </label>
                  <label className="flex items-center">
                    <Checkbox
                      checked={preferences.emailWeeklyUpdates}
                      onCheckedChange={(checked) =>
                        updatePreference('emailWeeklyUpdates', checked)
                      }
                    />
                    <span className="ml-2 text-[#1F2937]">Weekly event updates</span>
                  </label>
                </div>
              </div>

              {/* Participants */}
              <div className="border-t border-[#D1D5DB] pt-6">
                <h3 className="font-semibold text-[#1E3A5F] mb-3">Participants</h3>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <Checkbox
                      checked={preferences.emailParticipantAdded}
                      onCheckedChange={(checked) =>
                        updatePreference('emailParticipantAdded', checked)
                      }
                    />
                    <span className="ml-2 text-[#1F2937]">New participant added</span>
                  </label>
                  <label className="flex items-center">
                    <Checkbox
                      checked={preferences.emailParticipantRemoved}
                      onCheckedChange={(checked) =>
                        updatePreference('emailParticipantRemoved', checked)
                      }
                    />
                    <span className="ml-2 text-[#1F2937]">Participant removed</span>
                  </label>
                  <label className="flex items-center">
                    <Checkbox
                      checked={preferences.emailCertificateVerified}
                      onCheckedChange={(checked) =>
                        updatePreference('emailCertificateVerified', checked)
                      }
                    />
                    <span className="ml-2 text-[#1F2937]">Certificate uploaded/verified</span>
                  </label>
                </div>
              </div>

              {/* Marketing & Updates */}
              <div className="border-t border-[#D1D5DB] pt-6">
                <h3 className="font-semibold text-[#1E3A5F] mb-3">Marketing & Updates</h3>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <Checkbox
                      checked={preferences.emailNewsletter}
                      onCheckedChange={(checked) =>
                        updatePreference('emailNewsletter', checked)
                      }
                    />
                    <span className="ml-2 text-[#1F2937]">ChiRho Events newsletter</span>
                  </label>
                  <label className="flex items-center">
                    <Checkbox
                      checked={preferences.emailNewEvents}
                      onCheckedChange={(checked) =>
                        updatePreference('emailNewEvents', checked)
                      }
                    />
                    <span className="ml-2 text-[#1F2937]">New event announcements</span>
                  </label>
                  <label className="flex items-center">
                    <Checkbox
                      checked={preferences.emailTips}
                      onCheckedChange={(checked) =>
                        updatePreference('emailTips', checked)
                      }
                    />
                    <span className="ml-2 text-[#1F2937]">Tips for group leaders</span>
                  </label>
                </div>
              </div>

              {/* Notification Delivery */}
              <div className="border-t border-[#D1D5DB] pt-6">
                <h3 className="font-semibold text-[#1E3A5F] mb-3">Notification Delivery</h3>

                <div className="space-y-4">
                  <div>
                    <Label className="text-[#1E3A5F]">Send notifications to</Label>
                    <Input
                      value={userInfo.email}
                      disabled
                      className="mt-1 bg-[#F9FAFB]"
                    />
                  </div>

                  <div>
                    <Label className="text-[#1E3A5F]">Notification Frequency</Label>
                    <div className="space-y-2 mt-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="notificationFrequency"
                          value="realtime"
                          checked={preferences.notificationFrequency === 'realtime'}
                          onChange={(e) => updatePreference('notificationFrequency', e.target.value)}
                          className="mr-2"
                        />
                        <span className="text-[#1F2937]">Real-time (as they happen)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="notificationFrequency"
                          value="daily"
                          checked={preferences.notificationFrequency === 'daily'}
                          onChange={(e) => updatePreference('notificationFrequency', e.target.value)}
                          className="mr-2"
                        />
                        <span className="text-[#1F2937]">Daily digest (one email per day)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="notificationFrequency"
                          value="weekly"
                          checked={preferences.notificationFrequency === 'weekly'}
                          onChange={(e) => updatePreference('notificationFrequency', e.target.value)}
                          className="mr-2"
                        />
                        <span className="text-[#1F2937]">Weekly digest (one email per week)</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center">
                      <Checkbox
                        checked={preferences.quietHoursEnabled}
                        onCheckedChange={(checked) =>
                          updatePreference('quietHoursEnabled', checked)
                        }
                      />
                      <span className="ml-2 text-[#1F2937] font-medium">Enable Quiet Hours</span>
                    </label>
                    {preferences.quietHoursEnabled && (
                      <div className="flex items-center space-x-2 mt-3 ml-6">
                        <span className="text-sm text-[#6B7280]">Don&apos;t send notifications between</span>
                        <Input
                          type="time"
                          value={preferences.quietHoursStart || '22:00'}
                          onChange={(e) => updatePreference('quietHoursStart', e.target.value)}
                          className="w-32"
                        />
                        <span className="text-sm text-[#6B7280]">and</span>
                        <Input
                          type="time"
                          value={preferences.quietHoursEnd || '07:00'}
                          onChange={(e) => updatePreference('quietHoursEnd', e.target.value)}
                          className="w-32"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* HELP & SUPPORT TAB */}
        <TabsContent value="support" className="space-y-6">
          <Card className="p-6 bg-white border-[#D1D5DB]">
            <h2 className="text-xl font-semibold text-[#1E3A5F] mb-6">
              Help & Support
            </h2>

            <div className="space-y-6">
              {/* Quick Links */}
              <div>
                <h3 className="font-semibold text-[#1E3A5F] mb-4">Quick Links</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="border-[#1E3A5F] text-[#1E3A5F] justify-start h-auto py-3"
                    disabled
                  >
                    <BookOpen className="h-5 w-5 mr-3" />
                    <div className="text-left">
                      <div className="font-medium">User Guide</div>
                      <div className="text-xs text-[#6B7280]">How to use your dashboard</div>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="border-[#1E3A5F] text-[#1E3A5F] justify-start h-auto py-3"
                    disabled
                  >
                    <HelpCircle className="h-5 w-5 mr-3" />
                    <div className="text-left">
                      <div className="font-medium">FAQs</div>
                      <div className="text-xs text-[#6B7280]">Frequently asked questions</div>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="border-[#1E3A5F] text-[#1E3A5F] justify-start h-auto py-3"
                    disabled
                  >
                    <Video className="h-5 w-5 mr-3" />
                    <div className="text-left">
                      <div className="font-medium">Video Tutorials</div>
                      <div className="text-xs text-[#6B7280]">Watch how-to videos</div>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="border-[#1E3A5F] text-[#1E3A5F] justify-start h-auto py-3"
                    disabled
                  >
                    <FileText className="h-5 w-5 mr-3" />
                    <div className="text-left">
                      <div className="font-medium">Documentation</div>
                      <div className="text-xs text-[#6B7280]">Complete platform docs</div>
                    </div>
                  </Button>
                </div>
              </div>

              {/* Contact Support */}
              <div className="border-t border-[#D1D5DB] pt-6">
                <h3 className="font-semibold text-[#1E3A5F] mb-2">Contact Support</h3>
                <p className="text-sm text-[#6B7280] mb-4">
                  Need help? Send a message to the ChiRho Events support team:
                </p>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="supportSubject" className="text-[#1E3A5F]">Subject</Label>
                    <Input
                      id="supportSubject"
                      value={supportSubject}
                      onChange={(e) => setSupportSubject(e.target.value)}
                      placeholder="Brief description of your question or issue"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="supportMessage" className="text-[#1E3A5F]">Message</Label>
                    <Textarea
                      id="supportMessage"
                      value={supportMessage}
                      onChange={(e) => setSupportMessage(e.target.value)}
                      placeholder="Describe your question or issue in detail..."
                      rows={6}
                      className="mt-1"
                    />
                  </div>

                  <label className="flex items-center">
                    <Checkbox
                      checked={includeContactInfo}
                      onCheckedChange={(checked) => setIncludeContactInfo(!!checked)}
                    />
                    <span className="ml-2 text-[#1F2937]">Include my contact information</span>
                  </label>

                  <Button
                    onClick={handleSendSupportMessage}
                    disabled={sendingSupport || !supportSubject || !supportMessage}
                    className="bg-[#9C8466] hover:bg-[#8B7355] text-white"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {sendingSupport ? 'Sending...' : 'Send Message'}
                  </Button>

                  <p className="text-sm text-[#6B7280]">
                    Response time: Usually within 24 hours
                  </p>
                </div>
              </div>

              {/* Technical Support */}
              <div className="border-t border-[#D1D5DB] pt-6">
                <h3 className="font-semibold text-[#1E3A5F] mb-4">Technical Support</h3>

                <div className="bg-[#F5F1E8] p-4 rounded-lg mb-4">
                  <p className="text-sm font-medium text-[#1E3A5F]">ChiRho Events Platform Support</p>
                  <p className="text-sm text-[#6B7280] mt-1">Email: support@chirhoevents.com</p>
                  <p className="text-sm text-[#6B7280]">Hours: Mon-Fri, 9am-5pm Central</p>
                </div>
              </div>

              {/* Account Management */}
              <div className="border-t border-[#D1D5DB] pt-6">
                <h3 className="font-semibold text-[#1E3A5F] mb-4">Account Management</h3>

                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full border-[#1E3A5F] text-[#1E3A5F] justify-start"
                    disabled
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Change Password (via Clerk)
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-[#1E3A5F] text-[#1E3A5F] justify-start"
                    disabled
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Update Email (via Clerk)
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-[#1E3A5F] text-[#1E3A5F] justify-start"
                    disabled
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download My Data (GDPR)
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-red-500 text-red-500 justify-start"
                    disabled
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account ⚠️ Permanent action
                  </Button>
                </div>
              </div>

              {/* System Information */}
              <div className="border-t border-[#D1D5DB] pt-6">
                <h3 className="font-semibold text-[#1E3A5F] mb-4">System Information</h3>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[#6B7280]">Platform Version</p>
                    <p className="text-[#1F2937] font-medium">1.0.0</p>
                  </div>
                  <div>
                    <p className="text-[#6B7280]">Last Updated</p>
                    <p className="text-[#1F2937] font-medium">December 16, 2025</p>
                  </div>
                  <div>
                    <p className="text-[#6B7280]">Status</p>
                    <p className="text-green-600 font-medium flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      All systems operational
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
