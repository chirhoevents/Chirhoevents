'use client'

import { useState } from 'react'
import { useParams, notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Printer, Search, CheckCircle, Palette } from 'lucide-react'

const DEMO_EVENTS: Record<string, string> = {
  'evt-summer-retreat': 'Summer Youth Retreat 2026',
  'evt-diocesan-conference': 'Diocesan Youth Conference',
  'evt-mens-retreat': "Men's Silent Retreat",
}

interface NameTag {
  id: string
  firstName: string
  lastName: string
  group: string
  role: 'participant' | 'chaperone' | 'staff'
  mealColor?: string
  smallGroup?: string
  printed: boolean
}

const INITIAL: NameTag[] = [
  { id: 'n1', firstName: 'Ana', lastName: 'Garcia', group: "St. Mary's Youth Group", role: 'participant', mealColor: 'Blue', smallGroup: 'A3', printed: true },
  { id: 'n2', firstName: 'Isabella', lastName: 'Martinez', group: "St. Mary's Youth Group", role: 'participant', mealColor: 'Blue', smallGroup: 'A3', printed: true },
  { id: 'n3', firstName: 'Sofia', lastName: 'Nguyen', group: "St. Mary's Youth Group", role: 'participant', mealColor: 'Blue', smallGroup: 'A4', printed: false },
  { id: 'n4', firstName: 'Ben', lastName: 'Smith', group: "St. Mary's Youth Group", role: 'participant', mealColor: 'Red', smallGroup: 'B2', printed: false },
  { id: 'n5', firstName: 'Chris', lastName: 'Lee', group: "St. Mary's Youth Group", role: 'participant', mealColor: 'Red', smallGroup: 'B2', printed: false },
  { id: 'n6', firstName: 'Maria', lastName: 'Thompson', group: "St. Mary's Youth Group", role: 'chaperone', mealColor: 'Blue', smallGroup: 'A3', printed: true },
  { id: 'n7', firstName: 'James', lastName: 'Rodriguez', group: "St. Mary's Youth Group", role: 'chaperone', mealColor: 'Red', smallGroup: 'B2', printed: true },
  { id: 'n8', firstName: 'Grace', lastName: 'Kim', group: 'St. John Paul II Parish', role: 'participant', mealColor: 'Green', smallGroup: 'C1', printed: false },
  { id: 'n9', firstName: 'Luke', lastName: 'Anderson', group: 'St. John Paul II Parish', role: 'participant', mealColor: 'Green', smallGroup: 'C1', printed: false },
  { id: 'n10', firstName: 'Fr. Michael', lastName: 'Kowalski', group: 'St. John Paul II Parish', role: 'staff', mealColor: 'Green', smallGroup: 'C1', printed: true },
]

const mealColors: Record<string, string> = {
  Blue: 'bg-blue-500',
  Red: 'bg-red-500',
  Green: 'bg-green-500',
  Yellow: 'bg-yellow-500',
}

export default function NameTagsPage() {
  const params = useParams()
  const eventId = params?.eventId as string
  const eventName = DEMO_EVENTS[eventId]
  const [tags, setTags] = useState<NameTag[]>(INITIAL)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')

  if (!eventName) notFound()

  const filtered = tags.filter((t) => {
    if (!query) return true
    const q = query.toLowerCase()
    return `${t.firstName} ${t.lastName}`.toLowerCase().includes(q) || t.group.toLowerCase().includes(q)
  })

  const toggle = (id: string) => {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
  }

  const selectAll = () => setSelected(new Set(filtered.map((t) => t.id)))
  const selectUnprinted = () => setSelected(new Set(filtered.filter((t) => !t.printed).map((t) => t.id)))
  const selectNone = () => setSelected(new Set())

  const printSelected = () => {
    setTags((prev) => prev.map((t) => (selected.has(t.id) ? { ...t, printed: true } : t)))
    alert(`Demo: Would print ${selected.size} name tags. In the real product this opens a print-ready PDF with cut lines.`)
    setSelected(new Set())
  }

  const totalPrinted = tags.filter((t) => t.printed).length

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/demo/dashboard/admin" className="hover:text-navy">Dashboard</Link>
        <span>/</span>
        <Link href="/demo/dashboard/admin/events" className="hover:text-navy">Events</Link>
        <span>/</span>
        <Link href={`/demo/dashboard/admin/events/${eventId}`} className="hover:text-navy">{eventName}</Link>
        <span>/</span>
        <Link href={`/demo/dashboard/admin/events/${eventId}/salve`} className="hover:text-navy">Salve</Link>
        <span>/</span>
        <span className="text-navy font-medium">Name Tags</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Printer className="w-7 h-7 text-emerald-700" />
            <h1 className="text-2xl font-bold text-navy">Name Tags</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            {totalPrinted} of {tags.length} printed for {eventName}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => alert('Demo: Would open the name-tag template designer (colors, meal-group badges, logo, layout).')}
            variant="outline"
          >
            <Palette className="w-4 h-4 mr-1" />
            Template
          </Button>
          <Link href={`/demo/dashboard/admin/events/${eventId}/salve`}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search participants..." className="pl-10" />
          </div>
          <div className="flex gap-2">
            <Button onClick={selectUnprinted} variant="outline" size="sm">Select unprinted</Button>
            <Button onClick={selectAll} variant="outline" size="sm">All</Button>
            <Button onClick={selectNone} variant="outline" size="sm">None</Button>
            <Button
              onClick={printSelected}
              disabled={selected.size === 0}
              className="bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              <Printer className="w-4 h-4 mr-1" />
              Print {selected.size}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((t) => (
          <label
            key={t.id}
            className={`cursor-pointer rounded-lg border-2 p-3 ${selected.has(t.id) ? 'border-emerald-600' : 'border-gray-200'}`}
          >
            <div className="flex items-start justify-between mb-3">
              <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggle(t.id)} className="mt-1" />
              {t.printed && (
                <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Printed
                </Badge>
              )}
            </div>
            {/* Name tag preview */}
            <div className="border-4 border-navy bg-white p-3 text-center">
              <div className="text-xs text-[#9C8466] uppercase tracking-widest mb-1">Hello, my name is</div>
              <div className="text-xl font-bold text-navy">{t.firstName}</div>
              <div className="text-sm text-slate-600">{t.lastName}</div>
              <div className="text-xs text-slate-500 border-t mt-2 pt-2">{t.group}</div>
              <div className="flex items-center justify-center gap-3 mt-2 text-xs">
                {t.mealColor && (
                  <div className="flex items-center gap-1">
                    <div className={`w-3 h-3 rounded-full ${mealColors[t.mealColor]}`} />
                    <span className="text-slate-600">{t.mealColor}</span>
                  </div>
                )}
                {t.smallGroup && <span className="text-slate-600">Group {t.smallGroup}</span>}
              </div>
              <Badge variant="secondary" className="text-xs mt-2 capitalize">{t.role}</Badge>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}
