'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
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
  AlertTriangle,
  Printer
} from 'lucide-react'
import { hasAnyMedicalInfo, hasRealMedicalText } from '@/lib/medical-info'

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
  youthCount: number
  youthSubmittedCount: number
  chaperoneCount: number
  chaperoneSubmittedCount: number
  participants: Participant[]
}

interface StaffMember {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  role: string
  isVendorStaff: boolean
  tShirtSize: string | null
  dietaryRestrictions: string | null
  porosAccessCode: string | null
  formStatus: string
  formId: string | null
  formCompleted: boolean
  completedAt: string | null
  approvedAt: string | null
  approvedByName: string | null
  deniedReason: string | null
  allergies: string | null
  medications: string | null
  medicalConditions: string | null
  emergencyContact1Name: string | null
  emergencyContact1Phone: string | null
}

interface StaffStats {
  totalCount: number
  submittedCount: number
  pendingCount: number
  approvedCount: number
}

const BLANK_FORM_TYPES = [
  { value: 'youth_u18', label: 'Youth (Under 18)' },
  { value: 'youth_o18_chaperone', label: 'Adults & Chaperones' },
  { value: 'clergy', label: 'Clergy & Seminarians' },
  { value: 'religious', label: 'Religious (Sisters & Brothers)' },
] as const

