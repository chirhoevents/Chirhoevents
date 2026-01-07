'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  QrCode,
  Search,
  Users,
  Loader2,
  Check,
  AlertCircle,
  X,
  Printer,
  Mail,
  Home,
  FileText,
  CreditCard,
  BarChart3,
  Settings,
  Camera,
  RefreshCw,
} from 'lucide-react'
import { toast } from '@/lib/toast'

// Dynamic import for QR scanner to avoid SSR issues
const QRScanner = dynamic(
  () => import('@/components/salve/QRScanner').then((mod) => mod.QRScanner),
  { ssr: false, loading: () => <div className="text-center py-8"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div> }
)

interface GroupData {
  id: string
  groupName: string
  parishName: string | null
  accessCode: string
  groupLeaderName: string
  groupLeaderEmail: string
  totalParticipants: number
  registrationStatus: string
  payment: {
    status: string
    totalAmount: number
    paidAmount: number
    balanceRemaining: number
  }
  forms: {
    completed: number
    pending: number
  }
  housing: {
    assigned: boolean
  }
  participants: ParticipantData[]
}

interface ParticipantData {
  id: string
  firstName: string
  lastName: string
  age: number
  gender: string
  participantType: string
  liabilityFormCompleted: boolean
  checkedIn: boolean
  checkedInAt: string | null
  housing?: {
    buildingName: string
    roomNumber: string
    bedLetter: string
  } | null
  mealColor?: string | null
  smallGroup?: string | null
}

type CheckInStatus = 'idle' | 'scanning' | 'loading' | 'found' | 'not_found' | 'error'

