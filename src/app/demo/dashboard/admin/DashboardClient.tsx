'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { parseDateOnly } from '@/lib/utils'

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
  availableYears: number[]
  selectedYear: number | null
}

// DEMO: Hardcoded fake data — no API, no database.
const DEMO_DATA: DashboardData = {
  stats: {
    activeEvents: 3,
    totalRegistrations: 47,
    revenue: 68420,
    formsCompleted: 189,
    formsTotal: 247,
  },
  upcomingEvents: [
    {
      id: 'evt-summer-retreat',
      name: 'Summer Youth Retreat 2026',
      slug: 'summer-retreat-2026',
      startDate: '2026-07-15',
      endDate: '2026-07-18',
      totalRegistrations: 32,
    },
    {
      id: 'evt-diocesan-conference',
      name: 'Diocesan Youth Conference',
      slug: 'diocesan-conference',
      startDate: '2026-10-03',
      endDate: '2026-10-05',
      totalRegistrations: 12,
    },
    {
      id: 'evt-mens-retreat',
      name: "Men's Silent Retreat",
      slug: 'mens-retreat',
      startDate: '2026-09-11',
      endDate: '2026-09-13',
      totalRegistrations: 3,
    },
  ],
  recentRegistrations: [
    {
      id: 'reg-1',
      groupName: "St. Mary's Youth Group",
      eventName: 'Summer Youth Retreat 2026',
      totalParticipants: 10,
      registeredAt: '2026-06-28T10:15:00Z',
    },
    {
      id: 'reg-2',
      groupName: 'St. John Paul II Parish',
      eventName: 'Summer Youth Retreat 2026',
      totalParticipants: 4,
      registeredAt: '2026-06-25T14:20:00Z',
    },
    {
      id: 'reg-3',
      groupName: 'Holy Family Community',
      eventName: 'Diocesan Youth Conference',
      totalParticipants: 8,
      registeredAt: '2026-06-22T09:45:00Z',
    },
    {
      id: 'reg-4',
      groupName: 'Thomas Wright (individual)',
      eventName: "Men's Silent Retreat",
      totalParticipants: 1,
      registeredAt: '2026-06-18T18:44:00Z',
    },
  ],
  pendingActions: {
    pendingCerts: 3,
    pendingCheckPayments: 2,
    overdueBalances: 1,
  },
  availableYears: [2024, 2025, 2026],
  selectedYear: 2026,
}

export default function DashboardClient() {
  const userName = 'Demo'
  const [data] = useState<DashboardData>(DEMO_DATA)
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())

  const formsProgress =
    data.stats.formsTotal > 0
      ? Math.round((data.stats.formsCompleted / data.stats.formsTotal) * 100)
      : 0

  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from(
    new Set([currentYear, ...(data.availableYears || [])])
  ).sort((a, b) => b - a)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">Dashboard</h1>
          <p className="text-[#6B7280]">
            Welcome back, {userName}! Here&apos;s an overview of your organization.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#6B7280] whitespace-nowrap">Showing data for:</span>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-36 border-[#D1D5DB] text-[#1E3A5F]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              {yearOptions.map((yr) => (
                <SelectItem key={yr} value={yr.toString()}>
                  {yr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
                <p className="text-sm text-[#6B7280]">
                  Revenue {selectedYear !== 'all' ? `(${selectedYear})` : '(Total)'}
                </p>
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
              <Link href="/demo/dashboard/admin/events">
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
                <p className="text-[#6B7280] mb-4">
                  {selectedYear !== 'all'
                    ? `No upcoming events in ${selectedYear}`
                    : 'No upcoming events yet'}
                </p>
                <Link href="/demo/dashboard/admin/events/new">
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
                          {format(parseDateOnly(event.startDate), 'MMM d')} -{' '}
                          {format(parseDateOnly(event.endDate), 'MMM d, yyyy')}
                        </p>
                        <p className="text-sm text-[#6B7280]">
                          {event.totalRegistrations} registrations
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/demo/dashboard/admin/events/${event.id}`}>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
                        <Link href={`/demo/dashboard/admin/events/${event.id}`}>
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
                <Link href="/demo/dashboard/admin/events">
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
              <Link href="/demo/dashboard/admin/registrations">
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
                <p className="text-[#6B7280]">
                  {selectedYear !== 'all'
                    ? `No registrations for ${selectedYear} events`
                    : 'No registrations yet'}
                </p>
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
                <Link href="/demo/dashboard/admin/registrations">
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
              <Link href="/demo/dashboard/admin/settings">
                <div className="p-3 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer transition-colors flex items-center justify-between group">
                  <p className="text-sm text-[#1F2937]">
                    {data.pendingActions.pendingCerts} Safe Environment Cert
                    {data.pendingActions.pendingCerts !== 1 ? 's' : ''} to Verify
                  </p>
                  <ArrowRight className="h-4 w-4 text-[#9C8466] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
              <Link href="/demo/dashboard/admin/registrations">
                <div className="p-3 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer transition-colors flex items-center justify-between group">
                  <p className="text-sm text-[#1F2937]">
                    {data.pendingActions.pendingCheckPayments} Check Payment
                    {data.pendingActions.pendingCheckPayments !== 1 ? 's' : ''} to
                    Process
                  </p>
                  <ArrowRight className="h-4 w-4 text-[#9C8466] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
              <Link href="/demo/dashboard/admin/registrations">
                <div className="p-3 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer transition-colors flex items-center justify-between group">
                  <p className="text-sm text-[#1F2937]">
                    {data.pendingActions.overdueBalances} Late Fee
                    {data.pendingActions.overdueBalances !== 1 ? 's' : ''} to Apply
                  </p>
                  <ArrowRight className="h-4 w-4 text-[#9C8466] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
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
              <Link href="/demo/dashboard/admin/events/new">
                <Button className="w-full bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Event
                </Button>
              </Link>
              <Button
                variant="outline"
                className="w-full border-[#1E3A5F] text-[#1E3A5F] justify-start hover:bg-[#1E3A5F] hover:text-white"
                onClick={() => alert('Demo: Export All Data would open a modal to choose export format and range. No file is generated.')}
              >
                <Download className="h-4 w-4 mr-2" />
                Export All Data
              </Button>
              <Button
                variant="outline"
                className="w-full border-[#1E3A5F] text-[#1E3A5F] justify-start hover:bg-[#1E3A5F] hover:text-white"
                onClick={() => alert('Demo: Email All Group Leaders would open a composer to send a message to every group leader. No email is sent.')}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email All Group Leaders
              </Button>
              <Link href="/demo/dashboard/admin/settings">
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
    </div>
  )
}
