'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, Loader2, Users, Store, CheckCircle, Clock, FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface StaffReportModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  eventName: string
}

export default function StaffReportModal({
  isOpen,
  onClose,
  eventId,
  eventName,
}: StaffReportModalProps) {
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
      const response = await fetch(`/api/admin/events/${eventId}/reports/staff`)
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
        `/api/admin/events/${eventId}/reports/staff/export`,
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
      a.download = `staff_report_${eventName.replace(/\s+/g, '_')}.${format}`
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
            Staff Report - {eventName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#9C8466]" />
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Staff Summary */}
            <Card className="bg-[#F5F1E8] border-[#9C8466]">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-[#1E3A5F] mb-4">STAFF SUMMARY</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-[#6B7280]">Total Staff</p>
                    <p className="text-2xl font-bold text-[#1E3A5F]">
                      {data.totalStaff}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B7280]">Volunteers</p>
                    <p className="text-2xl font-bold text-[#1E3A5F]">
                      {data.volunteerStaff}
                    </p>
                    <p className="text-xs text-[#6B7280]">
                      {data.totalStaff > 0 ? Math.round((data.volunteerStaff / data.totalStaff) * 100) : 0}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B7280]">Vendor Staff</p>
                    <p className="text-2xl font-bold text-[#9C8466]">
                      {data.vendorStaff}
                    </p>
                    <p className="text-xs text-[#6B7280]">
                      {data.totalStaff > 0 ? Math.round((data.vendorStaff / data.totalStaff) * 100) : 0}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B7280]">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(data.totalRevenue)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Check-in & Forms Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-white border-[#E5E7EB]">
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-[#1E3A5F] mb-4 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    CHECK-IN STATUS
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                      <span className="text-sm">Checked In</span>
                      <span className="font-semibold text-green-600">{data.checkedInStaff}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-sm">Not Checked In</span>
                      <span className="font-semibold text-[#6B7280]">{data.notCheckedIn}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-[#E5E7EB]">
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-[#1E3A5F] mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    LIABILITY FORMS
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                      <span className="text-sm">Completed</span>
                      <span className="font-semibold text-green-600">{data.formsCompleted}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-amber-50 rounded">
                      <span className="text-sm">Pending</span>
                      <span className="font-semibold text-amber-600">{data.formsPending}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Role Breakdown */}
            {data.roleBreakdown && Object.keys(data.roleBreakdown).length > 0 && (
              <div>
                <h3 className="font-semibold text-[#1E3A5F] mb-3">ROLE BREAKDOWN</h3>
                <div className="space-y-2">
                  {Object.entries(data.roleBreakdown)
                    .sort(([, a]: [string, any], [, b]: [string, any]) => b - a)
                    .map(([role, count]: [string, any]) => (
                    <div key={role} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-sm">{role}</span>
                      <span className="font-semibold">
                        {count} ({data.totalStaff > 0 ? Math.round((count / data.totalStaff) * 100) : 0}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* T-Shirt Size Breakdown */}
            {data.tshirtBreakdown && Object.keys(data.tshirtBreakdown).length > 0 && (
              <div>
                <h3 className="font-semibold text-[#1E3A5F] mb-3">T-SHIRT SIZES</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.entries(data.tshirtBreakdown).map(([size, count]: [string, any]) => (
                    <div key={size} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-sm font-medium">{size}</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Staff List */}
            {data.staffList && data.staffList.length > 0 && (
              <div>
                <h3 className="font-semibold text-[#1E3A5F] mb-3">STAFF LIST</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 font-medium">Name</th>
                        <th className="text-left p-3 font-medium">Role</th>
                        <th className="text-left p-3 font-medium">Type</th>
                        <th className="text-left p-3 font-medium">T-Shirt</th>
                        <th className="text-center p-3 font-medium">Checked In</th>
                        <th className="text-center p-3 font-medium">Form</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.staffList.slice(0, 10).map((staff: any) => (
                        <tr key={staff.id} className="border-t">
                          <td className="p-3">
                            <p className="font-medium">{staff.fullName}</p>
                            <p className="text-xs text-[#6B7280]">{staff.email}</p>
                          </td>
                          <td className="p-3">{staff.role}</td>
                          <td className="p-3">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              staff.isVendorStaff ? 'bg-[#9C8466]/10 text-[#9C8466]' : 'bg-[#1E3A5F]/10 text-[#1E3A5F]'
                            }`}>
                              {staff.isVendorStaff ? 'Vendor' : 'Volunteer'}
                            </span>
                          </td>
                          <td className="p-3">{staff.tshirtSize}</td>
                          <td className="p-3 text-center">
                            {staff.checkedIn ? (
                              <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                            ) : (
                              <Clock className="h-4 w-4 text-[#6B7280] mx-auto" />
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {staff.liabilityFormCompleted ? (
                              <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                            ) : staff.porosAccessCode ? (
                              <Clock className="h-4 w-4 text-amber-600 mx-auto" />
                            ) : (
                              <span className="text-xs text-[#6B7280]">N/A</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {data.staffList.length > 10 && (
                    <div className="p-3 bg-gray-50 text-center text-sm text-[#6B7280]">
                      + {data.staffList.length - 10} more staff (download CSV for full list)
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
          <div className="text-center py-8 text-[#6B7280]">No staff data available</div>
        )}
      </DialogContent>
    </Dialog>
  )
}
