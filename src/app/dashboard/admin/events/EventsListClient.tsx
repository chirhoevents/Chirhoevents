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
  AlertCircle,
  DollarSign,
  TrendingUp,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

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

interface EventsListClientProps {
  organizationId?: string  // Optional - API gets it from auth context
}

interface LimitData {
  atLimit: boolean
  currentUsage: number
  limit: number
  remaining: number
  tier: string
  tierLabel: string
  options?: {
    overage: {
      available: boolean
      cost: number
      description: string
    }
    upgrade: {
      available: boolean
      tiers: Array<{
        id: string
        name: string
        events: number
        monthlyPrice: number
      }>
      description: string
    }
  }
}

type FilterTab = 'all' | 'upcoming' | 'past' | 'draft'
type SortField = 'date' | 'name' | 'registrations'
type SortOrder = 'asc' | 'desc'

export default function EventsListClient({
  organizationId: _organizationId,  // Not used - API gets from auth context
}: EventsListClientProps = {}) {
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortField>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // Limit check state
  const [isCheckingLimit, setIsCheckingLimit] = useState(false)
  const [limitModalOpen, setLimitModalOpen] = useState(false)
  const [limitData, setLimitData] = useState<LimitData | null>(null)
  const [usageData, setUsageData] = useState<LimitData | null>(null)

  useEffect(() => {
    fetchEvents()
    fetchUsageData()
  }, [activeTab, sortBy, sortOrder])

  useEffect(() => {
    filterEvents()
  }, [events, searchQuery])

  const fetchUsageData = async () => {
    try {
      const response = await fetch('/api/admin/events/check-limit')
      if (response.ok) {
        const data = await response.json()
        setUsageData(data)
      }
    } catch (error) {
      console.error('Error fetching usage data:', error)
    }
  }

  const handleCreateEvent = async () => {
    setIsCheckingLimit(true)
    try {
      const response = await fetch('/api/admin/events/check-limit')
      const data = await response.json()

      if (data.atLimit) {
        setLimitData(data)
        setLimitModalOpen(true)
      } else {
        router.push('/dashboard/admin/events/new')
      }
    } catch (error) {
      console.error('Error checking limit:', error)
      // On error, let them try to create (backend will block if needed)
      router.push('/dashboard/admin/events/new')
    } finally {
      setIsCheckingLimit(false)
    }
  }

  const handleUpgrade = () => {
    setLimitModalOpen(false)
    router.push('/dashboard/admin/settings?tab=billing&action=upgrade')
  }

  const handleContactSupport = () => {
    setLimitModalOpen(false)
    window.location.href = 'mailto:support@chirhoevents.com?subject=Event%20Limit%20Increase%20Request'
  }

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (activeTab !== 'all') {
        params.set('status', activeTab)
      }
      params.set('sortBy', sortBy)
      params.set('sortOrder', sortOrder)

      const response = await fetch(`/api/admin/events?${params.toString()}`)

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

  const handleDeleteEvent = async (eventId: string, eventName: string) => {
    if (!confirm(`Are you sure you want to delete "${eventName}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete event')
      }

      // Refresh events list
      await fetchEvents()
      alert('Event deleted successfully')
    } catch (error) {
      console.error('Error deleting event:', error)
      alert('Failed to delete event. Please try again.')
    }
  }

  const filterEvents = () => {
    let filtered = [...events]

    // Apply search filter (client-side for instant feedback)
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (event) =>
          event.name.toLowerCase().includes(query) ||
          event.slug.toLowerCase().includes(query) ||
          (event.locationName && event.locationName.toLowerCase().includes(query))
      )
    }

    setFilteredEvents(filtered)
  }

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      // Toggle sort order if clicking the same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      // Set new field with default order
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
      <>
        <Card className="p-12 text-center bg-white border-[#D1D5DB]">
          <Calendar className="h-16 w-16 text-[#9C8466] mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[#1E3A5F] mb-2">
            No Events Yet
          </h2>
          <p className="text-[#6B7280] mb-6 max-w-md mx-auto">
            Create your first event to start accepting registrations and managing
            your conference.
          </p>
          <Button
            onClick={handleCreateEvent}
            disabled={isCheckingLimit}
            className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white"
          >
            {isCheckingLimit ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Create Your First Event
          </Button>
        </Card>

        {/* Limit Modal */}
        <LimitReachedModal
          open={limitModalOpen}
          onOpenChange={setLimitModalOpen}
          limitData={limitData}
          onUpgrade={handleUpgrade}
          onContactSupport={handleContactSupport}
        />
      </>
    )
  }

  return (
    <div className="space-y-6">
      {/* Warning banner when near limit */}
      {usageData && usageData.currentUsage >= usageData.limit * 0.8 && !usageData.atLimit && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800">Approaching Event Limit</AlertTitle>
          <AlertDescription className="text-orange-700">
            You&apos;ve used {usageData.currentUsage} of {usageData.limit} events in your {usageData.tierLabel} plan.
            Consider upgrading your plan to create more events.
          </AlertDescription>
        </Alert>
      )}

      {/* At limit banner */}
      {usageData && usageData.atLimit && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Event Limit Reached</AlertTitle>
          <AlertDescription className="text-red-700">
            You&apos;ve reached your limit of {usageData.limit} events for your {usageData.tierLabel} plan.
            Upgrade your plan or contact support to create more events.
          </AlertDescription>
        </Alert>
      )}

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
          {/* Usage indicator */}
          {usageData && (
            <div className="text-sm">
              <span className={cn(
                "font-semibold",
                usageData.atLimit ? "text-red-600" :
                usageData.currentUsage >= usageData.limit * 0.8 ? "text-orange-600" :
                "text-green-600"
              )}>
                {usageData.currentUsage} / {usageData.limit}
              </span>
              <span className="text-gray-600"> events this year</span>
              {usageData.atLimit && (
                <span className="ml-2 text-xs text-red-600 font-medium">
                  (At limit!)
                </span>
              )}
            </div>
          )}

          <Button
            onClick={handleCreateEvent}
            disabled={isCheckingLimit}
            className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white"
          >
            {isCheckingLimit ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Create New Event
          </Button>
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
                          <Link href={`/dashboard/admin/events/${event.id}/registrations`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white"
                            >
                              <Users className="h-4 w-4 mr-1" />
                              View Registrants
                            </Button>
                          </Link>
                          <Link href={`/dashboard/admin/events/${event.id}`}>
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
                                <Link href={`/events/${event.slug}`}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Event
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/admin/events/${event.id}/edit`}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </Link>
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

      {/* Limit Modal */}
      <LimitReachedModal
        open={limitModalOpen}
        onOpenChange={setLimitModalOpen}
        limitData={limitData}
        onUpgrade={handleUpgrade}
        onContactSupport={handleContactSupport}
      />
    </div>
  )
}

// Limit Reached Modal Component
interface LimitReachedModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  limitData: LimitData | null
  onUpgrade: () => void
  onContactSupport: () => void
}

