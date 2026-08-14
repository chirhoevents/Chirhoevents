'use client'

import { useState } from 'react'
import { useParams, notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, Search, CheckCircle, Users, Printer, Phone,
} from 'lucide-react'

const DEMO_EVENTS: Record<string, string> = {
  'evt-summer-retreat': 'Summer Youth Retreat 2026',
  'evt-diocesan-conference': 'Diocesan Youth Conference',
  'evt-mens-retreat': "Men's Silent Retreat",
}

interface Participant {
  id: string
  name: string
  age: number
  gender: 'M' | 'F'
  group: string
  role: 'participant' | 'chaperone'
  waiverSigned: boolean
  checkedIn: boolean
  nameTagPrinted: boolean
  emergencyContact: string
  emergencyPhone: string
  allergies: string
  medications: string
  housing?: string
}

const INITIAL: Participant[] = [
  { id: 'p1', name: 'Ana Garcia', age: 16, gender: 'F', group: "St. Mary's", role: 'participant', waiverSigned: true, checkedIn: true, nameTagPrinted: true, emergencyContact: 'Maria Garcia', emergencyPhone: '555-0101', allergies: 'Peanuts (severe)', medications: 'EpiPen', housing: 'Franciscan 101' },
  { id: 'p2', name: 'Isabella Martinez', age: 15, gender: 'F', group: "St. Mary's", role: 'participant', waiverSigned: true, checkedIn: true, nameTagPrinted: true, emergencyContact: 'Rosa Martinez', emergencyPhone: '555-0102', allergies: 'None', medications: 'None', housing: 'Franciscan 101' },
  { id: 'p3', name: 'Sofia Nguyen', age: 17, gender: 'F', group: "St. Mary's", role: 'participant', waiverSigned: true, checkedIn: false, nameTagPrinted: false, emergencyContact: 'Kim Nguyen', emergencyPhone: '555-0103', allergies: 'None', medications: 'Albuterol inhaler', housing: 'Franciscan 101' },
  { id: 'p4', name: 'Ben Smith', age: 15, gender: 'M', group: "St. Mary's", role: 'participant', waiverSigned: false, checkedIn: false, nameTagPrinted: false, emergencyContact: 'Robert Smith', emergencyPhone: '555-0104', allergies: 'Shellfish', medications: 'None', housing: 'Franciscan 201' },
  { id: 'p5', name: 'Chris Lee', age: 17, gender: 'M', group: "St. Mary's", role: 'participant', waiverSigned: true, checkedIn: false, nameTagPrinted: false, emergencyContact: 'Jane Lee', emergencyPhone: '555-0105', allergies: 'None', medications: 'None', housing: 'Franciscan 201' },
  { id: 'p6', name: 'Maria Thompson', age: 42, gender: 'F', group: "St. Mary's", role: 'chaperone', waiverSigned: true, checkedIn: true, nameTagPrinted: true, emergencyContact: 'John Thompson', emergencyPhone: '555-0142', allergies: 'None', medications: 'None', housing: 'Chaperone C-1' },
  { id: 'p7', name: 'Grace Kim', age: 16, gender: 'F', group: 'St. John Paul II', role: 'participant', waiverSigned: true, checkedIn: true, nameTagPrinted: true, emergencyContact: 'Jennifer Kim', emergencyPhone: '555-0221', allergies: 'None', medications: 'None', housing: 'Franciscan 102' },
  { id: 'p8', name: 'Luke Anderson', age: 17, gender: 'M', group: 'St. John Paul II', role: 'participant', waiverSigned: true, checkedIn: false, nameTagPrinted: false, emergencyContact: 'Michael Anderson', emergencyPhone: '555-0224', allergies: 'Bee stings', medications: 'EpiPen', housing: 'Franciscan 202' },
]

export default function SalveParticipantsPage() {
  const params = useParams()
  const eventId = params?.eventId as string
  const eventName = DEMO_EVENTS[eventId]
  const [participants, setParticipants] = useState<Participant[]>(INITIAL)
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  if (!eventName) notFound()

  const filtered = query
    ? participants.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.group.toLowerCase().includes(query.toLowerCase()),
      )
    : participants

  const checkIn = (id: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, checkedIn: true, nameTagPrinted: true } : p)),
    )
  }

  const totalCheckedIn = participants.filter((p) => p.checkedIn).length

  return (
    <div className="min-h-[calc(100vh-36px)] bg-[#F5F1E8]">
      <header className="bg-emerald-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-white/80">Salve Portal · Participants</p>
            <h1 className="text-2xl font-bold">{eventName}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-white/80">Checked in</p>
              <p className="text-2xl font-bold">{totalCheckedIn} / {participants.length}</p>
            </div>
            <Link href={`/demo/portal/salve/${eventId}`} className="text-sm text-white/80 hover:text-white underline flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search participants..." className="pl-10 text-lg h-12" />
        </div>

        <Card>
          <CardHeader><CardTitle>All Participants ({filtered.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-200">
              {filtered.map((p) => {
                const isOpen = openId === p.id
                return (
                  <div key={p.id} className={p.checkedIn ? 'bg-emerald-50/40' : ''}>
                    <button
                      onClick={() => setOpenId(isOpen ? null : p.id)}
                      className="w-full text-left p-4 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold">
                          {p.name[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-navy">{p.name}</h3>
                            <Badge variant="secondary" className="text-xs capitalize">{p.role}</Badge>
                            {p.allergies !== 'None' && <Badge className="bg-red-100 text-red-800 text-xs">Allergy</Badge>}
                            {p.medications !== 'None' && <Badge className="bg-amber-100 text-amber-800 text-xs">Meds</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {p.group} · Age {p.age} · {p.gender}
                          </p>
                        </div>
                      </div>
                      {p.checkedIn ? (
                        <Badge className="bg-emerald-600 text-white">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Checked in
                        </Badge>
                      ) : (
                        <Button
                          onClick={(e) => { e.stopPropagation(); checkIn(p.id) }}
                          disabled={!p.waiverSigned}
                          size="sm"
                          className="bg-emerald-700 hover:bg-emerald-800 text-white"
                        >
                          Check In
                        </Button>
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 border-t border-gray-100 bg-white grid grid-cols-1 md:grid-cols-2 gap-3 text-sm pt-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Waiver</p>
                          <p className={p.waiverSigned ? 'text-emerald-700 font-medium' : 'text-red-700 font-medium'}>
                            {p.waiverSigned ? '✓ Signed' : '⚠ Missing (blocks check-in)'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Housing</p>
                          <p className="font-medium">{p.housing || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Allergies</p>
                          <p className={p.allergies !== 'None' ? 'text-red-700 font-medium' : ''}>{p.allergies}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Medications</p>
                          <p className={p.medications !== 'None' ? 'text-red-700 font-medium' : ''}>{p.medications}</p>
                        </div>
                        <div className="md:col-span-2">
                          <p className="text-xs text-muted-foreground">Emergency contact</p>
                          <p className="font-medium flex items-center gap-1">
                            {p.emergencyContact} <Phone className="w-3 h-3 text-muted-foreground" /> {p.emergencyPhone}
                          </p>
                        </div>
                        <div className="md:col-span-2 pt-2 flex gap-2">
                          <Button
                            onClick={() => alert(`Demo: Would reprint name tag for ${p.name}.`)}
                            variant="outline"
                            size="sm"
                          >
                            <Printer className="w-4 h-4 mr-1" />
                            Reprint name tag
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
