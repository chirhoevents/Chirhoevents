'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Activity,
  Users,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Pill,
  Heart,
  Utensils,
  Accessibility,
  ArrowLeft,
  Stethoscope,
  ClipboardList,
  FileText,
  LayoutDashboard,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from '@/lib/toast'

// Import the dashboard components
import RaphaParticipants, { type RaphaParticipant } from '@/app/dashboard/admin/events/[eventId]/rapha/RaphaParticipants'
import RaphaIncidents from '@/app/dashboard/admin/events/[eventId]/rapha/RaphaIncidents'
import RaphaReports from '@/app/dashboard/admin/events/[eventId]/rapha/RaphaReports'

interface RaphaStats {
  totalParticipants: number
  severeAllergies: number
  allergies: number
  medications: number
  conditions: number
  dietaryRestrictions: number
  adaAccommodations: number
}

interface IncidentStats {
  active: number
  monitoring: number
  resolved: number
  total: number
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
  const eventId = params.eventId as string

  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [eventName, setEventName] = useState('')
  const [eventDates, setEventDates] = useState('')
  const [stats, setStats] = useState<RaphaStats | null>(null)
  const [incidentStats, setIncidentStats] = useState<IncidentStats>({ active: 0, monitoring: 0, resolved: 0, total: 0 })
  const [activeTab, setActiveTab] = useState('dashboard')
  const [error, setError] = useState('')

  // For incident creation from participants
  const [preSelectedParticipant, setPreSelectedParticipant] = useState<PreSelectedParticipant | null>(null)
  const [openNewIncidentModal, setOpenNewIncidentModal] = useState(false)

  useEffect(() => {
    checkAuthAndFetchData()
  }, [eventId])

