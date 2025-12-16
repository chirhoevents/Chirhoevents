'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Settings,
  User,
  Bell,
  Monitor,
  HelpCircle,
  Save,
  RotateCcw,
  Upload,
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
} from 'lucide-react'

interface UserInfo {
  name: string
  email: string
  phone: string
  groupName: string
  parishName: string | null
  dioceseName: string | null
  accessCode: string
  eventName: string
  memberSince: string
}

interface UserPreferences {
  id: string
  // Account Settings
  phone: string | null
  profilePhotoUrl: string | null
  groupNameDefault: string | null
  parishNameDefault: string | null
  dioceseDefault: string | null
  mailingAddress: any
  billingAddress: any

  // Registration Preferences
  primaryContactName: string | null
  primaryContactPhone: string | null
  primaryContactEmail: string | null
  secondaryContactName: string | null
  secondaryContactPhone: string | null
  secondaryContactEmail: string | null
  preferredPaymentMethod: string | null
  preferredHousingType: string | null
  specialRequestsDefault: string | null

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
  smsEnabled: boolean
  smsPaymentReminders: boolean
  smsUrgentUpdates: boolean
  smsPaymentReceived: boolean

  // Display Preferences
  dashboardView: string
  dateFormat: string
  timeFormat: string
  timezone: string
  participantSortOrder: string
  itemsPerPage: number
  showAge: boolean
  showGender: boolean
  showTshirt: boolean
  showFormStatus: boolean
  showDietary: boolean
  showAllergies: boolean
  showEmergencyContact: boolean
  showMedical: boolean
  sessionTimeoutMinutes: number
  twoFactorEnabled: boolean
  highContrastMode: boolean
  largerText: boolean
  screenReaderOptimized: boolean
  language: string
}

