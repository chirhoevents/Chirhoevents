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
  Users,
  FileText,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Copy,
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
import { parseDateOnly } from '@/lib/utils'

interface Event {
  id: string
  name: string
  slug: string
  startDate: string
  endDate: string
  status: string
  locationName: string | null
  totalRegistrations: number
  totalParticipants: number
  revenue: number
  totalExpectedRevenue: number
}

// DEMO: hardcoded events — no API, no database
const DEMO_EVENTS: Event[] = [
  {
    id: 'evt-summer-retreat',
    name: 'Summer Youth Retreat 2026',
    slug: 'summer-retreat-2026',
    startDate: '2026-07-15',
    endDate: '2026-07-18',
    status: 'registration_open',
    locationName: 'Steubenville, OH',
    totalRegistrations: 32,
    totalParticipants: 247,
    revenue: 45820,
    totalExpectedRevenue: 70395,
  },
  {
    id: 'evt-diocesan-conference',
    name: 'Diocesan Youth Conference',
    slug: 'diocesan-conference',
    startDate: '2026-10-03',
    endDate: '2026-10-05',
    status: 'registration_open',
    locationName: 'Denver, CO',
    totalRegistrations: 12,
    totalParticipants: 89,
    revenue: 17355,
    totalExpectedRevenue: 48750,
  },
  {
    id: 'evt-mens-retreat',
    name: "Men's Silent Retreat",
    slug: 'mens-retreat',
    startDate: '2026-09-11',
    endDate: '2026-09-13',
    status: 'published',
    locationName: 'Malvern, PA',
    totalRegistrations: 3,
    totalParticipants: 42,
    revenue: 5245,
    totalExpectedRevenue: 38400,
  },
  {
    id: 'evt-womens-retreat-2025',
    name: "Women's Retreat 2025",
    slug: 'womens-retreat-2025',
    startDate: '2025-09-19',
    endDate: '2025-09-21',
    status: 'completed',
    locationName: 'Malvern, PA',
    totalRegistrations: 41,
    totalParticipants: 118,
    revenue: 37760,
    totalExpectedRevenue: 37760,
  },
  {
    id: 'evt-summer-2025',
    name: 'Summer Youth Retreat 2025',
    slug: 'summer-retreat-2025',
    startDate: '2025-07-15',
    endDate: '2025-07-18',
    status: 'completed',
    locationName: 'Steubenville, OH',
    totalRegistrations: 58,
    totalParticipants: 385,
    revenue: 109725,
    totalExpectedRevenue: 109725,
  },
  {
    id: 'evt-fall-draft',
    name: 'Fall Confirmation Retreat (Draft)',
    slug: 'fall-confirmation',
    startDate: '2026-11-14',
    endDate: '2026-11-16',
    status: 'draft',
    locationName: null,
    totalRegistrations: 0,
    totalParticipants: 0,
    revenue: 0,
    totalExpectedRevenue: 0,
  },
]

type FilterTab = 'all' | 'upcoming' | 'past' | 'draft'
type SortField = 'date' | 'name' | 'registrations'
type SortOrder = 'asc' | 'desc'

