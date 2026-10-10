'use client'

import { useEffect, useState } from 'react'
import { useLuxApi } from '@/contexts/LuxContext'
import { toast } from '@/lib/toast'
import { formatMoney } from '@/lib/lux/format'
import { Button, ErrorNote, Field, Modal, Select, Spinner, TextArea, TextInput } from '@/components/lux/ui'

type How = 'card' | 'cash' | 'check' | 'other'

/** Staff roles that can give money back */
export const REFUND_ROLES = ['org_admin', 'finance_manager', 'master_admin']

/**
 * Give money back on a faith formation registration or an event
 * registration: to the card they paid with (through Stripe) or by cash or
 * check from the office. The family gets an email in their language.
 */
export default function RefundModal({ open, kind, id, who, onClose, onDone }: {
  open: boolean
  kind: 'order' | 'event'
  id: string | null
  who: string
  onClose: () => void
  onDone: () => void
}) {
  const api = useLuxApi()
  const [limits, setLimits] = useState<{ paid: number; toCard: number } | null>(null)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<How>('card')
  const [checkNumber, setCheckNumber] = useState('')
  const [reason, setReason] = useState('withdrew')
  const [note, setNote] = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !id) return
    setLimits(null); setError(null); setNote(''); setCheckNumber(''); setReason('withdrew'); setSendEmail(true)
    api<{ paid: number; toCard: number }>(`/api/lux/refunds?kind=${kind}&id=${id}`)
      .then(l => {
        setLimits(l)
        setMethod(l.toCard > 0 ? 'card' : 'cash')
        setAmount(String(l.toCard > 0 ? l.toCard : l.paid))
      })
      .catch(e => setError((e as Error).message))
  }, [open, id, kind, api])

  const max = limits ? (method === 'card' ? limits.toCard : limits.paid) : 0
  const value = Number(amount)

  const refund = async () => {
    if (!id) return
    setSaving(true)
    setError(null)
    try {
      await api('/api/lux/refunds', {
        method: 'POST',
        json: { kind, id, amount: value, method, reason, checkNumber, note, sendEmail },
      })
      toast.success(method === 'card' ? `${formatMoney(value)} refunded to their card` : `Refund of ${formatMoney(value)} recorded`)
      onClose()
      onDone()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Refund – ${who}`}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={refund} loading={saving} disabled={!limits || !(value > 0) || value > max + 0.005}>
          {method === 'card' ? 'Refund to card' : 'Record refund'}{value > 0 ? ` ${formatMoney(value)}` : ''}
        </Button>
      </>}>
      {!limits ? (error ? <ErrorNote message={error} /> : <Spinner />) : limits.paid <= 0 ? (
        <p className="text-sm text-gray-600">Nothing has been paid on this registration, so there’s nothing to refund.</p>
      ) : (
        <div className="space-y-4 text-sm">
          <ErrorNote message={error} />
          <p className="text-gray-600">They’ve paid <strong>{formatMoney(limits.paid)}</strong>{limits.toCard > 0 && limits.toCard < limits.paid ? `, ${formatMoney(limits.toCard)} of it by card online` : ''}.</p>
          <Field label="How does the money go back?">
            <Select value={method} onChange={e => {
              const next = e.target.value as How
              setMethod(next)
              if (next === 'card' && value > limits.toCard) setAmount(String(limits.toCard))
            }}>
              {limits.toCard > 0 && <option value="card">Back to their card (up to {formatMoney(limits.toCard)})</option>}
              <option value="cash">Cash from the office</option>
              <option value="check">A check from the parish</option>
              <option value="other">Another way</option>
            </Select>
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Amount" error={value > max + 0.005 ? `Up to ${formatMoney(max)}` : undefined}>
              <TextInput type="number" min="0.01" max={max} step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
            </Field>
            {method === 'check' && (
              <Field label="Check number" hint="Optional"><TextInput value={checkNumber} onChange={e => setCheckNumber(e.target.value)} /></Field>
            )}
          </div>
          <Field label="Why">
            <Select value={reason} onChange={e => setReason(e.target.value)}>
              <option value="withdrew">They withdrew</option>
              <option value="cancelled">The parish cancelled it</option>
              <option value="overpaid">They paid too much</option>
              <option value="other">Something else</option>
            </Select>
          </Field>
          <Field label="Note" hint="Optional. For your records; not sent to the family.">
            <TextArea rows={2} value={note} onChange={e => setNote(e.target.value)} />
          </Field>
          <label className="flex items-center gap-2 text-gray-700">
            <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} className="rounded border-gray-300" />
            Email them that a refund is on the way
          </label>
          <p className="text-xs text-gray-500">
            {method === 'card'
              ? 'It comes out of your parish’s Stripe balance and usually reaches their card in 5–10 business days.'
              : 'Record this once you’ve given them the money.'}
            {' '}What they still owe doesn’t change.
          </p>
        </div>
      )}
    </Modal>
  )
}