export default function SettingsPage() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [activeTab, setActiveTab] = useState('account')

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
        setPreferences(data.preferences)
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

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all settings to default values?')) {
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/group-leader/settings/reset', {
        method: 'POST',
      })

      if (response.ok) {
        await fetchSettings()
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      }
    } catch (error) {
      console.error('Error resetting settings:', error)
    } finally {
      setSaving(false)
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

  const copyAccessCode = () => {
    if (userInfo) {
      navigator.clipboard.writeText(userInfo.accessCode)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    }
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">
            Settings
          </h1>
          <p className="text-[#6B7280]">
            Manage your account, preferences, and notification settings
          </p>
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
          <Button
            onClick={handleReset}
            variant="outline"
            disabled={saving}
            className="border-[#1E3A5F] text-[#1E3A5F]"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
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
          <TabsTrigger value="registration" className="data-[state=active]:bg-[#9C8466] data-[state=active]:text-white">
            <FileText className="h-4 w-4 mr-2" />
            Registration
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-[#9C8466] data-[state=active]:text-white">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="preferences" className="data-[state=active]:bg-[#9C8466] data-[state=active]:text-white">
            <Monitor className="h-4 w-4 mr-2" />
            Preferences
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
                  <div className="h-20 w-20 rounded-full bg-[#F5F1E8] flex items-center justify-center">
                    {preferences.profilePhotoUrl ? (
                      <img
                        src={preferences.profilePhotoUrl}
                        alt="Profile"
                        className="h-20 w-20 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-10 w-10 text-[#9C8466]" />
                    )}
                  </div>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      className="border-[#1E3A5F] text-[#1E3A5F]"
                      disabled
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload New Photo
                    </Button>
                    {preferences.profilePhotoUrl && (
                      <Button
                        variant="outline"
                        className="border-red-500 text-red-500"
                        disabled
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-[#6B7280] mt-2">
                  Coming soon: Upload a profile photo (Max 5MB, JPG/PNG)
                </p>
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
                <h3 className="text-lg font-semibold text-[#1E3A5F] mb-4">
                  Role & Access
                </h3>

                <div className="space-y-4">
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
                    <Label className="text-[#1E3A5F]">Access Code</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <code className="font-mono text-sm bg-[#F9FAFB] px-3 py-2 rounded border border-[#E5E7EB] flex-1">
                        {userInfo.accessCode}
                      </code>
                      <Button
                        onClick={copyAccessCode}
                        variant="outline"
                        size="sm"
                        className="border-[#1E3A5F] text-[#1E3A5F]"
                      >
                        {copySuccess ? (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-sm text-[#6B7280] mt-1">
                      Share this code with participants to complete forms
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* REGISTRATION TAB */}
        <TabsContent value="registration" className="space-y-6">
          <Card className="p-6 bg-white border-[#D1D5DB]">
            <h2 className="text-xl font-semibold text-[#1E3A5F] mb-6">
              Registration Preferences
            </h2>

            <div className="space-y-6">
              {/* Default Information */}
              <div>
                <h3 className="text-lg font-semibold text-[#1E3A5F] mb-4">
                  Default Information
                </h3>
                <p className="text-sm text-[#6B7280] mb-4">
                  Pre-fill this info for future registrations
                </p>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="defaultGroupName" className="text-[#1E3A5F]">
                      Default Group Name
                    </Label>
                    <Input
                      id="defaultGroupName"
                      value={preferences.groupNameDefault || ''}
                      onChange={(e) => updatePreference('groupNameDefault', e.target.value)}
                      placeholder="St. Mary's Youth Group"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="defaultParish" className="text-[#1E3A5F]">
                      Default Parish
                    </Label>
                    <Input
                      id="defaultParish"
                      value={preferences.parishNameDefault || ''}
                      onChange={(e) => updatePreference('parishNameDefault', e.target.value)}
                      placeholder="St. Mary Catholic Church"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="defaultDiocese" className="text-[#1E3A5F]">
                      Default Diocese
                    </Label>
                    <Input
                      id="defaultDiocese"
                      value={preferences.dioceseDefault || ''}
                      onChange={(e) => updatePreference('dioceseDefault', e.target.value)}
                      placeholder="Diocese of Tulsa"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Preferences */}
              <div className="border-t border-[#D1D5DB] pt-6">
                <h3 className="text-lg font-semibold text-[#1E3A5F] mb-4">
                  Contact Preferences
                </h3>

                <div className="space-y-4">
                  <div>
                    <Label className="text-[#1E3A5F] mb-2 block">Primary Contact for Registrations</Label>
                    <div className="space-y-3">
                      <Input
                        value={preferences.primaryContactName || ''}
                        onChange={(e) => updatePreference('primaryContactName', e.target.value)}
                        placeholder="Name"
                      />
                      <Input
                        type="tel"
                        value={preferences.primaryContactPhone || ''}
                        onChange={(e) => updatePreference('primaryContactPhone', e.target.value)}
                        placeholder="Phone"
                      />
                      <Input
                        type="email"
                        value={preferences.primaryContactEmail || ''}
                        onChange={(e) => updatePreference('primaryContactEmail', e.target.value)}
                        placeholder="Email"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-[#1E3A5F] mb-2 block">
                      Secondary Contact (optional)
                    </Label>
                    <div className="space-y-3">
                      <Input
                        value={preferences.secondaryContactName || ''}
                        onChange={(e) => updatePreference('secondaryContactName', e.target.value)}
                        placeholder="Name"
                      />
                      <Input
                        type="tel"
                        value={preferences.secondaryContactPhone || ''}
                        onChange={(e) => updatePreference('secondaryContactPhone', e.target.value)}
                        placeholder="Phone"
                      />
                      <Input
                        type="email"
                        value={preferences.secondaryContactEmail || ''}
                        onChange={(e) => updatePreference('secondaryContactEmail', e.target.value)}
                        placeholder="Email"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Preferences */}
              <div className="border-t border-[#D1D5DB] pt-6">
                <h3 className="text-lg font-semibold text-[#1E3A5F] mb-4">
                  Payment Preferences
                </h3>

                <div className="space-y-3">
                  <Label className="text-[#1E3A5F]">Preferred Payment Method</Label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="card"
                        checked={preferences.preferredPaymentMethod === 'card'}
                        onChange={(e) => updatePreference('preferredPaymentMethod', e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-[#1F2937]">Credit Card (pay online via Stripe)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="check"
                        checked={preferences.preferredPaymentMethod === 'check'}
                        onChange={(e) => updatePreference('preferredPaymentMethod', e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-[#1F2937]">Check (mail payment)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="no_preference"
                        checked={preferences.preferredPaymentMethod === 'no_preference'}
                        onChange={(e) => updatePreference('preferredPaymentMethod', e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-[#1F2937]">No preference</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Housing Preferences */}
              <div className="border-t border-[#D1D5DB] pt-6">
                <h3 className="text-lg font-semibold text-[#1E3A5F] mb-4">
                  Housing Preferences
                </h3>

                <div className="space-y-3">
                  <Label className="text-[#1E3A5F]">Default Housing Type</Label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="housingType"
                        value="on_campus"
                        checked={preferences.preferredHousingType === 'on_campus'}
                        onChange={(e) => updatePreference('preferredHousingType', e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-[#1F2937]">On-Campus (staying in dorms)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="housingType"
                        value="off_campus"
                        checked={preferences.preferredHousingType === 'off_campus'}
                        onChange={(e) => updatePreference('preferredHousingType', e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-[#1F2937]">Off-Campus (staying elsewhere)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="housingType"
                        value="day_pass"
                        checked={preferences.preferredHousingType === 'day_pass'}
                        onChange={(e) => updatePreference('preferredHousingType', e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-[#1F2937]">Day Pass (attending but not staying overnight)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="housingType"
                        value="no_default"
                        checked={preferences.preferredHousingType === 'no_default'}
                        onChange={(e) => updatePreference('preferredHousingType', e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-[#1F2937]">No default (ask each time)</span>
                    </label>
                  </div>
                </div>

                <div className="mt-4">
                  <Label htmlFor="specialRequests" className="text-[#1E3A5F]">
                    Special Requests/Notes (applies to all registrations)
                  </Label>
                  <Textarea
                    id="specialRequests"
                    value={preferences.specialRequestsDefault || ''}
                    onChange={(e) => updatePreference('specialRequestsDefault', e.target.value)}
                    placeholder="Please keep our youth rooms close together. We typically need 3-4 chaperone rooms."
                    rows={4}
                    className="mt-1"
                  />
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
                        <span className="text-sm text-[#6B7280]">Don't send notifications between</span>
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

              {/* SMS Notifications */}
              <div className="border-t border-[#D1D5DB] pt-6">
                <h3 className="font-semibold text-[#1E3A5F] mb-3">
                  SMS Notifications (Future Feature)
                </h3>

                <div className="space-y-3 opacity-50">
                  <div>
                    <Label className="text-[#1E3A5F]">Mobile Phone</Label>
                    <Input
                      value={preferences.phone || ''}
                      disabled
                      className="mt-1 bg-[#F9FAFB]"
                    />
                  </div>

                  <label className="flex items-center">
                    <Checkbox disabled />
                    <span className="ml-2 text-[#1F2937]">Enable SMS notifications</span>
                  </label>

                  <div className="ml-6 space-y-2">
                    <label className="flex items-center">
                      <Checkbox disabled />
                      <span className="ml-2 text-[#1F2937]">Payment reminders</span>
                    </label>
                    <label className="flex items-center">
                      <Checkbox disabled />
                      <span className="ml-2 text-[#1F2937]">Urgent event updates</span>
                    </label>
                    <label className="flex items-center">
                      <Checkbox disabled />
                      <span className="ml-2 text-[#1F2937]">Payment received confirmations</span>
                    </label>
                  </div>

                  <p className="text-sm text-[#6B7280]">
                    ⓘ Standard messaging rates may apply
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* PREFERENCES TAB */}
        <TabsContent value="preferences" className="space-y-6">
          <Card className="p-6 bg-white border-[#D1D5DB]">
            <h2 className="text-xl font-semibold text-[#1E3A5F] mb-6">
              Dashboard Preferences
            </h2>

            <div className="space-y-6">
              {/* Display Settings */}
              <div>
                <h3 className="font-semibold text-[#1E3A5F] mb-4">Display Settings</h3>

                <div className="space-y-4">
                  <div>
                    <Label className="text-[#1E3A5F]">Dashboard View</Label>
                    <div className="space-y-2 mt-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="dashboardView"
                          value="cards"
                          checked={preferences.dashboardView === 'cards'}
                          onChange={(e) => updatePreference('dashboardView', e.target.value)}
                          className="mr-2"
                        />
                        <span className="text-[#1F2937]">Cards View (default - grid of info cards)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="dashboardView"
                          value="list"
                          checked={preferences.dashboardView === 'list'}
                          onChange={(e) => updatePreference('dashboardView', e.target.value)}
                          className="mr-2"
                        />
                        <span className="text-[#1F2937]">List View (compact list format)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="dashboardView"
                          value="detailed"
                          checked={preferences.dashboardView === 'detailed'}
                          onChange={(e) => updatePreference('dashboardView', e.target.value)}
                          className="mr-2"
                        />
                        <span className="text-[#1F2937]">Detailed View (show everything)</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <Label className="text-[#1E3A5F]">Date Format</Label>
                    <div className="space-y-2 mt-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="dateFormat"
                          value="mdy"
                          checked={preferences.dateFormat === 'mdy'}
                          onChange={(e) => updatePreference('dateFormat', e.target.value)}
                          className="mr-2"
                        />
                        <span className="text-[#1F2937]">MM/DD/YYYY (04/15/2026)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="dateFormat"
                          value="dmy"
                          checked={preferences.dateFormat === 'dmy'}
                          onChange={(e) => updatePreference('dateFormat', e.target.value)}
                          className="mr-2"
                        />
                        <span className="text-[#1F2937]">DD/MM/YYYY (15/04/2026)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="dateFormat"
                          value="ymd"
                          checked={preferences.dateFormat === 'ymd'}
                          onChange={(e) => updatePreference('dateFormat', e.target.value)}
                          className="mr-2"
                        />
                        <span className="text-[#1F2937]">YYYY-MM-DD (2026-04-15)</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <Label className="text-[#1E3A5F]">Time Format</Label>
                    <div className="space-y-2 mt-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="timeFormat"
                          value="h12"
                          checked={preferences.timeFormat === 'h12'}
                          onChange={(e) => updatePreference('timeFormat', e.target.value)}
                          className="mr-2"
                        />
                        <span className="text-[#1F2937]">12-hour (2:30 PM)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="timeFormat"
                          value="h24"
                          checked={preferences.timeFormat === 'h24'}
                          onChange={(e) => updatePreference('timeFormat', e.target.value)}
                          className="mr-2"
                        />
                        <span className="text-[#1F2937]">24-hour (14:30)</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="timezone" className="text-[#1E3A5F]">Timezone</Label>
                    <select
                      id="timezone"
                      value={preferences.timezone}
                      onChange={(e) => updatePreference('timezone', e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-[#D1D5DB] rounded-md"
                    >
                      <option value="America/New_York">America/New York (Eastern)</option>
                      <option value="America/Chicago">America/Chicago (Central)</option>
                      <option value="America/Denver">America/Denver (Mountain)</option>
                      <option value="America/Los_Angeles">America/Los Angeles (Pacific)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Participant List Preferences */}
              <div className="border-t border-[#D1D5DB] pt-6">
                <h3 className="font-semibold text-[#1E3A5F] mb-4">Participant List Preferences</h3>

                <div className="space-y-4">
                  <div>
                    <Label className="text-[#1E3A5F]">Default Sort Order</Label>
                    <div className="space-y-2 mt-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="sortOrder"
                          value="name"
                          checked={preferences.participantSortOrder === 'name'}
                          onChange={(e) => updatePreference('participantSortOrder', e.target.value)}
                          className="mr-2"
                        />
                        <span className="text-[#1F2937]">By Name (A-Z)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="sortOrder"
                          value="age"
                          checked={preferences.participantSortOrder === 'age'}
                          onChange={(e) => updatePreference('participantSortOrder', e.target.value)}
                          className="mr-2"
                        />
                        <span className="text-[#1F2937]">By Age (youngest first)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="sortOrder"
                          value="type"
                          checked={preferences.participantSortOrder === 'type'}
                          onChange={(e) => updatePreference('participantSortOrder', e.target.value)}
                          className="mr-2"
                        />
                        <span className="text-[#1F2937]">By Type (Youth, then Chaperones)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="sortOrder"
                          value="form_status"
                          checked={preferences.participantSortOrder === 'form_status'}
                          onChange={(e) => updatePreference('participantSortOrder', e.target.value)}
                          className="mr-2"
                        />
                        <span className="text-[#1F2937]">By Form Status (incomplete first)</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="itemsPerPage" className="text-[#1E3A5F]">Items Per Page</Label>
                    <select
                      id="itemsPerPage"
                      value={preferences.itemsPerPage}
                      onChange={(e) => updatePreference('itemsPerPage', parseInt(e.target.value))}
                      className="mt-1 w-full px-3 py-2 border border-[#D1D5DB] rounded-md"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-[#1E3A5F] mb-3 block">Show in Participant List</Label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <Checkbox
                          checked={preferences.showAge}
                          onCheckedChange={(checked) => updatePreference('showAge', checked)}
                        />
                        <span className="ml-2 text-[#1F2937]">Age</span>
                      </label>
                      <label className="flex items-center">
                        <Checkbox
                          checked={preferences.showGender}
                          onCheckedChange={(checked) => updatePreference('showGender', checked)}
                        />
                        <span className="ml-2 text-[#1F2937]">Gender</span>
                      </label>
                      <label className="flex items-center">
                        <Checkbox
                          checked={preferences.showTshirt}
                          onCheckedChange={(checked) => updatePreference('showTshirt', checked)}
                        />
                        <span className="ml-2 text-[#1F2937]">T-Shirt Size</span>
                      </label>
                      <label className="flex items-center">
                        <Checkbox
                          checked={preferences.showFormStatus}
                          onCheckedChange={(checked) => updatePreference('showFormStatus', checked)}
                        />
                        <span className="ml-2 text-[#1F2937]">Form Status</span>
                      </label>
                      <label className="flex items-center">
                        <Checkbox
                          checked={preferences.showDietary}
                          onCheckedChange={(checked) => updatePreference('showDietary', checked)}
                        />
                        <span className="ml-2 text-[#1F2937]">Dietary Restrictions</span>
                      </label>
                      <label className="flex items-center">
                        <Checkbox
                          checked={preferences.showAllergies}
                          onCheckedChange={(checked) => updatePreference('showAllergies', checked)}
                        />
                        <span className="ml-2 text-[#1F2937]">Allergies</span>
                      </label>
                      <label className="flex items-center">
                        <Checkbox
                          checked={preferences.showEmergencyContact}
                          onCheckedChange={(checked) => updatePreference('showEmergencyContact', checked)}
                        />
                        <span className="ml-2 text-[#1F2937]">Emergency Contact</span>
                      </label>
                      <label className="flex items-center">
                        <Checkbox
                          checked={preferences.showMedical}
                          onCheckedChange={(checked) => updatePreference('showMedical', checked)}
                        />
                        <span className="ml-2 text-[#1F2937]">Medical Conditions</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Privacy & Security */}
              <div className="border-t border-[#D1D5DB] pt-6">
                <h3 className="font-semibold text-[#1E3A5F] mb-4">Privacy & Security</h3>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="sessionTimeout" className="text-[#1E3A5F]">
                      Session Timeout
                    </Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-sm text-[#6B7280]">Auto-logout after</span>
                      <select
                        id="sessionTimeout"
                        value={preferences.sessionTimeoutMinutes}
                        onChange={(e) => updatePreference('sessionTimeoutMinutes', parseInt(e.target.value))}
                        className="px-3 py-2 border border-[#D1D5DB] rounded-md"
                      >
                        <option value={15}>15 minutes</option>
                        <option value={30}>30 minutes</option>
                        <option value={60}>60 minutes</option>
                        <option value={120}>120 minutes</option>
                      </select>
                      <span className="text-sm text-[#6B7280]">of inactivity</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-[#1E3A5F]">Two-Factor Authentication</Label>
                    <div className="flex items-center justify-between mt-2 p-3 bg-amber-50 border border-amber-200 rounded">
                      <div>
                        <p className="text-sm font-medium text-amber-800">Status: ⚠️ Not Enabled</p>
                        <p className="text-xs text-amber-700">Recommended for security</p>
                      </div>
                      <Button
                        variant="outline"
                        className="border-amber-600 text-amber-600"
                        disabled
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        Enable 2FA
                      </Button>
                    </div>
                    <p className="text-xs text-[#6B7280] mt-2">
                      Two-factor authentication is managed through Clerk (Coming soon)
                    </p>
                  </div>
                </div>
              </div>

              {/* Language & Accessibility */}
              <div className="border-t border-[#D1D5DB] pt-6">
                <h3 className="font-semibold text-[#1E3A5F] mb-4">Language & Accessibility</h3>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="language" className="text-[#1E3A5F]">Language</Label>
                    <select
                      id="language"
                      value={preferences.language}
                      onChange={(e) => updatePreference('language', e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-[#D1D5DB] rounded-md"
                    >
                      <option value="en">English</option>
                      <option value="es" disabled>Spanish (Coming soon)</option>
                      <option value="fr" disabled>French (Coming soon)</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-[#1E3A5F] mb-3 block">Accessibility</Label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <Checkbox
                          checked={preferences.highContrastMode}
                          onCheckedChange={(checked) => updatePreference('highContrastMode', checked)}
                        />
                        <span className="ml-2 text-[#1F2937]">High contrast mode</span>
                      </label>
                      <label className="flex items-center">
                        <Checkbox
                          checked={preferences.largerText}
                          onCheckedChange={(checked) => updatePreference('largerText', checked)}
                        />
                        <span className="ml-2 text-[#1F2937]">Larger text</span>
                      </label>
                      <label className="flex items-center">
                        <Checkbox
                          checked={preferences.screenReaderOptimized}
                          onCheckedChange={(checked) => updatePreference('screenReaderOptimized', checked)}
                        />
                        <span className="ml-2 text-[#1F2937]">Screen reader optimizations</span>
                      </label>
                    </div>
                    <p className="text-xs text-[#6B7280] mt-2">
                      Note: Some accessibility features are in development
                    </p>
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
                  Need help? Contact the event organizers or send a message directly:
                </p>

                <div className="space-y-4">
                  <div className="bg-[#F5F1E8] p-4 rounded-lg">
                    <p className="text-sm font-medium text-[#1E3A5F]">Event: {userInfo.eventName}</p>
                    <p className="text-sm text-[#6B7280] mt-1">
                      Contact Email: support@chirhoevents.com
                    </p>
                  </div>

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

                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    className="border-[#1E3A5F] text-[#1E3A5F]"
                    disabled
                  >
                    Report a Bug
                  </Button>
                  <Button
                    variant="outline"
                    className="border-[#1E3A5F] text-[#1E3A5F]"
                    disabled
                  >
                    Request a Feature
                  </Button>
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
