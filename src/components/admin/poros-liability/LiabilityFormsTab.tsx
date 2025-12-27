'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select'
import {
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Download,
  FileText,
  Loader2,
  AlertTriangle
} from 'lucide-react'

interface LiabilityFormsTabProps {
  eventId: string
  onUpdate: () => void
}

interface Participant {
  id: string
  firstName: string
  lastName: string
  age: number | null
  gender: string | null
  participantType: string | null
  formStatus: string
  formId: string | null
  pdfUrl: string | null
  allergies: string | null
  medications: string | null
  medicalConditions: string | null
  dietaryRestrictions: string | null
  tShirtSize: string | null
  emergencyContact1Name: string | null
  emergencyContact1Phone: string | null
  completedAt: string | null
  approvedAt: string | null
  approvedByName: string | null
  deniedReason: string | null
}

interface Group {
  id: string
  groupName: string
  parishName: string | null
  totalSpots: number
  submittedCount: number
  approvedCount: number
  pendingCount: number
  deniedCount: number
  participants: Participant[]
}

export function LiabilityFormsTab({ eventId, onUpdate }: LiabilityFormsTabProps) {
  const [groups, setGroups] = useState<Group[]>([])
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState({
    status: 'all',
    searchTerm: ''
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGroups()
  }, [eventId, filters])

  async function fetchGroups() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        status: filters.status,
        search: filters.searchTerm
      })

      const response = await fetch(
        `/api/admin/events/${eventId}/poros-liability/groups?${params}`
      )
      if (response.ok) {
        const data = await response.json()
        setGroups(data)
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error)
    } finally {
      setLoading(false)
    }
  }

  function toggleGroup(groupId: string) {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId)
    } else {
      newExpanded.add(groupId)
    }
    setExpandedGroups(newExpanded)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#1E3A5F]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="p-4 bg-white border-[#D1D5DB]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Status</label>
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters({ ...filters, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Forms</SelectItem>
                <SelectItem value="pending">Pending Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="denied">Denied</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2">
            <label className="text-sm text-gray-600 mb-1 block">Search</label>
            <Input
              placeholder="Search by group name, parish, or participant name..."
              value={filters.searchTerm}
              onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
            />
          </div>
        </div>
      </Card>

      {/* Groups List */}
      <div className="space-y-3">
        {groups.length === 0 ? (
          <Card className="p-8 text-center text-gray-500 bg-white border-[#D1D5DB]">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No liability forms found</p>
          </Card>
        ) : (
          groups.map((group) => (
            <Card key={group.id} className="overflow-hidden bg-white border-[#D1D5DB]">
              {/* Group Header */}
              <div
                className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition"
                onClick={() => toggleGroup(group.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {expandedGroups.has(group.id) ? (
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-600" />
                    )}

                    <div className="flex-1">
                      <h3 className="font-semibold text-[#1E3A5F]">{group.groupName}</h3>
                      <p className="text-sm text-gray-600">{group.parishName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Progress */}
                    <div className="text-sm">
                      <span className="font-medium">{group.submittedCount}</span>
                      <span className="text-gray-600"> / {group.totalSpots} forms</span>
                    </div>

                    {/* Status Badges */}
                    <div className="flex gap-2">
                      {group.approvedCount > 0 && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          {group.approvedCount}
                        </span>
                      )}
                      {group.pendingCount > 0 && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {group.pendingCount}
                        </span>
                      )}
                      {group.deniedCount > 0 && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          {group.deniedCount}
                        </span>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="w-32 hidden md:block">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 transition-all"
                          style={{
                            width: `${group.totalSpots > 0 ? (group.submittedCount / group.totalSpots) * 100 : 0}%`
                          }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 text-center mt-1">
                        {group.totalSpots > 0 ? Math.round((group.submittedCount / group.totalSpots) * 100) : 0}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded - Participants List */}
              {expandedGroups.has(group.id) && (
                <div className="p-4 border-t">
                  {group.participants.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No forms submitted yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {group.participants.map((participant) => (
                        <ParticipantRow
                          key={participant.id}
                          participant={participant}
                          eventId={eventId}
                          onUpdate={() => {
                            fetchGroups()
                            onUpdate()
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

// Participant Row Component
function ParticipantRow({
  participant,
  eventId,
  onUpdate
}: {
  participant: Participant
  eventId: string
  onUpdate: () => void
}) {
  const [showDetails, setShowDetails] = useState(false)
  const [processing, setProcessing] = useState(false)

  async function handleApprove() {
    if (!confirm(`Approve liability form for ${participant.firstName} ${participant.lastName}?`)) {
      return
    }

    setProcessing(true)
    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/poros-liability/forms/${participant.formId}/approve`,
        { method: 'POST' }
      )

      if (response.ok) {
        alert('Form approved successfully!')
        onUpdate()
      } else {
        const error = await response.json()
        alert(`Failed to approve: ${error.error}`)
      }
    } catch (error) {
      console.error('Approval error:', error)
      alert('Failed to approve form')
    } finally {
      setProcessing(false)
    }
  }

  async function handleDeny() {
    const reason = prompt(`Enter reason for denying ${participant.firstName} ${participant.lastName}'s form:`)
    if (!reason) return

    setProcessing(true)
    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/poros-liability/forms/${participant.formId}/deny`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason })
        }
      )

      if (response.ok) {
        alert('Form denied. Participant will be notified.')
        onUpdate()
      } else {
        const error = await response.json()
        alert(`Failed to deny: ${error.error}`)
      }
    } catch (error) {
      console.error('Deny error:', error)
      alert('Failed to deny form')
    } finally {
      setProcessing(false)
    }
  }

  const hasMedicalInfo = participant.allergies || participant.medications || participant.medicalConditions

  // Youth (under 18) forms don't require admin approval
  const isYouth = participant.participantType === 'youth' || (participant.age !== null && participant.age < 18)

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="p-3 flex items-center justify-between bg-white hover:bg-gray-50">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            {/* Status Icon */}
            {isYouth ? (
              <CheckCircle className="w-5 h-5 text-green-600" title="Youth - No approval required" />
            ) : participant.formStatus === 'approved' ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : participant.formStatus === 'pending' ? (
              <Clock className="w-5 h-5 text-yellow-600" />
            ) : participant.formStatus === 'denied' ? (
              <XCircle className="w-5 h-5 text-red-600" />
            ) : null}

            {/* Name & Info */}
            <div className="flex-1">
              <div className="font-medium text-[#1E3A5F]">
                {participant.firstName} {participant.lastName}
              </div>
              <div className="text-sm text-gray-600">
                Age: {participant.age || 'N/A'} |{' '}
                {participant.gender || 'N/A'} |{' '}
                {participant.participantType?.replace('_', ' ')}
              </div>
            </div>

            {/* Medical Alerts */}
            {hasMedicalInfo && (
              <div className="px-3 py-1 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Medical Info
              </div>
            )}

            {/* Shirt Size */}
            {participant.tShirtSize && (
              <div className="text-xs text-gray-500">
                Shirt: {participant.tShirtSize}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowDetails(!showDetails)}
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </Button>

          {participant.formId && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => window.open(`/api/liability/forms/${participant.formId}/pdf`, '_blank')}
              title="Download PDF"
            >
              <Download className="w-4 h-4" />
            </Button>
          )}

          {/* Only show approve/deny for adults (chaperones, priests) - youth forms don't require approval */}
          {!isYouth && participant.formStatus === 'pending' && (
            <>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={handleApprove}
                disabled={processing}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
                onClick={handleDeny}
                disabled={processing}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Deny
              </Button>
            </>
          )}
          {isYouth && (
            <span className="text-xs text-gray-500 px-2">No approval needed</span>
          )}
        </div>
      </div>

      {/* Details Panel */}
      {showDetails && (
        <div className="p-4 bg-gray-50 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {/* Medical Information */}
            {hasMedicalInfo && (
              <div className="col-span-full">
                <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Medical Information
                </h4>
                <Card className="p-3 bg-red-50 border-red-200">
                  {participant.allergies && (
                    <div className="mb-2">
                      <span className="font-medium">Allergies:</span>
                      <p className="text-red-700">{participant.allergies}</p>
                    </div>
                  )}
                  {participant.medications && (
                    <div className="mb-2">
                      <span className="font-medium">Medications:</span>
                      <p className="text-red-700">{participant.medications}</p>
                    </div>
                  )}
                  {participant.medicalConditions && (
                    <div>
                      <span className="font-medium">Conditions:</span>
                      <p className="text-red-700">{participant.medicalConditions}</p>
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* Dietary Restrictions */}
            {participant.dietaryRestrictions && (
              <div>
                <span className="text-gray-600">Dietary Restrictions:</span>
                <p className="font-medium">{participant.dietaryRestrictions}</p>
              </div>
            )}

            {/* Other Details */}
            <div>
              <span className="text-gray-600">Shirt Size:</span>
              <p className="font-medium">{participant.tShirtSize || 'Not provided'}</p>
            </div>
            <div>
              <span className="text-gray-600">Emergency Contact:</span>
              <p className="font-medium">{participant.emergencyContact1Name || 'Not provided'}</p>
              <p className="text-xs text-gray-500">{participant.emergencyContact1Phone}</p>
            </div>
            <div>
              <span className="text-gray-600">Submitted:</span>
              <p className="font-medium">
                {participant.completedAt
                  ? new Date(participant.completedAt).toLocaleDateString()
                  : 'Not submitted'}
              </p>
            </div>

            {/* Approval Status */}
            {participant.formStatus !== 'pending' && (
              <div className="col-span-full pt-3 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-medium ${
                    participant.formStatus === 'approved' ? 'text-green-600' :
                    participant.formStatus === 'denied' ? 'text-red-600' :
                    'text-gray-600'
                  }`}>
                    {participant.formStatus?.toUpperCase()}
                  </span>
                </div>
                {participant.approvedAt && (
                  <p className="text-xs text-gray-500 mt-1">
                    by {participant.approvedByName} on {new Date(participant.approvedAt).toLocaleString()}
                  </p>
                )}
                {participant.deniedReason && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                    <span className="font-medium">Reason:</span> {participant.deniedReason}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
