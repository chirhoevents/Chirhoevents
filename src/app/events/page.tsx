'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  MapPin,
  Users,
  Search,
  ArrowRight,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { format } from 'date-fns'

interface Event {
  id: string
  slug: string
  name: string
  description: string | null
  startDate: string
  endDate: string
  status: string
  locationName: string | null
  capacityTotal: number | null
  capacityRemaining: number | null
  registrationOpenDate: string | null
  registrationCloseDate: string | null
  enableWaitlist: boolean
  organization: {
    id: string
    name: string
  }
  settings: {
    backgroundImageUrl: string | null
    primaryColor: string | null
    secondaryColor: string | null
  } | null
}

type FilterTab = 'all' | 'upcoming' | 'past'

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<FilterTab>('upcoming')

  useEffect(() => {
    fetchEvents()
  }, [activeTab])

  useEffect(() => {
    filterEvents()
  }, [events, searchQuery])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (activeTab !== 'all') {
        params.set('filter', activeTab)
      }

      const response = await fetch(`/api/events?${params.toString()}`)
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

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (event) =>
          event.name.toLowerCase().includes(query) ||
          (event.locationName && event.locationName.toLowerCase().includes(query)) ||
          event.organization.name.toLowerCase().includes(query)
      )
    }

    setFilteredEvents(filtered)
  }

  const getRegistrationStatus = (event: Event) => {
    const now = new Date()
    const startDate = new Date(event.startDate)
    const endDate = new Date(event.endDate)
    const regOpenDate = event.registrationOpenDate ? new Date(event.registrationOpenDate) : null
    const regCloseDate = event.registrationCloseDate ? new Date(event.registrationCloseDate) : null

    // Event has ended
    if (endDate < now) {
      return { label: 'Completed', className: 'bg-gray-100 text-gray-600', icon: CheckCircle }
    }

    // Check registration status
    if (event.status === 'registration_open') {
      // Check capacity
      if (event.capacityRemaining !== null && event.capacityRemaining <= 0) {
        if (event.enableWaitlist) {
          return { label: 'Waitlist Open', className: 'bg-orange-100 text-orange-700', icon: Clock }
        }
        return { label: 'Sold Out', className: 'bg-red-100 text-red-700', icon: XCircle }
      }
      return { label: 'Registration Open', className: 'bg-green-100 text-green-700', icon: CheckCircle }
    }

    if (event.status === 'registration_closed') {
      return { label: 'Registration Closed', className: 'bg-orange-100 text-orange-700', icon: XCircle }
    }

    if (event.status === 'in_progress') {
      return { label: 'In Progress', className: 'bg-purple-100 text-purple-700', icon: Clock }
    }

    // Published but registration not yet open
    if (regOpenDate && now < regOpenDate) {
      return { label: 'Coming Soon', className: 'bg-blue-100 text-blue-700', icon: Clock }
    }

    return { label: 'Upcoming', className: 'bg-blue-100 text-blue-700', icon: Calendar }
  }

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const isSameMonth = startDate.getMonth() === endDate.getMonth()
    const isSameYear = startDate.getFullYear() === endDate.getFullYear()

    if (isSameMonth && isSameYear) {
      return `${format(startDate, 'MMM d')} - ${format(endDate, 'd, yyyy')}`
    }

    return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`
  }

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'upcoming', label: 'Upcoming Events' },
    { id: 'past', label: 'Past Events' },
    { id: 'all', label: 'All Events' },
  ]

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      {/* Header */}
      <nav className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center">
              <Image
                src="/dark-logo-horizontal.png"
                alt="ChiRho Events"
                width={200}
                height={60}
                className="h-10 md:h-14 w-auto"
                priority
              />
            </Link>
            <Link href="/sign-in">
              <Button variant="outline" size="sm">Sign In</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#1E3A5F] to-[#2A4A6F] text-white py-12 md:py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Browse Events
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto">
            Find Catholic ministry events, conferences, retreats, and more. Register for upcoming events and strengthen your faith.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          {/* Search Bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
            <Input
              type="text"
              placeholder="Search events by name, location, or organization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-[#D1D5DB] bg-white"
            />
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
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#1E3A5F]" />
            <span className="ml-2 text-[#6B7280]">Loading events...</span>
          </div>
        )}

        {/* No Events State */}
        {!loading && filteredEvents.length === 0 && (
          <Card className="bg-white">
            <CardContent className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-[#9C8466]/10 rounded-full mb-6">
                <Calendar className="h-10 w-10 text-[#9C8466]" />
              </div>

              <h2 className="text-2xl font-bold text-[#1E3A5F] mb-4">
                {searchQuery ? 'No Events Found' : 'No Events Available'}
              </h2>

              <p className="text-lg text-[#6B7280] mb-6 max-w-md mx-auto">
                {searchQuery
                  ? `No events match your search "${searchQuery}". Try adjusting your search terms.`
                  : activeTab === 'upcoming'
                  ? 'There are no upcoming events at this time. Check back soon!'
                  : activeTab === 'past'
                  ? 'No past events to display.'
                  : 'No events to display at this time.'}
              </p>

              {searchQuery && (
                <Button
                  variant="outline"
                  onClick={() => setSearchQuery('')}
                  className="border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white"
                >
                  Clear Search
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Events Grid */}
        {!loading && filteredEvents.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => {
              const status = getRegistrationStatus(event)
              const StatusIcon = status.icon
              const eventUrl = `/events/${event.slug || event.id}`

              // Hero background styles for card
              const cardStyle: React.CSSProperties = event.settings?.backgroundImageUrl
                ? {
                    backgroundImage: `linear-gradient(rgba(30, 58, 95, 0.7), rgba(30, 58, 95, 0.9)), url(${event.settings.backgroundImageUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }
                : {
                    background: event.settings?.primaryColor
                      ? `linear-gradient(135deg, ${event.settings.primaryColor}, ${event.settings.secondaryColor || event.settings.primaryColor})`
                      : 'linear-gradient(135deg, #1E3A5F, #2A4A6F)',
                  }

              return (
                <Card
                  key={event.id}
                  className="bg-white border-[#D1D5DB] overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Card Header with Background */}
                  <div
                    className="h-32 p-4 flex flex-col justify-end text-white"
                    style={cardStyle}
                  >
                    <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded w-fit mb-2">
                      {event.organization.name}
                    </span>
                    <h3 className="text-lg font-bold line-clamp-2">{event.name}</h3>
                  </div>

                  <CardContent className="p-4">
                    {/* Status Badge */}
                    <div className="mb-3">
                      <Badge className={`${status.className} font-medium`} variant="secondary">
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {status.label}
                      </Badge>
                    </div>

                    {/* Event Details */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-[#6B7280]">
                        <Calendar className="h-4 w-4 mr-2 text-[#9C8466]" />
                        <span>{formatDateRange(event.startDate, event.endDate)}</span>
                      </div>

                      {event.locationName && (
                        <div className="flex items-center text-sm text-[#6B7280]">
                          <MapPin className="h-4 w-4 mr-2 text-[#9C8466]" />
                          <span className="line-clamp-1">{event.locationName}</span>
                        </div>
                      )}

                      {event.capacityTotal && event.capacityRemaining !== null && (
                        <div className="flex items-center text-sm text-[#6B7280]">
                          <Users className="h-4 w-4 mr-2 text-[#9C8466]" />
                          <span>
                            {event.capacityRemaining > 0
                              ? `${event.capacityRemaining} spots remaining`
                              : event.enableWaitlist
                              ? 'Waitlist available'
                              : 'Sold out'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Description Preview */}
                    {event.description && (
                      <p className="text-sm text-[#6B7280] line-clamp-2 mb-4">
                        {event.description}
                      </p>
                    )}

                    {/* Action Button */}
                    <Link href={eventUrl}>
                      <Button className="w-full bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white">
                        View Details
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Results Count */}
        {!loading && filteredEvents.length > 0 && (
          <div className="mt-6 text-center text-sm text-[#6B7280]">
            Showing {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-[#6B7280]">
            Looking to host your own events?{' '}
            <Link href="/" className="text-[#1E3A5F] hover:underline font-medium">
              Learn more about ChiRho Events
            </Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
