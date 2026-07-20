'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Store,
  Plus,
  ArrowLeft,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
  Calendar,
  MapPin,
  CreditCard,
  Check,
} from 'lucide-react'

interface VendorApp {
  id: string
  eventId: string
  eventName: string
  eventDate: string
  eventLocation: string
  businessName: string
  contactName: string
  contactEmail: string
  boothType: string
  description: string
  status: 'pending' | 'approved' | 'rejected'
  amountPaid: number
  boothFee: number
}

const INITIAL: VendorApp[] = [
  {
    id: 'v1', eventId: 'evt-summer-retreat', eventName: 'Summer Youth Retreat 2026',
    eventDate: 'Jul 15-18, 2026', eventLocation: 'Steubenville, OH',
    businessName: 'Sacred Heart Rosary Co.', contactName: 'Jane Vendor', contactEmail: 'jane@rosaryco.com',
    boothType: 'Standard 10x10', description: 'Handmade rosaries, chapel veils, sacramentals.',
    status: 'approved', amountPaid: 150, boothFee: 150,
  },
  {
    id: 'v2', eventId: 'evt-diocesan-conference', eventName: 'Diocesan Youth Conference',
    eventDate: 'Oct 3-5, 2026', eventLocation: 'Denver, CO',
    businessName: 'Sacred Heart Rosary Co.', contactName: 'Jane Vendor', contactEmail: 'jane@rosaryco.com',
    boothType: 'Standard 10x10', description: 'Handmade rosaries, chapel veils, sacramentals.',
    status: 'approved', amountPaid: 0, boothFee: 150,
  },
  {
    id: 'v3', eventId: 'evt-summer-retreat', eventName: 'Summer Youth Retreat 2026',
    eventDate: 'Jul 15-18, 2026', eventLocation: 'Steubenville, OH',
    businessName: 'Sacred Heart Rosary Co.', contactName: 'Jane Vendor', contactEmail: 'jane@rosaryco.com',
    boothType: 'Premium 10x20', description: 'Expanded booth for holy card display.',
    status: 'pending', amountPaid: 0, boothFee: 300,
  },
]

const AVAILABLE_EVENTS = [
  { id: 'evt-summer-retreat', name: 'Summer Youth Retreat 2026', date: 'Jul 15-18, 2026', location: 'Steubenville, OH', vendorSpotsRemaining: 8 },
  { id: 'evt-diocesan-conference', name: 'Diocesan Youth Conference', date: 'Oct 3-5, 2026', location: 'Denver, CO', vendorSpotsRemaining: 12 },
  { id: 'evt-mens-retreat', name: "Men's Silent Retreat", date: 'Sep 11-13, 2026', location: 'Malvern, PA', vendorSpotsRemaining: 3 },
]

const statusInfo: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: 'Pending review', color: 'bg-amber-100 text-amber-800', icon: Clock },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
  rejected: { label: 'Not approved', color: 'bg-red-100 text-red-800', icon: XCircle },
}

