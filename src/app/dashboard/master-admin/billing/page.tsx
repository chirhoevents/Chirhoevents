'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { format } from 'date-fns'
import {
  DollarSign,
  FileText,
  CreditCard,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  Pause,
  Play,
  XCircle,
  Download,
  Plus,
  Search,
  Filter,
  StickyNote,
  RefreshCcw,
  Building2,
  Link,
  Copy,
  Mail,
  ExternalLink,
  CalendarClock,
  Loader2,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

// Types
interface TierBreakdown {
  [key: string]: { count: number; amount: number }
}

interface OverviewData {
  mrr: {
    current: number
    growth: number
    activeSubscriptions: number
    tierBreakdown: TierBreakdown
  }
  pendingInvoices: {
    count: number
    total: number
    items: Array<{
      id: string
      invoiceNumber: number
      amount: number
      dueDate: string
      status: string
      organizationName: string
    }>
  }
  thisMonthRevenue: {
    subscriptions: number
    setupFees: number
    platformFees: number
    overageCharges: number
    total: number
  }
  recentActivity: {
    payments: Array<{
      id: string
      amount: number
      type: string
      method: string
      organizationName: string
      date: string
    }>
    invoices: Array<{
      id: string
      invoiceNumber: number
      amount: number
      type: string
      status: string
      organizationName: string
      date: string
    }>
    subscriptionChanges: Array<{
      id: string
      name: string
      tier: string
      status: string
      date: string
    }>
  }
}

interface Subscription {
  id: string
  name: string
  subscriptionTier: string
  subscriptionStatus: string
  billingCycle: string
  monthlyFee: number
  annualPrice: number
  annualAmount: number
  subscriptionStartedAt: string | null
  subscriptionRenewsAt: string | null
  setupFeePaid: boolean
  setupFeeAmount: number
  paymentMethodPreference: string | null
  eventsUsed: number
  eventsPerYearLimit: number | null
  registrationsUsed: number
  registrationsLimit: number | null
  storageUsedGb: number
  storageLimitGb: number
  notes: string | null
  status: string
  hasOverdueInvoices: boolean
  recentPayments: Array<{
    id: string
    amount: number
    paymentType: string
    paymentMethod: string
    paymentStatus: string
    createdAt: string
  }>
  recentInvoices: Array<{
    id: string
    invoiceNumber: number
    amount: number
    status: string
    invoiceType: string
    dueDate: string
    paidAt: string | null
  }>
}

interface Invoice {
  id: string
  invoiceNumber: number
  organizationId: string
  organization?: { id: string; name: string }
  invoiceType: string
  amount: number
  description: string | null
  dueDate: string
  status: string
  paidAt: string | null
  createdAt: string
  paymentLink: string | null
}

interface Payment {
  id: string
  amount: number
  paymentType: string
  paymentMethod: string
  paymentStatus: string
  checkNumber: string | null
  checkDate: string | null
  cardLast4: string | null
  cardBrand: string | null
  authorizationCode: string | null
  transactionReference: string | null
  platformFeeAmount: number | null
  notes: string | null
  processedVia: string | null
  processedAt: string | null
  createdAt: string
  organizationId: string
  organizationName: string
  processedByName: string | null
}

interface BillingNote {
  id: string
  organizationId: string
  organizationName: string
  paymentId: string | null
  invoiceId: string | null
  noteType: string
  note: string
  createdByName: string
  createdAt: string
}

interface Organization {
  id: string
  name: string
  subscriptionTier: string
  billingCycle: string
  monthlyFee: number
  annualPrice: number
}

// Helper functions
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

const formatTierName = (tier: string) => {
  const tierMap: Record<string, string> = {
    // Current tier names
    starter: 'Starter',
    parish: 'Parish',
    cathedral: 'Cathedral',
    shrine: 'Shrine',
    basilica: 'Basilica',
    test: 'Test (Free)',
    // Legacy tier names (for backward compatibility)
    small_diocese: 'Parish',
    growing: 'Cathedral',
    conference: 'Shrine',
    enterprise: 'Basilica',
  }
  return tierMap[tier] || tier
}

const getStatusBadge = (status: string) => {
  const statusStyles: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    paid: 'bg-green-100 text-green-800',
    succeeded: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    overdue: 'bg-red-100 text-red-800',
    failed: 'bg-red-100 text-red-800',
    suspended: 'bg-orange-100 text-orange-800',
    cancelled: 'bg-gray-100 text-gray-800',
    archived: 'bg-gray-100 text-gray-800',
  }
  return statusStyles[status] || 'bg-gray-100 text-gray-800'
}

