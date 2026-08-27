'use client'

import { useState } from 'react'
import { useParams, notFound, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Save, Calendar, MapPin, Users, DollarSign, FileText } from 'lucide-react'

const DEMO_EVENTS: Record<string, any> = {
  'evt-summer-retreat': {
    name: 'Summer Youth Retreat 2026',
    slug: 'summer-retreat-2026',
    description: 'Four days of prayer, worship, and formation for high-school youth. Includes lodging, meals, sacraments, and keynote speakers.',
    startDate: '2026-07-15',
    endDate: '2026-07-18',
    locationName: 'Steubenville, OH',
    locationAddress: '1235 University Blvd, Steubenville, OH 43952',
    capacityTotal: 400,
    pricePerPerson: 285,
    depositAmount: 100,
  },
  'evt-diocesan-conference': {
    name: 'Diocesan Youth Conference', slug: 'diocesan-conference',
    description: 'Weekend conference for middle-school and high-school youth across the archdiocese.',
    startDate: '2026-10-03', endDate: '2026-10-05',
    locationName: 'Denver, CO', locationAddress: '1300 Colfax Ave, Denver, CO 80204',
    capacityTotal: 250, pricePerPerson: 195, depositAmount: 75,
  },
  'evt-mens-retreat': {
    name: "Men's Silent Retreat", slug: 'mens-retreat',
    description: 'A traditional Ignatian silent weekend for men.',
    startDate: '2026-09-11', endDate: '2026-09-13',
    locationName: 'Malvern, PA', locationAddress: '315 S Warren Ave, Malvern, PA 19355',
    capacityTotal: 120, pricePerPerson: 320, depositAmount: 150,
  },
}

export default function EditEventPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params?.eventId as string
  const initial = DEMO_EVENTS[eventId]

  const [form, setForm] = useState(initial || {})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  if (!initial) notFound()

  const set = (k: string, v: any) => setForm((prev: any) => ({ ...prev, [k]: v }))

  const handleSave = () => {
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }, 400)
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/demo/dashboard/admin" className="hover:text-navy">Dashboard</Link>
        <span>/</span>
        <Link href="/demo/dashboard/admin/events" className="hover:text-navy">Events</Link>
        <span>/</span>
        <Link href={`/demo/dashboard/admin/events/${eventId}`} className="hover:text-navy">{form.name}</Link>
        <span>/</span>
        <span className="text-navy font-medium">Edit</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Edit Event</h1>
          <p className="text-muted-foreground">Update event details and pricing</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => router.push(`/demo/dashboard/admin/events/${eventId}`)} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-navy hover:bg-navy/90 text-white">
            <Save className="w-4 h-4 mr-1" />
            {saving ? 'Saving...' : saved ? 'Saved' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="basics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="basics" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Basics
          </TabsTrigger>
          <TabsTrigger value="location" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Location
          </TabsTrigger>
          <TabsTrigger value="capacity" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Capacity
          </TabsTrigger>
          <TabsTrigger value="pricing" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Pricing
          </TabsTrigger>
          <TabsTrigger value="questions" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Questions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basics">
          <Card>
            <CardHeader>
              <CardTitle>Event Basics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Event name</Label>
                <Input value={form.name} onChange={(e) => set('name', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>URL slug</Label>
                <Input value={form.slug} onChange={(e) => set('slug', e.target.value)} className="mt-1 font-mono" />
                <p className="text-xs text-muted-foreground mt-1">Public URL: /events/{form.slug}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start date</Label>
                  <Input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>End date</Label>
                  <Input type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={4} className="mt-1" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="location">
          <Card>
            <CardHeader>
              <CardTitle>Venue Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Venue name</Label>
                <Input value={form.locationName} onChange={(e) => set('locationName', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Full address</Label>
                <Input value={form.locationAddress} onChange={(e) => set('locationAddress', e.target.value)} className="mt-1" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="capacity">
          <Card>
            <CardHeader>
              <CardTitle>Capacity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Total capacity</Label>
                <Input
                  type="number"
                  value={form.capacityTotal}
                  onChange={(e) => set('capacityTotal', Number(e.target.value) || 0)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">Registration closes automatically when capacity is reached.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Price per person</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <Input
                    type="number"
                    value={form.pricePerPerson}
                    onChange={(e) => set('pricePerPerson', Number(e.target.value) || 0)}
                    className="pl-7"
                  />
                </div>
              </div>
              <div>
                <Label>Group deposit (per seat reserved)</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <Input
                    type="number"
                    value={form.depositAmount}
                    onChange={(e) => set('depositAmount', Number(e.target.value) || 0)}
                    className="pl-7"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Group leaders pay this much per seat up front; balance is due before event.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions">
          <Card>
            <CardHeader>
              <CardTitle>Custom Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Ask custom questions during registration (T-shirt size, dietary
                restrictions, transportation method, etc.). ChiRho has a
                library of 30+ pre-built templates.
              </p>
              <Button
                onClick={() => alert('Demo: Would open the custom questions manager with a picker for templates and a builder for custom ones.')}
                variant="outline"
                className="border-navy text-navy hover:bg-navy hover:text-white"
              >
                Manage Custom Questions
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
