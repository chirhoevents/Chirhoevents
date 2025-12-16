'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, DollarSign } from 'lucide-react'

interface RecordCheckPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  registrationId: string
  registrationType: 'individual' | 'group'
  balanceRemaining: number
  totalAmountDue: number
  onSuccess: () => void
}

export default function RecordCheckPaymentModal({
  isOpen,
  onClose,
  registrationId,
  registrationType,
  balanceRemaining,
  totalAmountDue,
  onSuccess,
}: RecordCheckPaymentModalProps) {
  const [processing, setProcessing] = useState(false)
  const [formData, setFormData] = useState({
    amount: '',
    checkNumber: '',
    dateReceived: new Date().toISOString().split('T')[0],
    paymentType: 'partial',
    paymentStatus: 'received',
    payerName: '',
    depositAccount: '',
    depositDate: '',
    depositSlipNumber: '',
    adminNotes: '',
    sendEmail: true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const amount = parseFloat(formData.amount)

    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount greater than 0')
      return
    }

    if (amount > balanceRemaining) {
      const confirmOverpay = confirm(
        `The amount ($${amount.toFixed(2)}) exceeds the balance remaining ($${balanceRemaining.toFixed(2)}). This will result in an overpayment. Continue?`
      )
      if (!confirmOverpay) return
    }

    setProcessing(true)

    try {
      const res = await fetch(`/api/admin/payments/check/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationId,
          registrationType,
          amount,
          checkNumber: formData.checkNumber || null,
          dateReceived: formData.paymentStatus === 'received' ? formData.dateReceived : null,
          paymentType: formData.paymentType,
          paymentStatus: formData.paymentStatus,
          payerName: formData.payerName || null,
          depositAccount: formData.depositAccount || null,
          depositDate: formData.depositDate || null,
          depositSlipNumber: formData.depositSlipNumber || null,
          adminNotes: formData.adminNotes || null,
          sendEmail: formData.sendEmail,
        }),
      })

      if (res.ok) {
        onSuccess()
        onClose()
        // Reset form
        setFormData({
          amount: '',
          checkNumber: '',
          dateReceived: new Date().toISOString().split('T')[0],
          paymentType: 'partial',
          paymentStatus: 'received',
          payerName: '',
          depositAccount: '',
          depositDate: '',
          depositSlipNumber: '',
          adminNotes: '',
          sendEmail: true,
        })
      } else {
        const error = await res.json()
        alert(`Error: ${error.error || 'Failed to record check payment'}`)
      }
    } catch (error) {
      console.error('Error recording check payment:', error)
      alert('Failed to record check payment')
    } finally {
      setProcessing(false)
    }
  }

  // Calculate suggested amounts
  const suggestedAmounts = {
    full: balanceRemaining,
    half: balanceRemaining / 2,
    quarter: balanceRemaining / 4,
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#1E3A5F]">
            <DollarSign className="h-5 w-5" />
            Record Check Payment
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Balance Information */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total Amount Due:</span>
                <span className="ml-2 font-semibold">${totalAmountDue.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-600">Balance Remaining:</span>
                <span className="ml-2 font-semibold text-[#1E3A5F]">${balanceRemaining.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Details Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-[#1E3A5F]">Payment Details</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Payment Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
                <div className="mt-2 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setFormData({ ...formData, amount: suggestedAmounts.full.toFixed(2) })}
                  >
                    Full (${suggestedAmounts.full.toFixed(2)})
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setFormData({ ...formData, amount: suggestedAmounts.half.toFixed(2) })}
                  >
                    Half (${suggestedAmounts.half.toFixed(2)})
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="paymentType">Payment Type</Label>
                <select
                  id="paymentType"
                  value={formData.paymentType}
                  onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                >
                  <option value="full">Full Balance</option>
                  <option value="partial">Partial Payment</option>
                  <option value="deposit">Deposit Payment</option>
                  <option value="final">Final Payment</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="checkNumber">Check Number</Label>
                <Input
                  id="checkNumber"
                  value={formData.checkNumber}
                  onChange={(e) => setFormData({ ...formData, checkNumber: e.target.value })}
                  placeholder="Enter check number"
                />
              </div>

              <div>
                <Label htmlFor="payerName">Payer Name (Optional)</Label>
                <Input
                  id="payerName"
                  value={formData.payerName}
                  onChange={(e) => setFormData({ ...formData, payerName: e.target.value })}
                  placeholder="Name on check"
                />
              </div>
            </div>
          </div>

          {/* Payment Status Section */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-[#1E3A5F]">Payment Status</h3>

            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="paymentStatus"
                  value="received"
                  checked={formData.paymentStatus === 'received'}
                  onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium">Received</div>
                  <div className="text-sm text-gray-600">Check has been received and will be processed immediately</div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="paymentStatus"
                  value="pending"
                  checked={formData.paymentStatus === 'pending'}
                  onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium">Expected/Pending</div>
                  <div className="text-sm text-gray-600">Check is expected but not yet received</div>
                </div>
              </label>
            </div>
          </div>

          {/* Bank Deposit Information - Only show if received */}
          {formData.paymentStatus === 'received' && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold text-[#1E3A5F]">Bank Deposit Information (Optional)</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dateReceived">Date Received</Label>
                  <Input
                    id="dateReceived"
                    type="date"
                    value={formData.dateReceived}
                    onChange={(e) => setFormData({ ...formData, dateReceived: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="depositAccount">Deposited to Account</Label>
                  <Input
                    id="depositAccount"
                    value={formData.depositAccount}
                    onChange={(e) => setFormData({ ...formData, depositAccount: e.target.value })}
                    placeholder="e.g., Operating Account"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="depositDate">Deposit Date</Label>
                  <Input
                    id="depositDate"
                    type="date"
                    value={formData.depositDate}
                    onChange={(e) => setFormData({ ...formData, depositDate: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="depositSlipNumber">Deposit Slip Number</Label>
                  <Input
                    id="depositSlipNumber"
                    value={formData.depositSlipNumber}
                    onChange={(e) => setFormData({ ...formData, depositSlipNumber: e.target.value })}
                    placeholder="Enter deposit slip number"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Admin Notes Section */}
          <div className="space-y-2 border-t pt-4">
            <Label htmlFor="adminNotes">Admin Notes</Label>
            <Textarea
              id="adminNotes"
              value={formData.adminNotes}
              onChange={(e) => setFormData({ ...formData, adminNotes: e.target.value })}
              placeholder="Add any notes about this check payment"
              rows={3}
            />
          </div>

          {/* Email Notification */}
          <div className="flex items-center space-x-2 border-t pt-4">
            <Checkbox
              id="sendEmail"
              checked={formData.sendEmail}
              onCheckedChange={(checked) => setFormData({ ...formData, sendEmail: checked as boolean })}
            />
            <Label htmlFor="sendEmail" className="cursor-pointer">
              Send payment {formData.paymentStatus === 'received' ? 'confirmation' : 'notification'} email to registrant
            </Label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={processing}
              className="bg-[#1E3A5F] hover:bg-[#2A4A6F]"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Record Payment
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
