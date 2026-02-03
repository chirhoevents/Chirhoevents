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
  roomPurpose?: 'housing' | 'small_group' | null
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
  smallGroupAssignedGroups?: Array<{
    id: string
    groupName: string
    parishName?: string
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
    // Filter by room type
    if (roomType === 'housing') {
      // Housing rooms have null or 'housing' purpose
      if (room.roomPurpose === 'small_group') return false
    } else if (roomType === 'smallGroup') {
      // Small group rooms have 'small_group' purpose
      if (room.roomPurpose !== 'small_group') return false
    }
    // 'all' shows everything
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
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8fafc; }
          .room-poster {
            page-break-after: always;
            page-break-inside: avoid;
            padding: 48px;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            background: white;
          }
          .room-poster:last-child { page-break-after: auto; }

          /* Header with gradient banner */
          .room-header {
            text-align: center;
            background: linear-gradient(135deg, #1E3A5F 0%, #2d5a8a 100%);
            color: white;
            padding: 32px 24px;
            border-radius: 16px;
            margin-bottom: 32px;
            box-shadow: 0 10px 40px rgba(30, 58, 95, 0.3);
          }
          .room-type-label {
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 3px;
            opacity: 0.9;
            margin-bottom: 8px;
            font-weight: 600;
          }
          .room-number {
            font-size: 80px;
            font-weight: 800;
            line-height: 1.1;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
          }
          .building-name {
            font-size: 20px;
            opacity: 0.9;
            margin-top: 8px;
            font-weight: 500;
          }

          /* Small group specific header */
          .room-header.small-group {
            background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          }

          /* Info badges row */
          .room-info {
            display: flex;
            justify-content: center;
            gap: 16px;
            margin-top: 24px;
            flex-wrap: wrap;
          }
          .room-badge {
            padding: 10px 20px;
            border-radius: 50px;
            font-size: 14px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
          }
          .badge-male { background: #dbeafe; color: #1e40af; border: 2px solid #93c5fd; }
          .badge-female { background: #fce7f3; color: #be185d; border: 2px solid #f9a8d4; }
          .badge-mixed { background: #f3e8ff; color: #7c3aed; border: 2px solid #c4b5fd; }
          .badge-capacity { background: #ecfdf5; color: #065f46; border: 2px solid #6ee7b7; }
          .badge-ada { background: #fef3c7; color: #92400e; border: 2px solid #fcd34d; }
          .badge-small-group { background: #f3e8ff; color: #7c3aed; border: 2px solid #c4b5fd; }

          /* Assignments section */
          .assignments-section {
            flex: 1;
            margin-top: 8px;
          }
          .assignments-title {
            font-size: 18px;
            font-weight: 700;
            color: #374151;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 3px solid #e5e7eb;
            text-transform: uppercase;
            letter-spacing: 2px;
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .assignments-title::before {
            content: '';
            width: 6px;
            height: 24px;
            background: linear-gradient(135deg, #1E3A5F 0%, #2d5a8a 100%);
            border-radius: 3px;
          }
          .assignments-title.small-group::before {
            background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          }

          /* Assignment cards */
          .assignment-item {
            padding: 20px 24px;
            border-radius: 12px;
            margin-bottom: 12px;
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border-left: 5px solid #1E3A5F;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            transition: transform 0.2s;
          }
          .assignment-item.small-group-assignment {
            border-left-color: #7c3aed;
          }
          .group-name {
            font-size: 22px;
            font-weight: 700;
            color: #1f2937;
          }
          .parish-name {
            font-size: 16px;
            color: #6b7280;
            margin-top: 6px;
            font-style: italic;
          }
          .participant-name {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
          }
          .no-assignments {
            text-align: center;
            padding: 60px 40px;
            color: #9ca3af;
            font-size: 18px;
            font-style: italic;
            background: #f9fafb;
            border-radius: 12px;
            border: 2px dashed #e5e7eb;
          }

          /* Notes section */
          .room-notes {
            margin-top: auto;
            padding: 20px 24px;
            border-radius: 12px;
            background: #fffbeb;
            border: 2px solid #fde68a;
            font-size: 14px;
            color: #92400e;
          }
          .room-notes strong {
            display: block;
            margin-bottom: 8px;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          @media print {
            body { background: white; }
            .room-poster { padding: 32px; }
            .room-number { font-size: 72px; }
            .room-header { box-shadow: none; }
            .assignment-item { box-shadow: none; }
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
          {/* Room Type Selection */}
          <div>
            <Label className="mb-2 block">Poster Type</Label>
            <Select value={roomType} onValueChange={(value: 'all' | 'housing' | 'smallGroup') => setRoomType(value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select poster type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rooms</SelectItem>
                <SelectItem value="housing">Housing Rooms Only</SelectItem>
                <SelectItem value="smallGroup">Small Group Rooms Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
            {filteredRooms.map(room => {
              const isSmallGroupRoom = room.roomPurpose === 'small_group'
              const hasHousingAssignments = room.assignments && room.assignments.length > 0
              const hasSmallGroupAssignments = room.smallGroupAssignedGroups && room.smallGroupAssignedGroups.length > 0
              const hasAnyAssignments = hasHousingAssignments || hasSmallGroupAssignments

              return (
                <div key={room.id} className="room-poster">
                  <div className={`room-header ${isSmallGroupRoom ? 'small-group' : ''}`}>
                    <div className="room-type-label">
                      {isSmallGroupRoom ? 'Small Group Room' : 'Housing'}
                    </div>
                    <div className="room-number">
                      {room.roomNumber}
                    </div>
                    <div className="building-name">
                      {room.building?.name}
                    </div>
                    <div className="room-info">
                      {isSmallGroupRoom ? (
                        <span className="room-badge badge-small-group">
                          Small Group
                        </span>
                      ) : (
                        <span className={`room-badge ${getGenderBadgeClass(room.gender || room.building?.gender || null)}`}>
                          {getGenderLabel(room.gender || room.building?.gender || null)}
                        </span>
                      )}
                      <span className="room-badge badge-capacity">
                        Capacity: {room.capacity}
                      </span>
                      {room.isAdaAccessible && (
                        <span className="room-badge badge-ada">
                          ADA Accessible
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="assignments-section">
                    {/* Small Group Assignments */}
                    {isSmallGroupRoom && (
                      <>
                        <div className="assignments-title small-group">
                          Assigned Groups
                        </div>
                        {!hasSmallGroupAssignments ? (
                          <div className="no-assignments">
                            No groups assigned yet
                          </div>
                        ) : (
                          room.smallGroupAssignedGroups!.map((group, idx) => (
                            <div key={group.id || idx} className="assignment-item small-group-assignment">
                              <div className="group-name">
                                {group.groupName}
                              </div>
                              {group.parishName && (
                                <div className="parish-name">
                                  {group.parishName}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </>
                    )}

                    {/* Housing Assignments */}
                    {!isSmallGroupRoom && (
                      <>
                        <div className="assignments-title">
                          Assigned Groups / Participants
                        </div>
                        {!hasHousingAssignments ? (
                          <div className="no-assignments">
                            No assignments yet
                          </div>
                        ) : (
                          room.assignments!.map((assignment, idx) => (
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
                      </>
                    )}
                  </div>

                  {room.notes && (
                    <div className="room-notes">
                      <strong>Notes:</strong> {room.notes}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Sample Preview */}
          {filteredRooms.length > 0 && (() => {
            const previewRoom = filteredRooms[0]
            const isSmallGroup = previewRoom.roomPurpose === 'small_group'
            const previewAssignments = isSmallGroup
              ? previewRoom.smallGroupAssignedGroups || []
              : previewRoom.assignments || []

            return (
              <div className="border rounded-lg overflow-hidden">
                <Label className="block px-4 py-2 bg-gray-100 border-b font-medium">
                  Sample Preview (first room):
                </Label>
                <div className={`p-4 ${isSmallGroup ? 'bg-purple-50' : 'bg-blue-50'}`}>
                  <div className={`text-center rounded-lg p-4 mb-3 ${
                    isSmallGroup
                      ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white'
                      : 'bg-gradient-to-r from-[#1E3A5F] to-[#2d5a8a] text-white'
                  }`}>
                    <div className="text-xs uppercase tracking-wider opacity-90 mb-1">
                      {isSmallGroup ? 'Small Group Room' : 'Housing'}
                    </div>
                    <div className="text-2xl font-bold">
                      {previewRoom.roomNumber}
                    </div>
                    <div className="text-sm opacity-90">
                      {previewRoom.building?.name}
                    </div>
                    <div className="flex justify-center gap-2 mt-3">
                      {isSmallGroup ? (
                        <span className="text-xs px-3 py-1 rounded-full bg-white/20 font-medium">
                          Small Group
                        </span>
                      ) : (
                        <span className={`text-xs px-3 py-1 rounded-full bg-white/20 font-medium`}>
                          {getGenderLabel(previewRoom.gender)}
                        </span>
                      )}
                      <span className="text-xs px-3 py-1 rounded-full bg-white/20 font-medium">
                        Capacity: {previewRoom.capacity}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-700">
                    {previewAssignments.length > 0 ? (
                      <div>
                        <strong className="text-xs uppercase tracking-wider text-gray-500">
                          {isSmallGroup ? 'Assigned Groups:' : 'Assignments:'}
                        </strong>
                        <ul className="mt-2 space-y-1">
                          {previewAssignments.slice(0, 3).map((a: any, i: number) => (
                            <li key={i} className="bg-white px-3 py-2 rounded border-l-4 border-gray-300">
                              {isSmallGroup
                                ? a.groupName
                                : (a.groupRegistration?.groupName ||
                                   (a.participant ? `${a.participant.firstName} ${a.participant.lastName}` : 'Unknown'))}
                            </li>
                          ))}
                          {previewAssignments.length > 3 && (
                            <li className="text-gray-400 italic px-3">
                              ...and {previewAssignments.length - 3} more
                            </li>
                          )}
                        </ul>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-400 italic">
                        No assignments yet
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })()}
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