  async function checkAuthAndFetchData() {
    try {
      setAuthChecking(true)

      // Check authorization - user must be admin, rapha_user, or rapha_coordinator
      const authResponse = await fetch('/api/admin/check-access')
      if (authResponse.ok) {
        const authData = await authResponse.json()
        setIsAdmin(true)
        setIsAuthorized(true)
      } else {
        // Check if they have rapha-specific role
        const raphaAuthResponse = await fetch(`/api/portal/rapha/check-access?eventId=${eventId}`)
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

      // Fetch event data and stats
      await fetchData()
    } catch (err) {
      console.error('Auth check failed:', err)
      setError('Failed to verify access')
      setAuthChecking(false)
      setLoading(false)
    }
  }

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
        if (data.incidentStats) {
          setIncidentStats(data.incidentStats)
        }
      } else {
        setError('Failed to load event data')
      }
    } catch (err) {
      setError('Failed to load event data')
    } finally {
      setLoading(false)
    }
  }

  async function fetchIncidentStats() {
    try {
      const response = await fetch(`/api/admin/events/${eventId}/rapha/incidents`)
      if (response.ok) {
        const data = await response.json()
        setIncidentStats(data.stats || { active: 0, monitoring: 0, resolved: 0, total: 0 })
      }
    } catch (err) {
      console.error('Failed to fetch incident stats:', err)
    }
  }

  function handleCreateIncident(participant: RaphaParticipant) {
    setPreSelectedParticipant({
      id: participant.id,
      participantId: participant.participantId,
      firstName: participant.firstName,
      lastName: participant.lastName,
      groupName: participant.groupName,
      allergies: participant.medical.allergies,
      hasSevereAllergy: participant.medical.hasSevereAllergy,
    })
    setOpenNewIncidentModal(true)
    setActiveTab('incidents')
  }

  function handleIncidentModalClose() {
    setPreSelectedParticipant(null)
    setOpenNewIncidentModal(false)
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
          {isAdmin && (
            <Link
              href="/dashboard/admin/rapha"
              className="flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
          )}
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
        {/* Stats Cards - Always visible */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
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
          <Card className={`${incidentStats.active > 0 ? 'border-red-300 bg-red-100' : 'border-gray-200'}`}>
            <CardContent className="pt-4 text-center">
              <Activity className="w-6 h-6 text-red-500 mx-auto mb-1" />
              <p className={`text-2xl font-bold ${incidentStats.active > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                {incidentStats.active}
              </p>
              <p className={`text-xs ${incidentStats.active > 0 ? 'text-red-600' : 'text-gray-500'}`}>Active</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different sections */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 h-14">
            <TabsTrigger value="dashboard" className="text-lg">
              <LayoutDashboard className="w-5 h-5 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="participants" className="text-lg">
              <Users className="w-5 h-5 mr-2" />
              Participants
            </TabsTrigger>
            <TabsTrigger value="incidents" className="text-lg relative">
              <ClipboardList className="w-5 h-5 mr-2" />
              Incidents
              {incidentStats.active > 0 && (
                <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs h-5 w-5 flex items-center justify-center p-0">
                  {incidentStats.active}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="reports" className="text-lg">
              <FileText className="w-5 h-5 mr-2" />
              Reports
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-red-600" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    className="w-full h-12 bg-red-600 hover:bg-red-700 text-lg"
                    onClick={() => {
                      setPreSelectedParticipant(null)
                      setOpenNewIncidentModal(true)
                      setActiveTab('incidents')
                    }}
                  >
                    <ClipboardList className="w-5 h-5 mr-2" />
                    Log New Incident
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full h-12 text-lg"
                    onClick={() => setActiveTab('participants')}
                  >
                    <Users className="w-5 h-5 mr-2" />
                    Search Participants
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full h-12 text-lg"
                    onClick={() => setActiveTab('reports')}
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    Generate Reports
                  </Button>
                </CardContent>
              </Card>

              {/* Incident Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-red-600" />
                    Incident Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div
                      className="p-4 bg-red-50 rounded-lg text-center cursor-pointer hover:bg-red-100 transition-colors"
                      onClick={() => setActiveTab('incidents')}
                    >
                      <p className="text-3xl font-bold text-red-600">{incidentStats.active}</p>
                      <p className="text-sm text-red-700">Active</p>
                    </div>
                    <div
                      className="p-4 bg-amber-50 rounded-lg text-center cursor-pointer hover:bg-amber-100 transition-colors"
                      onClick={() => setActiveTab('incidents')}
                    >
                      <p className="text-3xl font-bold text-amber-600">{incidentStats.monitoring}</p>
                      <p className="text-sm text-amber-700">Monitoring</p>
                    </div>
                    <div
                      className="p-4 bg-green-50 rounded-lg text-center cursor-pointer hover:bg-green-100 transition-colors"
                      onClick={() => setActiveTab('incidents')}
                    >
                      <p className="text-3xl font-bold text-green-600">{incidentStats.resolved}</p>
                      <p className="text-sm text-green-700">Resolved</p>
                    </div>
                  </div>
                  <p className="text-center text-sm text-gray-500 mt-4">
                    Total incidents this event: {incidentStats.total}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Critical Alerts */}
            {(stats?.severeAllergies || 0) > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="w-5 h-5" />
                    Critical Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-red-700">
                    <strong>{stats?.severeAllergies}</strong> participants have severe allergies requiring
                    immediate attention. Please review the participants list for detailed allergy information.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4 border-red-300 text-red-700 hover:bg-red-100"
                    onClick={() => setActiveTab('participants')}
                  >
                    View Severe Allergies
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Participants Tab */}
          <TabsContent value="participants">
            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-red-600" />
              </div>
            }>
              <RaphaParticipants
                eventId={eventId}
                onCreateIncident={handleCreateIncident}
              />
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
                onStatsChange={fetchIncidentStats}
                preSelectedParticipant={preSelectedParticipant}
                openNewIncidentModal={openNewIncidentModal}
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
              <RaphaReports
                eventId={eventId}
                eventName={eventName}
              />
            </Suspense>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
