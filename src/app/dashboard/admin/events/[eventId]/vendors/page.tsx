'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  ArrowLeft,
  Loader2,
  Search,
  Download,
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Users,
  Eye,
  Mail,
  Plus,
  Trash2,
} from 'lucide-react'
import { format } from 'date-fns'

interface VendorRegistration {
  id: string
  businessName: string
  contactFirstName: string
  contactLastName: string
  email: string
  phone: string
  boothDescription: string
  selectedTier: string
  tierPrice: number
  additionalNeeds: string | null
  logoUrl: string | null
  status: string
  rejectionReason: string | null
  approvedAt: string | null
  invoiceLineItems: Array<{ description: string; amount: number }> | null
  invoiceTotal: number | null
  invoiceNotes: string | null
  paymentStatus: string
  amountPaid: number
  vendorCode: string
  accessCode: string
  createdAt: string
  _count?: {
    boothStaff: number
  }
}

interface EventData {
  id: string
  name: string
  slug: string
}

interface InvoiceLineItem {
  description: string
  amount: number
}

export default function VendorsManagementPage() {
  const params = useParams()
  const eventId = params.eventId as string
  const { getToken } = useAuth()

  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState<EventData | null>(null)
  const [vendors, setVendors] = useState<VendorRegistration[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [error, setError] = useState<string | null>(null)

  // Review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState<VendorRegistration | null>(null)
  const [invoiceLineItems, setInvoiceLineItems] = useState<InvoiceLineItem[]>([])
  const [invoiceNotes, setInvoiceNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [processing, setProcessing] = useState(false)

  // Detail modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [detailVendor, setDetailVendor] = useState<VendorRegistration | null>(null)

  useEffect(() => {
    loadData()
  }, [eventId])

  const loadData = async () => {
    try {
      const token = await getToken()
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}

      // Fetch event
      const eventResponse = await fetch(`/api/admin/events/${eventId}`, { headers })
      if (!eventResponse.ok) throw new Error('Failed to fetch event')
      const eventData = await eventResponse.json()
      setEvent(eventData.event)

      // Fetch vendors
      const vendorsResponse = await fetch(`/api/admin/events/${eventId}/vendors`, { headers })
      if (!vendorsResponse.ok) throw new Error('Failed to fetch vendors')
      const vendorsData = await vendorsResponse.json()
      setVendors(vendorsData.vendors || [])
    } catch (err) {
      setError('Failed to load data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filteredVendors = vendors.filter((vendor) => {
    const matchesSearch =
      `${vendor.businessName} ${vendor.contactFirstName} ${vendor.contactLastName} ${vendor.email}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || vendor.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: vendors.length,
    pending: vendors.filter((v) => v.status === 'pending').length,
    approved: vendors.filter((v) => v.status === 'approved').length,
    rejected: vendors.filter((v) => v.status === 'rejected').length,
    paid: vendors.filter((v) => v.paymentStatus === 'paid').length,
    totalRevenue: vendors
      .filter((v) => v.paymentStatus === 'paid')
      .reduce((sum, v) => sum + Number(v.amountPaid || 0), 0),
  }

  const openReviewModal = (vendor: VendorRegistration) => {
    setSelectedVendor(vendor)
    setInvoiceLineItems([{ description: vendor.selectedTier, amount: Number(vendor.tierPrice) }])
    setInvoiceNotes('')
    setRejectionReason('')
    setReviewModalOpen(true)
  }

  const handleApprove = async () => {
    if (!selectedVendor) return
    setProcessing(true)

    try {
      const token = await getToken()
      const response = await fetch(`/api/admin/events/${eventId}/vendors/${selectedVendor.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          invoiceLineItems,
          invoiceNotes,
        }),
      })

      if (!response.ok) throw new Error('Failed to approve vendor')

      setReviewModalOpen(false)
      loadData()
      alert('Vendor approved! Email sent with vendor code and invoice.')
    } catch (err) {
      alert('Failed to approve vendor')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedVendor) return
    setProcessing(true)

    try {
      const token = await getToken()
      const response = await fetch(`/api/admin/events/${eventId}/vendors/${selectedVendor.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ reason: rejectionReason }),
      })

      if (!response.ok) throw new Error('Failed to reject vendor')

      setReviewModalOpen(false)
      loadData()
      alert('Vendor application rejected.')
    } catch (err) {
      alert('Failed to reject vendor')
    } finally {
      setProcessing(false)
    }
  }

  const addLineItem = () => {
    setInvoiceLineItems([...invoiceLineItems, { description: '', amount: 0 }])
  }

  const updateLineItem = (index: number, field: 'description' | 'amount', value: string | number) => {
    const updated = [...invoiceLineItems]
    updated[index] = { ...updated[index], [field]: field === 'amount' ? Number(value) : value }
    setInvoiceLineItems(updated)
  }

  const removeLineItem = (index: number) => {
    setInvoiceLineItems(invoiceLineItems.filter((_, i) => i !== index))
  }

  const invoiceTotal = invoiceLineItems.reduce((sum, item) => sum + item.amount, 0)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500">Paid</Badge>
      case 'partial':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">Partial</Badge>
      default:
        return <Badge variant="outline" className="text-amber-600 border-amber-300">Unpaid</Badge>
    }
  }

  const handleExportCSV = () => {
    const headers = ['Business Name', 'Contact', 'Email', 'Phone', 'Tier', 'Status', 'Payment', 'Amount', 'Staff Count', 'Created']
    const rows = filteredVendors.map((v) => [
      v.businessName,
      `${v.contactFirstName} ${v.contactLastName}`,
      v.email,
      v.phone,
      v.selectedTier,
      v.status,
      v.paymentStatus,
      v.amountPaid || 0,
      v._count?.boothStaff || 0,
      format(new Date(v.createdAt), 'yyyy-MM-dd'),
    ])

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vendors-${event?.slug || eventId}-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-[#1E3A5F]">{stats.total}</p>
            <p className="text-sm text-[#6B7280]">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
            <p className="text-sm text-[#6B7280]">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
            <p className="text-sm text-[#6B7280]">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            <p className="text-sm text-[#6B7280]">Rejected</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.paid}</p>
            <p className="text-sm text-[#6B7280]">Paid</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-green-600">${stats.totalRevenue.toFixed(2)}</p>
            <p className="text-sm text-[#6B7280]">Revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Registration Link */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-[#1E3A5F]">Vendor Registration Link</p>
              <p className="text-sm text-[#6B7280]">
                {typeof window !== 'undefined' ? window.location.origin : ''}/events/{event?.slug}/register-vendor
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                const url = `${window.location.origin}/events/${event?.slug}/register-vendor`
                navigator.clipboard.writeText(url)
                alert('Link copied!')
              }}
            >
              Copy Link
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
          <Input
            placeholder="Search by business name, contact, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filterStatus === 'all' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('all')}
            size="sm"
          >
            All
          </Button>
          <Button
            variant={filterStatus === 'pending' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('pending')}
            size="sm"
          >
            <Clock className="h-4 w-4 mr-1" />
            Pending ({stats.pending})
          </Button>
          <Button
            variant={filterStatus === 'approved' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('approved')}
            size="sm"
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Approved
          </Button>
          <Button
            variant={filterStatus === 'rejected' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('rejected')}
            size="sm"
          >
            <XCircle className="h-4 w-4 mr-1" />
            Rejected
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVendors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-[#6B7280]">
                    No vendor applications found
                  </TableCell>
                </TableRow>
              ) : (
                filteredVendors.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {vendor.logoUrl && (
                          <img src={vendor.logoUrl} alt="" className="h-8 w-8 rounded object-cover" />
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
                      <p className="text-xs text-[#6B7280]">${Number(vendor.tierPrice).toFixed(2)}</p>
                    </TableCell>
                    <TableCell>{getStatusBadge(vendor.status)}</TableCell>
                    <TableCell>
                      {vendor.status === 'approved' ? (
                        <div>
                          {getPaymentBadge(vendor.paymentStatus)}
                          {vendor.invoiceTotal && (
                            <p className="text-xs text-[#6B7280] mt-1">
                              ${Number(vendor.amountPaid || 0).toFixed(2)} / ${Number(vendor.invoiceTotal).toFixed(2)}
                            </p>
                          )}
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
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setDetailVendor(vendor)
                            setDetailModalOpen(true)
                          }}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {vendor.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openReviewModal(vendor)}
                          >
                            Review
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
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
              {/* Vendor Details */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <h4 className="font-medium">Application Details</h4>
                <p><span className="text-gray-500">Contact:</span> {selectedVendor.contactFirstName} {selectedVendor.contactLastName}</p>
                <p><span className="text-gray-500">Email:</span> {selectedVendor.email}</p>
                <p><span className="text-gray-500">Phone:</span> {selectedVendor.phone}</p>
                <p><span className="text-gray-500">Description:</span> {selectedVendor.boothDescription}</p>
                {selectedVendor.additionalNeeds && (
                  <p><span className="text-gray-500">Additional Needs:</span> {selectedVendor.additionalNeeds}</p>
                )}
              </div>

              {/* Invoice Builder */}
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
                          onClick={() => removeLineItem(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Line Item
                  </Button>
                </div>
                <div className="mt-4 pt-4 border-t flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>${invoiceTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Invoice Notes */}
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

              {/* Rejection Reason */}
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
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
              Reject
            </Button>
            <Button
              onClick={handleApprove}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700"
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Approve & Send Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Vendor Details</DialogTitle>
          </DialogHeader>

          {detailVendor && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {detailVendor.logoUrl && (
                  <img src={detailVendor.logoUrl} alt="" className="h-16 w-16 rounded object-cover" />
                )}
                <div>
                  <h3 className="font-bold text-lg">{detailVendor.businessName}</h3>
                  {getStatusBadge(detailVendor.status)}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <p><strong>Contact:</strong> {detailVendor.contactFirstName} {detailVendor.contactLastName}</p>
                <p><strong>Email:</strong> {detailVendor.email}</p>
                <p><strong>Phone:</strong> {detailVendor.phone}</p>
                <p><strong>Booth Type:</strong> {detailVendor.selectedTier}</p>
                <p><strong>Description:</strong> {detailVendor.boothDescription}</p>
                {detailVendor.additionalNeeds && (
                  <p><strong>Additional Needs:</strong> {detailVendor.additionalNeeds}</p>
                )}
              </div>

              {detailVendor.status === 'approved' && (
                <div className="border-t pt-4 space-y-2">
                  <h4 className="font-medium">Vendor Code</h4>
                  <div className="bg-gray-100 p-3 rounded text-center font-mono text-lg">
                    {detailVendor.vendorCode}
                  </div>
                  <p className="text-xs text-gray-500">Share this code with booth staff for their registration</p>

                  {detailVendor.invoiceTotal && (
                    <div className="mt-4">
                      <h4 className="font-medium">Invoice</h4>
                      <p>Total: ${Number(detailVendor.invoiceTotal).toFixed(2)}</p>
                      <p>Paid: ${Number(detailVendor.amountPaid || 0).toFixed(2)}</p>
                      <p>Status: {getPaymentBadge(detailVendor.paymentStatus)}</p>
                    </div>
                  )}

                  <div className="mt-4">
                    <h4 className="font-medium">Booth Staff</h4>
                    <p>{detailVendor._count?.boothStaff || 0} registered</p>
                  </div>
                </div>
              )}

              {detailVendor.status === 'rejected' && detailVendor.rejectionReason && (
                <div className="border-t pt-4">
                  <h4 className="font-medium text-red-600">Rejection Reason</h4>
                  <p className="text-sm">{detailVendor.rejectionReason}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
