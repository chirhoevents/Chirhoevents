'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

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
  settings: any
}

export default function EventDetailClient({
  event,
  stats,
  settings,
}: EventDetailClientProps) {
  const [activeTab, setActiveTab] = useState('overview')

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
            </CardHeader>
            <CardContent className="p-8 text-center">
              <Users className="h-16 w-16 text-[#9C8466] mx-auto mb-4" />
              <p className="text-[#6B7280] mb-4">
                View and manage all registrations for this event
              </p>
              <Link href={`/dashboard/admin/events/${event.id}/registrations`}>
                <Button className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white">
                  View All Registrations
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

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
                Reports & Analytics
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
      </Tabs>
    </div>
  )
}