export default function EventsListClient() {
  const [events] = useState<Event[]>(DEMO_EVENTS)
  const [filteredEvents, setFilteredEvents] = useState<Event[]>(DEMO_EVENTS)
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortField>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  useEffect(() => {
    let filtered = [...events]

    // Tab filter
    const now = new Date()
    if (activeTab === 'upcoming') {
      filtered = filtered.filter(
        (e) => parseDateOnly(e.startDate) >= now && e.status !== 'draft',
      )
    } else if (activeTab === 'past') {
      filtered = filtered.filter(
        (e) => parseDateOnly(e.endDate) < now && e.status !== 'draft',
      )
    } else if (activeTab === 'draft') {
      filtered = filtered.filter((e) => e.status === 'draft')
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (event) =>
          event.name.toLowerCase().includes(query) ||
          event.slug.toLowerCase().includes(query) ||
          (event.locationName && event.locationName.toLowerCase().includes(query)),
      )
    }

    // Sort
    filtered.sort((a, b) => {
      let cmp = 0
      if (sortBy === 'date') {
        cmp = parseDateOnly(a.startDate).getTime() - parseDateOnly(b.startDate).getTime()
      } else if (sortBy === 'name') {
        cmp = a.name.localeCompare(b.name)
      } else {
        cmp = a.totalRegistrations - b.totalRegistrations
      }
      return sortOrder === 'asc' ? cmp : -cmp
    })

    setFilteredEvents(filtered)
  }, [events, searchQuery, activeTab, sortBy, sortOrder])

  const handleDeleteEvent = (_eventId: string, eventName: string) => {
    alert(`Demo: "${eventName}" would be deleted. Nothing is actually removed.`)
  }

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder(field === 'name' ? 'asc' : 'desc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="h-4 w-4" />
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    )
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      draft: { label: 'Draft', className: 'bg-gray-200 text-gray-700' },
      published: { label: 'Published', className: 'bg-blue-100 text-blue-700' },
      registration_open: { label: 'Registration Open', className: 'bg-green-100 text-green-700' },
      registration_closed: { label: 'Registration Closed', className: 'bg-orange-100 text-orange-700' },
      in_progress: { label: 'In Progress', className: 'bg-purple-100 text-purple-700' },
      completed: { label: 'Completed', className: 'bg-gray-100 text-gray-600' },
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
        (e) => parseDateOnly(e.startDate) >= new Date() && e.status !== 'draft',
      ).length,
    },
    {
      id: 'past',
      label: 'Past',
      count: events.filter(
        (e) => parseDateOnly(e.endDate) < new Date() && e.status !== 'draft',
      ).length,
    },
    {
      id: 'draft',
      label: 'Draft',
      count: events.filter((e) => e.status === 'draft').length,
    },
  ]

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

        <div className="flex items-center gap-4">
          <div className="text-sm">
            <span className="font-semibold text-green-600">
              {events.filter((e) => e.status !== 'draft').length} / 25
            </span>
            <span className="text-gray-600"> events this year</span>
          </div>

          <Link href="/demo/dashboard/admin/events/new">
            <Button className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white">
              <Plus className="h-4 w-4 mr-2" />
              Create New Event
            </Button>
          </Link>
        </div>
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
                activeTab === tab.id ? 'bg-[#1E3A5F] text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Sort Controls */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-[#6B7280]">Sort by:</span>
        <Button
          variant={sortBy === 'date' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleSort('date')}
          className={
            sortBy === 'date'
              ? 'bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white'
              : 'border-[#D1D5DB] text-[#6B7280] hover:text-[#1E3A5F]'
          }
        >
          Date {getSortIcon('date')}
        </Button>
        <Button
          variant={sortBy === 'name' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleSort('name')}
          className={
            sortBy === 'name'
              ? 'bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white'
              : 'border-[#D1D5DB] text-[#6B7280] hover:text-[#1E3A5F]'
          }
        >
          Name {getSortIcon('name')}
        </Button>
        <Button
          variant={sortBy === 'registrations' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleSort('registrations')}
          className={
            sortBy === 'registrations'
              ? 'bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white'
              : 'border-[#D1D5DB] text-[#6B7280] hover:text-[#1E3A5F]'
          }
        >
          Registrations {getSortIcon('registrations')}
        </Button>
      </div>

      {/* Events Table */}
      {filteredEvents.length === 0 ? (
        <Card className="p-12 text-center bg-white border-[#D1D5DB]">
          <p className="text-[#6B7280]">No events found matching your filters.</p>
        </Card>
      ) : (
        <Card className="bg-white border-[#D1D5DB]">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#D1D5DB]">
                    <th className="text-left py-4 px-6 text-sm font-semibold text-[#1E3A5F]">Event Name</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-[#1E3A5F]">Dates</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-[#1E3A5F]">Status</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-[#1E3A5F]">Registrations</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-[#1E3A5F]">Revenue</th>
                    <th className="text-right py-4 px-6 text-sm font-semibold text-[#1E3A5F]">Actions</th>
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
                          <p className="font-medium text-[#1E3A5F]">{event.name}</p>
                          <p className="text-sm text-[#6B7280]">/{event.slug}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-[#6B7280]">
                          {format(parseDateOnly(event.startDate), 'MMM d, yyyy')} -{' '}
                          {format(parseDateOnly(event.endDate), 'MMM d, yyyy')}
                        </div>
                      </td>
                      <td className="py-4 px-6">{getStatusBadge(event.status)}</td>
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-medium text-[#1E3A5F]">{event.totalRegistrations}</p>
                          <p className="text-sm text-[#6B7280]">{event.totalParticipants} participants</p>
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
                          <Link href={`/demo/dashboard/admin/events/${event.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white"
                            >
                              <Users className="h-4 w-4 mr-1" />
                              View Registrants
                            </Button>
                          </Link>
                          <Link href={`/demo/dashboard/admin/events/${event.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white"
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Details
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
                                <Link href={`/demo/dashboard/admin/events/${event.id}`}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Event
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/demo/dashboard/admin/events/${event.id}/edit`}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => alert(`Demo: "${event.name}" would be duplicated.`)}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate Event
                              </DropdownMenuItem>
                              {event.totalRegistrations === 0 && (
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => handleDeleteEvent(event.id, event.name)}
                                >
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
