'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  Users,
  Loader2,
  Check,
  AlertCircle,
  ArrowLeft,
  CheckSquare,
  X,
  QrCode,
} from 'lucide-react'
import { toast } from '@/lib/toast'

interface Participant {
  id: string
  firstName: string
  lastName: string
  email: string
  age: number | null
  gender: string | null
  participantType: string
  checkedIn: boolean
  checkedInAt: string | null
  checkInNotes: string | null
  liabilityFormCompleted: boolean
  registrationType: 'group' | 'individual'
  groupId: string | null
  groupName: string
  parishName: string | null
  accessCode: string | null
}

interface Stats {
  total: number
  checkedIn: number
  notCheckedIn: number
}

export default function SalveAllParticipants() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.eventId as string

  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [error, setError] = useState('')
  const [eventName, setEventName] = useState('')

  const [participants, setParticipants] = useState<Participant[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, checkedIn: 0, notCheckedIn: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [checkingIn, setCheckingIn] = useState<string | null>(null)

  useEffect(() => {
    checkAuthAndFetchData()
  }, [eventId])

  useEffect(() => {
    if (isAuthorized) {
      fetchParticipants()
    }
  }, [searchQuery, filterStatus, isAuthorized])

  async function checkAuthAndFetchData() {
    try {
      setAuthChecking(true)

      const authResponse = await fetch('/api/admin/check-access')
      if (authResponse.ok) {
        setIsAuthorized(true)
      } else {
        const salveAuthResponse = await fetch(`/api/portal/salve/check-access?eventId=${eventId}`)
        if (salveAuthResponse.ok) {
          setIsAuthorized(true)
        } else {
          setIsAuthorized(false)
          setError('You do not have permission to access this portal')
          setLoading(false)
          setAuthChecking(false)
          return
        }
      }

      setAuthChecking(false)

      // Fetch event info
      const eventResponse = await fetch(`/api/admin/events/${eventId}`)
      if (eventResponse.ok) {
        const data = await eventResponse.json()
        setEventName(data.name || 'Event')
      }

      await fetchParticipants()
    } catch (err) {
      console.error('Auth check failed:', err)
      setError('Failed to verify access')
      setAuthChecking(false)
      setLoading(false)
    }
  }

  async function fetchParticipants() {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchQuery) params.set('search', searchQuery)
      if (filterStatus !== 'all') params.set('status', filterStatus)

      const response = await fetch(`/api/admin/events/${eventId}/salve/participants?${params}`)
      if (response.ok) {
        const data = await response.json()
        setParticipants(data.participants)
        setStats(data.stats)
      } else {
        toast.error('Failed to load participants')
      }
    } catch (err) {
      console.error('Failed to fetch participants:', err)
      toast.error('Failed to load participants')
    } finally {
      setLoading(false)
    }
  }

  async function handleQuickCheckIn(participant: Participant) {
    setCheckingIn(participant.id)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/salve/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantIds: [participant.id],
          registrationType: participant.registrationType,
          action: participant.checkedIn ? 'check_out' : 'check_in',
        }),
      })

      if (response.ok) {
        toast.success(participant.checkedIn ? 'Checked out successfully' : 'Checked in successfully')
        fetchParticipants()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to update check-in status')
      }
    } catch (err) {
      toast.error('Failed to update check-in status')
    } finally {
      setCheckingIn(null)
    }
  }

  const progressPercentage = stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0

  if (loading && authChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized || error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">{error || 'You do not have permission to access this page.'}</p>
            <Link href="/dashboard/admin">
              <Button>Return to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-emerald-600 text-white py-3 px-4 shadow-lg sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold">All Participants</h1>
              <p className="text-xs text-white/80">{eventName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/portal/salve/${eventId}`}>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Check-In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 md:p-6 max-w-[1600px] mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{stats.checkedIn}</p>
                <p className="text-sm text-green-700">Checked In</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-600">{stats.notCheckedIn}</p>
                <p className="text-sm text-amber-700">Not Checked In</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Check-In Progress</span>
              <span className="text-sm text-muted-foreground">{progressPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-emerald-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Search & Filter */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Participants</SelectItem>
                  <SelectItem value="checked_in">Checked In</SelectItem>
                  <SelectItem value="not_checked_in">Not Checked In</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Participants List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Participants ({participants.length})</span>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {participants.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchQuery || filterStatus !== 'all'
                      ? 'No participants match your search'
                      : 'No participants found'}
                  </div>
                ) : (
                  participants.map((participant) => (
                    <div
                      key={participant.id}
                      className={`flex items-center gap-4 p-3 rounded-lg border ${
                        participant.checkedIn
                          ? 'bg-green-50 border-green-200'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {participant.checkedIn ? (
                          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <X className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            {participant.firstName} {participant.lastName}
                          </span>
                          {participant.registrationType === 'individual' && (
                            <Badge variant="outline" className="text-xs">Individual</Badge>
                          )}
                          {!participant.liabilityFormCompleted && (
                            <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                              Missing Form
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {participant.groupName}
                          {participant.parishName && ` - ${participant.parishName}`}
                        </div>
                        {participant.checkedIn && participant.checkedInAt && (
                          <div className="text-xs text-green-600">
                            Checked in at {new Date(participant.checkedInAt).toLocaleTimeString()}
                          </div>
                        )}
                      </div>

                      <Button
                        variant={participant.checkedIn ? 'outline' : 'default'}
                        size="sm"
                        onClick={() => handleQuickCheckIn(participant)}
                        disabled={checkingIn === participant.id}
                        className={participant.checkedIn ? '' : 'bg-emerald-600 hover:bg-emerald-700'}
                      >
                        {checkingIn === participant.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : participant.checkedIn ? (
                          'Undo'
                        ) : (
                          <>
                            <CheckSquare className="w-4 h-4 mr-1" />
                            Check In
                          </>
                        )}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
