'use client'

import { useState, useEffect } from 'react'
import { useUser, useAuth } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Calendar,
  Users,
  DollarSign,
  FileText,
  Plus,
  Download,
  Mail,
  Settings as SettingsIcon,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import ExportAllDataModal from '@/components/admin/ExportAllDataModal'
import DashboardBulkEmailModal from '@/components/admin/DashboardBulkEmailModal'

interface DashboardStats {
  activeEvents: number
  totalRegistrations: number
  revenue: number
  formsCompleted: number
  formsTotal: number
}

interface UpcomingEvent {
  id: string
  name: string
  slug: string
  startDate: string
  endDate: string
  totalRegistrations: number
}

interface RecentRegistration {
  id: string
  groupName: string
  eventName: string
  totalParticipants: number
  registeredAt: string
}

interface PendingActions {
  pendingCerts: number
  pendingCheckPayments: number
  overdueBalances: number
}

interface DashboardData {
  stats: DashboardStats
  upcomingEvents: UpcomingEvent[]
  recentRegistrations: RecentRegistration[]
  pendingActions: PendingActions
}

export default function DashboardClient() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const userName = user?.firstName || 'there'
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showBulkEmailModal, setShowBulkEmailModal] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const token = await getToken()
      const response = await fetch('/api/admin/dashboard', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }

      const dashboardData = await response.json()
      setData(dashboardData)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">Dashboard</h1>
          <p className="text-[#6B7280]">Loading dashboard data...</p>
        </div>
      </div>
    )
  }

  const formsProgress =
    data.stats.formsTotal > 0
      ? Math.round((data.stats.formsCompleted / data.stats.formsTotal) * 100)
      : 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">Dashboard</h1>
        <p className="text-[#6B7280]">
          Welcome back, {userName}! Here&apos;s an overview of your organization.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-[#D1D5DB]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6B7280]">Active Events</p>
                <p className="text-2xl font-bold text-[#1E3A5F]">
                  {data.stats.activeEvents}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-[#9C8466]" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#D1D5DB]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6B7280]">Total Registrations</p>
                <p className="text-2xl font-bold text-[#1E3A5F]">
                  {data.stats.totalRegistrations}
                </p>
              </div>
              <Users className="h-8 w-8 text-[#9C8466]" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#D1D5DB]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6B7280]">Revenue (Total)</p>
                <p className="text-2xl font-bold text-[#1E3A5F]">
                  ${data.stats.revenue.toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-[#9C8466]" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#D1D5DB]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6B7280]">Forms Completed</p>
                <p className="text-2xl font-bold text-[#1E3A5F]">
                  {data.stats.formsCompleted}/{data.stats.formsTotal}
                </p>
                <p className="text-xs text-[#9C8466] mt-1">{formsProgress}%</p>
              </div>
              <FileText className="h-8 w-8 text-[#9C8466]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Events Card */}
        <Card className="bg-white border-[#D1D5DB]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-[#1E3A5F]">
                Upcoming Events
              </CardTitle>
              <Link href="/dashboard/admin/events">
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {data.upcomingEvents.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-[#9C8466] mx-auto mb-4" />
                <p className="text-[#6B7280] mb-4">No upcoming events yet</p>
                <Link href="/dashboard/admin/events/new">
                  <Button className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Event
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {data.upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-4 border border-[#E5E7EB] rounded-lg hover:border-[#9C8466] transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-[#1E3A5F] mb-1">
                          {event.name}
                        </h3>
                        <p className="text-sm text-[#6B7280] mb-2">
                          {format(new Date(event.startDate), 'MMM d')} -{' '}
                          {format(new Date(event.endDate), 'MMM d, yyyy')}
                        </p>
                        <p className="text-sm text-[#6B7280]">
                          {event.totalRegistrations} registrations
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/events/${event.slug}`}>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
                        <Link href={`/dashboard/admin/events/${event.id}`}>
                          <Button
                            size="sm"
                            className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white"
                          >
                            Manage
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
                <Link href="/dashboard/admin/events">
                  <Button
                    variant="ghost"
                    className="w-full text-[#1E3A5F] hover:text-[#2A4A6F]"
                  >
                    View All Events
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Registrations Card */}
        <Card className="bg-white border-[#D1D5DB]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-[#1E3A5F]">
                Recent Registrations
              </CardTitle>
              <Link href="/dashboard/admin/registrations">
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {data.recentRegistrations.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-[#9C8466] mx-auto mb-4" />
                <p className="text-[#6B7280]">No registrations yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.recentRegistrations.map((reg) => (
                  <div
                    key={reg.id}
                    className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-[#1E3A5F]">
                          {reg.groupName}
                        </p>
                        <p className="text-sm text-[#6B7280]">
                          {reg.eventName} • {reg.totalParticipants} people
                        </p>
                      </div>
                      <p className="text-xs text-[#9C8466]">
                        {format(new Date(reg.registeredAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                ))}
                <Link href="/dashboard/admin/registrations">
                  <Button
                    variant="ghost"
                    className="w-full text-[#1E3A5F] hover:text-[#2A4A6F]"
                  >
                    View All Registrations
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Actions Card */}
        <Card className="bg-white border-[#D1D5DB]">
          <CardHeader>
            <CardTitle className="text-lg text-[#1E3A5F]">
              Pending Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-sm text-[#1F2937]">
                  {data.pendingActions.pendingCerts} Safe Environment Cert
                  {data.pendingActions.pendingCerts !== 1 ? 's' : ''} to Verify
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-sm text-[#1F2937]">
                  {data.pendingActions.pendingCheckPayments} Check Payment
                  {data.pendingActions.pendingCheckPayments !== 1 ? 's' : ''} to
                  Process
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-sm text-[#1F2937]">
                  {data.pendingActions.overdueBalances} Late Fee
                  {data.pendingActions.overdueBalances !== 1 ? 's' : ''} to Apply
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Card */}
        <Card className="bg-white border-[#D1D5DB]">
          <CardHeader>
            <CardTitle className="text-lg text-[#1E3A5F]">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link href="/dashboard/admin/events/new">
                <Button className="w-full bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Event
                </Button>
              </Link>
              <Button
                variant="outline"
                className="w-full border-[#1E3A5F] text-[#1E3A5F] justify-start hover:bg-[#1E3A5F] hover:text-white"
                onClick={() => setShowExportModal(true)}
              >
                <Download className="h-4 w-4 mr-2" />
                Export All Data
              </Button>
              <Button
                variant="outline"
                className="w-full border-[#1E3A5F] text-[#1E3A5F] justify-start hover:bg-[#1E3A5F] hover:text-white"
                onClick={() => setShowBulkEmailModal(true)}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email All Group Leaders
              </Button>
              <Link href="/dashboard/admin/settings">
                <Button
                  variant="outline"
                  className="w-full border-[#1E3A5F] text-[#1E3A5F] justify-start"
                >
                  <SettingsIcon className="h-4 w-4 mr-2" />
                  Organization Settings
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Getting Started Guide - Only show if no events */}
      {data.stats.activeEvents === 0 && (
        <Card className="bg-blue-50 border-2 border-blue-200">
          <CardContent className="p-6">
            <h3 className="font-semibold text-blue-900 mb-2">
              🚀 Getting Started
            </h3>
            <p className="text-sm text-blue-800 mb-4">
              Welcome to your ChiRho Events admin portal! Here&apos;s how to get
              started:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-900">
              <li>Create your first event in the Events section</li>
              <li>Configure event settings, pricing, and registration options</li>
              <li>Share the registration link with potential attendees</li>
              <li>Monitor registrations and payments in real-time</li>
              <li>Use Poros Portal to manage housing assignments</li>
              <li>Use SALVE for streamlined check-in on event day</li>
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <ExportAllDataModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />
      <DashboardBulkEmailModal
        isOpen={showBulkEmailModal}
        onClose={() => setShowBulkEmailModal(false)}
      />
    </div>
  )
}
