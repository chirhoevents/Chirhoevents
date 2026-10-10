'use client'

import { useEffect, useState } from 'react'
import { useLuxApi } from '@/contexts/LuxContext'
import { toast } from '@/lib/toast'
import { formatMoney } from '@/lib/lux/format'
import { Button, ErrorNote, Field, Modal, Select, TextArea, TextInput } from '@/components/lux/ui'

/**
 * Record cash, a check or a card swiped at the office. `endpoint` is the
 * registration's or order's payments API; the family gets a Lux receipt.
 */
export default function RecordPaymentModal({ open, title, endpoint, owed, onClose, onDone }: {
  open: boolean
  title: string
  endpoint: string
  owed: number
  onClose: () => void
  onDone: () => void
}) {
  const api = useLuxApi()
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('cash')
  const [checkNumber, setCheckNumber] = useState('')
  const [note, setNote] = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setAmount(owed > 0 ? owed.toFixed(2) : '')
      setMethod('cash'); setCheckNumber(''); setNote(''); setError(null); setSendEmail(true)
    }
  }, [open, owed])

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      await api(endpoint, { method: 'POST', json: { amount: Number(amount), method, checkNumber, note, sendEmail } })
      toast.success('Payment recorded')
      onClose()
      onDone()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save} loading={saving}>Record payment</Button></>}>
      <div className="space-y-4">
        <ErrorNote message={error} />
        {owed > 0 && <p className="text-sm text-gray-600">{formatMoney(owed)} is still owed.</p>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount"><TextInput type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></Field>
          <Field label="Paid by">
            <Select value={method} onChange={e => setMethod(e.target.value)}>
              <option value="cash">Cash</option>
              <option value="check">Check</option>
              <option value="card">Card at the office</option>
              <option value="other">Other</option>
            </Select>
          </Field>
        </div>
        {method === 'check' && <Field label="Check number"><TextInput value={checkNumber} onChange={e => setCheckNumber(e.target.value)} /></Field>}
        <Field label="Note" hint="Optional, only staff see this"><TextArea rows={2} value={note} onChange={e => setNote(e.target.value)} /></Field>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} className="rounded border-gray-300" />
          Email a receipt
        </label>
      </div>
    </Modal>
  )
}