export default function VendorPortal() {
  const [apps, setApps] = useState<VendorApp[]>(INITIAL)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    eventId: AVAILABLE_EVENTS[0].id,
    businessName: '',
    contactName: '',
    contactEmail: '',
    boothType: 'Standard 10x10',
    description: '',
  })
  const [payingId, setPayingId] = useState<string | null>(null)
  const [cardNumber, setCardNumber] = useState('')
  const [processing, setProcessing] = useState(false)

  const set = (k: string, v: string) => setForm((prev) => ({ ...prev, [k]: v }))

  const boothFeeFor = (type: string) => (type.includes('Premium') ? 300 : type.includes('Non-profit') ? 75 : 150)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const evt = AVAILABLE_EVENTS.find((e) => e.id === form.eventId)!
    setApps((prev) => [
      ...prev,
      {
        id: `v-${Math.random().toString(36).slice(2, 8)}`,
        eventId: form.eventId,
        eventName: evt.name,
        eventDate: evt.date,
        eventLocation: evt.location,
        businessName: form.businessName,
        contactName: form.contactName,
        contactEmail: form.contactEmail,
        boothType: form.boothType,
        description: form.description,
        status: 'pending',
        amountPaid: 0,
        boothFee: boothFeeFor(form.boothType),
      },
    ])
    setShowForm(false)
    setForm({ eventId: AVAILABLE_EVENTS[0].id, businessName: '', contactName: '', contactEmail: '', boothType: 'Standard 10x10', description: '' })
    alert('Demo: Application submitted. Admin will review and email you.')
  }

  const pay = (id: string) => {
    setPayingId(null)
    setProcessing(true)
    setTimeout(() => {
      setApps((prev) => prev.map((a) => (a.id === id ? { ...a, amountPaid: a.boothFee } : a)))
      setProcessing(false)
      setCardNumber('')
      alert('Demo: Booth fee marked as paid. No real Stripe charge.')
    }, 700)
  }

  return (
    <div className="min-h-[calc(100vh-36px)] bg-[#F5F1E8]">
      <header className="bg-[#1E3A5F] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-[#E1D5BA] mb-1">Vendor Portal</p>
              <h1 className="text-3xl font-bold">Booth Applications</h1>
              <p className="text-white/80 text-sm mt-1">Apply for a booth, track approval, pay booth fees</p>
            </div>
            <Link href="/demo" className="text-sm text-white/80 hover:text-white underline flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              Demo home
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-navy">Your Applications</h2>
          {!showForm && (
            <Button onClick={() => setShowForm(true)} className="bg-navy hover:bg-navy/90 text-white">
              <Plus className="w-4 h-4 mr-1" />
              New Application
            </Button>
          )}
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-navy">New Booth Application</CardTitle>
              <CardDescription>Submit your application for review</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <Label>Event</Label>
                  <select
                    value={form.eventId}
                    onChange={(e) => set('eventId', e.target.value)}
                    className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
                  >
                    {AVAILABLE_EVENTS.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} — {e.vendorSpotsRemaining} spots left
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Business name</Label>
                    <Input value={form.businessName} onChange={(e) => set('businessName', e.target.value)} required className="mt-1" />
                  </div>
                  <div>
                    <Label>Booth type</Label>
                    <select
                      value={form.boothType}
                      onChange={(e) => set('boothType', e.target.value)}
                      className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
                    >
                      <option>Standard 10x10 — $150</option>
                      <option>Premium 10x20 — $300</option>
                      <option>Non-profit — $75</option>
                    </select>
                  </div>
                  <div>
                    <Label>Contact name</Label>
                    <Input value={form.contactName} onChange={(e) => set('contactName', e.target.value)} required className="mt-1" />
                  </div>
                  <div>
                    <Label>Contact email</Label>
                    <Input type="email" value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} required className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    placeholder="What you sell, non-profit affiliation, etc."
                    rows={3}
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="bg-navy hover:bg-navy/90 text-white">
                    Submit Application
                  </Button>
                  <Button type="button" onClick={() => setShowForm(false)} variant="outline">
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {apps.map((app) => {
            const info = statusInfo[app.status]
            const Icon = info.icon
            const owes = app.status === 'approved' && app.amountPaid < app.boothFee
            return (
              <Card key={app.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 rounded-lg bg-[#9C8466]/10 flex items-center justify-center flex-shrink-0">
                        <Store className="w-6 h-6 text-[#9C8466]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-navy">{app.businessName}</h3>
                          <Badge className={info.color}>
                            <Icon className="w-3 h-3 mr-1" />
                            {info.label}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-navy">{app.eventName}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {app.eventDate}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {app.eventLocation}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          {app.boothType} · ${app.boothFee} booth fee
                        </p>
                        <p className="text-sm text-gray-700 mt-1">{app.description}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {app.amountPaid > 0 ? (
                        <div className="flex items-center gap-1 text-emerald-700 text-sm">
                          <Check className="w-4 h-4" />
                          Paid ${app.amountPaid}
                        </div>
                      ) : app.status === 'approved' ? (
                        <Button
                          onClick={() => setPayingId(app.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          size="sm"
                        >
                          <CreditCard className="w-4 h-4 mr-1" />
                          Pay ${app.boothFee}
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {payingId === app.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                      <p className="text-sm font-medium">Pay booth fee (demo)</p>
                      <Input
                        placeholder="4242 4242 4242 4242"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="font-mono max-w-md"
                      />
                      <p className="text-xs text-muted-foreground">
                        Demo mode — no real card is validated or charged.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => pay(app.id)}
                          disabled={processing}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          size="sm"
                        >
                          <DollarSign className="w-4 h-4 mr-1" />
                          {processing ? 'Processing…' : `Charge $${app.boothFee}`}
                        </Button>
                        <Button onClick={() => setPayingId(null)} variant="outline" size="sm">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {owes && payingId !== app.id && (
                    <p className="text-xs text-amber-700 mt-3">Payment required before booth setup.</p>
                  )}
                </CardContent>
              </Card>
            )
          })}

          {apps.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Store className="w-10 h-10 text-muted-foreground opacity-40 mx-auto mb-3" />
                <p className="text-muted-foreground">No applications yet. Submit one above.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
