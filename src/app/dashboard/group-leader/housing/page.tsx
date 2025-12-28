'use client'

import { useState, useEffect } from 'react'
import { useEvent } from '@/contexts/EventContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Home,
  Users,
  Loader2,
  Check,
  AlertCircle,
  Lock,
  Unlock,
  Download,
  Send,
  RefreshCw,
  Wand2,
  Info,
  ChevronRight,
} from 'lucide-react'
import { toast } from '@/lib/toast'

// Utility function for bed number to letter conversion
function bedNumberToLetter(bedNumber: number): string {
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
  return letters[bedNumber - 1] || bedNumber.toString()
}

// Types
interface Room {
  id: string
  roomNumber: string
  buildingName: string
  floor: number
  capacity: number
  currentOccupancy: number
  gender: string
  housingType: string
  beds: Bed[]
}

interface Bed {
  bedNumber: number
  bedLetter: string
  participantId: string | null
  participantName: string | null
}

interface Participant {
  id: string
  firstName: string
  lastName: string
  age: number
  gender: string
  participantType: string
  isAssigned: boolean
  roomId: string | null
  bedNumber: number | null
}

interface HousingData {
  isLocked: boolean
  submittedAt: string | null
  unlockRequested: boolean
  unlockRequestedAt: string | null
  rooms: Room[]
  participants: Participant[]
  stats: {
    totalParticipants: number
    assignedParticipants: number
    maleU18: { total: number; assigned: number }
    femaleU18: { total: number; assigned: number }
    maleChaperone: { total: number; assigned: number }
    femaleChaperone: { total: number; assigned: number }
  }
}

type HousingCategory = 'male_u18' | 'female_u18' | 'male_chaperone' | 'female_chaperone'

const CATEGORY_LABELS: Record<HousingCategory, string> = {
  male_u18: 'Male Youth Under 18',
  female_u18: 'Female Youth Under 18',
  male_chaperone: 'Male Chaperones',
  female_chaperone: 'Female Chaperones',
}

