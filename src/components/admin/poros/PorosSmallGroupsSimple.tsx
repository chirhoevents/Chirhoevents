'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Search, Users, Loader2, User, Home, UserCheck } from 'lucide-react'
import { toast } from '@/lib/toast'

interface PorosSmallGroupsSimpleProps {
  eventId: string
}

interface GroupData {
  id: string
  groupName: string
  parishName: string | null
  totalParticipants: number
  sgl: { id: string; name: string } | null
  religious: { id: string; name: string } | null
  room: { id: string; name: string } | null
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
  buildingId: string
  buildingName: string
}

export function PorosSmallGroupsSimple({ eventId }: PorosSmallGroupsSimpleProps) {
  const [groups, setGroups] = useState<GroupData[]>([])
  const [sglStaff, setSglStaff] = useState<StaffOption[]>([])
  const [religiousStaff, setReligiousStaff] = useState<StaffOption[]>([])
  const [rooms, setRooms] = useState<RoomOption[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)

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

  async function handleAssignment(
    groupId: string,
    field: 'sglStaffId' | 'religiousStaffId' | 'smallGroupRoomId',
    value: string | null
  ) {
    setUpdating(`${groupId}-${field}`)
    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/poros/group-small-group-assignments`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ groupId, field, value }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update')
      }

      const result = await response.json()

      // Update local state
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? { ...g, sgl: result.sgl, religious: result.religious, room: result.room }
            : g
        )
      )

      toast.success('Assignment updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update')
    } finally {
      setUpdating(null)
    }
  }

  // Filter groups
  const filteredGroups = groups.filter((g) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    const name = (g.parishName || g.groupName).toLowerCase()
    return name.includes(query)
  })

  // Stats
  const assignedSgl = groups.filter((g) => g.sgl).length
  const assignedReligious = groups.filter((g) => g.religious).length
  const assignedRoom = groups.filter((g) => g.room).length

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
              SGL Assigned
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
              Religious Assigned
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
              Room Assigned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {assignedRoom} / {groups.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by parish name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
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
              <p>No groups found</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {filteredGroups.map((group) => {
                  const isFullyAssigned = group.sgl && group.religious && group.room

                  return (
                    <div
                      key={group.id}
                      className={`p-4 rounded-lg border ${
                        isFullyAssigned
                          ? 'bg-green-50 border-green-200'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      {/* Group Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="font-medium text-lg">
                            {group.parishName || group.groupName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {group.totalParticipants} participants
                          </div>
                        </div>
                        {isFullyAssigned && (
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
                          <label className="text-sm font-medium text-gray-600 flex items-center gap-1 mb-1">
                            <User className="w-3 h-3" />
                            SGL
                          </label>
                          <Select
                            value={group.sgl?.id || 'none'}
                            onValueChange={(value) =>
                              handleAssignment(
                                group.id,
                                'sglStaffId',
                                value === 'none' ? null : value
                              )
                            }
                            disabled={updating === `${group.id}-sglStaffId`}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select SGL..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {sglStaff.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.firstName} {s.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Religious */}
                        <div>
                          <label className="text-sm font-medium text-gray-600 flex items-center gap-1 mb-1">
                            <User className="w-3 h-3" />
                            Religious
                          </label>
                          <Select
                            value={group.religious?.id || 'none'}
                            onValueChange={(value) =>
                              handleAssignment(
                                group.id,
                                'religiousStaffId',
                                value === 'none' ? null : value
                              )
                            }
                            disabled={updating === `${group.id}-religiousStaffId`}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select Religious..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {religiousStaff.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.firstName} {s.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Room */}
                        <div>
                          <label className="text-sm font-medium text-gray-600 flex items-center gap-1 mb-1">
                            <Home className="w-3 h-3" />
                            Room
                          </label>
                          <Select
                            value={group.room?.id || 'none'}
                            onValueChange={(value) =>
                              handleAssignment(
                                group.id,
                                'smallGroupRoomId',
                                value === 'none' ? null : value
                              )
                            }
                            disabled={updating === `${group.id}-smallGroupRoomId`}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select Room..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {rooms.map((r) => (
                                <SelectItem key={r.id} value={r.id}>
                                  {r.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
    </div>
  )
}
