'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth, useUser } from '@clerk/nextjs'
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
  Clock,
  CreditCard,
  Send,
  StickyNote,
} from 'lucide-react'
import { getTier, SUBSCRIPTION_TIERS } from '@/lib/subscription-tiers'
import { generateOrgAdminOnboardingEmail, type OnboardingBilling } from '@/emails/org-admin-onboarding'
import { describeNeeds } from '@/lib/onboarding-needs'

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
  paymentMethodPreference: string | null
  additionalNotes: string | null
  estimatedEventsPerYear: number | null
  estimatedRegistrationsPerYear: number | null
  contactJobTitle: string | null
  legalEntityName: string | null
  taxId: string | null
  billingAddress: string | null
  website: string | null
  howDidYouHear: string | null
  howDidYouHearOther: string | null
  needs: unknown
  createdAt: string
}

const ORG_TYPE_LABELS: Record<string, string> = {
  diocese: 'Diocese', archdiocese: 'Archdiocese', parish: 'Parish', seminary: 'Seminary', ministry: 'Ministry',
  retreat_center: 'Retreat center', school: 'School', other: 'Other',
}
const HOW_HEARD_LABELS: Record<string, string> = {
  google_search: 'Google search', referral: 'Referral from another organization', social_media: 'Social media',
  conference_event: 'Conference or event', other: 'Other',
}

/** A label/value line in the request details, skipped when empty */
function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-gray-600 shrink-0">{label}</span>
      <span className="font-medium text-right whitespace-pre-line break-words min-w-0">{value}</span>
    </div>
  )
}

type BillingCycle = 'monthly' | 'annual'

interface ApproveForm {
  welcomeMessage: string
  // 'online' emails a card payment link for the setup fee; 'manual' means
  // you invoice them yourself (e.g. an annual check) and nothing Stripe is sent
  billingMode: 'online' | 'manual'
  billingCycle: BillingCycle
  subscriptionPrice: string
  createSetupInvoice: boolean
  billingNote: string
}

interface ApproveResult {
  kind: 'success' | 'warning'
  message: string
  organizationId: string
}

const tierLabels: Record<string, string> = Object.fromEntries(
  Object.values(SUBSCRIPTION_TIERS).map(tier => [tier.key, tier.name])
)

const tierPricing: Record<string, { monthly: number; annual: number }> = Object.fromEntries(
  Object.values(SUBSCRIPTION_TIERS).map(tier => [
    tier.key,
    { monthly: tier.monthlyPrice, annual: tier.annualPrice ?? tier.monthlyPrice * 12 },
  ])
)

const priceFor = (tierKey: string, cycle: BillingCycle) => {
  const pricing = tierPricing[tierKey] || tierPricing.cathedral
  return cycle === 'annual' ? pricing.annual : pricing.monthly
}

// Billing cycles a card subscription can use for this tier. Manual billing can use either.
const onlineCycles = (tierKey: string): BillingCycle[] => getTier(tierKey)?.billingOptions ?? ['monthly', 'annual']

