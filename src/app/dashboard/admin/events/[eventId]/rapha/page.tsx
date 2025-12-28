'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
  Pill,
  Stethoscope,
  Thermometer,
  Heart,
} from 'lucide-react'
import { toast } from '@/lib/toast'
import { format } from 'date-fns'

interface MedicalIncident {
  id: string
  participantId: string
  participantName: string
  groupName: string
  incidentType: string
  severity: 'minor' | 'moderate' | 'severe'
  description: string
  treatment: string
  staffName: string
  createdAt: string
  resolvedAt: string | null
}

interface Participant {
  id: string
  firstName: string
  lastName: string
  age: number
  groupName: string
  medicalNotes: string | null
  allergies: string | null
}

export default function RaphaMedicalPage() {
  const params = useParams()
  const eventId = params.eventId as string

  const [loading, setLoading] = useState(true)
  const [eventName, setEventName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [incidents, setIncidents] = useState<MedicalIncident[]>([])
  const [stats, setStats] = useState({
    totalIncidents: 0,
    activeIncidents: 0,
    resolvedIncidents: 0,
    participantsWithMedicalInfo: 0,
  })

  // New incident modal
  const [isNewIncidentModalOpen, setIsNewIncidentModalOpen] = useState(false)
  const [searchingParticipant, setSearchingParticipant] = useState(false)
  const [participantResults, setParticipantResults] = useState<Participant[]>([])
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null)
  const [newIncident, setNewIncident] = useState({
    incidentType: '',
    severity: 'minor' as 'minor' | 'moderate' | 'severe',
    description: '',
    treatment: '',
    staffName: '',
  })
  const [savingIncident, setSavingIncident] = useState(false)

  useEffect(() => {
    fetchData()
  }, [eventId])

  async function fetchData() {
    setLoading(true)
    try {
      const [eventRes, incidentsRes] = await Promise.all([
        fetch(`/api/admin/events/${eventId}`),
        fetch(`/api/admin/events/${eventId}/rapha/incidents`),
      ])

      if (eventRes.ok) {
        const data = await eventRes.json()
        setEventName(data.name || 'Event')
      }

      if (incidentsRes.ok) {
        const data = await incidentsRes.json()
        setIncidents(data.incidents || [])
        setStats(data.stats || {
          totalIncidents: 0,
          activeIncidents: 0,
          resolvedIncidents: 0,
          participantsWithMedicalInfo: 0,
        })
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function searchParticipants(query: string) {
    if (!query.trim()) {
      setParticipantResults([])
      return
    }

    setSearchingParticipant(true)
    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/participants/search?q=${encodeURIComponent(query)}`
      )
      if (response.ok) {
        const data = await response.json()
        setParticipantResults(data.participants || [])
      }
    } catch (error) {
      console.error('Failed to search participants:', error)
    } finally {
      setSearchingParticipant(false)
    }
  }

  async function handleCreateIncident() {
    if (!selectedParticipant) {
      toast.error('Please select a participant')
      return
    }
    if (!newIncident.incidentType) {
      toast.error('Please select an incident type')
      return
    }
    if (!newIncident.description.trim()) {
      toast.error('Please provide a description')
      return
    }
    if (!newIncident.staffName.trim()) {
      toast.error('Please enter staff name')
      return
    }

    setSavingIncident(true)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/rapha/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: selectedParticipant.id,
          ...newIncident,
        }),
      })

      if (response.ok) {
        toast.success('Medical incident recorded')
        setIsNewIncidentModalOpen(false)
        resetNewIncidentForm()
        fetchData()
      } else {
        throw new Error('Failed to create incident')
      }
    } catch (error) {
      toast.error('Failed to record incident')
    } finally {
      setSavingIncident(false)
    }
  }

  function resetNewIncidentForm() {
    setSelectedParticipant(null)
    setParticipantResults([])
    setSearchQuery('')
    setNewIncident({
      incidentType: '',
      severity: 'minor',
      description: '',
      treatment: '',
      staffName: '',
    })
  }

  async function handleResolveIncident(incidentId: string) {
    try {
      const response = await fetch(`/api/admin/events/${eventId}/rapha/incidents/${incidentId}/resolve`, {
        method: 'POST',
      })

      if (response.ok) {
        toast.success('Incident marked as resolved')
        fetchData()
      } else {
        throw new Error('Failed to resolve incident')
      }
    } catch (error) {
      toast.error('Failed to resolve incident')
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'minor': return 'bg-green-100 text-green-800'
      case 'moderate': return 'bg-yellow-100 text-yellow-800'
      case 'severe': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-navy" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/dashboard/admin" className="hover:text-navy">Dashboard</Link>
          <span>/</span>
          <Link href="/dashboard/admin/events" className="hover:text-navy">Events</Link>
          <span>/</span>
          <Link href={`/dashboard/admin/events/${eventId}`} className="hover:text-navy">{eventName}</Link>
          <span>/</span>
          <span className="text-navy font-medium">Rapha Medical</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-navy">Rapha Medical Portal</h1>
            <p className="text-muted-foreground">{eventName} - Medical Incident Tracking</p>
          </div>
          <Button
            onClick={() => setIsNewIncidentModalOpen(true)}
            className="bg-navy hover:bg-navy/90 w-full md:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Record Incident
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Total Incidents</p>
                <p className="text-xl md:text-2xl font-bold text-navy">{stats.totalIncidents || 0}</p>
              </div>
              <FileText className="w-6 h-6 md:w-8 md:h-8 text-navy/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-amber-700">Active</p>
                <p className="text-xl md:text-2xl font-bold text-amber-600">{stats.activeIncidents || 0}</p>
              </div>
              <AlertCircle className="w-6 h-6 md:w-8 md:h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-green-700">Resolved</p>
                <p className="text-xl md:text-2xl font-bold text-green-600">{stats.resolvedIncidents || 0}</p>
              </div>
              <Heart className="w-6 h-6 md:w-8 md:h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">w/ Medical Info</p>
                <p className="text-xl md:text-2xl font-bold text-navy">{stats.participantsWithMedicalInfo || 0}</p>
              </div>
              <Stethoscope className="w-6 h-6 md:w-8 md:h-8 text-navy/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Incidents */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Incidents</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <BarChart3 className="w-4 h-4 mr-2" />
              Reports
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {incidents.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-muted-foreground mb-4">No medical incidents recorded yet</p>
              <Button onClick={() => setIsNewIncidentModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Record First Incident
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {incidents.map((incident) => (
                  <div
                    key={incident.id}
                    className={`p-4 rounded-lg border ${
                      incident.resolvedAt ? 'bg-gray-50 border-gray-200' : 'bg-white border-amber-200'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-medium text-navy">{incident.participantName}</span>
                          <Badge variant="outline" className="text-xs">{incident.groupName}</Badge>
                          <Badge className={getSeverityColor(incident.severity)}>
                            {incident.severity}
                          </Badge>
                          {incident.resolvedAt && (
                            <Badge className="bg-green-500">Resolved</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          <strong>{incident.incidentType}</strong> - {incident.description}
                        </p>
                        {incident.treatment && (
                          <p className="text-sm text-navy">
                            <Pill className="w-3 h-3 inline mr-1" />
                            Treatment: {incident.treatment}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {format(new Date(incident.createdAt), 'MMM d, yyyy h:mm a')} - Staff: {incident.staffName}
                        </p>
                      </div>
                      {!incident.resolvedAt && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResolveIncident(incident.id)}
                          className="w-full md:w-auto"
                        >
                          Mark Resolved
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* New Incident Modal */}
      <Dialog open={isNewIncidentModalOpen} onOpenChange={setIsNewIncidentModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Medical Incident</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Participant Search */}
            <div className="space-y-2">
              <Label>Search Participant</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    searchParticipants(e.target.value)
                  }}
                  className="pl-10"
                />
              </div>
              {searchingParticipant && (
                <div className="text-sm text-muted-foreground">Searching...</div>
              )}
              {participantResults.length > 0 && !selectedParticipant && (
                <div className="border rounded-lg max-h-40 overflow-y-auto">
                  {participantResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedParticipant(p)
                        setSearchQuery(`${p.firstName} ${p.lastName}`)
                        setParticipantResults([])
                      }}
                      className="w-full text-left p-2 hover:bg-gray-50 border-b last:border-b-0"
                    >
                      <div className="font-medium">{p.firstName} {p.lastName}</div>
                      <div className="text-xs text-muted-foreground">{p.groupName} - Age {p.age}</div>
                    </button>
                  ))}
                </div>
              )}
              {selectedParticipant && (
                <div className="p-3 bg-navy/5 rounded-lg">
                  <div className="font-medium">{selectedParticipant.firstName} {selectedParticipant.lastName}</div>
                  <div className="text-sm text-muted-foreground">{selectedParticipant.groupName}</div>
                  {selectedParticipant.allergies && (
                    <div className="text-sm text-red-600 mt-1">
                      <AlertCircle className="w-3 h-3 inline mr-1" />
                      Allergies: {selectedParticipant.allergies}
                    </div>
                  )}
                  {selectedParticipant.medicalNotes && (
                    <div className="text-sm text-amber-600 mt-1">
                      Medical Notes: {selectedParticipant.medicalNotes}
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedParticipant(null)
                      setSearchQuery('')
                    }}
                    className="mt-2"
                  >
                    Change Participant
                  </Button>
                </div>
              )}
            </div>

            {/* Incident Type */}
            <div className="space-y-2">
              <Label>Incident Type</Label>
              <Select
                value={newIncident.incidentType}
                onValueChange={(value) => setNewIncident({ ...newIncident, incidentType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="headache">Headache</SelectItem>
                  <SelectItem value="nausea">Nausea / Vomiting</SelectItem>
                  <SelectItem value="allergic_reaction">Allergic Reaction</SelectItem>
                  <SelectItem value="injury">Injury / Sprain</SelectItem>
                  <SelectItem value="fever">Fever</SelectItem>
                  <SelectItem value="dehydration">Dehydration</SelectItem>
                  <SelectItem value="stomach_ache">Stomach Ache</SelectItem>
                  <SelectItem value="anxiety">Anxiety / Panic</SelectItem>
                  <SelectItem value="homesick">Homesick</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Severity */}
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select
                value={newIncident.severity}
                onValueChange={(value: 'minor' | 'moderate' | 'severe') =>
                  setNewIncident({ ...newIncident, severity: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minor">Minor - First aid only</SelectItem>
                  <SelectItem value="moderate">Moderate - Requires monitoring</SelectItem>
                  <SelectItem value="severe">Severe - May need outside care</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe the incident and symptoms..."
                value={newIncident.description}
                onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
                rows={3}
              />
            </div>

            {/* Treatment */}
            <div className="space-y-2">
              <Label>Treatment Provided</Label>
              <Textarea
                placeholder="Describe treatment given (medications, first aid, etc.)..."
                value={newIncident.treatment}
                onChange={(e) => setNewIncident({ ...newIncident, treatment: e.target.value })}
                rows={2}
              />
            </div>

            {/* Staff Name */}
            <div className="space-y-2">
              <Label>Staff Name</Label>
              <Input
                placeholder="Your name..."
                value={newIncident.staffName}
                onChange={(e) => setNewIncident({ ...newIncident, staffName: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsNewIncidentModalOpen(false)
                resetNewIncidentForm()
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateIncident}
              disabled={savingIncident}
            >
              {savingIncident && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Record Incident
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
