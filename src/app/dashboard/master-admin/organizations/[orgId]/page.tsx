'use client'

import { useEffect, useState } from 'react'
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
  })
  const [creatingInvoice, setCreatingInvoice] = useState(false)

  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        const response = await fetch(`/api/master-admin/organizations/${params.orgId}`)
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
        const response = await fetch(`/api/master-admin/invoices?orgId=${params.orgId}`)
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
  }, [params.orgId])

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invoiceForm.amount) return

    setCreatingInvoice(true)
    try {
      const response = await fetch('/api/master-admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: params.orgId,
          ...invoiceForm,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Invoice #${data.invoice.invoiceNumber} created successfully!`)
        setShowInvoiceModal(false)
        setInvoiceForm({ invoiceType: 'custom', amount: '', description: '', dueDate: '' })
        // Refresh invoices
        const invResponse = await fetch(`/api/master-admin/invoices?orgId=${params.orgId}`)
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
      const response = await fetch(`/api/master-admin/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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
      const response = await fetch(`/api/master-admin/organizations/${params.orgId}/impersonate`, {
        method: 'POST',
      })
      if (response.ok) {
        router.push('/dashboard/admin')
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
      const response = await fetch(`/api/master-admin/organizations/${params.orgId}/suspend`, {
        method: 'POST',
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
      const response = await fetch(`/api/master-admin/organizations/${params.orgId}/reactivate`, {
        method: 'POST',
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

          {/* Recent Events */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Events</h2>
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
                      event.status === 'published' ? 'bg-green-100 text-green-700' :
                      event.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {event.status}
                    </span>
                  </div>
                ))}
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
                onClick={() => setShowInvoiceModal(true)}
                className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <FileText className="h-4 w-4 text-gray-400" />
                Create Invoice
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                <Mail className="h-4 w-4 text-gray-400" />
                Send Email
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
                  value={invoiceForm.invoiceType}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceType: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="setup_fee">Setup Fee</option>
                  <option value="subscription">Subscription</option>
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
    </div>
  )
}
