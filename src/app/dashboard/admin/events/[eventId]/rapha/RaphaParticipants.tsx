'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

interface Participant {
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

interface RaphaParticipantsProps {
  eventId: string
}

export default function RaphaParticipants({ eventId }: RaphaParticipantsProps) {
  const searchParams = useSearchParams()
  const initialFilter = searchParams.get('filter') || 'all'
  const initialSearch = searchParams.get('search') || ''

  const [loading, setLoading] = useState(true)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [search, setSearch] = useState(initialSearch)
  const [filter, setFilter] = useState(initialFilter)
  const [sortBy, setSortBy] = useState('name')
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null)
  const [showProfileModal, setShowProfileModal] = useState(false)

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
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm">
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

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  <Button className="bg-[#0077BE] hover:bg-[#0077BE]/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Incident
                  </Button>
                  {selectedParticipant.parentEmail && (
                    <Button variant="outline">
                      <Mail className="w-4 h-4 mr-2" />
                      Email Parent
                    </Button>
                  )}
                  <Button variant="outline">
                    <Printer className="w-4 h-4 mr-2" />
                    Print Profile
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
