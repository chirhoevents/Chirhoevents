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
  Printer,
  FileText,
} from 'lucide-react'
import { toast } from '@/lib/toast'
import { format } from 'date-fns'

interface Incident {
  id: string
  participantId: string | null
  liabilityFormId: string | null
  participantName: string
  participantAge: number | null
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

interface PreSelectedParticipant {
  id: string
  participantId: string | null
  firstName: string
  lastName: string
  groupName: string
  allergies?: string | null
  hasSevereAllergy?: boolean
}

interface RaphaIncidentsProps {
  eventId: string
  onStatsChange?: () => void
  preSelectedParticipant?: PreSelectedParticipant | null
  openNewIncidentModal?: boolean
  onModalClose?: () => void
}

export default function RaphaIncidents({
  eventId,
  onStatsChange,
  preSelectedParticipant,
  openNewIncidentModal,
  onModalClose,
}: RaphaIncidentsProps) {
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

  // Print report modal
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [printData, setPrintData] = useState<any>(null)
  const [loadingPrintData, setLoadingPrintData] = useState(false)

  useEffect(() => {
    fetchIncidents()
  }, [eventId, statusFilter, severityFilter])

  useEffect(() => {
    if (viewIncidentId) {
      loadIncident(viewIncidentId)
    }
  }, [viewIncidentId])

  // Handle opening new incident modal from parent with pre-selected participant
  useEffect(() => {
    if (openNewIncidentModal) {
      if (preSelectedParticipant) {
        setSelectedParticipant({
          id: preSelectedParticipant.participantId || null,
          liabilityFormId: preSelectedParticipant.id, // This is the LiabilityForm ID
          firstName: preSelectedParticipant.firstName,
          lastName: preSelectedParticipant.lastName,
          groupName: preSelectedParticipant.groupName,
          allergies: preSelectedParticipant.allergies,
          hasSevereAllergy: preSelectedParticipant.hasSevereAllergy,
        })
        setParticipantQuery(`${preSelectedParticipant.firstName} ${preSelectedParticipant.lastName}`)
      }
      setShowNewIncidentModal(true)
    }
  }, [openNewIncidentModal, preSelectedParticipant])

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
          liabilityFormId: selectedParticipant?.liabilityFormId || null,
          ...newIncident,
          nextCheckTime: newIncident.nextCheckTime || null,
        }),
      })

      if (response.ok) {
        toast.success('Incident recorded successfully')
        setShowNewIncidentModal(false)
        resetNewIncidentForm()
        onModalClose?.()
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

  async function handlePrintVisitHistory(
    participantId: string | null,
    liabilityFormId: string | null,
    incidentId?: string
  ) {
    setLoadingPrintData(true)
    try {
      // Use liabilityFormId first, then participantId, fallback to 'unknown' with incidentId
      const id = liabilityFormId || participantId || 'unknown'
      const queryParams = incidentId ? `?incidentId=${incidentId}` : ''
      const response = await fetch(`/api/admin/events/${eventId}/rapha/participants/${id}/incidents${queryParams}`)
      if (response.ok) {
        const data = await response.json()
        setPrintData(data)
        setShowPrintModal(true)
      } else {
        toast.error('Failed to load visit history')
      }
    } catch (error) {
      toast.error('Failed to load visit history')
    } finally {
      setLoadingPrintData(false)
    }
  }

  function handlePrint() {
    if (!printData) return

    // Create a new window with printable content
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('Please allow popups to print')
      return
    }

    const formatDate = (dateStr: string) => {
      try {
        return new Date(dateStr).toLocaleDateString('en-US', {
          weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
        })
      } catch { return dateStr }
    }

    const formatDateTime = (dateStr: string) => {
      try {
        return new Date(dateStr).toLocaleString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
        })
      } catch { return dateStr }
    }

    const incidentsHtml = printData.incidents.map((incident: any, index: number) => `
      <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 16px; page-break-inside: avoid;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <h3 style="margin: 0; font-size: 16px;">Visit #${printData.incidents.length - index}: ${incident.type.replace(/_/g, ' ')}</h3>
          <div>
            <span style="background: ${incident.severity === 'severe' ? '#ef4444' : incident.severity === 'moderate' ? '#f59e0b' : '#22c55e'}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-right: 4px;">${incident.severity}</span>
            <span style="background: ${incident.status === 'resolved' ? '#22c55e' : incident.status === 'monitoring' ? '#f59e0b' : '#ef4444'}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${incident.status}</span>
          </div>
        </div>
        <p style="color: #666; font-size: 14px; margin: 4px 0;">${formatDate(incident.date)} at ${incident.time}${incident.location ? ` - ${incident.location}` : ''}</p>
        <div style="font-size: 14px; margin-top: 12px;">
          <p><strong>Description:</strong> ${incident.description}</p>
          <p><strong>Treatment:</strong> ${incident.treatmentProvided}</p>
          <p><strong>Staff:</strong> ${incident.staffMemberName}</p>
          ${incident.parentContacted ? '<p style="color: #22c55e;">✓ Parent Contacted</p>' : ''}
          ${incident.ambulanceCalled ? '<p style="color: #ef4444;">🚑 Ambulance Called</p>' : ''}
          ${incident.sentToHospital ? `<p style="color: #ef4444;">🏥 Sent to Hospital: ${incident.hospitalName || 'Unknown'}</p>` : ''}
          ${incident.updates && incident.updates.length > 0 ? `
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee;">
              <p style="font-weight: 500; font-size: 12px; margin-bottom: 4px;">Follow-up Notes:</p>
              ${incident.updates.map((u: any) => `
                <div style="background: #f9f9f9; padding: 8px; border-radius: 4px; margin-bottom: 4px; font-size: 12px;">
                  <p style="margin: 0;">${u.text}</p>
                  <p style="margin: 4px 0 0 0; color: #666;">- ${u.by}, ${formatDateTime(u.at)}</p>
                </div>
              `).join('')}
            </div>
          ` : ''}
          ${incident.status === 'resolved' && incident.resolvedAt ? `
            <div style="margin-top: 12px; padding: 12px; background: #f0fdf4; border-radius: 4px;">
              <p style="font-weight: 500; color: #15803d; margin: 0;">Resolved</p>
              <p style="font-size: 12px; margin: 4px 0 0 0;">${incident.resolutionNotes || ''} - ${formatDateTime(incident.resolvedAt)}</p>
              ${incident.disposition ? `<p style="font-size: 12px; margin: 4px 0 0 0;">Final disposition: ${incident.disposition.replace(/_/g, ' ')}</p>` : ''}
            </div>
          ` : ''}
        </div>
      </div>
    `).join('')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Medical Visit History - ${printData.participant.name}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; color: #333; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #0077BE; margin: 0; font-size: 24px;">Medical Visit History Report</h1>
          <p style="color: #666; margin: 4px 0;">${printData.event.organizationName} - ${printData.event.name}</p>
          <p style="color: #888; font-size: 12px; margin: 4px 0;">Generated: ${formatDateTime(printData.generatedAt)} by ${printData.generatedBy}</p>
        </div>

        <div style="background: #f9f9f9; padding: 16px; border-radius: 8px; margin-bottom: 24px; border: 1px solid #ddd;">
          <h2 style="margin: 0 0 12px 0; font-size: 18px;">Participant Information</h2>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; font-size: 14px;">
            <div><span style="color: #666;">Name:</span> <strong>${printData.participant.name}</strong></div>
            ${printData.participant.preferredName ? `<div><span style="color: #666;">Preferred:</span> <strong>${printData.participant.preferredName}</strong></div>` : ''}
            <div><span style="color: #666;">Age:</span> <strong>${printData.participant.age || 'N/A'}</strong></div>
            <div><span style="color: #666;">Gender:</span> <strong>${printData.participant.gender || 'N/A'}</strong></div>
            <div><span style="color: #666;">Group:</span> <strong>${printData.participant.groupName}</strong></div>
            ${printData.participant.parishName ? `<div><span style="color: #666;">Parish:</span> <strong>${printData.participant.parishName}</strong></div>` : ''}
          </div>

          ${printData.participant.allergies || printData.participant.medicalConditions || printData.participant.medications ? `
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #ddd;">
              <h3 style="margin: 0 0 8px 0; font-size: 14px;">Medical Information</h3>
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 14px;">
                ${printData.participant.allergies ? `<div style="background: #fef2f2; padding: 8px; border-radius: 4px; border: 1px solid #fecaca;"><strong style="color: #dc2626;">Allergies:</strong> ${printData.participant.allergies}</div>` : ''}
                ${printData.participant.medicalConditions ? `<div style="background: #fffbeb; padding: 8px; border-radius: 4px; border: 1px solid #fde68a;"><strong style="color: #d97706;">Conditions:</strong> ${printData.participant.medicalConditions}</div>` : ''}
                ${printData.participant.medications ? `<div style="background: #eff6ff; padding: 8px; border-radius: 4px; border: 1px solid #bfdbfe;"><strong style="color: #2563eb;">Medications:</strong> ${printData.participant.medications}</div>` : ''}
              </div>
            </div>
          ` : ''}

          ${printData.participant.emergencyContact1?.name || printData.participant.emergencyContact2?.name ? `
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #ddd;">
              <h3 style="margin: 0 0 8px 0; font-size: 14px;">Emergency Contacts</h3>
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 14px;">
                ${printData.participant.emergencyContact1?.name ? `<div><strong>${printData.participant.emergencyContact1.name}</strong><br/><span style="color: #666;">${printData.participant.emergencyContact1.relation} - ${printData.participant.emergencyContact1.phone}</span></div>` : ''}
                ${printData.participant.emergencyContact2?.name ? `<div><strong>${printData.participant.emergencyContact2.name}</strong><br/><span style="color: #666;">${printData.participant.emergencyContact2.relation} - ${printData.participant.emergencyContact2.phone}</span></div>` : ''}
              </div>
            </div>
          ` : ''}

          ${printData.participant.insuranceProvider ? `
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #ddd;">
              <h3 style="margin: 0 0 8px 0; font-size: 14px;">Insurance</h3>
              <p style="font-size: 14px; margin: 0;">${printData.participant.insuranceProvider}${printData.participant.insurancePolicyNumber ? ` - Policy: ${printData.participant.insurancePolicyNumber}` : ''}</p>
            </div>
          ` : ''}
        </div>

        <div>
          <h2 style="margin: 0 0 16px 0; font-size: 18px;">Visit History (${printData.incidents.length} incident${printData.incidents.length !== 1 ? 's' : ''})</h2>
          ${printData.incidents.length === 0 ? '<p style="text-align: center; color: #666; padding: 32px;">No medical incidents recorded for this participant.</p>' : incidentsHtml}
        </div>

        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 12px;">
          <p style="margin: 0;"><strong>CONFIDENTIAL MEDICAL INFORMATION</strong> - For authorized medical staff only</p>
          <p style="margin: 4px 0 0 0;">${printData.event.organizationName} - ${printData.event.name}</p>
        </div>

        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `)
    printWindow.document.close()
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
                onModalClose?.()
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

              <DialogFooter className="flex-wrap gap-2">
                <Button variant="outline" onClick={() => setShowIncidentModal(false)}>
                  Close
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handlePrintVisitHistory(selectedIncident.participantId, selectedIncident.liabilityFormId, selectedIncident.id)}
                  disabled={loadingPrintData}
                >
                  {loadingPrintData ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Printer className="w-4 h-4 mr-2" />
                  )}
                  Print Visit History
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

      {/* Print Visit History Modal */}
      <Dialog open={showPrintModal} onOpenChange={setShowPrintModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:overflow-visible print:shadow-none print:border-none">
          {printData && (
            <>
              <div className="print:block">
                {/* Print Header */}
                <div className="text-center mb-6 print:mb-4">
                  <h1 className="text-2xl font-bold text-[#0077BE] print:text-black">
                    Medical Visit History Report
                  </h1>
                  <p className="text-muted-foreground">
                    {printData.event.organizationName} - {printData.event.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Generated: {format(new Date(printData.generatedAt), 'MMM d, yyyy h:mm a')} by {printData.generatedBy}
                  </p>
                </div>

                {/* Participant Info */}
                <div className="bg-gray-50 p-4 rounded-lg mb-6 print:bg-white print:border print:border-gray-300">
                  <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 print:hidden" />
                    Participant Information
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Name</p>
                      <p className="font-medium">{printData.participant.name}</p>
                    </div>
                    {printData.participant.preferredName && (
                      <div>
                        <p className="text-muted-foreground">Preferred Name</p>
                        <p className="font-medium">{printData.participant.preferredName}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-muted-foreground">Age</p>
                      <p className="font-medium">{printData.participant.age || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Gender</p>
                      <p className="font-medium">{printData.participant.gender || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Group</p>
                      <p className="font-medium">{printData.participant.groupName}</p>
                    </div>
                    {printData.participant.parishName && (
                      <div>
                        <p className="text-muted-foreground">Parish</p>
                        <p className="font-medium">{printData.participant.parishName}</p>
                      </div>
                    )}
                  </div>

                  {/* Medical Info */}
                  <div className="mt-4 pt-4 border-t">
                    <h3 className="font-medium mb-2">Medical Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {printData.participant.allergies && (
                        <div className="bg-red-50 p-2 rounded print:bg-white print:border">
                          <p className="text-red-700 font-medium">Allergies</p>
                          <p>{printData.participant.allergies}</p>
                        </div>
                      )}
                      {printData.participant.medicalConditions && (
                        <div className="bg-amber-50 p-2 rounded print:bg-white print:border">
                          <p className="text-amber-700 font-medium">Medical Conditions</p>
                          <p>{printData.participant.medicalConditions}</p>
                        </div>
                      )}
                      {printData.participant.medications && (
                        <div className="bg-blue-50 p-2 rounded print:bg-white print:border">
                          <p className="text-blue-700 font-medium">Medications</p>
                          <p>{printData.participant.medications}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Emergency Contacts */}
                  <div className="mt-4 pt-4 border-t">
                    <h3 className="font-medium mb-2">Emergency Contacts</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {printData.participant.emergencyContact1.name && (
                        <div>
                          <p className="font-medium">{printData.participant.emergencyContact1.name}</p>
                          <p className="text-muted-foreground">
                            {printData.participant.emergencyContact1.relation} - {printData.participant.emergencyContact1.phone}
                          </p>
                        </div>
                      )}
                      {printData.participant.emergencyContact2.name && (
                        <div>
                          <p className="font-medium">{printData.participant.emergencyContact2.name}</p>
                          <p className="text-muted-foreground">
                            {printData.participant.emergencyContact2.relation} - {printData.participant.emergencyContact2.phone}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Insurance */}
                  {printData.participant.insuranceProvider && (
                    <div className="mt-4 pt-4 border-t">
                      <h3 className="font-medium mb-2">Insurance Information</h3>
                      <p className="text-sm">
                        {printData.participant.insuranceProvider}
                        {printData.participant.insurancePolicyNumber && ` - Policy: ${printData.participant.insurancePolicyNumber}`}
                      </p>
                    </div>
                  )}
                </div>

                {/* Incidents */}
                <div>
                  <h2 className="font-bold text-lg mb-3">
                    Visit History ({printData.incidents.length} incident{printData.incidents.length !== 1 ? 's' : ''})
                  </h2>

                  {printData.incidents.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No medical incidents recorded for this participant.</p>
                  ) : (
                    <div className="space-y-4">
                      {printData.incidents.map((incident: any, index: number) => (
                        <div key={incident.id} className="border rounded-lg p-4 print:break-inside-avoid">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium">
                              Visit #{printData.incidents.length - index}: {incident.type.replace(/_/g, ' ')}
                            </h3>
                            <div className="flex gap-2">
                              <Badge className={
                                incident.severity === 'severe' ? 'bg-red-500' :
                                incident.severity === 'moderate' ? 'bg-amber-500' : 'bg-green-500'
                              }>
                                {incident.severity}
                              </Badge>
                              <Badge className={
                                incident.status === 'resolved' ? 'bg-green-500' :
                                incident.status === 'monitoring' ? 'bg-amber-500' : 'bg-red-500'
                              }>
                                {incident.status}
                              </Badge>
                            </div>
                          </div>

                          <div className="text-sm text-muted-foreground mb-2">
                            {format(new Date(incident.date), 'EEEE, MMMM d, yyyy')} at {incident.time}
                            {incident.location && ` - ${incident.location}`}
                          </div>

                          <div className="text-sm space-y-2">
                            <div>
                              <span className="font-medium">Description: </span>
                              {incident.description}
                            </div>
                            <div>
                              <span className="font-medium">Treatment: </span>
                              {incident.treatmentProvided}
                            </div>
                            <div>
                              <span className="font-medium">Staff: </span>
                              {incident.staffMemberName}
                            </div>

                            {/* Flags */}
                            <div className="flex flex-wrap gap-2 mt-2">
                              {incident.parentContacted && (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                  Parent Contacted
                                </span>
                              )}
                              {incident.ambulanceCalled && (
                                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                                  Ambulance Called
                                </span>
                              )}
                              {incident.sentToHospital && (
                                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                                  Sent to Hospital: {incident.hospitalName || 'Unknown'}
                                </span>
                              )}
                            </div>

                            {/* Updates */}
                            {incident.updates && incident.updates.length > 0 && (
                              <div className="mt-2 pt-2 border-t">
                                <p className="font-medium text-xs mb-1">Follow-up Notes:</p>
                                {incident.updates.map((update: any, idx: number) => (
                                  <div key={idx} className="text-xs bg-gray-50 p-2 rounded mb-1 print:bg-white print:border">
                                    <p>{update.text}</p>
                                    <p className="text-muted-foreground">
                                      - {update.by}, {format(new Date(update.at), 'MMM d, h:mm a')}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Resolution */}
                            {incident.status === 'resolved' && incident.resolvedAt && (
                              <div className="mt-2 pt-2 border-t bg-green-50 -mx-4 -mb-4 p-4 rounded-b-lg print:bg-white print:border-t">
                                <p className="font-medium text-green-700">Resolved</p>
                                <p className="text-xs">
                                  {incident.resolutionNotes}
                                  {' - '}
                                  {format(new Date(incident.resolvedAt), 'MMM d, yyyy h:mm a')}
                                </p>
                                {incident.disposition && (
                                  <p className="text-xs mt-1">
                                    Final disposition: {incident.disposition.replace(/_/g, ' ')}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-6 pt-4 border-t text-center text-sm text-muted-foreground print:mt-4">
                  <p>CONFIDENTIAL MEDICAL INFORMATION - For authorized medical staff only</p>
                  <p className="mt-1">
                    {printData.event.organizationName} - {printData.event.name}
                  </p>
                </div>
              </div>

              <DialogFooter className="print:hidden">
                <Button variant="outline" onClick={() => setShowPrintModal(false)}>
                  Close
                </Button>
                <Button className="bg-[#0077BE] hover:bg-[#0077BE]/90" onClick={handlePrint}>
                  <Printer className="w-4 h-4 mr-2" />
                  Print Report
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
