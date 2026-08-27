'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Loader2, Pencil, Save, X } from 'lucide-react'
import { format } from 'date-fns'

interface Props {
  eventId: string
  staffId: string
  open: boolean
  onClose: () => void
  onSaved?: () => void
}

interface StaffDetail {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  role: string
  tshirtSize: string
  dietaryRestrictions: string | null
  isVendorStaff: boolean
  vendorCode: string | null
  pricePaid: number
  paymentStatus: string
  porosAccessCode: string | null
  safeEnvironmentCertUrl: string | null
  safeEnvironmentCertUploadedAt: string | null
  checkedIn: boolean
  createdAt: string
  vendorRegistration?: { businessName: string }
  liabilityForm?: { id: string; completed: boolean; completedAt: string | null; pdfUrl: string | null; formStatus: string } | null
  customAnswers: { questionText: string; answerText: string | null }[]
  payments: {
    id: string
    amount: number
    paymentMethod: string
    paymentStatus: string
    cardBrand: string | null
    cardLast4: string | null
    receiptUrl: string | null
    processedAt: string | null
    createdAt: string
  }[]
  refunds: {
    id: string
    refundAmount: number
    refundMethod: string
    refundReason: string
    status: string
    createdAt: string
  }[]
}

export default function StaffDetailsModal({ eventId, staffId, open, onClose, onSaved }: Props) {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [staff, setStaff] = useState<StaffDetail | null>(null)
  const [editing, setEditing] = useState(false)
  const [edits, setEdits] = useState<Partial<StaffDetail>>({})

  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const token = await getToken()
        const res = await fetch(`/api/admin/events/${eventId}/staff/${staffId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!res.ok) throw new Error('Failed to load staff')
        const data = await res.json()
        if (!cancelled) {
          setStaff(data.staff)
          setEdits({})
          setEditing(false)
        }
      } catch (err) {
        console.error(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, eventId, staffId, getToken])

  const save = async () => {
    if (!staff) return
    setSaving(true)
    try {
      const token = await getToken()
      const res = await fetch(`/api/admin/events/${eventId}/staff/${staffId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(edits),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(`Failed to save: ${data.error || res.statusText}`)
        return
      }
      const data = await res.json()
      setStaff({ ...staff, ...data.staff })
      setEditing(false)
      setEdits({})
      onSaved?.()
    } finally {
      setSaving(false)
    }
  }

  const field = (label: string, value: React.ReactNode) => (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-[#1E3A5F] font-medium">{value ?? '—'}</p>
    </div>
  )

  const editable = (label: string, key: keyof StaffDetail, placeholder?: string, textarea = false) => {
    const current = edits[key] !== undefined ? String(edits[key] ?? '') : String(staff?.[key] ?? '')
    if (editing) {
      return (
        <div>
          <Label className="text-xs uppercase tracking-wide text-gray-500">{label}</Label>
          {textarea ? (
            <Textarea
              value={current}
              onChange={(e) => setEdits((p) => ({ ...p, [key]: e.target.value }))}
              placeholder={placeholder}
              rows={2}
            />
          ) : (
            <Input
              value={current}
              onChange={(e) => setEdits((p) => ({ ...p, [key]: e.target.value }))}
              placeholder={placeholder}
            />
          )}
        </div>
      )
    }
    return field(label, current || '—')
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Staff Details</span>
            {!loading && staff && !editing && (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#1E3A5F]" />
          </div>
        ) : !staff ? (
          <p className="text-red-600 text-center py-8">Staff registration not found.</p>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {editable('First Name', 'firstName')}
              {editable('Last Name', 'lastName')}
              {editable('Email', 'email')}
              {editable('Phone', 'phone')}
              {editable('Role', 'role')}
              {editable('T-Shirt Size', 'tshirtSize')}
            </div>

            <div>{editable('Dietary Restrictions', 'dietaryRestrictions', 'None', true)}</div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              {field('Type', staff.isVendorStaff ? (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  Vendor Booth Staff
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  General Staff
                </Badge>
              ))}
              {field('Registered', format(new Date(staff.createdAt), 'MMM d, yyyy'))}
              {staff.isVendorStaff && staff.vendorRegistration && field('Vendor Booth', staff.vendorRegistration.businessName)}
              {staff.isVendorStaff && staff.vendorCode && field('Vendor Code Used', staff.vendorCode)}
              {field('Checked In', staff.checkedIn ? 'Yes' : 'No')}
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm font-semibold text-[#1E3A5F] mb-2">Payment</p>
              <div className="grid grid-cols-2 gap-4">
                {field('Amount Paid', `$${Number(staff.pricePaid || 0).toFixed(2)}`)}
                {field('Status', staff.paymentStatus)}
              </div>
              {staff.payments.length > 0 && (
                <div className="mt-3 space-y-1 text-sm">
                  {staff.payments.map((p) => (
                    <div key={p.id} className="flex justify-between items-center border-b py-1">
                      <span>
                        ${Number(p.amount).toFixed(2)} · {p.paymentMethod}
                        {p.cardBrand && p.cardLast4 ? ` · ${p.cardBrand} ••${p.cardLast4}` : ''}
                        {' · '}
                        <span className="text-gray-500">{p.paymentStatus}</span>
                      </span>
                      {p.receiptUrl && (
                        <a href={p.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-[#1E3A5F] hover:underline text-xs">
                          Receipt
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {staff.refunds.length > 0 && (
                <div className="mt-2 text-sm">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Refunds</p>
                  {staff.refunds.map((r) => (
                    <div key={r.id} className="flex justify-between border-b py-1">
                      <span>
                        -${Number(r.refundAmount).toFixed(2)} · {r.refundMethod} · {r.refundReason}
                      </span>
                      <span className="text-gray-500">{r.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm font-semibold text-[#1E3A5F] mb-2">Liability &amp; Safe Environment</p>
              <div className="grid grid-cols-2 gap-4">
                {field('Poros Access Code', staff.porosAccessCode || 'N/A')}
                {field(
                  'Liability Form',
                  staff.liabilityForm?.completed ? (
                    staff.liabilityForm.pdfUrl ? (
                      <a href={staff.liabilityForm.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-[#1E3A5F] hover:underline">
                        View PDF
                      </a>
                    ) : (
                      'Completed'
                    )
                  ) : (
                    staff.porosAccessCode ? 'Pending' : 'N/A'
                  )
                )}
                {field(
                  'Safe Env Cert',
                  staff.safeEnvironmentCertUrl ? (
                    <a href={staff.safeEnvironmentCertUrl} target="_blank" rel="noopener noreferrer" className="text-green-700 hover:underline">
                      View File
                    </a>
                  ) : (
                    'Not uploaded'
                  )
                )}
                {staff.safeEnvironmentCertUploadedAt && field('Uploaded', format(new Date(staff.safeEnvironmentCertUploadedAt), 'MMM d, yyyy'))}
              </div>
            </div>

            {staff.customAnswers.length > 0 && (
              <div className="pt-4 border-t">
                <p className="text-sm font-semibold text-[#1E3A5F] mb-2">Custom Answers</p>
                <div className="space-y-2 text-sm">
                  {staff.customAnswers.map((a, i) => (
                    <div key={i}>
                      <p className="text-xs text-gray-500">{a.questionText}</p>
                      <p className="text-[#1E3A5F]">{a.answerText || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => { setEditing(false); setEdits({}) }}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={save} disabled={saving} className="bg-[#1E3A5F] hover:bg-[#2d4a6f]">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={onClose}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
