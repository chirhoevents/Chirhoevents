'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Loader2, DollarSign, AlertCircle } from 'lucide-react'

interface RefundModalProps {
  isOpen: boolean
  onClose: () => void
  registrationId: string
  registrationType: 'group' | 'individual'
  currentBalance: number
  amountPaid: number
  onRefundProcessed?: () => void
}

export default function RefundModal({
  isOpen,
  onClose,
  registrationId,
  registrationType,
  currentBalance,
  amountPaid,
  onRefundProcessed,
}: RefundModalProps) {
  const [isProcessing, setProcessing] = useState(false)
  const [formData, setFormData] = useState({
    refundAmount: '',
    refundMethod: 'stripe' as 'stripe' | 'manual',
    refundReason: 'participant_removed' as
      | 'participant_removed'
      | 'group_cancellation'
      | 'event_cancellation'
      | 'overpayment_correction'
      | 'emergency_illness'
      | 'other',
    notes: '',
  })

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)

    try {
      const refundAmount = parseFloat(formData.refundAmount)

      // Validation
      if (!refundAmount || refundAmount <= 0) {
        alert('Please enter a valid refund amount')
        setProcessing(false)
        return
      }

      if (refundAmount > amountPaid) {
        alert(`Refund amount cannot exceed amount paid ($${amountPaid.toFixed(2)})`)
        setProcessing(false)
        return
      }

      const response = await fetch('/api/admin/refunds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registrationId,
          registrationType,
          refundAmount,
          refundMethod: formData.refundMethod,
          refundReason: formData.refundReason,
          notes: formData.notes,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to process refund')
      }

      onRefundProcessed?.()
      onClose()

      // Reset form
      setFormData({
        refundAmount: '',
        refundMethod: 'stripe',
        refundReason: 'participant_removed',
        notes: '',
      })
    } catch (error) {
      console.error('Error processing refund:', error)
      alert(error instanceof Error ? error.message : 'Failed to process refund')
    } finally {
      setProcessing(false)
    }
  }

  const refundAmount = parseFloat(formData.refundAmount) || 0
  const newBalance = currentBalance + refundAmount

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#1E3A5F]">
            Process Refund
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleProcessRefund} className="space-y-4">
          {/* Current Balance Info */}
          <Card className="p-4 bg-gray-50">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Amount Paid:</span>
                <span className="font-medium">${amountPaid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Current Balance:</span>
                <span className="font-medium">${currentBalance.toFixed(2)}</span>
              </div>
            </div>
          </Card>

          {/* Refund Amount */}
          <div>
            <Label htmlFor="refundAmount">
              Refund Amount <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                id="refundAmount"
                type="number"
                step="0.01"
                min="0.01"
                max={amountPaid}
                value={formData.refundAmount}
                onChange={(e) =>
                  setFormData({ ...formData, refundAmount: e.target.value })
                }
                className="pl-10"
                placeholder="0.00"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Maximum refund: ${amountPaid.toFixed(2)}
            </p>
          </div>

          {/* Refund Method */}
          <div>
            <Label htmlFor="refundMethod">
              Refund Method <span className="text-red-500">*</span>
            </Label>
            <select
              id="refundMethod"
              value={formData.refundMethod}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  refundMethod: e.target.value as 'stripe' | 'manual',
                })
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            >
              <option value="stripe">Stripe (Automatic)</option>
              <option value="manual">Manual (Check/Cash)</option>
            </select>
            {formData.refundMethod === 'stripe' && (
              <p className="text-xs text-gray-500 mt-1">
                Refund will be processed automatically to the original payment method
              </p>
            )}
            {formData.refundMethod === 'manual' && (
              <p className="text-xs text-gray-500 mt-1">
                You will need to process this refund manually
              </p>
            )}
          </div>

          {/* Refund Reason */}
          <div>
            <Label htmlFor="refundReason">
              Reason <span className="text-red-500">*</span>
            </Label>
            <select
              id="refundReason"
              value={formData.refundReason}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  refundReason: e.target.value as typeof formData.refundReason,
                })
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            >
              <option value="participant_removed">Participant Removed</option>
              <option value="group_cancellation">Group Cancellation</option>
              <option value="event_cancellation">Event Cancellation</option>
              <option value="overpayment_correction">Overpayment Correction</option>
              <option value="emergency_illness">Emergency/Illness</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any additional details about this refund..."
              rows={3}
            />
          </div>

          {/* New Balance Preview */}
          {refundAmount > 0 && (
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-sm text-blue-900">
                    New Balance After Refund
                  </div>
                  <div className="text-xs text-blue-700 mt-1">
                    The registration balance will be updated from $
                    {currentBalance.toFixed(2)} to ${newBalance.toFixed(2)}
                  </div>
                  <div className="font-bold text-lg text-blue-900 mt-2">
                    ${newBalance.toFixed(2)}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Process Refund
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