export default function SalveCheckInPage() {
  const params = useParams()
  const eventId = params.eventId as string

  const [status, setStatus] = useState<CheckInStatus>('idle')
  const [searchQuery, setSearchQuery] = useState('')
  const [groupData, setGroupData] = useState<GroupData | null>(null)
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set())
  const [participantNotes, setParticipantNotes] = useState<Record<string, string>>({})
  const [checkingIn, setCheckingIn] = useState(false)
  const [eventName, setEventName] = useState('')
  const [stats, setStats] = useState({ totalExpected: 0, checkedIn: 0, issues: 0 })

  // Roster view modal
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false)

  // All participants modal
  const [isAllParticipantsOpen, setIsAllParticipantsOpen] = useState(false)
  const [allParticipants, setAllParticipants] = useState<any[]>([])
  const [allParticipantsLoading, setAllParticipantsLoading] = useState(false)
  const [allParticipantsSearch, setAllParticipantsSearch] = useState('')
  const [allParticipantsFilter, setAllParticipantsFilter] = useState<'all' | 'checked_in' | 'not_checked_in'>('all')

  // Success modal
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
  const [checkedInCount, setCheckedInCount] = useState(0)
  const [notCheckedInParticipants, setNotCheckedInParticipants] = useState<ParticipantData[]>([])

  useEffect(() => {
    fetchEventInfo()
    fetchStats()
  }, [eventId])

  async function fetchEventInfo() {
    try {
      const response = await fetch(`/api/admin/events/${eventId}`)
      if (response.ok) {
        const data = await response.json()
        setEventName(data.name || 'Event')
      }
    } catch (error) {
      console.error('Failed to fetch event info:', error)
    }
  }

  async function fetchStats() {
    try {
      const response = await fetch(`/api/admin/events/${eventId}/salve/stats`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  async function fetchAllParticipants() {
    setAllParticipantsLoading(true)
    try {
      const params = new URLSearchParams()
      if (allParticipantsSearch) params.set('search', allParticipantsSearch)
      if (allParticipantsFilter !== 'all') params.set('status', allParticipantsFilter)

      const response = await fetch(`/api/admin/events/${eventId}/salve/participants?${params}`)
      if (response.ok) {
        const data = await response.json()
        setAllParticipants(data.participants || [])
      }
    } catch (error) {
      console.error('Failed to fetch all participants:', error)
    } finally {
      setAllParticipantsLoading(false)
    }
  }

  useEffect(() => {
    if (isAllParticipantsOpen) {
      fetchAllParticipants()
    }
  }, [isAllParticipantsOpen, allParticipantsFilter])

  async function handleQuickCheckIn(participant: any) {
    try {
      const response = await fetch(`/api/admin/events/${eventId}/salve/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantIds: [participant.id],
          action: participant.checkedIn ? 'check_out' : 'check_in',
          registrationType: participant.registrationType,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update check-in status')
      }

      toast.success(participant.checkedIn ? 'Checked out successfully' : 'Checked in successfully')
      fetchAllParticipants()
      fetchStats()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update check-in status')
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) {
      toast.error('Please enter an access code or search term')
      return
    }

    setStatus('loading')
    setGroupData(null)

    try {
      const query = searchQuery.trim()
      // Check if this looks like an access code (alphanumeric, 4-8 chars)
      const isAccessCode = /^[A-Za-z0-9]{4,8}$/.test(query)

      const url = isAccessCode
        ? `/api/admin/events/${eventId}/salve/lookup?accessCode=${encodeURIComponent(query)}`
        : `/api/admin/events/${eventId}/salve/lookup?search=${encodeURIComponent(query)}`

      const response = await fetch(url)

      if (response.ok) {
        const data = await response.json()

        // Handle different response formats
        let group: GroupData | null = null

        if (data.results) {
          // Search response with multiple results
          if (data.results.length === 0) {
            setStatus('not_found')
            return
          } else if (data.results.length === 1) {
            // Single result - use it directly
            group = data.results[0]
          } else {
            // Multiple results - use the first one for now
            // TODO: Could show a selection modal
            group = data.results[0]
            toast.info(`Found ${data.results.length} matching groups. Showing first result.`)
          }
        } else if (data.id) {
          // Direct group response (access code or groupId lookup)
          group = data
        }

        if (group) {
          setGroupData(group)
          setStatus('found')

          // Pre-select all participants who aren't already checked in
          const notCheckedIn = new Set<string>(
            group.participants
              .filter((p: ParticipantData) => !p.checkedIn)
              .map((p: ParticipantData) => p.id)
          )
          setSelectedParticipants(notCheckedIn)
        } else {
          setStatus('not_found')
        }
      } else if (response.status === 404) {
        setStatus('not_found')
      } else {
        setStatus('error')
      }
    } catch (error) {
      console.error('Search failed:', error)
      setStatus('error')
    }
  }

  async function handleQrScan(accessCode: string) {
    if (!accessCode) {
      toast.error('Invalid QR code')
      setStatus('idle')
      return
    }

    setStatus('loading')
    setGroupData(null)
    setSearchQuery(accessCode) // Show what was scanned

    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/salve/lookup?accessCode=${encodeURIComponent(accessCode)}`
      )

      if (response.ok) {
        const data = await response.json()

        // Handle response - accessCode returns single group directly
        let group: GroupData | null = null

        if (data.results) {
          // Search response format
          if (data.results.length > 0) {
            group = data.results[0]
          }
        } else if (data.id) {
          // Direct group response
          group = data
        }

        if (group) {
          setGroupData(group)
          setStatus('found')
          toast.success(`Found: ${group.groupName}`)

          // Pre-select all participants who aren't already checked in
          const notCheckedIn = new Set<string>(
            group.participants
              .filter((p: ParticipantData) => !p.checkedIn)
              .map((p: ParticipantData) => p.id)
          )
          setSelectedParticipants(notCheckedIn)
        } else {
          setStatus('not_found')
          toast.error('Group not found for this QR code')
        }
      } else if (response.status === 404) {
        setStatus('not_found')
        toast.error('No group found with this access code')
      } else {
        setStatus('error')
        toast.error('Failed to look up group')
      }
    } catch (error) {
      console.error('QR lookup failed:', error)
      setStatus('error')
      toast.error('Failed to look up group')
    }
  }

  function toggleParticipant(participantId: string) {
    setSelectedParticipants(prev => {
      const next = new Set(prev)
      if (next.has(participantId)) {
        next.delete(participantId)
      } else {
        next.add(participantId)
      }
      return next
    })
  }

  function selectAllParticipants() {
    const all = new Set(
      groupData?.participants
        .filter(p => !p.checkedIn)
        .map(p => p.id) || []
    )
    setSelectedParticipants(all)
  }

  function deselectAllParticipants() {
    setSelectedParticipants(new Set())
  }

  async function handleCheckIn() {
    if (!groupData || selectedParticipants.size === 0) {
      toast.error('Please select at least one participant to check in')
      return
    }

    setCheckingIn(true)

    // Check if this is an individual registration
    const isIndividual = (groupData as any).type === 'individual'

    try {
      const response = await fetch(`/api/admin/events/${eventId}/salve/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupRegistrationId: groupData.id,
          participantIds: Array.from(selectedParticipants),
          action: 'check_in',
          registrationType: isIndividual ? 'individual' : 'group',
          absentParticipantIds: groupData.participants
            .filter(p => !p.checkedIn && !selectedParticipants.has(p.id))
            .map(p => p.id),
          notes: participantNotes,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to check in')
      }

      // Show success modal
      setCheckedInCount(selectedParticipants.size)
      setNotCheckedInParticipants(
        groupData.participants.filter(p => !p.checkedIn && !selectedParticipants.has(p.id))
      )
      setIsSuccessModalOpen(true)

      // Refresh stats
      fetchStats()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to check in')
    } finally {
      setCheckingIn(false)
    }
  }

  function resetSearch() {
    setStatus('idle')
    setSearchQuery('')
    setGroupData(null)
    setSelectedParticipants(new Set())
    setParticipantNotes({})
  }

  const totalExpected = stats?.totalExpected || 0
  const checkedIn = stats?.checkedIn || 0
  const issues = stats?.issues || 0
  const notCheckedIn = totalExpected - checkedIn
  const progressPercentage = totalExpected > 0
    ? Math.round((checkedIn / totalExpected) * 100)
    : 0

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/dashboard/admin" className="hover:text-navy">Dashboard</Link>
          <span>/</span>
          <Link href="/dashboard/admin/events" className="hover:text-navy">Events</Link>
          <span>/</span>
          <Link href={`/dashboard/admin/events/${eventId}`} className="hover:text-navy">{eventName}</Link>
          <span>/</span>
          <span className="text-navy font-medium">SALVE Check-In</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-navy">SALVE Check-In Station</h1>
            <p className="text-muted-foreground">{eventName} • Station #1</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full md:w-auto"
              onClick={() => setIsAllParticipantsOpen(true)}
            >
              <Users className="w-4 h-4 mr-2" />
              View All Attendance
            </Button>
            <Link href={`/dashboard/admin/events/${eventId}/salve/dashboard`}>
              <Button variant="outline" size="sm" className="w-full md:w-auto">
                <BarChart3 className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6">
        <Card>
          <CardContent className="p-3 md:pt-4 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Checked In</p>
                <p className="text-lg md:text-2xl font-bold text-green-600">
                  {checkedIn} / {totalExpected}
                </p>
              </div>
              <Check className="w-6 h-6 md:w-8 md:h-8 text-green-500 hidden sm:block" />
            </div>
            <Progress value={progressPercentage} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-1">{progressPercentage}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:pt-4 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Issues</p>
                <p className="text-lg md:text-2xl font-bold text-amber-600">{issues}</p>
              </div>
              <AlertCircle className="w-6 h-6 md:w-8 md:h-8 text-amber-500 hidden sm:block" />
            </div>
            <p className="text-xs text-muted-foreground mt-2 hidden md:block">Missing forms or payments</p>
          </CardContent>
        </Card>

        <Card className="bg-navy text-white">
          <CardContent className="p-3 md:pt-4 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-white/70">Not Checked In</p>
                <p className="text-lg md:text-2xl font-bold">
                  {notCheckedIn}
                </p>
              </div>
              <Users className="w-6 h-6 md:w-8 md:h-8 text-white/50 hidden sm:block" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search / Scan Section */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          {status === 'idle' && (
            <div className="space-y-6">
              <div className="text-center">
                <QrCode className="w-16 h-16 mx-auto text-navy mb-4" />
                <h2 className="text-xl font-semibold mb-2">Scan QR Code or Search</h2>
                <p className="text-muted-foreground">
                  Scan the group leader&apos;s QR code or search by name, email, or access code
                </p>
              </div>

              {/* Scan QR Code Button */}
              <div className="flex justify-center">
                <Button
                  onClick={() => setStatus('scanning')}
                  size="lg"
                  className="h-14 px-8 text-lg bg-navy text-white hover:bg-navy/90"
                >
                  <Camera className="w-6 h-6 mr-3" />
                  Scan QR Code
                </Button>
              </div>

              <div className="flex items-center gap-4 max-w-xl mx-auto">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-sm text-muted-foreground">or search manually</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <div className="flex gap-2 max-w-xl mx-auto">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or access code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-10 h-12"
                  />
                </div>
                <Button onClick={handleSearch} className="h-12 px-6">
                  Search
                </Button>
              </div>
            </div>
          )}

          {status === 'scanning' && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h2 className="text-xl font-semibold">Scan QR Code</h2>
                <p className="text-muted-foreground">
                  Point camera at the group leader&apos;s QR code
                </p>
              </div>
              <QRScanner
                onScan={handleQrScan}
                onError={(err) => {
                  console.error('QR Error:', err)
                  toast.error('QR scanner error. Try manual search.')
                }}
                onClose={() => setStatus('idle')}
              />
            </div>
          )}

          {status === 'loading' && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-navy" />
              <p className="text-muted-foreground mt-4">Looking up registration...</p>
            </div>
          )}

          {status === 'not_found' && (
            <div className="text-center py-12">
              <X className="w-16 h-16 mx-auto text-red-500 mb-4" />
              <h2 className="text-xl font-semibold text-red-600 mb-2">Not Found</h2>
              <p className="text-muted-foreground mb-4">
                No registration found for &quot;{searchQuery}&quot;
              </p>
              <Button onClick={resetSearch}>Try Again</Button>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
              <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
              <p className="text-muted-foreground mb-4">
                Something went wrong. Please try again.
              </p>
              <Button onClick={resetSearch}>Try Again</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Group Check-In Screen */}
      {status === 'found' && groupData && (
        <div className="space-y-6">
          {/* Welcome Banner */}
          <Card className="bg-gradient-to-r from-navy to-[#2A4A6F] text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">
                    Salve, {groupData.groupLeaderName.split(' ')[0]}!
                  </h2>
                  <p className="text-white/80">Welcome to {eventName}</p>
                </div>
                <Button variant="outline" className="text-white border-white hover:bg-white/10" onClick={resetSearch}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Group Info & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{groupData.groupName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {groupData.parishName && (
                  <p className="text-muted-foreground">{groupData.parishName}</p>
                )}
                <p className="font-medium">{groupData.totalParticipants} Participants Registered</p>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {groupData.payment.balanceRemaining <= 0 ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                    )}
                    <span className="text-sm">
                      Payment: {groupData.payment.balanceRemaining <= 0 ? 'Paid in Full' : `$${groupData.payment.balanceRemaining.toFixed(2)} remaining`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {groupData.forms.pending === 0 ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                    )}
                    <span className="text-sm">
                      Liability Forms: {groupData.forms.completed}/{groupData.forms.completed + groupData.forms.pending} Complete
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {groupData.housing.assigned ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                    )}
                    <span className="text-sm">
                      Housing: {groupData.housing.assigned ? 'Assigned' : 'Not Assigned'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Issues */}
            {(groupData.payment.balanceRemaining > 0 || groupData.forms.pending > 0) && (
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader>
                  <CardTitle className="text-amber-800 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Outstanding Issues
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {groupData.payment.balanceRemaining > 0 && (
                      <li className="text-sm text-amber-700">
                        • Outstanding balance: ${groupData.payment.balanceRemaining.toFixed(2)}
                      </li>
                    )}
                    {groupData.participants
                      .filter(p => !p.liabilityFormCompleted)
                      .slice(0, 5)
                      .map(p => (
                        <li key={p.id} className="text-sm text-amber-700">
                          • {p.firstName} {p.lastName} - Missing Liability Form
                        </li>
                      ))}
                    {groupData.forms.pending > 5 && (
                      <li className="text-sm text-amber-700">
                        ... and {groupData.forms.pending - 5} more missing forms
                      </li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Participant Roster */}
          <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <CardTitle className="text-lg">Check In Participants</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAllParticipants} className="flex-1 md:flex-none">
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAllParticipants} className="flex-1 md:flex-none">
                  Deselect All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {groupData.participants.map((participant) => {
                    const isSelected = selectedParticipants.has(participant.id)
                    const isAlreadyCheckedIn = participant.checkedIn

                    return (
                      <div
                        key={participant.id}
                        className={`flex items-center gap-4 p-3 rounded-lg border ${
                          isAlreadyCheckedIn
                            ? 'bg-green-50 border-green-200'
                            : isSelected
                              ? 'bg-navy/5 border-navy'
                              : 'bg-white border-gray-200'
                        }`}
                      >
                        {!isAlreadyCheckedIn && (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleParticipant(participant.id)}
                          />
                        )}

                        {isAlreadyCheckedIn && (
                          <Check className="w-5 h-5 text-green-600" />
                        )}

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {participant.firstName} {participant.lastName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({participant.age}, {participant.gender === 'male' ? 'M' : 'F'})
                            </span>
                            {!participant.liabilityFormCompleted && (
                              <Badge variant="outline" className="text-amber-600 border-amber-300">
                                Missing Form
                              </Badge>
                            )}
                            {isAlreadyCheckedIn && (
                              <Badge className="bg-green-500">Checked In</Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {participant.housing ? (
                              <span>{participant.housing.buildingName} {participant.housing.roomNumber}-{participant.housing.bedLetter}</span>
                            ) : (
                              <span className="text-amber-600">No housing assigned</span>
                            )}
                            {participant.mealColor && (
                              <span className="ml-2">• {participant.mealColor} Meals</span>
                            )}
                            {participant.smallGroup && (
                              <span className="ml-2">• SG-{participant.smallGroup}</span>
                            )}
                          </div>
                        </div>

                        {!isAlreadyCheckedIn && !isSelected && (
                          <Input
                            placeholder="Add note (arriving later?)"
                            value={participantNotes[participant.id] || ''}
                            onChange={(e) => setParticipantNotes(prev => ({
                              ...prev,
                              [participant.id]: e.target.value,
                            }))}
                            className="w-48 text-sm"
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>

              <div className="mt-4 pt-4 border-t flex items-center justify-between">
                <div>
                  <span className="font-medium">
                    {selectedParticipants.size} selected
                  </span>
                  <span className="text-muted-foreground ml-2">
                    ({groupData.participants.filter(p => p.checkedIn).length} already checked in)
                  </span>
                </div>
                <Button
                  onClick={handleCheckIn}
                  disabled={checkingIn || selectedParticipants.size === 0}
                  className="px-8"
                >
                  {checkingIn && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <Check className="w-4 h-4 mr-2" />
                  Check In Selected ({selectedParticipants.size})
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Success Modal */}
      <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-green-600 flex items-center gap-2">
              <Check className="w-6 h-6" />
              Check-In Successful!
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-600">{checkedInCount}</p>
              <p className="text-sm text-green-700">participants checked in</p>
            </div>

            {notCheckedInParticipants.length > 0 && (
              <div className="bg-amber-50 p-4 rounded-lg">
                <p className="font-medium text-amber-800 mb-2">Not Checked In ({notCheckedInParticipants.length}):</p>
                <ul className="text-sm text-amber-700 space-y-1">
                  {notCheckedInParticipants.map(p => (
                    <li key={p.id}>
                      • {p.firstName} {p.lastName}
                      {participantNotes[p.id] && (
                        <span className="text-amber-600"> - {participantNotes[p.id]}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-2">
              <p className="font-medium">Next Steps:</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="h-auto py-3">
                  <Printer className="w-4 h-4 mr-2" />
                  Print Welcome Packet
                </Button>
                <Button variant="outline" className="h-auto py-3">
                  <Printer className="w-4 h-4 mr-2" />
                  Print Name Tags ({checkedInCount})
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setIsSuccessModalOpen(false)
                resetSearch()
              }}
            >
              Done - Next Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* All Participants Modal */}
      <Dialog open={isAllParticipantsOpen} onOpenChange={setIsAllParticipantsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-navy flex items-center gap-2">
              <Users className="w-5 h-5" />
              All Attendance - {eventName}
            </DialogTitle>
            <DialogDescription>
              View and manage check-in status for all participants
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={allParticipantsSearch}
                  onChange={(e) => setAllParticipantsSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchAllParticipants()}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={allParticipantsFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAllParticipantsFilter('all')}
                >
                  All
                </Button>
                <Button
                  variant={allParticipantsFilter === 'checked_in' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAllParticipantsFilter('checked_in')}
                  className={allParticipantsFilter === 'checked_in' ? 'bg-green-600 hover:bg-green-700' : ''}
                >
                  <Check className="w-4 h-4 mr-1" />
                  Checked In
                </Button>
                <Button
                  variant={allParticipantsFilter === 'not_checked_in' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAllParticipantsFilter('not_checked_in')}
                  className={allParticipantsFilter === 'not_checked_in' ? 'bg-amber-600 hover:bg-amber-700' : ''}
                >
                  <X className="w-4 h-4 mr-1" />
                  Not Checked In
                </Button>
                <Button variant="outline" size="sm" onClick={fetchAllParticipants}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Participants List */}
            <ScrollArea className="h-[500px] border rounded-lg">
              {allParticipantsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-navy" />
                </div>
              ) : allParticipants.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mb-2 opacity-50" />
                  <p>No participants found</p>
                </div>
              ) : (
                <div className="divide-y">
                  {allParticipants.map((participant) => (
                    <div
                      key={`${participant.registrationType}-${participant.id}`}
                      className={`flex items-center justify-between p-3 hover:bg-gray-50 ${
                        participant.checkedIn ? 'bg-green-50' : ''
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {participant.firstName} {participant.lastName}
                          </span>
                          {participant.checkedIn ? (
                            <Badge className="bg-green-500">Checked In</Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-300">
                              Not Checked In
                            </Badge>
                          )}
                          {participant.registrationType === 'individual' && (
                            <Badge variant="secondary">Individual</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {participant.groupName}
                          {participant.email && ` • ${participant.email}`}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={participant.checkedIn ? 'outline' : 'default'}
                        onClick={() => handleQuickCheckIn(participant)}
                        className={!participant.checkedIn ? 'bg-green-600 hover:bg-green-700' : ''}
                      >
                        {participant.checkedIn ? (
                          <>
                            <X className="w-4 h-4 mr-1" />
                            Check Out
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-1" />
                            Check In
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Summary */}
            <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
              <span>Showing {allParticipants.length} participants</span>
              <span>
                {allParticipants.filter(p => p.checkedIn).length} checked in / {allParticipants.filter(p => !p.checkedIn).length} not checked in
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
