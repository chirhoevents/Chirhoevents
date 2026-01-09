'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Activity,
  Search,
  Users,
  Loader2,
  Plus,
  AlertCircle,
  Clock,
  FileText,
  BarChart3,
  Stethoscope,
  Heart,
  AlertTriangle,
  Pill,
  ClipboardList,
  ChevronRight,
  Utensils,
  Accessibility,
  ArrowLeft,
  QrCode,
  Phone,
  User,
  X,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from '@/lib/toast'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// Import sub-components from admin dashboard
import RaphaParticipants, { type RaphaParticipant } from '@/app/dashboard/admin/events/[eventId]/rapha/RaphaParticipants'
import RaphaIncidents from '@/app/dashboard/admin/events/[eventId]/rapha/RaphaIncidents'
import RaphaReports from '@/app/dashboard/admin/events/[eventId]/rapha/RaphaReports'
import { RaphaQRScanner } from '@/components/rapha/RaphaQRScanner'

interface RaphaStats {
  totalParticipants: number
  participantsWithMedicalNeeds: number
  severeAllergies: number
  allergies: number
  medications: number
  conditions: number
  dietaryRestrictions: number
  adaAccommodations: number
  activeIncidents: number
  monitoringIncidents: number
  resolvedTodayIncidents: number
  totalIncidents: number
}

interface FollowUp {
  id: string
  participantId: string
  participantName: string
  nextCheckTime: string
  incidentType: string
  severity: string
}

interface PreSelectedParticipant {
  id: string
  participantId: string | null
  firstName: string
  lastName: string
  groupName: string
  allergies?: string | null
  hasSevereAllergy?: boolean
}

