'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, Loader2, Building2, Users, ChevronDown, ChevronRight, Filter } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface RoomAllocationReportModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  eventName: string
}

interface RoomData {
  roomId: string
  buildingName: string
  buildingGender: string
  buildingHousingType: string
  roomNumber: string
  floor: number
  roomType: string
  roomPurpose: string
  gender: string
  housingType: string
  capacity: number
  bedCount: number
  currentOccupancy: number
  availableBeds: number
  isAvailable: boolean
  isAdaAccessible: boolean
  notes: string
  allocatedGroup: {
    id: string
    groupName: string
    parishName: string
    participantCount: number
    participants: Array<{
      id: string
      name: string
      gender: string
      type: string
    }>
  } | null
  smallGroups: Array<{
    id: string
    name: string
    groupNumber: number
    currentSize: number
    capacity: number
    sglName: string | null
  }>
  assignedGroups: Array<{
    id: string
    groupName: string
    parishName: string
    dioceseName: string
    totalParticipants: number
    actualParticipantCount: number
    participants: Array<{
      id: string
      name: string
      gender: string
      type: string
    }>
  }>
  assignedPeople: Array<{
    id: string
    name: string
    gender: string
    type: string
    groupName?: string
    parishName?: string
    bedNumber?: number
    source: string
  }>
}

interface SummaryData {
  totalRooms: number
  totalCapacity: number
  totalOccupied: number
  roomsWithGroups: number
  housingRooms: number
  smallGroupRooms: number
  bothPurposeRooms: number
  byBuilding: Array<{
    buildingName: string
    gender: string
    housingType: string
    totalRooms: number
    totalCapacity: number
    totalOccupied: number
  }>
}

