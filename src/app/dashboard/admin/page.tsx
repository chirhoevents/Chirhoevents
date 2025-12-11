import { requireAdmin } from '@/lib/auth-utils'
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
  Settings as SettingsIcon
} from 'lucide-react'
import Link from 'next/link'

export default async function AdminDashboardPage() {
  const user = await requireAdmin()

  // TODO: Fetch real stats from database
  const stats = {
    activeEvents: 0,
    totalRegistrations: 0,
    revenue: 0,
    formsCompleted: 0,
    formsTotal: 0,
  }

  const formsProgress = stats.formsTotal > 0
    ? Math.round((stats.formsCompleted / stats.formsTotal) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">
          Dashboard
        </h1>
        <p className="text-[#6B7280]">
          Welcome back, {user.firstName}! Here&apos;s an overview of your organization.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-[#D1D5DB]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6B7280]">Active Events</p>
                <p className="text-2xl font-bold text-[#1E3A5F]">{stats.activeEvents}</p>
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
                <p className="text-2xl font-bold text-[#1E3A5F]">{stats.totalRegistrations}</p>
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
                  ${stats.revenue.toFixed(2)}
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
                  {stats.formsCompleted}/{stats.formsTotal}
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
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-[#9C8466] mx-auto mb-4" />
              <p className="text-[#6B7280]">No registrations yet</p>
            </div>
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
                <p className="text-sm text-[#1F2937]">0 Safe Environment Certs to Verify</p>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-sm text-[#1F2937]">0 Check Payments to Process</p>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-sm text-[#1F2937]">0 Late Fees to Apply</p>
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
                className="w-full border-[#1E3A5F] text-[#1E3A5F] justify-start"
                disabled
              >
                <Download className="h-4 w-4 mr-2" />
                Export All Data
              </Button>
              <Button
                variant="outline"
                className="w-full border-[#1E3A5F] text-[#1E3A5F] justify-start"
                disabled
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

      {/* Getting Started Guide */}
      <Card className="bg-blue-50 border-2 border-blue-200">
        <CardContent className="p-6">
          <h3 className="font-semibold text-blue-900 mb-2">🚀 Getting Started</h3>
          <p className="text-sm text-blue-800 mb-4">
            Welcome to your ChiRho Events admin portal! Here&apos;s how to get started:
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
    </div>
  )
}
