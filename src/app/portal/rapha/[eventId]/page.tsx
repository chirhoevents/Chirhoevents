'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Activity,
  Search,
  Users,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Pill,
  Heart,
  Phone,
  Utensils,
  Accessibility,
  X,
  Shield,
  Eye,
  ArrowLeft,
  Stethoscope,
  MapPin,
  Camera,
  QrCode,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from '@/lib/toast'

// Dynamic import for QR scanner
const QRScanner = dynamic(
  () => import('@/components/salve/QRScanner').then((mod) => mod.QRScanner),
  { ssr: false, loading: () => <div className="text-center py-8"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div> }
)

interface Participant {
  id: string
  firstName: string
  lastName: string
  age: number | null
  gender: string | null
  groupName: string
  roomAssignment: string | null
  alertLevel: 'none' | 'low' | 'medium' | 'high'
  medical: {
    allergies: string | null
    hasSevereAllergy: boolean
    medicalConditions: string | null
    medications: string | null
    dietaryRestrictions: string | null
    adaAccommodations: string | null
  }
  emergency: {
    contact1Name: string | null
    contact1Phone: string | null
    contact1Relation: string | null
    contact2Name: string | null
    contact2Phone: string | null
    contact2Relation: string | null
  }
}

interface RaphaStats {
  totalParticipants: number
  severeAllergies: number
  allergies: number
  medications: number
  conditions: number
  dietaryRestrictions: number
  adaAccommodations: number
}

