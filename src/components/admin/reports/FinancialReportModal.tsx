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

interface Transaction {
  processedAt: string | null
  amount: number
  paymentMethod: string
  paymentType: string
  paymentStatus: string
  payer: string
  registrationType: string
  checkNumber: string | null
  cardLast4: string | null
  cardBrand: string | null
  notes: string | null
}

interface BalanceRow {
  payer: string
  registrationType: string
  totalAmountDue: number
  amountPaid: number
  amountRemaining: number
  paymentStatus: string
  lastPaymentDate: string | null
}

interface RefundDetail {
  payer: string
  registrationType: string
  refundAmount: number
  refundReason: string
  refundMethod: string | null
  refundStatus: string | null
  processedAt: string | null
}

interface ExpectedPayment {
  createdAt: string | null
  amount: number
  paymentMethod: string
  paymentType: string
  payer: string
  registrationType: string
  checkNumber: string | null
}

interface FinancialData {
  totalRevenue: number
  amountPaid: number
  actualAmountPaid: number
  paymentMismatch: boolean
  balanceDue: number
  overdueBalance: number
  paymentMethods: {
    stripe: number
    check: number
    cash: number
    other: number
    pending: number
  }
  expectedPayments: {
    total: number
    stripe: number
    check: number
    other: number
    count: number
    details: ExpectedPayment[]
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
  transactions: Transaction[]
  balancesByRegistration: BalanceRow[]
  refunds: {
    totalRefunded: number
    count: number
    reasons: Record<string, number>
    details: RefundDetail[]
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
      // Defensive defaults — keeps the UI sane if a cached old API shape
      // is returned before the new fields land.
      setData({
        ...reportData,
        actualAmountPaid: reportData.actualAmountPaid ?? reportData.amountPaid ?? 0,
        paymentMismatch: !!reportData.paymentMismatch,
        paymentMethods: {
          stripe: reportData.paymentMethods?.stripe ?? 0,
          check: reportData.paymentMethods?.check ?? 0,
          cash: reportData.paymentMethods?.cash ?? 0,
          other: reportData.paymentMethods?.other ?? 0,
          pending: reportData.paymentMethods?.pending ?? 0,
        },
        expectedPayments: {
          total: reportData.expectedPayments?.total ?? 0,
          stripe: reportData.expectedPayments?.stripe ?? 0,
          check: reportData.expectedPayments?.check ?? 0,
          other: reportData.expectedPayments?.other ?? 0,
          count: reportData.expectedPayments?.count ?? 0,
          details: reportData.expectedPayments?.details ?? [],
        },
        transactions: reportData.transactions ?? [],
        balancesByRegistration: reportData.balancesByRegistration ?? [],
        refunds: {
          ...reportData.refunds,
          details: reportData.refunds?.details ?? [],
        },
      })
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
    if (!total || total <= 0) return '0%'
    return `${Math.round((value / total) * 100)}%`
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return '—'
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return '—'
    }
  }

  const paymentMethodLabel = (method: string, t: Transaction) => {
    if (method === 'card') {
      const brand = t.cardBrand ? t.cardBrand : 'Card'
      const last4 = t.cardLast4 ? ` ••${t.cardLast4}` : ''
      return `${brand}${last4}`
    }
    if (method === 'check') {
      return t.checkNumber ? `Check #${t.checkNumber}` : 'Check'
    }
    if (method === 'cash') return 'Cash'
    if (method === 'bank_transfer') return 'Bank Transfer'
    return method || 'Other'
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
                      {formatCurrency(data.actualAmountPaid)}
                    </p>
                    <p className="text-xs text-[#6B7280]">
                      {formatPercent(data.actualAmountPaid, data.totalRevenue)} of revenue
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B7280]">Balance Due</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatCurrency(data.balanceDue)}
                    </p>
                    <p className="text-xs text-[#6B7280]">
                      {formatPercent(data.balanceDue, data.totalRevenue)} of revenue
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

            {/* Reconciliation mismatch warning */}
            {data.paymentMismatch && (
              <div className="p-4 bg-yellow-50 border border-yellow-300 rounded">
                <p className="text-sm font-semibold text-yellow-900 mb-1">
                  Reconciliation mismatch
                </p>
                <p className="text-xs text-yellow-900">
                  Recorded transactions total{' '}
                  <strong>{formatCurrency(data.actualAmountPaid)}</strong>, but the
                  payment-balance table shows{' '}
                  <strong>{formatCurrency(data.amountPaid)}</strong> paid. This
                  usually means a payment was inserted without updating the balance
                  record. Transactions list below shows what actually settled.
                </p>
              </div>
            )}

