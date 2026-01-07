'use client'

import { useState, useEffect } from 'react'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  Camera,
  ArrowLeft,
  CheckSquare,
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

export default function SalveDedicatedPortal() {
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
      } else {
        setError('Failed to load event')
      }
    } catch (err) {
      setError('Failed to load event')
    } finally {
      setLoading(false)
    }
  }

  async function fetchStats() {
    try {
      const response = await fetch(`/api/admin/events/${eventId}/salve/stats`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
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
      const isAccessCode = /^[A-Za-z0-9]{4,8}$/.test(query)

      const url = isAccessCode
        ? `/api/admin/events/${eventId}/salve/lookup?accessCode=${encodeURIComponent(query)}`
        : `/api/admin/events/${eventId}/salve/lookup?search=${encodeURIComponent(query)}`

      const response = await fetch(url)

      if (response.ok) {
        const data = await response.json()
        let group: GroupData | null = null

        if (data.results) {
          if (data.results.length === 0) {
            setStatus('not_found')
            return
          } else if (data.results.length === 1) {
            group = data.results[0]
          } else {
            group = data.results[0]
            toast.info(`Found ${data.results.length} matching groups. Showing first result.`)
          }
        } else if (data.id) {
          group = data
        }

        if (group) {
          setGroupData(group)
          setStatus('found')
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
    } catch (err) {
      console.error('Search failed:', err)
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
    setSearchQuery(accessCode)

    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/salve/lookup?accessCode=${encodeURIComponent(accessCode)}`
      )

      if (response.ok) {
        const data = await response.json()
        let group: GroupData | null = null

        if (data.results) {
          if (data.results.length > 0) {
            group = data.results[0]
          }
        } else if (data.id) {
          group = data
        }

        if (group) {
          setGroupData(group)
          setStatus('found')
          toast.success(`Found: ${group.groupName}`)
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
    } catch (err) {
      console.error('QR lookup failed:', err)
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

      setCheckedInCount(selectedParticipants.size)
      setNotCheckedInParticipants(
        groupData.participants.filter(p => !p.checkedIn && !selectedParticipants.has(p.id))
      )
      setIsSuccessModalOpen(true)
      fetchStats()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to check in')
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
  const notCheckedInCount = totalExpected - checkedIn
  const progressPercentage = totalExpected > 0 ? Math.round((checkedIn / totalExpected) * 100) : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading SALVE Check-In Portal...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Error Loading Portal</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Link href="/dashboard/admin/salve">
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
      <header className="bg-emerald-600 text-white py-4 px-6 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <CheckSquare className="w-7 h-7 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold">SALVE Check-In Portal</h1>
              <p className="text-sm text-white/80">{eventName}</p>
            </div>
          </div>
          <Link
            href="/dashboard/admin/salve"
            className="flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Exit Portal
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Checked In</p>
                  <p className="text-2xl font-bold text-green-600">{checkedIn} / {totalExpected}</p>
                </div>
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <Progress value={progressPercentage} className="mt-2" />
              <p className="text-xs text-gray-500 mt-1">{progressPercentage}%</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Issues</p>
                  <p className="text-2xl font-bold text-amber-600">{issues}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-amber-500" />
              </div>
              <p className="text-xs text-gray-500 mt-2">Missing forms/payments</p>
            </CardContent>
          </Card>

          <Card className="bg-emerald-600 text-white">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/70">Not Checked In</p>
                  <p className="text-2xl font-bold">{notCheckedInCount}</p>
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
                  <QrCode className="w-20 h-20 mx-auto text-emerald-600 mb-4" />
                  <h2 className="text-2xl font-semibold mb-2">Scan QR Code or Search</h2>
                  <p className="text-gray-500">
                    Scan the group leader&apos;s QR code or search by name, email, or access code
                  </p>
                </div>

                <div className="flex justify-center">
                  <Button
                    onClick={() => setStatus('scanning')}
                    size="lg"
                    className="h-16 px-12 text-xl bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    <Camera className="w-8 h-8 mr-4" />
                    Scan QR Code
                  </Button>
                </div>

                <div className="flex items-center gap-4 max-w-2xl mx-auto">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-sm text-gray-400">or search manually</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <div className="flex gap-2 max-w-2xl mx-auto">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      placeholder="Search by name, email, or access code..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="pl-12 h-14 text-lg"
                    />
                  </div>
                  <Button onClick={handleSearch} className="h-14 px-8 bg-emerald-600 hover:bg-emerald-700">
                    Search
                  </Button>
                </div>
              </div>
            )}

            {status === 'scanning' && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <h2 className="text-xl font-semibold">Scan QR Code</h2>
                  <p className="text-gray-500">Point camera at the group leader&apos;s QR code</p>
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
                <Loader2 className="w-16 h-16 animate-spin mx-auto text-emerald-600" />
                <p className="text-gray-500 mt-4 text-lg">Looking up registration...</p>
              </div>
            )}

            {status === 'not_found' && (
              <div className="text-center py-12">
                <X className="w-20 h-20 mx-auto text-red-500 mb-4" />
                <h2 className="text-2xl font-semibold text-red-600 mb-2">Not Found</h2>
                <p className="text-gray-500 mb-4">No registration found for &quot;{searchQuery}&quot;</p>
                <Button onClick={resetSearch} size="lg">Try Again</Button>
              </div>
            )}

            {status === 'error' && (
              <div className="text-center py-12">
                <AlertCircle className="w-20 h-20 mx-auto text-red-500 mb-4" />
                <h2 className="text-2xl font-semibold text-red-600 mb-2">Error</h2>
                <p className="text-gray-500 mb-4">Something went wrong. Please try again.</p>
                <Button onClick={resetSearch} size="lg">Try Again</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Group Check-In Screen */}
        {status === 'found' && groupData && (
          <div className="space-y-6">
            {/* Welcome Banner */}
            <Card className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white">
              <CardContent className="pt-6 pb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-bold">Salve, {groupData.groupLeaderName.split(' ')[0]}!</h2>
                    <p className="text-white/80 text-lg">Welcome to {eventName}</p>
                    <p className="text-white/60 mt-1">{groupData.groupName}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="lg"
                    className="text-white border-white hover:bg-white/10"
                    onClick={resetSearch}
                  >
                    <X className="w-5 h-5 mr-2" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Issues Alert */}
            {(groupData.payment.balanceRemaining > 0 || groupData.forms.pending > 0) && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-amber-800">Outstanding Issues</h3>
                      <ul className="text-sm text-amber-700 mt-1 space-y-1">
                        {groupData.payment.balanceRemaining > 0 && (
                          <li>Outstanding balance: ${groupData.payment.balanceRemaining.toFixed(2)}</li>
                        )}
                        {groupData.forms.pending > 0 && (
                          <li>{groupData.forms.pending} participants missing liability forms</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Participant Roster */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl">Check In Participants ({groupData.participants.length})</CardTitle>
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
                          className={`flex items-center gap-4 p-4 rounded-lg border text-lg ${
                            isAlreadyCheckedIn
                              ? 'bg-green-50 border-green-200'
                              : isSelected
                                ? 'bg-emerald-50 border-emerald-300'
                                : 'bg-white border-gray-200'
                          }`}
                        >
                          {!isAlreadyCheckedIn && (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleParticipant(participant.id)}
                              className="w-6 h-6"
                            />
                          )}

                          {isAlreadyCheckedIn && (
                            <Check className="w-6 h-6 text-green-600" />
                          )}

                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <span className="font-semibold">
                                {participant.firstName} {participant.lastName}
                              </span>
                              <span className="text-sm text-gray-500">
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
                            {participant.housing && (
                              <div className="text-sm text-gray-500 mt-1">
                                {participant.housing.buildingName} Room {participant.housing.roomNumber}-{participant.housing.bedLetter}
                              </div>
                            )}
                          </div>

                          {!isAlreadyCheckedIn && !isSelected && (
                            <Input
                              placeholder="Note (arriving later?)"
                              value={participantNotes[participant.id] || ''}
                              onChange={(e) => setParticipantNotes(prev => ({
                                ...prev,
                                [participant.id]: e.target.value,
                              }))}
                              className="w-48"
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>

                <div className="mt-6 pt-4 border-t flex items-center justify-between">
                  <div className="text-lg">
                    <span className="font-semibold">{selectedParticipants.size} selected</span>
                    <span className="text-gray-500 ml-2">
                      ({groupData.participants.filter(p => p.checkedIn).length} already checked in)
                    </span>
                  </div>
                  <Button
                    onClick={handleCheckIn}
                    disabled={checkingIn || selectedParticipants.size === 0}
                    size="lg"
                    className="px-8 h-14 text-lg bg-emerald-600 hover:bg-emerald-700"
                  >
                    {checkingIn && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
                    <Check className="w-5 h-5 mr-2" />
                    Check In ({selectedParticipants.size})
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Success Modal */}
      <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-green-600 flex items-center gap-2 text-xl">
              <Check className="w-7 h-7" />
              Check-In Successful!
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-green-50 p-6 rounded-lg text-center">
              <p className="text-4xl font-bold text-green-600">{checkedInCount}</p>
              <p className="text-green-700">participants checked in</p>
            </div>

            {notCheckedInParticipants.length > 0 && (
              <div className="bg-amber-50 p-4 rounded-lg">
                <p className="font-medium text-amber-800 mb-2">
                  Not Checked In ({notCheckedInParticipants.length}):
                </p>
                <ul className="text-sm text-amber-700 space-y-1">
                  {notCheckedInParticipants.map(p => (
                    <li key={p.id}>
                      {p.firstName} {p.lastName}
                      {participantNotes[p.id] && (
                        <span className="text-amber-600"> - {participantNotes[p.id]}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-12">
                <Printer className="w-4 h-4 mr-2" />
                Print Welcome Packet
              </Button>
              <Button variant="outline" className="h-12">
                <Printer className="w-4 h-4 mr-2" />
                Print Name Tags
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setIsSuccessModalOpen(false)
                resetSearch()
              }}
              size="lg"
              className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700"
            >
              Done - Next Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
