'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  Accessibility,
  Home,
  Users,
  Loader2,
  Check,
  AlertCircle,
  Building2,
} from 'lucide-react'
import { toast } from '@/lib/toast'

interface PorosADAProps {
  eventId: string
}

interface AdaRoom {
  id: string
  buildingId: string
  buildingName: string
  roomNumber: string
  floor: number
  capacity: number
  currentOccupancy: number
  adaFeatures: string | null
}

interface AdaParticipant {
  id: string
  type: 'participant' | 'individual'
  firstName: string
  lastName: string
  adaDescription: string | null
  groupName: string | null
  assigned: boolean
  buildingName?: string
  roomNumber?: string
}

export function PorosADA({ eventId }: PorosADAProps) {
  const [adaRooms, setAdaRooms] = useState<AdaRoom[]>([])
  const [adaParticipants, setAdaParticipants] = useState<AdaParticipant[]>([])
  const [loading, setLoading] = useState(true)

  // Assignment dialog state
  const [selectedParticipant, setSelectedParticipant] = useState<AdaParticipant | null>(null)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [selectedRoomId, setSelectedRoomId] = useState<string>('')
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    fetchADAData()
  }, [eventId])

  async function fetchADAData() {
    setLoading(true)
    try {
      const [roomsRes, participantsRes] = await Promise.all([
        fetch(`/api/admin/events/${eventId}/poros/ada/rooms`),
        fetch(`/api/admin/events/${eventId}/poros/ada/participants`),
      ])

      if (roomsRes.ok) {
        setAdaRooms(await roomsRes.json())
      }
      if (participantsRes.ok) {
        setAdaParticipants(await participantsRes.json())
      }
    } catch (error) {
      console.error('Failed to fetch ADA data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAssign() {
    if (!selectedParticipant || !selectedRoomId) return

    setAssigning(true)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/poros/room-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: selectedRoomId,
          participantId: selectedParticipant.type === 'participant' ? selectedParticipant.id : null,
          individualRegistrationId: selectedParticipant.type === 'individual' ? selectedParticipant.id : null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to assign room')
      }

      toast.success(`${selectedParticipant.firstName} ${selectedParticipant.lastName} assigned to ADA room`)
      setIsAssignDialogOpen(false)
      setSelectedParticipant(null)
      setSelectedRoomId('')
      fetchADAData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign room')
    } finally {
      setAssigning(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-navy" />
      </div>
    )
  }

  const assignedCount = adaParticipants.filter(p => p.assigned).length
  const unassignedCount = adaParticipants.length - assignedCount
  const availableAdaBeds = adaRooms.reduce((sum, r) => sum + (r.capacity - r.currentOccupancy), 0)

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Home className="w-4 h-4" />
              ADA Rooms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adaRooms.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              ADA Needs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adaParticipants.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Check className="w-4 h-4" />
              Assigned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{assignedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Unassigned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${unassignedCount > 0 ? 'text-amber-600' : 'text-green-600'}`}>
              {unassignedCount}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ADA Rooms */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              ADA-Accessible Rooms
            </CardTitle>
          </CardHeader>
          <CardContent>
            {adaRooms.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Accessibility className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No ADA rooms configured</p>
                <p className="text-sm mt-2">
                  Mark rooms as ADA accessible in the Rooms manager
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {adaRooms.map((room) => (
                    <div
                      key={room.id}
                      className="flex items-start justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 rounded">
                          <Accessibility className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {room.buildingName} - Room {room.roomNumber}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Floor {room.floor} • {room.currentOccupancy}/{room.capacity} occupied
                          </div>
                          {room.adaFeatures && (
                            <div className="text-xs text-blue-600 mt-1">
                              {room.adaFeatures}
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant={room.currentOccupancy < room.capacity ? 'default' : 'secondary'}
                        className={room.currentOccupancy < room.capacity ? 'bg-green-100 text-green-800' : ''}
                      >
                        {room.capacity - room.currentOccupancy} available
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
            <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
              Total available ADA beds: <span className="font-semibold text-navy">{availableAdaBeds}</span>
            </div>
          </CardContent>
        </Card>

        {/* Participants with ADA Needs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Participants with ADA Needs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {adaParticipants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No participants with ADA needs</p>
                <p className="text-sm mt-2">
                  Participants indicate ADA needs on liability forms
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {adaParticipants.map((participant) => (
                    <div
                      key={participant.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        participant.assigned
                          ? 'bg-green-50 border-green-200'
                          : 'bg-amber-50 border-amber-200'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="font-medium">
                          {participant.firstName} {participant.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {participant.adaDescription || 'ADA accommodation needed'}
                        </div>
                        {participant.groupName && (
                          <div className="text-xs text-muted-foreground">
                            Group: {participant.groupName}
                          </div>
                        )}
                      </div>

                      {participant.assigned ? (
                        <div className="text-right">
                          <Badge className="bg-green-100 text-green-800">
                            <Check className="w-3 h-3 mr-1" />
                            Assigned
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            {participant.buildingName} - Room {participant.roomNumber}
                          </div>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedParticipant(participant)
                            setIsAssignDialogOpen(true)
                          }}
                          disabled={availableAdaBeds === 0}
                        >
                          Assign Room
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ADA Notes */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <Accessibility className="w-4 h-4" />
            ADA Accommodation Notes
          </h4>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Mark rooms as ADA accessible in the Rooms manager (Buildings tab)</li>
            <li>Participants indicate ADA needs when submitting liability forms</li>
            <li>Manually assign participants with ADA needs to appropriate ADA rooms</li>
            <li>Review specific accommodation needs and contact participants if clarification is needed</li>
            <li>Consider proximity to event areas and accessibility features when making assignments</li>
          </ul>
        </CardContent>
      </Card>

      {/* Assign Room Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Assign ADA Room - {selectedParticipant?.firstName} {selectedParticipant?.lastName}
            </DialogTitle>
          </DialogHeader>

          {selectedParticipant?.adaDescription && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
              <strong>ADA Needs:</strong> {selectedParticipant.adaDescription}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Select ADA Room</label>
              <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose an ADA room..." />
                </SelectTrigger>
                <SelectContent>
                  {adaRooms
                    .filter(r => r.currentOccupancy < r.capacity)
                    .map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.buildingName} - Room {room.roomNumber} ({room.capacity - room.currentOccupancy} available)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {selectedRoomId && (
              <div className="p-3 bg-gray-50 rounded text-sm">
                {(() => {
                  const room = adaRooms.find(r => r.id === selectedRoomId)
                  if (!room) return null
                  return (
                    <div>
                      <div className="font-medium">{room.buildingName} - Room {room.roomNumber}</div>
                      <div className="text-muted-foreground">Floor {room.floor}</div>
                      {room.adaFeatures && (
                        <div className="text-blue-600 mt-1">Features: {room.adaFeatures}</div>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedRoomId || assigning}
            >
              {assigning && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Assign to Room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
