'use client'

import { useState, useEffect, useRef } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { BuildingsManager } from './housing/BuildingsManager'
import { RoomsManager } from './housing/RoomsManager'
import { ParticipantAssignments } from './housing/ParticipantAssignments'
import { GroupAssignments } from './housing/GroupAssignments'
import { PrintRoomPosters } from './housing/PrintRoomPosters'
import { Building2, DoorOpen, Users, Loader2, Download, Upload, FileSpreadsheet, Printer, Users2 } from 'lucide-react'
import { toast } from '@/lib/toast'

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
  roomPurpose: 'housing' | 'small_group' | 'both'
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
  const [activeTab, setActiveTab] = useState('group-assignments')
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null)

  // Import/Export state
  const [showImportModal, setShowImportModal] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // Download CSV template
  function handleDownloadTemplate() {
    const template = `Building Name,Gender,Housing Type,Total Floors,Room Number,Floor,Room Type,Capacity,Is ADA Accessible,ADA Features,Notes
St. Joseph Hall,male,youth_u18,3,201,2,double,2,false,,Corner room
St. Joseph Hall,male,youth_u18,3,202,2,triple,3,false,,
St. Joseph Hall,male,youth_u18,3,203,2,quad,4,true,Wheelchair accessible,Near elevator
Marian Hall,female,youth_u18,2,101,1,double,2,true,Ground floor - wheelchair accessible,Ground floor
Marian Hall,female,youth_u18,2,102,1,triple,3,false,,`

    const blob = new Blob([template], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `housing-template-${eventId}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  // Export current data
  async function handleExportData() {
    try {
      const response = await fetch(`/api/admin/events/${eventId}/poros/buildings/export`)
      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `housing-export-${eventId}-${Date.now()}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      toast.success('Housing data exported')
    } catch (error) {
      toast.error('Failed to export data')
    }
  }

  // Handle file selection for import
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setImportFile(selectedFile)

    // Parse CSV for preview
    const text = await selectedFile.text()
    const lines = text.split('\n').filter(line => line.trim())
    const headers = lines[0].split(',').map(h => h.trim())
    const rows = lines.slice(1, 6).map(line =>
      line.split(',').map(cell => cell.trim())
    )

    setImportPreview({ headers, rows })
  }

  // Handle import submission
  async function handleImport() {
    if (!importFile) return

    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', importFile)

      const response = await fetch(`/api/admin/events/${eventId}/poros/buildings/import`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Import failed')
      }

      const result = await response.json()
      toast.success(`Imported ${result.buildingsCreated} buildings and ${result.roomsCreated} rooms`)
      setShowImportModal(false)
      setImportFile(null)
      setImportPreview(null)
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import failed')
    } finally {
      setImporting(false)
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
      {/* Import/Export Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleDownloadTemplate}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Download Template
        </Button>
        <Button variant="outline" onClick={() => setShowImportModal(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Import Buildings/Rooms
        </Button>
        {buildings.length > 0 && (
          <Button variant="outline" onClick={handleExportData}>
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
        )}
        {rooms.length > 0 && (
          <Button variant="outline" onClick={() => setShowPrintModal(true)}>
            <Printer className="w-4 h-4 mr-2" />
            Print Room Posters
          </Button>
        )}
      </div>

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
          <TabsTrigger value="group-assignments" className="flex items-center gap-2">
            <Users2 className="w-4 h-4" />
            Groups
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Individuals
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

        <TabsContent value="group-assignments" className="mt-4">
          <GroupAssignments
            eventId={eventId}
            buildings={buildings}
            rooms={rooms}
            onRefresh={fetchData}
          />
        </TabsContent>

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

      {/* Import Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Import Buildings & Rooms</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Instructions */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded">
              <h4 className="font-semibold text-blue-900 mb-2">Instructions:</h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Download the CSV template using the &quot;Download Template&quot; button</li>
                <li>Open the template in Excel or Google Sheets</li>
                <li>Fill in your building and room information</li>
                <li>Save as CSV file</li>
                <li>Upload the filled template below</li>
              </ol>
            </div>

            {/* File upload */}
            <div>
              <Label>Select CSV File</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="mt-1"
              />
            </div>

            {/* Preview */}
            {importPreview && (
              <div>
                <Label>Preview (first 5 rows):</Label>
                <div className="mt-2 overflow-x-auto border rounded">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        {importPreview.headers.map((header, i) => (
                          <th key={i} className="border-b px-2 py-1 text-left font-medium">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.rows.map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, j) => (
                            <td key={j} className="border-b px-2 py-1">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowImportModal(false)
              setImportFile(null)
              setImportPreview(null)
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!importFile || importing}
            >
              {importing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Import Buildings & Rooms
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Room Posters Modal */}
      <PrintRoomPosters
        eventId={eventId}
        buildings={buildings}
        rooms={rooms}
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
      />
    </div>
  )
}
