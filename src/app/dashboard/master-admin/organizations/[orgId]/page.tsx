'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Building2,
  User,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  CreditCard,
  Settings,
  Edit,
  LogIn,
  Pause,
  Play,
  FileText,
  BarChart3,
  Check,
  X,
  AlertTriangle,
  Loader2,
  Plus,
  Receipt,
  UserCog,
  Eye,
  EyeOff,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  HardDrive,
} from 'lucide-react'

interface Organization {
  id: string
  name: string
  type: string
  contactName: string
  contactEmail: string
  contactPhone: string
  status: string
  subscriptionTier: string
  subscriptionStatus: string
  billingCycle: string
  monthlyFee: number
  monthlyPrice: number
  annualPrice: number
  setupFeePaid: boolean
  setupFeeAmount: number
  subscriptionStartedAt: string
  subscriptionRenewsAt: string
  eventsUsed: number
  eventsPerYearLimit: number | null
  registrationsUsed: number
  registrationsLimit: number | null
  storageUsedGb: number
  storageLimitGb: number
  stripeAccountId: string | null
  stripeOnboardingCompleted: boolean
  primaryColor: string
  secondaryColor: string
  modulesEnabled: { poros: boolean; salve: boolean; rapha: boolean }
  notes: string | null
  createdAt: string
  totalPayments: number
  totalRegistrations: number
  users: Array<{
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string
    clerkUserId: string | null
  }>
  events: Array<{
    id: string
    name: string
    status: string
    startDate: string
    endDate: string
  }>
  paymentMethodPreference: string
  legalEntityName: string | null
  website: string | null
}

interface OrgEvent {
  id: string
  name: string
  slug: string
  status: string
  isPublished: boolean
  startDate: string
  endDate: string
  capacityTotal: number | null
  capacityRemaining: number | null
  createdAt: string
  totalRegistrations: number
}

interface Invoice {
  id: string
  invoiceNumber: number
  invoiceType: 'setup_fee' | 'subscription' | 'overage' | 'custom'
  amount: number
  status: 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  description: string | null
  dueDate: string
  paidAt: string | null
  createdAt: string
}

const tierLabels: Record<string, string> = {
  starter: 'Starter',
  small_diocese: 'Small Diocese',
  growing: 'Growing',
  conference: 'Conference',
  enterprise: 'Enterprise',
  test: 'Test (Free)',
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  suspended: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
}

const invoiceStatusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  sent: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
}