function LimitReachedModal({
  open,
  onOpenChange,
  limitData,
  onUpgrade,
  onContactSupport,
}: LimitReachedModalProps) {
  if (!limitData) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Event Limit Reached
          </DialogTitle>
          <DialogDescription>
            You&apos;ve created <strong>{limitData.currentUsage}</strong> out of{' '}
            <strong>{limitData.limit}</strong> events allowed in your{' '}
            <strong>{limitData.tierLabel}</strong> plan this year.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm text-orange-800">
              You cannot create more events unless you upgrade your plan or contact support for additional events.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-[#1E3A5F]">Choose an option:</h4>

            {/* Option 1: Upgrade Plan */}
            {limitData.options?.upgrade.available && (
              <Card
                className="cursor-pointer hover:border-[#1E3A5F] transition-colors"
                onClick={onUpgrade}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <TrendingUp className="h-5 w-5 text-[#1E3A5F]" />
                    </div>
                    <div className="flex-1">
                      <h5 className="font-semibold text-[#1E3A5F]">Upgrade Your Plan</h5>
                      <p className="text-sm text-gray-600 mt-1">
                        {limitData.options.upgrade.description}
                      </p>
                      <div className="mt-2 space-y-1">
                        {limitData.options.upgrade.tiers.slice(0, 3).map((tier) => (
                          <p key={tier.id} className="text-sm text-gray-700">
                            <strong>{tier.name}</strong>: {tier.events} events/year - ${tier.monthlyPrice}/month
                          </p>
                        ))}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Option 2: Contact Support */}
            <Card
              className="cursor-pointer hover:border-[#1E3A5F] transition-colors"
              onClick={onContactSupport}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <DollarSign className="h-5 w-5 text-[#1E3A5F]" />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-semibold text-[#1E3A5F]">Request Additional Events</h5>
                    <p className="text-sm text-gray-600 mt-1">
                      Contact support to request additional events at $50 per event.
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
