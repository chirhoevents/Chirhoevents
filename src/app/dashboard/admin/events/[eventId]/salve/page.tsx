'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
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

  async function handleSearch() {
    if (!searchQuery.trim()) {
      toast.error('Please enter an access code or search term')
      return
    }

    setStatus('loading')
    setGroupData(null)

    try {
      const response = await fetch(`/api/admin/events/${eventId}/salve/lookup?q=${encodeURIComponent(searchQuery.trim())}`)

      if (response.ok) {
        const data = await response.json()
        setGroupData(data)
        setStatus('found')

        // Pre-select all participants who aren't already checked in
        const notCheckedIn = new Set(
          data.participants
            .filter((p: ParticipantData) => !p.checkedIn)
            .map((p: ParticipantData) => p.id)
        )
        setSelectedParticipants(notCheckedIn)
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

    try {
      const response = await fetch(`/api/admin/events/${eventId}/salve/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupRegistrationId: groupData.id,
          participantIds: Array.from(selectedParticipants),
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

  const progressPercentage = stats.totalExpected > 0
    ? Math.round((stats.checkedIn / stats.totalExpected) * 100)
    : 0

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/dashboard/admin" className="hover:text-navy">Dashboard</Link>
          <span>/</span>
          <Link href="/dashboard/admin/events" className="hover:text-navy">Events</Link>
          <span>/</span>
          <Link href={`/dashboard/admin/events/${eventId}`} className="hover:text-navy">{eventName}</Link>
          <span>/</span>
          <span className="text-navy font-medium">SALVE Check-In</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-navy">SALVE Check-In Station</h1>
            <p className="text-muted-foreground">{eventName} • Station #1</p>
          </div>
          <div className="flex gap-2">
            <Link href={`/dashboard/admin/events/${eventId}/salve/welcome-packets`}>
              <Button variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                Welcome Packets
              </Button>
            </Link>
            <Link href={`/dashboard/admin/events/${eventId}/salve/name-tags`}>
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Name Tag Designer
              </Button>
            </Link>
            <Link href={`/dashboard/admin/events/${eventId}/salve/dashboard`}>
              <Button variant="outline">
                <BarChart3 className="w-4 h-4 mr-2" />
                View Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Checked In</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.checkedIn} / {stats.totalExpected}
                </p>
              </div>
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <Progress value={progressPercentage} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-1">{progressPercentage}% complete</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Issues</p>
                <p className="text-2xl font-bold text-amber-600">{stats.issues}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-amber-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Missing forms or payments</p>
          </CardContent>
        </Card>

        <Card className="bg-navy text-white">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/70">Not Checked In</p>
                <p className="text-2xl font-bold">
                  {stats.totalExpected - stats.checkedIn}
                </p>
              </div>
              <Users className="w-8 h-8 text-white/50" />
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
                  Scan the group leader's QR code or search by name, email, or access code
                </p>
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
                No registration found for "{searchQuery}"
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
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Check In Participants</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAllParticipants}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAllParticipants}>
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
    </div>
  )
}
