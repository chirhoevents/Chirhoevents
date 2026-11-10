'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, DollarSign } from 'lucide-react'
import { format } from 'date-fns'
import { money, vendorApi, vendorBalance, type VendorRegistration } from './vendor-types'

const METHODS = [
  { value: 'check', label: 'Check' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank transfer / ACH' },
  { value: 'card', label: 'Card (taken in person)' },
  { value: 'other', label: 'Other' },
]

interface Props {
  eventId: string
  vendor: VendorRegistration | null
  /** Pre-fill the full balance ("Mark as paid"). */
  payInFull?: boolean
  onClose: () => void
  onRecorded: () => void
}

export default function RecordVendorPaymentDialog({ eventId, vendor, payInFull, onClose, onRecorded }: Props) {
  const { getToken } = useAuth()
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('check')
  const [checkNumber, setCheckNumber] = useState('')
  const [receivedDate, setReceivedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const balance = vendor ? vendorBalance(vendor) : 0

  useEffect(() => {
    if (vendor) {
      setAmount(payInFull || balance > 0 ? Math.max(balance, 0).toFixed(2) : '')
      setMethod('check')
      setCheckNumber('')
      setReceivedDate(format(new Date(), 'yyyy-MM-dd'))
      setNotes('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendor?.id, payInFull])

  const submit = async () => {
    if (!vendor) return
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) {
      alert('Enter an amount greater than $0.')
      return
    }
    if (value > balance && balance >= 0 && !confirm(`${money(value)} is more than the ${money(balance)} balance. Record it anyway?`)) {
      return
    }
    setSaving(true)
    const res = await vendorApi(getToken, `/api/admin/events/${eventId}/vendors/${vendor.id}/payments`, 'POST', {
      amount: value,
      method,
      checkNumber,
      receivedDate,
      notes,
    })
    setSaving(false)
    if (!res.ok) {
      alert(`Failed to record payment: ${res.error}`)
      return
    }
    onRecorded()
    onClose()
  }

  return (
    <Dialog open={!!vendor} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{payInFull ? 'Mark as Paid' : 'Record Payment'}</DialogTitle>
          <DialogDescription>
            {vendor?.businessName} · Balance due {money(balance)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="vp-amount">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  id="vp-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="vp-date">Date received</Label>
              <Input id="vp-date" type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} />
            </div>
          </div>

          <div>
            <Label htmlFor="vp-method">Payment method</Label>
            <select
              id="vp-method"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
            >
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {method === 'check' && (
            <div>
              <Label htmlFor="vp-check">Check number</Label>
              <Input id="vp-check" value={checkNumber} onChange={(e) => setCheckNumber(e.target.value)} placeholder="e.g. 1042" />
            </div>
          )}

          <div>
            <Label htmlFor="vp-notes">Notes (internal)</Label>
            <Textarea id="vp-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <DollarSign className="h-4 w-4 mr-2" />}
            Record {amount ? money(amount) : 'Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
