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
import { Building, Room } from '../PorosHousing'
import {
  Search,
  Users,
  Home,
  UserMinus,
  Loader2,
  Building2,
  ChevronRight,
  Edit2,
} from 'lucide-react'
import { toast } from '@/lib/toast'

interface GroupAssignmentsProps {
  eventId: string
  buildings: Building[]
  rooms: Room[]
  onRefresh: () => void
}

interface YouthGroup {
  id: string
  groupName: string
  parishName: string | null
  housingType: 'on_campus' | 'off_campus' | 'mixed' | null
  maleCount: number
  femaleCount: number
  totalCount: number
  maleRoomAssignments: { roomId: string; roomNumber: string; buildingName: string }[]
  femaleRoomAssignments: { roomId: string; roomNumber: string; buildingName: string }[]
}

export function GroupAssignments({
  eventId,
  buildings,
  rooms,
  onRefresh,
}: GroupAssignmentsProps) {
  const [groups, setGroups] = useState<YouthGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'assigned' | 'unassigned'>('all')
  const [housingTypeFilter, setHousingTypeFilter] = useState<'all' | 'on_campus' | 'off_campus' | 'mixed'>('all')

  // Assignment dialog state
  const [selectedGroup, setSelectedGroup] = useState<YouthGroup | null>(null)
  const [selectedGender, setSelectedGender] = useState<'male' | 'female'>('male')
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null)
  const [assignLoading, setAssignLoading] = useState(false)

  // Housing type update state
  const [updatingHousingType, setUpdatingHousingType] = useState<string | null>(null)

  useEffect(() => {
    fetchGroups()
  }, [eventId])

  async function fetchGroups() {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/poros/housing-groups`)
      if (response.ok) {
        const data = await response.json()
        setGroups(data)
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter groups
  const filteredGroups = groups.filter((g) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const name = (g.parishName || g.groupName).toLowerCase()
      if (!name.includes(query)) return false
    }

    if (statusFilter === 'assigned') {
      if (g.maleRoomAssignments.length === 0 && g.femaleRoomAssignments.length === 0) return false
    }
    if (statusFilter === 'unassigned') {
      if (g.maleRoomAssignments.length > 0 || g.femaleRoomAssignments.length > 0) return false
    }

    if (housingTypeFilter !== 'all') {
      if (g.housingType !== housingTypeFilter) return false
    }

    return true
  })

  // Get rooms for a specific gender
  function getGenderRooms(gender: 'male' | 'female') {
    return rooms.filter((r) => {
      if (!r.isAvailable) return false
      // Accept rooms that match gender or are mixed
      if (r.gender && r.gender !== gender && r.gender !== 'mixed') return false
      return true
    })
  }

  // Group rooms by building
  function getRoomsByBuilding(gender: 'male' | 'female') {
    const genderRooms = getGenderRooms(gender)
    return buildings
      .filter((b) => !b.gender || b.gender === gender || b.gender === 'mixed')
      .map((building) => ({
        building,
        rooms: genderRooms.filter((r) => r.buildingId === building.id),
      }))
      .filter((rb) => rb.rooms.length > 0)
  }

  async function handleAssign(groupId: string, roomId: string, gender: 'male' | 'female') {
    setAssignLoading(true)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/poros/group-room-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupRegistrationId: groupId,
          roomId,
          gender,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to assign room')
      }

      toast.success('Group assigned to room')
      setIsAssignDialogOpen(false)
      setSelectedGroup(null)
      fetchGroups()
      onRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign room')
    } finally {
      setAssignLoading(false)
    }
  }

  async function handleUnassign(groupId: string, roomId: string, gender: 'male' | 'female') {
    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/poros/group-room-assignments/${groupId}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId, gender }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to remove assignment')
      }

      toast.success('Room assignment removed')
      fetchGroups()
      onRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove assignment')
    }
  }

  function openAssignDialog(group: YouthGroup, gender: 'male' | 'female') {
    setSelectedGroup(group)
    setSelectedGender(gender)
    // Pre-select building based on gender
    const genderBuilding = buildings.find((b) => b.gender === gender)
    setSelectedBuildingId(genderBuilding?.id || buildings[0]?.id || null)
    setIsAssignDialogOpen(true)
  }

  async function handleUpdateHousingType(groupId: string, newHousingType: string) {
    setUpdatingHousingType(groupId)
    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/poros/groups/${groupId}/housing-type`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ housingType: newHousingType }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update housing type')
      }

      toast.success(`Housing type updated to ${newHousingType.replace('_', '-')}`)
      fetchGroups()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update housing type')
    } finally {
      setUpdatingHousingType(null)
    }
  }

  const unassignedCount = groups.filter(
    (g) => g.maleRoomAssignments.length === 0 && g.femaleRoomAssignments.length === 0
  ).length
  const assignedCount = groups.filter(
    (g) => g.maleRoomAssignments.length > 0 || g.femaleRoomAssignments.length > 0
  ).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-navy" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex items-center gap-4">
        <Badge variant="outline" className="text-lg px-3 py-1">
          {unassignedCount} unassigned
        </Badge>
        <Badge className="bg-green-100 text-green-800 text-lg px-3 py-1">
          {assignedCount} assigned
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by parish name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

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
              value={housingTypeFilter}
              onValueChange={(v: 'all' | 'on_campus' | 'off_campus' | 'mixed') => setHousingTypeFilter(v)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Housing Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Housing</SelectItem>
                <SelectItem value="on_campus">On-Campus</SelectItem>
                <SelectItem value="off_campus">Off-Campus</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Groups List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Parish Groups ({filteredGroups.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredGroups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No groups match your filters</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {filteredGroups.map((group) => {
                  const hasAnyAssignment =
                    group.maleRoomAssignments.length > 0 || group.femaleRoomAssignments.length > 0

                  return (
                    <div
                      key={group.id}
                      className={`p-4 rounded-lg border ${
                        hasAnyAssignment ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                      }`}
                    >
                      {/* Group Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-lg">
                              {group.parishName || group.groupName}
                            </span>
                            <Select
                              value={group.housingType || 'on_campus'}
                              onValueChange={(value) => handleUpdateHousingType(group.id, value)}
                              disabled={updatingHousingType === group.id}
                            >
                              <SelectTrigger
                                className={`w-[130px] h-7 text-xs ${
                                  group.housingType === 'on_campus' || !group.housingType
                                    ? 'bg-green-100 text-green-800 border-green-200'
                                    : group.housingType === 'off_campus'
                                    ? 'bg-orange-100 text-orange-800 border-orange-200'
                                    : 'bg-purple-100 text-purple-800 border-purple-200'
                                }`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="on_campus">On-Campus</SelectItem>
                                <SelectItem value="off_campus">Off-Campus</SelectItem>
                                <SelectItem value="mixed">Mixed</SelectItem>
                              </SelectContent>
                            </Select>
                            {updatingHousingType === group.id && (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {group.totalCount} participants total
                          </div>
                        </div>
                      </div>

                      {/* Male/Female Sections */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Males */}
                        {group.maleCount > 0 && (
                          <div className="bg-blue-50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500" />
                                <span className="font-medium text-blue-800">
                                  Males ({group.maleCount})
                                </span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openAssignDialog(group, 'male')}
                                className="h-7 text-xs"
                              >
                                + Add Room
                              </Button>
                            </div>
                            {group.maleRoomAssignments.length > 0 ? (
                              <div className="space-y-1">
                                {group.maleRoomAssignments.map((assignment, i) => (
                                  <div
                                    key={i}
                                    className="flex items-center justify-between bg-white rounded px-2 py-1"
                                  >
                                    <span className="text-sm">
                                      {assignment.buildingName} - {assignment.roomNumber}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-red-600 hover:text-red-700"
                                      onClick={() =>
                                        handleUnassign(group.id, assignment.roomId, 'male')
                                      }
                                    >
                                      <UserMinus className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-blue-600">No rooms assigned</p>
                            )}
                          </div>
                        )}

                        {/* Females */}
                        {group.femaleCount > 0 && (
                          <div className="bg-pink-50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-pink-500" />
                                <span className="font-medium text-pink-800">
                                  Females ({group.femaleCount})
                                </span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openAssignDialog(group, 'female')}
                                className="h-7 text-xs"
                              >
                                + Add Room
                              </Button>
                            </div>
                            {group.femaleRoomAssignments.length > 0 ? (
                              <div className="space-y-1">
                                {group.femaleRoomAssignments.map((assignment, i) => (
                                  <div
                                    key={i}
                                    className="flex items-center justify-between bg-white rounded px-2 py-1"
                                  >
                                    <span className="text-sm">
                                      {assignment.buildingName} - {assignment.roomNumber}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-red-600 hover:text-red-700"
                                      onClick={() =>
                                        handleUnassign(group.id, assignment.roomId, 'female')
                                      }
                                    >
                                      <UserMinus className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-pink-600">No rooms assigned</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
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
              Assign{' '}
              <span className={selectedGender === 'male' ? 'text-blue-600' : 'text-pink-600'}>
                {selectedGender === 'male' ? 'Male' : 'Female'}
              </span>{' '}
              Room - {selectedGroup?.parishName || selectedGroup?.groupName}
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
                  {buildings
                    .filter(
                      (b) => !b.gender || b.gender === selectedGender || b.gender === 'mixed'
                    )
                    .map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Available rooms */}
            <ScrollArea className="h-[400px] border rounded-lg">
              {getRoomsByBuilding(selectedGender)
                .filter((rb) => !selectedBuildingId || rb.building.id === selectedBuildingId)
                .map(({ building, rooms: buildingRooms }) => {
                  const availableRooms = buildingRooms.filter((room) => {
                    // Filter out rooms already assigned to this group for this gender
                    const existingAssignments =
                      selectedGender === 'male'
                        ? selectedGroup?.maleRoomAssignments || []
                        : selectedGroup?.femaleRoomAssignments || []
                    return !existingAssignments.some((a) => a.roomId === room.id)
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
                          {building.gender || 'mixed'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pl-6">
                        {availableRooms.map((room) => (
                          <Button
                            key={room.id}
                            variant="outline"
                            className="h-auto py-2 px-3 justify-start"
                            onClick={() =>
                              selectedGroup &&
                              handleAssign(selectedGroup.id, room.id, selectedGender)
                            }
                            disabled={assignLoading}
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
                        ))}
                      </div>
                    </div>
                  )
                })}
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
