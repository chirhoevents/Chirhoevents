'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  Loader2,
  Plus,
  AlertCircle,
  Clock,
  CheckCircle,
  AlertTriangle,
  Phone,
  Ambulance,
  Building2,
  Edit,
  Eye,
  MessageSquare,
} from 'lucide-react'
import { toast } from '@/lib/toast'
import { format } from 'date-fns'

interface Incident {
  id: string
  participantId: string | null
  participantName: string
  groupName: string
  type: string
  severity: 'minor' | 'moderate' | 'severe'
  status: 'active' | 'monitoring' | 'resolved'
  date: string
  time: string
  location: string | null
  description: string
  treatment: string
  staffName: string
  parentContacted: boolean
  parentContactTime: string | null
  ambulanceCalled: boolean
  sentToHospital: boolean
  hospitalName: string | null
  disposition: string | null
  followUpRequired: boolean
  nextCheckTime: string | null
  resolvedAt: string | null
  resolutionNotes: string | null
  recentUpdates: any[]
  createdAt: string
  updatedAt: string
}

interface RaphaIncidentsProps {
  eventId: string
  onStatsChange?: () => void
}

export default function RaphaIncidents({ eventId, onStatsChange }: RaphaIncidentsProps) {
  const searchParams = useSearchParams()
  const showNewModal = searchParams.get('action') === 'new'
  const viewIncidentId = searchParams.get('incident')

  const [loading, setLoading] = useState(true)
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [stats, setStats] = useState({ active: 0, monitoring: 0, resolved: 0, total: 0 })
  const [statusFilter, setStatusFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')

  // New incident modal
  const [showNewIncidentModal, setShowNewIncidentModal] = useState(showNewModal)
  const [searchingParticipant, setSearchingParticipant] = useState(false)
  const [participantQuery, setParticipantQuery] = useState('')
  const [participantResults, setParticipantResults] = useState<any[]>([])
  const [selectedParticipant, setSelectedParticipant] = useState<any>(null)
  const [savingIncident, setSavingIncident] = useState(false)
  const [newIncident, setNewIncident] = useState({
    incidentType: '',
    severity: 'minor' as 'minor' | 'moderate' | 'severe',
    location: '',
    description: '',
    treatmentProvided: '',
    staffMemberName: '',
    parentContacted: false,
    parentContactMethod: '',
    parentContactNotes: '',
    ambulanceCalled: false,
    sentToHospital: false,
    hospitalName: '',
    participantDisposition: '',
    followUpRequired: false,
    followUpNotes: '',
    nextCheckTime: '',
  })

  // View/Edit incident modal
  const [showIncidentModal, setShowIncidentModal] = useState(false)
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [updateNote, setUpdateNote] = useState('')
  const [savingUpdate, setSavingUpdate] = useState(false)

  // Resolve modal
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [resolvingDisposition, setResolvingDisposition] = useState('')

  useEffect(() => {
    fetchIncidents()
  }, [eventId, statusFilter, severityFilter])

  useEffect(() => {
    if (viewIncidentId) {
      loadIncident(viewIncidentId)
    }
  }, [viewIncidentId])

  async function fetchIncidents() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (severityFilter !== 'all') params.set('severity', severityFilter)

      const response = await fetch(`/api/admin/events/${eventId}/rapha/incidents?${params}`)
      if (response.ok) {
        const data = await response.json()
        setIncidents(data.incidents || [])
        setStats(data.stats || { active: 0, monitoring: 0, resolved: 0, total: 0 })
      }
    } catch (error) {
      console.error('Failed to fetch incidents:', error)
      toast.error('Failed to load incidents')
    } finally {
      setLoading(false)
    }
  }

  async function loadIncident(incidentId: string) {
    try {
      const response = await fetch(`/api/admin/events/${eventId}/rapha/incidents/${incidentId}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedIncident(data.incident)
        setShowIncidentModal(true)
      }
    } catch (error) {
      console.error('Failed to load incident:', error)
    }
  }

  async function searchParticipants(query: string) {
    setParticipantQuery(query)
    if (query.length < 2) {
      setParticipantResults([])
      return
    }

    setSearchingParticipant(true)
    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/rapha/participants/search?q=${encodeURIComponent(query)}`
      )
      if (response.ok) {
        const data = await response.json()
        setParticipantResults(data.participants || [])
      }
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setSearchingParticipant(false)
    }
  }

  async function handleCreateIncident() {
    if (!newIncident.incidentType) {
      toast.error('Please select an incident type')
      return
    }
    if (!newIncident.description.trim()) {
      toast.error('Please provide a description')
      return
    }
    if (!newIncident.treatmentProvided.trim()) {
      toast.error('Please describe the treatment provided')
      return
    }
    if (!newIncident.staffMemberName.trim()) {
      toast.error('Please enter your name')
      return
    }

    setSavingIncident(true)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/rapha/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: selectedParticipant?.id || null,
          ...newIncident,
          nextCheckTime: newIncident.nextCheckTime || null,
        }),
      })

      if (response.ok) {
        toast.success('Incident recorded successfully')
        setShowNewIncidentModal(false)
        resetNewIncidentForm()
        fetchIncidents()
        onStatsChange?.()
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
    setParticipantQuery('')
    setParticipantResults([])
    setNewIncident({
      incidentType: '',
      severity: 'minor',
      location: '',
      description: '',
      treatmentProvided: '',
      staffMemberName: '',
      parentContacted: false,
      parentContactMethod: '',
      parentContactNotes: '',
      ambulanceCalled: false,
      sentToHospital: false,
      hospitalName: '',
      participantDisposition: '',
      followUpRequired: false,
      followUpNotes: '',
      nextCheckTime: '',
    })
  }

  async function handleAddUpdate() {
    if (!updateNote.trim() || !selectedIncident) return

    setSavingUpdate(true)
    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/rapha/incidents/${selectedIncident.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updateNote }),
        }
      )

      if (response.ok) {
        toast.success('Update added')
        setUpdateNote('')
        loadIncident(selectedIncident.id)
        fetchIncidents()
      }
    } catch (error) {
      toast.error('Failed to add update')
    } finally {
      setSavingUpdate(false)
    }
  }

  async function handleResolve() {
    if (!selectedIncident) return

    setSavingUpdate(true)
    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/rapha/incidents/${selectedIncident.id}/resolve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resolutionNotes,
            participantDisposition: resolvingDisposition || 'returned_to_activities',
          }),
        }
      )

      if (response.ok) {
        toast.success('Incident resolved')
        setShowResolveModal(false)
        setShowIncidentModal(false)
        setResolutionNotes('')
        setResolvingDisposition('')
        fetchIncidents()
        onStatsChange?.()
      }
    } catch (error) {
      toast.error('Failed to resolve incident')
    } finally {
      setSavingUpdate(false)
    }
  }

  function getSeverityBadge(severity: string) {
    switch (severity) {
      case 'minor':
        return <Badge className="bg-green-500">Minor</Badge>
      case 'moderate':
        return <Badge className="bg-amber-500">Moderate</Badge>
      case 'severe':
        return <Badge className="bg-red-500">Severe</Badge>
      default:
        return <Badge variant="outline">{severity}</Badge>
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'active':
        return <Badge className="bg-red-500">Active</Badge>
      case 'monitoring':
        return <Badge className="bg-amber-500">Monitoring</Badge>
      case 'resolved':
        return <Badge className="bg-green-500">Resolved</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  function getIncidentTypeLabel(type: string) {
    const types: Record<string, string> = {
      injury: 'Injury',
      illness: 'Illness',
      allergic_reaction: 'Allergic Reaction',
      medication_administration: 'Medication Administration',
      other: 'Other',
    }
    return types[type] || type
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card
          className={`cursor-pointer transition-colors ${statusFilter === 'all' ? 'border-[#0077BE] bg-[#0077BE]/5' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-colors ${statusFilter === 'active' ? 'border-red-500 bg-red-50' : ''}`}
          onClick={() => setStatusFilter('active')}
        >
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{stats.active}</p>
              <p className="text-sm text-red-700">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-colors ${statusFilter === 'monitoring' ? 'border-amber-500 bg-amber-50' : ''}`}
          onClick={() => setStatusFilter('monitoring')}
        >
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">{stats.monitoring}</p>
              <p className="text-sm text-amber-700">Monitoring</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-colors ${statusFilter === 'resolved' ? 'border-green-500 bg-green-50' : ''}`}
          onClick={() => setStatusFilter('resolved')}
        >
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
              <p className="text-sm text-green-700">Resolved</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex gap-2">
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="minor">Minor</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="severe">Severe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="bg-[#0077BE] hover:bg-[#0077BE]/90"
              onClick={() => setShowNewIncidentModal(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Incident
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Incidents List */}
      <Card>
        <CardHeader>
          <CardTitle>Medical Incidents</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#0077BE]" />
            </div>
          ) : incidents.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-muted-foreground">No incidents found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.map((incident) => (
                <div
                  key={incident.id}
                  className={`p-4 rounded-lg border transition-colors cursor-pointer hover:bg-gray-50 ${
                    incident.status === 'active'
                      ? 'border-red-200 bg-red-50/50'
                      : incident.status === 'monitoring'
                        ? 'border-amber-200 bg-amber-50/50'
                        : 'border-gray-200'
                  }`}
                  onClick={() => loadIncident(incident.id)}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-medium text-[#0077BE]">
                          {incident.participantName}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {incident.groupName}
                        </Badge>
                        {getSeverityBadge(incident.severity)}
                        {getStatusBadge(incident.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        <strong>{getIncidentTypeLabel(incident.type)}</strong> - {incident.description.substring(0, 100)}
                        {incident.description.length > 100 ? '...' : ''}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(incident.date), 'MMM d')} at {incident.time}
                        </span>
                        {incident.parentContacted && (
                          <span className="flex items-center gap-1 text-green-600">
                            <Phone className="w-3 h-3" />
                            Parent contacted
                          </span>
                        )}
                        {incident.ambulanceCalled && (
                          <span className="flex items-center gap-1 text-red-600">
                            <Ambulance className="w-3 h-3" />
                            Ambulance called
                          </span>
                        )}
                        {incident.sentToHospital && (
                          <span className="flex items-center gap-1 text-red-600">
                            <Building2 className="w-3 h-3" />
                            Hospitalized
                          </span>
                        )}
                        {incident.nextCheckTime && incident.status !== 'resolved' && (
                          <span className="flex items-center gap-1 text-amber-600">
                            <Clock className="w-3 h-3" />
                            Next check: {format(new Date(incident.nextCheckTime), 'h:mm a')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      {incident.status !== 'resolved' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedIncident(incident)
                            setShowResolveModal(true)
                          }}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Incident Modal */}
      <Dialog open={showNewIncidentModal} onOpenChange={setShowNewIncidentModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Medical Incident Report</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Participant Search */}
            <div className="space-y-2">
              <Label>Participant (optional)</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search participant by name..."
                  value={participantQuery}
                  onChange={(e) => searchParticipants(e.target.value)}
                  className="pl-10"
                />
              </div>
              {searchingParticipant && (
                <p className="text-sm text-muted-foreground">Searching...</p>
              )}
              {participantResults.length > 0 && !selectedParticipant && (
                <div className="border rounded-lg max-h-40 overflow-y-auto divide-y">
                  {participantResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedParticipant(p)
                        setParticipantQuery(`${p.firstName} ${p.lastName}`)
                        setParticipantResults([])
                      }}
                      className="w-full text-left p-3 hover:bg-gray-50"
                    >
                      <div className="font-medium">{p.firstName} {p.lastName}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.groupName} • Age {p.age}
                      </div>
                      {p.allergies && (
                        <div className="text-xs text-red-600 mt-1">
                          Allergies: {p.allergies}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {selectedParticipant && (
                <div className="p-3 bg-[#0077BE]/5 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {selectedParticipant.firstName} {selectedParticipant.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {selectedParticipant.groupName}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedParticipant(null)
                        setParticipantQuery('')
                      }}
                    >
                      Change
                    </Button>
                  </div>
                  {selectedParticipant.allergies && (
                    <div className="mt-2 text-sm text-red-600 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      Allergies: {selectedParticipant.allergies}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Incident Type & Severity */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Incident Type *</Label>
                <Select
                  value={newIncident.incidentType}
                  onValueChange={(v) => setNewIncident({ ...newIncident, incidentType: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="injury">Injury (cut, sprain, etc.)</SelectItem>
                    <SelectItem value="illness">Illness (fever, nausea, etc.)</SelectItem>
                    <SelectItem value="allergic_reaction">Allergic Reaction</SelectItem>
                    <SelectItem value="medication_administration">Medication Given</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Severity *</Label>
                <Select
                  value={newIncident.severity}
                  onValueChange={(v: 'minor' | 'moderate' | 'severe') =>
                    setNewIncident({ ...newIncident, severity: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minor">Minor - First aid only</SelectItem>
                    <SelectItem value="moderate">Moderate - Monitoring needed</SelectItem>
                    <SelectItem value="severe">Severe - Emergency services</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                placeholder="Where did this occur? (e.g., Dining Hall, Soccer Field)"
                value={newIncident.location}
                onChange={(e) => setNewIncident({ ...newIncident, location: e.target.value })}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                placeholder="What happened? Describe symptoms and circumstances..."
                value={newIncident.description}
                onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
                rows={3}
              />
            </div>

            {/* Treatment */}
            <div className="space-y-2">
              <Label>Treatment Provided *</Label>
              <Textarea
                placeholder="What treatment was given? (medications, first aid, etc.)"
                value={newIncident.treatmentProvided}
                onChange={(e) => setNewIncident({ ...newIncident, treatmentProvided: e.target.value })}
                rows={2}
              />
            </div>

            {/* Staff Name */}
            <div className="space-y-2">
              <Label>Your Name *</Label>
              <Input
                placeholder="Medical staff member name"
                value={newIncident.staffMemberName}
                onChange={(e) => setNewIncident({ ...newIncident, staffMemberName: e.target.value })}
              />
            </div>

            {/* Parent Contact */}
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="parentContacted"
                  checked={newIncident.parentContacted}
                  onCheckedChange={(c) =>
                    setNewIncident({ ...newIncident, parentContacted: !!c })
                  }
                />
                <Label htmlFor="parentContacted">Parent/Guardian Contacted</Label>
              </div>
              {newIncident.parentContacted && (
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <Select
                    value={newIncident.parentContactMethod}
                    onValueChange={(v) => setNewIncident({ ...newIncident, parentContactMethod: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Contact method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="phone">Phone call</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="in_person">In person</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Contact notes..."
                    value={newIncident.parentContactNotes}
                    onChange={(e) =>
                      setNewIncident({ ...newIncident, parentContactNotes: e.target.value })
                    }
                  />
                </div>
              )}
            </div>

            {/* Emergency Services */}
            <div className="space-y-3 p-4 bg-red-50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="ambulanceCalled"
                    checked={newIncident.ambulanceCalled}
                    onCheckedChange={(c) =>
                      setNewIncident({ ...newIncident, ambulanceCalled: !!c })
                    }
                  />
                  <Label htmlFor="ambulanceCalled">Ambulance Called</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="sentToHospital"
                    checked={newIncident.sentToHospital}
                    onCheckedChange={(c) =>
                      setNewIncident({ ...newIncident, sentToHospital: !!c })
                    }
                  />
                  <Label htmlFor="sentToHospital">Sent to Hospital</Label>
                </div>
              </div>
              {newIncident.sentToHospital && (
                <Input
                  placeholder="Hospital name"
                  value={newIncident.hospitalName}
                  onChange={(e) => setNewIncident({ ...newIncident, hospitalName: e.target.value })}
                />
              )}
            </div>

            {/* Disposition & Follow-up */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Participant Status</Label>
                <Select
                  value={newIncident.participantDisposition}
                  onValueChange={(v) => setNewIncident({ ...newIncident, participantDisposition: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Current status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="returned_to_activities">Returned to activities</SelectItem>
                    <SelectItem value="resting_in_health_office">Resting in health office</SelectItem>
                    <SelectItem value="sent_home">Sent home with parent</SelectItem>
                    <SelectItem value="hospitalized">Hospitalized</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="followUpRequired"
                    checked={newIncident.followUpRequired}
                    onCheckedChange={(c) =>
                      setNewIncident({ ...newIncident, followUpRequired: !!c })
                    }
                  />
                  <Label htmlFor="followUpRequired">Follow-up Required</Label>
                </div>
                {newIncident.followUpRequired && (
                  <Input
                    type="time"
                    value={newIncident.nextCheckTime}
                    onChange={(e) => setNewIncident({ ...newIncident, nextCheckTime: e.target.value })}
                  />
                )}
              </div>
            </div>

            {newIncident.followUpRequired && (
              <div className="space-y-2">
                <Label>Follow-up Notes</Label>
                <Textarea
                  placeholder="What should be checked during follow-up?"
                  value={newIncident.followUpNotes}
                  onChange={(e) => setNewIncident({ ...newIncident, followUpNotes: e.target.value })}
                  rows={2}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowNewIncidentModal(false)
                resetNewIncidentForm()
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#0077BE] hover:bg-[#0077BE]/90"
              onClick={handleCreateIncident}
              disabled={savingIncident}
            >
              {savingIncident && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Incident
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Incident Modal */}
      <Dialog open={showIncidentModal} onOpenChange={setShowIncidentModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedIncident && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Incident Details
                  {getStatusBadge(selectedIncident.status)}
                  {getSeverityBadge(selectedIncident.severity)}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Participant</p>
                    <p className="font-medium">{selectedIncident.participantName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Group</p>
                    <p className="font-medium">{selectedIncident.groupName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Date/Time</p>
                    <p className="font-medium">
                      {format(new Date(selectedIncident.date), 'MMM d, yyyy')} at {selectedIncident.time}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Type</p>
                    <p className="font-medium">{getIncidentTypeLabel(selectedIncident.type)}</p>
                  </div>
                </div>

                {selectedIncident.location && (
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p>{selectedIncident.location}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="bg-gray-50 p-3 rounded-lg">{selectedIncident.description}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Treatment Provided</p>
                  <p className="bg-blue-50 p-3 rounded-lg">{selectedIncident.treatment}</p>
                </div>

                <div className="flex flex-wrap gap-4 text-sm">
                  {selectedIncident.parentContacted && (
                    <span className="flex items-center gap-1 text-green-600">
                      <Phone className="w-4 h-4" />
                      Parent contacted
                    </span>
                  )}
                  {selectedIncident.ambulanceCalled && (
                    <span className="flex items-center gap-1 text-red-600">
                      <Ambulance className="w-4 h-4" />
                      Ambulance called
                    </span>
                  )}
                  {selectedIncident.sentToHospital && (
                    <span className="flex items-center gap-1 text-red-600">
                      <Building2 className="w-4 h-4" />
                      Sent to {selectedIncident.hospitalName || 'hospital'}
                    </span>
                  )}
                </div>

                {/* Updates */}
                {selectedIncident.recentUpdates?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Updates</p>
                    <div className="space-y-2">
                      {selectedIncident.recentUpdates.map((update: any) => (
                        <div key={update.id} className="bg-gray-50 p-3 rounded-lg text-sm">
                          <p>{update.updateText}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {update.updatedByName} • {format(new Date(update.createdAt), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add Update */}
                {selectedIncident.status !== 'resolved' && (
                  <div className="space-y-2">
                    <Label>Add Update</Label>
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Add a follow-up note..."
                        value={updateNote}
                        onChange={(e) => setUpdateNote(e.target.value)}
                        rows={2}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleAddUpdate}
                        disabled={!updateNote.trim() || savingUpdate}
                      >
                        {savingUpdate ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <MessageSquare className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Resolution */}
                {selectedIncident.status === 'resolved' && selectedIncident.resolvedAt && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-green-700 mb-1">Resolved</p>
                    <p className="text-sm">{selectedIncident.resolutionNotes}</p>
                    <p className="text-xs text-green-600 mt-2">
                      {format(new Date(selectedIncident.resolvedAt), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowIncidentModal(false)}>
                  Close
                </Button>
                {selectedIncident.status !== 'resolved' && (
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => setShowResolveModal(true)}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Resolve Incident
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Resolve Modal */}
      <Dialog open={showResolveModal} onOpenChange={setShowResolveModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Incident</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Final Status</Label>
              <Select value={resolvingDisposition} onValueChange={setResolvingDisposition}>
                <SelectTrigger>
                  <SelectValue placeholder="Select final status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="returned_to_activities">Returned to activities</SelectItem>
                  <SelectItem value="sent_home">Sent home with parent</SelectItem>
                  <SelectItem value="hospitalized">Hospitalized</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Resolution Notes</Label>
              <Textarea
                placeholder="Final notes about the resolution..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolveModal(false)}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleResolve}
              disabled={savingUpdate}
            >
              {savingUpdate && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
