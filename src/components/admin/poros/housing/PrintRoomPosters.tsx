'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Printer, X, Loader2 } from 'lucide-react'
import { toast } from '@/lib/toast'

interface Room {
  id: string
  roomNumber: string
  buildingId: string
  capacity: number
  currentOccupancy: number
  gender: 'male' | 'female' | 'mixed' | null
  notes: string | null
  isAdaAccessible: boolean
  building?: {
    id: string
    name: string
    gender: 'male' | 'female' | 'mixed'
  }
  assignments?: Array<{
    id: string
    groupRegistrationId?: string | null
    participantId?: string | null
    groupRegistration?: {
      groupName: string
      parishName?: string
    }
    participant?: {
      firstName: string
      lastName: string
      groupRegistration?: {
        parishName: string
      }
    }
  }>
}

interface Building {
  id: string
  name: string
  gender: 'male' | 'female' | 'mixed'
  housingType: string
}

interface PrintRoomPostersProps {
  eventId: string
  buildings: Building[]
  rooms: Room[]
  isOpen: boolean
  onClose: () => void
}

export function PrintRoomPosters({ eventId, buildings, rooms, isOpen, onClose }: PrintRoomPostersProps) {
  const [selectedBuildings, setSelectedBuildings] = useState<string[]>([])
  const [roomType, setRoomType] = useState<'all' | 'housing' | 'smallGroup'>('all')
  const [loading, setLoading] = useState(false)
  const [roomsWithAssignments, setRoomsWithAssignments] = useState<Room[]>([])
  const printRef = useRef<HTMLDivElement>(null)

  // Fetch room assignments when opened
  useEffect(() => {
    if (isOpen) {
      fetchRoomAssignments()
      // Select all buildings by default
      setSelectedBuildings(buildings.map(b => b.id))
    }
  }, [isOpen, buildings])

  const fetchRoomAssignments = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/poros/rooms?includeAssignments=true`)
      if (!response.ok) throw new Error('Failed to fetch room assignments')
      const data = await response.json()
      setRoomsWithAssignments(data.rooms || [])
    } catch (error) {
      console.error('Error fetching room assignments:', error)
      toast.error('Failed to load room assignments')
    } finally {
      setLoading(false)
    }
  }

  const toggleBuilding = (buildingId: string) => {
    setSelectedBuildings(prev =>
      prev.includes(buildingId)
        ? prev.filter(id => id !== buildingId)
        : [...prev, buildingId]
    )
  }

  const selectAllBuildings = () => {
    setSelectedBuildings(buildings.map(b => b.id))
  }

  const clearAllBuildings = () => {
    setSelectedBuildings([])
  }

  const filteredRooms = roomsWithAssignments.filter(room => {
    if (!selectedBuildings.includes(room.buildingId)) return false
    return true
  })

  const handlePrint = () => {
    const printContent = document.getElementById('print-room-posters-content')
    if (!printContent) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('Please allow pop-ups to print')
      return
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Room Posters</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; }
          .room-poster {
            page-break-after: always;
            page-break-inside: avoid;
            padding: 40px;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
          }
          .room-poster:last-child { page-break-after: auto; }
          .room-header {
            text-align: center;
            border-bottom: 4px solid #1E3A5F;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .room-number {
            font-size: 72px;
            font-weight: bold;
            color: #1E3A5F;
          }
          .building-name {
            font-size: 24px;
            color: #666;
            margin-top: 10px;
          }
          .room-info {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin-top: 15px;
            flex-wrap: wrap;
          }
          .room-badge {
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
          }
          .badge-male { background: #dbeafe; color: #1e40af; }
          .badge-female { background: #fce7f3; color: #be185d; }
          .badge-mixed { background: #f3e8ff; color: #7c3aed; }
          .badge-capacity { background: #ecfdf5; color: #065f46; }
          .badge-ada { background: #fef3c7; color: #92400e; }
          .assignments-section {
            flex: 1;
            margin-top: 20px;
          }
          .assignments-title {
            font-size: 20px;
            font-weight: bold;
            color: #1E3A5F;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e5e7eb;
          }
          .assignment-item {
            padding: 15px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            margin-bottom: 10px;
            background: #f9fafb;
          }
          .group-name {
            font-size: 20px;
            font-weight: bold;
            color: #1E3A5F;
          }
          .parish-name {
            font-size: 16px;
            color: #6b7280;
            margin-top: 5px;
          }
          .participant-name {
            font-size: 18px;
            font-weight: bold;
          }
          .no-assignments {
            text-align: center;
            padding: 40px;
            color: #9ca3af;
            font-size: 18px;
            font-style: italic;
          }
          .room-notes {
            margin-top: auto;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
          }
          @media print {
            .room-poster { padding: 20px; }
            .room-number { font-size: 60px; }
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  const getGenderBadgeClass = (gender: string | null) => {
    switch (gender) {
      case 'male': return 'badge-male'
      case 'female': return 'badge-female'
      default: return 'badge-mixed'
    }
  }

  const getGenderLabel = (gender: string | null) => {
    switch (gender) {
      case 'male': return 'Male'
      case 'female': return 'Female'
      default: return 'Mixed'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            Print Room Posters
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Building Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Select Buildings</Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAllBuildings}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={clearAllBuildings}>
                  Clear All
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {buildings.map(building => (
                <label
                  key={building.id}
                  className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50"
                >
                  <Checkbox
                    checked={selectedBuildings.includes(building.id)}
                    onCheckedChange={() => toggleBuilding(building.id)}
                  />
                  <span className="text-sm">{building.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    building.gender === 'male' ? 'bg-blue-100 text-blue-700' :
                    building.gender === 'female' ? 'bg-pink-100 text-pink-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>
                    {building.gender}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Preview Count */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-800">
              <strong>{filteredRooms.length}</strong> room posters will be generated
            </p>
          </div>

          {/* Preview (hidden, used for printing) */}
          <div id="print-room-posters-content" className="hidden">
            {filteredRooms.map(room => (
              <div key={room.id} className="room-poster">
                <div className="room-header">
                  <div className="room-number">
                    {room.building?.name} {room.roomNumber}
                  </div>
                  <div className="building-name">
                    {room.building?.name}
                  </div>
                  <div className="room-info">
                    <span className={`room-badge ${getGenderBadgeClass(room.gender || room.building?.gender || null)}`}>
                      {getGenderLabel(room.gender || room.building?.gender || null)}
                    </span>
                    <span className="room-badge badge-capacity">
                      Capacity: {room.capacity}
                    </span>
                    {room.isAdaAccessible && (
                      <span className="room-badge badge-ada">
                        ♿ ADA Accessible
                      </span>
                    )}
                  </div>
                </div>

                <div className="assignments-section">
                  <div className="assignments-title">
                    Assigned Groups / Participants
                  </div>

                  {(!room.assignments || room.assignments.length === 0) ? (
                    <div className="no-assignments">
                      No assignments yet
                    </div>
                  ) : (
                    room.assignments.map((assignment, idx) => (
                      <div key={assignment.id || idx} className="assignment-item">
                        {assignment.groupRegistration ? (
                          <>
                            <div className="group-name">
                              {assignment.groupRegistration.groupName}
                            </div>
                            {assignment.groupRegistration.parishName && (
                              <div className="parish-name">
                                {assignment.groupRegistration.parishName}
                              </div>
                            )}
                          </>
                        ) : assignment.participant ? (
                          <>
                            <div className="participant-name">
                              {assignment.participant.firstName} {assignment.participant.lastName}
                            </div>
                            {assignment.participant.groupRegistration?.parishName && (
                              <div className="parish-name">
                                {assignment.participant.groupRegistration.parishName}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="group-name">Unknown assignment</div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {room.notes && (
                  <div className="room-notes">
                    <strong>Notes:</strong> {room.notes}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Sample Preview */}
          {filteredRooms.length > 0 && (
            <div className="border rounded p-4">
              <Label className="mb-2 block">Sample Preview (first room):</Label>
              <div className="border rounded p-4 bg-gray-50">
                <div className="text-center border-b-2 border-[#1E3A5F] pb-3 mb-3">
                  <div className="text-3xl font-bold text-[#1E3A5F]">
                    {filteredRooms[0].building?.name} {filteredRooms[0].roomNumber}
                  </div>
                  <div className="flex justify-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      filteredRooms[0].gender === 'male' ? 'bg-blue-100 text-blue-700' :
                      filteredRooms[0].gender === 'female' ? 'bg-pink-100 text-pink-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {getGenderLabel(filteredRooms[0].gender)}
                    </span>
                    <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">
                      Capacity: {filteredRooms[0].capacity}
                    </span>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  {filteredRooms[0].assignments && filteredRooms[0].assignments.length > 0 ? (
                    <div>
                      <strong>Assignments:</strong>
                      <ul className="mt-1">
                        {filteredRooms[0].assignments.slice(0, 3).map((a, i) => (
                          <li key={i}>
                            {a.groupRegistration?.groupName ||
                             (a.participant ? `${a.participant.firstName} ${a.participant.lastName}` : 'Unknown')}
                          </li>
                        ))}
                        {filteredRooms[0].assignments.length > 3 && (
                          <li className="text-gray-400">...and {filteredRooms[0].assignments.length - 3} more</li>
                        )}
                      </ul>
                    </div>
                  ) : (
                    <span className="italic text-gray-400">No assignments yet</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handlePrint}
            disabled={loading || filteredRooms.length === 0}
            className="bg-[#1E3A5F] hover:bg-[#2a4a6f]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Printer className="w-4 h-4 mr-2" />
                Print {filteredRooms.length} Posters
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
