'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { format } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  Loader2,
  Navigation,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Calendar,
  MapPin,
} from 'lucide-react'

interface Event {
  id: string
  name: string
  startDate: string
  endDate: string
  locationName: string | null
  locationCity: string | null
  locationState: string | null
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

interface PorosPublicClientProps {
  initialEvents: Event[]
  availableCities: string[]
  availableStates: string[]
}

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

export default function PorosPublicClient({
  initialEvents,
  availableCities,
  availableStates,
}: PorosPublicClientProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // Advanced filters
  const [showFilters, setShowFilters] = useState(false)
  const [startDateFrom, setStartDateFrom] = useState('')
  const [startDateTo, setStartDateTo] = useState('')
  const [selectedState, setSelectedState] = useState('')
  const [selectedCity, setSelectedCity] = useState('')

  // Geolocation
  const [userCity, setUserCity] = useState<string | null>(null)
  const [userState, setUserState] = useState<string | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [nearMeActive, setNearMeActive] = useState(false)

  // Filter events client-side
  const filteredEvents = useMemo(() => {
    let events = [...initialEvents]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      events = events.filter((event) =>
        event.name.toLowerCase().includes(query) ||
        (event.locationName && event.locationName.toLowerCase().includes(query)) ||
        (event.locationCity && event.locationCity.toLowerCase().includes(query)) ||
        (event.locationState && event.locationState.toLowerCase().includes(query)) ||
        (event.organization?.name && event.organization.name.toLowerCase().includes(query))
      )
    }

    // Apply date range filter
    if (startDateFrom || startDateTo) {
      events = events.filter((event) => {
        const eventStart = new Date(event.startDate)
        if (startDateFrom && eventStart < new Date(startDateFrom)) return false
        if (startDateTo && eventStart > new Date(startDateTo)) return false
        return true
      })
    }

    // Apply state filter
    if (selectedState) {
      events = events.filter((event) =>
        event.locationState?.toLowerCase() === selectedState.toLowerCase()
      )
    }

    // Apply city filter
    if (selectedCity) {
      events = events.filter((event) =>
        event.locationCity?.toLowerCase() === selectedCity.toLowerCase()
      )
    }

    return events
  }, [initialEvents, searchQuery, startDateFrom, startDateTo, selectedState, selectedCity])

  // Reverse geocode using OpenStreetMap Nominatim API
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
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

        const city = address.city || address.town || address.village || address.municipality || address.county
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

        const location = await reverseGeocode(latitude, longitude)

        if (location) {
          setUserCity(location.city)
          setUserState(location.state)

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
    <div
      className="min-h-screen bg-gradient-to-b from-[#1E3A5F] to-[#0f1f33]"
      style={{
        // Ensure full viewport coverage on all browsers including Chrome desktop
        minHeight: '100vh',
        minHeight: '100dvh',
      }}
    >
      {/* Header */}
      <header className="bg-[#1E3A5F] border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-center">
          <Image
            src="/light-logo-horizontal.png"
            alt="ChiRho Events"
            width={180}
            height={45}
            className="h-10 w-auto"
          />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Poros Portal</h1>
          <p className="text-white/70">Select your event to view resources</p>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-3 bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-xl"
            />
          </div>
        </div>

        {/* Filter Controls */}
        <div className="mb-6 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Near Me Button */}
            <Button
              variant={nearMeActive ? "default" : "outline"}
              size="sm"
              onClick={handleNearMe}
              disabled={locationLoading}
              className={`${
                nearMeActive
                  ? 'bg-white text-[#1E3A5F] hover:bg-white/90'
                  : 'border-white/30 text-white hover:bg-white/10'
              }`}
            >
              {locationLoading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Navigation className="h-4 w-4 mr-1" />
              )}
              {nearMeActive ? `Near ${userCity || userState || 'Me'}` : 'Near Me'}
            </Button>

            {/* Toggle Filters Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="border-white/30 text-white hover:bg-white/10"
            >
              <Filter className="h-4 w-4 mr-1" />
              Filters
              {getActiveFilterCount() > 0 && (
                <span className="ml-1 bg-white text-[#1E3A5F] text-xs px-1.5 py-0.5 rounded-full font-medium">
                  {getActiveFilterCount()}
                </span>
              )}
              {showFilters ? (
                <ChevronUp className="h-4 w-4 ml-1" />
              ) : (
                <ChevronDown className="h-4 w-4 ml-1" />
              )}
            </Button>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Location Error */}
          {locationError && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-3 py-2 rounded-lg text-sm">
              {locationError}
            </div>
          )}

          {/* Expandable Filters Panel */}
          {showFilters && (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 space-y-4">
              {/* Date Filters */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/70 text-xs mb-1">From Date</label>
                  <Input
                    type="date"
                    value={startDateFrom}
                    onChange={(e) => setStartDateFrom(e.target.value)}
                    className="bg-white/10 border-white/20 text-white text-sm [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-white/70 text-xs mb-1">To Date</label>
                  <Input
                    type="date"
                    value={startDateTo}
                    onChange={(e) => setStartDateTo(e.target.value)}
                    className="bg-white/10 border-white/20 text-white text-sm [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Location Filters */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/70 text-xs mb-1">State</label>
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
                    <SelectTrigger className="bg-white/10 border-white/20 text-white text-sm">
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
                <div>
                  <label className="block text-white/70 text-xs mb-1">City</label>
                  <Select
                    value={selectedCity}
                    onValueChange={(value) => setSelectedCity(value === 'all' ? '' : value)}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white text-sm">
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
            </div>
          )}
        </div>

        {/* No Events State */}
        {filteredEvents.length === 0 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-white/60" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              {hasActiveFilters ? 'No Events Found' : 'No Active Events'}
            </h2>
            <p className="text-white/60">
              {hasActiveFilters
                ? 'No events match your current filters. Try adjusting your search.'
                : 'There are no events with the public portal enabled at this time.'}
            </p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="mt-4 border-white/30 text-white hover:bg-white/10"
              >
                Clear All Filters
              </Button>
            )}
          </div>
        )}

        {/* Events List */}
        {filteredEvents.length > 0 && (
          <div className="space-y-4">
            {filteredEvents.map((event) => (
              <Link
                key={event.id}
                href={`/poros/public/${event.id}`}
                className="block bg-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-[#1E3A5F] to-[#3b5998] rounded-xl flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[#1E3A5F] text-lg truncate">{event.name}</h3>
                    <p className="text-gray-500 text-sm mt-1">
                      {format(new Date(event.startDate), 'MMM d')}
                      {event.endDate && ` - ${format(new Date(event.endDate), 'MMM d, yyyy')}`}
                    </p>
                    {(event.locationName || event.locationCity) && (
                      <p className="text-gray-400 text-sm truncate flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {event.locationName}
                        {event.locationCity && event.locationState && (
                          <span>
                            {event.locationName ? ' - ' : ''}
                            {event.locationCity}, {event.locationState}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}

            {/* Results Count */}
            <div className="text-center text-sm text-white/50 pt-2">
              Showing {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
              {hasActiveFilters && ' matching your filters'}
            </div>
          </div>
        )}

        {/* Add to Home Screen hint */}
        <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
          <p className="text-white/80 text-sm">
            <span className="font-semibold">Tip:</span> Add this page to your home screen for quick access!
          </p>
          <p className="text-white/50 text-xs mt-1">
            Tap the share button and select &quot;Add to Home Screen&quot;
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-lg mx-auto px-4 py-6 text-center">
        <p className="text-white/40 text-sm">
          Powered by ChiRho Events
        </p>
      </footer>
    </div>
  )
}
