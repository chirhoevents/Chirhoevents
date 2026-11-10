'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Plus } from 'lucide-react'
import { vendorApi, type VendorRegistration, type VendorTierOption } from './vendor-types'

interface Props {
  eventId: string
  open: boolean
  tiers: VendorTierOption[]
  onClose: () => void
  /** Called with the new vendor; `review` = admin wants to approve right away. */
  onCreated: (vendor: VendorRegistration, review: boolean) => void
}

const EMPTY = {
  businessName: '',
  contactFirstName: '',
  contactLastName: '',
  email: '',
  phone: '',
  boothDescription: '',
  additionalNeeds: '',
  tierId: '',
  selectedTier: '',
  tierPrice: '',
}

export default function AddVendorDialog({ eventId, open, tiers, onClose, onCreated }: Props) {
  const { getToken } = useAuth()
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setForm(EMPTY)
  }, [open])

  const set = (key: keyof typeof EMPTY, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const pickTier = (tierId: string) => {
    const tier = tiers.find((t) => t.id === tierId)
    setForm((f) => ({
      ...f,
      tierId,
      selectedTier: tier ? tier.name : '',
      tierPrice: tier ? String(tier.price) : f.tierPrice,
    }))
  }

  const submit = async (review: boolean) => {
    if (!form.businessName.trim() || !form.contactFirstName.trim() || !form.contactLastName.trim() || !form.email.trim()) {
      alert('Business name, contact name and email are required.')
      return
    }
    setSaving(true)
    const res = await vendorApi<{ vendor: VendorRegistration }>(getToken, `/api/admin/events/${eventId}/vendors`, 'POST', {
      ...form,
      selectedTier: form.selectedTier || 'Custom',
      tierPrice: Number(form.tierPrice || 0),
    })
    setSaving(false)
    if (!res.ok) {
      alert(`Failed to add vendor: ${res.error}`)
      return
    }
    onCreated(res.data.vendor, review)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Vendor</DialogTitle>
          <DialogDescription>
            Add a vendor who signed up by phone, email or in person. No email is sent until you approve them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div>
            <Label>Business name *</Label>
            <Input value={form.businessName} onChange={(e) => set('businessName', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Contact first name *</Label>
              <Input value={form.contactFirstName} onChange={(e) => set('contactFirstName', e.target.value)} />
            </div>
            <div>
              <Label>Contact last name *</Label>
              <Input value={form.contactLastName} onChange={(e) => set('contactLastName', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Booth type</Label>
              <select
                value={form.tierId}
                onChange={(e) => pickTier(e.target.value)}
                className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
              >
                <option value="">Custom</option>
                {tiers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (${t.price.toFixed(2)}){t.active ? '' : ' – inactive'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Booth price</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.tierPrice}
                  onChange={(e) => set('tierPrice', e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>
          </div>
          <div>
            <Label>Booth description</Label>
            <Textarea rows={2} value={form.boothDescription} onChange={(e) => set('boothDescription', e.target.value)} />
          </div>
          <div>
            <Label>Additional needs</Label>
            <Textarea rows={2} value={form.additionalNeeds} onChange={(e) => set('additionalNeeds', e.target.value)} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="outline" onClick={() => submit(false)} disabled={saving}>
            Save as Pending
          </Button>
          <Button onClick={() => submit(true)} disabled={saving} className="bg-[#1E3A5F] hover:bg-[#2d4a6f] text-white">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Save &amp; Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
