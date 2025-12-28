'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Building2,
  Users,
  Home,
  Loader2,
  Check,
  AlertCircle,
  Search,
  ChevronRight,
  Eye,
  X,
  RefreshCw,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { toast } from '@/lib/toast'

interface GroupAllocationsProps {
  eventId: string
}

interface GroupRegistration {
  id: string
  groupName: string
  parishName: string | null
  totalParticipants: number
  housingType: string
  // Participant counts by category
  maleU18Count: number
  femaleU18Count: number
  maleO18Count: number
  femaleO18Count: number
  maleChaperoneCount: number
  femaleChaperoneCount: number
  clergyCount: number
  // Allocated rooms
  allocatedRooms: AllocatedRoom[]
  // Lock status
  housingAssignmentsLocked: boolean
  housingAssignmentsSubmittedAt: string | null
}

interface AllocatedRoom {
  id: string
  roomNumber: string
  buildingName: string
  capacity: number
  currentOccupancy: number
  gender: string
  housingType: string
}

interface Room {
  id: string
  roomNumber: string
  buildingId: string
  buildingName: string
  floor: number
  capacity: number
  currentOccupancy: number
  gender: string | null
  housingType: string | null
  isAvailable: boolean
  allocatedToGroupId: string | null
  allocatedToGroupName: string | null
}

interface Building {
  id: string
  name: string
  gender: string
  housingType: string
  rooms: Room[]
}

// Housing categories
type HousingCategory =
  | 'male_u18'
  | 'female_u18'
  | 'male_chaperone'
  | 'female_chaperone'
  | 'clergy'

const CATEGORY_LABELS: Record<HousingCategory, string> = {
  male_u18: 'Male Youth Under 18',
  female_u18: 'Female Youth Under 18',
  male_chaperone: 'Male Chaperones (18+)',
  female_chaperone: 'Female Chaperones (18+)',
  clergy: 'Clergy',
}

const CATEGORY_COLORS: Record<HousingCategory, string> = {
  male_u18: 'bg-blue-100 text-blue-800 border-blue-200',
  female_u18: 'bg-pink-100 text-pink-800 border-pink-200',
  male_chaperone: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  female_chaperone: 'bg-purple-100 text-purple-800 border-purple-200',
  clergy: 'bg-amber-100 text-amber-800 border-amber-200',
}

