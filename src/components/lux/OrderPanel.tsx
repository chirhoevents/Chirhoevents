'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { HandHeart, Receipt, Banknote, SlidersHorizontal } from 'lucide-react'
import { useLux, useLuxApi } from '@/contexts/LuxContext'
import { toast } from '@/lib/toast'
import { formatDateTime, formatMoney } from '@/lib/lux/format'
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '@/lib/lux/program-status'
import type { StaffOrder } from '@/lib/lux/orders-staff'
import { Badge, Button, ErrorNote, Field, Modal, Spinner, TextArea, TextInput } from '@/components/lux/ui'
import RecordPaymentModal from '@/components/lux/RecordPaymentModal'

type Order = Omit<StaffOrder, 'createdAt' | 'feeAssistance' | 'payments'> & {
  createdAt: string
  feeAssistance: Omit<StaffOrder['feeAssistance'], 'resolvedAt'> & { resolvedAt: string | null }
  payments: Array<Omit<StaffOrder['payments'][number], 'at'> & { at: string }>
}

export const ORDER_TONE: Record<string, 'gray' | 'green' | 'amber' | 'red' | 'blue'> = {
  paid: 'green', waived: 'green', office_pending: 'amber', pending_payment: 'amber', assistance_requested: 'blue', cancelled: 'gray',
}

/**
 * Everything about one faith formation registration (order): children and
 * fees, payments, recording an office payment, and deciding fee assistance.
 * Fee assistance stays between the family and the staff who open this.
 */
