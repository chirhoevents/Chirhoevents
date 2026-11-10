'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ArrowLeft,
  Loader2,
  Search,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Users,
  Eye,
  Mail,
  Plus,
  Trash2,
  Shield,
  Upload,
  MoreHorizontal,
  Send,
  BellRing,
  Undo2,
  RotateCcw,
  Receipt,
  StickyNote,
  KeyRound,
  ClipboardCheck,
  Printer,
  QrCode,
  X,
} from 'lucide-react'
import { format } from 'date-fns'
import CustomQuestionsManager from '@/components/admin/CustomQuestionsManager'
import RefundModal from '@/components/admin/RefundModal'
import BulkVendorEmailModal from '@/components/admin/BulkVendorEmailModal'
import VendorDetailPanel, { type VendorPanelActions } from '@/components/admin/vendors/VendorDetailPanel'
import RecordVendorPaymentDialog from '@/components/admin/vendors/RecordVendorPaymentDialog'
import AddVendorDialog from '@/components/admin/vendors/AddVendorDialog'
import {
  money,
  PaymentBadge,
  StatusBadge,
  vendorApi,
  vendorBalance,
  type InvoiceLineItem,
  type VendorRegistration,
  type VendorTierOption,
} from '@/components/admin/vendors/vendor-types'
import { openBadgePrintWindow, type NameTagData, type BadgeTemplate, type ScheduleEntry } from '@/lib/badge-renderer'

interface EventData {
  id: string
  name: string
  slug: string
}

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected'
type PaymentFilter = 'all' | 'due' | 'paid'

