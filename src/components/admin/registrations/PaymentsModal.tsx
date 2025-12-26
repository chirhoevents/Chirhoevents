'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  X,
  DollarSign,
  CreditCard,
  FileText,
  Mail,
  RefreshCw,
  Download,
  ArrowLeftRight,
} from 'lucide-react'
import { format } from 'date-fns'
import RefundModal from '@/components/admin/RefundModal'
import RecordAdditionalPaymentModal from '@/components/admin/RecordAdditionalPaymentModal'

interface PaymentsModalProps {
  isOpen: boolean
  onClose: () => void
  registrationId: string
  registrationType: 'group' | 'individual'
  registrationName: string
  onUpdate?: () => void
  onSendPaymentReminder?: () => void
}

interface Payment {
  id: string
  amount: number
  paymentType: string
  paymentMethod: string
  paymentStatus: string
  checkNumber?: string | null
  cardLast4?: string | null
  cardBrand?: string | null
  receiptUrl?: string | null
  notes?: string | null
  processedAt?: string | null
  createdAt: string
  processedBy?: {
    firstName: string
    lastName: string
  } | null
}

interface Refund {
  id: string
  refundAmount: number
  refundMethod: string
  refundReason: string
  notes?: string | null
  status: string
  processedAt: string
  processedBy?: {
    firstName: string
    lastName: string
  } | null
}

interface PaymentBalance {
  totalAmountDue: number
  amountPaid: number
  amountRemaining: number
  lateFeesApplied: number
  paymentStatus: string
}

interface PaymentData {
  registrationName: string
  paymentBalance: PaymentBalance | null
  payments: Payment[]
  refunds: Refund[]
}

