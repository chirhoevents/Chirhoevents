'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
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
  Settings,
  ChevronRight,
  Phone,
  Utensils,
  Accessibility,
} from 'lucide-react'
import { toast } from '@/lib/toast'
import { format } from 'date-fns'

// Import sub-components
import RaphaParticipants, { RaphaParticipant } from './RaphaParticipants'
import RaphaIncidents from './RaphaIncidents'
import RaphaReports from './RaphaReports'

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

export default function RaphaPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const eventId = params.eventId as string
  const initialTab = searchParams.get('tab') || 'dashboard'

  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(initialTab)
  const [eventName, setEventName] = useState('')
  const [eventDates, setEventDates] = useState('')
  const [stats, setStats] = useState<RaphaStats | null>(null)
  const [upcomingFollowUps, setUpcomingFollowUps] = useState<FollowUp[]>([])

  // State for incident creation from participants
  const [incidentParticipant, setIncidentParticipant] = useState<RaphaParticipant | null>(null)
  const [openIncidentModal, setOpenIncidentModal] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [eventId])

  async function fetchDashboardData() {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/rapha/stats`)
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

  function handleQuickFilter(filter: string) {
    setActiveTab('participants')
    router.push(`/dashboard/admin/events/${eventId}/rapha?tab=participants&filter=${filter}`)
  }

  function handleCreateIncident(participant: RaphaParticipant) {
    setIncidentParticipant(participant)
    setOpenIncidentModal(true)
    setActiveTab('incidents')
  }

  function handleIncidentModalClose() {
    setOpenIncidentModal(false)
    setIncidentParticipant(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0077BE]" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/dashboard/admin" className="hover:text-[#0077BE]">
            Dashboard
          </Link>
          <span>/</span>
          <Link href="/dashboard/admin/events" className="hover:text-[#0077BE]">
            Events
          </Link>
          <span>/</span>
          <Link href={`/dashboard/admin/events/${eventId}`} className="hover:text-[#0077BE]">
            {eventName}
          </Link>
          <span>/</span>
          <span className="text-[#0077BE] font-medium">Rapha Medical</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#0077BE]/10 rounded-lg">
                <Stethoscope className="w-6 h-6 text-[#0077BE]" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-[#0077BE]">
                  Rapha Medical Platform
                </h1>
                <p className="text-muted-foreground">
                  {eventName} • {eventDates}
                </p>
              </div>
            </div>
          </div>
          <Button
            onClick={() => {
              setActiveTab('incidents')
              router.push(`/dashboard/admin/events/${eventId}/rapha?tab=incidents&action=new`)
            }}
            className="bg-[#0077BE] hover:bg-[#0077BE]/90 w-full md:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Incident
          </Button>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
        <p className="text-sm text-amber-800">
          <strong>CONFIDENTIAL MEDICAL INFORMATION</strong> - Access is logged for HIPAA compliance.
          Only authorized medical staff should view this information.
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white border shadow-sm p-1 h-auto flex-wrap">
          <TabsTrigger
            value="dashboard"
            className="data-[state=active]:bg-[#0077BE] data-[state=active]:text-white"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger
            value="participants"
            className="data-[state=active]:bg-[#0077BE] data-[state=active]:text-white"
          >
            <Users className="w-4 h-4 mr-2" />
            Participants
          </TabsTrigger>
          <TabsTrigger
            value="incidents"
            className="data-[state=active]:bg-[#0077BE] data-[state=active]:text-white relative"
          >
            <AlertCircle className="w-4 h-4 mr-2" />
            Incidents
            {stats && (stats.activeIncidents > 0 || stats.monitoringIncidents > 0) && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                {stats.activeIncidents + stats.monitoringIncidents}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="reports"
            className="data-[state=active]:bg-[#0077BE] data-[state=active]:text-white"
          >
            <FileText className="w-4 h-4 mr-2" />
            Reports
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Participants</p>
                    <p className="text-2xl font-bold text-[#0077BE]">
                      {stats?.totalParticipants || 0}
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-[#0077BE]/50" />
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

          <div className="grid md:grid-cols-2 gap-6">
            {/* Participants with Medical Needs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-[#0077BE]" />
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

            {/* Search Participants */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-[#0077BE]" />
                  Search Participants
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Search for participants by name, medical condition, allergy, or medication.
                </p>
                <Button
                  className="w-full bg-[#0077BE] hover:bg-[#0077BE]/90"
                  onClick={() => setActiveTab('participants')}
                >
                  <Search className="w-4 h-4 mr-2" />
                  Go to Participants Search
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Active Incidents & Follow-ups */}
          <div className="grid md:grid-cols-2 gap-6">
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
                            {followUp.incidentType} • {followUp.severity}
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
                            onClick={() => {
                              setActiveTab('incidents')
                              router.push(
                                `/dashboard/admin/events/${eventId}/rapha?tab=incidents&incident=${followUp.id}`
                              )
                            }}
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
                  <ClipboardList className="w-5 h-5 text-[#0077BE]" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full justify-start bg-[#0077BE] hover:bg-[#0077BE]/90"
                  onClick={() => {
                    setActiveTab('incidents')
                    router.push(`/dashboard/admin/events/${eventId}/rapha?tab=incidents&action=new`)
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Incident Report
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setActiveTab('reports')
                    router.push(
                      `/dashboard/admin/events/${eventId}/rapha?tab=reports&report=daily-summary`
                    )
                  }}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Print Daily Medical Summary
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setActiveTab('reports')
                    router.push(
                      `/dashboard/admin/events/${eventId}/rapha?tab=reports&report=allergy-list`
                    )
                  }}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Print Allergy List
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setActiveTab('reports')
                    router.push(
                      `/dashboard/admin/events/${eventId}/rapha?tab=reports&report=critical-list`
                    )
                  }}
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
          <RaphaParticipants eventId={eventId} onCreateIncident={handleCreateIncident} />
        </TabsContent>

        {/* Incidents Tab */}
        <TabsContent value="incidents">
          <RaphaIncidents
            eventId={eventId}
            onStatsChange={fetchDashboardData}
            preSelectedParticipant={incidentParticipant ? {
              id: incidentParticipant.id,
              participantId: incidentParticipant.participantId,
              firstName: incidentParticipant.firstName,
              lastName: incidentParticipant.lastName,
              groupName: incidentParticipant.groupName,
              allergies: incidentParticipant.medical.allergies,
              hasSevereAllergy: incidentParticipant.medical.hasSevereAllergy,
            } : null}
            openNewIncidentModal={openIncidentModal}
            onModalClose={handleIncidentModalClose}
          />
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <RaphaReports eventId={eventId} eventName={eventName} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
