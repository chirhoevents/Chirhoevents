'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FileText,
  Building2,
  User,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  Check,
  X,
  Eye,
  Loader2,
  AlertCircle,
  Clock
} from 'lucide-react'

interface OnboardingRequest {
  id: string
  status: string
  organizationName: string
  organizationType: string
  contactFirstName: string
  contactLastName: string
  contactEmail: string
  contactPhone: string
  requestedTier: string
  billingCyclePreference: string
  estimatedEventsPerYear: number | null
  estimatedRegistrationsPerYear: number | null
  createdAt: string
}

const tierLabels: Record<string, string> = {
  starter: 'Starter',
  small_diocese: 'Small Diocese',
  growing: 'Growing',
  conference: 'Conference',
  enterprise: 'Enterprise',
}

const tierPricing: Record<string, { monthly: number; annual: number }> = {
  starter: { monthly: 49, annual: 490 },
  small_diocese: { monthly: 99, annual: 990 },
  growing: { monthly: 149, annual: 1490 },
  conference: { monthly: 249, annual: 2490 },
  enterprise: { monthly: 499, annual: 4990 },
}

export default function PendingRequestsPage() {
  const router = useRouter()
  const [requests, setRequests] = useState<OnboardingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<OnboardingRequest | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const response = await fetch('/api/master-admin/onboarding-requests')
        if (response.ok) {
          const data = await response.json()
          setRequests(data.requests)
        }
      } catch (error) {
        console.error('Failed to fetch requests:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRequests()
  }, [])

  const handleApprove = async (requestId: string) => {
    setActionLoading(requestId)
    try {
      const response = await fetch(`/api/master-admin/onboarding-requests/${requestId}/approve`, {
        method: 'POST',
      })
      if (response.ok) {
        setRequests(reqs => reqs.filter(r => r.id !== requestId))
        setSelectedRequest(null)
      }
    } catch (error) {
      console.error('Failed to approve:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (requestId: string) => {
    setActionLoading(requestId)
    try {
      const response = await fetch(`/api/master-admin/onboarding-requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      })
      if (response.ok) {
        setRequests(reqs => reqs.filter(r => r.id !== requestId))
        setSelectedRequest(null)
        setShowRejectModal(false)
        setRejectReason('')
      }
    } catch (error) {
      console.error('Failed to reject:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const calculateRevenuePotential = (request: OnboardingRequest) => {
    const tier = request.requestedTier || 'growing'
    const pricing = tierPricing[tier] || tierPricing.growing
    const isAnnual = request.billingCyclePreference === 'annual'
    const subscriptionAmount = isAnnual ? pricing.annual : pricing.monthly * 12
    const setupFee = 250
    return subscriptionAmount + setupFee
  }

  const pendingRequests = requests.filter(r => r.status === 'pending')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pending Organization Requests</h1>
        <p className="text-gray-600 mt-1">
          Total: {pendingRequests.length} pending
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
        </div>
      ) : pendingRequests.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No Pending Requests</h2>
          <p className="text-gray-600">All organization requests have been processed.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Request List */}
          <div className="space-y-4">
            {pendingRequests.map(request => (
              <div
                key={request.id}
                onClick={() => setSelectedRequest(request)}
                className={`bg-white rounded-xl shadow-sm border p-6 cursor-pointer transition-all ${
                  selectedRequest?.id === request.id
                    ? 'border-purple-500 ring-2 ring-purple-100'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{request.organizationName}</h3>
                    <p className="text-sm text-gray-500">
                      {request.contactFirstName} {request.contactLastName}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
                    <Clock className="h-3 w-3" />
                    Pending
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    {tierLabels[request.requestedTier] || 'Growing'}
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    {formatCurrency(calculateRevenuePotential(request))}/yr potential
                  </div>
                </div>

                <div className="mt-4 text-xs text-gray-500">
                  Submitted: {formatDate(request.createdAt)}
                </div>
              </div>
            ))}
          </div>

          {/* Request Detail */}
          {selectedRequest && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-24">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedRequest.organizationName}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Submitted: {formatDate(selectedRequest.createdAt)}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-sm font-medium rounded">
                  Pending Review
                </span>
              </div>

              <div className="space-y-6">
                {/* Contact Info */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Contact Information</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-gray-400" />
                      <span>{selectedRequest.contactFirstName} {selectedRequest.contactLastName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <a href={`mailto:${selectedRequest.contactEmail}`} className="text-purple-600 hover:text-purple-800">
                        {selectedRequest.contactEmail}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{selectedRequest.contactPhone}</span>
                    </div>
                  </div>
                </div>

                {/* Usage Estimates */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Usage Estimates</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Events per year:</span>
                      <span className="font-medium">{selectedRequest.estimatedEventsPerYear || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Registrations per year:</span>
                      <span className="font-medium">{selectedRequest.estimatedRegistrationsPerYear?.toLocaleString() || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Revenue Potential */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-green-900 mb-2">Revenue Potential</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-700">Requested Tier:</span>
                      <span className="font-medium text-green-900">
                        {tierLabels[selectedRequest.requestedTier] || 'Growing'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Setup Fee:</span>
                      <span className="font-medium text-green-900">$250</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">
                        {selectedRequest.billingCyclePreference === 'annual' ? 'Annual' : 'Monthly'} Subscription:
                      </span>
                      <span className="font-medium text-green-900">
                        {formatCurrency(
                          selectedRequest.billingCyclePreference === 'annual'
                            ? tierPricing[selectedRequest.requestedTier]?.annual || 1490
                            : tierPricing[selectedRequest.requestedTier]?.monthly || 149
                        )}
                      </span>
                    </div>
                    <div className="border-t border-green-200 pt-2 mt-2 flex justify-between">
                      <span className="font-semibold text-green-900">First Year Revenue:</span>
                      <span className="font-bold text-green-900">
                        {formatCurrency(calculateRevenuePotential(selectedRequest))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleApprove(selectedRequest.id)}
                    disabled={actionLoading !== null}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                  >
                    {actionLoading === selectedRequest.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Approve
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={actionLoading !== null}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                    Reject
                  </button>
                </div>
              </div>
            </div>
          )}

          {!selectedRequest && pendingRequests.length > 0 && (
            <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-12 flex items-center justify-center">
              <p className="text-gray-500 text-center">
                Select a request to view details
              </p>
            </div>
          )}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject Application</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for rejecting this application. This will be sent to the applicant.
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 mb-4"
              placeholder="Reason for rejection..."
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectReason('')
                }}
                className="flex-1 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(selectedRequest.id)}
                disabled={!rejectReason.trim() || actionLoading !== null}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
              >
                {actionLoading === selectedRequest.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                Reject Application
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