export default function PaymentsModal({
  isOpen,
  onClose,
  registrationId,
  registrationType,
  registrationName,
  onUpdate,
  onSendPaymentReminder,
}: PaymentsModalProps) {
  const [data, setData] = useState<PaymentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false)

  useEffect(() => {
    if (isOpen && registrationId) {
      fetchPaymentData()
    }
  }, [isOpen, registrationId, registrationType])

  async function fetchPaymentData() {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/admin/registrations/${registrationId}/payments?type=${registrationType}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch payment data')
      }
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Failed to fetch payment data:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleRefundProcessed() {
    fetchPaymentData()
    onUpdate?.()
  }

  function handlePaymentRecorded() {
    fetchPaymentData()
    onUpdate?.()
  }

  function getPaymentStatusBadge(status: string) {
    switch (status) {
      case 'paid_full':
        return <Badge className="bg-green-500 text-white">Paid in Full</Badge>
      case 'partial':
        return <Badge className="bg-orange-500 text-white">Partial Payment</Badge>
      case 'unpaid':
        return <Badge className="bg-red-500 text-white">Unpaid</Badge>
      case 'overpaid':
        return <Badge className="bg-blue-500 text-white">Overpaid</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  function getPaymentMethodDisplay(payment: Payment) {
    if (payment.paymentMethod === 'card' && payment.cardLast4) {
      return `Card ****${payment.cardLast4}`
    }
    if (payment.paymentMethod === 'check' && payment.checkNumber) {
      return `Check #${payment.checkNumber}`
    }
    if (payment.paymentMethod === 'stripe') {
      return 'Stripe'
    }
    return payment.paymentMethod.replace(/_/g, ' ')
  }

  if (!isOpen) return null

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold text-[#1E3A5F] flex items-center gap-2">
                  <DollarSign className="h-6 w-6" />
                  Payments
                </DialogTitle>
                <p className="text-sm text-gray-600 mt-1">{registrationName}</p>
              </div>
            </div>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 text-[#9C8466] animate-spin" />
            </div>
          ) : !data ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Failed to load payment data</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-6">
              {/* Balance Summary */}
              <Card className="p-6 bg-blue-50 border-blue-200">
                <h3 className="text-lg font-semibold mb-4 text-[#1E3A5F]">Balance Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Total Amount</div>
                    <div className="text-2xl font-bold text-[#1E3A5F]">
                      ${data.paymentBalance?.totalAmountDue?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Amount Paid</div>
                    <div className="text-2xl font-bold text-green-600">
                      ${data.paymentBalance?.amountPaid?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Balance Due</div>
                    <div className="text-2xl font-bold text-orange-600">
                      ${data.paymentBalance?.amountRemaining?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Status</div>
                    <div className="mt-1">
                      {getPaymentStatusBadge(data.paymentBalance?.paymentStatus || 'unpaid')}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button
                  onClick={() => setShowRecordPaymentModal(true)}
                  className="bg-[#1E3A5F] hover:bg-[#2A4A6F]"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Record Payment
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowRefundModal(true)}
                  disabled={!data.paymentBalance || data.paymentBalance.amountPaid <= 0}
                >
                  <ArrowLeftRight className="w-4 h-4 mr-2" />
                  Issue Refund
                </Button>
                <Button
                  variant="outline"
                  onClick={onSendPaymentReminder}
                  disabled={
                    !data.paymentBalance ||
                    data.paymentBalance.amountRemaining <= 0 ||
                    !onSendPaymentReminder
                  }
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Reminder
                </Button>
                <Button variant="outline" disabled>
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Invoice
                </Button>
              </div>

              {/* Payment History */}
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4 text-[#1E3A5F]">Payment History</h3>
                {data.payments && data.payments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-3 font-semibold">Date</th>
                          <th className="text-left p-3 font-semibold">Amount</th>
                          <th className="text-left p-3 font-semibold">Method</th>
                          <th className="text-left p-3 font-semibold">Status</th>
                          <th className="text-left p-3 font-semibold">Processed By</th>
                          <th className="text-left p-3 font-semibold">Receipt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.payments.map((payment) => (
                          <tr key={payment.id} className="border-t hover:bg-gray-50">
                            <td className="p-3">
                              {format(
                                new Date(payment.processedAt || payment.createdAt),
                                'MMM d, yyyy'
                              )}
                              <div className="text-xs text-gray-500">
                                {format(
                                  new Date(payment.processedAt || payment.createdAt),
                                  'h:mm a'
                                )}
                              </div>
                            </td>
                            <td className="p-3 font-medium text-green-600">
                              ${payment.amount.toFixed(2)}
                            </td>
                            <td className="p-3">
                              <div>{getPaymentMethodDisplay(payment)}</div>
                              {payment.notes && (
                                <div className="text-xs text-gray-500 truncate max-w-[150px]">
                                  {payment.notes}
                                </div>
                              )}
                            </td>
                            <td className="p-3">
                              <Badge
                                variant={
                                  payment.paymentStatus === 'succeeded' ? 'default' : 'secondary'
                                }
                                className={
                                  payment.paymentStatus === 'succeeded'
                                    ? 'bg-green-100 text-green-800'
                                    : ''
                                }
                              >
                                {payment.paymentStatus}
                              </Badge>
                            </td>
                            <td className="p-3 text-gray-600">
                              {payment.processedBy
                                ? `${payment.processedBy.firstName} ${payment.processedBy.lastName}`
                                : 'System/Stripe'}
                            </td>
                            <td className="p-3">
                              {payment.receiptUrl ? (
                                <a
                                  href={payment.receiptUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  <Download className="h-3 w-3" />
                                  View
                                </a>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">No payments recorded yet</div>
                )}
              </Card>

              {/* Refund History */}
              {data.refunds && data.refunds.length > 0 && (
                <Card className="p-4">
                  <h3 className="text-lg font-semibold mb-4 text-[#1E3A5F]">Refund History</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-3 font-semibold">Date</th>
                          <th className="text-left p-3 font-semibold">Amount</th>
                          <th className="text-left p-3 font-semibold">Reason</th>
                          <th className="text-left p-3 font-semibold">Method</th>
                          <th className="text-left p-3 font-semibold">Status</th>
                          <th className="text-left p-3 font-semibold">Processed By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.refunds.map((refund) => (
                          <tr key={refund.id} className="border-t hover:bg-gray-50">
                            <td className="p-3">
                              {format(new Date(refund.processedAt), 'MMM d, yyyy')}
                              <div className="text-xs text-gray-500">
                                {format(new Date(refund.processedAt), 'h:mm a')}
                              </div>
                            </td>
                            <td className="p-3 font-medium text-red-600">
                              -${refund.refundAmount.toFixed(2)}
                            </td>
                            <td className="p-3">
                              <div className="capitalize">
                                {refund.refundReason.replace(/_/g, ' ')}
                              </div>
                              {refund.notes && (
                                <div className="text-xs text-gray-500 truncate max-w-[150px]">
                                  {refund.notes}
                                </div>
                              )}
                            </td>
                            <td className="p-3 capitalize">{refund.refundMethod}</td>
                            <td className="p-3">
                              <Badge
                                variant={refund.status === 'completed' ? 'default' : 'secondary'}
                                className={
                                  refund.status === 'completed'
                                    ? 'bg-green-100 text-green-800'
                                    : ''
                                }
                              >
                                {refund.status}
                              </Badge>
                            </td>
                            <td className="p-3 text-gray-600">
                              {refund.processedBy
                                ? `${refund.processedBy.firstName} ${refund.processedBy.lastName}`
                                : 'System'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end pt-4 border-t mt-auto">
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Payment Modal */}
      {data && (
        <RecordAdditionalPaymentModal
          isOpen={showRecordPaymentModal}
          onClose={() => setShowRecordPaymentModal(false)}
          registrationId={registrationId}
          registrationType={registrationType}
          registrationName={registrationName}
          balanceRemaining={data.paymentBalance?.amountRemaining || 0}
          onSuccess={handlePaymentRecorded}
        />
      )}

      {/* Refund Modal */}
      {data && (
        <RefundModal
          isOpen={showRefundModal}
          onClose={() => setShowRefundModal(false)}
          registrationId={registrationId}
          registrationType={registrationType}
          currentBalance={data.paymentBalance?.amountRemaining || 0}
          amountPaid={data.paymentBalance?.amountPaid || 0}
          onRefundProcessed={handleRefundProcessed}
        />
      )}
    </>
  )
}
