'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  AlertTriangle,
  Phone,
  Mail,
  MapPin,
  Pill,
  Heart,
  Shield,
  Eye,
  Plus,
  Printer,
  AlertCircle,
  User,
  Building,
  Utensils,
  Accessibility,
} from 'lucide-react'
import { toast } from '@/lib/toast'
import { format } from 'date-fns'

export interface RaphaParticipant {
  id: string
  participantId: string | null
  firstName: string
  lastName: string
  preferredName: string | null
  age: number | null
  gender: string | null
  email: string | null
  phone: string | null
  participantType: string | null
  checkedIn: boolean
  groupId: string | null
  groupName: string
  parishName: string | null
  roomAssignment: string | null
  incidentCount: number
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
  insurance: {
    provider: string | null
    policyNumber: string | null
    groupNumber: string | null
  }
  parentEmail: string | null
  formCompletedAt: string | null
}

// Alias for internal use
type Participant = RaphaParticipant

interface RaphaParticipantsProps {
  eventId: string
  onCreateIncident?: (participant: Participant) => void
  initialSearch?: string
}

export default function RaphaParticipants({ eventId, onCreateIncident, initialSearch }: RaphaParticipantsProps) {
  const searchParams = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [search, setSearch] = useState(initialSearch || '')
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [participantIncidents, setParticipantIncidents] = useState<any[]>([])
  const [loadingIncidents, setLoadingIncidents] = useState(false)

  // Email modal state
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailParticipant, setEmailParticipant] = useState<Participant | null>(null)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)

  // Watch for URL search params changes
  useEffect(() => {
    const urlSearch = searchParams.get('search') || ''
    const urlFilter = searchParams.get('filter') || 'all'
    if (urlSearch !== search) {
      setSearch(urlSearch)
    }
    if (urlFilter !== filter) {
      setFilter(urlFilter)
    }
  }, [searchParams])

  // Update search when initialSearch prop changes and immediately fetch
  useEffect(() => {
    if (initialSearch !== undefined && initialSearch !== '') {
      setSearch(initialSearch)
      // Immediately fetch with the new search term
      const fetchWithSearch = async () => {
        setLoading(true)
        try {
          const params = new URLSearchParams({
            filter,
            sortBy,
            search: initialSearch,
          })
          const response = await fetch(`/api/admin/events/${eventId}/rapha/participants?${params}`)
          if (response.ok) {
            const data = await response.json()
            setParticipants(data.participants || [])
            setTotalCount(data.totalCount || 0)
          }
        } catch (error) {
          console.error('Failed to fetch participants:', error)
        } finally {
          setLoading(false)
        }
      }
      fetchWithSearch()
    }
  }, [initialSearch, eventId])

  useEffect(() => {
    fetchParticipants()
  }, [eventId, filter, sortBy])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchParticipants()
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  async function fetchParticipants() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        filter,
        sortBy,
        ...(search && { search }),
      })
      const response = await fetch(`/api/admin/events/${eventId}/rapha/participants?${params}`)
      if (response.ok) {
        const data = await response.json()
        setParticipants(data.participants || [])
        setTotalCount(data.totalCount || 0)
      } else {
        toast.error('Failed to load participants')
      }
    } catch (error) {
      console.error('Failed to fetch participants:', error)
      toast.error('Failed to load participants')
    } finally {
      setLoading(false)
    }
  }

  async function fetchParticipantIncidents(participant: Participant) {
    setLoadingIncidents(true)
    try {
      // Use the liability form ID (participant.id) to fetch incidents
      const response = await fetch(
        `/api/admin/events/${eventId}/rapha/participants/${participant.id}/incidents`
      )
      if (response.ok) {
        const data = await response.json()
        setParticipantIncidents(data.incidents || [])
      } else {
        setParticipantIncidents([])
      }
    } catch (error) {
      console.error('Failed to fetch incidents:', error)
      setParticipantIncidents([])
    } finally {
      setLoadingIncidents(false)
    }
  }

  function handleEmailParent(participant: Participant) {
    const email = participant.parentEmail || participant.email
    if (!email) {
      toast.error('No email address available')
      return
    }
    // Open email modal instead of mailto
    setEmailParticipant(participant)
    setEmailSubject(`Regarding ${participant.firstName} ${participant.lastName} - Medical Update`)
    setEmailMessage(`Dear Parent/Guardian,

This is regarding ${participant.firstName} ${participant.lastName}.

[Please add your message here]

`)
    setShowEmailModal(true)
  }

  async function handleSendEmail() {
    if (!emailParticipant) return

    const email = emailParticipant.parentEmail || emailParticipant.email
    if (!email) {
      toast.error('No email address available')
      return
    }

    if (!emailSubject.trim()) {
      toast.error('Please enter a subject')
      return
    }

    if (!emailMessage.trim()) {
      toast.error('Please enter a message')
      return
    }

    setSendingEmail(true)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/rapha/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: email,
          recipientName: emailParticipant.emergency.contact1Name || 'Parent/Guardian',
          participantName: `${emailParticipant.firstName} ${emailParticipant.lastName}`,
          subject: emailSubject,
          message: emailMessage,
          liabilityFormId: emailParticipant.id,
        }),
      })

      if (response.ok) {
        toast.success('Email sent successfully')
        setShowEmailModal(false)
        setEmailParticipant(null)
        setEmailSubject('')
        setEmailMessage('')
      } else {
        const data = await response.json()
        toast.error(data.message || 'Failed to send email')
      }
    } catch (error) {
      console.error('Failed to send email:', error)
      toast.error('Failed to send email')
    } finally {
      setSendingEmail(false)
    }
  }

  function handlePrintProfile(participant: Participant) {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('Please allow popups to print')
      return
    }

    const formatDate = (dateStr: string) => {
      try {
        return new Date(dateStr).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric'
        })
      } catch { return dateStr }
    }

    const incidentsHtml = participantIncidents.length > 0
      ? participantIncidents.map((incident: any, index: number) => `
        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <strong>${incident.type?.replace(/_/g, ' ') || 'Incident'}</strong>
            <div>
              <span style="background: ${incident.severity === 'severe' ? '#ef4444' : incident.severity === 'moderate' ? '#f59e0b' : '#22c55e'}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-right: 4px;">${incident.severity}</span>
              <span style="background: ${incident.status === 'resolved' ? '#22c55e' : incident.status === 'monitoring' ? '#f59e0b' : '#ef4444'}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">${incident.status}</span>
            </div>
          </div>
          <p style="font-size: 12px; color: #666; margin: 4px 0;">${formatDate(incident.date)} at ${incident.time}</p>
          <p style="font-size: 13px; margin: 8px 0;"><strong>Description:</strong> ${incident.description}</p>
          <p style="font-size: 13px; margin: 4px 0;"><strong>Treatment:</strong> ${incident.treatmentProvided}</p>
          <p style="font-size: 12px; color: #666; margin: 4px 0;">Staff: ${incident.staffMemberName}</p>
        </div>
      `).join('')
      : '<p style="text-align: center; color: #666; padding: 20px;">No medical incidents recorded.</p>'

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Medical Profile - ${participant.firstName} ${participant.lastName}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; color: #333; font-size: 13px; }
          h1 { color: #0077BE; margin: 0 0 4px 0; font-size: 22px; }
          h2 { font-size: 16px; margin: 20px 0 10px 0; padding-bottom: 6px; border-bottom: 2px solid #0077BE; }
          .header { text-align: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #ddd; }
          .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
          .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .info-box { background: #f9f9f9; padding: 12px; border-radius: 8px; }
          .info-box.red { background: #fef2f2; border: 1px solid #fecaca; }
          .info-box.amber { background: #fffbeb; border: 1px solid #fde68a; }
          .info-box.purple { background: #faf5ff; border: 1px solid #e9d5ff; }
          .info-box.blue { background: #eff6ff; border: 1px solid #bfdbfe; }
          .info-box.green { background: #f0fdf4; border: 1px solid #bbf7d0; }
          .info-box.indigo { background: #eef2ff; border: 1px solid #c7d2fe; }
          .label { font-size: 11px; color: #666; margin-bottom: 2px; }
          .value { font-weight: 500; }
          .critical { background: #fef2f2; border: 2px solid #ef4444; padding: 12px; border-radius: 8px; margin-bottom: 16px; }
          .critical-title { color: #dc2626; font-weight: bold; display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
          .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #ddd; text-align: center; font-size: 11px; color: #666; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${participant.firstName} ${participant.lastName}</h1>
          <p style="color: #666; margin: 4px 0;">Medical Profile Report</p>
          <p style="font-size: 11px; color: #888;">Generated: ${new Date().toLocaleString()}</p>
        </div>

        ${participant.medical.hasSevereAllergy ? `
          <div class="critical">
            <div class="critical-title">⚠️ CRITICAL ALERT - SEVERE ALLERGY</div>
            <p style="color: #dc2626; margin: 0;">${participant.medical.allergies}</p>
          </div>
        ` : ''}

        <div class="grid">
          <div class="info-box">
            <div class="label">Age</div>
            <div class="value">${participant.age || '-'}</div>
          </div>
          <div class="info-box">
            <div class="label">Gender</div>
            <div class="value" style="text-transform: capitalize;">${participant.gender || '-'}</div>
          </div>
          <div class="info-box">
            <div class="label">Group</div>
            <div class="value">${participant.groupName}</div>
          </div>
          <div class="info-box">
            <div class="label">Room</div>
            <div class="value">${participant.roomAssignment || '-'}</div>
          </div>
        </div>

        <h2>Medical Information</h2>
        <div class="grid-2">
          ${participant.medical.allergies ? `
            <div class="info-box amber">
              <div class="label">Allergies</div>
              <div class="value">${participant.medical.allergies}</div>
            </div>
          ` : ''}
          ${participant.medical.medicalConditions ? `
            <div class="info-box purple">
              <div class="label">Medical Conditions</div>
              <div class="value">${participant.medical.medicalConditions}</div>
            </div>
          ` : ''}
          ${participant.medical.medications ? `
            <div class="info-box blue">
              <div class="label">Medications</div>
              <div class="value">${participant.medical.medications}</div>
            </div>
          ` : ''}
          ${participant.medical.dietaryRestrictions ? `
            <div class="info-box green">
              <div class="label">Dietary Restrictions</div>
              <div class="value">${participant.medical.dietaryRestrictions}</div>
            </div>
          ` : ''}
          ${participant.medical.adaAccommodations ? `
            <div class="info-box indigo">
              <div class="label">ADA Accommodations</div>
              <div class="value">${participant.medical.adaAccommodations}</div>
            </div>
          ` : ''}
        </div>

        <h2>Emergency Contacts</h2>
        <div class="grid-2">
          ${participant.emergency.contact1Name ? `
            <div class="info-box">
              <div class="value">${participant.emergency.contact1Name}</div>
              <div class="label">${participant.emergency.contact1Relation}</div>
              <div style="color: #0077BE; margin-top: 4px;">${participant.emergency.contact1Phone}</div>
            </div>
          ` : ''}
          ${participant.emergency.contact2Name ? `
            <div class="info-box">
              <div class="value">${participant.emergency.contact2Name}</div>
              <div class="label">${participant.emergency.contact2Relation}</div>
              <div style="color: #0077BE; margin-top: 4px;">${participant.emergency.contact2Phone}</div>
            </div>
          ` : ''}
        </div>

        ${participant.insurance.provider ? `
          <h2>Insurance Information</h2>
          <div class="info-box">
            <p style="margin: 0;"><strong>Provider:</strong> ${participant.insurance.provider}</p>
            <p style="margin: 4px 0 0 0;"><strong>Policy:</strong> ${participant.insurance.policyNumber || '-'}</p>
            <p style="margin: 4px 0 0 0;"><strong>Group:</strong> ${participant.insurance.groupNumber || '-'}</p>
          </div>
        ` : ''}

        <h2>Medical Incident History (${participantIncidents.length})</h2>
        ${incidentsHtml}

        <div class="footer">
          <strong>CONFIDENTIAL MEDICAL INFORMATION</strong> - For authorized medical staff only
        </div>

        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `)
    printWindow.document.close()
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

  function openProfile(participant: Participant) {
    setSelectedParticipant(participant)
    setShowProfileModal(true)
    fetchParticipantIncidents(participant)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, condition, allergy..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Participants</SelectItem>
                <SelectItem value="medical">With Medical Needs</SelectItem>
                <SelectItem value="severe">Severe Allergies</SelectItem>
                <SelectItem value="allergies">Allergies</SelectItem>
                <SelectItem value="medications">Medications</SelectItem>
                <SelectItem value="conditions">Conditions</SelectItem>
                <SelectItem value="dietary">Dietary Restrictions</SelectItem>
                <SelectItem value="ada">ADA/Special Needs</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name (A-Z)</SelectItem>
                <SelectItem value="age">Age</SelectItem>
                <SelectItem value="severity">Severity</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            Medical Information - {totalCount} Participants
          </CardTitle>
          <Button variant="outline" size="sm">
            <Printer className="w-4 h-4 mr-2" />
            Print List
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#0077BE]" />
            </div>
          ) : participants.length === 0 ? (
            <div className="text-center py-12">
              <User className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-muted-foreground">No participants found matching your criteria</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 font-medium">Name</th>
                    <th className="text-left p-3 font-medium">Age</th>
                    <th className="text-left p-3 font-medium">Group</th>
                    <th className="text-left p-3 font-medium">Alert</th>
                    <th className="text-left p-3 font-medium">Allergies</th>
                    <th className="text-left p-3 font-medium">Conditions</th>
                    <th className="text-left p-3 font-medium">Medications</th>
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {participants.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="p-3">
                        <div className="font-medium">
                          {p.firstName} {p.lastName}
                        </div>
                        {p.roomAssignment && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {p.roomAssignment}
                          </div>
                        )}
                      </td>
                      <td className="p-3">{p.age || '-'}</td>
                      <td className="p-3">
                        <div className="max-w-[150px] truncate">{p.groupName}</div>
                      </td>
                      <td className="p-3">{getAlertBadge(p.alertLevel)}</td>
                      <td className="p-3">
                        {p.medical.allergies ? (
                          <div className="max-w-[200px]">
                            {p.medical.hasSevereAllergy && (
                              <AlertTriangle className="w-4 h-4 text-red-500 inline mr-1" />
                            )}
                            <span className="text-xs">{p.medical.allergies}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        {p.medical.medicalConditions ? (
                          <span className="text-xs max-w-[150px] truncate block">
                            {p.medical.medicalConditions}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        {p.medical.medications ? (
                          <span className="text-xs max-w-[150px] truncate block">
                            {p.medical.medications}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openProfile(p)}
                            title="View Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (onCreateIncident) {
                                onCreateIncident(p)
                              }
                            }}
                            title="Create Incident"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profile Modal */}
      <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedParticipant && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span>
                    {selectedParticipant.firstName} {selectedParticipant.lastName}
                  </span>
                  {getAlertBadge(selectedParticipant.alertLevel)}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Age</p>
                    <p className="font-medium">{selectedParticipant.age || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Gender</p>
                    <p className="font-medium capitalize">{selectedParticipant.gender || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Group</p>
                    <p className="font-medium">{selectedParticipant.groupName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Room</p>
                    <p className="font-medium">{selectedParticipant.roomAssignment || '-'}</p>
                  </div>
                </div>

                {/* Critical Alerts */}
                {selectedParticipant.medical.hasSevereAllergy && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-red-700 font-bold mb-2">
                      <AlertTriangle className="w-5 h-5" />
                      CRITICAL ALERTS
                    </div>
                    <p className="text-red-600">{selectedParticipant.medical.allergies}</p>
                  </div>
                )}

                {/* Allergies */}
                {selectedParticipant.medical.allergies && (
                  <div>
                    <h4 className="font-medium flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      Allergies
                    </h4>
                    <p className="text-sm bg-amber-50 p-3 rounded-lg">
                      {selectedParticipant.medical.allergies}
                    </p>
                  </div>
                )}

                {/* Medical Conditions */}
                {selectedParticipant.medical.medicalConditions && (
                  <div>
                    <h4 className="font-medium flex items-center gap-2 mb-2">
                      <Heart className="w-4 h-4 text-purple-500" />
                      Medical Conditions
                    </h4>
                    <p className="text-sm bg-purple-50 p-3 rounded-lg">
                      {selectedParticipant.medical.medicalConditions}
                    </p>
                  </div>
                )}

                {/* Medications */}
                {selectedParticipant.medical.medications && (
                  <div>
                    <h4 className="font-medium flex items-center gap-2 mb-2">
                      <Pill className="w-4 h-4 text-blue-500" />
                      Medications
                    </h4>
                    <p className="text-sm bg-blue-50 p-3 rounded-lg">
                      {selectedParticipant.medical.medications}
                    </p>
                  </div>
                )}

                {/* Dietary Restrictions */}
                {selectedParticipant.medical.dietaryRestrictions && (
                  <div>
                    <h4 className="font-medium flex items-center gap-2 mb-2">
                      <Utensils className="w-4 h-4 text-green-500" />
                      Dietary Restrictions
                    </h4>
                    <p className="text-sm bg-green-50 p-3 rounded-lg">
                      {selectedParticipant.medical.dietaryRestrictions}
                    </p>
                  </div>
                )}

                {/* ADA Accommodations */}
                {selectedParticipant.medical.adaAccommodations && (
                  <div>
                    <h4 className="font-medium flex items-center gap-2 mb-2">
                      <Accessibility className="w-4 h-4 text-indigo-500" />
                      ADA Accommodations
                    </h4>
                    <p className="text-sm bg-indigo-50 p-3 rounded-lg">
                      {selectedParticipant.medical.adaAccommodations}
                    </p>
                  </div>
                )}

                {/* Insurance */}
                {selectedParticipant.insurance.provider && (
                  <div>
                    <h4 className="font-medium flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-gray-500" />
                      Insurance Information
                    </h4>
                    <div className="text-sm bg-gray-50 p-3 rounded-lg space-y-1">
                      <p>
                        <strong>Provider:</strong> {selectedParticipant.insurance.provider}
                      </p>
                      <p>
                        <strong>Policy:</strong> {selectedParticipant.insurance.policyNumber || '-'}
                      </p>
                      <p>
                        <strong>Group:</strong> {selectedParticipant.insurance.groupNumber || '-'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Emergency Contacts */}
                <div>
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <Phone className="w-4 h-4 text-[#0077BE]" />
                    Emergency Contacts
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    {selectedParticipant.emergency.contact1Name && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="font-medium">
                          {selectedParticipant.emergency.contact1Name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {selectedParticipant.emergency.contact1Relation}
                        </p>
                        <a
                          href={`tel:${selectedParticipant.emergency.contact1Phone}`}
                          className="text-[#0077BE] text-sm hover:underline flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                          {selectedParticipant.emergency.contact1Phone}
                        </a>
                      </div>
                    )}
                    {selectedParticipant.emergency.contact2Name && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="font-medium">
                          {selectedParticipant.emergency.contact2Name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {selectedParticipant.emergency.contact2Relation}
                        </p>
                        <a
                          href={`tel:${selectedParticipant.emergency.contact2Phone}`}
                          className="text-[#0077BE] text-sm hover:underline flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                          {selectedParticipant.emergency.contact2Phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Medical Incident History */}
                <div>
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    Medical Incident History ({participantIncidents.length})
                  </h4>
                  {loadingIncidents ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : participantIncidents.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4 bg-gray-50 rounded-lg">
                      No medical incidents recorded for this participant.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {participantIncidents.map((incident: any) => (
                        <div
                          key={incident.id}
                          className={`p-3 rounded-lg border text-sm ${
                            incident.status === 'active'
                              ? 'border-red-200 bg-red-50'
                              : incident.status === 'monitoring'
                                ? 'border-amber-200 bg-amber-50'
                                : 'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{incident.type?.replace(/_/g, ' ')}</span>
                            <div className="flex gap-1">
                              <Badge
                                className={
                                  incident.severity === 'severe'
                                    ? 'bg-red-500'
                                    : incident.severity === 'moderate'
                                      ? 'bg-amber-500'
                                      : 'bg-green-500'
                                }
                              >
                                {incident.severity}
                              </Badge>
                              <Badge
                                className={
                                  incident.status === 'resolved'
                                    ? 'bg-green-500'
                                    : incident.status === 'monitoring'
                                      ? 'bg-amber-500'
                                      : 'bg-red-500'
                                }
                              >
                                {incident.status}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(incident.date), 'MMM d, yyyy')} at {incident.time}
                          </p>
                          <p className="text-xs mt-1 line-clamp-2">{incident.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  <Button
                    className="bg-[#0077BE] hover:bg-[#0077BE]/90"
                    onClick={() => {
                      if (onCreateIncident && selectedParticipant) {
                        setShowProfileModal(false)
                        onCreateIncident(selectedParticipant)
                      }
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Incident
                  </Button>
                  {(selectedParticipant.parentEmail || selectedParticipant.email) && (
                    <Button
                      variant="outline"
                      onClick={() => handleEmailParent(selectedParticipant)}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Email Parent
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => handlePrintProfile(selectedParticipant)}
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print Profile
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Email Parent Modal */}
      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#0077BE]" />
              Email Parent/Guardian
            </DialogTitle>
          </DialogHeader>
          {emailParticipant && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm font-medium">
                  Regarding: {emailParticipant.firstName} {emailParticipant.lastName}
                </p>
                <p className="text-sm text-muted-foreground">
                  To: {emailParticipant.parentEmail || emailParticipant.email}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-subject">Subject</Label>
                <Input
                  id="email-subject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Email subject"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-message">Message</Label>
                <Textarea
                  id="email-message"
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  placeholder="Write your message here..."
                  rows={10}
                  className="resize-none"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                This email will be sent from your organization&apos;s email address via Rapha Medical Platform.
                Your name will be included as the sender.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEmailModal(false)}
              disabled={sendingEmail}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#0077BE] hover:bg-[#0077BE]/90"
              onClick={handleSendEmail}
              disabled={sendingEmail}
            >
              {sendingEmail ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