export default function OrderPanel({ orderId, onClose, onChanged }: {
  orderId: string | null
  onClose: () => void
  onChanged?: () => void
}) {
  const api = useLuxApi()
  const { info } = useLux()
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const [deciding, setDeciding] = useState<null | 'assistance' | 'adjust'>(null)

  const load = useCallback(async () => {
    if (!orderId) return
    try {
      const data = await api<{ order: Order }>(`/api/lux/orders/${orderId}`)
      setOrder(data.order)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [api, orderId])

  useEffect(() => {
    setOrder(null)
    setError(null)
    setDeciding(null)
    load()
  }, [load])

  const changed = () => { load(); onChanged?.() }
  if (!orderId) return null

  const assistancePending = order?.feeAssistance.status === 'requested'
  const live = order?.registrations.filter(r => r.status !== 'cancelled') ?? []

  return (
    <>
      <Modal open={!paying} onClose={onClose} wide title={order ? `Registration #${order.confirmationCode}` : 'Registration'}>
        {error ? <ErrorNote message={error} /> : !order ? <Spinner /> : (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link href={`/dashboard/lux/households/${order.household.id}`} className="font-medium text-[#1E3A5F] hover:underline">
                  {order.household.guardian1FirstName} {order.household.guardian1LastName}
                </Link>
                <p className="text-gray-500">{order.household.email} · {order.household.phone}</p>
                <p className="text-gray-500">Registered {formatDateTime(order.createdAt)}</p>
              </div>
              <Badge tone={ORDER_TONE[order.status]}>{ORDER_STATUS_LABELS[order.status] ?? order.status}</Badge>
            </div>

            {assistancePending && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="font-medium text-blue-900 flex items-center gap-2"><HandHeart className="h-4 w-4" /> The family asked for fee assistance</p>
                {order.feeAssistance.note
                  ? <p className="mt-1 text-blue-900 whitespace-pre-line">“{order.feeAssistance.note}”</p>
                  : <p className="mt-1 text-blue-800">They didn’t add a note.</p>}
                {info.canManage && <Button className="mt-3" onClick={() => setDeciding('assistance')}>Decide</Button>}
              </div>
            )}
            {!assistancePending && order.feeAssistance.requested && (
              <p className="rounded-lg bg-[#FAF8F3] p-3 text-gray-700">
                Fee assistance {order.feeAssistance.status === 'denied' ? 'declined' : 'approved'}
                {order.feeAssistance.resolvedBy ? ` by ${order.feeAssistance.resolvedBy}` : ''}
                {order.feeAssistance.resolvedAt ? ` on ${formatDateTime(order.feeAssistance.resolvedAt)}` : ''}.
                {order.feeAssistance.staffNote && <span className="block text-gray-500 mt-1">Note to family: {order.feeAssistance.staffNote}</span>}
              </p>
            )}

            <div className="rounded-lg border border-[#E8E2D4] divide-y divide-[#F0EBDF]">
              {order.registrations.map(r => (
                <div key={r.id} className="flex justify-between gap-3 px-4 py-2">
                  <span className={r.status === 'cancelled' ? 'line-through text-gray-400' : ''}>
                    <strong>{r.childName}</strong> · {r.programName}
                    {r.status === 'pending_payment' && <span className="text-amber-700"> · waiting on payment</span>}
                  </span>
                  <span className={r.status === 'cancelled' ? 'line-through text-gray-400' : ''}>{formatMoney(r.feeAmount)}</span>
                </div>
              ))}
              <div className="px-4 py-2 space-y-1 bg-[#FAF8F3]">
                {order.siblingDiscount > 0 && <p className="flex justify-between text-gray-600"><span>Sibling discount (included above)</span><span>−{formatMoney(order.siblingDiscount)}</span></p>}
                {order.familyCapAdjustment > 0 && <p className="flex justify-between text-gray-600"><span>Family maximum (included above)</span><span>−{formatMoney(order.familyCapAdjustment)}</span></p>}
                <p className="flex justify-between font-medium"><span>Total</span><span>{formatMoney(order.total)}</span></p>
                {order.amountDue !== order.total && <p className="flex justify-between text-[#1E3A5F]"><span>Amount due after adjustment</span><span>{formatMoney(order.amountDue)}</span></p>}
                <p className="flex justify-between text-gray-600"><span>Paid</span><span>{formatMoney(order.amountPaid)}</span></p>
                <p className={`flex justify-between font-semibold ${order.owed > 0 ? 'text-amber-700' : 'text-green-700'}`}><span>Still owed</span><span>{formatMoney(order.owed)}</span></p>
              </div>
            </div>

            <div>
              <p className="font-medium text-gray-800 mb-2 flex items-center gap-2"><Receipt className="h-4 w-4 text-[#C8A24A]" /> Payments</p>
              {order.payments.length === 0 ? <p className="text-gray-500">No payments yet.</p> : (
                <div className="space-y-1">
                  {order.payments.map(p => (
                    <div key={p.id} className="flex justify-between gap-3">
                      <span>
                        {formatDateTime(p.at)} · {PAYMENT_METHOD_LABELS[p.method] ?? p.method}
                        {p.checkNumber ? ` #${p.checkNumber}` : ''}
                        {p.status === 'pending' && <span className="text-amber-700"> · checkout open</span>}
                        {p.by && <span className="text-gray-500"> · {p.by}</span>}
                        {p.notes && <span className="block text-xs text-gray-500">{p.notes}</span>}
                      </span>
                      <span className="flex items-center gap-2">
                        {formatMoney(p.amount)}
                        {p.receiptUrl && <a href={p.receiptUrl} target="_blank" rel="noreferrer" className="text-xs underline text-gray-500">receipt</a>}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {info.canManage && order.status !== 'cancelled' && (
              <div className="flex flex-wrap gap-2 border-t border-[#F0EBDF] pt-4">
                {order.owed > 0 && <Button onClick={() => setPaying(true)}><Banknote className="h-4 w-4" /> Record a payment</Button>}
                {!assistancePending && live.length > 0 && (
                  <Button variant="secondary" onClick={() => setDeciding('adjust')}><SlidersHorizontal className="h-4 w-4" /> Adjust amount due</Button>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {order && (
        <RecordPaymentModal
          open={paying}
          title={`Record payment – ${order.household.guardian1FirstName} ${order.household.guardian1LastName}`}
          endpoint={`/api/lux/orders/${order.id}/payments`}
          owed={order.owed}
          onClose={() => setPaying(false)}
          onDone={changed}
        />
      )}
      {order && deciding && (
        <FeeDecisionModal order={order} mode={deciding} onClose={() => setDeciding(null)} onDone={changed} />
      )}
    </>
  )
}

function FeeDecisionModal({ order, mode, onClose, onDone }: {
  order: Order
  mode: 'assistance' | 'adjust'
  onClose: () => void
  onDone: () => void
}) {
  const api = useLuxApi()
  const [decision, setDecision] = useState<'approved' | 'waived' | 'denied'>('approved')
  const [amount, setAmount] = useState(String(Math.max(order.amountPaid, Math.round(order.total / 2))))
  const [note, setNote] = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      await api(`/api/lux/orders/${order.id}/fee-assistance`, {
        method: 'POST',
        json: { decision, amountDue: decision === 'approved' ? Number(amount) : undefined, note, sendEmail },
      })
      toast.success(decision === 'waived' ? 'Fees waived' : decision === 'denied' ? 'Saved' : 'Amount due updated')
      onClose()
      onDone()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const options: Array<{ value: typeof decision; label: string; hint: string }> = [
    { value: 'approved', label: mode === 'assistance' ? 'Reduce the fee' : 'Change the amount due', hint: 'Set what the family will pay.' },
    { value: 'waived', label: 'Waive the rest', hint: order.amountPaid > 0 ? `Nothing more is owed (they’ve paid ${formatMoney(order.amountPaid)}).` : 'Nothing is owed.' },
    ...(mode === 'assistance' ? [{ value: 'denied' as const, label: 'Keep the full fee', hint: `${formatMoney(order.total)} stays due.` }] : []),
  ]

  return (
    <Modal open onClose={onClose} title={mode === 'assistance' ? 'Fee assistance' : 'Adjust amount due'}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save} loading={saving}>Save</Button></>}>
      <div className="space-y-4 text-sm">
        <ErrorNote message={error} />
        <p className="text-gray-600">Total for this registration: <strong>{formatMoney(order.total)}</strong>.</p>
        <div className="space-y-2">
          {options.map(o => (
            <label key={o.value} className={`flex gap-3 rounded-lg border p-3 cursor-pointer ${decision === o.value ? 'border-[#C8A24A] bg-[#FDFBF5]' : 'border-[#E8E2D4]'}`}>
              <input type="radio" name="decision" checked={decision === o.value} onChange={() => setDecision(o.value)} className="mt-0.5" />
              <span><span className="font-medium text-gray-900">{o.label}</span><span className="block text-gray-500">{o.hint}</span></span>
            </label>
          ))}
        </div>
        {decision === 'approved' && (
          <Field label="New amount due">
            <TextInput type="number" min={order.amountPaid} max={order.total} step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="sm:w-48" />
          </Field>
        )}
        {mode === 'assistance' && (
          <>
            <Field label="Note to the family" hint="Optional. Included in the email.">
              <TextArea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="We’re glad to help. God bless your family!" />
            </Field>
            <label className="flex items-center gap-2 text-gray-700">
              <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} className="rounded border-gray-300" />
              Email the family
            </label>
          </>
        )}
      </div>
    </Modal>
  )
}