export function GroupAllocations({ eventId }: GroupAllocationsProps) {
  const [groups, setGroups] = useState<GroupRegistration[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Allocation modal state
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<GroupRegistration | null>(null)
  const [selectedRooms, setSelectedRooms] = useState<Record<HousingCategory, string[]>>({
    male_u18: [],
    female_u18: [],
    male_chaperone: [],
    female_chaperone: [],
    clergy: [],
  })
  const [allocating, setAllocating] = useState(false)

  // View details modal state
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [detailsGroup, setDetailsGroup] = useState<GroupRegistration | null>(null)

  useEffect(() => {
    fetchData()
  }, [eventId])

  async function fetchData() {
    setLoading(true)
    try {
      const [groupsRes, buildingsRes] = await Promise.all([
        fetch(`/api/admin/events/${eventId}/poros/group-allocations`),
        fetch(`/api/admin/events/${eventId}/poros/buildings?includeRooms=true`),
      ])

      if (groupsRes.ok) {
        const data = await groupsRes.json()
        setGroups(data.groups || [])
      }
      if (buildingsRes.ok) {
        const data = await buildingsRes.json()
        setBuildings(data || [])
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error('Failed to load group allocations')
    } finally {
      setLoading(false)
    }
  }

  function getBedsNeeded(group: GroupRegistration): Record<HousingCategory, number> {
    return {
      male_u18: group.maleU18Count,
      female_u18: group.femaleU18Count,
      male_chaperone: group.maleChaperoneCount + group.maleO18Count,
      female_chaperone: group.femaleChaperoneCount + group.femaleO18Count,
      clergy: group.clergyCount,
    }
  }

  function getAllocatedBeds(group: GroupRegistration): Record<HousingCategory, number> {
    const allocated: Record<HousingCategory, number> = {
      male_u18: 0,
      female_u18: 0,
      male_chaperone: 0,
      female_chaperone: 0,
      clergy: 0,
    }

    for (const room of group.allocatedRooms) {
      const category = getCategoryFromRoom(room)
      if (category) {
        allocated[category] += room.capacity
      }
    }

    return allocated
  }

  function getCategoryFromRoom(room: AllocatedRoom | Room): HousingCategory | null {
    const gender = room.gender?.toLowerCase()
    const type = room.housingType?.toLowerCase()

    if (type === 'clergy') return 'clergy'
    if (gender === 'male' && type === 'youth_u18') return 'male_u18'
    if (gender === 'female' && type === 'youth_u18') return 'female_u18'
    if (gender === 'male' && (type === 'chaperone_18plus' || type === 'general')) return 'male_chaperone'
    if (gender === 'female' && (type === 'chaperone_18plus' || type === 'general')) return 'female_chaperone'
    return null
  }

  function getRoomsForCategory(category: HousingCategory, groupId?: string): Room[] {
    const allRooms: Room[] = []

    for (const building of buildings) {
      for (const room of building.rooms || []) {
        const roomCategory = getCategoryFromRoom(room)
        // Show room if it matches category and is either available, already allocated to this group, or not allocated
        if (roomCategory === category && room.isAvailable) {
          if (!room.allocatedToGroupId || room.allocatedToGroupId === groupId) {
            allRooms.push({
              ...room,
              buildingName: building.name,
            })
          }
        }
      }
    }

    return allRooms.sort((a, b) => {
      if (a.buildingName !== b.buildingName) {
        return a.buildingName.localeCompare(b.buildingName)
      }
      return a.roomNumber.localeCompare(b.roomNumber)
    })
  }

  function openAllocateModal(group: GroupRegistration) {
    setSelectedGroup(group)

    // Pre-populate with currently allocated rooms
    const currentAllocations: Record<HousingCategory, string[]> = {
      male_u18: [],
      female_u18: [],
      male_chaperone: [],
      female_chaperone: [],
      clergy: [],
    }

    for (const room of group.allocatedRooms) {
      const category = getCategoryFromRoom(room)
      if (category) {
        currentAllocations[category].push(room.id)
      }
    }

    setSelectedRooms(currentAllocations)
    setIsAllocateModalOpen(true)
  }

  function toggleRoomSelection(category: HousingCategory, roomId: string) {
    setSelectedRooms(prev => {
      const current = prev[category]
      if (current.includes(roomId)) {
        return { ...prev, [category]: current.filter(id => id !== roomId) }
      } else {
        return { ...prev, [category]: [...current, roomId] }
      }
    })
  }

  function getSelectedBedsCount(category: HousingCategory): number {
    let total = 0
    const roomIds = selectedRooms[category]

    for (const building of buildings) {
      for (const room of building.rooms || []) {
        if (roomIds.includes(room.id)) {
          total += room.capacity
        }
      }
    }

    return total
  }

  async function handleSaveAllocations() {
    if (!selectedGroup) return

    setAllocating(true)
    try {
      const allocations = Object.entries(selectedRooms)
        .filter(([_, roomIds]) => roomIds.length > 0)
        .map(([category, roomIds]) => ({
          category,
          roomIds,
        }))

      const response = await fetch(`/api/admin/events/${eventId}/poros/group-allocations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupRegistrationId: selectedGroup.id,
          allocations,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to save allocations')
      }

      toast.success('Room allocations saved successfully')
      setIsAllocateModalOpen(false)
      setSelectedGroup(null)
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save allocations')
    } finally {
      setAllocating(false)
    }
  }

  async function handleClearAllocations(groupId: string) {
    if (!confirm('Are you sure you want to clear all room allocations for this group? Any existing participant assignments will remain but may need to be reassigned.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/events/${eventId}/poros/group-allocations/${groupId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to clear allocations')
      }

      toast.success('Allocations cleared')
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to clear allocations')
    }
  }

  function openDetailsModal(group: GroupRegistration) {
    setDetailsGroup(group)
    setIsDetailsModalOpen(true)
  }

  // Filter groups
  const filteredGroups = groups.filter(g => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return g.groupName.toLowerCase().includes(query) ||
           g.parishName?.toLowerCase().includes(query)
  })

  // Stats
  const totalGroups = groups.length
  const allocatedGroups = groups.filter(g => g.allocatedRooms.length > 0).length
  const fullyAllocatedGroups = groups.filter(g => {
    const needed = getBedsNeeded(g)
    const allocated = getAllocatedBeds(g)
    return Object.keys(needed).every(cat => {
      const k = cat as HousingCategory
      return allocated[k] >= needed[k]
    })
  }).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-navy" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Building2 className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">Group Room Allocations</h3>
              <p className="text-sm text-blue-700 mt-1">
                Allocate specific rooms to groups before they assign their participants to beds.
                Group leaders will only see and be able to assign participants to rooms allocated to them.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Groups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGroups}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              With Allocations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{allocatedGroups}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fully Allocated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{fullyAllocatedGroups}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Need Allocation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{totalGroups - fullyAllocatedGroups}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex-1 min-w-[250px] max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search groups by name or parish..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button variant="outline" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Groups List */}
      <Card>
        <CardHeader>
          <CardTitle>Groups ({filteredGroups.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredGroups.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No groups found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredGroups.map((group) => {
                const bedsNeeded = getBedsNeeded(group)
                const bedsAllocated = getAllocatedBeds(group)
                const hasAllocations = group.allocatedRooms.length > 0
                const isFullyAllocated = Object.keys(bedsNeeded).every(cat => {
                  const k = cat as HousingCategory
                  return bedsAllocated[k] >= bedsNeeded[k]
                })

                return (
                  <Card key={group.id} className={`border ${isFullyAllocated ? 'border-green-200 bg-green-50/30' : hasAllocations ? 'border-blue-200 bg-blue-50/30' : ''}`}>
                    <CardContent className="pt-4">
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        {/* Group Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{group.groupName}</h3>
                            {group.housingAssignmentsLocked && (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                Assignments Locked
                              </Badge>
                            )}
                          </div>
                          {group.parishName && (
                            <p className="text-sm text-muted-foreground mb-2">{group.parishName}</p>
                          )}
                          <p className="text-sm font-medium">
                            {group.totalParticipants} participants
                          </p>

                          {/* Beds Needed/Allocated Summary */}
                          <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                            {(Object.keys(bedsNeeded) as HousingCategory[]).map(cat => {
                              if (bedsNeeded[cat] === 0) return null
                              const needed = bedsNeeded[cat]
                              const allocated = bedsAllocated[cat]
                              const isEnough = allocated >= needed

                              return (
                                <div
                                  key={cat}
                                  className={`text-xs px-2 py-1.5 rounded border ${CATEGORY_COLORS[cat]}`}
                                >
                                  <div className="font-medium truncate">
                                    {cat === 'male_u18' && 'Male U18'}
                                    {cat === 'female_u18' && 'Female U18'}
                                    {cat === 'male_chaperone' && 'Male Chap.'}
                                    {cat === 'female_chaperone' && 'Female Chap.'}
                                    {cat === 'clergy' && 'Clergy'}
                                  </div>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    {isEnough ? (
                                      <Check className="w-3 h-3 text-green-600" />
                                    ) : (
                                      <AlertCircle className="w-3 h-3 text-amber-600" />
                                    )}
                                    <span>{allocated}/{needed} beds</span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>

                          {/* Allocated Rooms Summary */}
                          {hasAllocations && (
                            <div className="mt-3">
                              <p className="text-xs text-muted-foreground mb-1">Allocated Rooms:</p>
                              <div className="flex flex-wrap gap-1">
                                {group.allocatedRooms.slice(0, 6).map(room => (
                                  <Badge key={room.id} variant="outline" className="text-xs">
                                    {room.buildingName} {room.roomNumber}
                                  </Badge>
                                ))}
                                {group.allocatedRooms.length > 6 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{group.allocatedRooms.length - 6} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-row lg:flex-col gap-2">
                          <Button onClick={() => openAllocateModal(group)}>
                            <Home className="w-4 h-4 mr-2" />
                            Allocate Rooms
                          </Button>
                          {hasAllocations && (
                            <>
                              <Button variant="outline" onClick={() => openDetailsModal(group)}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </Button>
                              <Button
                                variant="outline"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleClearAllocations(group.id)}
                              >
                                <X className="w-4 h-4 mr-2" />
                                Clear
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Allocate Rooms Modal */}
      <Dialog open={isAllocateModalOpen} onOpenChange={setIsAllocateModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Allocate Rooms - {selectedGroup?.groupName}</DialogTitle>
            <DialogDescription>
              Select rooms for each participant category. The group leader will assign participants to beds within these rooms.
            </DialogDescription>
          </DialogHeader>

          {selectedGroup && (
            <ScrollArea className="flex-1 pr-4">
              <Accordion type="multiple" defaultValue={['male_u18', 'female_u18', 'male_chaperone', 'female_chaperone']} className="space-y-2">
                {(Object.keys(CATEGORY_LABELS) as HousingCategory[]).map(category => {
                  const needed = getBedsNeeded(selectedGroup)[category]
                  if (needed === 0 && category !== 'clergy') return null

                  const selectedCount = getSelectedBedsCount(category)
                  const isEnough = selectedCount >= needed
                  const availableRooms = getRoomsForCategory(category, selectedGroup.id)

                  return (
                    <AccordionItem key={category} value={category} className="border rounded-lg px-4">
                      <AccordionTrigger className="py-3 hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <span className="font-medium">{CATEGORY_LABELS[category]}</span>
                          <div className="flex items-center gap-2">
                            {needed > 0 ? (
                              <Badge
                                variant={isEnough ? 'default' : 'secondary'}
                                className={isEnough ? 'bg-green-500' : 'bg-amber-500'}
                              >
                                {selectedCount}/{needed} beds
                              </Badge>
                            ) : (
                              <Badge variant="outline">{selectedCount} beds</Badge>
                            )}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-4">
                        {category === 'clergy' && needed === 0 && (
                          <p className="text-sm text-muted-foreground mb-3">
                            Note: Clergy rooms are typically assigned by org admin directly, not allocated to groups.
                          </p>
                        )}

                        {availableRooms.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-4 text-center">
                            No available rooms for this category. Create rooms in Housing settings first.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {availableRooms.map(room => {
                              const isSelected = selectedRooms[category].includes(room.id)
                              const isAllocatedElsewhere = room.allocatedToGroupId &&
                                room.allocatedToGroupId !== selectedGroup.id

                              return (
                                <div
                                  key={room.id}
                                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                    isSelected
                                      ? 'bg-navy/5 border-navy'
                                      : isAllocatedElsewhere
                                        ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                                        : 'hover:bg-gray-50 border-gray-200'
                                  }`}
                                  onClick={() => !isAllocatedElsewhere && toggleRoomSelection(category, room.id)}
                                >
                                  <Checkbox
                                    checked={isSelected}
                                    disabled={isAllocatedElsewhere}
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium text-sm">
                                      {room.buildingName}, Room {room.roomNumber}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {room.capacity} beds • Floor {room.floor}
                                      {isAllocatedElsewhere && (
                                        <span className="text-amber-600 ml-2">
                                          → {room.allocatedToGroupName}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {room.capacity} beds
                                  </Badge>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            </ScrollArea>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsAllocateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAllocations} disabled={allocating}>
              {allocating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Allocations
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{detailsGroup?.groupName} - Room Allocations</DialogTitle>
          </DialogHeader>

          {detailsGroup && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Total Participants</p>
                  <p className="text-xl font-bold">{detailsGroup.totalParticipants}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rooms Allocated</p>
                  <p className="text-xl font-bold">{detailsGroup.allocatedRooms.length}</p>
                </div>
              </div>

              {/* Rooms by Category */}
              <div className="space-y-3">
                {(Object.keys(CATEGORY_LABELS) as HousingCategory[]).map(category => {
                  const needed = getBedsNeeded(detailsGroup)[category]
                  const rooms = detailsGroup.allocatedRooms.filter(r => getCategoryFromRoom(r) === category)

                  if (rooms.length === 0 && needed === 0) return null

                  const totalBeds = rooms.reduce((sum, r) => sum + r.capacity, 0)

                  return (
                    <div key={category} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{CATEGORY_LABELS[category]}</h4>
                        <Badge
                          variant={totalBeds >= needed ? 'default' : 'secondary'}
                          className={totalBeds >= needed ? 'bg-green-500' : 'bg-amber-500'}
                        >
                          {totalBeds}/{needed} beds
                        </Badge>
                      </div>
                      {rooms.length > 0 ? (
                        <div className="space-y-1">
                          {rooms.map(room => (
                            <div key={room.id} className="flex items-center justify-between text-sm py-1">
                              <span>{room.buildingName}, Room {room.roomNumber}</span>
                              <span className="text-muted-foreground">{room.capacity} beds</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No rooms allocated</p>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Lock Status */}
              {detailsGroup.housingAssignmentsLocked && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <strong>Note:</strong> This group has submitted their housing assignments.
                    {detailsGroup.housingAssignmentsSubmittedAt && (
                      <> Submitted on {new Date(detailsGroup.housingAssignmentsSubmittedAt).toLocaleDateString()}</>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsModalOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setIsDetailsModalOpen(false)
              if (detailsGroup) openAllocateModal(detailsGroup)
            }}>
              <Home className="w-4 h-4 mr-2" />
              Edit Allocations
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
