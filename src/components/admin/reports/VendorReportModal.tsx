'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, Loader2, Store, Users, DollarSign, CheckCircle, Clock, XCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface VendorReportModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  eventName: string
}

export default function VendorReportModal({
  isOpen,
  onClose,
  eventId,
  eventName,
}: VendorReportModalProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen, eventId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/events/${eventId}/reports/vendors`)
      if (!response.ok) throw new Error('Failed to fetch')
      const reportData = await response.json()
      setData(reportData)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format: 'csv' | 'pdf') => {
    setExporting(format)
    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/reports/vendors/export`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ format }),
        }
      )
      if (!response.ok) throw new Error('Failed to export')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vendor_report_${eventName.replace(/\s+/g, '_')}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to export report.')
    } finally {
      setExporting(null)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-[#1E3A5F]">
            Vendor Report - {eventName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#9C8466]" />
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Vendor Summary */}
            <Card className="bg-[#F5F1E8] border-[#9C8466]">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-[#1E3A5F] mb-4">VENDOR SUMMARY</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-[#6B7280]">Total Vendors</p>
                    <p className="text-2xl font-bold text-[#1E3A5F]">
                      {data.totalVendors}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B7280]">Approved</p>
                    <p className="text-2xl font-bold text-green-600">
                      {data.approvedVendors}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B7280]">Pending</p>
                    <p className="text-2xl font-bold text-amber-600">
                      {data.pendingVendors}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B7280]">Rejected</p>
                    <p className="text-2xl font-bold text-red-600">
                      {data.rejectedVendors}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card className="bg-white border-[#E5E7EB]">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-[#1E3A5F] mb-4">FINANCIAL SUMMARY</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-[#6B7280]">Total Invoiced</p>
                    <p className="text-2xl font-bold text-[#1E3A5F]">
                      {formatCurrency(data.totalInvoiced)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B7280]">Total Paid</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(data.totalPaid)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B7280]">Balance Due</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(data.totalBalance)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B7280]">Total Booth Staff</p>
                    <p className="text-2xl font-bold text-[#1E3A5F]">
                      {data.totalBoothStaff}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Status */}
            <div>
              <h3 className="font-semibold text-[#1E3A5F] mb-3">PAYMENT STATUS</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-[#6B7280]">Paid</p>
                    <p className="font-semibold text-green-600">{data.paidVendors}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-amber-50 rounded">
                  <Clock className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="text-sm text-[#6B7280]">Partial</p>
                    <p className="font-semibold text-amber-600">{data.partialVendors}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-red-50 rounded">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm text-[#6B7280]">Unpaid</p>
                    <p className="font-semibold text-red-600">{data.unpaidVendors}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tier Breakdown */}
            {data.tierBreakdown && Object.keys(data.tierBreakdown).length > 0 && (
              <div>
                <h3 className="font-semibold text-[#1E3A5F] mb-3">BOOTH TIER BREAKDOWN</h3>
                <div className="space-y-2">
                  {Object.entries(data.tierBreakdown).map(([tier, count]: [string, any]) => (
                    <div key={tier} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-sm">{tier}</span>
                      <span className="font-semibold">
                        {count} ({data.totalVendors > 0 ? Math.round((count / data.totalVendors) * 100) : 0}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vendor List */}
            {data.vendorList && data.vendorList.length > 0 && (
              <div>
                <h3 className="font-semibold text-[#1E3A5F] mb-3">VENDOR LIST</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 font-medium">Business</th>
                        <th className="text-left p-3 font-medium">Contact</th>
                        <th className="text-left p-3 font-medium">Tier</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-right p-3 font-medium">Balance</th>
                        <th className="text-center p-3 font-medium">Staff</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.vendorList.slice(0, 10).map((vendor: any) => (
                        <tr key={vendor.id} className="border-t">
                          <td className="p-3">
                            <p className="font-medium">{vendor.businessName}</p>
                            <p className="text-xs text-[#6B7280]">{vendor.email}</p>
                          </td>
                          <td className="p-3">{vendor.contactName}</td>
                          <td className="p-3">{vendor.selectedTier}</td>
                          <td className="p-3">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              vendor.status === 'approved' ? 'bg-green-100 text-green-800' :
                              vendor.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {vendor.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            {formatCurrency(vendor.balance)}
                          </td>
                          <td className="p-3 text-center">{vendor.boothStaffCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {data.vendorList.length > 10 && (
                    <div className="p-3 bg-gray-50 text-center text-sm text-[#6B7280]">
                      + {data.vendorList.length - 10} more vendors (download CSV for full list)
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={() => handleExport('csv')}
                disabled={exporting !== null}
                variant="outline"
                className="flex-1"
              >
                {exporting === 'csv' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download CSV
              </Button>
              <Button
                onClick={() => handleExport('pdf')}
                disabled={exporting !== null}
                variant="outline"
                className="flex-1"
              >
                {exporting === 'pdf' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download PDF
              </Button>
              <Button onClick={onClose} variant="outline" className="border-[#1E3A5F] text-[#1E3A5F]">
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-[#6B7280]">No vendor data available</div>
        )}
      </DialogContent>
    </Dialog>
  )
}
