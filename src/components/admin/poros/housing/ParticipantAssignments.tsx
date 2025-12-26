'use client'

import { useState, useEffect } from 'react'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Building, Room, RoomAssignment } from '../PorosHousing'
import { AutoAssignModal } from '../AutoAssignModal'
import {
  Search,
  Users,
  UserPlus,
  UserMinus,
  Wand2,
  Loader2,
  ChevronRight,
  Building2,
  Home,
  X,
  AlertCircle,
  Check
} from 'lucide-react'
import { toast } from '@/lib/toast'

interface ParticipantAssignmentsProps {
  eventId: string
  buildings: Building[]
  rooms: Room[]
  settings: any
  onRefresh: () => void
}

interface Participant {
  id: string
  type: 'group' | 'individual'
  firstName: string
  lastName: string
  gender: string
  isMinor: boolean
  parishName?: string
  groupRegistrationId?: string
  roomAssignment?: {
    roomId: string
    roomNumber: string
    buildingName: string
  } | null
  roommatePreference?: string
}

export function ParticipantAssignments({
  eventId,
  buildings,
  rooms,
  settings,
  onRefresh,
}: ParticipantAssignmentsProps) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'assigned' | 'unassigned'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'youth' | 'chaperone'>('all')
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null)
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [isAutoAssignOpen, setIsAutoAssignOpen] = useState(false)
  const [assigningRoomId, setAssigningRoomId] = useState<string | null>(null)
  const [assignLoading, setAssignLoading] = useState(false)

  useEffect(() => {
    fetchParticipants()
  }, [eventId])

  async function fetchParticipants() {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/poros/participants`)
      if (response.ok) {
        const data = await response.json()
        setParticipants(data)
      }
    } catch (error) {
      console.error('Failed to fetch participants:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter participants
  const filteredParticipants = participants.filter((p) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const fullName = `${p.firstName} ${p.lastName}`.toLowerCase()
      const parish = p.parishName?.toLowerCase() || ''
      if (!fullName.includes(query) && !parish.includes(query)) {
        return false
      }
    }

    if (genderFilter !== 'all' && p.gender?.toLowerCase() !== genderFilter) {
      return false
    }

    if (statusFilter === 'assigned' && !p.roomAssignment) {
      return false
    }
    if (statusFilter === 'unassigned' && p.roomAssignment) {
      return false
    }

    if (typeFilter === 'youth' && !p.isMinor) {
      return false
    }
    if (typeFilter === 'chaperone' && p.isMinor) {
      return false
    }

    return true
  })

  // Filter rooms by building
  const filteredRooms = selectedBuildingId
    ? rooms.filter((r) => r.buildingId === selectedBuildingId)
    : rooms

  // Group rooms by building for display
  const roomsByBuilding = buildings.map((building) => ({
    building,
    rooms: rooms.filter((r) => r.buildingId === building.id),
  }))

  async function handleAssign(participantId: string, roomId: string) {
    setAssignLoading(true)
    try {
      const participant = participants.find((p) => p.id === participantId)
      const response = await fetch(`/api/admin/events/${eventId}/poros/room-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          participantId: participant?.type === 'group' ? participantId : null,
          individualRegistrationId: participant?.type === 'individual' ? participantId : null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to assign room')
      }

      toast.success('Participant assigned to room')
      setIsAssignDialogOpen(false)
      setSelectedParticipant(null)
      fetchParticipants()
      onRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign room')
    } finally {
      setAssignLoading(false)
    }
  }

  async function handleUnassign(participantId: string) {
    try {
      const participant = participants.find((p) => p.id === participantId)
      const response = await fetch(
        `/api/admin/events/${eventId}/poros/room-assignments/${participantId}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: participant?.type,
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to remove assignment')
      }

      toast.success('Room assignment removed')
      fetchParticipants()
      onRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove assignment')
    }
  }

  function openAssignDialog(participant: Participant) {
    setSelectedParticipant(participant)
    // Pre-select building based on gender
    const genderBuilding = buildings.find(
      (b) => b.gender === participant.gender?.toLowerCase()
    )
    setSelectedBuildingId(genderBuilding?.id || buildings[0]?.id || null)
    setIsAssignDialogOpen(true)
  }

  function getAvailableRooms(participant: Participant) {
    return filteredRooms.filter((room) => {
      // Must have capacity
      if (room.currentOccupancy >= room.capacity) return false
      // Must be available
      if (!room.isAvailable) return false
      // Gender match (if set)
      if (room.gender && participant.gender?.toLowerCase() !== room.gender) return false
      // Housing type match
      if (room.housingType) {
        if (participant.isMinor && room.housingType !== 'youth_u18') return false
        if (!participant.isMinor && room.housingType === 'youth_u18') return false
      }
      return true
    })
  }

  const unassignedCount = participants.filter((p) => !p.roomAssignment).length
  const assignedCount = participants.filter((p) => p.roomAssignment).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-navy" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with stats and actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-lg px-3 py-1">
            {unassignedCount} unassigned
          </Badge>
          <Badge className="bg-green-100 text-green-800 text-lg px-3 py-1">
            {assignedCount} assigned
          </Badge>
        </div>
        <Button onClick={() => setIsAutoAssignOpen(true)} className="bg-navy hover:bg-navy/90 text-white">
          <Wand2 className="w-4 h-4 mr-2" />
          Auto-Assign
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or parish..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select
              value={genderFilter}
              onValueChange={(v: 'all' | 'male' | 'female') => setGenderFilter(v)}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genders</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(v: 'all' | 'assigned' | 'unassigned') => setStatusFilter(v)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={typeFilter}
              onValueChange={(v: 'all' | 'youth' | 'chaperone') => setTypeFilter(v)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="youth">Youth (U18)</SelectItem>
                <SelectItem value="chaperone">Chaperone (18+)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Participants List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Participants ({filteredParticipants.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredParticipants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No participants match your filters</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {filteredParticipants.map((participant) => (
                  <div
                    key={participant.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      participant.roomAssignment
                        ? 'bg-green-50 border-green-200'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          participant.gender?.toLowerCase() === 'male'
                            ? 'bg-blue-500'
                            : 'bg-pink-500'
                        }`}
                      />
                      <div>
                        <div className="font-medium">
                          {participant.firstName} {participant.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          {participant.parishName && (
                            <span>{participant.parishName}</span>
                          )}
                          {participant.isMinor ? (
                            <Badge variant="outline" className="text-xs">
                              Youth
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              18+
                            </Badge>
                          )}
                          {participant.roommatePreference && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge
                                    variant="outline"
                                    className="text-xs bg-yellow-50"
                                  >
                                    Roommate Pref
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Prefers: {participant.roommatePreference}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {participant.roomAssignment ? (
                        <>
                          <div className="text-sm text-right">
                            <div className="font-medium">
                              {participant.roomAssignment.buildingName}
                            </div>
                            <div className="text-muted-foreground">
                              Room {participant.roomAssignment.roomNumber}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleUnassign(participant.id)}
                          >
                            <UserMinus className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAssignDialog(participant)}
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Assign
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Assign Room Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Assign Room - {selectedParticipant?.firstName} {selectedParticipant?.lastName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Building filter */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Building:</span>
              <Select
                value={selectedBuildingId || 'all'}
                onValueChange={(v) => setSelectedBuildingId(v === 'all' ? null : v)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Buildings" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Buildings</SelectItem>
                  {buildings.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Available rooms */}
            <ScrollArea className="h-[400px] border rounded-lg">
              {roomsByBuilding
                .filter((rb) => !selectedBuildingId || rb.building.id === selectedBuildingId)
                .map(({ building, rooms: buildingRooms }) => {
                  const availableRooms = buildingRooms.filter((room) => {
                    if (!selectedParticipant) return false
                    if (room.currentOccupancy >= room.capacity) return false
                    if (!room.isAvailable) return false
                    return true
                  })

                  if (availableRooms.length === 0) return null

                  return (
                    <div key={building.id} className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{building.name}</span>
                        <Badge
                          className={
                            building.gender === 'male'
                              ? 'bg-blue-100 text-blue-800'
                              : building.gender === 'female'
                              ? 'bg-pink-100 text-pink-800'
                              : 'bg-purple-100 text-purple-800'
                          }
                        >
                          {building.gender}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pl-6">
                        {availableRooms.map((room) => {
                          const isCompatible =
                            !room.gender ||
                            room.gender === selectedParticipant?.gender?.toLowerCase()
                          const typeMatch =
                            !room.housingType ||
                            (selectedParticipant?.isMinor &&
                              room.housingType === 'youth_u18') ||
                            (!selectedParticipant?.isMinor &&
                              room.housingType !== 'youth_u18')

                          return (
                            <Button
                              key={room.id}
                              variant="outline"
                              className={`h-auto py-2 px-3 justify-start ${
                                !isCompatible || !typeMatch
                                  ? 'opacity-50 border-dashed'
                                  : ''
                              }`}
                              onClick={() =>
                                selectedParticipant &&
                                handleAssign(selectedParticipant.id, room.id)
                              }
                              disabled={assignLoading || !isCompatible || !typeMatch}
                            >
                              <div className="flex items-center gap-2">
                                <Home className="w-4 h-4 text-muted-foreground" />
                                <div className="text-left">
                                  <div className="font-medium">{room.roomNumber}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {room.currentOccupancy}/{room.capacity} beds
                                  </div>
                                </div>
                              </div>
                            </Button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auto-Assign Modal */}
      <AutoAssignModal
        eventId={eventId}
        open={isAutoAssignOpen}
        onOpenChange={setIsAutoAssignOpen}
        onComplete={() => {
          fetchParticipants()
          onRefresh()
        }}
        buildings={buildings}
        rooms={rooms}
        participants={participants}
      />
    </div>
  )
}
