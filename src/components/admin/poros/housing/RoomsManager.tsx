'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Building, Room } from '../PorosHousing'
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  DoorOpen,
  Loader2,
  Accessibility,
  Users
} from 'lucide-react'
import { toast } from '@/lib/toast'

interface RoomsManagerProps {
  eventId: string
  buildings: Building[]
  rooms: Room[]
  selectedBuildingId: string | null
  onBuildingChange: (buildingId: string | null) => void
  onRefresh: () => void
}

const ROOM_TYPE_OPTIONS = [
  { value: 'single', label: 'Single', beds: 1 },
  { value: 'double', label: 'Double', beds: 2 },
  { value: 'triple', label: 'Triple', beds: 3 },
  { value: 'quad', label: 'Quad', beds: 4 },
  { value: 'custom', label: 'Custom', beds: 0 },
]

const ROOM_PURPOSE_OPTIONS = [
  { value: 'housing', label: 'Housing', color: 'bg-blue-100 text-blue-800' },
  { value: 'small_group', label: 'Small Group', color: 'bg-purple-100 text-purple-800' },
  { value: 'both', label: 'Both', color: 'bg-green-100 text-green-800' },
]

export function RoomsManager({
  eventId,
  buildings,
  rooms,
  selectedBuildingId,
  onBuildingChange,
  onRefresh,
}: RoomsManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [purposeFilter, setPurposeFilter] = useState<'all' | 'housing' | 'small_group' | 'both'>('all')

  const [formData, setFormData] = useState({
    buildingId: '',
    roomNumber: '',
    floor: 1,
    roomType: 'double' as 'single' | 'double' | 'triple' | 'quad' | 'custom',
    roomPurpose: 'housing' as 'housing' | 'small_group' | 'both',
    capacity: 2,
    isAvailable: true,
    isAdaAccessible: false,
    notes: '',
  })

  const [bulkFormData, setBulkFormData] = useState({
    buildingId: '',
    floor: 1,
    startNumber: 101,
    endNumber: 110,
    roomType: 'double' as 'single' | 'double' | 'triple' | 'quad' | 'custom',
    capacity: 2,
    prefix: '',
    suffix: '',
  })

  const selectedBuilding = buildings.find(b => b.id === selectedBuildingId)
  const filteredRooms = rooms.filter(r => {
    if (selectedBuildingId && r.buildingId !== selectedBuildingId) return false
    if (purposeFilter !== 'all' && r.roomPurpose !== purposeFilter) return false
    return true
  })

  function openCreateDialog() {
    setEditingRoom(null)
    setFormData({
      buildingId: selectedBuildingId || buildings[0]?.id || '',
      roomNumber: '',
      floor: 1,
      roomType: 'double',
      roomPurpose: 'housing',
      capacity: 2,
      isAvailable: true,
      isAdaAccessible: false,
      notes: '',
    })
    setIsDialogOpen(true)
  }

  function openEditDialog(room: Room) {
    setEditingRoom(room)
    setFormData({
      buildingId: room.buildingId,
      roomNumber: room.roomNumber,
      floor: room.floor,
      roomType: room.roomType || 'double',
      roomPurpose: room.roomPurpose || 'housing',
      capacity: room.capacity,
      isAvailable: room.isAvailable,
      isAdaAccessible: room.isAdaAccessible,
      notes: room.notes || '',
    })
    setIsDialogOpen(true)
  }

  function openBulkDialog() {
    setBulkFormData({
      buildingId: selectedBuildingId || buildings[0]?.id || '',
      floor: 1,
      startNumber: 101,
      endNumber: 110,
      roomType: 'double',
      capacity: 2,
      prefix: '',
      suffix: '',
    })
    setIsBulkDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const building = buildings.find(b => b.id === formData.buildingId)
      const payload = {
        ...formData,
        gender: building?.gender,
        housingType: building?.housingType,
        roomPurpose: formData.roomPurpose,
      }

      const url = editingRoom
        ? `/api/admin/events/${eventId}/poros/rooms/${editingRoom.id}`
        : `/api/admin/events/${eventId}/poros/rooms`

      const response = await fetch(url, {
        method: editingRoom ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to save room')
      }

      toast.success(editingRoom ? 'Room updated' : 'Room created')
      setIsDialogOpen(false)
      onRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save room')
    } finally {
      setLoading(false)
    }
  }

  async function handleBulkCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const building = buildings.find(b => b.id === bulkFormData.buildingId)
      const roomsToCreate = []

      for (let num = bulkFormData.startNumber; num <= bulkFormData.endNumber; num++) {
        roomsToCreate.push({
          buildingId: bulkFormData.buildingId,
          roomNumber: `${bulkFormData.prefix}${num}${bulkFormData.suffix}`,
          floor: bulkFormData.floor,
          roomType: bulkFormData.roomType,
          capacity: bulkFormData.capacity,
          bedCount: bulkFormData.capacity,
          gender: building?.gender,
          housingType: building?.housingType,
          isAvailable: true,
          isAdaAccessible: false,
        })
      }

      const response = await fetch(`/api/admin/events/${eventId}/poros/rooms/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rooms: roomsToCreate }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create rooms')
      }

      const result = await response.json()
      toast.success(`Created ${result.count} rooms`)
      setIsBulkDialogOpen(false)
      onRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create rooms')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(roomId: string) {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/poros/rooms/${roomId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete room')
      }

      toast.success('Room deleted')
      setDeleteConfirmId(null)
      onRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete room')
    } finally {
      setLoading(false)
    }
  }

  function handleRoomTypeChange(type: 'single' | 'double' | 'triple' | 'quad' | 'custom') {
    const option = ROOM_TYPE_OPTIONS.find(o => o.value === type)
    setFormData({
      ...formData,
      roomType: type,
      capacity: option && type !== 'custom' ? option.beds : formData.capacity,
    })
  }

  function handleBulkRoomTypeChange(type: 'single' | 'double' | 'triple' | 'quad' | 'custom') {
    const option = ROOM_TYPE_OPTIONS.find(o => o.value === type)
    setBulkFormData({
      ...bulkFormData,
      roomType: type,
      capacity: option && type !== 'custom' ? option.beds : bulkFormData.capacity,
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DoorOpen className="w-5 h-5" />
              Rooms
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Manage rooms within buildings
            </p>
          </div>
          <Select
            value={selectedBuildingId || 'all'}
            onValueChange={(value) => onBuildingChange(value === 'all' ? null : value)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Buildings" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Buildings</SelectItem>
              {buildings.map((building) => (
                <SelectItem key={building.id} value={building.id}>
                  {building.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={purposeFilter}
            onValueChange={(value: 'all' | 'housing' | 'small_group' | 'both') => setPurposeFilter(value)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Purposes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Purposes</SelectItem>
              <SelectItem value="housing">Housing Only</SelectItem>
              <SelectItem value="small_group">Small Group Only</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openBulkDialog} disabled={buildings.length === 0}>
            <Plus className="w-4 h-4 mr-2" />
            Bulk Add
          </Button>
          <Button onClick={openCreateDialog} disabled={buildings.length === 0}>
            <Plus className="w-4 h-4 mr-2" />
            Add Room
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {buildings.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <DoorOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Create a building first</p>
            <p className="text-sm">You need at least one building before adding rooms</p>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <DoorOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No rooms in {selectedBuilding?.name || 'this selection'}</p>
            <p className="text-sm">Add rooms to start assigning participants</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room #</TableHead>
                {!selectedBuildingId && <TableHead>Building</TableHead>}
                <TableHead>Floor</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead className="text-center">Occupancy</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRooms.map((room) => {
                const building = buildings.find(b => b.id === room.buildingId)
                return (
                  <TableRow key={room.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {room.roomNumber}
                        {room.isAdaAccessible && (
                          <Accessibility className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                    </TableCell>
                    {!selectedBuildingId && (
                      <TableCell>{building?.name || 'Unknown'}</TableCell>
                    )}
                    <TableCell>{room.floor}</TableCell>
                    <TableCell className="capitalize">{room.roomType || '-'}</TableCell>
                    <TableCell>
                      {(() => {
                        const purpose = ROOM_PURPOSE_OPTIONS.find(p => p.value === room.roomPurpose) || ROOM_PURPOSE_OPTIONS[0]
                        return (
                          <Badge className={purpose.color}>
                            {purpose.label}
                          </Badge>
                        )
                      })()}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span
                          className={
                            room.currentOccupancy >= room.capacity
                              ? 'text-red-600 font-medium'
                              : ''
                          }
                        >
                          {room.currentOccupancy}/{room.capacity}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {!room.isAvailable ? (
                        <Badge variant="secondary">Unavailable</Badge>
                      ) : room.currentOccupancy >= room.capacity ? (
                        <Badge className="bg-red-100 text-red-800">Full</Badge>
                      ) : room.currentOccupancy > 0 ? (
                        <Badge className="bg-yellow-100 text-yellow-800">Partial</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-800">Available</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(room)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => setDeleteConfirmId(room.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingRoom ? 'Edit Room' : 'Add Room'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="buildingId">Building</Label>
                <Select
                  value={formData.buildingId}
                  onValueChange={(value) => setFormData({ ...formData, buildingId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select building" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.map((building) => (
                      <SelectItem key={building.id} value={building.id}>
                        {building.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="roomNumber">Room Number</Label>
                  <Input
                    id="roomNumber"
                    value={formData.roomNumber}
                    onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                    placeholder="e.g., 101, A-12"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="floor">Floor</Label>
                  <Input
                    id="floor"
                    type="number"
                    min="1"
                    value={formData.floor}
                    onChange={(e) =>
                      setFormData({ ...formData, floor: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="roomType">Room Type</Label>
                  <Select
                    value={formData.roomType}
                    onValueChange={handleRoomTypeChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROOM_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacity (beds)</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    value={formData.capacity}
                    onChange={(e) =>
                      setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })
                    }
                    disabled={formData.roomType !== 'custom'}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="roomPurpose">Room Purpose</Label>
                <Select
                  value={formData.roomPurpose}
                  onValueChange={(value: 'housing' | 'small_group' | 'both') =>
                    setFormData({ ...formData, roomPurpose: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOM_PURPOSE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Housing = bed assignments, Small Group = meeting rooms, Both = can be used for either
                </p>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isAvailable"
                    checked={formData.isAvailable}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isAvailable: !!checked })
                    }
                  />
                  <Label htmlFor="isAvailable">Available for assignments</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isAdaAccessible"
                    checked={formData.isAdaAccessible}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isAdaAccessible: !!checked })
                    }
                  />
                  <Label htmlFor="isAdaAccessible">ADA Accessible</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional notes about this room"
                  rows={2}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingRoom ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Bulk Create Dialog */}
        <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk Add Rooms</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleBulkCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bulkBuildingId">Building</Label>
                <Select
                  value={bulkFormData.buildingId}
                  onValueChange={(value) =>
                    setBulkFormData({ ...bulkFormData, buildingId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select building" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.map((building) => (
                      <SelectItem key={building.id} value={building.id}>
                        {building.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bulkFloor">Floor</Label>
                  <Input
                    id="bulkFloor"
                    type="number"
                    min="1"
                    value={bulkFormData.floor}
                    onChange={(e) =>
                      setBulkFormData({ ...bulkFormData, floor: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startNumber">Start #</Label>
                  <Input
                    id="startNumber"
                    type="number"
                    min="1"
                    value={bulkFormData.startNumber}
                    onChange={(e) =>
                      setBulkFormData({
                        ...bulkFormData,
                        startNumber: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endNumber">End #</Label>
                  <Input
                    id="endNumber"
                    type="number"
                    min="1"
                    value={bulkFormData.endNumber}
                    onChange={(e) =>
                      setBulkFormData({
                        ...bulkFormData,
                        endNumber: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bulkPrefix">Prefix (optional)</Label>
                  <Input
                    id="bulkPrefix"
                    value={bulkFormData.prefix}
                    onChange={(e) =>
                      setBulkFormData({ ...bulkFormData, prefix: e.target.value })
                    }
                    placeholder="e.g., A-"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bulkSuffix">Suffix (optional)</Label>
                  <Input
                    id="bulkSuffix"
                    value={bulkFormData.suffix}
                    onChange={(e) =>
                      setBulkFormData({ ...bulkFormData, suffix: e.target.value })
                    }
                    placeholder="e.g., -A"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bulkRoomType">Room Type</Label>
                  <Select
                    value={bulkFormData.roomType}
                    onValueChange={handleBulkRoomTypeChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROOM_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bulkCapacity">Capacity</Label>
                  <Input
                    id="bulkCapacity"
                    type="number"
                    min="1"
                    value={bulkFormData.capacity}
                    onChange={(e) =>
                      setBulkFormData({
                        ...bulkFormData,
                        capacity: parseInt(e.target.value) || 1,
                      })
                    }
                    disabled={bulkFormData.roomType !== 'custom'}
                  />
                </div>
              </div>

              <div className="bg-muted p-3 rounded text-sm">
                Will create {Math.max(0, bulkFormData.endNumber - bulkFormData.startNumber + 1)} rooms:
                {' '}
                {bulkFormData.prefix}{bulkFormData.startNumber}{bulkFormData.suffix}
                {' '}-{' '}
                {bulkFormData.prefix}{bulkFormData.endNumber}{bulkFormData.suffix}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsBulkDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Rooms
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Room</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground">
              Are you sure you want to delete this room? All assignments to this room will be
              removed. This action cannot be undone.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
                disabled={loading}
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
