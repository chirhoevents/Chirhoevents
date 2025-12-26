'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, DollarSign } from 'lucide-react'

interface RecordAdditionalPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  registrationId: string
  registrationType: 'individual' | 'group'
  registrationName: string
  balanceRemaining: number
  onSuccess: () => void
}

export default function RecordAdditionalPaymentModal({
  isOpen,
  onClose,
  registrationId,
  registrationType,
  registrationName,
  balanceRemaining,
  onSuccess,
}: RecordAdditionalPaymentModalProps) {
  const [saving, setSaving] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'check' | 'card' | 'cash' | 'bank_transfer' | 'other'>('check')
  const [formData, setFormData] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],

    // Check fields
    checkNumber: '',
    checkDate: '',

    // Card fields
    cardLast4: '',
    cardholderName: '',
    authorizationCode: '',

    // Other fields
    paymentMethodDetails: '',
    transactionReference: '',

    // Common fields
    notes: '',
    sendEmail: true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Prevent double submission
    if (saving) return

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Please enter a valid payment amount')
      return
    }

    setSaving(true)

    try {
      const res = await fetch('/api/admin/payments/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationId,
          registrationType,
          amount: parseFloat(formData.amount),
          paymentMethod,
          paymentDate: formData.paymentDate,

          // Check fields
          checkNumber: paymentMethod === 'check' ? formData.checkNumber : null,
          checkDate: paymentMethod === 'check' ? formData.checkDate : null,

          // Card fields
          cardLast4: paymentMethod === 'card' ? formData.cardLast4 : null,
          cardholderName: paymentMethod === 'card' ? formData.cardholderName : null,
          authorizationCode: paymentMethod === 'card' ? formData.authorizationCode : null,

          // Other fields
          paymentMethodDetails: paymentMethod === 'other' ? formData.paymentMethodDetails : null,
          transactionReference: paymentMethod === 'other' ? formData.transactionReference : null,

          notes: formData.notes,
          sendEmail: formData.sendEmail,
        }),
      })

      if (res.ok) {
        onSuccess()
        onClose()
        // Reset form
        setFormData({
          amount: '',
          paymentDate: new Date().toISOString().split('T')[0],
          checkNumber: '',
          checkDate: '',
          cardLast4: '',
          cardholderName: '',
          authorizationCode: '',
          paymentMethodDetails: '',
          transactionReference: '',
          notes: '',
          sendEmail: true,
        })
      } else {
        const error = await res.json()
        alert(`Error: ${error.error || 'Failed to record payment'}`)
      }
    } catch (error) {
      console.error('Error recording payment:', error)
      alert('Failed to record payment')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const setQuickAmount = (amount: number) => {
    setFormData((prev) => ({ ...prev, amount: amount.toFixed(2) }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#1E3A5F]">
            <DollarSign className="h-5 w-5" />
            Record Additional Payment
          </DialogTitle>
          <div className="text-sm text-gray-600 mt-2">
            <p><span className="font-semibold">Registration:</span> {registrationName}</p>
            <p><span className="font-semibold">Current Balance:</span> ${balanceRemaining.toFixed(2)}</p>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Payment Method Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold text-[#1E3A5F]">Payment Method</Label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition ${paymentMethod === 'check' ? 'border-[#1E3A5F] bg-blue-50' : 'border-gray-300'}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="check"
                  checked={paymentMethod === 'check'}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="text-[#1E3A5F]"
                />
                <span className="font-medium">Check</span>
              </label>

              <label className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition ${paymentMethod === 'card' ? 'border-[#1E3A5F] bg-blue-50' : 'border-gray-300'}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="card"
                  checked={paymentMethod === 'card'}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="text-[#1E3A5F]"
                />
                <span className="font-medium">Credit Card (phone/manual)</span>
              </label>

              <label className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition ${paymentMethod === 'cash' ? 'border-[#1E3A5F] bg-blue-50' : 'border-gray-300'}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cash"
                  checked={paymentMethod === 'cash'}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="text-[#1E3A5F]"
                />
                <span className="font-medium">Cash</span>
              </label>

              <label className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition ${paymentMethod === 'bank_transfer' ? 'border-[#1E3A5F] bg-blue-50' : 'border-gray-300'}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="bank_transfer"
                  checked={paymentMethod === 'bank_transfer'}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="text-[#1E3A5F]"
                />
                <span className="font-medium">Wire Transfer</span>
              </label>

              <label className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition col-span-2 ${paymentMethod === 'other' ? 'border-[#1E3A5F] bg-blue-50' : 'border-gray-300'}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="other"
                  checked={paymentMethod === 'other'}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="text-[#1E3A5F]"
                />
                <span className="font-medium">Other (Venmo, Zelle, etc.)</span>
              </label>
            </div>
          </div>

          <div className="border-t pt-4 space-y-4">
            <h3 className="font-semibold text-[#1E3A5F]">Payment Details</h3>

            {/* Payment Amount */}
            <div>
              <Label htmlFor="amount">Payment Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                placeholder="0.00"
                required
              />
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setQuickAmount(balanceRemaining)}
                  disabled={balanceRemaining <= 0}
                >
                  Pay Full Balance (${balanceRemaining.toFixed(2)})
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setQuickAmount(balanceRemaining / 2)}
                  disabled={balanceRemaining <= 0}
                >
                  Pay Half (${(balanceRemaining / 2).toFixed(2)})
                </Button>
              </div>
            </div>

            {/* Date Received */}
            <div>
              <Label htmlFor="paymentDate">Date Received *</Label>
              <Input
                id="paymentDate"
                type="date"
                value={formData.paymentDate}
                onChange={(e) => handleInputChange('paymentDate', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Check-specific fields */}
          {paymentMethod === 'check' && (
            <div className="border-t pt-4 space-y-4">
              <h3 className="font-semibold text-[#1E3A5F]">Check Details</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="checkNumber">Check Number</Label>
                  <Input
                    id="checkNumber"
                    value={formData.checkNumber}
                    onChange={(e) => handleInputChange('checkNumber', e.target.value)}
                    placeholder="1234"
                  />
                </div>

                <div>
                  <Label htmlFor="checkDate">Check Date (date on check)</Label>
                  <Input
                    id="checkDate"
                    type="date"
                    value={formData.checkDate}
                    onChange={(e) => handleInputChange('checkDate', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Card-specific fields */}
          {paymentMethod === 'card' && (
            <div className="border-t pt-4 space-y-4">
              <h3 className="font-semibold text-[#1E3A5F]">Card Details</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cardLast4">Last 4 Digits of Card</Label>
                  <Input
                    id="cardLast4"
                    value={formData.cardLast4}
                    onChange={(e) => handleInputChange('cardLast4', e.target.value.slice(0, 4))}
                    placeholder="4242"
                    maxLength={4}
                  />
                </div>

                <div>
                  <Label htmlFor="cardholderName">Cardholder Name</Label>
                  <Input
                    id="cardholderName"
                    value={formData.cardholderName}
                    onChange={(e) => handleInputChange('cardholderName', e.target.value)}
                    placeholder="John Smith"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="authorizationCode">Authorization Code (if applicable)</Label>
                <Input
                  id="authorizationCode"
                  value={formData.authorizationCode}
                  onChange={(e) => handleInputChange('authorizationCode', e.target.value)}
                  placeholder="ABC123"
                />
              </div>
            </div>
          )}

          {/* Other payment method fields */}
          {paymentMethod === 'other' && (
            <div className="border-t pt-4 space-y-4">
              <h3 className="font-semibold text-[#1E3A5F]">Payment Method Details</h3>

              <div>
                <Label htmlFor="paymentMethodDetails">Payment Method Details *</Label>
                <Input
                  id="paymentMethodDetails"
                  value={formData.paymentMethodDetails}
                  onChange={(e) => handleInputChange('paymentMethodDetails', e.target.value)}
                  placeholder="Specify: Venmo, Zelle, PayPal, etc."
                  required={paymentMethod === 'other'}
                />
              </div>

              <div>
                <Label htmlFor="transactionReference">Transaction ID/Reference</Label>
                <Input
                  id="transactionReference"
                  value={formData.transactionReference}
                  onChange={(e) => handleInputChange('transactionReference', e.target.value)}
                  placeholder="TXN12345"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="border-t pt-4 space-y-4">
            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Any additional notes about this payment..."
                rows={3}
              />
            </div>

            {/* Send Email */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sendEmail"
                checked={formData.sendEmail}
                onCheckedChange={(checked) => handleInputChange('sendEmail', checked as boolean)}
              />
              <label
                htmlFor="sendEmail"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Send payment confirmation email to registrant
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white"
            >
              {saving ? (
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
