'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select'
import {
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Download,
  AlertTriangle,
  Loader2
} from 'lucide-react'

interface SafeEnvironmentTabProps {
  eventId: string
  onUpdate: () => void
}

interface Certificate {
  id: string
  certificateHolderName: string
  participantName: string
  groupName: string
  parishName: string | null
  certificateType: string | null
  programName: string | null
  issueDate: string | null
  expirationDate: string | null
  certificateNumber: string | null
  issuingOrganization: string | null
  fileUrl: string
  originalFilename: string | null
  verificationStatus: string
  verifiedAt: string | null
  verifiedByName: string | null
  verificationNotes: string | null
  uploadedAt: string
  uploadedByName: string | null
}

export function SafeEnvironmentTab({ eventId, onUpdate }: SafeEnvironmentTabProps) {
  const { getToken } = useAuth()
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [filters, setFilters] = useState({
    status: 'all',
    certificateType: 'all'
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCertificates()
  }, [eventId, filters])

  async function fetchCertificates() {
    setLoading(true)
    try {
      const token = await getToken()
      const params = new URLSearchParams({
        status: filters.status,
        type: filters.certificateType
      })

      const response = await fetch(
        `/api/admin/events/${eventId}/poros-liability/certificates?${params}`,
        { headers: token ? { 'Authorization': `Bearer ${token}` } : {} }
      )
      if (response.ok) {
        const data = await response.json()
        setCertificates(data)
      }
    } catch (error) {
      console.error('Failed to fetch certificates:', error)
    } finally {
      setLoading(false)
    }
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Verification Status</label>
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters({ ...filters, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Certificates</SelectItem>
                <SelectItem value="pending">Pending Verification</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">Certificate Type</label>
            <Select
              value={filters.certificateType}
              onValueChange={(value) => setFilters({ ...filters, certificateType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="background_check">Background Check</SelectItem>
                <SelectItem value="virtus_training">VIRTUS Training</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Certificates List */}
      <div className="space-y-3">
        {certificates.length === 0 ? (
          <Card className="p-8 text-center text-gray-500 bg-white border-[#D1D5DB]">
            <Shield className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No Safe Environment certificates found</p>
          </Card>
        ) : (
          certificates.map((cert) => (
            <CertificateCard
              key={cert.id}
              certificate={cert}
              eventId={eventId}
              onUpdate={() => {
                fetchCertificates()
                onUpdate()
              }}
            />
          ))
        )}
      </div>
    </div>
  )
}

// Certificate Card Component
function CertificateCard({
  certificate,
  eventId,
  onUpdate
}: {
  certificate: Certificate
  eventId: string
  onUpdate: () => void
}) {
  const { getToken } = useAuth()
  const [processing, setProcessing] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  // Check if certificate is expired
  const isExpired = certificate.expirationDate &&
    new Date(certificate.expirationDate) < new Date()

  // Check if expiring soon (within 30 days)
  const isExpiringSoon = certificate.expirationDate &&
    new Date(certificate.expirationDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) &&
    !isExpired

  async function handleVerify() {
    const notes = prompt(`Add verification notes for ${certificate.certificateHolderName || certificate.participantName}:`)

    setProcessing(true)
    try {
      const token = await getToken()
      const response = await fetch(
        `/api/admin/events/${eventId}/poros-liability/certificates/${certificate.id}/verify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ notes })
        }
      )

      if (response.ok) {
        alert('Certificate verified successfully!')
        onUpdate()
      } else {
        const error = await response.json()
        alert(`Failed to verify: ${error.error}`)
      }
    } catch (error) {
      console.error('Verification error:', error)
      alert('Failed to verify certificate')
    } finally {
      setProcessing(false)
    }
  }

  async function handleReject() {
    const reason = prompt(`Enter reason for rejecting ${certificate.certificateHolderName || certificate.participantName}'s certificate:`)
    if (!reason) return

    setProcessing(true)
    try {
      const token = await getToken()
      const response = await fetch(
        `/api/admin/events/${eventId}/poros-liability/certificates/${certificate.id}/reject`,
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
        alert('Certificate rejected. Group leader will be notified.')
        onUpdate()
      } else {
        const error = await response.json()
        alert(`Failed to reject: ${error.error}`)
      }
    } catch (error) {
      console.error('Rejection error:', error)
      alert('Failed to reject certificate')
    } finally {
      setProcessing(false)
    }
  }

  const holderName = certificate.certificateHolderName || certificate.participantName

  return (
    <Card className="overflow-hidden bg-white border-[#D1D5DB]">
      <div className="p-4 flex items-center justify-between bg-white hover:bg-gray-50">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            {/* Status Icon */}
            {certificate.verificationStatus === 'verified' && !isExpired && (
              <CheckCircle className="w-6 h-6 text-green-600" />
            )}
            {certificate.verificationStatus === 'pending' && (
              <Clock className="w-6 h-6 text-yellow-600" />
            )}
            {certificate.verificationStatus === 'rejected' && (
              <XCircle className="w-6 h-6 text-red-600" />
            )}
            {isExpired && (
              <AlertTriangle className="w-6 h-6 text-red-600" />
            )}

            {/* Certificate Info */}
            <div className="flex-1">
              <div className="font-semibold text-[#1E3A5F] flex items-center gap-2">
                {holderName}
                {isExpired && (
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                    EXPIRED
                  </span>
                )}
                {isExpiringSoon && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">
                    EXPIRING SOON
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600">
                {certificate.groupName}
                {certificate.parishName && ` - ${certificate.parishName}`}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {certificate.programName || certificate.certificateType?.replace('_', ' ') || 'Certificate'}
                {certificate.expirationDate && (
                  <> | Expires: {new Date(certificate.expirationDate).toLocaleDateString()}</>
                )}
              </div>
            </div>

            {/* Status Badge */}
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              certificate.verificationStatus === 'verified'
                ? 'bg-green-100 text-green-700'
                : certificate.verificationStatus === 'pending'
                ? 'bg-yellow-100 text-yellow-700'
                : certificate.verificationStatus === 'rejected'
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-700'
            }`}>
              {certificate.verificationStatus?.toUpperCase()}
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

          {/* Prominent View Certificate button */}
          <Button
            size="sm"
            className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white"
            onClick={() => window.open(certificate.fileUrl, '_blank')}
            title="View Certificate File"
          >
            <Download className="w-4 h-4 mr-1" />
            View File
          </Button>

          {certificate.verificationStatus === 'pending' && (
            <>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={handleVerify}
                disabled={processing}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Verify
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
                onClick={handleReject}
                disabled={processing}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Reject
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Details Panel */}
      {showDetails && (
        <div className="p-4 bg-gray-50 border-t">
          {/* Certificate File Preview Section */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-blue-900">Uploaded Certificate</h4>
                <p className="text-sm text-blue-700">
                  {certificate.originalFilename || 'Certificate file'}
                </p>
              </div>
              <Button
                size="sm"
                className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white"
                onClick={() => window.open(certificate.fileUrl, '_blank')}
              >
                <Eye className="w-4 h-4 mr-2" />
                View Certificate
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Program Name:</span>
              <p className="font-medium">
                {certificate.programName || 'N/A'}
              </p>
            </div>
            <div>
              <span className="text-gray-600">Certificate Number:</span>
              <p className="font-medium">{certificate.certificateNumber || 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-600">Issue Date:</span>
              <p className="font-medium">
                {certificate.issueDate
                  ? new Date(certificate.issueDate).toLocaleDateString()
                  : 'N/A'}
              </p>
            </div>
            <div>
              <span className="text-gray-600">Expiration Date:</span>
              <p className={`font-medium ${isExpired ? 'text-red-600' : ''}`}>
                {certificate.expirationDate
                  ? new Date(certificate.expirationDate).toLocaleDateString()
                  : 'N/A'}
              </p>
            </div>
            <div className="col-span-2">
              <span className="text-gray-600">Issuing Organization:</span>
              <p className="font-medium">{certificate.issuingOrganization || 'N/A'}</p>
            </div>
            <div className="col-span-2">
              <span className="text-gray-600">Uploaded:</span>
              <p className="font-medium">
                {certificate.uploadedByName || 'Unknown'} on {new Date(certificate.uploadedAt).toLocaleDateString()}
              </p>
            </div>

            {/* Verification Info */}
            {certificate.verificationStatus !== 'pending' && (
              <div className="col-span-2 pt-3 border-t">
                <span className="text-gray-600">Verification Status:</span>
                <p className={`font-medium ${
                  certificate.verificationStatus === 'verified' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {certificate.verificationStatus?.toUpperCase()}
                </p>
                {certificate.verifiedAt && (
                  <p className="text-xs text-gray-500 mt-1">
                    by {certificate.verifiedByName} on {new Date(certificate.verifiedAt).toLocaleString()}
                  </p>
                )}
                {certificate.verificationNotes && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                    <span className="font-medium">Notes:</span> {certificate.verificationNotes}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