export default function RoomAllocationReportModal({
  isOpen,
  onClose,
  eventId,
  eventName,
}: RoomAllocationReportModalProps) {
  const [data, setData] = useState<{ summary: SummaryData; rooms: RoomData[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null)
  const [purposeFilter, setPurposeFilter] = useState<string>('all')
  const [expandedBuildings, setExpandedBuildings] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen, eventId, purposeFilter])

  const fetchData = async () => {
    try {
      setLoading(true)
      let url = `/api/admin/events/${eventId}/reports/room-allocations`
      if (purposeFilter !== 'all') {
        url += `?purpose=${purposeFilter}`
      }
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch data')
      const result = await response.json()
      setData(result)
      // Auto-expand all buildings
      if (result.summary?.byBuilding) {
        setExpandedBuildings(new Set(result.summary.byBuilding.map((b: any) => b.buildingName)))
      }
    } catch (error) {
      console.error('Error fetching room allocations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format: 'csv' | 'pdf') => {
    setExporting(format)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/reports/room-allocations/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, purpose: purposeFilter !== 'all' ? purposeFilter : undefined }),
      })
      if (!response.ok) throw new Error()
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `room_allocations_${eventName.replace(/\s+/g, '_')}.${format === 'csv' ? 'csv' : 'txt'}`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      alert('Export failed')
    } finally {
      setExporting(null)
    }
  }

  const toggleBuilding = (buildingName: string) => {
    const newExpanded = new Set(expandedBuildings)
    if (newExpanded.has(buildingName)) {
      newExpanded.delete(buildingName)
    } else {
      newExpanded.add(buildingName)
    }
    setExpandedBuildings(newExpanded)
  }

  const groupRoomsByBuilding = (rooms: RoomData[]) => {
    const grouped: Record<string, RoomData[]> = {}
    for (const room of rooms) {
      if (!grouped[room.buildingName]) {
        grouped[room.buildingName] = []
      }
      grouped[room.buildingName].push(room)
    }
    return grouped
  }

  const formatPurpose = (purpose: string) => {
    return purpose?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || ''
  }

  const formatGender = (gender: string) => {
    return gender?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || ''
  }

  const formatHousingType = (type: string) => {
    return type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || ''
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-[#1E3A5F]">
            Room Allocation Report - {eventName}
          </DialogTitle>
        </DialogHeader>

        {/* Filter Controls */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[#6B7280]" />
            <span className="text-sm text-[#6B7280]">Filter by purpose:</span>
          </div>
          <Select value={purposeFilter} onValueChange={setPurposeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All purposes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Purposes</SelectItem>
              <SelectItem value="housing">Housing Only</SelectItem>
              <SelectItem value="small_group">Small Group Only</SelectItem>
              <SelectItem value="both">Both (Housing & Small Group)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#9C8466]" />
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-[#F5F1E8] border-[#9C8466]">
                <CardContent className="pt-4">
                  <p className="text-sm text-[#6B7280]">Total Rooms</p>
                  <p className="text-2xl font-bold text-[#1E3A5F]">{data.summary.totalRooms}</p>
                </CardContent>
              </Card>
              <Card className="bg-[#F5F1E8] border-[#9C8466]">
                <CardContent className="pt-4">
                  <p className="text-sm text-[#6B7280]">Total Capacity</p>
                  <p className="text-2xl font-bold text-[#1E3A5F]">{data.summary.totalCapacity}</p>
                </CardContent>
              </Card>
              <Card className="bg-[#F5F1E8] border-[#9C8466]">
                <CardContent className="pt-4">
                  <p className="text-sm text-[#6B7280]">Currently Occupied</p>
                  <p className="text-2xl font-bold text-[#1E3A5F]">{data.summary.totalOccupied}</p>
                  <p className="text-xs text-[#6B7280]">
                    {data.summary.totalCapacity > 0
                      ? Math.round((data.summary.totalOccupied / data.summary.totalCapacity) * 100)
                      : 0}% occupancy
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-[#F5F1E8] border-[#9C8466]">
                <CardContent className="pt-4">
                  <p className="text-sm text-[#6B7280]">Available Beds</p>
                  <p className="text-2xl font-bold text-green-600">
                    {data.summary.totalCapacity - data.summary.totalOccupied}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Room Purpose Breakdown */}
            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="pt-4">
                <h3 className="font-semibold text-[#1E3A5F] mb-3">Room Purpose Breakdown</h3>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                      Housing: {data.summary.housingRooms}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
                      Small Group: {data.summary.smallGroupRooms}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                      Both: {data.summary.bothPurposeRooms}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                      With Groups Assigned: {data.summary.roomsWithGroups}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Building Summary */}
            <div>
              <h3 className="font-semibold text-[#1E3A5F] mb-3">Buildings Summary</h3>
              <div className="space-y-2">
                {data.summary.byBuilding.map((building) => (
                  <div
                    key={building.buildingName}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-[#9C8466]" />
                      <div>
                        <span className="font-medium">{building.buildingName}</span>
                        <div className="text-xs text-[#6B7280]">
                          {formatGender(building.gender)} | {formatHousingType(building.housingType)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">
                        {building.totalOccupied}/{building.totalCapacity}
                      </span>
                      <div className="text-xs text-[#6B7280]">{building.totalRooms} rooms</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed Room List by Building */}
            <div>
              <h3 className="font-semibold text-[#1E3A5F] mb-3">Room Details</h3>
              {Object.entries(groupRoomsByBuilding(data.rooms)).map(([buildingName, rooms]) => (
                <div key={buildingName} className="mb-4 border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleBuilding(buildingName)}
                    className="w-full flex items-center justify-between p-3 bg-[#1E3A5F] text-white hover:bg-[#2A4A6F]"
                  >
                    <div className="flex items-center gap-2">
                      {expandedBuildings.has(buildingName) ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                      <Building2 className="h-5 w-5" />
                      <span className="font-semibold">{buildingName}</span>
                    </div>
                    <span className="text-sm">
                      {rooms.length} rooms
                    </span>
                  </button>

                  {expandedBuildings.has(buildingName) && (
                    <div className="divide-y">
                      {rooms.map((room) => (
                        <div key={room.roomId} className="p-4 hover:bg-gray-50">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-[#1E3A5F]">
                                  Room {room.roomNumber}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={
                                    room.roomPurpose === 'housing'
                                      ? 'bg-blue-50 text-blue-700'
                                      : room.roomPurpose === 'small_group'
                                      ? 'bg-purple-50 text-purple-700'
                                      : 'bg-green-50 text-green-700'
                                  }
                                >
                                  {formatPurpose(room.roomPurpose)}
                                </Badge>
                                {room.isAdaAccessible && (
                                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                                    ADA
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-[#6B7280]">
                                Floor {room.floor} | {formatGender(room.gender || room.buildingGender)} |{' '}
                                {room.roomType ? formatPurpose(room.roomType) : 'Standard'}
                              </div>
                            </div>
                            <div className="text-right">
                              <div
                                className={`text-lg font-bold ${
                                  room.currentOccupancy >= room.capacity
                                    ? 'text-red-600'
                                    : room.currentOccupancy > 0
                                    ? 'text-orange-600'
                                    : 'text-green-600'
                                }`}
                              >
                                {room.currentOccupancy}/{room.capacity}
                              </div>
                              <div className="text-xs text-[#6B7280]">
                                {room.availableBeds} available
                              </div>
                            </div>
                          </div>

                          {/* Allocated Group */}
                          {room.allocatedGroup && (
                            <div className="mt-2 p-2 bg-blue-50 rounded">
                              <div className="flex items-center gap-2 text-sm font-medium text-blue-800">
                                <Users className="h-4 w-4" />
                                Allocated to: {room.allocatedGroup.groupName}
                              </div>
                              {room.allocatedGroup.parishName && (
                                <div className="text-xs text-blue-600 ml-6">
                                  {room.allocatedGroup.parishName}
                                </div>
                              )}
                              <div className="text-xs text-blue-600 ml-6">
                                {room.allocatedGroup.participantCount} participants in group
                              </div>
                            </div>
                          )}

                          {/* Small Groups */}
                          {room.smallGroups.length > 0 && (
                            <div className="mt-2 p-2 bg-purple-50 rounded">
                              <div className="text-sm font-medium text-purple-800 mb-1">
                                Small Groups Meeting Here:
                              </div>
                              {room.smallGroups.map((sg) => (
                                <div key={sg.id} className="text-xs text-purple-600 ml-2">
                                  {sg.name} ({sg.currentSize}/{sg.capacity})
                                  {sg.sglName && <span className="ml-2">SGL: {sg.sglName}</span>}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Groups Assigned to Small Group Room */}
                          {room.assignedGroups && room.assignedGroups.length > 0 && (
                            <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                              <div className="flex items-center gap-2 text-sm font-medium text-green-800 mb-2">
                                <Users className="h-4 w-4" />
                                Groups Assigned to This Room ({room.assignedGroups.length}):
                              </div>
                              <div className="space-y-2">
                                {room.assignedGroups.map((group) => (
                                  <div key={group.id} className="p-2 bg-white rounded border border-green-100">
                                    <div className="font-medium text-green-900">{group.groupName}</div>
                                    {group.parishName && (
                                      <div className="text-xs text-green-700">{group.parishName}</div>
                                    )}
                                    {group.dioceseName && (
                                      <div className="text-xs text-green-600">{group.dioceseName}</div>
                                    )}
                                    <div className="text-xs text-green-700 mt-1">
                                      {group.actualParticipantCount} participants
                                    </div>
                                    {group.participants.length > 0 && (
                                      <div className="mt-1 text-xs text-green-600">
                                        {group.participants.slice(0, 5).map(p => p.name).join(', ')}
                                        {group.participants.length > 5 && ` +${group.participants.length - 5} more`}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Assigned People */}
                          {room.assignedPeople.length > 0 && (
                            <div className="mt-2 p-2 bg-gray-100 rounded">
                              <div className="text-sm font-medium text-[#1E3A5F] mb-1">
                                Assigned People:
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                                {room.assignedPeople.map((person) => (
                                  <div
                                    key={person.id}
                                    className="text-xs text-[#6B7280] flex items-center gap-1"
                                  >
                                    <span className="font-medium">{person.name}</span>
                                    {person.bedNumber && (
                                      <Badge variant="outline" className="text-[10px] px-1">
                                        Bed {person.bedNumber}
                                      </Badge>
                                    )}
                                    {person.groupName && (
                                      <span className="text-[#9C8466]">({person.groupName})</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Notes */}
                          {room.notes && (
                            <div className="mt-2 text-xs text-[#6B7280] italic">
                              Note: {room.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Export Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={() => handleExport('csv')}
                disabled={exporting !== null}
                variant="outline"
                className="flex-1"
              >
                {exporting === 'csv' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export CSV
              </Button>
              <Button
                onClick={() => handleExport('pdf')}
                disabled={exporting !== null}
                variant="outline"
                className="flex-1"
              >
                {exporting === 'pdf' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export Text
              </Button>
              <Button onClick={onClose} variant="outline" className="border-[#1E3A5F] text-[#1E3A5F]">
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-[#6B7280]">No data available</div>
        )}
      </DialogContent>
    </Dialog>
  )
}
