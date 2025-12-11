'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Calendar,
  Plus,
  Search,
  Edit,
  Eye,
  MoreVertical,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

interface Event {
  id: string
  name: string
  slug: string
  startDate: string
  endDate: string
  status: string
  totalRegistrations: number
  totalParticipants: number
  revenue: number
  totalExpectedRevenue: number
}

interface EventsListClientProps {
  organizationId: string
}

type FilterTab = 'all' | 'upcoming' | 'past' | 'draft'

export default function EventsListClient({
  organizationId,
}: EventsListClientProps) {
  const [events, setEvents] = useState<Event[]>([])
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchEvents()
  }, [])

  useEffect(() => {
    filterEvents()
  }, [events, activeTab, searchQuery])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/events')

      if (!response.ok) {
        throw new Error('Failed to fetch events')
      }

      const data = await response.json()
      setEvents(data.events || [])
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterEvents = () => {
    let filtered = [...events]

    // Apply tab filter
    const now = new Date()
    switch (activeTab) {
      case 'upcoming':
        filtered = filtered.filter(
          (event) => new Date(event.startDate) >= now && event.status !== 'draft'
        )
        break
      case 'past':
        filtered = filtered.filter(
          (event) => new Date(event.endDate) < now && event.status !== 'draft'
        )
        break
      case 'draft':
        filtered = filtered.filter((event) => event.status === 'draft')
        break
      // 'all' shows everything
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter((event) =>
        event.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredEvents(filtered)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      { label: string; className: string }
    > = {
      draft: { label: 'Draft', className: 'bg-gray-200 text-gray-700' },
      published: {
        label: 'Published',
        className: 'bg-blue-100 text-blue-700',
      },
      registration_open: {
        label: 'Registration Open',
        className: 'bg-green-100 text-green-700',
      },
      registration_closed: {
        label: 'Registration Closed',
        className: 'bg-orange-100 text-orange-700',
      },
      in_progress: {
        label: 'In Progress',
        className: 'bg-purple-100 text-purple-700',
      },
      completed: {
        label: 'Completed',
        className: 'bg-gray-100 text-gray-600',
      },
    }

    const config = statusConfig[status] || statusConfig.draft
    return (
      <Badge className={config.className} variant="secondary">
        {config.label}
      </Badge>
    )
  }

  const tabs: { id: FilterTab; label: string; count: number }[] = [
    { id: 'all', label: 'All Events', count: events.length },
    {
      id: 'upcoming',
      label: 'Upcoming',
      count: events.filter(
        (e) => new Date(e.startDate) >= new Date() && e.status !== 'draft'
      ).length,
    },
    {
      id: 'past',
      label: 'Past',
      count: events.filter(
        (e) => new Date(e.endDate) < new Date() && e.status !== 'draft'
      ).length,
    },
    {
      id: 'draft',
      label: 'Draft',
      count: events.filter((e) => e.status === 'draft').length,
    },
  ]

  if (loading) {
    return (
      <Card className="p-12 text-center bg-white border-[#D1D5DB]">
        <p className="text-[#6B7280]">Loading events...</p>
      </Card>
    )
  }

  if (events.length === 0) {
    return (
      <Card className="p-12 text-center bg-white border-[#D1D5DB]">
        <Calendar className="h-16 w-16 text-[#9C8466] mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-[#1E3A5F] mb-2">
          No Events Yet
        </h2>
        <p className="text-[#6B7280] mb-6 max-w-md mx-auto">
          Create your first event to start accepting registrations and managing
          your conference.
        </p>
        <Link href="/dashboard/admin/events/new">
          <Button className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white">
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Event
          </Button>
        </Link>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
          <Input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-[#D1D5DB]"
          />
        </div>
        <Link href="/dashboard/admin/events/new">
          <Button className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white">
            <Plus className="h-4 w-4 mr-2" />
            Create New Event
          </Button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-[#D1D5DB]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium transition-colors relative ${
              activeTab === tab.id
                ? 'text-[#1E3A5F] border-b-2 border-[#1E3A5F]'
                : 'text-[#6B7280] hover:text-[#1E3A5F]'
            }`}
          >
            {tab.label}
            <span
              className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                activeTab === tab.id
                  ? 'bg-[#1E3A5F] text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Events Table */}
      {filteredEvents.length === 0 ? (
        <Card className="p-12 text-center bg-white border-[#D1D5DB]">
          <p className="text-[#6B7280]">
            No events found matching your filters.
          </p>
        </Card>
      ) : (
        <Card className="bg-white border-[#D1D5DB]">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#D1D5DB]">
                    <th className="text-left py-4 px-6 text-sm font-semibold text-[#1E3A5F]">
                      Event Name
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-[#1E3A5F]">
                      Dates
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-[#1E3A5F]">
                      Status
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-[#1E3A5F]">
                      Registrations
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-[#1E3A5F]">
                      Revenue
                    </th>
                    <th className="text-right py-4 px-6 text-sm font-semibold text-[#1E3A5F]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((event) => (
                    <tr
                      key={event.id}
                      className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-medium text-[#1E3A5F]">
                            {event.name}
                          </p>
                          <p className="text-sm text-[#6B7280]">
                            /{event.slug}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-[#6B7280]">
                          {format(new Date(event.startDate), 'MMM d, yyyy')} -{' '}
                          {format(new Date(event.endDate), 'MMM d, yyyy')}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {getStatusBadge(event.status)}
                      </td>
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-medium text-[#1E3A5F]">
                            {event.totalRegistrations}
                          </p>
                          <p className="text-sm text-[#6B7280]">
                            {event.totalParticipants} participants
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-medium text-[#1E3A5F]">
                            ${event.revenue.toLocaleString()}
                          </p>
                          <p className="text-sm text-[#6B7280]">
                            of ${event.totalExpectedRevenue.toLocaleString()}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/events/${event.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </Link>
                          <Link href={`/dashboard/admin/events/${event.id}/edit`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          </Link>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-[#6B7280] hover:text-[#1E3A5F]"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/dashboard/admin/events/${event.id}`}
                                >
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/dashboard/admin/events/${event.id}/registrations`}
                                >
                                  Manage Registrations
                                </Link>
                              </DropdownMenuItem>
                              {event.totalRegistrations === 0 && (
                                <DropdownMenuItem className="text-red-600">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Event
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
