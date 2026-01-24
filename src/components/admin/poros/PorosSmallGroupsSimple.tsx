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
import { Search, Users, Loader2, User, Home, UserCheck, X, Wand2, Plus } from 'lucide-react'
import { toast } from '@/lib/toast'

interface PorosSmallGroupsSimpleProps {
  eventId: string
}

interface StaffAssignment {
  id: string
  name: string
  assignmentId: string
}

interface GroupData {
  id: string
  groupName: string
  parishName: string | null
  groupCode: string | null
  totalParticipants: number
  sglList: StaffAssignment[]
  religiousList: StaffAssignment[]
  room: { id: string; name: string; capacity: number } | null
}

interface StaffOption {
  id: string
  firstName: string
  lastName: string
  staffType: string
}

interface RoomOption {
  id: string
  name: string
  capacity: number
  buildingId: string
  buildingName: string
  isAssigned: boolean
}

export function PorosSmallGroupsSimple({ eventId }: PorosSmallGroupsSimpleProps) {
  const [groups, setGroups] = useState<GroupData[]>([])
  const [sglStaff, setSglStaff] = useState<StaffOption[]>([])
  const [religiousStaff, setReligiousStaff] = useState<StaffOption[]>([])
  const [rooms, setRooms] = useState<RoomOption[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [autoAssigning, setAutoAssigning] = useState(false)
  const [showAutoAssignDialog, setShowAutoAssignDialog] = useState(false)

  useEffect(() => {
    fetchData()
  }, [eventId])

  async function fetchData() {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/poros/group-small-group-assignments`
      )
      if (response.ok) {
        const data = await response.json()
        setGroups(data.groups)
        setSglStaff(data.staff.sgl)
        setReligiousStaff(data.staff.religious)
        setRooms(data.rooms)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddStaff(groupId: string, staffId: string, role: 'sgl' | 'religious') {
    setUpdating(`${groupId}-${role}`)
    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/poros/group-small-group-assignments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ groupId, staffId, role }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add staff')
      }

      const result = await response.json()

      // Update local state
      setGroups((prev) =>
        prev.map((g) => {
          if (g.id !== groupId) return g
          if (role === 'sgl') {
            return { ...g, sglList: [...g.sglList, result.assignment] }
          } else {
            return { ...g, religiousList: [...g.religiousList, result.assignment] }
          }
        })
      )

      toast.success('Staff assigned')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add staff')
    } finally {
      setUpdating(null)
    }
  }

  async function handleRemoveStaff(groupId: string, assignmentId: string, role: 'sgl' | 'religious') {
    setUpdating(`${groupId}-${role}`)
    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/poros/group-small-group-assignments`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assignmentId }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove staff')
      }

      // Update local state
      setGroups((prev) =>
        prev.map((g) => {
          if (g.id !== groupId) return g
          if (role === 'sgl') {
            return { ...g, sglList: g.sglList.filter((s) => s.assignmentId !== assignmentId) }
          } else {
            return { ...g, religiousList: g.religiousList.filter((s) => s.assignmentId !== assignmentId) }
          }
        })
      )

      toast.success('Staff removed')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove staff')
    } finally {
      setUpdating(null)
    }
  }

  async function handleRoomAssignment(groupId: string, roomId: string | null) {
    setUpdating(`${groupId}-room`)
    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/poros/group-small-group-assignments`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ groupId, roomId }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update room')
      }

      const result = await response.json()

      // Update local state
      setGroups((prev) =>
        prev.map((g) => (g.id === groupId ? { ...g, room: result.room } : g))
      )

      // Update room availability in local rooms list (instead of full refresh)
      if (roomId) {
        // Mark this room as assigned
        setRooms((prev) =>
          prev.map((r) => (r.id === roomId ? { ...r, isAssigned: true } : r))
        )
      }
      // If unassigning, mark old room as available
      const group = groups.find(g => g.id === groupId)
      if (group?.room?.id && group.room.id !== roomId) {
        setRooms((prev) =>
          prev.map((r) => (r.id === group.room!.id ? { ...r, isAssigned: false } : r))
        )
      }

      toast.success('Room updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update room')
    } finally {
      setUpdating(null)
    }
  }

  async function handleAutoAssign() {
    setAutoAssigning(true)
    try {
      // Sort groups by size (largest first)
      const unassignedGroups = groups.filter((g) => !g.room)
      const sortedGroups = [...unassignedGroups].sort(
        (a, b) => b.totalParticipants - a.totalParticipants
      )

      // Sort rooms by capacity (largest first)
      const availableRooms = rooms.filter((r) => !r.isAssigned)
      const sortedRooms = [...availableRooms].sort((a, b) => b.capacity - a.capacity)

      let assigned = 0
      for (const group of sortedGroups) {
        // Find the smallest room that fits the group
        const suitableRoom = sortedRooms.find(
          (r) => r.capacity >= group.totalParticipants && !rooms.find(
            (existingRoom) => existingRoom.id === r.id && existingRoom.isAssigned
          )
        )

        if (suitableRoom) {
          await handleRoomAssignment(group.id, suitableRoom.id)
          // Mark room as assigned locally to avoid double-assigning
          const roomIndex = sortedRooms.findIndex((r) => r.id === suitableRoom.id)
          if (roomIndex >= 0) {
            sortedRooms.splice(roomIndex, 1)
          }
          assigned++
        }
      }

      setShowAutoAssignDialog(false)
      toast.success(`Auto-assigned ${assigned} groups to rooms`)
      fetchData()
    } catch (error) {
      toast.error('Auto-assign failed')
    } finally {
      setAutoAssigning(false)
    }
  }

  // Filter groups
  const filteredGroups = groups.filter((g) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    const name = (g.parishName || g.groupName).toLowerCase()
    const code = (g.groupCode || '').toLowerCase()
    return name.includes(query) || code.includes(query)
  })

  // Stats
  const assignedSgl = groups.filter((g) => g.sglList.length > 0).length
  const assignedReligious = groups.filter((g) => g.religiousList.length > 0).length
  const assignedRoom = groups.filter((g) => g.room).length

  // Get staff already assigned to a group for filtering dropdowns
  function getAssignedStaffIds(group: GroupData, role: 'sgl' | 'religious') {
    if (role === 'sgl') {
      return group.sglList.map((s) => s.id)
    }
    return group.religiousList.map((s) => s.id)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-navy" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Groups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{groups.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              With SGL
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {assignedSgl} / {groups.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              With Religious
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {assignedReligious} / {groups.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              With Room
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {assignedRoom} / {groups.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by parish name or group code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setShowAutoAssignDialog(true)} className="bg-navy hover:bg-navy/90">
          <Wand2 className="w-4 h-4 mr-2" />
          Auto-Assign Rooms
        </Button>
      </div>

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
              <p>No groups found</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {filteredGroups.map((group) => {
                  const isComplete =
                    group.sglList.length > 0 && group.religiousList.length > 0 && group.room

                  return (
                    <div
                      key={group.id}
                      className={`p-4 rounded-lg border ${
                        isComplete ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                      }`}
                    >
                      {/* Group Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="font-medium text-lg">
                            {group.parishName || group.groupName}
                            {group.groupCode && (
                              <span className="ml-2 text-orange-600 font-bold">[{group.groupCode}]</span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {group.totalParticipants} participants
                          </div>
                        </div>
                        {isComplete && (
                          <Badge className="bg-green-100 text-green-800">
                            <UserCheck className="w-3 h-3 mr-1" />
                            Complete
                          </Badge>
                        )}
                      </div>

                      {/* Assignment Fields */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* SGL */}
                        <div>
                          <label className="text-sm font-medium text-gray-600 flex items-center gap-1 mb-2">
                            <User className="w-3 h-3" />
                            SGL ({group.sglList.length})
                          </label>
                          {/* Current assignments */}
                          <div className="space-y-1 mb-2">
                            {group.sglList.map((staff) => (
                              <div
                                key={staff.assignmentId}
                                className="flex items-center justify-between bg-blue-50 rounded px-2 py-1"
                              >
                                <span className="text-sm">{staff.name}</span>
                                <button
                                  onClick={() => handleRemoveStaff(group.id, staff.assignmentId, 'sgl')}
                                  className="text-red-500 hover:text-red-700"
                                  disabled={updating === `${group.id}-sgl`}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                          {/* Add new */}
                          <Select
                            value=""
                            onValueChange={(value) => handleAddStaff(group.id, value, 'sgl')}
                            disabled={updating === `${group.id}-sgl`}
                          >
                            <SelectTrigger className="w-full h-8 text-xs">
                              <Plus className="w-3 h-3 mr-1" />
                              <span>Add SGL</span>
                            </SelectTrigger>
                            <SelectContent>
                              {sglStaff
                                .filter((s) => !getAssignedStaffIds(group, 'sgl').includes(s.id))
                                .map((s) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.firstName} {s.lastName}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Religious */}
                        <div>
                          <label className="text-sm font-medium text-gray-600 flex items-center gap-1 mb-2">
                            <User className="w-3 h-3" />
                            Religious ({group.religiousList.length})
                          </label>
                          {/* Current assignments */}
                          <div className="space-y-1 mb-2">
                            {group.religiousList.map((staff) => (
                              <div
                                key={staff.assignmentId}
                                className="flex items-center justify-between bg-purple-50 rounded px-2 py-1"
                              >
                                <span className="text-sm">{staff.name}</span>
                                <button
                                  onClick={() => handleRemoveStaff(group.id, staff.assignmentId, 'religious')}
                                  className="text-red-500 hover:text-red-700"
                                  disabled={updating === `${group.id}-religious`}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                          {/* Add new */}
                          <Select
                            value=""
                            onValueChange={(value) => handleAddStaff(group.id, value, 'religious')}
                            disabled={updating === `${group.id}-religious`}
                          >
                            <SelectTrigger className="w-full h-8 text-xs">
                              <Plus className="w-3 h-3 mr-1" />
                              <span>Add Religious</span>
                            </SelectTrigger>
                            <SelectContent>
                              {religiousStaff
                                .filter((s) => !getAssignedStaffIds(group, 'religious').includes(s.id))
                                .map((s) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.firstName} {s.lastName}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Room */}
                        <div>
                          <label className="text-sm font-medium text-gray-600 flex items-center gap-1 mb-2">
                            <Home className="w-3 h-3" />
                            Room
                          </label>
                          {group.room ? (
                            <div className="flex items-center justify-between bg-green-50 rounded px-2 py-1 mb-2">
                              <span className="text-sm">
                                {group.room.name}
                                <span className="text-xs text-gray-500 ml-1">
                                  (cap: {group.room.capacity})
                                </span>
                              </span>
                              <button
                                onClick={() => handleRoomAssignment(group.id, null)}
                                className="text-red-500 hover:text-red-700"
                                disabled={updating === `${group.id}-room`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <Select
                              value=""
                              onValueChange={(value) => handleRoomAssignment(group.id, value)}
                              disabled={updating === `${group.id}-room`}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Room..." />
                              </SelectTrigger>
                              <SelectContent>
                                {rooms
                                  .filter((r) => !r.isAssigned)
                                  .map((r) => (
                                    <SelectItem key={r.id} value={r.id}>
                                      {r.name} (cap: {r.capacity})
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Auto-Assign Dialog */}
      <Dialog open={showAutoAssignDialog} onOpenChange={setShowAutoAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Auto-Assign Rooms</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              This will automatically assign rooms to groups based on group size.
              Larger groups will be assigned to rooms with higher capacity first.
            </p>
            <div className="bg-blue-50 rounded-lg p-3 text-sm">
              <p>
                <strong>Groups without rooms:</strong>{' '}
                {groups.filter((g) => !g.room).length}
              </p>
              <p>
                <strong>Available rooms:</strong>{' '}
                {rooms.filter((r) => !r.isAssigned).length}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAutoAssignDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAutoAssign} disabled={autoAssigning}>
              {autoAssigning && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Auto-Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
