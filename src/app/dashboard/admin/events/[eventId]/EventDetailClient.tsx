'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Calendar,
  Users,
  DollarSign,
  MapPin,
  Edit,
  Copy,
  Trash2,
  ExternalLink,
  FileText,
  Home,
  CheckSquare,
  Activity,
  BarChart3,
  UserPlus,
  Settings,
  Mail,
  Key,
  ListOrdered,
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import SendReminderEmailModal from '@/components/admin/SendReminderEmailModal'

interface EventDetailClientProps {
  event: {
    id: string
    name: string
    slug: string
    description: string | null
    startDate: string
    endDate: string
    status: string
    locationName: string | null
    locationAddress: any
    capacityTotal: number | null
    capacityRemaining: number | null
  }
  stats: {
    totalRegistrations: number
    totalParticipants: number
    totalRevenue: number
    totalPaid: number
    balance: number
  }
  settings: {
    id?: string
    waitlistEnabled?: boolean
    registrationClosedMessage?: string | null
    porosHousingEnabled?: boolean
    salveCheckinEnabled?: boolean
    raphaMedicalEnabled?: boolean
  } | null
}

export default function EventDetailClient({
  event,
  stats,
  settings,
}: EventDetailClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [waitlistEnabled, setWaitlistEnabled] = useState(settings?.waitlistEnabled ?? false)
  const [closedMessage, setClosedMessage] = useState(settings?.registrationClosedMessage ?? '')
  const [savingSettings, setSavingSettings] = useState(false)
  const [reminderModalOpen, setReminderModalOpen] = useState(false)

  const handleStatusUpdate = async (newStatus: string) => {
    if (updatingStatus) return

    try {
      setUpdatingStatus(true)
      const response = await fetch(`/api/admin/events/${event.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update status')
      }

      router.refresh()
    } catch (error) {
      console.error('Error updating event status:', error)
      alert('Failed to update event status. Please try again.')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleSaveSettings = async () => {
    if (savingSettings) return

    try {
      setSavingSettings(true)
      const response = await fetch(`/api/admin/events/${event.id}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          waitlistEnabled,
          registrationClosedMessage: closedMessage || null,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      router.refresh()
      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Failed to save settings. Please try again.')
    } finally {
      setSavingSettings(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      { label: string; className: string }
    > = {
      draft: { label: 'Draft', className: 'bg-gray-500' },
      published: { label: 'Active', className: 'bg-green-500' },
      registration_open: { label: 'Registration Open', className: 'bg-green-500' },
      registration_closed: { label: 'Registration Closed', className: 'bg-yellow-500' },
      completed: { label: 'Completed', className: 'bg-blue-500' },
      cancelled: { label: 'Cancelled', className: 'bg-red-500' },
    }

    const config = statusConfig[status] || statusConfig.draft
    return (
      <Badge className={`${config.className} text-white`}>{config.label}</Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-[#1E3A5F]">{event.name}</h1>
              {getStatusBadge(event.status)}
            </div>
            <div className="flex items-center gap-4 text-sm text-[#6B7280]">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(new Date(event.startDate), 'MMM d')} -{' '}
                {format(new Date(event.endDate), 'MMM d, yyyy')}
              </div>
              {event.locationName && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {event.locationName}
                </div>
              )}
              {event.capacityTotal && (
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {event.capacityRemaining}/{event.capacityTotal} spots available
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/events/${event.slug}`} target="_blank">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Public Page
              </Button>
            </Link>
            <Button variant="outline" size="sm" disabled>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </Button>
            <Link href={`/dashboard/admin/events/${event.id}/edit`}>
              <Button
                size="sm"
                className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Event
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-white border-[#D1D5DB]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#6B7280]">Registrations</p>
                <p className="text-2xl font-bold text-[#1E3A5F]">
                  {stats.totalRegistrations}
                </p>
              </div>
              <Users className="h-6 w-6 text-[#9C8466]" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#D1D5DB]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#6B7280]">Participants</p>
                <p className="text-2xl font-bold text-[#1E3A5F]">
                  {stats.totalParticipants}
                </p>
              </div>
              <Users className="h-6 w-6 text-[#9C8466]" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#D1D5DB]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#6B7280]">Total Revenue</p>
                <p className="text-2xl font-bold text-[#1E3A5F]">
                  ${stats.totalRevenue.toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-6 w-6 text-[#9C8466]" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#D1D5DB]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#6B7280]">Paid</p>
                <p className="text-2xl font-bold text-green-600">
                  ${stats.totalPaid.toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-6 w-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#D1D5DB]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#6B7280]">Balance Due</p>
                <p className="text-2xl font-bold text-orange-600">
                  ${stats.balance.toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-6 w-6 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border border-[#D1D5DB]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="registrations">Registrations</TabsTrigger>
          {waitlistEnabled && (
            <TabsTrigger value="waitlist">Waitlist</TabsTrigger>
          )}
          {settings?.porosHousingEnabled && (
            <TabsTrigger value="poros">Poros Portal</TabsTrigger>
          )}
          {settings?.salveCheckinEnabled && (
            <TabsTrigger value="salve">SALVE Check-In</TabsTrigger>
          )}
          {settings?.raphaMedicalEnabled && (
            <TabsTrigger value="rapha">Rapha Medical</TabsTrigger>
          )}
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Event Information */}
            <Card className="bg-white border-[#D1D5DB]">
              <CardHeader>
                <CardTitle className="text-lg text-[#1E3A5F]">
                  Event Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {event.description && (
                  <div>
                    <p className="text-sm font-medium text-[#1E3A5F]">
                      Description
                    </p>
                    <p className="text-sm text-[#6B7280] mt-1">
                      {event.description}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-[#1E3A5F]">Dates</p>
                  <p className="text-sm text-[#6B7280] mt-1">
                    {format(new Date(event.startDate), 'MMMM d, yyyy')} -{' '}
                    {format(new Date(event.endDate), 'MMMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1E3A5F]">Location</p>
                  <p className="text-sm text-[#6B7280] mt-1">
                    {event.locationName || 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1E3A5F]">Capacity</p>
                  <p className="text-sm text-[#6B7280] mt-1">
                    {event.capacityTotal
                      ? `${event.capacityTotal} total`
                      : 'Unlimited'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1E3A5F]">
                    Public URL
                  </p>
                  <Link
                    href={`/events/${event.slug}`}
                    target="_blank"
                    className="text-sm text-[#9C8466] hover:underline mt-1 flex items-center gap-1"
                  >
                    /events/{event.slug}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card className="bg-white border-[#D1D5DB]">
              <CardHeader>
                <CardTitle className="text-lg text-[#1E3A5F]">
                  Quick Links
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href={`/dashboard/admin/events/${event.id}/registrations`}>
                  <Button
                    variant="outline"
                    className="w-full justify-start border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    View All Registrations
                  </Button>
                </Link>
                <Link href={`/dashboard/admin/events/${event.id}/access-codes`}>
                  <Button
                    variant="outline"
                    className="w-full justify-start border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white"
                  >
                    <Key className="h-4 w-4 mr-2" />
                    Manage Access Codes
                  </Button>
                </Link>
                {waitlistEnabled && (
                  <Link href={`/dashboard/admin/events/${event.id}/waitlist`}>
                    <Button
                      variant="outline"
                      className="w-full justify-start border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white"
                    >
                      <ListOrdered className="h-4 w-4 mr-2" />
                      Manage Waitlist
                    </Button>
                  </Link>
                )}
                {settings?.porosHousingEnabled && (
                  <Link href={`/dashboard/admin/events/${event.id}/poros`}>
                    <Button
                      variant="outline"
                      className="w-full justify-start border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white"
                    >
                      <Home className="h-4 w-4 mr-2" />
                      Open Poros Portal
                    </Button>
                  </Link>
                )}
                {settings?.salveCheckinEnabled && (
                  <Link href={`/dashboard/admin/events/${event.id}/salve`}>
                    <Button
                      variant="outline"
                      className="w-full justify-start border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white"
                    >
                      <CheckSquare className="h-4 w-4 mr-2" />
                      Open SALVE Check-In
                    </Button>
                  </Link>
                )}
                {settings?.raphaMedicalEnabled && (
                  <Link href={`/dashboard/admin/events/${event.id}/rapha`}>
                    <Button
                      variant="outline"
                      className="w-full justify-start border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white"
                    >
                      <Activity className="h-4 w-4 mr-2" />
                      Open Rapha Medical
                    </Button>
                  </Link>
                )}
                <Link href={`/dashboard/admin/events/${event.id}/reports`}>
                  <Button
                    variant="outline"
                    className="w-full justify-start border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Reports
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="bg-white border-[#D1D5DB]">
            <CardHeader>
              <CardTitle className="text-lg text-[#1E3A5F]">
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[#6B7280] text-center py-8">
                No recent activity yet
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Registrations Tab */}
        <TabsContent value="registrations">
          <Card className="bg-white border-[#D1D5DB]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-[#1E3A5F]">
                  Registrations Management
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white"
                    onClick={() => setReminderModalOpen(true)}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Send Reminder Emails
                  </Button>
                  <Link href={`/dashboard/admin/events/${event.id}/registrations/new`}>
                    <Button
                      size="sm"
                      className="bg-[#9C8466] hover:bg-[#8a7559] text-white"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Manual Registration
                    </Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 text-center">
              <Users className="h-16 w-16 text-[#9C8466] mx-auto mb-4" />
              <p className="text-[#6B7280] mb-4">
                View and manage all registrations for this event
              </p>
              <div className="flex justify-center gap-3">
                <Link href={`/dashboard/admin/events/${event.id}/registrations`}>
                  <Button className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white">
                    View All Registrations
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Send Reminder Email Modal */}
          <SendReminderEmailModal
            open={reminderModalOpen}
            onOpenChange={setReminderModalOpen}
            eventId={event.id}
            eventName={event.name}
          />
        </TabsContent>

        {/* Waitlist Tab */}
        {waitlistEnabled && (
          <TabsContent value="waitlist">
            <Card className="bg-white border-[#D1D5DB]">
              <CardContent className="p-8 text-center">
                <ListOrdered className="h-16 w-16 text-[#9C8466] mx-auto mb-4" />
                <h3 className="font-semibold text-[#1E3A5F] mb-2">
                  Waitlist Management
                </h3>
                <p className="text-[#6B7280] mb-4">
                  View and manage people waiting for spots to open up
                </p>
                <Link href={`/dashboard/admin/events/${event.id}/waitlist`}>
                  <Button className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white">
                    Manage Waitlist
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Poros Tab */}
        {settings?.porosHousingEnabled && (
          <TabsContent value="poros">
            <Card className="bg-white border-[#D1D5DB]">
              <CardContent className="p-8 text-center">
                <Home className="h-16 w-16 text-[#9C8466] mx-auto mb-4" />
                <h3 className="font-semibold text-[#1E3A5F] mb-2">
                  Poros Portal
                </h3>
                <p className="text-[#6B7280] mb-4">
                  Manage housing assignments, rooms, and seating
                </p>
                <Link href={`/dashboard/admin/events/${event.id}/poros`}>
                  <Button className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white">
                    Open Poros Portal
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* SALVE Tab */}
        {settings?.salveCheckinEnabled && (
          <TabsContent value="salve">
            <Card className="bg-white border-[#D1D5DB]">
              <CardContent className="p-8 text-center">
                <CheckSquare className="h-16 w-16 text-[#9C8466] mx-auto mb-4" />
                <h3 className="font-semibold text-[#1E3A5F] mb-2">
                  SALVE Check-In
                </h3>
                <p className="text-[#6B7280] mb-4">
                  QR code scanning and digital check-in management
                </p>
                <Link href={`/dashboard/admin/events/${event.id}/salve`}>
                  <Button className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white">
                    Open SALVE Check-In
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Rapha Tab */}
        {settings?.raphaMedicalEnabled && (
          <TabsContent value="rapha">
            <Card className="bg-white border-[#D1D5DB]">
              <CardContent className="p-8 text-center">
                <Activity className="h-16 w-16 text-[#9C8466] mx-auto mb-4" />
                <h3 className="font-semibold text-[#1E3A5F] mb-2">
                  Rapha Medical
                </h3>
                <p className="text-[#6B7280] mb-4">
                  Medical incident tracking and first aid management
                </p>
                <Link href={`/dashboard/admin/events/${event.id}/rapha`}>
                  <Button className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white">
                    Open Rapha Medical
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Reports Tab */}
        <TabsContent value="reports">
          <Card className="bg-white border-[#D1D5DB]">
            <CardContent className="p-8 text-center">
              <BarChart3 className="h-16 w-16 text-[#9C8466] mx-auto mb-4" />
              <h3 className="font-semibold text-[#1E3A5F] mb-2">
                Event Reports & Analytics
              </h3>
              <p className="text-[#6B7280] mb-4">
                View detailed reports and export data
              </p>
              <Link href={`/dashboard/admin/events/${event.id}/reports`}>
                <Button className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white">
                  View Reports
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Registration Status */}
            <Card className="bg-white border-[#D1D5DB]">
              <CardHeader>
                <CardTitle className="text-lg text-[#1E3A5F]">
                  Registration Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-[#6B7280] mb-3">
                    Control whether participants can register for this event
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#1E3A5F]">
                      Current Status:
                    </span>
                    {getStatusBadge(event.status)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleStatusUpdate('registration_open')}
                    className={event.status === 'registration_open'
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white'
                    }
                    disabled={event.status === 'registration_open' || updatingStatus}
                  >
                    {updatingStatus ? 'Updating...' : 'Open Registration'}
                  </Button>
                  <Button
                    onClick={() => handleStatusUpdate('registration_closed')}
                    variant="outline"
                    className={event.status === 'registration_closed'
                      ? 'border-orange-600 text-orange-600'
                      : 'border-[#1E3A5F] text-[#1E3A5F]'
                    }
                    disabled={event.status === 'registration_closed' || event.status === 'draft' || updatingStatus}
                  >
                    {updatingStatus ? 'Updating...' : 'Close Registration'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Capacity & Waitlist */}
            <Card className="bg-white border-[#D1D5DB]">
              <CardHeader>
                <CardTitle className="text-lg text-[#1E3A5F]">
                  Capacity & Waitlist
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-[#1E3A5F] mb-2">
                    Event Capacity
                  </p>
                  <p className="text-sm text-[#6B7280]">
                    {event.capacityTotal
                      ? `${event.capacityTotal} total capacity`
                      : 'No capacity limit set'}
                  </p>
                  {event.capacityTotal && (
                    <p className="text-sm text-[#6B7280] mt-1">
                      {event.capacityRemaining} spots remaining
                    </p>
                  )}
                </div>
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <Label htmlFor="waitlist-toggle" className="text-sm font-medium text-[#1E3A5F]">
                        Enable Waitlist
                      </Label>
                      <p className="text-xs text-[#6B7280] mt-1">
                        Allow participants to join when event is full or closed
                      </p>
                    </div>
                    <Switch
                      id="waitlist-toggle"
                      checked={waitlistEnabled}
                      onCheckedChange={setWaitlistEnabled}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Closed Message */}
          <Card className="bg-white border-[#D1D5DB]">
            <CardHeader>
              <CardTitle className="text-lg text-[#1E3A5F]">
                Closed Registration Message
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="closed-message" className="text-sm text-[#6B7280]">
                  Custom message to display when registration is closed
                </Label>
                <Textarea
                  id="closed-message"
                  value={closedMessage}
                  onChange={(e) => setClosedMessage(e.target.value)}
                  placeholder="Enter a custom message (leave blank for default message)"
                  className="mt-2 min-h-[100px]"
                />
                <p className="text-xs text-[#6B7280] mt-2">
                  This message will be shown on the event landing page when registration is manually closed.
                  Leave blank to use the default message: &ldquo;Registration is closed&rdquo;
                </p>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="bg-[#9C8466] hover:bg-[#8a7559] text-white"
                >
                  {savingSettings ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