export default function PendingRequestsPage() {
  const router = useRouter()
  const { getToken } = useAuth()
  const [requests, setRequests] = useState<OnboardingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<OnboardingRequest | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const { user } = useUser()
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [approveForm, setApproveForm] = useState<ApproveForm | null>(null)
  const [approveError, setApproveError] = useState<string | null>(null)
  const [approveResult, setApproveResult] = useState<ApproveResult | null>(null)

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const token = await getToken()
        const response = await fetch('/api/master-admin/onboarding-requests', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        })
        if (response.ok) {
          const data = await response.json()
          setRequests(data.requests)
          const wanted = new URLSearchParams(window.location.search).get('request')
          const match = wanted && data.requests.find((r: OnboardingRequest) => r.id === wanted && r.status === 'pending')
          if (match) setSelectedRequest(match)
        }
      } catch (error) {
        console.error('Failed to fetch requests:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRequests()
  }, [getToken])

  const openApproveModal = (request: OnboardingRequest) => {
    const billingMode = request.paymentMethodPreference === 'check' ? 'manual' : 'online'
    let billingCycle: BillingCycle = request.billingCyclePreference === 'monthly' ? 'monthly' : 'annual'
    if (billingMode === 'online' && !onlineCycles(request.requestedTier).includes(billingCycle)) {
      billingCycle = onlineCycles(request.requestedTier)[0]
    }
    setApproveForm({
      welcomeMessage: '',
      billingMode,
      billingCycle,
      subscriptionPrice: String(priceFor(request.requestedTier, billingCycle)),
      createSetupInvoice: true,
      billingNote: '',
    })
    setApproveError(null)
    setShowApproveModal(true)
  }

  const updateBilling = (request: OnboardingRequest, changes: Partial<ApproveForm>) => {
    if (!approveForm) return
    const next = { ...approveForm, ...changes }
    if (next.billingMode === 'online' && !onlineCycles(request.requestedTier).includes(next.billingCycle)) {
      next.billingCycle = onlineCycles(request.requestedTier)[0]
    }
    // Back to the plan's list price whenever the cycle or mode changes
    if (next.billingCycle !== approveForm.billingCycle || next.billingMode !== approveForm.billingMode) {
      next.subscriptionPrice = String(priceFor(request.requestedTier, next.billingCycle))
    }
    setApproveForm(next)
  }

  const handleApprove = async (request: OnboardingRequest) => {
    if (!approveForm) return
    setActionLoading(request.id)
    setApproveError(null)
    try {
      const token = await getToken()
      const response = await fetch(`/api/master-admin/onboarding-requests/${request.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...approveForm,
          subscriptionPrice: approveForm.billingMode === 'manual' ? Number(approveForm.subscriptionPrice) : undefined,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setApproveError(
          data.details
            ? `${data.error || 'Failed to approve this request'}: ${data.details}`
            : data.error || 'Failed to approve this request'
        )
        return
      }
      const notes = [
        data.usedExistingLogin && 'They already had a ChiRho login, so the email asks them to sign in.',
        data.reusedOrganization &&
          `It used the empty copy of ${request.organizationName} left by an earlier failed approval, so there's no duplicate.`,
      ].filter(Boolean).join(' ')
      setRequests(reqs => reqs.filter(r => r.id !== request.id))
      setSelectedRequest(null)
      setShowApproveModal(false)
      setApproveResult(
        data.emailSent
          ? {
              kind: 'success',
              message: `${request.organizationName} is approved. The welcome email with their setup checklist was sent to ${data.sentTo}.${notes ? ` ${notes}` : ''}`,
              organizationId: data.organization.id,
            }
          : {
              kind: 'warning',
              message: `${request.organizationName} is approved, but the welcome email didn't send${data.emailError ? ` (${data.emailError})` : ''}. Open the organization and use Resend Onboarding Email to try again.${notes ? ` ${notes}` : ''}`,
              organizationId: data.organization.id,
            }
      )
    } catch (error) {
      console.error('Failed to approve:', error)
      setApproveError('Failed to approve this request. Check your connection and try again.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (requestId: string) => {
    setActionLoading(requestId)
    try {
      const token = await getToken()
      const response = await fetch(`/api/master-admin/onboarding-requests/${requestId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
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
    const tierKey = request.requestedTier || 'cathedral'
    const tier = getTier(tierKey)
    const pricing = tierPricing[tierKey] || tierPricing.cathedral
    const isAnnual = request.billingCyclePreference === 'annual'
    const subscriptionAmount = isAnnual ? pricing.annual : pricing.monthly * 12
    const setupFee = tier?.setupFee ?? 0
    return subscriptionAmount + setupFee
  }

  const getSetupFeeDisplay = (request: OnboardingRequest) => {
    const tier = getTier(request.requestedTier || 'cathedral')
    if (!tier) return '$0'
    if (tier.setupFee === null) return 'Custom'
    return `$${tier.setupFee}`
  }

  const pendingRequests = requests.filter(r => r.status === 'pending')

  // Live preview of the welcome email, built with the same template the server sends
  const previewHtml = useMemo(() => {
    if (!showApproveModal || !selectedRequest || !approveForm) return ''
    const tier = getTier(selectedRequest.requestedTier)
    const setupFee = tier?.setupFee ?? 0
    const billing: OnboardingBilling =
      approveForm.billingMode === 'manual'
        ? { mode: 'manual', note: approveForm.billingNote }
        : setupFee > 0
          ? { mode: 'online', amount: setupFee, label: tier?.isSelfServe ? 'Basic Access Fee' : 'Setup Fee', payUrl: '#' }
          : { mode: 'manual', note: approveForm.billingNote || 'Your plan includes custom setup work. Our team will reach out to scope it with you and send your first invoice.' }
    return generateOrgAdminOnboardingEmail({
      orgName: selectedRequest.organizationName,
      orgAdminFirstName: selectedRequest.contactFirstName,
      orgAdminEmail: selectedRequest.contactEmail,
      inviteLink: '#',
      organizationId: '',
      tierKey: selectedRequest.requestedTier,
      billingCycle: approveForm.billingCycle,
      planPrice:
        approveForm.billingMode === 'manual' && Number(approveForm.subscriptionPrice) > 0
          ? Number(approveForm.subscriptionPrice)
          : priceFor(selectedRequest.requestedTier, approveForm.billingCycle),
      modulesEnabled: {},
      personalMessage: approveForm.welcomeMessage,
      personalMessageFrom: user?.fullName,
      billing,
    })
  }, [showApproveModal, selectedRequest, approveForm, user?.fullName])

  const approveTier = selectedRequest ? getTier(selectedRequest.requestedTier) : undefined
  const approveSetupFee = approveTier?.setupFee ?? 0
  const approveFeeLabel = approveTier?.isSelfServe ? 'Basic Access Fee' : 'Setup Fee'
  const approvePrice = approveForm && selectedRequest
    ? approveForm.billingMode === 'manual'
      ? Number(approveForm.subscriptionPrice)
      : priceFor(selectedRequest.requestedTier, approveForm.billingCycle)
    : 0
  const approveCycleUnit = approveForm?.billingCycle === 'annual' ? 'year' : 'month'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pending Organization Requests</h1>
        <p className="text-gray-600 mt-1">
          Total: {pendingRequests.length} pending
        </p>
      </div>

      {approveResult && (
        <div
          className={`flex items-start gap-3 rounded-xl border p-4 ${
            approveResult.kind === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-yellow-50 border-yellow-200 text-yellow-800'
          }`}
        >
          {approveResult.kind === 'success' ? (
            <Check className="h-5 w-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-sm">
            <p>{approveResult.message}</p>
            <Link
              href={`/dashboard/master-admin/organizations/${approveResult.organizationId}`}
              className="inline-block mt-1 font-medium underline"
            >
              Open organization &rarr;
            </Link>
          </div>
          <button onClick={() => setApproveResult(null)} className="p-1 rounded hover:bg-black/5" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

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
                    {tierLabels[request.requestedTier] || 'Cathedral'}
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
                {/* Organization */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Organization</h3>
                  <div className="space-y-2">
                    <DetailRow label="Type" value={ORG_TYPE_LABELS[selectedRequest.organizationType] ?? selectedRequest.organizationType} />
                    <DetailRow label="Website" value={selectedRequest.website && (
                      <a href={/^https?:\/\//.test(selectedRequest.website) ? selectedRequest.website : `https://${selectedRequest.website}`}
                        target="_blank" rel="noreferrer" className="text-purple-600 hover:text-purple-800">{selectedRequest.website}</a>
                    )} />
                  </div>
                </div>

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
                    {selectedRequest.contactJobTitle && (
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <span>{selectedRequest.contactJobTitle}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* What they need (Get Started answers) */}
                {describeNeeds(selectedRequest.needs).length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">What They Need</h3>
                    <div className="space-y-2">
                      {describeNeeds(selectedRequest.needs).map(row => <DetailRow key={row.label} label={row.label} value={row.value} />)}
                    </div>
                  </div>
                )}

                {/* Usage Estimates (requests from before the needs questions) */}
                {describeNeeds(selectedRequest.needs).length === 0 && (
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
                )}

                {/* Billing Preferences */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Billing Preferences</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Wants to pay by:</span>
                      <span className="font-medium">{selectedRequest.paymentMethodPreference === 'check' ? 'Check' : 'Credit card'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Billing cycle:</span>
                      <span className="font-medium">{selectedRequest.billingCyclePreference === 'monthly' ? 'Monthly' : 'Annual'}</span>
                    </div>
                    <DetailRow label="Legal name:" value={selectedRequest.legalEntityName} />
                    <DetailRow label="Tax ID / EIN:" value={selectedRequest.taxId} />
                    <DetailRow label="Billing address:" value={selectedRequest.billingAddress} />
                  </div>
                </div>

                {selectedRequest.howDidYouHear && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">How They Heard About Us</h3>
                    <p className="text-sm text-gray-700">
                      {HOW_HEARD_LABELS[selectedRequest.howDidYouHear] ?? selectedRequest.howDidYouHear}
                      {selectedRequest.howDidYouHearOther ? `: ${selectedRequest.howDidYouHearOther}` : ''}
                    </p>
                  </div>
                )}

                {selectedRequest.additionalNotes && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1">
                      <StickyNote className="h-4 w-4 text-gray-400" />
                      Notes from the Applicant
                    </h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                      {selectedRequest.additionalNotes}
                    </p>
                  </div>
                )}

                {/* Revenue Potential */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-green-900 mb-2">Revenue Potential</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-700">Requested Tier:</span>
                      <span className="font-medium text-green-900">
                        {tierLabels[selectedRequest.requestedTier] || 'Cathedral'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">{tierLabels[selectedRequest.requestedTier] ? `${getTier(selectedRequest.requestedTier)?.setupFeeLabel ?? 'Setup Fee'}:` : 'Setup Fee:'}</span>
                      <span className="font-medium text-green-900">{getSetupFeeDisplay(selectedRequest)}</span>
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
                    onClick={() => openApproveModal(selectedRequest)}
                    disabled={actionLoading !== null}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    Approve&hellip;
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

      {/* Approve Modal */}
      {showApproveModal && selectedRequest && approveForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[92vh] flex flex-col">
            <div className="flex items-start justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Approve {selectedRequest.organizationName}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Add a personal welcome, choose how they&apos;ll be billed, and check the email before it goes out.
                </p>
              </div>
              <button
                onClick={() => setShowApproveModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
              {/* Options */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">
                    Personal welcome message <span className="font-normal text-gray-500">(optional)</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Shown near the top of the email and signed with your name. The full setup checklist and
                    help-doc links are included either way.
                  </p>
                  <textarea
                    value={approveForm.welcomeMessage}
                    onChange={e => setApproveForm({ ...approveForm, welcomeMessage: e.target.value })}
                    rows={5}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                    placeholder={`Welcome, ${selectedRequest.contactFirstName}! We're excited to have ${selectedRequest.organizationName} on ChiRho Events.`}
                  />
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Billing</h4>
                  <div className="space-y-2">
                    <label
                      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer ${
                        approveForm.billingMode === 'online' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="billingMode"
                        checked={approveForm.billingMode === 'online'}
                        onChange={() => updateBilling(selectedRequest, { billingMode: 'online' })}
                        className="mt-1"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                          <CreditCard className="h-4 w-4 text-gray-500" />
                          Card payment link
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {approveSetupFee > 0
                            ? `The email includes a link to pay the ${formatCurrency(approveSetupFee)} ${approveFeeLabel.toLowerCase()} by card. Once it's paid, their subscription starts automatically in Stripe.`
                            : "This plan's setup fee is custom, so there's no payment link. The email says our team will follow up with their first invoice."}
                        </p>
                      </div>
                    </label>
                    <label
                      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer ${
                        approveForm.billingMode === 'manual' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="billingMode"
                        checked={approveForm.billingMode === 'manual'}
                        onChange={() => updateBilling(selectedRequest, { billingMode: 'manual' })}
                        className="mt-1"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                          <FileText className="h-4 w-4 text-gray-500" />
                          I&apos;ll invoice them myself (check)
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          Nothing goes through Stripe: no payment links, Stripe customer, or automatic subscription.
                          You create invoices from their organization page and mark them paid when checks arrive.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Billing cycle</label>
                    <select
                      value={approveForm.billingCycle}
                      onChange={e => updateBilling(selectedRequest, { billingCycle: e.target.value as BillingCycle })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                    >
                      {(approveForm.billingMode === 'online'
                        ? onlineCycles(selectedRequest.requestedTier)
                        : (['monthly', 'annual'] as BillingCycle[])
                      ).map(cycle => (
                        <option key={cycle} value={cycle}>{cycle === 'annual' ? 'Annual' : 'Monthly'}</option>
                      ))}
                    </select>
                    {approveForm.billingMode === 'online' && onlineCycles(selectedRequest.requestedTier).length === 1 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Card billing for {approveTier?.name ?? 'this plan'} is {onlineCycles(selectedRequest.requestedTier)[0]} only.
                        To bill another way, choose &ldquo;I&apos;ll invoice them myself&rdquo;.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price per {approveCycleUnit}</label>
                    {approveForm.billingMode === 'manual' ? (
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={approveForm.subscriptionPrice}
                          onChange={e => setApproveForm({ ...approveForm, subscriptionPrice: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                        />
                      </div>
                    ) : (
                      <p className="py-2 text-sm font-medium text-gray-900">{formatCurrency(approvePrice)}</p>
                    )}
                    {approveForm.billingMode === 'manual' && approveForm.billingCycle === 'annual' && approveTier?.annualPrice === null && (
                      <p className="text-xs text-gray-500 mt-1">
                        {approveTier.name} has no annual list price, so this starts at 12 &times; {formatCurrency(approveTier.monthlyPrice)}.
                      </p>
                    )}
                  </div>
                </div>

                {approveForm.billingMode === 'manual' && (
                  <div className="space-y-4">
                    {approveSetupFee > 0 && (
                      <label className="flex items-start gap-3 text-sm text-gray-900 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={approveForm.createSetupInvoice}
                          onChange={e => setApproveForm({ ...approveForm, createSetupInvoice: e.target.checked })}
                          className="mt-1"
                        />
                        <span>
                          Create the {formatCurrency(approveSetupFee)} {approveFeeLabel.toLowerCase()} invoice now
                          <span className="block text-xs text-gray-500">
                            It&apos;s added to their account for your records but not emailed. Send it or mark it paid
                            from their organization page.
                          </span>
                        </span>
                      </label>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        What the email says about billing <span className="font-normal text-gray-500">(optional)</span>
                      </label>
                      <textarea
                        value={approveForm.billingNote}
                        onChange={e => setApproveForm({ ...approveForm, billingNote: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                        placeholder="We'll send your invoice separately, so there's nothing to pay online right now."
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Leave blank to use the text above, or spell out the terms, e.g. &ldquo;We&apos;ll mail your annual
                        invoice for {formatCurrency(approvePrice || 0)}{approveSetupFee > 0 ? ` plus the ${formatCurrency(approveSetupFee)} ${approveFeeLabel.toLowerCase()}` : ''}, payable by check.&rdquo;
                      </p>
                    </div>
                  </div>
                )}

                {/* What approving does */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">When you approve</h4>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                    <li>
                      {selectedRequest.organizationName} is created on the {approveTier?.name ?? selectedRequest.requestedTier} plan,
                      billed {formatCurrency(approvePrice || 0)}/{approveCycleUnit}
                      {approveForm.billingMode === 'manual' ? ' by check' : ''}.
                    </li>
                    <li>{selectedRequest.contactFirstName} {selectedRequest.contactLastName} becomes its administrator.</li>
                    {approveForm.billingMode === 'online' ? (
                      approveSetupFee > 0 ? (
                        <li>A {formatCurrency(approveSetupFee)} {approveFeeLabel.toLowerCase()} invoice is created, and the email links to it for card payment.</li>
                      ) : (
                        <li>No setup invoice is created. Send a custom one from their organization page.</li>
                      )
                    ) : approveForm.createSetupInvoice && approveSetupFee > 0 ? (
                      <li>A {formatCurrency(approveSetupFee)} {approveFeeLabel.toLowerCase()} invoice is created but not emailed. Nothing is sent to Stripe.</li>
                    ) : (
                      <li>No invoices are created and nothing is sent to Stripe.</li>
                    )}
                    <li>The welcome email in the preview goes to <strong>{selectedRequest.contactEmail}</strong>.</li>
                  </ul>
                </div>

                {approveError && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    {approveError}
                  </div>
                )}
              </div>

              {/* Email preview */}
              <div className="flex flex-col">
                <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-1 mb-1">
                  <Eye className="h-4 w-4 text-gray-500" />
                  Email preview
                </h4>
                <p className="text-xs text-gray-500 mb-2">
                  To: {selectedRequest.contactEmail} &middot; Subject: Welcome to ChiRho Events: {selectedRequest.organizationName} is approved
                </p>
                <iframe
                  title="Welcome email preview"
                  srcDoc={previewHtml.replace('<head>', '<head><style>a { pointer-events: none; }</style>')}
                  sandbox=""
                  className="flex-1 w-full min-h-[500px] border border-gray-200 rounded-lg bg-gray-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-gray-200">
              <button
                onClick={() => setShowApproveModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApprove(selectedRequest)}
                disabled={actionLoading !== null || (approveForm.billingMode === 'manual' && !(approvePrice > 0))}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
              >
                {actionLoading === selectedRequest.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Approve &amp; Send Welcome Email
              </button>
            </div>
          </div>
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
