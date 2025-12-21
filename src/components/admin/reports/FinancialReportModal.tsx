'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface FinancialReportModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  eventName: string
}

interface FinancialData {
  totalRevenue: number
  amountPaid: number
  balanceDue: number
  overdueBalance: number
  paymentMethods: {
    stripe: number
    check: number
    pending: number
  }
  byParticipantType: {
    youthU18: { revenue: number; count: number; avg: number }
    youthO18: { revenue: number; count: number; avg: number }
    chaperones: { revenue: number; count: number; avg: number }
    clergy: { revenue: number; count: number; avg: number }
  }
  byHousingType: {
    onCampus: { revenue: number; count: number }
    offCampus: { revenue: number; count: number }
    dayPass: { revenue: number; count: number }
  }
  byRegistrationType: {
    group: number
    individual: number
  }
  paymentTimeline: Array<{ month: string; amount: number }>
  refunds: {
    totalRefunded: number
    count: number
    reasons: Record<string, number>
  }
}

export default function FinancialReportModal({
  isOpen,
  onClose,
  eventId,
  eventName,
}: FinancialReportModalProps) {
  const [data, setData] = useState<FinancialData | null>(null)
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
      const response = await fetch(`/api/admin/events/${eventId}/reports/financial`)

      if (!response.ok) {
        throw new Error('Failed to fetch financial report')
      }

      const reportData = await response.json()
      setData(reportData)
    } catch (error) {
      console.error('Error fetching financial report:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format: 'csv' | 'pdf') => {
    setExporting(format)
    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/reports/financial/export`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ format }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to export report')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `financial_report_${eventName.replace(/\s+/g, '_')}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting report:', error)
      alert('Failed to export report. Please try again.')
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

  const formatPercent = (value: number, total: number) => {
    if (total === 0) return '0%'
    return `${Math.round((value / total) * 100)}%`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-[#1E3A5F]">
            Financial Report - {eventName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#9C8466]" />
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Revenue Summary */}
            <Card className="bg-[#F5F1E8] border-[#9C8466]">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-[#1E3A5F] mb-4">
                  REVENUE SUMMARY
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-[#6B7280]">Total Revenue</p>
                    <p className="text-2xl font-bold text-[#1E3A5F]">
                      {formatCurrency(data.totalRevenue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B7280]">Amount Paid</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(data.amountPaid)}
                    </p>
                    <p className="text-xs text-[#6B7280]">
                      {formatPercent(data.amountPaid, data.totalRevenue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B7280]">Balance Due</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatCurrency(data.balanceDue)}
                    </p>
                    <p className="text-xs text-[#6B7280]">
                      {formatPercent(data.balanceDue, data.totalRevenue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B7280]">Overdue</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(data.overdueBalance)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <div>
              <h3 className="font-semibold text-[#1E3A5F] mb-3">
                PAYMENT METHOD BREAKDOWN
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-sm">Credit Card (Stripe)</span>
                  <span className="font-semibold">
                    {formatCurrency(data.paymentMethods.stripe)} (
                    {formatPercent(data.paymentMethods.stripe, data.amountPaid)})
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-sm">Check</span>
                  <span className="font-semibold">
                    {formatCurrency(data.paymentMethods.check)} (
                    {formatPercent(data.paymentMethods.check, data.amountPaid)})
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-sm">Pending</span>
                  <span className="font-semibold">
                    {formatCurrency(data.paymentMethods.pending)}
                  </span>
                </div>
              </div>
            </div>

            {/* Revenue by Participant Type */}
            <div>
              <h3 className="font-semibold text-[#1E3A5F] mb-3">
                REVENUE BY PARTICIPANT TYPE
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-sm">Youth (U18)</span>
                  <span className="font-semibold">
                    {formatCurrency(data.byParticipantType.youthU18.revenue)} (
                    {data.byParticipantType.youthU18.count} ×{' '}
                    {formatCurrency(data.byParticipantType.youthU18.avg)} avg)
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-sm">Youth (18+)</span>
                  <span className="font-semibold">
                    {formatCurrency(data.byParticipantType.youthO18.revenue)} (
                    {data.byParticipantType.youthO18.count} ×{' '}
                    {formatCurrency(data.byParticipantType.youthO18.avg)} avg)
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-sm">Chaperones</span>
                  <span className="font-semibold">
                    {formatCurrency(data.byParticipantType.chaperones.revenue)} (
                    {data.byParticipantType.chaperones.count} ×{' '}
                    {formatCurrency(data.byParticipantType.chaperones.avg)} avg)
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-sm">Clergy</span>
                  <span className="font-semibold">
                    {formatCurrency(data.byParticipantType.clergy.revenue)} (
                    {data.byParticipantType.clergy.count} × $0)
                  </span>
                </div>
              </div>
            </div>

            {/* Revenue by Housing Type */}
            <div>
              <h3 className="font-semibold text-[#1E3A5F] mb-3">
                REVENUE BY HOUSING TYPE
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-sm">On-Campus</span>
                  <span className="font-semibold">
                    {formatCurrency(data.byHousingType.onCampus.revenue)} (
                    {data.byHousingType.onCampus.count} people)
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-sm">Off-Campus</span>
                  <span className="font-semibold">
                    {formatCurrency(data.byHousingType.offCampus.revenue)} (
                    {data.byHousingType.offCampus.count} people)
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-sm">Day Pass</span>
                  <span className="font-semibold">
                    {formatCurrency(data.byHousingType.dayPass.revenue)} (
                    {data.byHousingType.dayPass.count} people)
                  </span>
                </div>
              </div>
            </div>

            {/* Revenue by Registration Type */}
            <div>
              <h3 className="font-semibold text-[#1E3A5F] mb-3">
                REVENUE BY REGISTRATION TYPE
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-sm">Group Registrations</span>
                  <span className="font-semibold">
                    {formatCurrency(data.byRegistrationType.group)} (
                    {formatPercent(
                      data.byRegistrationType.group,
                      data.totalRevenue
                    )}
                    )
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-sm">Individual Registrations</span>
                  <span className="font-semibold">
                    {formatCurrency(data.byRegistrationType.individual)} (
                    {formatPercent(
                      data.byRegistrationType.individual,
                      data.totalRevenue
                    )}
                    )
                  </span>
                </div>
              </div>
            </div>

            {/* Refunds */}
            {data.refunds.count > 0 && (
              <div>
                <h3 className="font-semibold text-[#1E3A5F] mb-3">
                  REFUNDS ISSUED
                </h3>
                <div className="p-4 bg-red-50 border border-red-200 rounded">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Total Refunded:</span>
                    <span className="font-semibold text-red-600">
                      -{formatCurrency(data.refunds.totalRefunded)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Number of Refunds:</span>
                    <span className="font-semibold">{data.refunds.count}</span>
                  </div>
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
              <Button
                onClick={onClose}
                variant="outline"
                className="border-[#1E3A5F] text-[#1E3A5F]"
              >
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-[#6B7280]">
            No financial data available
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
