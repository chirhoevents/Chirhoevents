'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BuildingsManager } from './housing/BuildingsManager'
import { RoomsManager } from './housing/RoomsManager'
import { ParticipantAssignments } from './housing/ParticipantAssignments'
import { Building2, DoorOpen, Users, Loader2 } from 'lucide-react'

interface PorosHousingProps {
  eventId: string
  settings: any
}

export interface Building {
  id: string
  eventId: string
  name: string
  gender: 'male' | 'female' | 'mixed'
  housingType: 'youth_u18' | 'chaperone_18plus' | 'clergy' | 'general'
  totalFloors: number
  totalRooms: number
  totalBeds: number
  notes: string | null
  displayOrder: number
  rooms?: Room[]
}

export interface Room {
  id: string
  buildingId: string
  roomNumber: string
  floor: number
  bedCount: number
  roomType: 'single' | 'double' | 'triple' | 'quad' | 'custom' | null
  gender: 'male' | 'female' | 'mixed' | null
  housingType: 'youth_u18' | 'chaperone_18plus' | 'clergy' | 'general' | null
  capacity: number
  currentOccupancy: number
  notes: string | null
  isAvailable: boolean
  isAdaAccessible: boolean
  building?: Building
  assignments?: RoomAssignment[]
}

export interface RoomAssignment {
  id: string
  roomId: string
  participantId: string | null
  individualRegistrationId: string | null
  groupRegistrationId: string | null
  bedNumber: number | null
  assignedAt: string
  assignedBy: string | null
  notes: string | null
  participant?: {
    id: string
    firstName: string
    lastName: string
    gender: string
    isMinor: boolean
    groupRegistration?: {
      parishName: string
    }
  }
  individualRegistration?: {
    id: string
    firstName: string
    lastName: string
    gender: string
    dateOfBirth: string | null
  }
}

export function PorosHousing({ eventId, settings }: PorosHousingProps) {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('assignments')
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [eventId])

  async function fetchData() {
    setLoading(true)
    try {
      const [buildingsRes, roomsRes] = await Promise.all([
        fetch(`/api/admin/events/${eventId}/poros/buildings`),
        fetch(`/api/admin/events/${eventId}/poros/rooms`)
      ])

      if (buildingsRes.ok) {
        const data = await buildingsRes.json()
        setBuildings(data)
        if (data.length > 0 && !selectedBuildingId) {
          setSelectedBuildingId(data[0].id)
        }
      }

      if (roomsRes.ok) {
        const data = await roomsRes.json()
        setRooms(data)
      }
    } catch (error) {
      console.error('Failed to fetch housing data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate stats
  const totalBeds = rooms.reduce((sum, r) => sum + r.capacity, 0)
  const occupiedBeds = rooms.reduce((sum, r) => sum + r.currentOccupancy, 0)
  const maleRooms = rooms.filter(r => r.gender === 'male')
  const femaleRooms = rooms.filter(r => r.gender === 'female')
  const maleBeds = maleRooms.reduce((sum, r) => sum + r.capacity, 0)
  const maleOccupied = maleRooms.reduce((sum, r) => sum + r.currentOccupancy, 0)
  const femaleBeds = femaleRooms.reduce((sum, r) => sum + r.capacity, 0)
  const femaleOccupied = femaleRooms.reduce((sum, r) => sum + r.currentOccupancy, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-navy" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Buildings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{buildings.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Rooms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rooms.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Beds Occupied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {occupiedBeds} / {totalBeds}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-navy rounded-full h-2"
                style={{ width: totalBeds > 0 ? `${(occupiedBeds / totalBeds) * 100}%` : '0%' }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              By Gender
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-600">Male</span>
              <span>{maleOccupied}/{maleBeds}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-blue-500 rounded-full h-1.5"
                style={{ width: maleBeds > 0 ? `${(maleOccupied / maleBeds) * 100}%` : '0%' }}
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-pink-600">Female</span>
              <span>{femaleOccupied}/{femaleBeds}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-pink-500 rounded-full h-1.5"
                style={{ width: femaleBeds > 0 ? `${(femaleOccupied / femaleBeds) * 100}%` : '0%' }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Assignments
          </TabsTrigger>
          <TabsTrigger value="rooms" className="flex items-center gap-2">
            <DoorOpen className="w-4 h-4" />
            Rooms
          </TabsTrigger>
          <TabsTrigger value="buildings" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Buildings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="mt-4">
          <ParticipantAssignments
            eventId={eventId}
            buildings={buildings}
            rooms={rooms}
            settings={settings}
            onRefresh={fetchData}
          />
        </TabsContent>

        <TabsContent value="rooms" className="mt-4">
          <RoomsManager
            eventId={eventId}
            buildings={buildings}
            rooms={rooms}
            selectedBuildingId={selectedBuildingId}
            onBuildingChange={setSelectedBuildingId}
            onRefresh={fetchData}
          />
        </TabsContent>

        <TabsContent value="buildings" className="mt-4">
          <BuildingsManager
            eventId={eventId}
            buildings={buildings}
            onRefresh={fetchData}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
