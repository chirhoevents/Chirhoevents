'use client'

import { useState } from 'react'
import { useParams, notFound, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Copy, ArrowLeft, Check } from 'lucide-react'

const DEMO_EVENTS: Record<string, { name: string; startDate: string }> = {
  'evt-summer-retreat': { name: 'Summer Youth Retreat 2026', startDate: '2026-07-15' },
  'evt-diocesan-conference': { name: 'Diocesan Youth Conference', startDate: '2026-10-03' },
  'evt-mens-retreat': { name: "Men's Silent Retreat", startDate: '2026-09-11' },
}

export default function DuplicateEventPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params?.eventId as string
  const source = DEMO_EVENTS[eventId]

  const [newName, setNewName] = useState(source ? `${source.name.replace('2026', '2027')}` : '')
  const [newStart, setNewStart] = useState(source ? source.startDate.replace('2026', '2027') : '')
  const [copyPricing, setCopyPricing] = useState(true)
  const [copyQuestions, setCopyQuestions] = useState(true)
  const [copySettings, setCopySettings] = useState(true)
  const [copyStaff, setCopyStaff] = useState(false)

  if (!source) notFound()

  const handleDuplicate = () => {
    alert(`Demo: Would create a new event "${newName}" starting ${newStart}, cloning pricing/questions/settings from ${source.name}.`)
    router.push('/demo/dashboard/admin/events')
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/demo/dashboard/admin" className="hover:text-navy">Dashboard</Link>
        <span>/</span>
        <Link href="/demo/dashboard/admin/events" className="hover:text-navy">Events</Link>
        <span>/</span>
        <Link href={`/demo/dashboard/admin/events/${eventId}`} className="hover:text-navy">{source.name}</Link>
        <span>/</span>
        <span className="text-navy font-medium">Duplicate</span>
      </div>

      <div>
        <div className="flex items-center gap-3">
          <Copy className="w-7 h-7 text-navy" />
          <h1 className="text-2xl font-bold text-navy">Duplicate Event</h1>
        </div>
        <p className="text-muted-foreground mt-1">
          Create a new event using <strong>{source.name}</strong> as a template
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Event Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>New event name</Label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>New start date</Label>
            <Input type="date" value={newStart} onChange={(e) => setNewStart(e.target.value)} className="mt-1" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What to Copy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: 'pricing', label: 'Pricing (per-person cost, deposit, coupons)', value: copyPricing, set: setCopyPricing },
            { key: 'questions', label: 'Custom registration questions', value: copyQuestions, set: setCopyQuestions },
            { key: 'settings', label: 'Event settings (Poros, Salve, Rapha modules)', value: copySettings, set: setCopySettings },
            { key: 'staff', label: 'Staff roster (send fresh invites)', value: copyStaff, set: setCopyStaff },
          ].map(({ key, label, value, set }) => (
            <div key={key} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
              <Checkbox checked={value} onCheckedChange={(v) => set(!!v)} id={key} />
              <label htmlFor={key} className="text-sm cursor-pointer flex-1">
                {label}
              </label>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex gap-2 justify-end">
        <Link href={`/demo/dashboard/admin/events/${eventId}`}>
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Cancel
          </Button>
        </Link>
        <Button onClick={handleDuplicate} disabled={!newName || !newStart} className="bg-navy hover:bg-navy/90 text-white">
          <Check className="w-4 h-4 mr-1" />
          Duplicate Event
        </Button>
      </div>
    </div>
  )
}