export default function OrganizationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { getToken } = useAuth()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [invoiceForm, setInvoiceForm] = useState({
    invoiceType: 'custom',
    amount: '',
    description: '',
    dueDate: '',
    periodStart: '',
    periodEnd: '',
  })

  // Auto-fill invoice amount based on type
  const handleInvoiceTypeChange = (type: string) => {
    if (!organization) return

    let amount = ''
    let description = ''
    const today = new Date()
    const oneYearLater = new Date(today)
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1)
    const oneMonthLater = new Date(today)
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1)

    if (type === 'subscription_annual') {
      amount = organization.annualPrice?.toString() || ''
      description = `Annual subscription for ${organization.name}`
      setInvoiceForm({
        invoiceType: 'subscription',
        amount,
        description,
        dueDate: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        periodStart: today.toISOString().split('T')[0],
        periodEnd: oneYearLater.toISOString().split('T')[0],
      })
    } else if (type === 'subscription_monthly') {
      amount = organization.monthlyPrice?.toString() || ''
      description = `Monthly subscription for ${organization.name}`
      setInvoiceForm({
        invoiceType: 'subscription',
        amount,
        description,
        dueDate: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        periodStart: today.toISOString().split('T')[0],
        periodEnd: oneMonthLater.toISOString().split('T')[0],
      })
    } else if (type === 'setup_fee') {
      amount = organization.setupFeeAmount?.toString() || '250'
      description = `One-time setup fee for ${organization.name}`
      setInvoiceForm({ ...invoiceForm, invoiceType: type, amount, description, periodStart: '', periodEnd: '' })
    } else {
      setInvoiceForm({ ...invoiceForm, invoiceType: type, periodStart: '', periodEnd: '' })
    }
  }
  const [creatingInvoice, setCreatingInvoice] = useState(false)
  const [showChangeAdminModal, setShowChangeAdminModal] = useState(false)
  const [changeAdminForm, setChangeAdminForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    sendOnboardingEmail: true,
  })
  const [changingAdmin, setChangingAdmin] = useState(false)
  const [allEvents, setAllEvents] = useState<OrgEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [showAllEvents, setShowAllEvents] = useState(false)
  const [updatingEventStatus, setUpdatingEventStatus] = useState<string | null>(null)

  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        const token = await getToken()
        const response = await fetch(`/api/master-admin/organizations/${params.orgId}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        })
        if (response.ok) {
          const data = await response.json()
          setOrganization(data.organization)
        }
      } catch (error) {
        console.error('Failed to fetch organization:', error)
      } finally {
        setLoading(false)
      }
    }

    const fetchInvoices = async () => {
      try {
        const token = await getToken()
        const response = await fetch(`/api/master-admin/invoices?orgId=${params.orgId}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        })
        if (response.ok) {
          const data = await response.json()
          setInvoices(data.invoices)
        }
      } catch (error) {
        console.error('Failed to fetch invoices:', error)
      }
    }

    fetchOrganization()
    fetchInvoices()
  }, [params.orgId, getToken])

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invoiceForm.amount) return

    setCreatingInvoice(true)
    try {
      const token = await getToken()
      const response = await fetch('/api/master-admin/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          organizationId: params.orgId,
          ...invoiceForm,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Invoice #${data.invoice.invoiceNumber} created successfully!`)
        setShowInvoiceModal(false)
        setInvoiceForm({ invoiceType: 'custom', amount: '', description: '', dueDate: '', periodStart: '', periodEnd: '' })
        // Refresh invoices
        const invResponse = await fetch(`/api/master-admin/invoices?orgId=${params.orgId}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        })
        if (invResponse.ok) {
          const invData = await invResponse.json()
          setInvoices(invData.invoices)
        }
      }
    } catch (error) {
      console.error('Failed to create invoice:', error)
      alert('Failed to create invoice')
    } finally {
      setCreatingInvoice(false)
    }
  }

  const handleMarkPaid = async (invoiceId: string) => {
    try {
      const token = await getToken()
      const response = await fetch(`/api/master-admin/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: 'paid' }),
      })

      if (response.ok) {
        setInvoices(invoices.map(inv =>
          inv.id === invoiceId ? { ...inv, status: 'paid' as const, paidAt: new Date().toISOString() } : inv
        ))
      }
    } catch (error) {
      console.error('Failed to mark paid:', error)
    }
  }

  const handleImpersonate = async () => {
    setActionLoading('impersonate')
    try {
      const token = await getToken()
      const response = await fetch(`/api/master-admin/organizations/${params.orgId}/impersonate`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      if (response.ok) {
        // Use full page reload so browser sends the new impersonation cookies
        // router.push() is client-side and won't pick up new cookies properly
        window.location.href = '/dashboard/admin'
      }
    } catch (error) {
      console.error('Failed to impersonate:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleSuspend = async () => {
    if (!confirm('Are you sure you want to suspend this organization?')) return

    setActionLoading('suspend')
    try {
      const token = await getToken()
      const response = await fetch(`/api/master-admin/organizations/${params.orgId}/suspend`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      if (response.ok) {
        setOrganization(prev => prev ? { ...prev, status: 'suspended', subscriptionStatus: 'suspended' } : null)
      }
    } catch (error) {
      console.error('Failed to suspend:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleReactivate = async () => {
    setActionLoading('reactivate')
    try {
      const token = await getToken()
      const response = await fetch(`/api/master-admin/organizations/${params.orgId}/reactivate`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      if (response.ok) {
        setOrganization(prev => prev ? { ...prev, status: 'active', subscriptionStatus: 'active' } : null)
      }
    } catch (error) {
      console.error('Failed to reactivate:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleResendOnboarding = async () => {
    if (!confirm('Resend onboarding email to the organization admin?')) return

    setActionLoading('resend-onboarding')
    try {
      const token = await getToken()
      const response = await fetch(`/api/master-admin/organizations/${params.orgId}/resend-onboarding`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend onboarding email')
      }

      alert(`Onboarding email sent to ${data.sentTo}`)
    } catch (error: unknown) {
      console.error('Failed to resend onboarding:', error)
      alert(error instanceof Error ? error.message : 'Failed to resend onboarding email')
    } finally {
      setActionLoading(null)
    }
  }

  const fetchAllEvents = async () => {
    setLoadingEvents(true)
    try {
      const token = await getToken()
      const response = await fetch(`/api/master-admin/organizations/${params.orgId}/events`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      if (response.ok) {
        const data = await response.json()
        setAllEvents(data.events)
      }
    } catch (error) {
      console.error('Failed to fetch events:', error)
    } finally {
      setLoadingEvents(false)
    }
  }

  const handleToggleEventPublished = async (eventId: string, currentIsPublished: boolean) => {
    setUpdatingEventStatus(eventId)
    try {
      const token = await getToken()
      const newIsPublished = !currentIsPublished

      const response = await fetch(`/api/master-admin/organizations/${params.orgId}/events/${eventId}/publish`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ isPublished: newIsPublished }),
      })

      if (response.ok) {
        setAllEvents(prev => prev.map(event =>
          event.id === eventId ? { ...event, isPublished: newIsPublished } : event
        ))
      }
    } catch (error) {
      console.error('Failed to toggle event published status:', error)
    } finally {
      setUpdatingEventStatus(null)
    }
  }

  const handleToggleEventRegistration = async (eventId: string, currentStatus: string) => {
    setUpdatingEventStatus(eventId)
    try {
      const token = await getToken()
      // Toggle between registration_open and registration_closed
      // If currently registration_open, close it. Otherwise, open it.
      const newStatus = currentStatus === 'registration_open' ? 'registration_closed' : 'registration_open'

      const response = await fetch(`/api/master-admin/organizations/${params.orgId}/events/${eventId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        setAllEvents(prev => prev.map(event =>
          event.id === eventId ? { ...event, status: newStatus } : event
        ))
      }
    } catch (error) {
      console.error('Failed to toggle event registration status:', error)
    } finally {
      setUpdatingEventStatus(null)
    }
  }

  const handleRecalculateStorage = async () => {
    if (!confirm('Recalculate storage usage for this organization? This will aggregate all file sizes.')) return

    setActionLoading('recalculate-storage')
    try {
      const token = await getToken()
      const response = await fetch('/api/admin/storage/recalculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ organizationId: params.orgId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to recalculate storage')
      }

      // Update local state with new storage value
      setOrganization(prev => prev ? { ...prev, storageUsedGb: data.totalGb } : null)
      alert(`Storage recalculated: ${data.totalGb.toFixed(2)} GB used`)
    } catch (error: unknown) {
      console.error('Failed to recalculate storage:', error)
      alert(error instanceof Error ? error.message : 'Failed to recalculate storage')
    } finally {
      setActionLoading(null)
    }
  }

  const handleChangeAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!changeAdminForm.firstName || !changeAdminForm.lastName || !changeAdminForm.email) return

    setChangingAdmin(true)
    try {
      const token = await getToken()
      const response = await fetch(`/api/master-admin/organizations/${params.orgId}/change-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(changeAdminForm),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change organization admin')
      }

      // Update local state
      setOrganization(prev => {
        if (!prev) return prev
        return {
          ...prev,
          contactName: `${changeAdminForm.firstName} ${changeAdminForm.lastName}`,
          contactEmail: changeAdminForm.email,
          contactPhone: changeAdminForm.phone || prev.contactPhone,
          users: [{
            id: data.admin.id,
            firstName: data.admin.firstName,
            lastName: data.admin.lastName,
            email: data.admin.email,
            phone: changeAdminForm.phone || '',
            clerkUserId: data.admin.isOnboarded ? 'linked' : null,
          }],
        }
      })

      setShowChangeAdminModal(false)
      setChangeAdminForm({ firstName: '', lastName: '', email: '', phone: '', sendOnboardingEmail: true })

      const emailMsg = data.emailSent ? ' Onboarding email sent.' : ''
      alert(`Organization admin changed to ${data.admin.firstName} ${data.admin.lastName}.${emailMsg}`)
    } catch (error: unknown) {
      console.error('Failed to change admin:', error)
      alert(error instanceof Error ? error.message : 'Failed to change organization admin')
    } finally {
      setChangingAdmin(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-semibold text-gray-900">Organization not found</h2>
        <Link href="/dashboard/master-admin/organizations" className="text-purple-600 hover:text-purple-800 mt-2 inline-block">
          Back to Organizations
        </Link>
      </div>
    )
  }

  const orgAdmin = organization.users[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/master-admin/organizations"
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{organization.name}</h1>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[organization.status]}`}>
                {organization.status.charAt(0).toUpperCase() + organization.status.slice(1)}
              </span>
            </div>
            <p className="text-gray-600">{tierLabels[organization.subscriptionTier]} Tier</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleImpersonate}
            disabled={actionLoading !== null}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50"
          >
            {actionLoading === 'impersonate' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            Login as Org Admin
          </button>
          <Link
            href={`/dashboard/master-admin/organizations/${params.orgId}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Link>
          {organization.status === 'active' ? (
            <button
              onClick={handleSuspend}
              disabled={actionLoading !== null}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium disabled:opacity-50"
            >
              {actionLoading === 'suspend' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
              Suspend
            </button>
          ) : organization.status === 'suspended' && (
            <button
              onClick={handleReactivate}
              disabled={actionLoading !== null}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium disabled:opacity-50"
            >
              {actionLoading === 'reactivate' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Reactivate
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500">Created</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(organization.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Subscription</p>
                <p className="text-sm font-medium text-gray-900">
                  {tierLabels[organization.subscriptionTier]} {organization.billingCycle === 'annual' ? 'Annual' : 'Monthly'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">
                  {organization.billingCycle === 'annual' ? 'Annual' : 'Monthly'} Fee
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {formatCurrency(organization.billingCycle === 'annual' ? organization.annualPrice : organization.monthlyPrice)}/
                  {organization.billingCycle === 'annual' ? 'year' : 'month'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Next Billing</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(organization.subscriptionRenewsAt)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Payment Method</p>
                <p className="text-sm font-medium text-gray-900">
                  {organization.paymentMethodPreference === 'credit_card' ? 'Credit Card' : 'Check'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Setup Fee</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatCurrency(organization.setupFeeAmount)} ({organization.setupFeePaid ? (
                    <span className="text-green-600">Paid</span>
                  ) : (
                    <span className="text-red-600">Pending</span>
                  )})
                </p>
              </div>
            </div>
          </div>

          {/* Contact Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
            <div className="space-y-4">
              {orgAdmin && (
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {orgAdmin.firstName} {orgAdmin.lastName}
                    </p>
                    <p className="text-sm text-gray-500">Primary Contact</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <a href={`mailto:${organization.contactEmail}`} className="text-sm text-purple-600 hover:text-purple-800">
                  {organization.contactEmail}
                </a>
              </div>
              {organization.contactPhone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <a href={`tel:${organization.contactPhone}`} className="text-sm text-gray-900">
                    {organization.contactPhone}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Usage Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Usage (This Year)</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Events</span>
                  <span className="font-medium text-gray-900">
                    {organization.eventsUsed} / {organization.eventsPerYearLimit || 'Unlimited'}
                  </span>
                </div>
                {organization.eventsPerYearLimit && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${Math.min(100, (organization.eventsUsed / organization.eventsPerYearLimit) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Registrations</span>
                  <span className="font-medium text-gray-900">
                    {organization.registrationsUsed.toLocaleString()} / {organization.registrationsLimit?.toLocaleString() || 'Unlimited'}
                  </span>
                </div>
                {organization.registrationsLimit && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${Math.min(100, (organization.registrationsUsed / organization.registrationsLimit) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Storage</span>
                  <span className="font-medium text-gray-900">
                    {organization.storageUsedGb.toFixed(1)} GB / {organization.storageLimitGb} GB
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{ width: `${Math.min(100, (organization.storageUsedGb / organization.storageLimitGb) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Stripe Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Stripe Connect</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {organization.stripeOnboardingCompleted || organization.stripeAccountId ? (
                  <>
                    <Check className="h-5 w-5 text-green-500" />
                    <span className="text-sm text-gray-900">
                      Stripe Account {organization.stripeOnboardingCompleted ? 'Connected' : 'Linked'}
                    </span>
                  </>
                ) : (
                  <>
                    <X className="h-5 w-5 text-red-500" />
                    <span className="text-sm text-gray-900">Stripe Not Connected</span>
                  </>
                )}
              </div>
              {organization.stripeAccountId && (
                <p className="text-sm text-gray-500">Account ID: {organization.stripeAccountId}</p>
              )}
              {organization.stripeAccountId && !organization.stripeOnboardingCompleted && (
                <p className="text-xs text-yellow-600">Onboarding may still be in progress</p>
              )}
            </div>
          </div>

          {/* Modules Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Enabled Modules</h2>
            <div className="flex flex-wrap gap-3">
              {organization.modulesEnabled?.poros && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                  <Check className="h-4 w-4" />
                  Poros Portal
                </span>
              )}
              {organization.modulesEnabled?.salve && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                  <Check className="h-4 w-4" />
                  SALVE Check-In
                </span>
              )}
              {organization.modulesEnabled?.rapha && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                  <Check className="h-4 w-4" />
                  Rapha Medical
                </span>
              )}
            </div>
          </div>

          {/* Notes Card */}
          {organization.notes && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-yellow-900 mb-2">Master Admin Notes</h2>
              <p className="text-sm text-yellow-800 whitespace-pre-wrap">{organization.notes}</p>
            </div>
          )}
        </div>

        {/* Right column - Quick Stats & Actions */}
        <div className="space-y-6">
          {/* Stats Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Total Payments</span>
                <span className="text-sm font-semibold text-green-600">
                  {formatCurrency(organization.totalPayments)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Total Registrations</span>
                <span className="text-sm font-semibold text-gray-900">
                  {organization.totalRegistrations.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">Events</span>
                <span className="text-sm font-semibold text-gray-900">
                  {organization.eventsUsed}
                </span>
              </div>
            </div>
          </div>

          {/* Customization Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Customization</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded border"
                  style={{ backgroundColor: organization.primaryColor }}
                />
                <div>
                  <p className="text-xs text-gray-500">Primary Color</p>
                  <p className="text-sm font-mono text-gray-900">{organization.primaryColor}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded border"
                  style={{ backgroundColor: organization.secondaryColor }}
                />
                <div>
                  <p className="text-xs text-gray-500">Secondary Color</p>
                  <p className="text-sm font-mono text-gray-900">{organization.secondaryColor}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Events Management */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Events</h2>
              <button
                onClick={() => {
                  if (!showAllEvents && allEvents.length === 0) {
                    fetchAllEvents()
                  }
                  setShowAllEvents(!showAllEvents)
                }}
                className="text-sm text-purple-600 hover:text-purple-800 flex items-center gap-1"
              >
                {showAllEvents ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Manage All Events
                  </>
                )}
              </button>
            </div>

            {/* Quick View (Recent 5) */}
            {!showAllEvents && (
              <>
                {organization.events.length === 0 ? (
                  <p className="text-sm text-gray-500">No events yet</p>
                ) : (
                  <div className="space-y-3">
                    {organization.events.map(event => (
                      <div key={event.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{event.name}</p>
                          <p className="text-xs text-gray-500">{formatDate(event.startDate)}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          event.status === 'registration_open' ? 'bg-green-100 text-green-700' :
                          event.status === 'published' ? 'bg-blue-100 text-blue-700' :
                          event.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                          event.status === 'registration_closed' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {event.status.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Full Events Management */}
            {showAllEvents && (
              <div className="space-y-4">
                {loadingEvents ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 text-purple-600 animate-spin" />
                  </div>
                ) : allEvents.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No events found</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {allEvents.map(event => {
                      const isRegOpen = event.status === 'registration_open'
                      const isUpdating = updatingEventStatus === event.id

                      return (
                        <div key={event.id} className="p-4 border border-gray-200 rounded-lg space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{event.name}</p>
                              <p className="text-xs text-gray-500">
                                {formatDate(event.startDate)} - {formatDate(event.endDate)}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {event.totalRegistrations} registrations
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className={`text-xs px-2 py-1 rounded ${
                                event.status === 'registration_open' ? 'bg-green-100 text-green-700' :
                                event.status === 'registration_closed' ? 'bg-yellow-100 text-yellow-700' :
                                event.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {event.status.replace('_', ' ')}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                event.isPublished ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                              }`}>
                                {event.isPublished ? 'Published' : 'Unpublished'}
                              </span>
                            </div>
                          </div>

                          {/* Toggle Controls */}
                          <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
                            {/* Published Toggle */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {event.isPublished ? (
                                  <Eye className="h-4 w-4 text-green-600" />
                                ) : (
                                  <EyeOff className="h-4 w-4 text-gray-400" />
                                )}
                                <span className="text-sm text-gray-700">Published</span>
                              </div>
                              <button
                                onClick={() => handleToggleEventPublished(event.id, event.isPublished)}
                                disabled={isUpdating || event.status === 'completed' || event.status === 'cancelled'}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                  event.isPublished ? 'bg-green-500' : 'bg-gray-300'
                                } ${isUpdating || event.status === 'completed' || event.status === 'cancelled' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    event.isPublished ? 'translate-x-4' : 'translate-x-0.5'
                                  }`}
                                />
                              </button>
                            </div>

                            {/* Registration Toggle */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {isRegOpen ? (
                                  <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                  <X className="h-4 w-4 text-gray-400" />
                                )}
                                <span className="text-sm text-gray-700">Registration Open</span>
                              </div>
                              <button
                                onClick={() => handleToggleEventRegistration(event.id, event.status)}
                                disabled={isUpdating || event.status === 'completed' || event.status === 'cancelled'}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                  isRegOpen ? 'bg-green-500' : 'bg-gray-300'
                                } ${isUpdating || event.status === 'completed' || event.status === 'cancelled' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    isRegOpen ? 'translate-x-4' : 'translate-x-0.5'
                                  }`}
                                />
                              </button>
                            </div>
                          </div>

                          {/* View Event Link */}
                          <div className="pt-2">
                            <a
                              href={`/events/${event.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              View Event Page
                            </a>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Invoices */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Invoices</h2>
              <button
                onClick={() => setShowInvoiceModal(true)}
                className="text-sm text-purple-600 hover:text-purple-800 flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                New
              </button>
            </div>
            {invoices.length === 0 ? (
              <p className="text-sm text-gray-500">No invoices yet</p>
            ) : (
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {invoices.slice(0, 5).map(invoice => (
                  <div key={invoice.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">#{invoice.invoiceNumber}</p>
                      <p className="text-xs text-gray-500 capitalize">{invoice.invoiceType.replace('_', ' ')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{formatCurrency(invoice.amount)}</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${invoiceStatusColors[invoice.status]}`}>
                          {invoice.status}
                        </span>
                        {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                          <button
                            onClick={() => handleMarkPaid(invoice.id)}
                            className="text-xs text-green-600 hover:underline"
                          >
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <button
                onClick={handleResendOnboarding}
                disabled={actionLoading === 'resend-onboarding'}
                className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
              >
                {actionLoading === 'resend-onboarding' ? (
                  <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4 text-gray-400" />
                )}
                Resend Onboarding Email
              </button>
              <button
                onClick={() => setShowChangeAdminModal(true)}
                className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <UserCog className="h-4 w-4 text-gray-400" />
                Change Org Admin
              </button>
              <button
                onClick={() => setShowInvoiceModal(true)}
                className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <FileText className="h-4 w-4 text-gray-400" />
                Create Invoice
              </button>
              <button
                onClick={handleRecalculateStorage}
                disabled={actionLoading === 'recalculate-storage'}
                className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
              >
                {actionLoading === 'recalculate-storage' ? (
                  <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                ) : (
                  <HardDrive className="h-4 w-4 text-gray-400" />
                )}
                Recalculate Storage
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                <BarChart3 className="h-4 w-4 text-gray-400" />
                View Analytics
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Create Invoice</h2>
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Type
                </label>
                <select
                  value={invoiceForm.invoiceType === 'subscription' && invoiceForm.periodEnd ?
                    (new Date(invoiceForm.periodEnd).getTime() - new Date(invoiceForm.periodStart).getTime() > 60 * 24 * 60 * 60 * 1000
                      ? 'subscription_annual'
                      : 'subscription_monthly')
                    : invoiceForm.invoiceType}
                  onChange={(e) => handleInvoiceTypeChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="subscription_annual">Annual Subscription ({formatCurrency(organization?.annualPrice || 0)}/year)</option>
                  <option value="subscription_monthly">Monthly Subscription ({formatCurrency(organization?.monthlyPrice || 0)}/month)</option>
                  <option value="setup_fee">Setup Fee ({formatCurrency(organization?.setupFeeAmount || 250)})</option>
                  <option value="overage">Overage</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount ($) *
                </label>
                <input
                  type="number"
                  value={invoiceForm.amount}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
                  placeholder="0.00"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={invoiceForm.description}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })}
                  placeholder="Optional description"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              {invoiceForm.invoiceType === 'subscription' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Period Start
                    </label>
                    <input
                      type="date"
                      value={invoiceForm.periodStart}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, periodStart: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Period End
                    </label>
                    <input
                      type="date"
                      value={invoiceForm.periodEnd}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, periodEnd: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={invoiceForm.dueDate}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingInvoice || !invoiceForm.amount}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Receipt className="h-4 w-4" />
                  {creatingInvoice ? 'Creating...' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Admin Modal */}
      {showChangeAdminModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Change Organization Admin</h2>
              <button
                onClick={() => setShowChangeAdminModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleChangeAdmin} className="p-4 space-y-4">
              {orgAdmin && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Current Admin:</p>
                  <p className="text-sm font-medium text-gray-900">
                    {orgAdmin.firstName} {orgAdmin.lastName} ({orgAdmin.email})
                  </p>
                  {orgAdmin.clerkUserId && (
                    <p className="text-xs text-green-600 mt-1">Account active</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={changeAdminForm.firstName}
                    onChange={(e) => setChangeAdminForm({ ...changeAdminForm, firstName: e.target.value })}
                    placeholder="First name"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={changeAdminForm.lastName}
                    onChange={(e) => setChangeAdminForm({ ...changeAdminForm, lastName: e.target.value })}
                    placeholder="Last name"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={changeAdminForm.email}
                  onChange={(e) => setChangeAdminForm({ ...changeAdminForm, email: e.target.value })}
                  placeholder="admin@organization.com"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={changeAdminForm.phone}
                  onChange={(e) => setChangeAdminForm({ ...changeAdminForm, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sendOnboardingEmail"
                  checked={changeAdminForm.sendOnboardingEmail}
                  onChange={(e) => setChangeAdminForm({ ...changeAdminForm, sendOnboardingEmail: e.target.checked })}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="sendOnboardingEmail" className="text-sm text-gray-700">
                  Send onboarding email to new admin
                </label>
              </div>

              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> The current admin will be demoted to staff role. This action cannot be undone automatically.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowChangeAdminModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changingAdmin || !changeAdminForm.firstName || !changeAdminForm.lastName || !changeAdminForm.email}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserCog className="h-4 w-4" />
                  {changingAdmin ? 'Changing...' : 'Change Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
