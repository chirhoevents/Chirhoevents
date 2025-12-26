'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, CheckCircle } from 'lucide-react'

interface Payment {
  id: string
  amount: number
  checkNumber?: string | null
}

interface MarkCheckReceivedModalProps {
  isOpen: boolean
  onClose: () => void
  payment: Payment | null
  onSuccess: () => void
}

export default function MarkCheckReceivedModal({
  isOpen,
  onClose,
  payment,
  onSuccess,
}: MarkCheckReceivedModalProps) {
  const [processing, setProcessing] = useState(false)
  const [formData, setFormData] = useState({
    checkNumber: '',
    actualAmount: '',
    dateReceived: new Date().toISOString().split('T')[0],
    depositAccount: '',
    depositDate: '',
    depositSlipNumber: '',
    adminNotes: '',
    sendEmail: true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!payment) return

    setProcessing(true)

    try {
      const res = await fetch(`/api/admin/payments/${payment.id}/mark-check-received`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkNumber: formData.checkNumber || payment.checkNumber,
          actualAmount: parseFloat(formData.actualAmount) || payment.amount,
          dateReceived: formData.dateReceived,
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
          checkNumber: '',
          actualAmount: '',
          dateReceived: new Date().toISOString().split('T')[0],
          depositAccount: '',
          depositDate: '',
          depositSlipNumber: '',
          adminNotes: '',
          sendEmail: true,
        })
      } else {
        const error = await res.json()
        alert(`Error: ${error.error || 'Failed to mark check as received'}`)
      }
    } catch (error) {
      console.error('Error marking check as received:', error)
      alert('Failed to mark check as received')
    } finally {
      setProcessing(false)
    }
  }

  // Initialize form when payment changes
  useState(() => {
    if (payment) {
      setFormData(prev => ({
        ...prev,
        checkNumber: payment.checkNumber || '',
        actualAmount: payment.amount.toString(),
      }))
    }
  })

  if (!payment) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#1E3A5F]">
            <CheckCircle className="h-5 w-5" />
            Mark Check Payment as Received
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Check Details Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-[#1E3A5F]">Check Details</h3>

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
                <Label htmlFor="dateReceived">Date Received</Label>
                <Input
                  id="dateReceived"
                  type="date"
                  value={formData.dateReceived}
                  onChange={(e) => setFormData({ ...formData, dateReceived: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expectedAmount">Expected Amount</Label>
                <Input
                  id="expectedAmount"
                  value={`$${payment.amount.toFixed(2)}`}
                  disabled
                  className="bg-gray-50"
                />
              </div>

              <div>
                <Label htmlFor="actualAmount">Actual Amount Received *</Label>
                <Input
                  id="actualAmount"
                  type="number"
                  step="0.01"
                  value={formData.actualAmount}
                  onChange={(e) => setFormData({ ...formData, actualAmount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
          </div>

          {/* Bank Deposit Information Section */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-[#1E3A5F]">Bank Deposit Information (Optional)</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="depositAccount">Deposited to Account</Label>
                <Input
                  id="depositAccount"
                  value={formData.depositAccount}
                  onChange={(e) => setFormData({ ...formData, depositAccount: e.target.value })}
                  placeholder="e.g., Operating Account"
                />
              </div>

              <div>
                <Label htmlFor="depositDate">Deposit Date</Label>
                <Input
                  id="depositDate"
                  type="date"
                  value={formData.depositDate}
                  onChange={(e) => setFormData({ ...formData, depositDate: e.target.value })}
                />
              </div>
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

          {/* Admin Notes Section */}
          <div className="space-y-2 border-t pt-4">
            <Label htmlFor="adminNotes">Admin Notes</Label>
            <Textarea
              id="adminNotes"
              value={formData.adminNotes}
              onChange={(e) => setFormData({ ...formData, adminNotes: e.target.value })}
              placeholder="Add any notes about this check payment (e.g., 'Check received and deposited 5/1/26')"
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
              Send payment confirmation email to group leader
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
              className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Received
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