export default function HousingPage() {
  const { selectedEventId } = useEvent()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<HousingData | null>(null)
  const [activeTab, setActiveTab] = useState<HousingCategory>('male_u18')

  // Assignment modal state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [selectedBed, setSelectedBed] = useState<{
    roomId: string
    roomNumber: string
    buildingName: string
    bedNumber: number
    category: HousingCategory
  } | null>(null)
  const [assigning, setAssigning] = useState(false)

  // Submit modal state
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [acknowledgeUnassigned, setAcknowledgeUnassigned] = useState(false)

  // Auto-assign modal state
  const [isAutoAssignModalOpen, setIsAutoAssignModalOpen] = useState(false)
  const [autoAssigning, setAutoAssigning] = useState(false)

  useEffect(() => {
    if (selectedEventId) {
      fetchHousingData()
    }
  }, [selectedEventId])

  async function fetchHousingData() {
    setLoading(true)
    try {
      const response = await fetch(`/api/group-leader/housing?eventId=${selectedEventId}`)
      if (response.ok) {
        const result = await response.json()
        setData(result)

        // Set default active tab based on available categories
        if (result.stats) {
          if (result.stats.maleU18.total > 0) setActiveTab('male_u18')
          else if (result.stats.femaleU18.total > 0) setActiveTab('female_u18')
          else if (result.stats.maleChaperone.total > 0) setActiveTab('male_chaperone')
          else if (result.stats.femaleChaperone.total > 0) setActiveTab('female_chaperone')
        }
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to load housing data')
      }
    } catch (error) {
      console.error('Failed to fetch housing data:', error)
      toast.error('Failed to load housing data')
    } finally {
      setLoading(false)
    }
  }

  function getParticipantCategory(p: Participant): HousingCategory | null {
    const isMale = p.gender === 'male'
    const isUnder18 = p.age < 18 || p.participantType === 'youth_u18'
    const isChaperone = p.participantType === 'chaperone' || p.participantType === 'youth_o18'

    if (p.participantType === 'priest') return null // Clergy excluded

    if (isMale && isUnder18) return 'male_u18'
    if (!isMale && isUnder18) return 'female_u18'
    if (isMale && isChaperone) return 'male_chaperone'
    if (!isMale && isChaperone) return 'female_chaperone'

    // Default based on age
    if (isMale && p.age < 18) return 'male_u18'
    if (!isMale && p.age < 18) return 'female_u18'
    if (isMale) return 'male_chaperone'
    return 'female_chaperone'
  }

  function getRoomCategory(room: Room): HousingCategory | null {
    const gender = room.gender?.toLowerCase()
    const type = room.housingType?.toLowerCase()

    if (type === 'clergy') return null
    if (gender === 'male' && type === 'youth_u18') return 'male_u18'
    if (gender === 'female' && type === 'youth_u18') return 'female_u18'
    if (gender === 'male' && (type === 'chaperone_18plus' || type === 'general')) return 'male_chaperone'
    if (gender === 'female' && (type === 'chaperone_18plus' || type === 'general')) return 'female_chaperone'
    return null
  }

  function getRoomsForCategory(category: HousingCategory): Room[] {
    if (!data) return []
    return data.rooms.filter(r => getRoomCategory(r) === category)
  }

  function getUnassignedParticipantsForCategory(category: HousingCategory): Participant[] {
    if (!data) return []
    return data.participants.filter(p => !p.isAssigned && getParticipantCategory(p) === category)
  }

  function openAssignModal(roomId: string, roomNumber: string, buildingName: string, bedNumber: number, category: HousingCategory) {
    setSelectedBed({ roomId, roomNumber, buildingName, bedNumber, category })
    setIsAssignModalOpen(true)
  }

  async function handleAssign(participantId: string) {
    if (!selectedBed) return

    setAssigning(true)
    try {
      const response = await fetch('/api/group-leader/housing/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEventId,
          participantId,
          roomId: selectedBed.roomId,
          bedNumber: selectedBed.bedNumber,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to assign participant')
      }

      toast.success('Participant assigned successfully')
      setIsAssignModalOpen(false)
      setSelectedBed(null)
      fetchHousingData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign participant')
    } finally {
      setAssigning(false)
    }
  }

  async function handleUnassign(participantId: string) {
    try {
      const response = await fetch('/api/group-leader/housing/unassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEventId,
          participantId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to unassign participant')
      }

      toast.success('Participant unassigned')
      fetchHousingData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to unassign participant')
    }
  }

  async function handleAutoAssign() {
    setAutoAssigning(true)
    try {
      const response = await fetch('/api/group-leader/housing/auto-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEventId,
          category: activeTab,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to auto-assign')
      }

      const result = await response.json()
      toast.success(`${result.assigned} participants auto-assigned`)
      setIsAutoAssignModalOpen(false)
      fetchHousingData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to auto-assign')
    } finally {
      setAutoAssigning(false)
    }
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const response = await fetch('/api/group-leader/housing/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEventId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to submit assignments')
      }

      toast.success('Housing assignments submitted successfully!')
      setIsSubmitModalOpen(false)
      setAcknowledgeUnassigned(false)
      fetchHousingData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit assignments')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRequestUnlock() {
    try {
      const response = await fetch('/api/group-leader/housing/request-unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEventId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to request unlock')
      }

      toast.success('Unlock request sent to event organizers')
      fetchHousingData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to request unlock')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-navy" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-navy">Housing Assignments</h1>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12 text-muted-foreground">
              <Home className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No Housing Available</p>
              <p className="text-sm mt-2">
                The event organizers have not yet allocated rooms for your group.
                Please check back later or contact the organizers.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { stats, isLocked, submittedAt, unlockRequested, unlockRequestedAt, rooms, participants } = data
  const progressPercentage = stats.totalParticipants > 0
    ? Math.round((stats.assignedParticipants / stats.totalParticipants) * 100)
    : 0

  // Get unassigned participants for submit warning
  const unassignedParticipants = participants.filter(p => !p.isAssigned && getParticipantCategory(p) !== null)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy">Housing Assignments</h1>
          <p className="text-muted-foreground">
            Assign your participants to their room beds
          </p>
        </div>
        <Button variant="outline" onClick={fetchHousingData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Clergy Notice */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> Clergy housing is assigned directly by the event organizers and is not shown here.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Locked State */}
      {isLocked && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-green-900">Housing Assignments Submitted</h3>
                <p className="text-sm text-green-700 mt-1">
                  Your housing assignments have been locked.
                  {submittedAt && (
                    <> Submitted on {new Date(submittedAt).toLocaleDateString()}.</>
                  )}
                </p>
                {unlockRequested ? (
                  <p className="text-sm text-green-700 mt-2">
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                    Unlock request sent
                    {unlockRequestedAt && (
                      <> on {new Date(unlockRequestedAt).toLocaleDateString()}</>
                    )}
                    . Waiting for organizer approval.
                  </p>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={handleRequestUnlock}
                  >
                    <Unlock className="w-4 h-4 mr-2" />
                    Request Unlock
                  </Button>
                )}
              </div>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Assignment Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>{stats.assignedParticipants} / {stats.totalParticipants} Assigned</span>
                <span>{progressPercentage}%</span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {stats.maleU18.total > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <div className="text-xs text-blue-600 font-medium">Male U18</div>
                  <div className="text-lg font-bold text-blue-800">
                    {stats.maleU18.assigned}/{stats.maleU18.total}
                  </div>
                </div>
              )}
              {stats.femaleU18.total > 0 && (
                <div className="bg-pink-50 p-3 rounded-lg border border-pink-100">
                  <div className="text-xs text-pink-600 font-medium">Female U18</div>
                  <div className="text-lg font-bold text-pink-800">
                    {stats.femaleU18.assigned}/{stats.femaleU18.total}
                  </div>
                </div>
              )}
              {stats.maleChaperone.total > 0 && (
                <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                  <div className="text-xs text-indigo-600 font-medium">Male Chaperones</div>
                  <div className="text-lg font-bold text-indigo-800">
                    {stats.maleChaperone.assigned}/{stats.maleChaperone.total}
                  </div>
                </div>
              )}
              {stats.femaleChaperone.total > 0 && (
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                  <div className="text-xs text-purple-600 font-medium">Female Chaperones</div>
                  <div className="text-lg font-bold text-purple-800">
                    {stats.femaleChaperone.assigned}/{stats.femaleChaperone.total}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as HousingCategory)}>
        <TabsList className="bg-muted/50">
          {stats.maleU18.total > 0 && (
            <TabsTrigger value="male_u18">Male U18</TabsTrigger>
          )}
          {stats.femaleU18.total > 0 && (
            <TabsTrigger value="female_u18">Female U18</TabsTrigger>
          )}
          {stats.maleChaperone.total > 0 && (
            <TabsTrigger value="male_chaperone">Male Chaperones</TabsTrigger>
          )}
          {stats.femaleChaperone.total > 0 && (
            <TabsTrigger value="female_chaperone">Female Chaperones</TabsTrigger>
          )}
        </TabsList>

        {(['male_u18', 'female_u18', 'male_chaperone', 'female_chaperone'] as HousingCategory[]).map(category => (
          <TabsContent key={category} value={category} className="mt-4 space-y-4">
            {/* Auto-assign button */}
            {!isLocked && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsAutoAssignModalOpen(true)}
                  disabled={getUnassignedParticipantsForCategory(category).length === 0}
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  Auto-Assign Remaining
                </Button>
              </div>
            )}

            {/* Rooms Grid */}
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Allocated Rooms</h3>
              {getRoomsForCategory(category).length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8 text-muted-foreground">
                      <Home className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No rooms allocated for this category</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getRoomsForCategory(category).map(room => (
                    <Card key={room.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center justify-between">
                          <span>{room.buildingName}, Room {room.roomNumber}</span>
                          <Badge variant="outline">
                            {room.beds.filter(b => b.participantId).length}/{room.capacity} beds
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-2">
                          {room.beds.map(bed => (
                            <div
                              key={bed.bedNumber}
                              className={`p-3 rounded-lg border-2 text-center ${
                                bed.participantId
                                  ? 'bg-green-50 border-green-200'
                                  : 'bg-gray-50 border-dashed border-gray-200 hover:border-navy cursor-pointer'
                              }`}
                              onClick={() => {
                                if (!isLocked && !bed.participantId) {
                                  openAssignModal(room.id, room.roomNumber, room.buildingName, bed.bedNumber, category)
                                }
                              }}
                            >
                              <div className="text-xs text-muted-foreground mb-1">
                                Bed {bed.bedLetter}
                              </div>
                              {bed.participantId ? (
                                <div>
                                  <div className="font-medium text-sm truncate">
                                    {bed.participantName}
                                  </div>
                                  {!isLocked && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-xs text-red-600 hover:text-red-700 mt-1 h-6 px-2"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleUnassign(bed.participantId!)
                                      }}
                                    >
                                      Remove
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                <div className="text-sm text-gray-400">
                                  {isLocked ? 'Empty' : 'Click to assign'}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Unassigned Participants */}
            <div className="space-y-4">
              <h3 className="font-medium text-lg">
                Unassigned ({getUnassignedParticipantsForCategory(category).length})
              </h3>
              {getUnassignedParticipantsForCategory(category).length === 0 ? (
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-green-700">
                      <Check className="w-5 h-5" />
                      <span>All participants in this category have been assigned!</span>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {getUnassignedParticipantsForCategory(category).map(p => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded border"
                        >
                          <div>
                            <div className="font-medium text-sm">
                              {p.firstName} {p.lastName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Age {p.age}, {p.gender === 'male' ? 'M' : 'F'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Submit Section */}
      {!isLocked && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-medium">Ready to Submit?</h3>
                <p className="text-sm text-muted-foreground">
                  Once submitted, you won't be able to make changes without organizer approval.
                </p>
              </div>
              <Button onClick={() => setIsSubmitModalOpen(true)}>
                <Send className="w-4 h-4 mr-2" />
                Submit Assignments
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assign Modal */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Assign to {selectedBed?.buildingName} {selectedBed?.roomNumber}, Bed {selectedBed && bedNumberToLetter(selectedBed.bedNumber)}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {selectedBed && getUnassignedParticipantsForCategory(selectedBed.category).length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No unassigned participants in this category
                </p>
              ) : (
                selectedBed && getUnassignedParticipantsForCategory(selectedBed.category).map(p => (
                  <Button
                    key={p.id}
                    variant="outline"
                    className="w-full justify-start h-auto py-3"
                    onClick={() => handleAssign(p.id)}
                    disabled={assigning}
                  >
                    <div className="text-left">
                      <div className="font-medium">
                        {p.firstName} {p.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Age {p.age} • {p.gender === 'male' ? 'Male' : 'Female'}
                      </div>
                    </div>
                  </Button>
                ))
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignModalOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auto-Assign Modal */}
      <Dialog open={isAutoAssignModalOpen} onOpenChange={setIsAutoAssignModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Auto-Assign {CATEGORY_LABELS[activeTab]}</DialogTitle>
            <DialogDescription>
              This will automatically assign all unassigned participants in this category to available beds.
              Rooms will be filled in order, maximizing room utilization.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              <strong>{getUnassignedParticipantsForCategory(activeTab).length}</strong> participants will be auto-assigned.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAutoAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAutoAssign} disabled={autoAssigning}>
              {autoAssigning && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Auto-Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Modal */}
      <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Housing Assignments</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <span>Assigned</span>
              <Badge variant="default" className="bg-green-500">
                {stats.assignedParticipants} / {stats.totalParticipants}
              </Badge>
            </div>

            {unassignedParticipants.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">
                      {unassignedParticipants.length} participants are not assigned
                    </p>
                    <p className="text-sm text-amber-700 mt-1">
                      These participants will be assigned by event staff on-site.
                    </p>
                    <ScrollArea className="max-h-[120px] mt-2">
                      <ul className="text-sm text-amber-700 space-y-1">
                        {unassignedParticipants.slice(0, 10).map(p => (
                          <li key={p.id}>• {p.firstName} {p.lastName}</li>
                        ))}
                        {unassignedParticipants.length > 10 && (
                          <li>... and {unassignedParticipants.length - 10} more</li>
                        )}
                      </ul>
                    </ScrollArea>
                  </div>
                </div>
              </div>
            )}

            {unassignedParticipants.length > 0 && (
              <div className="flex items-start gap-2">
                <Checkbox
                  id="acknowledge"
                  checked={acknowledgeUnassigned}
                  onCheckedChange={(checked) => setAcknowledgeUnassigned(checked as boolean)}
                />
                <label htmlFor="acknowledge" className="text-sm">
                  I understand that unassigned participants will be assigned by event staff
                </label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubmitModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || (unassignedParticipants.length > 0 && !acknowledgeUnassigned)}
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit Assignments
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
