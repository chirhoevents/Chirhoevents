'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Users,
  Search,
  Download,
  FileText,
  AlertCircle,
  CheckCircle,
  User,
  Phone,
  Mail,
  Calendar,
  Shield,
  Heart,
  Pill,
  UtensilsCrossed,
  X
} from 'lucide-react'

type ParticipantType = 'youth_u18' | 'youth_o18' | 'chaperone' | 'priest'
type Gender = 'male' | 'female' | 'other'

interface Participant {
  id: string
  firstName: string
  lastName: string
  preferredName: string | null
  age: number | null
  dateOfBirth: string | null
  gender: Gender
  participantType: ParticipantType
  email: string | null
  phone: string | null
  parentEmail: string | null
  parentPhone: string | null
  dietaryRestrictions: string | null
  adaAccommodations: string | null
  liabilityFormCompleted: boolean
  liabilityFormId: string | null
  liabilityFormPdfUrl: string | null
  liabilityFormCompletedAt: string | null
  medicalConditions: string | null
  allergies: string | null
  medications: string | null
  emergencyContact1Name: string | null
  emergencyContact1Phone: string | null
  emergencyContact1Relation: string | null
  emergencyContact2Name: string | null
  emergencyContact2Phone: string | null
  emergencyContact2Relation: string | null
}

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<'all' | ParticipantType>('all')
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null)

  useEffect(() => {
    fetchParticipants()
  }, [])

  useEffect(() => {
    filterParticipants()
  }, [participants, searchTerm, selectedType])

  const fetchParticipants = async () => {
    try {
      const response = await fetch('/api/group-leader/participants')
      if (response.ok) {
        const data = await response.json()
        setParticipants(data.participants)
      }
    } catch (error) {
      console.error('Error fetching participants:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterParticipants = () => {
    let filtered = participants

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(p => p.participantType === selectedType)
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(p =>
        p.firstName.toLowerCase().includes(term) ||
        p.lastName.toLowerCase().includes(term) ||
        (p.preferredName && p.preferredName.toLowerCase().includes(term)) ||
        (p.email && p.email.toLowerCase().includes(term))
      )
    }

    setFilteredParticipants(filtered)
  }

  const getParticipantTypeLabel = (type: ParticipantType): string => {
    const labels = {
      youth_u18: 'Youth U18',
      youth_o18: 'Youth 18+',
      chaperone: 'Chaperone',
      priest: 'Clergy'
    }
    return labels[type]
  }

  const getParticipantTypeBadge = (type: ParticipantType) => {
    const badges = {
      youth_u18: 'bg-blue-100 text-blue-800',
      youth_o18: 'bg-purple-100 text-purple-800',
      chaperone: 'bg-green-100 text-green-800',
      priest: 'bg-amber-100 text-amber-800',
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badges[type]}`}>
        {getParticipantTypeLabel(type)}
      </span>
    )
  }

  const exportToCSV = () => {
    const headers = ['Last Name', 'First Name', 'Preferred Name', 'Type', 'Age', 'Gender', 'Email', 'Phone', 'Form Completed', 'Dietary Restrictions', 'ADA Accommodations']
    const rows = filteredParticipants.map(p => [
      p.lastName,
      p.firstName,
      p.preferredName || '',
      getParticipantTypeLabel(p.participantType),
      p.age || '',
      p.gender,
      p.email || '',
      p.phone || '',
      p.liabilityFormCompleted ? 'Yes' : 'No',
      p.dietaryRestrictions || '',
      p.adaAccommodations || '',
    ])

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'participants.csv'
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-[#1E3A5F]">Loading participants...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">Participants</h1>
        <p className="text-[#6B7280]">
          View and manage all participants in your group
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4 bg-white border-[#D1D5DB]">
          <div className="text-center">
            <p className="text-2xl font-bold text-[#1E3A5F]">{participants.length}</p>
            <p className="text-xs text-[#6B7280] mt-1">Total</p>
          </div>
        </Card>
        <Card className="p-4 bg-white border-[#D1D5DB]">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {participants.filter(p => p.participantType === 'youth_u18').length}
            </p>
            <p className="text-xs text-[#6B7280] mt-1">Youth U18</p>
          </div>
        </Card>
        <Card className="p-4 bg-white border-[#D1D5DB]">
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">
              {participants.filter(p => p.participantType === 'youth_o18').length}
            </p>
            <p className="text-xs text-[#6B7280] mt-1">Youth 18+</p>
          </div>
        </Card>
        <Card className="p-4 bg-white border-[#D1D5DB]">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {participants.filter(p => p.participantType === 'chaperone').length}
            </p>
            <p className="text-xs text-[#6B7280] mt-1">Chaperones</p>
          </div>
        </Card>
        <Card className="p-4 bg-white border-[#D1D5DB]">
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-600">
              {participants.filter(p => p.participantType === 'priest').length}
            </p>
            <p className="text-xs text-[#6B7280] mt-1">Clergy</p>
          </div>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card className="p-6 bg-white border-[#D1D5DB]">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setSelectedType('all')}
              variant={selectedType === 'all' ? 'default' : 'outline'}
              size="sm"
              className={selectedType === 'all' ? 'bg-[#9C8466] hover:bg-[#8B7355] text-white' : 'border-[#1E3A5F] text-[#1E3A5F]'}
            >
              All
            </Button>
            <Button
              onClick={() => setSelectedType('youth_u18')}
              variant={selectedType === 'youth_u18' ? 'default' : 'outline'}
              size="sm"
              className={selectedType === 'youth_u18' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-blue-600 text-blue-600'}
            >
              U18
            </Button>
            <Button
              onClick={() => setSelectedType('youth_o18')}
              variant={selectedType === 'youth_o18' ? 'default' : 'outline'}
              size="sm"
              className={selectedType === 'youth_o18' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'border-purple-600 text-purple-600'}
            >
              18+
            </Button>
            <Button
              onClick={() => setSelectedType('chaperone')}
              variant={selectedType === 'chaperone' ? 'default' : 'outline'}
              size="sm"
              className={selectedType === 'chaperone' ? 'bg-green-600 hover:bg-green-700 text-white' : 'border-green-600 text-green-600'}
            >
              Chaperones
            </Button>
            <Button
              onClick={() => setSelectedType('priest')}
              variant={selectedType === 'priest' ? 'default' : 'outline'}
              size="sm"
              className={selectedType === 'priest' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'border-amber-600 text-amber-600'}
            >
              Clergy
            </Button>
          </div>

          <Button
            onClick={exportToCSV}
            variant="outline"
            size="sm"
            className="border-[#1E3A5F] text-[#1E3A5F]"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </Card>

      {/* Participants List */}
      <Card className="p-6 bg-white border-[#D1D5DB]">
        <h3 className="text-lg font-semibold text-[#1E3A5F] mb-4">
          Participants List ({filteredParticipants.length})
        </h3>

        {filteredParticipants.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-[#9C8466] mx-auto mb-4" />
            <p className="text-[#6B7280]">
              {searchTerm || selectedType !== 'all'
                ? 'No participants match your filters'
                : 'No participants found'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredParticipants.map((participant) => (
              <div
                key={participant.id}
                className="border border-[#E5E7EB] rounded-lg p-4 hover:shadow-sm transition-shadow cursor-pointer"
                onClick={() => setSelectedParticipant(participant)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <User className="h-5 w-5 text-[#9C8466]" />
                      <h4 className="font-medium text-[#1E3A5F]">
                        {participant.firstName} {participant.lastName}
                        {participant.preferredName && (
                          <span className="text-sm text-[#6B7280] ml-2">
                            ({participant.preferredName})
                          </span>
                        )}
                      </h4>
                      {getParticipantTypeBadge(participant.participantType)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-[#6B7280]">
                      {participant.age && (
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>Age: {participant.age}</span>
                        </div>
                      )}
                      {participant.email && (
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-2" />
                          <span className="truncate">{participant.email}</span>
                        </div>
                      )}
                      {participant.phone && (
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-2" />
                          <span>{participant.phone}</span>
                        </div>
                      )}
                    </div>

                    {(participant.dietaryRestrictions || participant.adaAccommodations) && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {participant.dietaryRestrictions && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-orange-100 text-orange-800">
                            <UtensilsCrossed className="h-3 w-3 mr-1" />
                            Dietary: {participant.dietaryRestrictions}
                          </span>
                        )}
                        {participant.adaAccommodations && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                            <Shield className="h-3 w-3 mr-1" />
                            ADA: {participant.adaAccommodations}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="ml-4 text-right">
                    {participant.liabilityFormCompleted ? (
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="h-5 w-5 mr-1" />
                        <span className="text-sm font-medium">Form Complete</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-amber-600">
                        <AlertCircle className="h-5 w-5 mr-1" />
                        <span className="text-sm font-medium">Form Pending</span>
                      </div>
                    )}
                    {participant.liabilityFormPdfUrl && (
                      <a
                        href={participant.liabilityFormPdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center text-sm text-[#9C8466] hover:text-[#8B7355] mt-2"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        PDF
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Participant Detail Modal */}
      {selectedParticipant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-[#E5E7EB] p-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-[#1E3A5F]">
                  {selectedParticipant.firstName} {selectedParticipant.lastName}
                </h3>
                {getParticipantTypeBadge(selectedParticipant.participantType)}
              </div>
              <button
                onClick={() => setSelectedParticipant(null)}
                className="text-[#6B7280] hover:text-[#1E3A5F]"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h4 className="font-semibold text-[#1E3A5F] mb-3">Basic Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[#6B7280]">Full Name</p>
                    <p className="font-medium text-[#1F2937]">
                      {selectedParticipant.firstName} {selectedParticipant.lastName}
                    </p>
                  </div>
                  {selectedParticipant.preferredName && (
                    <div>
                      <p className="text-[#6B7280]">Preferred Name</p>
                      <p className="font-medium text-[#1F2937]">{selectedParticipant.preferredName}</p>
                    </div>
                  )}
                  {selectedParticipant.age && (
                    <div>
                      <p className="text-[#6B7280]">Age</p>
                      <p className="font-medium text-[#1F2937]">{selectedParticipant.age}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[#6B7280]">Gender</p>
                    <p className="font-medium text-[#1F2937] capitalize">{selectedParticipant.gender}</p>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h4 className="font-semibold text-[#1E3A5F] mb-3">Contact Information</h4>
                <div className="grid grid-cols-1 gap-4 text-sm">
                  {selectedParticipant.email && (
                    <div>
                      <p className="text-[#6B7280]">Email</p>
                      <p className="font-medium text-[#1F2937]">{selectedParticipant.email}</p>
                    </div>
                  )}
                  {selectedParticipant.phone && (
                    <div>
                      <p className="text-[#6B7280]">Phone</p>
                      <p className="font-medium text-[#1F2937]">{selectedParticipant.phone}</p>
                    </div>
                  )}
                  {selectedParticipant.parentEmail && (
                    <div>
                      <p className="text-[#6B7280]">Parent Email</p>
                      <p className="font-medium text-[#1F2937]">{selectedParticipant.parentEmail}</p>
                    </div>
                  )}
                  {selectedParticipant.parentPhone && (
                    <div>
                      <p className="text-[#6B7280]">Parent Phone</p>
                      <p className="font-medium text-[#1F2937]">{selectedParticipant.parentPhone}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Emergency Contacts */}
              {(selectedParticipant.emergencyContact1Name || selectedParticipant.emergencyContact2Name) && (
                <div>
                  <h4 className="font-semibold text-[#1E3A5F] mb-3 flex items-center">
                    <Phone className="h-4 w-4 mr-2" />
                    Emergency Contacts
                  </h4>
                  <div className="space-y-4 text-sm">
                    {selectedParticipant.emergencyContact1Name && (
                      <div className="bg-[#F9FAFB] p-3 rounded">
                        <p className="font-medium text-[#1F2937]">{selectedParticipant.emergencyContact1Name}</p>
                        <p className="text-[#6B7280]">{selectedParticipant.emergencyContact1Phone}</p>
                        <p className="text-[#6B7280] text-xs">{selectedParticipant.emergencyContact1Relation}</p>
                      </div>
                    )}
                    {selectedParticipant.emergencyContact2Name && (
                      <div className="bg-[#F9FAFB] p-3 rounded">
                        <p className="font-medium text-[#1F2937]">{selectedParticipant.emergencyContact2Name}</p>
                        <p className="text-[#6B7280]">{selectedParticipant.emergencyContact2Phone}</p>
                        <p className="text-[#6B7280] text-xs">{selectedParticipant.emergencyContact2Relation}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Medical Information */}
              {(selectedParticipant.medicalConditions || selectedParticipant.allergies || selectedParticipant.medications) && (
                <div>
                  <h4 className="font-semibold text-[#1E3A5F] mb-3 flex items-center">
                    <Heart className="h-4 w-4 mr-2" />
                    Medical Information
                  </h4>
                  <div className="space-y-3 text-sm">
                    {selectedParticipant.medicalConditions && (
                      <div>
                        <p className="text-[#6B7280] font-medium">Conditions</p>
                        <p className="text-[#1F2937]">{selectedParticipant.medicalConditions}</p>
                      </div>
                    )}
                    {selectedParticipant.allergies && (
                      <div>
                        <p className="text-[#6B7280] font-medium">Allergies</p>
                        <p className="text-[#1F2937]">{selectedParticipant.allergies}</p>
                      </div>
                    )}
                    {selectedParticipant.medications && (
                      <div className="flex items-start">
                        <Pill className="h-4 w-4 mr-2 mt-0.5 text-[#9C8466]" />
                        <div className="flex-1">
                          <p className="text-[#6B7280] font-medium">Medications</p>
                          <p className="text-[#1F2937]">{selectedParticipant.medications}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Dietary & ADA */}
              {(selectedParticipant.dietaryRestrictions || selectedParticipant.adaAccommodations) && (
                <div>
                  <h4 className="font-semibold text-[#1E3A5F] mb-3">Special Needs</h4>
                  <div className="space-y-3 text-sm">
                    {selectedParticipant.dietaryRestrictions && (
                      <div>
                        <p className="text-[#6B7280] font-medium">Dietary Restrictions</p>
                        <p className="text-[#1F2937]">{selectedParticipant.dietaryRestrictions}</p>
                      </div>
                    )}
                    {selectedParticipant.adaAccommodations && (
                      <div>
                        <p className="text-[#6B7280] font-medium">ADA Accommodations</p>
                        <p className="text-[#1F2937]">{selectedParticipant.adaAccommodations}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Liability Form Status */}
              <div>
                <h4 className="font-semibold text-[#1E3A5F] mb-3 flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Liability Form
                </h4>
                {selectedParticipant.liabilityFormCompleted ? (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center text-green-800 mb-2">
                      <CheckCircle className="h-5 w-5 mr-2" />
                      <span className="font-medium">Form Completed</span>
                    </div>
                    {selectedParticipant.liabilityFormCompletedAt && (
                      <p className="text-sm text-green-700">
                        Completed on {new Date(selectedParticipant.liabilityFormCompletedAt).toLocaleDateString()}
                      </p>
                    )}
                    {selectedParticipant.liabilityFormPdfUrl && (
                      <a
                        href={selectedParticipant.liabilityFormPdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm text-green-700 hover:text-green-800 mt-2"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download PDF
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="bg-amber-50 p-4 rounded-lg">
                    <div className="flex items-center text-amber-800">
                      <AlertCircle className="h-5 w-5 mr-2" />
                      <span className="font-medium">Form Not Completed</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-[#E5E7EB] p-6">
              <Button
                onClick={() => setSelectedParticipant(null)}
                className="w-full bg-[#9C8466] hover:bg-[#8B7355] text-white"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