export default function RaphaDedicatedPortal() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { getToken } = useAuth()
  const eventId = params.eventId as string
  const initialTab = searchParams.get('tab') || 'dashboard'

  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeTab, setActiveTab] = useState(initialTab)
  const [eventName, setEventName] = useState('')
  const [eventDates, setEventDates] = useState('')
  const [stats, setStats] = useState<RaphaStats | null>(null)
  const [upcomingFollowUps, setUpcomingFollowUps] = useState<FollowUp[]>([])
  const [quickSearch, setQuickSearch] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')

  // State for incident creation from participants
  const [incidentParticipant, setIncidentParticipant] = useState<PreSelectedParticipant | null>(null)
  const [openIncidentModal, setOpenIncidentModal] = useState(false)
  const [selectedSearchParticipant, setSelectedSearchParticipant] = useState<string>('')

  // QR Scanner state
  const [qrScannerOpen, setQrScannerOpen] = useState(false)
  const [scannedParticipant, setScannedParticipant] = useState<any>(null)
  const [scanLoading, setScanLoading] = useState(false)

  useEffect(() => {
    checkAuthAndFetchData()
  }, [eventId])

  async function checkAuthAndFetchData() {
    try {
      setAuthChecking(true)
      const token = await getToken()
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}

      // Check authorization - user must be admin, rapha_user, or rapha_coordinator
      const authResponse = await fetch('/api/admin/check-access', { headers })
      if (authResponse.ok) {
        setIsAdmin(true)
        setIsAuthorized(true)
      } else {
        // Check if they have rapha-specific role
        const raphaAuthResponse = await fetch(`/api/portal/rapha/check-access?eventId=${eventId}`, { headers })
        if (raphaAuthResponse.ok) {
          const raphaData = await raphaAuthResponse.json()
          setIsAuthorized(true)
          setIsAdmin(raphaData.isAdmin || false)
        } else {
          setIsAuthorized(false)
          setError('You do not have permission to access this portal')
          setLoading(false)
          setAuthChecking(false)
          return
        }
      }

      setAuthChecking(false)
      await fetchDashboardData()
    } catch (err) {
      console.error('Auth check failed:', err)
      setError('Failed to verify access')
      setAuthChecking(false)
      setLoading(false)
    }
  }

  async function fetchDashboardData() {
    setLoading(true)
    try {
      const token = await getToken()
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      const response = await fetch(`/api/admin/events/${eventId}/rapha/stats`, { headers })
      if (response.ok) {
        const data = await response.json()
        setEventName(data.event.name)
        setEventDates(
          `${format(new Date(data.event.startDate), 'MMM d')} - ${format(new Date(data.event.endDate), 'MMM d, yyyy')}`
        )
        setStats(data.stats)
        setUpcomingFollowUps(data.upcomingFollowUps || [])
      } else {
        toast.error('Failed to load Rapha data')
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error('Failed to load Rapha data')
    } finally {
      setLoading(false)
    }
  }

  async function handleQuickSearch(query: string) {
    setQuickSearch(query)
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const token = await getToken()
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      const response = await fetch(
        `/api/admin/events/${eventId}/rapha/participants/search?q=${encodeURIComponent(query)}`,
        { headers }
      )
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.participants || [])
      }
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setSearching(false)
    }
  }

  function handleQuickFilter(filter: string) {
    setActiveTab('participants')
  }

  function handleCreateIncident(participant: RaphaParticipant) {
    setIncidentParticipant({
      id: participant.id,
      participantId: participant.participantId,
      firstName: participant.firstName,
      lastName: participant.lastName,
      groupName: participant.groupName,
      allergies: participant.medical.allergies,
      hasSevereAllergy: participant.medical.hasSevereAllergy,
    })
    setOpenIncidentModal(true)
    setActiveTab('incidents')
  }

  function handleIncidentModalClose() {
    setOpenIncidentModal(false)
    setIncidentParticipant(null)
  }

  // Handle QR code scan
  async function handleQrScan(qrData: string) {
    setScanLoading(true)
    try {
      const token = await getToken()
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      const response = await fetch(
        `/api/admin/events/${eventId}/rapha/lookup?qrCode=${encodeURIComponent(qrData)}`,
        { headers }
      )

      if (response.ok) {
        const data = await response.json()
        setScannedParticipant(data)
        toast.success(`Found: ${data.participant.firstName} ${data.participant.lastName}`)
      } else {
        const errorData = await response.json()
        toast.error(errorData.message || 'Participant not found')
        setScannedParticipant(null)
      }
    } catch (err) {
      console.error('QR lookup error:', err)
      toast.error('Failed to look up participant')
      setScannedParticipant(null)
    } finally {
      setScanLoading(false)
    }
  }

  function handleCloseScannedParticipant() {
    setScannedParticipant(null)
  }

  function handleCreateIncidentFromScan() {
    if (!scannedParticipant) return

    setIncidentParticipant({
      id: scannedParticipant.participant.id,
      participantId: scannedParticipant.participant.id,
      firstName: scannedParticipant.participant.firstName,
      lastName: scannedParticipant.participant.lastName,
      groupName: scannedParticipant.participant.groupName,
      allergies: scannedParticipant.medical.allergies,
      hasSevereAllergy: scannedParticipant.medical.hasSevereAllergy,
    })
    setOpenIncidentModal(true)
    setActiveTab('incidents')
    setScannedParticipant(null)
  }

  if (loading || authChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">
            {authChecking ? 'Verifying access...' : 'Loading Rapha Medical Portal...'}
          </p>
        </div>
      </div>
    )
  }

  if (!isAuthorized || error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">
              {error || 'You do not have permission to access the Rapha Medical Portal.'}
            </p>
            <Link href="/dashboard/admin">
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
      <header className="bg-red-600 text-white py-3 px-4 shadow-lg sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <Stethoscope className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Rapha Medical Platform</h1>
              <p className="text-xs text-white/80">{eventName} &bull; {eventDates}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setIncidentParticipant(null)
                setOpenIncidentModal(true)
                setActiveTab('incidents')
              }}
              size="sm"
              className="bg-white text-red-600 hover:bg-white/90"
            >
              <Plus className="w-4 h-4 mr-1" />
              New Incident
            </Button>
            {isAdmin && (
              <Link href="/dashboard/admin/rapha">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Dashboard
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Privacy Notice */}
      <div className="bg-amber-50 border-b border-amber-200 py-2 px-4">
        <div className="max-w-[1600px] mx-auto flex items-center gap-2 text-amber-800 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span><strong>CONFIDENTIAL MEDICAL INFORMATION</strong> - Access is logged for HIPAA compliance.</span>
        </div>
      </div>

      {/* Main Content */}
      <main className="p-4 md:p-6 max-w-[1600px] mx-auto">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-white border shadow-sm p-1 h-auto flex-wrap">
            <TabsTrigger
              value="dashboard"
              className="data-[state=active]:bg-red-600 data-[state=active]:text-white"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger
              value="participants"
              className="data-[state=active]:bg-red-600 data-[state=active]:text-white"
            >
              <Users className="w-4 h-4 mr-2" />
              Participants
            </TabsTrigger>
            <TabsTrigger
              value="incidents"
              className="data-[state=active]:bg-red-600 data-[state=active]:text-white relative"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              Incidents
              {stats && ((stats.activeIncidents || 0) > 0 || (stats.monitoringIncidents || 0) > 0) && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                  {(stats.activeIncidents || 0) + (stats.monitoringIncidents || 0)}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              className="data-[state=active]:bg-red-600 data-[state=active]:text-white"
            >
              <FileText className="w-4 h-4 mr-2" />
              Reports
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Participants</p>
                      <p className="text-2xl font-bold text-red-600">
                        {stats?.totalParticipants || 0}
                      </p>
                    </div>
                    <Users className="w-8 h-8 text-red-600/50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-red-700">Severe Allergies</p>
                      <p className="text-2xl font-bold text-red-600">
                        {stats?.severeAllergies || 0}
                      </p>
                      <p className="text-xs text-red-500">EpiPen required</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-amber-700">Active Incidents</p>
                      <p className="text-2xl font-bold text-amber-600">
                        {(stats?.activeIncidents || 0) + (stats?.monitoringIncidents || 0)}
                      </p>
                      <p className="text-xs text-amber-500">
                        {stats?.monitoringIncidents || 0} monitoring
                      </p>
                    </div>
                    <AlertCircle className="w-8 h-8 text-amber-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-green-700">Resolved Today</p>
                      <p className="text-2xl font-bold text-green-600">
                        {stats?.resolvedTodayIncidents || 0}
                      </p>
                      <p className="text-xs text-green-500">
                        {stats?.totalIncidents || 0} total
                      </p>
                    </div>
                    <Heart className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Participants with Medical Needs */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-red-600" />
                    Participants with Medical Needs
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <button
                    onClick={() => handleQuickFilter('severe')}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span>Severe Allergies (EpiPen)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-red-600">{stats?.severeAllergies || 0}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </button>

                  <button
                    onClick={() => handleQuickFilter('allergies')}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-amber-500" />
                      <span>Allergies</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{stats?.allergies || 0}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </button>

                  <button
                    onClick={() => handleQuickFilter('medications')}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Pill className="w-4 h-4 text-blue-500" />
                      <span>Daily Medications</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{stats?.medications || 0}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </button>

                  <button
                    onClick={() => handleQuickFilter('conditions')}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Activity className="w-4 h-4 text-purple-500" />
                      <span>Medical Conditions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{stats?.conditions || 0}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </button>

                  <button
                    onClick={() => handleQuickFilter('dietary')}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Utensils className="w-4 h-4 text-green-500" />
                      <span>Dietary Restrictions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{stats?.dietaryRestrictions || 0}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </button>

                  <button
                    onClick={() => handleQuickFilter('ada')}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Accessibility className="w-4 h-4 text-indigo-500" />
                      <span>ADA/Special Needs</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{stats?.adaAccommodations || 0}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </button>

                  <Button
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => handleQuickFilter('medical')}
                  >
                    View All Medical Info
                  </Button>
                </CardContent>
              </Card>

              {/* Quick Search */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="w-5 h-5 text-red-600" />
                    Emergency Quick Search
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, condition, allergy..."
                      value={quickSearch}
                      onChange={(e) => handleQuickSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {searching && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Searching...
                    </div>
                  )}

                  {searchResults.length > 0 && (
                    <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
                      {searchResults.map((p) => (
                        <div
                          key={p.id}
                          className="p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => {
                            setQuickSearch('')
                            setSearchResults([])
                            setSelectedSearchParticipant(`${p.firstName} ${p.lastName}`)
                            setActiveTab('participants')
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {p.firstName} {p.lastName}
                                </span>
                                {p.hasSevereAllergy && (
                                  <Badge className="bg-red-500 text-xs">SEVERE</Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {p.groupName} &bull; Age {p.age}
                              </div>
                              {(p.allergies || p.medicalConditions) && (
                                <div className="mt-1 text-xs text-amber-600">
                                  {p.allergies && <span>Allergies: {p.allergies}</span>}
                                  {p.medicalConditions && (
                                    <span className="ml-2">Conditions: {p.medicalConditions}</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground mt-1" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground font-medium">Common Searches:</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: 'Peanut', query: 'peanut' },
                        { label: 'Tree Nuts', query: 'tree nut' },
                        { label: 'Gluten', query: 'gluten' },
                        { label: 'Diabetes', query: 'diabetes' },
                        { label: 'Asthma', query: 'asthma' },
                        { label: 'Seizures', query: 'seizure' },
                      ].map((item) => (
                        <Button
                          key={item.query}
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickSearch(item.query)}
                        >
                          {item.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Active Incidents & Follow-ups */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Upcoming Follow-ups */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-500" />
                    Upcoming Follow-ups
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {upcomingFollowUps.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      No scheduled follow-ups
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {upcomingFollowUps.map((followUp) => (
                        <div
                          key={followUp.id}
                          className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg"
                        >
                          <div>
                            <div className="font-medium">{followUp.participantName}</div>
                            <div className="text-sm text-muted-foreground">
                              {followUp.incidentType} &bull; {followUp.severity}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-amber-600">
                              {followUp.nextCheckTime
                                ? format(new Date(followUp.nextCheckTime), 'h:mm a')
                                : 'TBD'}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setActiveTab('incidents')}
                            >
                              View
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-red-600" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    className="w-full justify-start bg-red-600 hover:bg-red-700"
                    onClick={() => setQrScannerOpen(true)}
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Scan Participant QR Code
                  </Button>

                  <Button
                    className="w-full justify-start"
                    variant="secondary"
                    onClick={() => {
                      setIncidentParticipant(null)
                      setOpenIncidentModal(true)
                      setActiveTab('incidents')
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Incident Report
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setActiveTab('reports')}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Print Daily Medical Summary
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setActiveTab('reports')}
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Print Allergy List
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setActiveTab('reports')}
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Print Critical Participants
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Participants Tab */}
          <TabsContent value="participants">
            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-red-600" />
              </div>
            }>
              <RaphaParticipants eventId={eventId} onCreateIncident={handleCreateIncident} initialSearch={selectedSearchParticipant} />
            </Suspense>
          </TabsContent>

          {/* Incidents Tab */}
          <TabsContent value="incidents">
            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-red-600" />
              </div>
            }>
              <RaphaIncidents
                eventId={eventId}
                onStatsChange={fetchDashboardData}
                preSelectedParticipant={incidentParticipant}
                openNewIncidentModal={openIncidentModal}
                onModalClose={handleIncidentModalClose}
              />
            </Suspense>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-red-600" />
              </div>
            }>
              <RaphaReports eventId={eventId} eventName={eventName} />
            </Suspense>
          </TabsContent>
        </Tabs>
      </main>

      {/* QR Scanner */}
      <RaphaQRScanner
        open={qrScannerOpen}
        onOpenChange={setQrScannerOpen}
        onScan={handleQrScan}
      />

      {/* Scanned Participant Details Modal */}
      <Dialog open={!!scannedParticipant} onOpenChange={(open) => !open && handleCloseScannedParticipant()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <User className="w-5 h-5 text-red-600" />
                {scannedParticipant?.participant.firstName} {scannedParticipant?.participant.lastName}
              </span>
              {scannedParticipant?.medical.hasSevereAllergy && (
                <Badge className="bg-red-500">SEVERE ALLERGY</Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {scannedParticipant && (
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Age:</span>
                    <span className="ml-2 font-medium">{scannedParticipant.participant.age}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Gender:</span>
                    <span className="ml-2 font-medium capitalize">{scannedParticipant.participant.gender}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Group:</span>
                    <span className="ml-2 font-medium">{scannedParticipant.participant.groupName}</span>
                  </div>
                  {scannedParticipant.participant.diocese && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Diocese:</span>
                      <span className="ml-2 font-medium">{scannedParticipant.participant.diocese}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Medical Information */}
              <div className="space-y-3">
                <h3 className="font-semibold text-red-600 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4" />
                  Medical Information
                </h3>

                {scannedParticipant.medical.allergies && (
                  <div className={`p-3 rounded-lg ${scannedParticipant.medical.hasSevereAllergy ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}>
                    <div className="flex items-start gap-2">
                      <AlertTriangle className={`w-4 h-4 mt-0.5 ${scannedParticipant.medical.hasSevereAllergy ? 'text-red-500' : 'text-amber-500'}`} />
                      <div>
                        <strong className={scannedParticipant.medical.hasSevereAllergy ? 'text-red-700' : 'text-amber-700'}>Allergies:</strong>
                        <p className={`text-sm ${scannedParticipant.medical.hasSevereAllergy ? 'text-red-600' : 'text-amber-600'}`}>{scannedParticipant.medical.allergies}</p>
                      </div>
                    </div>
                  </div>
                )}

                {scannedParticipant.medical.medicalConditions && (
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="flex items-start gap-2">
                      <Activity className="w-4 h-4 mt-0.5 text-blue-500" />
                      <div>
                        <strong className="text-blue-700">Medical Conditions:</strong>
                        <p className="text-sm text-blue-600">{scannedParticipant.medical.medicalConditions}</p>
                      </div>
                    </div>
                  </div>
                )}

                {scannedParticipant.medical.medications && (
                  <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                    <div className="flex items-start gap-2">
                      <Pill className="w-4 h-4 mt-0.5 text-purple-500" />
                      <div>
                        <strong className="text-purple-700">Medications:</strong>
                        <p className="text-sm text-purple-600">{scannedParticipant.medical.medications}</p>
                      </div>
                    </div>
                  </div>
                )}

                {scannedParticipant.medical.dietaryRestrictions && (
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                    <div className="flex items-start gap-2">
                      <Utensils className="w-4 h-4 mt-0.5 text-green-500" />
                      <div>
                        <strong className="text-green-700">Dietary Restrictions:</strong>
                        <p className="text-sm text-green-600">{scannedParticipant.medical.dietaryRestrictions}</p>
                      </div>
                    </div>
                  </div>
                )}

                {scannedParticipant.medical.adaAccommodations && (
                  <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200">
                    <div className="flex items-start gap-2">
                      <Accessibility className="w-4 h-4 mt-0.5 text-indigo-500" />
                      <div>
                        <strong className="text-indigo-700">ADA/Special Needs:</strong>
                        <p className="text-sm text-indigo-600">{scannedParticipant.medical.adaAccommodations}</p>
                      </div>
                    </div>
                  </div>
                )}

                {!scannedParticipant.medical.allergies &&
                 !scannedParticipant.medical.medicalConditions &&
                 !scannedParticipant.medical.medications &&
                 !scannedParticipant.medical.dietaryRestrictions &&
                 !scannedParticipant.medical.adaAccommodations && (
                  <p className="text-muted-foreground text-sm italic">No medical information on file.</p>
                )}
              </div>

              {/* Insurance Information */}
              {scannedParticipant.medical.insuranceProvider && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-700">Insurance Information</h3>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    <div><strong>Provider:</strong> {scannedParticipant.medical.insuranceProvider}</div>
                    {scannedParticipant.medical.insurancePolicyNumber && (
                      <div><strong>Policy #:</strong> {scannedParticipant.medical.insurancePolicyNumber}</div>
                    )}
                    {scannedParticipant.medical.insuranceGroupNumber && (
                      <div><strong>Group #:</strong> {scannedParticipant.medical.insuranceGroupNumber}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Emergency Contacts */}
              {scannedParticipant.emergencyContacts && scannedParticipant.emergencyContacts.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Emergency Contacts
                  </h3>
                  <div className="space-y-2">
                    {scannedParticipant.emergencyContacts.map((contact: any, idx: number) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-3 text-sm flex items-center justify-between">
                        <div>
                          <div className="font-medium">{contact.name}</div>
                          <div className="text-muted-foreground">{contact.relation}</div>
                        </div>
                        <a
                          href={`tel:${contact.phone}`}
                          className="text-red-600 font-medium hover:underline"
                        >
                          {contact.phone}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Group Leader Contact */}
              {scannedParticipant.participant.groupLeader && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-700">Group Leader</h3>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm flex items-center justify-between">
                    <div className="font-medium">{scannedParticipant.participant.groupLeader.name}</div>
                    {scannedParticipant.participant.groupLeader.phone && (
                      <a
                        href={`tel:${scannedParticipant.participant.groupLeader.phone}`}
                        className="text-red-600 font-medium hover:underline"
                      >
                        {scannedParticipant.participant.groupLeader.phone}
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Recent Incidents */}
              {scannedParticipant.recentIncidents && scannedParticipant.recentIncidents.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-amber-600 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Recent Incidents ({scannedParticipant.recentIncidents.length})
                  </h3>
                  <div className="space-y-2">
                    {scannedParticipant.recentIncidents.map((incident: any) => (
                      <div key={incident.id} className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{incident.type}</span>
                          <Badge variant={incident.status === 'resolved' ? 'outline' : 'default'}>
                            {incident.status}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {incident.description?.substring(0, 100)}...
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  onClick={handleCreateIncidentFromScan}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Incident
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setQrScannerOpen(true)}
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  Scan Another
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