export default function BillingDashboard() {
  const { getToken } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Data states
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [billingNotes, setBillingNotes] = useState<BillingNote[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])

  // Filter states
  const [subscriptionFilter, setSubscriptionFilter] = useState('all')
  const [tierFilter, setTierFilter] = useState('all')
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('all')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal states
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null)
  const [showSubscriptionDetails, setShowSubscriptionDetails] = useState(false)
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [showProcessPaymentModal, setShowProcessPaymentModal] = useState(false)
  const [showAddNoteModal, setShowAddNoteModal] = useState(false)
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false)
  const [showGenerateInvoicesModal, setShowGenerateInvoicesModal] = useState(false)
  const [generateInvoicesLoading, setGenerateInvoicesLoading] = useState(false)
  const [generateInvoicesResult, setGenerateInvoicesResult] = useState<{
    success: boolean
    dryRun: boolean
    summary: { processed: number; invoicesCreated: number; emailsSent: number; skipped: number; errors: number }
    details: Array<{ orgName: string; status: string; reason?: string; invoiceNumber?: number; amount?: number }>
    errors: string[]
  } | null>(null)
  const [generateInvoicesDryRun, setGenerateInvoicesDryRun] = useState(true)

  // Form states
  const [markPaidForm, setMarkPaidForm] = useState({
    paymentMethod: 'check',
    paymentDate: format(new Date(), 'yyyy-MM-dd'),
    checkNumber: '',
    notes: '',
    sendReceipt: true,
  })

  const [processPaymentForm, setProcessPaymentForm] = useState({
    organizationId: '',
    paymentType: 'subscription',
    amount: '',
    description: '',
    paymentMethod: 'check',
    paymentDate: format(new Date(), 'yyyy-MM-dd'),
    checkNumber: '',
    checkDate: '',
    deposited: false,
    receiptNumber: '',
    cardLast4: '',
    authorizationCode: '',
    referenceNumber: '',
    notes: '',
    createInvoice: true,
    sendReceipt: true,
    activateSubscription: true,
    periodStart: format(new Date(), 'yyyy-MM-dd'),
    periodEnd: format(new Date(new Date().setFullYear(new Date().getFullYear() + 1)), 'yyyy-MM-dd'),
  })

  const [addNoteForm, setAddNoteForm] = useState({
    organizationId: '',
    noteType: 'general',
    note: '',
  })

  const [createInvoiceForm, setCreateInvoiceForm] = useState({
    organizationId: '',
    invoiceType: 'subscription',
    amount: '',
    description: '',
    dueDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    periodStart: format(new Date(), 'yyyy-MM-dd'),
    periodEnd: format(new Date(new Date().setFullYear(new Date().getFullYear() + 1)), 'yyyy-MM-dd'),
  })

  // Fetch functions
  const fetchOverview = useCallback(async () => {
    try {
      const token = await getToken()
      const res = await fetch('/api/master-admin/billing/overview', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error('Failed to fetch overview')
      const data = await res.json()
      setOverview(data)
    } catch (err) {
      console.error('Error fetching overview:', err)
      setError('Failed to load overview data')
    }
  }, [getToken])

  const fetchSubscriptions = useCallback(async () => {
    try {
      const token = await getToken()
      const params = new URLSearchParams()
      if (subscriptionFilter !== 'all') params.append('status', subscriptionFilter)
      if (tierFilter !== 'all') params.append('tier', tierFilter)

      const res = await fetch(`/api/master-admin/billing/subscriptions?${params}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error('Failed to fetch subscriptions')
      const data = await res.json()
      setSubscriptions(data.subscriptions)
    } catch (err) {
      console.error('Error fetching subscriptions:', err)
    }
  }, [getToken, subscriptionFilter, tierFilter])

  const fetchInvoices = useCallback(async () => {
    try {
      const token = await getToken()
      const params = new URLSearchParams()
      if (invoiceStatusFilter !== 'all') params.append('status', invoiceStatusFilter)

      const res = await fetch(`/api/master-admin/invoices?${params}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error('Failed to fetch invoices')
      const data = await res.json()
      setInvoices(data.invoices)
    } catch (err) {
      console.error('Error fetching invoices:', err)
    }
  }, [getToken, invoiceStatusFilter])

  const fetchPayments = useCallback(async () => {
    try {
      const token = await getToken()
      const params = new URLSearchParams()
      if (paymentMethodFilter !== 'all') params.append('method', paymentMethodFilter)

      const res = await fetch(`/api/master-admin/billing/payments?${params}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error('Failed to fetch payments')
      const data = await res.json()
      setPayments(data.payments)
    } catch (err) {
      console.error('Error fetching payments:', err)
    }
  }, [getToken, paymentMethodFilter])

  const fetchBillingNotes = useCallback(async () => {
    try {
      const token = await getToken()
      const res = await fetch('/api/master-admin/billing/notes', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error('Failed to fetch notes')
      const data = await res.json()
      setBillingNotes(data.notes)
    } catch (err) {
      console.error('Error fetching notes:', err)
    }
  }, [getToken])

  const fetchOrganizations = useCallback(async () => {
    try {
      const token = await getToken()
      const res = await fetch('/api/master-admin/organizations', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error('Failed to fetch organizations')
      const data = await res.json()
      setOrganizations(data.organizations || [])
    } catch (err) {
      console.error('Error fetching organizations:', err)
    }
  }, [getToken])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([
        fetchOverview(),
        fetchSubscriptions(),
        fetchInvoices(),
        fetchPayments(),
        fetchBillingNotes(),
        fetchOrganizations(),
      ])
      setLoading(false)
    }
    loadData()
  }, [fetchOverview, fetchSubscriptions, fetchInvoices, fetchPayments, fetchBillingNotes, fetchOrganizations])

  useEffect(() => {
    if (activeTab === 'subscriptions') {
      fetchSubscriptions()
    } else if (activeTab === 'invoices') {
      fetchInvoices()
    } else if (activeTab === 'payments') {
      fetchPayments()
    } else if (activeTab === 'notes') {
      fetchBillingNotes()
    }
  }, [activeTab, subscriptionFilter, tierFilter, invoiceStatusFilter, paymentMethodFilter, fetchSubscriptions, fetchInvoices, fetchPayments, fetchBillingNotes])

  // Action handlers
  const handleMarkPaid = async () => {
    if (!selectedInvoice) return

    try {
      const token = await getToken()
      const res = await fetch(`/api/master-admin/billing/invoices/${selectedInvoice.id}/mark-paid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(markPaidForm),
      })

      if (!res.ok) throw new Error('Failed to mark invoice as paid')

      setShowMarkPaidModal(false)
      setSelectedInvoice(null)
      fetchInvoices()
      fetchOverview()
    } catch (err) {
      console.error('Error marking invoice as paid:', err)
    }
  }

  const handleProcessPayment = async () => {
    try {
      const token = await getToken()
      const res = await fetch('/api/master-admin/billing/payments/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(processPaymentForm),
      })

      if (!res.ok) throw new Error('Failed to process payment')

      setShowProcessPaymentModal(false)
      setProcessPaymentForm({
        organizationId: '',
        paymentType: 'subscription',
        amount: '',
        description: '',
        paymentMethod: 'check',
        paymentDate: format(new Date(), 'yyyy-MM-dd'),
        checkNumber: '',
        checkDate: '',
        deposited: false,
        receiptNumber: '',
        cardLast4: '',
        authorizationCode: '',
        referenceNumber: '',
        notes: '',
        createInvoice: true,
        sendReceipt: true,
        activateSubscription: true,
        periodStart: format(new Date(), 'yyyy-MM-dd'),
        periodEnd: format(new Date(new Date().setFullYear(new Date().getFullYear() + 1)), 'yyyy-MM-dd'),
      })
      fetchPayments()
      fetchOverview()
    } catch (err) {
      console.error('Error processing payment:', err)
    }
  }

  const handleAddNote = async () => {
    try {
      const token = await getToken()
      const res = await fetch('/api/master-admin/billing/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(addNoteForm),
      })

      if (!res.ok) throw new Error('Failed to add note')

      setShowAddNoteModal(false)
      setAddNoteForm({ organizationId: '', noteType: 'general', note: '' })
      fetchBillingNotes()
    } catch (err) {
      console.error('Error adding note:', err)
    }
  }

  const handleCreateInvoice = async () => {
    try {
      const token = await getToken()
      const res = await fetch('/api/master-admin/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...createInvoiceForm,
          lineItems: createInvoiceForm.description ? [
            { description: createInvoiceForm.description, amount: parseFloat(createInvoiceForm.amount) }
          ] : null,
        }),
      })

      if (!res.ok) throw new Error('Failed to create invoice')

      const data = await res.json()
      setShowCreateInvoiceModal(false)
      setCreateInvoiceForm({
        organizationId: '',
        invoiceType: 'subscription',
        amount: '',
        description: '',
        dueDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        periodStart: format(new Date(), 'yyyy-MM-dd'),
        periodEnd: format(new Date(new Date().setFullYear(new Date().getFullYear() + 1)), 'yyyy-MM-dd'),
      })
      fetchInvoices()
      fetchOverview()
      alert(`Invoice #${data.invoice.invoiceNumber} created successfully!`)
    } catch (err) {
      console.error('Error creating invoice:', err)
      alert('Failed to create invoice')
    }
  }

  const handleSubscriptionAction = async (subscriptionId: string, action: string) => {
    try {
      const token = await getToken()
      const res = await fetch(`/api/master-admin/billing/subscriptions/${subscriptionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action }),
      })

      if (!res.ok) throw new Error(`Failed to ${action} subscription`)

      fetchSubscriptions()
      setShowSubscriptionDetails(false)
    } catch (err) {
      console.error(`Error ${action} subscription:`, err)
    }
  }

  const handleGenerateInvoices = async (dryRun: boolean) => {
    setGenerateInvoicesLoading(true)
    setGenerateInvoicesResult(null)

    try {
      const token = await getToken()
      const res = await fetch('/api/cron/generate-invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ dryRun, daysAhead: 30 }),
      })

      if (!res.ok) throw new Error('Failed to generate invoices')

      const data = await res.json()
      setGenerateInvoicesResult(data)

      if (!dryRun && data.summary.invoicesCreated > 0) {
        fetchInvoices()
        fetchOverview()
      }
    } catch (err) {
      console.error('Error generating invoices:', err)
      alert('Failed to generate invoices')
    } finally {
      setGenerateInvoicesLoading(false)
    }
  }

  const exportPaymentsCSV = () => {
    const headers = ['Date', 'Organization', 'Type', 'Method', 'Amount', 'Status', 'Notes']
    const rows = payments.map((p) => [
      format(new Date(p.createdAt), 'yyyy-MM-dd'),
      p.organizationName,
      p.paymentType,
      p.paymentMethod,
      p.amount.toFixed(2),
      p.paymentStatus,
      p.notes || '',
    ])

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payments-export-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  const handleCopyPaymentLink = async (invoice: Invoice) => {
    if (invoice.paymentLink) {
      await navigator.clipboard.writeText(invoice.paymentLink)
      alert('Payment link copied to clipboard!')
    } else {
      // Generate payment link first
      try {
        const token = await getToken()
        const res = await fetch(`/api/master-admin/invoices/${invoice.id}/payment-link`, {
          method: 'POST',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        })
        if (!res.ok) throw new Error('Failed to generate payment link')
        const data = await res.json()
        await navigator.clipboard.writeText(data.paymentLink)
        alert('Payment link generated and copied to clipboard!')
        fetchInvoices() // Refresh to get the new payment link
      } catch (err) {
        console.error('Error generating payment link:', err)
        alert('Failed to generate payment link')
      }
    }
  }

  const handleSendInvoiceEmail = async (invoice: Invoice, customEmail?: string) => {
    try {
      const token = await getToken()
      const res = await fetch(`/api/admin/invoices/${invoice.id}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: customEmail ? JSON.stringify({ email: customEmail }) : undefined,
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send invoice email')
      }
      const data = await res.json()
      alert(data.message || `Invoice email sent!`)
    } catch (err) {
      console.error('Error sending invoice email:', err)
      alert(err instanceof Error ? err.message : 'Failed to send invoice email')
    }
  }

  const promptAndSendInvoiceEmail = (invoice: Invoice) => {
    const email = prompt(
      `Send invoice to email address:\n(Leave blank to use organization's contact email)`,
      ''
    )
    if (email === null) return // User cancelled
    handleSendInvoiceEmail(invoice, email || undefined)
  }

  const handleOpenPaymentLink = (invoice: Invoice) => {
    if (invoice.paymentLink) {
      window.open(invoice.paymentLink, '_blank')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCcw className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg">
        <AlertCircle className="h-5 w-5 inline mr-2" />
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing Management</h1>
          <p className="text-gray-600 mt-1">Manage payments, subscriptions, and invoices</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setGenerateInvoicesResult(null)
              setGenerateInvoicesDryRun(true)
              setShowGenerateInvoicesModal(true)
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <CalendarClock className="h-4 w-4" />
            Generate Invoices
          </button>
          <button
            onClick={() => {
              fetchOverview()
              fetchSubscriptions()
              fetchInvoices()
              fetchPayments()
              fetchBillingNotes()
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-purple-600 border border-purple-600 rounded-lg hover:bg-purple-50"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6 mb-6 bg-gray-100 p-1 rounded-lg">
          <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md">
            Overview
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md">
            Subscriptions
          </TabsTrigger>
          <TabsTrigger value="invoices" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md">
            Invoices
          </TabsTrigger>
          <TabsTrigger value="payments" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md">
            Payments
          </TabsTrigger>
          <TabsTrigger value="process" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md">
            Process Payment
          </TabsTrigger>
          <TabsTrigger value="notes" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md">
            Notes
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          {overview && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* MRR Card */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <DollarSign className="h-8 w-8 text-green-500" />
                    <TrendingUp className={`h-5 w-5 ${overview.mrr.growth >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{formatCurrency(overview.mrr.current)}</p>
                  <p className="text-gray-600 text-sm">Monthly Recurring Revenue</p>
                  <p className={`text-sm mt-2 ${overview.mrr.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {overview.mrr.growth >= 0 ? '+' : ''}{formatCurrency(overview.mrr.growth)} from last month
                  </p>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-gray-500 text-xs">Active Subscriptions: {overview.mrr.activeSubscriptions}</p>
                    <div className="mt-2 space-y-1">
                      {Object.entries(overview.mrr.tierBreakdown).map(([tier, data]) => (
                        data.count > 0 && (
                          <div key={tier} className="flex justify-between text-xs text-gray-600">
                            <span>{formatTierName(tier)}: {data.count}</span>
                            <span>{formatCurrency(data.amount)}</span>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                </div>

                {/* Pending Invoices Card */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <FileText className="h-8 w-8 text-yellow-500" />
                    <Badge className="bg-yellow-100 text-yellow-800">{overview.pendingInvoices.count}</Badge>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(overview.pendingInvoices.total)}</p>
                  <p className="text-gray-600 text-sm">Pending Invoices</p>
                  <button
                    onClick={() => setActiveTab('invoices')}
                    className="mt-4 text-sm text-purple-600 hover:text-purple-800 flex items-center gap-1"
                  >
                    View All Pending <span className="text-lg">→</span>
                  </button>
                </div>

                {/* This Month Revenue Card */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <CreditCard className="h-8 w-8 text-purple-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(overview.thisMonthRevenue.total)}</p>
                  <p className="text-gray-600 text-sm">Revenue This Month</p>
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Subscriptions</span>
                      <span className="font-medium">{formatCurrency(overview.thisMonthRevenue.subscriptions)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Setup Fees</span>
                      <span className="font-medium">{formatCurrency(overview.thisMonthRevenue.setupFees)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Platform Fees</span>
                      <span className="font-medium">{formatCurrency(overview.thisMonthRevenue.platformFees)}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Stats Card */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <Users className="h-8 w-8 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{overview.mrr.activeSubscriptions}</p>
                  <p className="text-gray-600 text-sm">Active Organizations</p>
                  <div className="mt-4 space-y-2">
                    {Object.entries(overview.mrr.tierBreakdown).map(([tier, data]) => (
                      data.count > 0 && (
                        <div key={tier} className="flex justify-between text-sm">
                          <span className="text-gray-500">{formatTierName(tier)}</span>
                          <span className="font-medium">{data.count}</span>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Payments */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">Recent Payments</h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {overview.recentActivity.payments.slice(0, 5).map((payment) => (
                      <div key={payment.id} className="px-6 py-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{payment.organizationName}</p>
                          <p className="text-sm text-gray-500">
                            {payment.method} • {format(new Date(payment.date), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <p className="font-semibold text-green-600">{formatCurrency(payment.amount)}</p>
                      </div>
                    ))}
                    {overview.recentActivity.payments.length === 0 && (
                      <p className="px-6 py-4 text-gray-500 text-sm">No recent payments</p>
                    )}
                  </div>
                </div>

                {/* Recent Invoices */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">Recent Invoices</h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {overview.recentActivity.invoices.slice(0, 5).map((invoice) => (
                      <div key={invoice.id} className="px-6 py-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">#{invoice.invoiceNumber} - {invoice.organizationName}</p>
                          <p className="text-sm text-gray-500">
                            {invoice.type} • {format(new Date(invoice.date), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(invoice.amount)}</p>
                          <Badge className={getStatusBadge(invoice.status)}>{invoice.status}</Badge>
                        </div>
                      </div>
                    ))}
                    {overview.recentActivity.invoices.length === 0 && (
                      <p className="px-6 py-4 text-gray-500 text-sm">No recent invoices</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions">
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-500">Filters:</span>
              </div>
              <select
                value={subscriptionFilter}
                onChange={(e) => setSubscriptionFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="past_due">Past Due</option>
                <option value="suspended">Suspended</option>
                <option value="archived">Cancelled</option>
              </select>
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All Tiers</option>
                <option value="starter">Starter</option>
                <option value="parish">Parish</option>
                <option value="cathedral">Cathedral</option>
                <option value="shrine">Shrine</option>
                <option value="basilica">Basilica</option>
              </select>
              <div className="flex-1">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search organizations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Subscriptions Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Organization
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tier
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Billing
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Next Renewal
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {subscriptions
                      .filter((sub) =>
                        searchQuery === '' ||
                        sub.name.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((subscription) => (
                        <tr key={subscription.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <Building2 className="h-5 w-5 text-gray-400" />
                              <div>
                                <p className="font-medium text-gray-900">{subscription.name}</p>
                                {subscription.hasOverdueInvoices && (
                                  <span className="text-xs text-red-600">Has overdue invoices</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge className="bg-purple-100 text-purple-800">
                              {formatTierName(subscription.subscriptionTier)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <Badge className={getStatusBadge(subscription.subscriptionStatus)}>
                              {subscription.subscriptionStatus}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {subscription.billingCycle === 'annual' ? 'Annual' : 'Monthly'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {subscription.subscriptionRenewsAt
                              ? format(new Date(subscription.subscriptionRenewsAt), 'MMM d, yyyy')
                              : '-'}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium">
                            {subscription.billingCycle === 'annual'
                              ? `${formatCurrency(subscription.annualAmount)}/yr`
                              : `${formatCurrency(subscription.monthlyFee)}/mo`}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setSelectedSubscription(subscription)
                                  setShowSubscriptionDetails(true)
                                }}
                                className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg"
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {subscription.subscriptionStatus === 'active' && (
                                <button
                                  onClick={() => handleSubscriptionAction(subscription.id, 'pause')}
                                  className="p-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg"
                                  title="Pause"
                                >
                                  <Pause className="h-4 w-4" />
                                </button>
                              )}
                              {subscription.subscriptionStatus === 'suspended' && (
                                <button
                                  onClick={() => handleSubscriptionAction(subscription.id, 'resume')}
                                  className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg"
                                  title="Resume"
                                >
                                  <Play className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleSubscriptionAction(subscription.id, 'cancel')}
                                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                title="Cancel"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {subscriptions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No subscriptions found
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-500">Filters:</span>
                </div>
                <select
                  value={invoiceStatusFilter}
                  onChange={(e) => setInvoiceStatusFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <Button
                onClick={() => setShowCreateInvoiceModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Invoice
              </Button>
            </div>

            {/* Invoices Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice #
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Organization
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Due Date
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">
                          #{invoice.invoiceNumber}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {invoice.organization?.name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4">
                          <Badge className="bg-gray-100 text-gray-800">
                            {invoice.invoiceType.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 font-medium">
                          {formatCurrency(Number(invoice.amount))}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={getStatusBadge(invoice.status)}>
                            {invoice.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                              <>
                                <button
                                  onClick={() => handleCopyPaymentLink(invoice)}
                                  className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg"
                                  title={invoice.paymentLink ? 'Copy Payment Link' : 'Generate & Copy Payment Link'}
                                >
                                  {invoice.paymentLink ? <Copy className="h-4 w-4" /> : <Link className="h-4 w-4" />}
                                </button>
                                {invoice.paymentLink && (
                                  <button
                                    onClick={() => handleOpenPaymentLink(invoice)}
                                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                    title="Open Payment Page"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => promptAndSendInvoiceEmail(invoice)}
                                  className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                  title="Send Invoice Email"
                                >
                                  <Mail className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedInvoice(invoice)
                                    setShowMarkPaidModal(true)
                                  }}
                                  className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg"
                                  title="Mark Paid"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => {
                                alert(
                                  `Invoice #${invoice.invoiceNumber}\n\n` +
                                  `Organization: ${invoice.organization?.name || 'Unknown'}\n` +
                                  `Type: ${invoice.invoiceType.replace('_', ' ')}\n` +
                                  `Amount: ${formatCurrency(Number(invoice.amount))}\n` +
                                  `Due Date: ${format(new Date(invoice.dueDate), 'MMM d, yyyy')}\n` +
                                  `Status: ${invoice.status}\n` +
                                  `Created: ${format(new Date(invoice.createdAt), 'MMM d, yyyy')}\n` +
                                  (invoice.paidAt ? `Paid: ${format(new Date(invoice.paidAt), 'MMM d, yyyy')}\n` : '') +
                                  (invoice.description ? `Description: ${invoice.description}` : '')
                                )
                              }}
                              className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {invoices.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No invoices found
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <div className="space-y-4">
            {/* Filters and Export */}
            <div className="flex flex-wrap gap-4 items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-500">Filters:</span>
                </div>
                <select
                  value={paymentMethodFilter}
                  onChange={(e) => setPaymentMethodFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">All Methods</option>
                  <option value="card">Card</option>
                  <option value="check">Check</option>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
              <button
                onClick={exportPaymentsCSV}
                className="inline-flex items-center gap-2 px-4 py-2 text-purple-600 border border-purple-600 rounded-lg hover:bg-purple-50"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>

            {/* Payments Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Organization
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Method
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Notes
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {format(new Date(payment.createdAt), 'MMM d, yyyy')}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {payment.organizationName}
                        </td>
                        <td className="px-6 py-4">
                          <Badge className="bg-gray-100 text-gray-800">
                            {payment.paymentType}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {payment.paymentMethod}
                          {payment.checkNumber && ` #${payment.checkNumber}`}
                          {payment.cardLast4 && ` ****${payment.cardLast4}`}
                        </td>
                        <td className="px-6 py-4 font-medium text-green-600">
                          {formatCurrency(payment.amount)}
                          {payment.platformFeeAmount && (
                            <span className="block text-xs text-gray-500">
                              Fee: {formatCurrency(payment.platformFeeAmount)}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={getStatusBadge(payment.paymentStatus)}>
                            {payment.paymentStatus}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {payment.notes || '-'}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {payments.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No payments found
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Process Payment Tab */}
        <TabsContent value="process">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Manual Payment Processing</h3>

              <div className="space-y-6">
                {/* Organization Selection */}
                <div>
                  <Label htmlFor="org" className="text-sm font-medium text-gray-700">
                    Select Organization *
                  </Label>
                  <select
                    id="org"
                    value={processPaymentForm.organizationId}
                    onChange={(e) => {
                      const org = organizations.find((o) => o.id === e.target.value)
                      setProcessPaymentForm({
                        ...processPaymentForm,
                        organizationId: e.target.value,
                        amount: org
                          ? org.billingCycle === 'annual'
                            ? String(org.annualPrice)
                            : String(org.monthlyFee)
                          : '',
                      })
                    }}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Select an organization...</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name} - {formatTierName(org.subscriptionTier)} ({org.billingCycle})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Payment Type */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">Payment Type *</Label>
                  <div className="mt-2 space-y-2">
                    {[
                      { value: 'subscription', label: 'Subscription Payment' },
                      { value: 'setup_fee', label: 'Setup Fee ($250)' },
                      { value: 'overage', label: 'Overage Charge' },
                      { value: 'custom', label: 'Custom Payment' },
                    ].map((type) => (
                      <label key={type.value} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="paymentType"
                          value={type.value}
                          checked={processPaymentForm.paymentType === type.value}
                          onChange={(e) => {
                            let amount = processPaymentForm.amount
                            if (e.target.value === 'setup_fee') {
                              amount = '250'
                            }
                            setProcessPaymentForm({
                              ...processPaymentForm,
                              paymentType: e.target.value,
                              amount,
                            })
                          }}
                          className="text-purple-600"
                        />
                        <span className="text-sm text-gray-700">{type.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <Label htmlFor="amount" className="text-sm font-medium text-gray-700">
                    Amount *
                  </Label>
                  <div className="mt-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={processPaymentForm.amount}
                      onChange={(e) => setProcessPaymentForm({ ...processPaymentForm, amount: e.target.value })}
                      className="pl-8"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Subscription Period (if subscription type) */}
                {processPaymentForm.paymentType === 'subscription' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="periodStart" className="text-sm font-medium text-gray-700">
                        Period Start
                      </Label>
                      <Input
                        id="periodStart"
                        type="date"
                        value={processPaymentForm.periodStart}
                        onChange={(e) => setProcessPaymentForm({ ...processPaymentForm, periodStart: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="periodEnd" className="text-sm font-medium text-gray-700">
                        Period End
                      </Label>
                      <Input
                        id="periodEnd"
                        type="date"
                        value={processPaymentForm.periodEnd}
                        onChange={(e) => setProcessPaymentForm({ ...processPaymentForm, periodEnd: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}

                {/* Payment Method */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">Payment Method *</Label>
                  <div className="mt-2 space-y-2">
                    {[
                      { value: 'check', label: 'Check' },
                      { value: 'cash', label: 'Cash' },
                      { value: 'card_manual', label: 'Credit Card (Terminal/Phone)' },
                      { value: 'bank_transfer', label: 'Bank Transfer/Wire' },
                    ].map((method) => (
                      <label key={method.value} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method.value}
                          checked={processPaymentForm.paymentMethod === method.value}
                          onChange={(e) => setProcessPaymentForm({ ...processPaymentForm, paymentMethod: e.target.value })}
                          className="text-purple-600"
                        />
                        <span className="text-sm text-gray-700">{method.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Method-specific fields */}
                {processPaymentForm.paymentMethod === 'check' && (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <Label htmlFor="checkNumber" className="text-sm font-medium text-gray-700">
                        Check Number
                      </Label>
                      <Input
                        id="checkNumber"
                        value={processPaymentForm.checkNumber}
                        onChange={(e) => setProcessPaymentForm({ ...processPaymentForm, checkNumber: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="checkDate" className="text-sm font-medium text-gray-700">
                        Check Date
                      </Label>
                      <Input
                        id="checkDate"
                        type="date"
                        value={processPaymentForm.checkDate}
                        onChange={(e) => setProcessPaymentForm({ ...processPaymentForm, checkDate: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={processPaymentForm.deposited}
                        onChange={(e) => setProcessPaymentForm({ ...processPaymentForm, deposited: e.target.checked })}
                        className="text-purple-600 rounded"
                      />
                      <span className="text-sm text-gray-700">Deposited</span>
                    </label>
                  </div>
                )}

                {processPaymentForm.paymentMethod === 'card_manual' && (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <Label htmlFor="cardLast4" className="text-sm font-medium text-gray-700">
                        Last 4 Digits
                      </Label>
                      <Input
                        id="cardLast4"
                        maxLength={4}
                        value={processPaymentForm.cardLast4}
                        onChange={(e) => setProcessPaymentForm({ ...processPaymentForm, cardLast4: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="authCode" className="text-sm font-medium text-gray-700">
                        Authorization Code
                      </Label>
                      <Input
                        id="authCode"
                        value={processPaymentForm.authorizationCode}
                        onChange={(e) => setProcessPaymentForm({ ...processPaymentForm, authorizationCode: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}

                {processPaymentForm.paymentMethod === 'bank_transfer' && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <Label htmlFor="refNumber" className="text-sm font-medium text-gray-700">
                      Reference Number
                    </Label>
                    <Input
                      id="refNumber"
                      value={processPaymentForm.referenceNumber}
                      onChange={(e) => setProcessPaymentForm({ ...processPaymentForm, referenceNumber: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                )}

                {/* Payment Date */}
                <div>
                  <Label htmlFor="paymentDate" className="text-sm font-medium text-gray-700">
                    Payment Date *
                  </Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={processPaymentForm.paymentDate}
                    onChange={(e) => setProcessPaymentForm({ ...processPaymentForm, paymentDate: e.target.value })}
                    className="mt-1"
                  />
                </div>

                {/* Notes */}
                <div>
                  <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
                    Internal Notes
                  </Label>
                  <textarea
                    id="notes"
                    rows={3}
                    value={processPaymentForm.notes}
                    onChange={(e) => setProcessPaymentForm({ ...processPaymentForm, notes: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="e.g., Received check in mail on 12/28. Check #4567 from First National Bank."
                  />
                </div>

                {/* Options */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={processPaymentForm.createInvoice}
                      onChange={(e) => setProcessPaymentForm({ ...processPaymentForm, createInvoice: e.target.checked })}
                      className="text-purple-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Create invoice for this payment</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={processPaymentForm.sendReceipt}
                      onChange={(e) => setProcessPaymentForm({ ...processPaymentForm, sendReceipt: e.target.checked })}
                      className="text-purple-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Send receipt email to organization</span>
                  </label>
                  {processPaymentForm.paymentType === 'subscription' && (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={processPaymentForm.activateSubscription}
                        onChange={(e) => setProcessPaymentForm({ ...processPaymentForm, activateSubscription: e.target.checked })}
                        className="text-purple-600 rounded"
                      />
                      <span className="text-sm text-gray-700">Activate subscription (if applicable)</span>
                    </label>
                  )}
                </div>

                {/* Submit */}
                <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setProcessPaymentForm({
                        organizationId: '',
                        paymentType: 'subscription',
                        amount: '',
                        description: '',
                        paymentMethod: 'check',
                        paymentDate: format(new Date(), 'yyyy-MM-dd'),
                        checkNumber: '',
                        checkDate: '',
                        deposited: false,
                        receiptNumber: '',
                        cardLast4: '',
                        authorizationCode: '',
                        referenceNumber: '',
                        notes: '',
                        createInvoice: true,
                        sendReceipt: true,
                        activateSubscription: true,
                        periodStart: format(new Date(), 'yyyy-MM-dd'),
                        periodEnd: format(new Date(new Date().setFullYear(new Date().getFullYear() + 1)), 'yyyy-MM-dd'),
                      })
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleProcessPayment}
                    disabled={!processPaymentForm.organizationId || !processPaymentForm.amount}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    Record Payment
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes">
          <div className="space-y-4">
            {/* Add Note Button */}
            <div className="flex justify-end">
              <Button
                onClick={() => setShowAddNoteModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Note
              </Button>
            </div>

            {/* Notes List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="divide-y divide-gray-200">
                {billingNotes.map((note) => (
                  <div key={note.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <StickyNote className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{note.organizationName}</span>
                            <Badge className="bg-gray-100 text-gray-700 text-xs">
                              {note.noteType.replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="mt-2 text-gray-700">{note.note}</p>
                          <p className="mt-2 text-sm text-gray-500">
                            By {note.createdByName} • {format(new Date(note.createdAt), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {billingNotes.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No billing notes found
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Subscription Details Modal */}
      <Dialog open={showSubscriptionDetails} onOpenChange={setShowSubscriptionDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Subscription Details - {selectedSubscription?.name}</DialogTitle>
          </DialogHeader>
          {selectedSubscription && (
            <div className="space-y-6">
              {/* Status */}
              <div className="flex items-center gap-4">
                <Badge className={`${getStatusBadge(selectedSubscription.subscriptionStatus)} text-sm px-3 py-1`}>
                  {selectedSubscription.subscriptionStatus}
                </Badge>
                <Badge className="bg-purple-100 text-purple-800 text-sm px-3 py-1">
                  {formatTierName(selectedSubscription.subscriptionTier)} {selectedSubscription.billingCycle === 'annual' ? 'Annual' : 'Monthly'}
                </Badge>
              </div>

              {/* Subscription Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Amount</p>
                  <p className="font-medium">
                    {selectedSubscription.billingCycle === 'annual'
                      ? `${formatCurrency(selectedSubscription.annualAmount)}/year`
                      : `${formatCurrency(selectedSubscription.monthlyFee)}/month`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payment Method</p>
                  <p className="font-medium">{selectedSubscription.paymentMethodPreference || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Started</p>
                  <p className="font-medium">
                    {selectedSubscription.subscriptionStartedAt
                      ? format(new Date(selectedSubscription.subscriptionStartedAt), 'MMM d, yyyy')
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Next Renewal</p>
                  <p className="font-medium">
                    {selectedSubscription.subscriptionRenewsAt
                      ? format(new Date(selectedSubscription.subscriptionRenewsAt), 'MMM d, yyyy')
                      : '-'}
                  </p>
                </div>
              </div>

              {/* Usage */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Usage</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-500">Events</p>
                    <p className="font-medium">
                      {selectedSubscription.eventsUsed} / {selectedSubscription.eventsPerYearLimit || '∞'}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-500">Registrations</p>
                    <p className="font-medium">
                      {selectedSubscription.registrationsUsed} / {selectedSubscription.registrationsLimit || '∞'}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-500">Storage</p>
                    <p className="font-medium">
                      {selectedSubscription.storageUsedGb} / {selectedSubscription.storageLimitGb} GB
                    </p>
                  </div>
                </div>
              </div>

              {/* Recent Payments */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Recent Payments</h4>
                <div className="space-y-2">
                  {selectedSubscription.recentPayments.slice(0, 3).map((payment) => (
                    <div key={payment.id} className="flex justify-between items-center py-2 border-b border-gray-100">
                      <div>
                        <span className="text-sm text-gray-600">
                          {format(new Date(payment.createdAt), 'MMM d, yyyy')}
                        </span>
                        <span className="mx-2 text-gray-400">•</span>
                        <span className="text-sm text-gray-600">{payment.paymentMethod}</span>
                      </div>
                      <span className="font-medium text-green-600">{formatCurrency(payment.amount)}</span>
                    </div>
                  ))}
                  {selectedSubscription.recentPayments.length === 0 && (
                    <p className="text-sm text-gray-500">No payments recorded</p>
                  )}
                </div>
              </div>

              {/* Notes */}
              {selectedSubscription.notes && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedSubscription.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newTier = prompt(
                      `Upgrade subscription tier for ${selectedSubscription.name}\n\nCurrent tier: ${formatTierName(selectedSubscription.subscriptionTier)}\n\nEnter new tier (starter, parish, cathedral, shrine, basilica):`,
                      selectedSubscription.subscriptionTier
                    )
                    if (newTier && newTier !== selectedSubscription.subscriptionTier) {
                      handleSubscriptionAction(selectedSubscription.id, `upgrade_${newTier}`)
                    }
                  }}
                >
                  Upgrade Tier
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newCycle = selectedSubscription.billingCycle === 'annual' ? 'monthly' : 'annual'
                    if (confirm(`Change billing cycle from ${selectedSubscription.billingCycle} to ${newCycle}?`)) {
                      handleSubscriptionAction(selectedSubscription.id, `change_cycle_${newCycle}`)
                    }
                  }}
                >
                  Change Billing Cycle
                </Button>
                {selectedSubscription.subscriptionStatus === 'active' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-orange-600 border-orange-600 hover:bg-orange-50"
                    onClick={() => handleSubscriptionAction(selectedSubscription.id, 'pause')}
                  >
                    <Pause className="h-4 w-4 mr-1" />
                    Pause Subscription
                  </Button>
                )}
                {selectedSubscription.subscriptionStatus === 'suspended' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-green-600 border-green-600 hover:bg-green-50"
                    onClick={() => handleSubscriptionAction(selectedSubscription.id, 'resume')}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Resume Subscription
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-600 hover:bg-red-50"
                  onClick={() => handleSubscriptionAction(selectedSubscription.id, 'cancel')}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Cancel Subscription
                </Button>
                <Button
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={() => {
                    setProcessPaymentForm({
                      ...processPaymentForm,
                      organizationId: selectedSubscription.id,
                    })
                    setShowSubscriptionDetails(false)
                    setActiveTab('process')
                  }}
                >
                  <CreditCard className="h-4 w-4 mr-1" />
                  Process Payment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mark Paid Modal */}
      <Dialog open={showMarkPaidModal} onOpenChange={setShowMarkPaidModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Invoice as Paid</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Invoice</p>
                <p className="font-medium">#{selectedInvoice.invoiceNumber}</p>
                <p className="text-2xl font-bold mt-2">{formatCurrency(Number(selectedInvoice.amount))}</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Payment Method</Label>
                <div className="mt-2 space-y-2">
                  {['check', 'cash', 'card', 'bank_transfer', 'other'].map((method) => (
                    <label key={method} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="markPaidMethod"
                        value={method}
                        checked={markPaidForm.paymentMethod === method}
                        onChange={(e) => setMarkPaidForm({ ...markPaidForm, paymentMethod: e.target.value })}
                        className="text-purple-600"
                      />
                      <span className="text-sm text-gray-700 capitalize">{method.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="markPaidDate" className="text-sm font-medium text-gray-700">
                  Payment Date
                </Label>
                <Input
                  id="markPaidDate"
                  type="date"
                  value={markPaidForm.paymentDate}
                  onChange={(e) => setMarkPaidForm({ ...markPaidForm, paymentDate: e.target.value })}
                  className="mt-1"
                />
              </div>

              {markPaidForm.paymentMethod === 'check' && (
                <div>
                  <Label htmlFor="markPaidCheckNumber" className="text-sm font-medium text-gray-700">
                    Check Number
                  </Label>
                  <Input
                    id="markPaidCheckNumber"
                    value={markPaidForm.checkNumber}
                    onChange={(e) => setMarkPaidForm({ ...markPaidForm, checkNumber: e.target.value })}
                    className="mt-1"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="markPaidNotes" className="text-sm font-medium text-gray-700">
                  Notes
                </Label>
                <textarea
                  id="markPaidNotes"
                  rows={3}
                  value={markPaidForm.notes}
                  onChange={(e) => setMarkPaidForm({ ...markPaidForm, notes: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="e.g., Check received and deposited on 12/30/2025"
                />
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={markPaidForm.sendReceipt}
                  onChange={(e) => setMarkPaidForm({ ...markPaidForm, sendReceipt: e.target.checked })}
                  className="text-purple-600 rounded"
                />
                <span className="text-sm text-gray-700">Send receipt email to organization</span>
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMarkPaidModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleMarkPaid} className="bg-green-600 hover:bg-green-700 text-white">
              Mark as Paid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Note Modal */}
      <Dialog open={showAddNoteModal} onOpenChange={setShowAddNoteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Billing Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="noteOrg" className="text-sm font-medium text-gray-700">
                Organization *
              </Label>
              <select
                id="noteOrg"
                value={addNoteForm.organizationId}
                onChange={(e) => setAddNoteForm({ ...addNoteForm, organizationId: e.target.value })}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">Select an organization...</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700">Note Type</Label>
              <select
                value={addNoteForm.noteType}
                onChange={(e) => setAddNoteForm({ ...addNoteForm, noteType: e.target.value })}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="general">General</option>
                <option value="check_expected">Check Expected</option>
                <option value="check_received">Check Received</option>
                <option value="payment_plan">Payment Plan</option>
                <option value="reminder_sent">Reminder Sent</option>
                <option value="special_arrangement">Special Arrangement</option>
              </select>
            </div>

            <div>
              <Label htmlFor="noteText" className="text-sm font-medium text-gray-700">
                Note *
              </Label>
              <textarea
                id="noteText"
                rows={4}
                value={addNoteForm.note}
                onChange={(e) => setAddNoteForm({ ...addNoteForm, note: e.target.value })}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Enter your note..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddNoteModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddNote}
              disabled={!addNoteForm.organizationId || !addNoteForm.note}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Add Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Invoice Modal */}
      <Dialog open={showCreateInvoiceModal} onOpenChange={setShowCreateInvoiceModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="invoiceOrg" className="text-sm font-medium text-gray-700">
                Organization *
              </Label>
              <select
                id="invoiceOrg"
                value={createInvoiceForm.organizationId}
                onChange={(e) => {
                  const org = organizations.find((o) => o.id === e.target.value)
                  setCreateInvoiceForm({
                    ...createInvoiceForm,
                    organizationId: e.target.value,
                    amount: org
                      ? org.billingCycle === 'annual'
                        ? String(org.annualPrice)
                        : String(org.monthlyFee)
                      : '',
                  })
                }}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">Select an organization...</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} - {formatTierName(org.subscriptionTier)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700">Invoice Type *</Label>
              <select
                value={createInvoiceForm.invoiceType}
                onChange={(e) => {
                  let amount = createInvoiceForm.amount
                  if (e.target.value === 'setup_fee') {
                    amount = '250'
                  }
                  setCreateInvoiceForm({
                    ...createInvoiceForm,
                    invoiceType: e.target.value,
                    amount,
                  })
                }}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="subscription">Subscription</option>
                <option value="setup_fee">Setup Fee</option>
                <option value="reactivation_fee">Reactivation Fee</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div>
              <Label htmlFor="invoiceAmount" className="text-sm font-medium text-gray-700">
                Amount *
              </Label>
              <div className="mt-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  id="invoiceAmount"
                  type="number"
                  step="0.01"
                  value={createInvoiceForm.amount}
                  onChange={(e) => setCreateInvoiceForm({ ...createInvoiceForm, amount: e.target.value })}
                  className="pl-8"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="invoiceDescription" className="text-sm font-medium text-gray-700">
                Description
              </Label>
              <Input
                id="invoiceDescription"
                value={createInvoiceForm.description}
                onChange={(e) => setCreateInvoiceForm({ ...createInvoiceForm, description: e.target.value })}
                className="mt-1"
                placeholder="e.g., Annual subscription for 2026"
              />
            </div>

            <div>
              <Label htmlFor="invoiceDueDate" className="text-sm font-medium text-gray-700">
                Due Date *
              </Label>
              <Input
                id="invoiceDueDate"
                type="date"
                value={createInvoiceForm.dueDate}
                onChange={(e) => setCreateInvoiceForm({ ...createInvoiceForm, dueDate: e.target.value })}
                className="mt-1"
              />
            </div>

            {createInvoiceForm.invoiceType === 'subscription' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="invoicePeriodStart" className="text-sm font-medium text-gray-700">
                    Period Start
                  </Label>
                  <Input
                    id="invoicePeriodStart"
                    type="date"
                    value={createInvoiceForm.periodStart}
                    onChange={(e) => setCreateInvoiceForm({ ...createInvoiceForm, periodStart: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="invoicePeriodEnd" className="text-sm font-medium text-gray-700">
                    Period End
                  </Label>
                  <Input
                    id="invoicePeriodEnd"
                    type="date"
                    value={createInvoiceForm.periodEnd}
                    onChange={(e) => setCreateInvoiceForm({ ...createInvoiceForm, periodEnd: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateInvoiceModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateInvoice}
              disabled={!createInvoiceForm.organizationId || !createInvoiceForm.amount}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Create Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Invoices Modal */}
      <Dialog open={showGenerateInvoicesModal} onOpenChange={setShowGenerateInvoicesModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              Generate Subscription Invoices
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-gray-600">
              This will automatically generate invoices for all organizations with subscriptions
              due for renewal in the next 30 days. Each invoice will use the organization&apos;s
              specific pricing (monthly or annual).
            </p>

            {!generateInvoicesResult && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Finds orgs with <code className="bg-blue-100 px-1 rounded">subscriptionRenewsAt</code> within 30 days</li>
                  <li>• Uses each org&apos;s specific <code className="bg-blue-100 px-1 rounded">monthlyFee</code> or <code className="bg-blue-100 px-1 rounded">annualPrice</code></li>
                  <li>• Skips orgs that already have a pending invoice</li>
                  <li>• Creates invoice and sends email with payment link</li>
                  <li>• Updates <code className="bg-blue-100 px-1 rounded">subscriptionRenewsAt</code> for next cycle</li>
                </ul>
              </div>
            )}

            {generateInvoicesResult && (
              <div className="space-y-4">
                <div className={`rounded-lg p-4 ${generateInvoicesResult.dryRun ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
                  <h4 className={`font-medium mb-2 ${generateInvoicesResult.dryRun ? 'text-yellow-900' : 'text-green-900'}`}>
                    {generateInvoicesResult.dryRun ? '🧪 Dry Run Results (No invoices created)' : '✅ Invoices Generated Successfully'}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{generateInvoicesResult.summary.processed}</p>
                      <p className="text-xs text-gray-600">Processed</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{generateInvoicesResult.summary.invoicesCreated}</p>
                      <p className="text-xs text-gray-600">Created</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{generateInvoicesResult.summary.emailsSent}</p>
                      <p className="text-xs text-gray-600">Emails Sent</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-500">{generateInvoicesResult.summary.skipped}</p>
                      <p className="text-xs text-gray-600">Skipped</p>
                    </div>
                  </div>
                </div>

                {generateInvoicesResult.details.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-700">Organization</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-700">Status</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-700">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {generateInvoicesResult.details.map((detail, idx) => (
                          <tr key={idx} className={detail.status === 'error' ? 'bg-red-50' : ''}>
                            <td className="px-4 py-2 text-gray-900">{detail.orgName}</td>
                            <td className="px-4 py-2">
                              {detail.status === 'created' && (
                                <Badge className="bg-green-100 text-green-800">
                                  {generateInvoicesResult.dryRun ? 'Would Create' : `#${detail.invoiceNumber}`}
                                </Badge>
                              )}
                              {detail.status === 'skipped' && (
                                <span className="text-gray-500 text-xs">{detail.reason}</span>
                              )}
                              {detail.status === 'error' && (
                                <Badge className="bg-red-100 text-red-800">Error</Badge>
                              )}
                            </td>
                            <td className="px-4 py-2 text-right font-mono">
                              {detail.amount ? `$${detail.amount.toFixed(2)}` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {generateInvoicesResult.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-medium text-red-900 mb-2">Errors:</h4>
                    <ul className="text-sm text-red-800 space-y-1">
                      {generateInvoicesResult.errors.map((error, idx) => (
                        <li key={idx}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowGenerateInvoicesModal(false)}>
              Close
            </Button>
            {!generateInvoicesResult ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleGenerateInvoices(true)}
                  disabled={generateInvoicesLoading}
                  className="border-yellow-500 text-yellow-700 hover:bg-yellow-50"
                >
                  {generateInvoicesLoading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Running...</>
                  ) : (
                    '🧪 Preview (Dry Run)'
                  )}
                </Button>
                <Button
                  onClick={() => handleGenerateInvoices(false)}
                  disabled={generateInvoicesLoading}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {generateInvoicesLoading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
                  ) : (
                    '📧 Generate & Send Invoices'
                  )}
                </Button>
              </>
            ) : generateInvoicesResult.dryRun ? (
              <Button
                onClick={() => handleGenerateInvoices(false)}
                disabled={generateInvoicesLoading}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {generateInvoicesLoading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
                ) : (
                  '📧 Confirm & Generate Invoices'
                )}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