            {/* Payment Methods */}
            <div>
              <h3 className="font-semibold text-[#1E3A5F] mb-3">
                PAYMENTS RECEIVED (BY METHOD)
              </h3>
              <p className="text-xs text-[#6B7280] mb-2">
                Money actually settled, broken down by how it was paid.
                Percentages are of total received (
                {formatCurrency(data.actualAmountPaid)}).
              </p>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-sm">Credit Card (Stripe)</span>
                  <span className="font-semibold">
                    {formatCurrency(data.paymentMethods.stripe)} (
                    {formatPercent(data.paymentMethods.stripe, data.actualAmountPaid)})
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-sm">Check</span>
                  <span className="font-semibold">
                    {formatCurrency(data.paymentMethods.check)} (
                    {formatPercent(data.paymentMethods.check, data.actualAmountPaid)})
                  </span>
                </div>
                {data.paymentMethods.cash > 0 && (
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-sm">Cash</span>
                    <span className="font-semibold">
                      {formatCurrency(data.paymentMethods.cash)} (
                      {formatPercent(data.paymentMethods.cash, data.actualAmountPaid)})
                    </span>
                  </div>
                )}
                {data.paymentMethods.other > 0 && (
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-sm">Other</span>
                    <span className="font-semibold">
                      {formatCurrency(data.paymentMethods.other)} (
                      {formatPercent(data.paymentMethods.other, data.actualAmountPaid)})
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Outstanding Balance (separate from payment methods) */}
            <div>
              <h3 className="font-semibold text-[#1E3A5F] mb-3">
                OUTSTANDING BALANCE
              </h3>
              <div className="flex justify-between items-center p-3 bg-orange-50 border border-orange-200 rounded">
                <span className="text-sm">Total awaiting payment (across all registrations)</span>
                <span className="font-semibold text-orange-700">
                  {formatCurrency(data.balanceDue)}
                </span>
              </div>
            </div>

            {/* Expected Payments — intents, not money received */}
            {data.expectedPayments.count > 0 && (
              <div>
                <h3 className="font-semibold text-[#1E3A5F] mb-3">
                  EXPECTED PAYMENTS ({data.expectedPayments.count})
                </h3>
                <p className="text-xs text-[#6B7280] mb-2">
                  These are commitments — e.g. a group leader who chose &quot;pay by
                  check later&quot; or an unfinished Stripe checkout. They are{' '}
                  <strong>not</strong> counted as received. Move them to
                  Transactions above by marking the check received or completing
                  the card payment.
                </p>
                <div className="space-y-2 mb-3">
                  {data.expectedPayments.check > 0 && (
                    <div className="flex justify-between items-center p-3 bg-amber-50 border border-amber-200 rounded">
                      <span className="text-sm">Check (awaiting receipt)</span>
                      <span className="font-semibold text-amber-800">
                        {formatCurrency(data.expectedPayments.check)}
                      </span>
                    </div>
                  )}
                  {data.expectedPayments.stripe > 0 && (
                    <div className="flex justify-between items-center p-3 bg-amber-50 border border-amber-200 rounded">
                      <span className="text-sm">
                        Credit Card (unfinished checkout)
                      </span>
                      <span className="font-semibold text-amber-800">
                        {formatCurrency(data.expectedPayments.stripe)}
                      </span>
                    </div>
                  )}
                  {data.expectedPayments.other > 0 && (
                    <div className="flex justify-between items-center p-3 bg-amber-50 border border-amber-200 rounded">
                      <span className="text-sm">Other</span>
                      <span className="font-semibold text-amber-800">
                        {formatCurrency(data.expectedPayments.other)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="overflow-x-auto border border-gray-200 rounded">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase text-[#6B7280]">
                      <tr>
                        <th className="px-3 py-2">Created</th>
                        <th className="px-3 py-2">Payer</th>
                        <th className="px-3 py-2">Intended Method</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.expectedPayments.details.map((e, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="px-3 py-2 text-[#6B7280]">
                            {formatDate(e.createdAt)}
                          </td>
                          <td className="px-3 py-2">
                            <div className="font-medium">{e.payer}</div>
                            <div className="text-xs text-[#6B7280]">
                              {e.registrationType}
                            </div>
                          </td>
                          <td className="px-3 py-2 capitalize">
                            {e.paymentMethod === 'card'
                              ? 'Credit Card'
                              : e.paymentMethod === 'check'
                                ? `Check${e.checkNumber ? ` #${e.checkNumber}` : ''}`
                                : e.paymentMethod}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-amber-800">
                            {formatCurrency(e.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

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

            {/* Transactions */}
            <div>
              <h3 className="font-semibold text-[#1E3A5F] mb-3">
                TRANSACTIONS — MONEY RECEIVED ({data.transactions.length})
              </h3>
              <p className="text-xs text-[#6B7280] mb-2">
                Only settled payments. Pending check intents and abandoned card
                checkouts are listed under Expected Payments above.
              </p>
              {data.transactions.length === 0 ? (
                <div className="p-3 bg-gray-50 rounded text-sm text-[#6B7280]">
                  No settled payments yet.
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase text-[#6B7280]">
                      <tr>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Payer</th>
                        <th className="px-3 py-2">Method</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.transactions.map((t, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="px-3 py-2 text-[#6B7280]">
                            {formatDate(t.processedAt)}
                          </td>
                          <td className="px-3 py-2">
                            <div className="font-medium text-[#1E3A5F]">{t.payer}</div>
                            <div className="text-xs text-[#6B7280]">
                              {t.registrationType}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div>{paymentMethodLabel(t.paymentMethod, t)}</div>
                            <div className="text-xs text-[#6B7280] capitalize">
                              {t.paymentType?.replace(/_/g, ' ')}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right font-semibold">
                            {formatCurrency(t.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Balances by Registration */}
            <div>
              <h3 className="font-semibold text-[#1E3A5F] mb-3">
                BALANCE BY REGISTRATION ({data.balancesByRegistration.length})
              </h3>
              {data.balancesByRegistration.length === 0 ? (
                <div className="p-3 bg-gray-50 rounded text-sm text-[#6B7280]">
                  No payment balances on file.
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase text-[#6B7280]">
                      <tr>
                        <th className="px-3 py-2">Payer</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2 text-right">Invoiced</th>
                        <th className="px-3 py-2 text-right">Paid</th>
                        <th className="px-3 py-2 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.balancesByRegistration.map((b, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="px-3 py-2">
                            <div className="font-medium text-[#1E3A5F]">{b.payer}</div>
                            <div className="text-xs text-[#6B7280]">
                              {b.registrationType}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-xs capitalize">
                            {b.paymentStatus?.replace(/_/g, ' ')}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {formatCurrency(b.totalAmountDue)}
                          </td>
                          <td className="px-3 py-2 text-right text-green-700">
                            {formatCurrency(b.amountPaid)}
                          </td>
                          <td
                            className={`px-3 py-2 text-right font-semibold ${
                              b.amountRemaining > 0 ? 'text-orange-700' : 'text-[#6B7280]'
                            }`}
                          >
                            {formatCurrency(b.amountRemaining)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Refunds */}
            {data.refunds.count > 0 && (
              <div>
                <h3 className="font-semibold text-[#1E3A5F] mb-3">
                  REFUNDS ISSUED
                </h3>
                <div className="p-4 bg-red-50 border border-red-200 rounded mb-3">
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
                {data.refunds.details.length > 0 && (
                  <div className="overflow-x-auto border border-gray-200 rounded">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-left text-xs uppercase text-[#6B7280]">
                        <tr>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Payer</th>
                          <th className="px-3 py-2">Reason</th>
                          <th className="px-3 py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.refunds.details.map((r, i) => (
                          <tr key={i} className="border-t border-gray-100">
                            <td className="px-3 py-2 text-[#6B7280]">
                              {formatDate(r.processedAt)}
                            </td>
                            <td className="px-3 py-2">
                              <div className="font-medium">{r.payer}</div>
                              <div className="text-xs text-[#6B7280]">
                                {r.registrationType}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-xs">{r.refundReason}</td>
                            <td className="px-3 py-2 text-right font-semibold text-red-600">
                              -{formatCurrency(r.refundAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
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