export function LiabilityFormsTab({ eventId, onUpdate }: LiabilityFormsTabProps) {
  const { getToken } = useAuth()
  const [groups, setGroups] = useState<Group[]>([])
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [staffStats, setStaffStats] = useState<StaffStats | null>(null)
  const [staffExpanded, setStaffExpanded] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [printingGroups, setPrintingGroups] = useState<Set<string>>(new Set())
  const [downloadingBlank, setDownloadingBlank] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    status: 'all',
    searchTerm: ''
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGroups()
    fetchStaff()
  }, [eventId, filters])

  async function fetchGroups() {
    setLoading(true)
    try {
      const token = await getToken()
      const params = new URLSearchParams({
        status: filters.status,
        search: filters.searchTerm
      })

      const response = await fetch(
        `/api/admin/events/${eventId}/poros-liability/groups?${params}`,
        { headers: token ? { 'Authorization': `Bearer ${token}` } : {} }
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

  async function fetchStaff() {
    try {
      const token = await getToken()
      const params = new URLSearchParams({
        status: filters.status,
        search: filters.searchTerm,
      })
      const response = await fetch(
        `/api/admin/events/${eventId}/poros-liability/staff?${params}`,
        { headers: token ? { 'Authorization': `Bearer ${token}` } : {} }
      )
      if (response.ok) {
        const data = await response.json()
        setStaffMembers(data.members || [])
        setStaffStats(data.stats || null)
      }
    } catch (error) {
      console.error('Failed to fetch staff forms:', error)
    }
  }

  async function handlePrintAll(e: React.MouseEvent, group: Group) {
    e.stopPropagation()
    if (group.submittedCount === 0) return
    setPrintingGroups(prev => new Set(prev).add(group.id))
    try {
      const token = await getToken()
      const res = await fetch(
        `/api/admin/events/${eventId}/poros-liability/groups/${group.id}/print-all`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      )
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Failed to generate PDF packet')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `liability-forms-${group.groupName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Failed to generate PDF packet')
    } finally {
      setPrintingGroups(prev => { const s = new Set(prev); s.delete(group.id); return s })
    }
  }

  async function handleDownloadBlank(formType: string) {
    setDownloadingBlank(formType)
    try {
      const token = await getToken()
      const res = await fetch(
        `/api/admin/events/${eventId}/poros-liability/blank-forms?formType=${formType}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      )
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Failed to generate blank form')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `blank-form-${formType}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Failed to generate blank form')
    } finally {
      setDownloadingBlank(null)
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

      {/* Blank Form Downloads */}
      <Card className="p-4 bg-white border-[#D1D5DB]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <FileText className="w-4 h-4" />
            Print Blank Forms:
          </div>
          {BLANK_FORM_TYPES.map(({ value, label }) => (
            <Button
              key={value}
              size="sm"
              variant="outline"
              onClick={() => handleDownloadBlank(value)}
              disabled={downloadingBlank === value}
              className="text-xs"
            >
              {downloadingBlank === value ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 mr-1.5" />
              )}
              {label}
            </Button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Download a pre-filled event header form for participants who prefer to complete a paper copy in person.
        </p>
      </Card>

      {/* Staff & Vendors Section */}
      {staffStats !== null && (
        <div className="space-y-3">
          <Card className="overflow-hidden bg-white border-[#D1D5DB]">
            <div
              className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition"
              onClick={() => setStaffExpanded(!staffExpanded)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {staffExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  )}
                  <div>
                    <h3 className="font-semibold text-[#1E3A5F]">Staff, Volunteers &amp; Vendors</h3>
                    <p className="text-sm text-gray-600">
                      {staffStats?.submittedCount ?? 0} of {staffStats?.totalCount ?? 0} forms submitted
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm">
                    <span className="font-medium">{staffStats?.submittedCount ?? 0}</span>
                    <span className="text-gray-600"> / {staffStats?.totalCount ?? 0} forms</span>
                  </div>
                  <div className="flex gap-2">
                    {(staffStats?.approvedCount ?? 0) > 0 && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {staffStats!.approvedCount}
                      </span>
                    )}
                    {(staffStats?.pendingCount ?? 0) > 0 && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {staffStats!.pendingCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {staffExpanded && (
              <div className="p-4 border-t">
                {staffMembers.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No matching forms found
                  </p>
                ) : (
                  <div className="space-y-2">
                    {staffMembers.map((member) => (
                      <StaffMemberRow
                        key={member.id}
                        member={member}
                        eventId={eventId}
                        onUpdate={() => {
                          fetchStaff()
                          onUpdate()
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

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

                    {/* Youth & Chaperone Breakdown */}
                    <div className="hidden lg:flex items-center gap-3 text-xs">
                      <div className="px-2 py-1 bg-blue-50 border border-blue-200 rounded">
                        <span className="text-blue-700 font-medium">Youth:</span>
                        <span className="ml-1 font-bold text-blue-600">
                          {group.youthSubmittedCount}
                        </span>
                      </div>
                      <div className="px-2 py-1 bg-purple-50 border border-purple-200 rounded">
                        <span className="text-purple-700 font-medium">Chaperones:</span>
                        <span className="ml-1 font-bold text-purple-600">
                          {group.chaperoneSubmittedCount}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
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

                    {/* Print All Forms */}
                    {group.submittedCount > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => handlePrintAll(e, group)}
                        disabled={printingGroups.has(group.id)}
                        title="Download all forms as a single PDF"
                        className="hidden sm:flex items-center gap-1.5 text-xs"
                      >
                        {printingGroups.has(group.id) ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Printer className="w-3.5 h-3.5" />
                        )}
                        {printingGroups.has(group.id) ? 'Building…' : 'Print All'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded - Participants List */}
              {expandedGroups.has(group.id) && (
                <div className="p-4 border-t">
                  {/* Mobile Youth/Chaperone Breakdown */}
                  <div className="lg:hidden flex flex-wrap gap-2 mb-4 pb-4 border-b">
                    <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg flex-1 min-w-[100px]">
                      <div className="text-xs text-blue-700 font-medium">Youth Forms</div>
                      <div className="text-lg font-bold text-blue-600">
                        {group.youthSubmittedCount}
                      </div>
                    </div>
                    <div className="px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg flex-1 min-w-[100px]">
                      <div className="text-xs text-purple-700 font-medium">Chaperone Forms</div>
                      <div className="text-lg font-bold text-purple-600">
                        {group.chaperoneSubmittedCount}
                      </div>
                    </div>
                  </div>

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

// Staff Member Row Component
function StaffMemberRow({
  member,
  eventId,
  onUpdate,
}: {
  member: StaffMember
  eventId: string
  onUpdate: () => void
}) {
  const { getToken } = useAuth()
  const [showDetails, setShowDetails] = useState(false)
  const [processing, setProcessing] = useState(false)

  async function handleApprove() {
    if (!member.formId) return
    if (!confirm(`Approve liability form for ${member.firstName} ${member.lastName}?`)) return

    setProcessing(true)
    try {
      const token = await getToken()
      const response = await fetch(
        `/api/admin/events/${eventId}/poros-liability/forms/${member.formId}/approve`,
        { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {} }
      )
      if (response.ok) {
        onUpdate()
      } else {
        const err = await response.json()
        alert(`Failed to approve: ${err.error}`)
      }
    } catch {
      alert('Failed to approve form')
    } finally {
      setProcessing(false)
    }
  }

  async function handleDeny() {
    if (!member.formId) return
    const reason = prompt(`Enter reason for denying ${member.firstName} ${member.lastName}'s form:`)
    if (!reason) return

    setProcessing(true)
    try {
      const token = await getToken()
      const response = await fetch(
        `/api/admin/events/${eventId}/poros-liability/forms/${member.formId}/deny`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ reason }),
        }
      )
      if (response.ok) {
        onUpdate()
      } else {
        const err = await response.json()
        alert(`Failed to deny: ${err.error}`)
      }
    } catch {
      alert('Failed to deny form')
    } finally {
      setProcessing(false)
    }
  }

  const hasMedicalInfo = hasAnyMedicalInfo(member)
  const statusLabel =
    member.formStatus === 'not_submitted' ? 'Not Submitted' :
    member.formStatus === 'pending' ? 'Pending Review' :
    member.formStatus === 'approved' ? 'Approved' :
    member.formStatus === 'denied' ? 'Denied' : member.formStatus

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="p-3 flex items-center justify-between bg-white hover:bg-gray-50">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            {member.formStatus === 'approved' ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : member.formStatus === 'pending' ? (
              <Clock className="w-5 h-5 text-yellow-600" />
            ) : member.formStatus === 'denied' ? (
              <XCircle className="w-5 h-5 text-red-600" />
            ) : (
              <Clock className="w-5 h-5 text-gray-400" />
            )}

            <div className="flex-1">
              <div className="font-medium text-[#1E3A5F]">
                {member.firstName} {member.lastName}
                {member.isVendorStaff && (
                  <span className="ml-2 text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">
                    Vendor
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600">
                {member.role} · {statusLabel}
              </div>
            </div>

            {hasMedicalInfo && (
              <div className="px-3 py-1 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Medical Info
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setShowDetails(!showDetails)} title="View Details">
            <Eye className="w-4 h-4" />
          </Button>

          {member.formId && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => window.open(`/api/liability/forms/${member.formId}/pdf`, '_blank')}
              title="Download PDF"
            >
              <Download className="w-4 h-4" />
            </Button>
          )}

          {member.formId && member.formStatus === 'pending' && (
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

          {!member.formCompleted && (
            <span className="text-xs text-gray-400 px-2">No form yet</span>
          )}
        </div>
      </div>

      {showDetails && (
        <div className="p-4 bg-gray-50 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {hasMedicalInfo && (
              <div className="col-span-full">
                <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Medical Information
                </h4>
                <Card className="p-3 bg-red-50 border-red-200">
                  {hasRealMedicalText(member.allergies) && (
                    <div className="mb-2">
                      <span className="font-medium">Allergies:</span>
                      <p className="text-red-700">{member.allergies}</p>
                    </div>
                  )}
                  {hasRealMedicalText(member.medications) && (
                    <div className="mb-2">
                      <span className="font-medium">Medications:</span>
                      <p className="text-red-700">{member.medications}</p>
                    </div>
                  )}
                  {hasRealMedicalText(member.medicalConditions) && (
                    <div>
                      <span className="font-medium">Conditions:</span>
                      <p className="text-red-700">{member.medicalConditions}</p>
                    </div>
                  )}
                </Card>
              </div>
            )}

            <div>
              <span className="text-gray-600">Email:</span>
              <p className="font-medium">{member.email}</p>
            </div>
            <div>
              <span className="text-gray-600">Phone:</span>
              <p className="font-medium">{member.phone}</p>
            </div>
            {member.tShirtSize && (
              <div>
                <span className="text-gray-600">Shirt Size:</span>
                <p className="font-medium">{member.tShirtSize}</p>
              </div>
            )}
            {member.emergencyContact1Name && (
              <div>
                <span className="text-gray-600">Emergency Contact:</span>
                <p className="font-medium">{member.emergencyContact1Name}</p>
                <p className="text-xs text-gray-500">{member.emergencyContact1Phone}</p>
              </div>
            )}
            {member.completedAt && (
              <div>
                <span className="text-gray-600">Submitted:</span>
                <p className="font-medium">{new Date(member.completedAt).toLocaleDateString()}</p>
              </div>
            )}

            {member.formStatus === 'approved' && member.approvedAt && (
              <div className="col-span-full pt-3 border-t">
                <span className="text-green-600 font-medium">Approved</span>
                {member.approvedByName && (
                  <p className="text-xs text-gray-500 mt-1">
                    by {member.approvedByName} on {new Date(member.approvedAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}
            {member.formStatus === 'denied' && member.deniedReason && (
              <div className="col-span-full pt-3 border-t">
                <div className="p-2 bg-red-50 border border-red-200 rounded text-xs">
                  <span className="font-medium">Denied — Reason:</span> {member.deniedReason}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
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
  const { getToken } = useAuth()
  const [showDetails, setShowDetails] = useState(false)
  const [processing, setProcessing] = useState(false)

  async function handleApprove() {
    if (!confirm(`Approve liability form for ${participant.firstName} ${participant.lastName}?`)) {
      return
    }

    setProcessing(true)
    try {
      const token = await getToken()
      const response = await fetch(
        `/api/admin/events/${eventId}/poros-liability/forms/${participant.formId}/approve`,
        {
          method: 'POST',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        }
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
      const token = await getToken()
      const response = await fetch(
        `/api/admin/events/${eventId}/poros-liability/forms/${participant.formId}/deny`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
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

  const hasMedicalInfo = hasAnyMedicalInfo(participant)

  // Youth (under 18) forms don't require admin approval
  const isYouth = participant.participantType === 'youth' || (participant.age !== null && participant.age < 18)

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="p-3 flex items-center justify-between bg-white hover:bg-gray-50">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            {/* Status Icon */}
            {isYouth ? (
              <span title="Youth - No approval required">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </span>
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
                  {hasRealMedicalText(participant.allergies) && (
                    <div className="mb-2">
                      <span className="font-medium">Allergies:</span>
                      <p className="text-red-700">{participant.allergies}</p>
                    </div>
                  )}
                  {hasRealMedicalText(participant.medications) && (
                    <div className="mb-2">
                      <span className="font-medium">Medications:</span>
                      <p className="text-red-700">{participant.medications}</p>
                    </div>
                  )}
                  {hasRealMedicalText(participant.medicalConditions) && (
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
