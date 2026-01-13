'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Filter,
  X,
  Navigation,
  ChevronDown,
  ChevronUp,
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
  locationCity: string | null
  locationState: string | null
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

// US States for dropdown
const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
  { value: 'DC', label: 'Washington D.C.' },
]

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<FilterTab>('upcoming')

  // Advanced filters
  const [showFilters, setShowFilters] = useState(false)
  const [startDateFrom, setStartDateFrom] = useState('')
  const [startDateTo, setStartDateTo] = useState('')
  const [selectedState, setSelectedState] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [availableCities, setAvailableCities] = useState<string[]>([])
  const [availableStates, setAvailableStates] = useState<string[]>([])

  // Geolocation
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [userCity, setUserCity] = useState<string | null>(null)
  const [userState, setUserState] = useState<string | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [nearMeActive, setNearMeActive] = useState(false)

  // Fetch available locations on mount
  useEffect(() => {
    fetchLocationOptions()
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [activeTab, startDateFrom, startDateTo, selectedState, selectedCity])

  useEffect(() => {
    filterEvents()
  }, [events, searchQuery])

  const fetchLocationOptions = async () => {
    try {
      const response = await fetch('/api/events?getLocations=true')
      if (response.ok) {
        const data = await response.json()
        setAvailableCities(data.cities || [])
        setAvailableStates(data.states || [])
      }
    } catch (error) {
      console.error('Error fetching location options:', error)
    }
  }

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()

      if (activeTab !== 'all' && !startDateFrom && !startDateTo) {
        params.set('filter', activeTab)
      }

      if (startDateFrom) {
        params.set('startDateFrom', startDateFrom)
      }
      if (startDateTo) {
        params.set('startDateTo', startDateTo)
      }
      if (selectedState) {
        params.set('state', selectedState)
      }
      if (selectedCity) {
        params.set('city', selectedCity)
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
          (event.locationCity && event.locationCity.toLowerCase().includes(query)) ||
          (event.locationState && event.locationState.toLowerCase().includes(query)) ||
          event.organization.name.toLowerCase().includes(query)
      )
    }

    setFilteredEvents(filtered)
  }

  const getRegistrationStatus = (event: Event) => {
    const now = new Date()
    const startDate = new Date(event.startDate)
    const endDate = new Date(event.endDate)

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
    const regOpenDate = event.registrationOpenDate ? new Date(event.registrationOpenDate) : null
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

  // Reverse geocode using a free API
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      // Using OpenStreetMap's Nominatim API (free, no API key required)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        const address = data.address

        // Get city (could be city, town, village, etc.)
        const city = address.city || address.town || address.village || address.municipality || address.county

        // Get state code
        const stateCode = address['ISO3166-2-lvl4']?.split('-')[1] || address.state

        return { city, state: stateCode }
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error)
    }
    return null
  }

  const handleNearMe = useCallback(async () => {
    if (nearMeActive) {
      // Turn off near me filter
      setNearMeActive(false)
      setSelectedState('')
      setSelectedCity('')
      setUserCity(null)
      setUserState(null)
      return
    }

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser')
      return
    }

    setLocationLoading(true)
    setLocationError(null)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        setUserLocation({ lat: latitude, lng: longitude })

        // Reverse geocode to get city/state
        const location = await reverseGeocode(latitude, longitude)

        if (location) {
          setUserCity(location.city)
          setUserState(location.state)

          // Set the state filter to user's state
          if (location.state) {
            setSelectedState(location.state)
            setNearMeActive(true)
          }
        } else {
          setLocationError('Could not determine your location')
        }

        setLocationLoading(false)
      },
      (error) => {
        setLocationLoading(false)
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Location permission denied. Please enable location access.')
            break
          case error.POSITION_UNAVAILABLE:
            setLocationError('Location information unavailable.')
            break
          case error.TIMEOUT:
            setLocationError('Location request timed out.')
            break
          default:
            setLocationError('An error occurred while getting your location.')
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    )
  }, [nearMeActive])

  const clearFilters = () => {
    setStartDateFrom('')
    setStartDateTo('')
    setSelectedState('')
    setSelectedCity('')
    setSearchQuery('')
    setNearMeActive(false)
    setUserCity(null)
    setUserState(null)
    setActiveTab('upcoming')
  }

  const hasActiveFilters = startDateFrom || startDateTo || selectedState || selectedCity || searchQuery

  const getActiveFilterCount = () => {
    let count = 0
    if (startDateFrom) count++
    if (startDateTo) count++
    if (selectedState) count++
    if (selectedCity) count++
    return count
  }

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
      <section
        className="relative text-white py-12 md:py-16"
        style={{
          backgroundImage: `url('/ChiRho Event Logos/ChiRho events BG.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="absolute inset-0 bg-[#1E3A5F]/70"></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Browse Events
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-8">
            Find Catholic ministry events, conferences, retreats, and more. Register for upcoming events and strengthen your faith.
          </p>

          {/* Search Bar in Hero */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search events by name, location, or organization..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-6 text-lg bg-white text-gray-900 border-0 rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Filters Section */}
        <div className="mb-8 space-y-4">
          {/* Filter Controls Row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Near Me Button */}
            <Button
              variant={nearMeActive ? "default" : "outline"}
              onClick={handleNearMe}
              disabled={locationLoading}
              className={`${nearMeActive ? 'bg-[#1E3A5F] hover:bg-[#2A4A6F]' : 'border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white'}`}
            >
              {locationLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Navigation className="h-4 w-4 mr-2" />
              )}
              {nearMeActive ? `Near ${userCity || userState || 'Me'}` : 'Near Me'}
            </Button>

            {/* Toggle Filters Button */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="border-[#D1D5DB] text-[#6B7280] hover:bg-gray-50"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {getActiveFilterCount() > 0 && (
                <Badge className="ml-2 bg-[#1E3A5F] text-white text-xs">
                  {getActiveFilterCount()}
                </Badge>
              )}
              {showFilters ? (
                <ChevronUp className="h-4 w-4 ml-2" />
              ) : (
                <ChevronDown className="h-4 w-4 ml-2" />
              )}
            </Button>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="text-[#6B7280] hover:text-[#1E3A5F]"
              >
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>

          {/* Location Error */}
          {locationError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
              {locationError}
            </div>
          )}

          {/* Expandable Filters Panel */}
          {showFilters && (
            <Card className="bg-white border-[#D1D5DB]">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Date From */}
                  <div>
                    <label className="block text-sm font-medium text-[#374151] mb-1">
                      From Date
                    </label>
                    <Input
                      type="date"
                      value={startDateFrom}
                      onChange={(e) => {
                        setStartDateFrom(e.target.value)
                        if (e.target.value) setActiveTab('all')
                      }}
                      className="border-[#D1D5DB]"
                    />
                  </div>

                  {/* Date To */}
                  <div>
                    <label className="block text-sm font-medium text-[#374151] mb-1">
                      To Date
                    </label>
                    <Input
                      type="date"
                      value={startDateTo}
                      onChange={(e) => {
                        setStartDateTo(e.target.value)
                        if (e.target.value) setActiveTab('all')
                      }}
                      className="border-[#D1D5DB]"
                    />
                  </div>

                  {/* State Filter */}
                  <div>
                    <label className="block text-sm font-medium text-[#374151] mb-1">
                      State
                    </label>
                    <Select
                      value={selectedState}
                      onValueChange={(value) => {
                        setSelectedState(value === 'all' ? '' : value)
                        setSelectedCity('')
                        if (value !== 'all' && value !== selectedState) {
                          setNearMeActive(false)
                        }
                      }}
                    >
                      <SelectTrigger className="border-[#D1D5DB]">
                        <SelectValue placeholder="All States" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All States</SelectItem>
                        {US_STATES.filter(
                          (state) => availableStates.includes(state.value) || availableStates.includes(state.label)
                        ).map((state) => (
                          <SelectItem key={state.value} value={state.value}>
                            {state.label}
                          </SelectItem>
                        ))}
                        {/* Also show states from events that might use full names */}
                        {availableStates
                          .filter((s) => !US_STATES.find((us) => us.value === s || us.label === s))
                          .map((state) => (
                            <SelectItem key={state} value={state}>
                              {state}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* City Filter */}
                  <div>
                    <label className="block text-sm font-medium text-[#374151] mb-1">
                      City
                    </label>
                    <Select
                      value={selectedCity}
                      onValueChange={(value) => setSelectedCity(value === 'all' ? '' : value)}
                    >
                      <SelectTrigger className="border-[#D1D5DB]">
                        <SelectValue placeholder="All Cities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Cities</SelectItem>
                        {availableCities.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filter Tabs */}
          <div className="flex gap-2 border-b border-[#D1D5DB]">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  // Clear date filters when switching tabs
                  if (tab.id !== 'all') {
                    setStartDateFrom('')
                    setStartDateTo('')
                  }
                }}
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
                {hasActiveFilters ? 'No Events Found' : 'No Events Available'}
              </h2>

              <p className="text-lg text-[#6B7280] mb-6 max-w-md mx-auto">
                {hasActiveFilters
                  ? 'No events match your current filters. Try adjusting your search criteria.'
                  : activeTab === 'upcoming'
                  ? 'There are no upcoming events at this time. Check back soon!'
                  : activeTab === 'past'
                  ? 'No past events to display.'
                  : 'No events to display at this time.'}
              </p>

              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white"
                >
                  Clear All Filters
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

                      {(event.locationName || event.locationCity) && (
                        <div className="flex items-center text-sm text-[#6B7280]">
                          <MapPin className="h-4 w-4 mr-2 text-[#9C8466]" />
                          <span className="line-clamp-1">
                            {event.locationName}
                            {event.locationCity && event.locationState && (
                              <span className="text-gray-400">
                                {event.locationName ? ' - ' : ''}
                                {event.locationCity}, {event.locationState}
                              </span>
                            )}
                          </span>
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
            {hasActiveFilters && ' matching your filters'}
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