export default function VendorsManagementPage() {
  const params = useParams()
  const eventId = params.eventId as string
  const { getToken } = useAuth()

  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState<EventData | null>(null)
  const [vendors, setVendors] = useState<VendorRegistration[]>([])
  const [tiers, setTiers] = useState<VendorTierOption[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all')
  const [filterPayment, setFilterPayment] = useState<PaymentFilter>('all')
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Review (approve/reject) modal
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState<VendorRegistration | null>(null)
  const [invoiceLineItems, setInvoiceLineItems] = useState<InvoiceLineItem[]>([])
  const [invoiceNotes, setInvoiceNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [processing, setProcessing] = useState(false)

  // Side panel
  const [panelVendorId, setPanelVendorId] = useState<string | null>(null)
  const [panelTab, setPanelTab] = useState<string>('overview')
  const [panelRefresh, setPanelRefresh] = useState(0)

  // Other dialogs
  const [paymentVendor, setPaymentVendor] = useState<VendorRegistration | null>(null)
  const [payInFull, setPayInFull] = useState(false)
  const [refundVendor, setRefundVendor] = useState<VendorRegistration | null>(null)
  const [emailRecipients, setEmailRecipients] = useState<Array<{ id: string; businessName: string }> | undefined>()
  const [emailOpen, setEmailOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)

  const safeEnvFileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploadingCertVendorId, setUploadingCertVendorId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      const token = await getToken()
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}

      const [eventResponse, vendorsResponse] = await Promise.all([
        fetch(`/api/admin/events/${eventId}`, { headers }),
        fetch(`/api/admin/events/${eventId}/vendors`, { headers }),
      ])
      if (!eventResponse.ok) throw new Error('Failed to fetch event')
      if (!vendorsResponse.ok) throw new Error('Failed to fetch vendors')
      const eventData = await eventResponse.json()
      const vendorsData = await vendorsResponse.json()
      setEvent(eventData.event)
      setVendors(vendorsData.vendors || [])
      setTiers(vendorsData.tiers || [])
      setError(null)
    } catch (err) {
      setError('Failed to load data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [eventId, getToken])

  useEffect(() => {
    loadData()
  }, [loadData])

  /** Reload the list and the open side panel after any change. */
  const refreshAll = () => {
    loadData()
    setPanelRefresh((n) => n + 1)
  }

  const filteredVendors = vendors.filter((vendor) => {
    const matchesSearch = `${vendor.businessName} ${vendor.contactFirstName} ${vendor.contactLastName} ${vendor.email} ${vendor.vendorCode}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || vendor.status === filterStatus
    const matchesPayment =
      filterPayment === 'all' ||
      (vendor.status === 'approved' &&
        (filterPayment === 'paid' ? vendor.paymentStatus === 'paid' : vendorBalance(vendor) > 0))
    return matchesSearch && matchesStatus && matchesPayment
  })

  const approvedVendors = vendors.filter((v) => v.status === 'approved')
  const stats = {
    total: vendors.length,
    pending: vendors.filter((v) => v.status === 'pending').length,
    approved: approvedVendors.length,
    rejected: vendors.filter((v) => v.status === 'rejected').length,
    paid: approvedVendors.filter((v) => v.paymentStatus === 'paid').length,
    unpaid: approvedVendors.filter((v) => vendorBalance(v) > 0).length,
    collected: vendors.reduce((sum, v) => sum + Number(v.amountPaid || 0), 0),
    outstanding: approvedVendors.reduce((sum, v) => sum + Math.max(0, vendorBalance(v)), 0),
  }

  const selectedVendors = vendors.filter((v) => selectedIds.has(v.id))
  const allVisibleSelected = filteredVendors.length > 0 && filteredVendors.every((v) => selectedIds.has(v.id))

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const toggleSelectAll = () =>
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) filteredVendors.forEach((v) => next.delete(v.id))
      else filteredVendors.forEach((v) => next.add(v.id))
      return next
    })

  // ---------------------------------------------------------------- actions

  const openPanel = (vendor: VendorRegistration, tab = 'overview') => {
    setPanelTab(tab)
    setPanelVendorId(vendor.id)
  }

  const openEmail = (targets?: VendorRegistration[]) => {
    setEmailRecipients(targets?.map((v) => ({ id: v.id, businessName: v.businessName })))
    setEmailOpen(true)
  }

  const openReviewModal = (vendor: VendorRegistration) => {
    setSelectedVendor(vendor)
    const existing = vendor.invoiceLineItems || []
    setInvoiceLineItems(
      existing.length > 0
        ? existing.map((i) => ({ description: i.description, amount: Number(i.amount) }))
        : [{ description: vendor.selectedTier, amount: Number(vendor.tierPrice) }]
    )
    setInvoiceNotes(vendor.invoiceNotes || '')
    setRejectionReason('')
    setReviewModalOpen(true)
  }

  const handleResendCodes = async (vendor: VendorRegistration) => {
    if (!confirm(`Email vendor code, portal code and liability code to ${vendor.email}?`)) return
    const res = await vendorApi(getToken, `/api/admin/events/${eventId}/vendors/${vendor.id}/resend-codes`, 'POST')
    alert(res.ok ? 'Vendor codes emailed successfully.' : `Failed to resend codes: ${res.error}`)
  }

  const sendInvoiceEmail = async (vendor: VendorRegistration, type: 'invoice' | 'reminder') => {
    const label = type === 'reminder' ? `a payment reminder (${money(vendorBalance(vendor))} due)` : 'their invoice'
    if (!confirm(`Email ${label} to ${vendor.email}?`)) return
    const res = await vendorApi(getToken, `/api/admin/events/${eventId}/vendors/${vendor.id}/send-invoice`, 'POST', { type })
    if (!res.ok) {
      alert(`Failed to send: ${res.error}`)
      return
    }
    alert(type === 'reminder' ? 'Payment reminder sent.' : 'Invoice sent.')
    setPanelRefresh((n) => n + 1)
  }

  const sendBulkReminders = async (targets: VendorRegistration[]) => {
    const owing = targets.filter((v) => v.status === 'approved' && vendorBalance(v) > 0)
    if (owing.length === 0) {
      alert('None of these vendors have a balance due.')
      return
    }
    if (!confirm(`Send a payment reminder to ${owing.length} vendor${owing.length === 1 ? '' : 's'} with a balance due?`)) return
    setBulkBusy(true)
    let sent = 0
    const failed: string[] = []
    for (const v of owing) {
      const res = await vendorApi(getToken, `/api/admin/events/${eventId}/vendors/${v.id}/send-invoice`, 'POST', { type: 'reminder' })
      if (res.ok) sent++
      else failed.push(v.businessName)
    }
    setBulkBusy(false)
    alert(`Sent ${sent} reminder${sent === 1 ? '' : 's'}.${failed.length ? `\nFailed: ${failed.join(', ')}` : ''}`)
  }

  const moveToPending = async (vendor: VendorRegistration) => {
    const verb = vendor.status === 'rejected' ? 'Re-open' : 'Move back to pending'
    const reason = prompt(
      `${verb}: ${vendor.businessName}\n\n${
        vendor.status === 'approved'
          ? 'Their codes and payments are kept. You can review and re-approve them afterwards. No email is sent.'
          : 'The application goes back to Pending so you can review it again. No email is sent.'
      }\n\nOptional reason (saved to the activity log):`,
      ''
    )
    if (reason === null) return
    const res = await vendorApi(getToken, `/api/admin/events/${eventId}/vendors/${vendor.id}/status`, 'POST', {
      status: 'pending',
      reason,
    })
    if (!res.ok) {
      alert(`Failed: ${res.error}`)
      return
    }
    refreshAll()
  }

  const deleteVendor = async (vendor: VendorRegistration) => {
    if (!confirm(`Permanently delete ${vendor.businessName}? This can't be undone.`)) return
    const res = await vendorApi(getToken, `/api/admin/events/${eventId}/vendors/${vendor.id}`, 'DELETE')
    if (!res.ok) {
      alert(`Can't delete: ${res.error}`)
      return
    }
    if (panelVendorId === vendor.id) setPanelVendorId(null)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(vendor.id)
      return next
    })
    loadData()
  }

  const triggerSafeEnvUpload = (vendor: VendorRegistration) => {
    setUploadingCertVendorId(vendor.id)
    safeEnvFileInputRef.current?.click()
  }

  const handleSafeEnvFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const vendorId = uploadingCertVendorId
    e.target.value = ''
    if (!file || !vendorId) {
      setUploadingCertVendorId(null)
      return
    }
    try {
      const token = await getToken()
      const body = new FormData()
      body.append('file', file)
      const res = await fetch(`/api/admin/events/${eventId}/vendors/${vendorId}/safe-env-cert`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(`Failed to upload certificate: ${data.error || res.statusText}`)
        return
      }
      alert('Safe Environment certificate uploaded. The vendor has been notified.')
      refreshAll()
    } catch {
      alert('Failed to upload certificate')
    } finally {
      setUploadingCertVendorId(null)
    }
  }

  const panelActions: VendorPanelActions = {
    review: openReviewModal,
    email: (v) => openEmail([v]),
    recordPayment: (v, full) => {
      setPayInFull(full)
      setPaymentVendor(v)
    },
    refund: (v) => setRefundVendor(v),
    resendCodes: handleResendCodes,
    uploadCert: triggerSafeEnvUpload,
    moveToPending,
    remove: deleteVendor,
  }

  const handleApprove = async () => {
    if (!selectedVendor) return
    if (invoiceLineItems.some((i) => !i.description.trim() || !(Number(i.amount) >= 0))) {
      alert('Every invoice line needs a description and an amount of $0 or more.')
      return
    }
    setProcessing(true)
    const res = await vendorApi(getToken, `/api/admin/events/${eventId}/vendors/${selectedVendor.id}/approve`, 'POST', {
      invoiceLineItems,
      invoiceNotes,
    })
    setProcessing(false)
    if (!res.ok) {
      alert(`Failed to approve vendor: ${res.error}`)
      return
    }
    setReviewModalOpen(false)
    refreshAll()
    alert('Vendor approved! Email sent with vendor code and invoice.')
  }

  const handleReject = async () => {
    if (!selectedVendor) return
    if (!confirm(`Reject ${selectedVendor.businessName}? They'll be emailed${rejectionReason.trim() ? ' with your reason' : ''}.`)) return
    setProcessing(true)
    const res = await vendorApi(getToken, `/api/admin/events/${eventId}/vendors/${selectedVendor.id}/reject`, 'POST', {
      reason: rejectionReason,
    })
    setProcessing(false)
    if (!res.ok) {
      alert(`Failed to reject vendor: ${res.error}`)
      return
    }
    setReviewModalOpen(false)
    refreshAll()
  }

  const updateLineItem = (index: number, field: 'description' | 'amount', value: string | number) => {
    const updated = [...invoiceLineItems]
    updated[index] = { ...updated[index], [field]: field === 'amount' ? Number(value) : value }
    setInvoiceLineItems(updated)
  }

  const reviewInvoiceTotal = invoiceLineItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)

  const handlePrintNameTags = async () => {
    const approved = filteredVendors.filter((v) => v.status === 'approved')
    if (approved.length === 0) {
      alert('No approved vendors match the current filter.')
      return
    }
    setPrinting(true)
    try {
      const res = await vendorApi<{ nameTags: Array<NameTagData & { template: BadgeTemplate }>; schedule?: ScheduleEntry[] }>(
        getToken,
        `/api/admin/events/${eventId}/salve/generate-name-tags`,
        'POST',
        { registrationType: 'vendor', participantIds: approved.map((v) => v.id) }
      )
      if (!res.ok) {
        alert(`Failed to generate name tags: ${res.error}`)
        return
      }
      if (!res.data.nameTags || res.data.nameTags.length === 0) {
        alert('No name tags were generated.')
        return
      }
      openBadgePrintWindow(res.data.nameTags, res.data.nameTags[0].template, event?.name || '', res.data.schedule || [])
    } finally {
      setPrinting(false)
    }
  }

  const handleExportCSV = (rows: VendorRegistration[] = filteredVendors) => {
    const customQuestionTexts: string[] = []
    for (const v of rows) {
      for (const a of v.customAnswers || []) {
        if (!customQuestionTexts.includes(a.questionText)) customQuestionTexts.push(a.questionText)
      }
    }

    const headers = [
      'Business Name', 'Contact', 'Email', 'Phone', 'Tier', 'Status', 'Payment',
      'Invoice Total', 'Amount Paid', 'Balance', 'Vendor Code', 'Staff Count', 'Created',
      ...customQuestionTexts,
    ]
    const csvRows = rows.map((v) => [
      v.businessName,
      `${v.contactFirstName} ${v.contactLastName}`,
      v.email,
      v.phone,
      v.selectedTier,
      v.status,
      v.paymentStatus,
      Number(v.invoiceTotal || 0).toFixed(2),
      Number(v.amountPaid || 0).toFixed(2),
      v.status === 'approved' ? vendorBalance(v).toFixed(2) : '',
      v.status === 'approved' ? v.vendorCode : '',
      v._count?.boothStaff || 0,
      format(new Date(v.createdAt), 'yyyy-MM-dd'),
      ...customQuestionTexts.map((qt) => v.customAnswers?.find((a) => a.questionText === qt)?.answerText || ''),
    ])

    const csvContent = [headers, ...csvRows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vendors-${event?.slug || eventId}-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  // ---------------------------------------------------------------- render

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#1E3A5F]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">{error}</p>
        <Button onClick={loadData} className="mt-4">Retry</Button>
      </div>
    )
  }

  const registrationUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/events/${event?.slug}/register-vendor`

  return (
    <div className="space-y-6">
      <input
        ref={safeEnvFileInputRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={handleSafeEnvFileSelected}
      />

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            href={`/dashboard/admin/events/${eventId}`}
            className="text-sm text-[#6B7280] hover:text-[#1E3A5F] flex items-center mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Event
          </Link>
          <h1 className="text-2xl font-bold text-[#1E3A5F]">Vendor Management</h1>
          <p className="text-[#6B7280]">{event?.name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setAddOpen(true)} className="bg-[#1E3A5F] hover:bg-[#2d4a6f] text-white">
            <Plus className="h-4 w-4 mr-2" />
            Add Vendor
          </Button>
          <Button variant="outline" onClick={() => openEmail()}>
            <Mail className="h-4 w-4 mr-2" />
            Email Vendors
          </Button>
          <Link href={`/dashboard/admin/events/${eventId}/vendors/leads`}>
            <Button variant="outline" title="Badge scanning and lead follow-up for vendors">
              <QrCode className="h-4 w-4 mr-2" />
              Lead Retrieval
            </Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <MoreHorizontal className="h-4 w-4 mr-2" />
                More
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuItem onClick={() => sendBulkReminders(approvedVendors)} disabled={stats.unpaid === 0}>
                <BellRing className="h-4 w-4 mr-2" />
                Remind all with balance due ({stats.unpaid})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePrintNameTags} disabled={printing}>
                <Printer className="h-4 w-4 mr-2" />
                Print name tags (approved, filtered)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportCSV()}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV (current filter)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  navigator.clipboard.writeText(registrationUrl)
                  alert('Registration link copied!')
                }}
              >
                <KeyRound className="h-4 w-4 mr-2" />
                Copy vendor registration link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats: clickable shortcuts to filters */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-[#1E3A5F]', onClick: () => { setFilterStatus('all'); setFilterPayment('all') } },
          { label: 'Needs Review', value: stats.pending, color: 'text-amber-600', onClick: () => { setFilterStatus('pending'); setFilterPayment('all') } },
          { label: 'Approved', value: stats.approved, color: 'text-green-600', onClick: () => { setFilterStatus('approved'); setFilterPayment('all') } },
          { label: 'Balance Due', value: stats.unpaid, color: 'text-orange-600', onClick: () => { setFilterStatus('approved'); setFilterPayment('due') } },
          { label: 'Collected', value: money(stats.collected), color: 'text-green-600', onClick: () => { setFilterStatus('approved'); setFilterPayment('paid') } },
          { label: 'Outstanding', value: money(stats.outstanding), color: 'text-orange-600', onClick: () => { setFilterStatus('approved'); setFilterPayment('due') } },
        ].map((s) => (
          <button key={s.label} onClick={s.onClick} className="text-left">
            <Card className="hover:border-[#1E3A5F] transition-colors h-full">
              <CardContent className="pt-4 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-sm text-[#6B7280]">{s.label}</p>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      {/* Registration Link */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-[#1E3A5F]">Vendor Registration Link</p>
              <p className="text-sm text-[#6B7280] truncate">{registrationUrl}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(registrationUrl)
                alert('Link copied!')
              }}
            >
              Copy Link
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Custom Questions */}
      <CustomQuestionsManager eventId={eventId} appliesTo="vendor" getToken={getToken} />

      {/* Filters */}
      <div className="flex gap-4 flex-wrap items-center">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
          <Input
            placeholder="Search business, contact, email or vendor code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {([
            { key: 'all', label: 'All', icon: null },
            { key: 'pending', label: `Pending (${stats.pending})`, icon: <Clock className="h-4 w-4 mr-1" /> },
            { key: 'approved', label: 'Approved', icon: <CheckCircle className="h-4 w-4 mr-1" /> },
            { key: 'rejected', label: 'Rejected', icon: <XCircle className="h-4 w-4 mr-1" /> },
          ] as const).map((f) => (
            <Button
              key={f.key}
              variant={filterStatus === f.key ? 'default' : 'outline'}
              onClick={() => setFilterStatus(f.key)}
              size="sm"
            >
              {f.icon}
              {f.label}
            </Button>
          ))}
        </div>
        <select
          value={filterPayment}
          onChange={(e) => setFilterPayment(e.target.value as PaymentFilter)}
          className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm"
          aria-label="Filter by payment"
        >
          <option value="all">Any payment status</option>
          <option value="due">Balance due</option>
          <option value="paid">Paid in full</option>
        </select>
      </div>

      {/* Bulk selection bar */}
      {selectedVendors.length > 0 && (
        <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-lg border border-[#1E3A5F] bg-[#1E3A5F] px-4 py-2 text-white shadow">
          <span className="font-medium mr-2">{selectedVendors.length} selected</span>
          <Button size="sm" variant="secondary" onClick={() => openEmail(selectedVendors)}>
            <Mail className="h-4 w-4 mr-1" /> Email selected
          </Button>
          <Button size="sm" variant="secondary" onClick={() => sendBulkReminders(selectedVendors)} disabled={bulkBusy}>
            {bulkBusy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <BellRing className="h-4 w-4 mr-1" />}
            Send payment reminders
          </Button>
          <Button size="sm" variant="secondary" onClick={() => handleExportCSV(selectedVendors)}>
            <Download className="h-4 w-4 mr-1" /> Export selected
          </Button>
          <button className="ml-auto inline-flex items-center text-sm hover:underline" onClick={() => setSelectedIds(new Set())}>
            <X className="h-4 w-4 mr-1" /> Clear
          </button>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 cursor-pointer"
                  />
                </TableHead>
                <TableHead>Business</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Booth</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead>Forms</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVendors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-[#6B7280]">
                    No vendors match these filters
                  </TableCell>
                </TableRow>
              ) : (
                filteredVendors.map((vendor) => {
                  const balance = vendorBalance(vendor)
                  return (
                    <TableRow
                      key={vendor.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => openPanel(vendor)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Select ${vendor.businessName}`}
                          checked={selectedIds.has(vendor.id)}
                          onChange={() => toggleSelect(vendor.id)}
                          className="h-4 w-4 cursor-pointer"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {vendor.logoUrl ? (
                            <img src={vendor.logoUrl} alt="" className="h-8 w-8 rounded object-cover" />
                          ) : (
                            <div className="h-8 w-8 rounded bg-[#1E3A5F]/10 flex items-center justify-center text-sm font-bold text-[#1E3A5F]">
                              {vendor.businessName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{vendor.businessName}</p>
                            <p className="text-xs text-[#6B7280]">{vendor.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p>{vendor.contactFirstName} {vendor.contactLastName}</p>
                        <p className="text-xs text-[#6B7280]">{vendor.phone}</p>
                      </TableCell>
                      <TableCell>
                        <p>{vendor.selectedTier}</p>
                        <p className="text-xs text-[#6B7280]">{money(vendor.tierPrice)}</p>
                      </TableCell>
                      <TableCell><StatusBadge status={vendor.status} /></TableCell>
                      <TableCell>
                        {vendor.status === 'approved' ? (
                          <div>
                            <PaymentBadge status={vendor.paymentStatus} />
                            <p className="text-xs text-[#6B7280] mt-1">
                              {money(vendor.amountPaid)} / {money(vendor.invoiceTotal)}
                            </p>
                            {balance > 0 && <p className="text-xs text-orange-600">{money(balance)} due</p>}
                          </div>
                        ) : (
                          <span className="text-xs text-[#6B7280]">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {vendor.status === 'approved' && (
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-[#6B7280]" />
                            <span>{vendor._count?.boothStaff || 0}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {vendor.status === 'approved' ? (
                          <div className="flex items-center gap-1">
                            {vendor.porosAccessCode ? (
                              vendor.liabilityForm?.completed ? (
                                <Badge className="bg-green-500" title="Liability form complete">
                                  <CheckCircle className="h-3 w-3 mr-1" />Form
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-amber-600 border-amber-300" title="Liability form pending">
                                  Form
                                </Badge>
                              )
                            ) : null}
                            {vendor.safeEnvironmentCertUrl ? (
                              <Shield className="h-4 w-4 text-green-600" aria-label="Safe Environment cert on file" />
                            ) : null}
                            {!vendor.porosAccessCode && !vendor.safeEnvironmentCertUrl && (
                              <span className="text-xs text-[#6B7280]">N/A</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-[#6B7280]">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          {vendor.status === 'pending' && (
                            <Button size="sm" variant="outline" onClick={() => openReviewModal(vendor)}>
                              Review
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" aria-label="Vendor actions">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuLabel className="truncate">{vendor.businessName}</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => openPanel(vendor)}>
                                <Eye className="h-4 w-4 mr-2" /> View details
                              </DropdownMenuItem>
                              {vendor.status === 'pending' && (
                                <DropdownMenuItem onClick={() => openReviewModal(vendor)}>
                                  <ClipboardCheck className="h-4 w-4 mr-2" /> Review / approve
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => openEmail([vendor])}>
                                <Mail className="h-4 w-4 mr-2" /> Send email
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openPanel(vendor, 'activity')}>
                                <StickyNote className="h-4 w-4 mr-2" /> Notes &amp; activity
                              </DropdownMenuItem>

                              {vendor.status === 'approved' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuLabel className="text-xs text-gray-500">Payments</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => { setPayInFull(false); setPaymentVendor(vendor) }}>
                                    <DollarSign className="h-4 w-4 mr-2" /> Record payment
                                  </DropdownMenuItem>
                                  {balance > 0 && (
                                    <DropdownMenuItem onClick={() => { setPayInFull(true); setPaymentVendor(vendor) }}>
                                      <CheckCircle className="h-4 w-4 mr-2" /> Mark as paid
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => openPanel(vendor, 'payments')}>
                                    <Receipt className="h-4 w-4 mr-2" /> Edit invoice / waive fee
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => sendInvoiceEmail(vendor, 'invoice')}>
                                    <Send className="h-4 w-4 mr-2" /> Resend invoice
                                  </DropdownMenuItem>
                                  {balance > 0 && (
                                    <DropdownMenuItem onClick={() => sendInvoiceEmail(vendor, 'reminder')}>
                                      <BellRing className="h-4 w-4 mr-2" /> Send payment reminder
                                    </DropdownMenuItem>
                                  )}
                                  {Number(vendor.amountPaid || 0) > 0 && (
                                    <DropdownMenuItem onClick={() => setRefundVendor(vendor)} className="text-red-600">
                                      <Undo2 className="h-4 w-4 mr-2" /> Refund
                                    </DropdownMenuItem>
                                  )}

                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleResendCodes(vendor)}>
                                    <KeyRound className="h-4 w-4 mr-2" /> Email vendor codes
                                  </DropdownMenuItem>
                                  {vendor.safeEnvironmentCertUrl ? (
                                    <DropdownMenuItem onClick={() => window.open(vendor.safeEnvironmentCertUrl!, '_blank', 'noopener')}>
                                      <Shield className="h-4 w-4 mr-2" /> View Safe Env cert
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem onClick={() => triggerSafeEnvUpload(vendor)} disabled={uploadingCertVendorId === vendor.id}>
                                      <Upload className="h-4 w-4 mr-2" /> Upload Safe Env cert
                                    </DropdownMenuItem>
                                  )}
                                </>
                              )}

                              <DropdownMenuSeparator />
                              {vendor.status !== 'pending' && (
                                <DropdownMenuItem onClick={() => moveToPending(vendor)}>
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  {vendor.status === 'rejected' ? 'Re-open application' : 'Move back to pending'}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => deleteVendor(vendor)} className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" /> Delete vendor
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Review Modal */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Vendor Application</DialogTitle>
            <DialogDescription>
              {selectedVendor?.businessName} - {selectedVendor?.selectedTier}
            </DialogDescription>
          </DialogHeader>

          {selectedVendor && (
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                <h4 className="font-medium">Application Details</h4>
                <p><span className="text-gray-500">Contact:</span> {selectedVendor.contactFirstName} {selectedVendor.contactLastName}</p>
                <p><span className="text-gray-500">Email:</span> {selectedVendor.email}</p>
                <p><span className="text-gray-500">Phone:</span> {selectedVendor.phone}</p>
                <p><span className="text-gray-500">Description:</span> {selectedVendor.boothDescription}</p>
                {selectedVendor.additionalNeeds && (
                  <p><span className="text-gray-500">Additional Needs:</span> {selectedVendor.additionalNeeds}</p>
                )}
                {selectedVendor.customAnswers && selectedVendor.customAnswers.length > 0 && (
                  <>
                    <hr className="my-2" />
                    <h4 className="font-medium">Custom Question Answers</h4>
                    {selectedVendor.customAnswers.map((answer, i) => (
                      <p key={i}>
                        <span className="text-gray-500">{answer.questionText}:</span> {answer.answerText || 'N/A'}
                      </p>
                    ))}
                  </>
                )}
                {Number(selectedVendor.amountPaid || 0) > 0 && (
                  <p className="text-blue-700">
                    Already paid {money(selectedVendor.amountPaid)}. That payment stays on file after you re-approve.
                  </p>
                )}
              </div>

              <div>
                <Label className="mb-2 block">Invoice Line Items</Label>
                <div className="space-y-2">
                  {invoiceLineItems.map((item, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                        className="flex-1"
                      />
                      <div className="relative w-32">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <Input
                          type="number"
                          value={item.amount}
                          onChange={(e) => updateLineItem(index, 'amount', e.target.value)}
                          className="pl-7"
                        />
                      </div>
                      {invoiceLineItems.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setInvoiceLineItems(invoiceLineItems.filter((_, i) => i !== index))}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setInvoiceLineItems([...invoiceLineItems, { description: '', amount: 0 }])}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Line Item
                  </Button>
                </div>
                <div className="mt-4 pt-4 border-t flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>{money(reviewInvoiceTotal)}</span>
                </div>
              </div>

              <div>
                <Label htmlFor="invoiceNotes">Invoice Notes (optional)</Label>
                <Textarea
                  id="invoiceNotes"
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  placeholder="Any notes to include on the invoice..."
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="rejectionReason">Rejection Reason (if rejecting)</Label>
                <Textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Reason for rejecting this application..."
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="destructive" onClick={handleReject} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
              Reject
            </Button>
            <Button onClick={handleApprove} disabled={processing} className="bg-green-600 hover:bg-green-700 text-white">
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Approve &amp; Send Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VendorDetailPanel
        eventId={eventId}
        vendorId={panelVendorId}
        tiers={tiers}
        refreshKey={panelRefresh}
        initialTab={panelTab}
        actions={panelActions}
        onClose={() => setPanelVendorId(null)}
        onChanged={loadData}
      />

      <BulkVendorEmailModal
        eventId={eventId}
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        recipients={emailRecipients}
        onSent={() => setPanelRefresh((n) => n + 1)}
        counts={{ all: stats.total, approved: stats.approved, pending: stats.pending, unpaid: stats.unpaid }}
      />

      <RecordVendorPaymentDialog
        eventId={eventId}
        vendor={paymentVendor}
        payInFull={payInFull}
        onClose={() => setPaymentVendor(null)}
        onRecorded={refreshAll}
      />

      <AddVendorDialog
        eventId={eventId}
        open={addOpen}
        tiers={tiers}
        onClose={() => setAddOpen(false)}
        onCreated={(vendor, review) => {
          loadData()
          if (review) openReviewModal({ ...vendor, customAnswers: [] })
        }}
      />

      {refundVendor && (
        <RefundModal
          isOpen={!!refundVendor}
          onClose={() => setRefundVendor(null)}
          registrationId={refundVendor.id}
          registrationType="vendor"
          currentBalance={vendorBalance(refundVendor)}
          amountPaid={Number(refundVendor.amountPaid || 0)}
          onRefundProcessed={() => {
            setRefundVendor(null)
            refreshAll()
          }}
        />
      )}
    </div>
  )
}
