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
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Download,
  FileText,
  Loader2,
  AlertTriangle,
  User,
  Mail,
  Trash2,
  RefreshCw
} from 'lucide-react'

interface IndividualFormsTabProps {
  eventId: string
  onUpdate: () => void
}

interface IndividualForm {
  id: string
  registrationId: string
  confirmationCode: string
  firstName: string
  lastName: string
  email: string
  age: number | null
  gender: string | null
  formStatus: 'not_started' | 'pending' | 'completed' | 'approved' | 'denied'
  formId: string | null
  formType: string | null
  pdfUrl: string | null
  allergies: string | null
  medications: string | null
  medicalConditions: string | null
  dietaryRestrictions: string | null
  tShirtSize: string | null
  emergencyContact1Name: string | null
  emergencyContact1Phone: string | null
  completedAt: string | null
  parentEmail: string | null
}

export function IndividualFormsTab({ eventId, onUpdate }: IndividualFormsTabProps) {
  const { getToken } = useAuth()
  const [individuals, setIndividuals] = useState<IndividualForm[]>([])
  const [filters, setFilters] = useState({
    status: 'all',
    searchTerm: ''
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchIndividuals()
  }, [eventId, filters])

  async function fetchIndividuals() {
    setLoading(true)
    try {
      const token = await getToken()
      const params = new URLSearchParams({
        status: filters.status,
        search: filters.searchTerm
      })

      const response = await fetch(
        `/api/admin/events/${eventId}/poros-liability/individuals?${params}`,
        { headers: token ? { 'Authorization': `Bearer ${token}` } : {} }
      )
      if (response.ok) {
        const data = await response.json()
        setIndividuals(data)
      }
    } catch (error) {
      console.error('Failed to fetch individuals:', error)
    } finally {
      setLoading(false)
    }
  }

  const stats = {
    total: individuals.length,
    completed: individuals.filter(i => i.formStatus === 'completed' || i.formStatus === 'approved').length,
    pending: individuals.filter(i => i.formStatus === 'pending').length,
    notStarted: individuals.filter(i => i.formStatus === 'not_started').length,
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
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 bg-white border-[#D1D5DB]">
          <div className="text-sm text-gray-600">Total Individuals</div>
          <div className="text-2xl font-bold text-[#1E3A5F]">{stats.total}</div>
        </Card>
        <Card className="p-4 bg-white border-[#D1D5DB]">
          <div className="text-sm text-gray-600">Forms Completed</div>
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
        </Card>
        <Card className="p-4 bg-white border-[#D1D5DB]">
          <div className="text-sm text-gray-600">Pending (Parent)</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
        </Card>
        <Card className="p-4 bg-white border-[#D1D5DB]">
          <div className="text-sm text-gray-600">Not Started</div>
          <div className="text-2xl font-bold text-gray-500">{stats.notStarted}</div>
        </Card>
      </div>

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
                <SelectItem value="all">All Registrations</SelectItem>
                <SelectItem value="completed">Form Completed</SelectItem>
                <SelectItem value="pending">Pending (Waiting on Parent)</SelectItem>
                <SelectItem value="not_started">Not Started</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2">
            <label className="text-sm text-gray-600 mb-1 block">Search</label>
            <Input
              placeholder="Search by name, email, or confirmation code..."
              value={filters.searchTerm}
              onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
            />
          </div>
        </div>
      </Card>

      {/* Individuals List */}
      <div className="space-y-3">
        {individuals.length === 0 ? (
          <Card className="p-8 text-center text-gray-500 bg-white border-[#D1D5DB]">
            <User className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No individual registrations found</p>
            <p className="text-sm mt-2">Individual registrations with liability forms enabled will appear here.</p>
          </Card>
        ) : (
          individuals.map((individual) => (
            <IndividualRow
              key={individual.id}
              individual={individual}
              eventId={eventId}
              onUpdate={() => {
                fetchIndividuals()
                onUpdate()
              }}
            />
          ))
        )}
      </div>
    </div>
  )
}

// Individual Row Component
function IndividualRow({
  individual,
  eventId,
  onUpdate
}: {
  individual: IndividualForm
  eventId: string
  onUpdate: () => void
}) {
  const { getToken } = useAuth()
  const [showDetails, setShowDetails] = useState(false)
  const [processing, setProcessing] = useState(false)

  async function handleResendEmail() {
    if (!confirm(`Resend liability form email to ${individual.firstName} ${individual.lastName}?`)) {
      return
    }

    setProcessing(true)
    try {
      const token = await getToken()
      const response = await fetch(
        `/api/admin/events/${eventId}/poros-liability/individuals/${individual.registrationId}/resend`,
        {
          method: 'POST',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        }
      )

      if (response.ok) {
        alert('Email sent successfully!')
      } else {
        const error = await response.json()
        alert(`Failed to send email: ${error.error}`)
      }
    } catch (error) {
      console.error('Resend error:', error)
      alert('Failed to send email')
    } finally {
      setProcessing(false)
    }
  }

  async function handleDeleteForm() {
    if (!confirm(`Delete liability form for ${individual.firstName} ${individual.lastName}? This will allow them to start fresh.`)) {
      return
    }

    setProcessing(true)
    try {
      const token = await getToken()
      const response = await fetch(
        `/api/admin/events/${eventId}/poros-liability/forms/${individual.formId}`,
        {
          method: 'DELETE',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        }
      )

      if (response.ok) {
        alert('Form deleted successfully!')
        onUpdate()
      } else {
        const error = await response.json()
        alert(`Failed to delete: ${error.error}`)
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete form')
    } finally {
      setProcessing(false)
    }
  }

  const hasMedicalInfo = individual.allergies || individual.medications || individual.medicalConditions
  const isUnder18 = individual.age !== null && individual.age < 18

  // Determine status display
  const getStatusDisplay = () => {
    switch (individual.formStatus) {
      case 'completed':
      case 'approved':
        return { icon: <CheckCircle className="w-5 h-5 text-green-600" />, text: 'Completed', color: 'text-green-600' }
      case 'pending':
        return { icon: <Clock className="w-5 h-5 text-yellow-600" />, text: 'Waiting on Parent', color: 'text-yellow-600' }
      case 'not_started':
        return { icon: <Clock className="w-5 h-5 text-gray-400" />, text: 'Not Started', color: 'text-gray-500' }
      case 'denied':
        return { icon: <XCircle className="w-5 h-5 text-red-600" />, text: 'Denied', color: 'text-red-600' }
      default:
        return { icon: <Clock className="w-5 h-5 text-gray-400" />, text: 'Unknown', color: 'text-gray-500' }
    }
  }

  const status = getStatusDisplay()

  return (
    <Card className="overflow-hidden bg-white border-[#D1D5DB]">
      <div className="p-4 flex items-center justify-between hover:bg-gray-50">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            {/* Status Icon */}
            {status.icon}

            {/* Name & Info */}
            <div className="flex-1">
              <div className="font-medium text-[#1E3A5F]">
                {individual.firstName} {individual.lastName}
              </div>
              <div className="text-sm text-gray-600 flex items-center gap-2">
                <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                  {individual.confirmationCode}
                </span>
                <span>|</span>
                <span>Age: {individual.age || 'N/A'}</span>
                <span>|</span>
                <span>{individual.gender || 'N/A'}</span>
                {isUnder18 && (
                  <>
                    <span>|</span>
                    <span className="text-blue-600">Under 18</span>
                  </>
                )}
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                <Mail className="w-3 h-3" />
                {individual.email}
              </div>
            </div>

            {/* Medical Alerts */}
            {hasMedicalInfo && individual.formStatus === 'completed' && (
              <div className="px-3 py-1 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Medical Info
              </div>
            )}

            {/* Status Badge */}
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              individual.formStatus === 'completed' || individual.formStatus === 'approved'
                ? 'bg-green-100 text-green-700'
                : individual.formStatus === 'pending'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {status.text}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-4">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowDetails(!showDetails)}
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </Button>

          {individual.formId && individual.formStatus === 'completed' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => window.open(`/api/liability/forms/${individual.formId}/pdf`, '_blank')}
              title="Download PDF"
            >
              <Download className="w-4 h-4" />
            </Button>
          )}

          {(individual.formStatus === 'not_started' || individual.formStatus === 'pending') && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleResendEmail}
              disabled={processing}
              title="Resend Form Email"
            >
              <RefreshCw className={`w-4 h-4 ${processing ? 'animate-spin' : ''}`} />
            </Button>
          )}

          {individual.formId && (
            <Button
              size="sm"
              variant="ghost"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleDeleteForm}
              disabled={processing}
              title="Delete Form (Allow Restart)"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Details Panel */}
      {showDetails && (
        <div className="p-4 bg-gray-50 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {/* Form Type Info */}
            <div>
              <span className="text-gray-600">Form Type:</span>
              <p className="font-medium">
                {isUnder18 ? 'Youth Under 18 (Parent Consent Required)' : 'Adult (18+)'}
              </p>
            </div>

            {individual.parentEmail && (
              <div>
                <span className="text-gray-600">Parent Email:</span>
                <p className="font-medium">{individual.parentEmail}</p>
              </div>
            )}

            {/* Medical Information */}
            {hasMedicalInfo && individual.formStatus === 'completed' && (
              <div className="col-span-full">
                <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Medical Information
                </h4>
                <Card className="p-3 bg-red-50 border-red-200">
                  {individual.allergies && (
                    <div className="mb-2">
                      <span className="font-medium">Allergies:</span>
                      <p className="text-red-700">{individual.allergies}</p>
                    </div>
                  )}
                  {individual.medications && (
                    <div className="mb-2">
                      <span className="font-medium">Medications:</span>
                      <p className="text-red-700">{individual.medications}</p>
                    </div>
                  )}
                  {individual.medicalConditions && (
                    <div>
                      <span className="font-medium">Conditions:</span>
                      <p className="text-red-700">{individual.medicalConditions}</p>
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* Dietary Restrictions */}
            {individual.dietaryRestrictions && (
              <div>
                <span className="text-gray-600">Dietary Restrictions:</span>
                <p className="font-medium">{individual.dietaryRestrictions}</p>
              </div>
            )}

            {/* Other Details */}
            {individual.tShirtSize && (
              <div>
                <span className="text-gray-600">Shirt Size:</span>
                <p className="font-medium">{individual.tShirtSize}</p>
              </div>
            )}

            {individual.emergencyContact1Name && (
              <div>
                <span className="text-gray-600">Emergency Contact:</span>
                <p className="font-medium">{individual.emergencyContact1Name}</p>
                <p className="text-xs text-gray-500">{individual.emergencyContact1Phone}</p>
              </div>
            )}

            {individual.completedAt && (
              <div>
                <span className="text-gray-600">Completed:</span>
                <p className="font-medium">
                  {new Date(individual.completedAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