export default function RaphaDedicatedPortal() {
  const params = useParams()
  const eventId = params.eventId as string

  const [loading, setLoading] = useState(true)
  const [eventName, setEventName] = useState('')
  const [eventDates, setEventDates] = useState('')
  const [stats, setStats] = useState<RaphaStats | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [error, setError] = useState('')

  // Quick lookup by ID (for QR scan)
  async function lookupByParticipantId(participantId: string) {
    try {
      const response = await fetch(`/api/admin/events/${eventId}/rapha/participants/${participantId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.participant) {
          setSelectedParticipant(data.participant)
          setShowProfileModal(true)
          setShowQRScanner(false)
          return true
        }
      }
      // If not found by ID, try searching by name
      setSearch(participantId)
      setShowQRScanner(false)
      toast.error('Participant not found. Try searching by name.')
      return false
    } catch (err) {
      console.error('Failed to lookup participant:', err)
      toast.error('Failed to lookup participant')
      return false
    }
  }

  function handleQRScan(data: string) {
    if (data) {
      lookupByParticipantId(data)
    }
  }

  useEffect(() => {
    fetchData()
  }, [eventId])

  useEffect(() => {
    if (eventId) {
      fetchParticipants()
    }
  }, [eventId, filter])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchParticipants()
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  async function fetchData() {
    try {
      const response = await fetch(`/api/admin/events/${eventId}/rapha/stats`)
      if (response.ok) {
        const data = await response.json()
        setEventName(data.event.name)
        setEventDates(
          `${format(new Date(data.event.startDate), 'MMM d')} - ${format(new Date(data.event.endDate), 'MMM d, yyyy')}`
        )
        setStats(data.stats)
      } else {
        setError('Failed to load event data')
      }
    } catch (err) {
      setError('Failed to load event data')
    } finally {
      setLoading(false)
    }
  }

  async function fetchParticipants() {
    try {
      const params = new URLSearchParams({
        filter,
        sortBy: 'name',
        ...(search && { search }),
      })
      const response = await fetch(`/api/admin/events/${eventId}/rapha/participants?${params}`)
      if (response.ok) {
        const data = await response.json()
        setParticipants(data.participants || [])
      }
    } catch (err) {
      console.error('Failed to fetch participants:', err)
    }
  }

  function getAlertBadge(alertLevel: string) {
    switch (alertLevel) {
      case 'high':
        return <Badge className="bg-red-500">SEVERE</Badge>
      case 'medium':
        return <Badge className="bg-amber-500">ALERT</Badge>
      case 'low':
        return <Badge className="bg-blue-500">INFO</Badge>
      default:
        return <Badge variant="outline">OK</Badge>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading Rapha Medical Portal...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Error Loading Portal</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Link href="/dashboard/admin/rapha">
              <Button>Return to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-red-600 text-white py-4 px-6 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <Stethoscope className="w-7 h-7 text-red-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Rapha Medical Portal</h1>
              <p className="text-sm text-white/80">{eventName} - {eventDates}</p>
            </div>
          </div>
          <Link
            href="/dashboard/admin/rapha"
            className="flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Exit Portal
          </Link>
        </div>
      </header>

      {/* Privacy Notice */}
      <div className="bg-amber-50 border-b border-amber-200 py-2 px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-amber-800 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span><strong>CONFIDENTIAL</strong> - HIPAA Protected Information. Access is logged.</span>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 text-center">
              <Users className="w-6 h-6 text-gray-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-gray-800">{stats?.totalParticipants || 0}</p>
              <p className="text-xs text-gray-500">Total</p>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-4 text-center">
              <AlertTriangle className="w-6 h-6 text-red-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-red-600">{stats?.severeAllergies || 0}</p>
              <p className="text-xs text-red-600">Severe</p>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-4 text-center">
              <AlertCircle className="w-6 h-6 text-amber-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-amber-600">{stats?.allergies || 0}</p>
              <p className="text-xs text-amber-600">Allergies</p>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-4 text-center">
              <Pill className="w-6 h-6 text-blue-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-blue-600">{stats?.medications || 0}</p>
              <p className="text-xs text-blue-600">Medications</p>
            </CardContent>
          </Card>
          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="pt-4 text-center">
              <Heart className="w-6 h-6 text-purple-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-purple-600">{stats?.conditions || 0}</p>
              <p className="text-xs text-purple-600">Conditions</p>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-4 text-center">
              <Utensils className="w-6 h-6 text-green-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-green-600">{stats?.dietaryRestrictions || 0}</p>
              <p className="text-xs text-green-600">Dietary</p>
            </CardContent>
          </Card>
          <Card className="border-indigo-200 bg-indigo-50">
            <CardContent className="pt-4 text-center">
              <Accessibility className="w-6 h-6 text-indigo-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-indigo-600">{stats?.adaAccommodations || 0}</p>
              <p className="text-xs text-indigo-600">ADA</p>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filter */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex gap-2 flex-1">
                <Button
                  onClick={() => setShowQRScanner(true)}
                  size="lg"
                  className="h-12 px-4 bg-red-600 hover:bg-red-700"
                >
                  <QrCode className="w-5 h-5 mr-2" />
                  Scan QR
                </Button>
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="Search by name, condition, allergy..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-12 h-12 text-lg"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: 'All', color: 'bg-gray-100' },
                  { key: 'severe', label: 'Severe', color: 'bg-red-100 text-red-700' },
                  { key: 'allergies', label: 'Allergies', color: 'bg-amber-100 text-amber-700' },
                  { key: 'medications', label: 'Meds', color: 'bg-blue-100 text-blue-700' },
                  { key: 'conditions', label: 'Conditions', color: 'bg-purple-100 text-purple-700' },
                ].map((f) => (
                  <Button
                    key={f.key}
                    variant={filter === f.key ? 'default' : 'outline'}
                    size="lg"
                    onClick={() => setFilter(f.key)}
                    className={filter === f.key ? 'bg-red-600 hover:bg-red-700' : ''}
                  >
                    {f.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Participants Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-red-600" />
              Participant Medical Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left p-4 font-semibold">Name</th>
                    <th className="text-left p-4 font-semibold">Age</th>
                    <th className="text-left p-4 font-semibold">Group / Room</th>
                    <th className="text-left p-4 font-semibold">Alert</th>
                    <th className="text-left p-4 font-semibold">Allergies</th>
                    <th className="text-left p-4 font-semibold">Conditions</th>
                    <th className="text-left p-4 font-semibold">Medications</th>
                    <th className="text-left p-4 font-semibold">Emergency Contact</th>
                    <th className="text-left p-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {participants.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-gray-500">
                        No participants found matching your criteria
                      </td>
                    </tr>
                  ) : (
                    participants.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="p-4">
                          <button
                            onClick={() => {
                              setSelectedParticipant(p)
                              setShowProfileModal(true)
                            }}
                            className="font-medium text-red-600 hover:text-red-800 hover:underline text-left"
                          >
                            {p.firstName} {p.lastName}
                          </button>
                        </td>
                        <td className="p-4">{p.age || '-'}</td>
                        <td className="p-4">
                          <div>{p.groupName}</div>
                          {p.roomAssignment && (
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {p.roomAssignment}
                            </div>
                          )}
                        </td>
                        <td className="p-4">{getAlertBadge(p.alertLevel)}</td>
                        <td className="p-4">
                          {p.medical.allergies ? (
                            <div className="max-w-[180px]">
                              {p.medical.hasSevereAllergy && (
                                <AlertTriangle className="w-4 h-4 text-red-500 inline mr-1" />
                              )}
                              <span className={p.medical.hasSevereAllergy ? 'text-red-600 font-bold' : 'text-amber-600'}>
                                {p.medical.allergies}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">None</span>
                          )}
                        </td>
                        <td className="p-4">
                          {p.medical.medicalConditions ? (
                            <span className="text-purple-600">{p.medical.medicalConditions}</span>
                          ) : (
                            <span className="text-gray-400">None</span>
                          )}
                        </td>
                        <td className="p-4">
                          {p.medical.medications ? (
                            <span className="text-blue-600">{p.medical.medications}</span>
                          ) : (
                            <span className="text-gray-400">None</span>
                          )}
                        </td>
                        <td className="p-4 text-sm">
                          {p.emergency.contact1Name && (
                            <div>
                              <div className="font-medium">{p.emergency.contact1Name}</div>
                              <a
                                href={`tel:${p.emergency.contact1Phone}`}
                                className="text-red-600 hover:underline flex items-center gap-1"
                              >
                                <Phone className="w-3 h-3" />
                                {p.emergency.contact1Phone}
                              </a>
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedParticipant(p)
                              setShowProfileModal(true)
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Details
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Profile Modal */}
      <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedParticipant && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-xl">
                  {selectedParticipant.firstName} {selectedParticipant.lastName}
                  {getAlertBadge(selectedParticipant.alertLevel)}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Basic Info */}
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-500 text-xs">Age</p>
                    <p className="font-medium text-lg">{selectedParticipant.age || '-'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-500 text-xs">Gender</p>
                    <p className="font-medium text-lg capitalize">{selectedParticipant.gender || '-'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-500 text-xs">Group</p>
                    <p className="font-medium">{selectedParticipant.groupName}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-500 text-xs">Room</p>
                    <p className="font-medium">{selectedParticipant.roomAssignment || '-'}</p>
                  </div>
                </div>

                {/* Critical Alert */}
                {selectedParticipant.medical.hasSevereAllergy && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-red-700 font-bold mb-2">
                      <AlertTriangle className="w-5 h-5" />
                      CRITICAL - SEVERE ALLERGY
                    </div>
                    <p className="text-red-600 font-medium">{selectedParticipant.medical.allergies}</p>
                  </div>
                )}

                {/* Allergies */}
                {selectedParticipant.medical.allergies && !selectedParticipant.medical.hasSevereAllergy && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h4 className="font-medium flex items-center gap-2 mb-2 text-amber-800">
                      <AlertCircle className="w-4 h-4" />
                      Allergies
                    </h4>
                    <p className="text-amber-700">{selectedParticipant.medical.allergies}</p>
                  </div>
                )}

                {/* Medical Conditions */}
                {selectedParticipant.medical.medicalConditions && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="font-medium flex items-center gap-2 mb-2 text-purple-800">
                      <Heart className="w-4 h-4" />
                      Medical Conditions
                    </h4>
                    <p className="text-purple-700">{selectedParticipant.medical.medicalConditions}</p>
                  </div>
                )}

                {/* Medications */}
                {selectedParticipant.medical.medications && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium flex items-center gap-2 mb-2 text-blue-800">
                      <Pill className="w-4 h-4" />
                      Medications
                    </h4>
                    <p className="text-blue-700">{selectedParticipant.medical.medications}</p>
                  </div>
                )}

                {/* Dietary Restrictions */}
                {selectedParticipant.medical.dietaryRestrictions && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium flex items-center gap-2 mb-2 text-green-800">
                      <Utensils className="w-4 h-4" />
                      Dietary Restrictions
                    </h4>
                    <p className="text-green-700">{selectedParticipant.medical.dietaryRestrictions}</p>
                  </div>
                )}

                {/* ADA Accommodations */}
                {selectedParticipant.medical.adaAccommodations && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <h4 className="font-medium flex items-center gap-2 mb-2 text-indigo-800">
                      <Accessibility className="w-4 h-4" />
                      ADA Accommodations
                    </h4>
                    <p className="text-indigo-700">{selectedParticipant.medical.adaAccommodations}</p>
                  </div>
                )}

                {/* Emergency Contacts */}
                <div>
                  <h4 className="font-medium flex items-center gap-2 mb-3 text-gray-800">
                    <Phone className="w-4 h-4 text-red-600" />
                    Emergency Contacts
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    {selectedParticipant.emergency.contact1Name && (
                      <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                        <p className="font-medium text-lg">{selectedParticipant.emergency.contact1Name}</p>
                        <p className="text-gray-500 text-sm">{selectedParticipant.emergency.contact1Relation}</p>
                        <a
                          href={`tel:${selectedParticipant.emergency.contact1Phone}`}
                          className="text-red-600 font-medium flex items-center gap-1 mt-2 text-lg"
                        >
                          <Phone className="w-4 h-4" />
                          {selectedParticipant.emergency.contact1Phone}
                        </a>
                      </div>
                    )}
                    {selectedParticipant.emergency.contact2Name && (
                      <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                        <p className="font-medium text-lg">{selectedParticipant.emergency.contact2Name}</p>
                        <p className="text-gray-500 text-sm">{selectedParticipant.emergency.contact2Relation}</p>
                        <a
                          href={`tel:${selectedParticipant.emergency.contact2Phone}`}
                          className="text-red-600 font-medium flex items-center gap-1 mt-2 text-lg"
                        >
                          <Phone className="w-4 h-4" />
                          {selectedParticipant.emergency.contact2Phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* QR Scanner Modal */}
      <Dialog open={showQRScanner} onOpenChange={setShowQRScanner}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <QrCode className="w-5 h-5" />
              Scan Participant QR Code
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-500 mb-4 text-center">
              Point the camera at the participant&apos;s name tag QR code
            </p>
            <QRScanner
              onScan={handleQRScan}
              onError={(err) => {
                console.error('QR Error:', err)
                toast.error('QR scanner error. Try searching manually.')
              }}
              onClose={() => setShowQRScanner(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
