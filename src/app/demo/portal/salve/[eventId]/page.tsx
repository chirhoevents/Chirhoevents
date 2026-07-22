'use client'

import { useState } from 'react'
import { useParams, notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  CheckCircle,
  Clock,
  Users,
  Package,
  Printer,
  ArrowLeft,
  QrCode,
  UserCheck,
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
  group: string
  role: 'participant' | 'chaperone'
  waiverSigned: boolean
  checkedIn: boolean
  nameTagPrinted: boolean
}

const INITIAL: Participant[] = [
  { id: 'p1', name: 'Ana Garcia', age: 16, group: "St. Mary's", role: 'participant', waiverSigned: true, checkedIn: true, nameTagPrinted: true },
  { id: 'p2', name: 'Isabella Martinez', age: 15, group: "St. Mary's", role: 'participant', waiverSigned: true, checkedIn: true, nameTagPrinted: true },
  { id: 'p3', name: 'Sofia Nguyen', age: 17, group: "St. Mary's", role: 'participant', waiverSigned: true, checkedIn: false, nameTagPrinted: false },
  { id: 'p4', name: 'Ben Smith', age: 15, group: "St. Mary's", role: 'participant', waiverSigned: false, checkedIn: false, nameTagPrinted: false },
  { id: 'p5', name: 'Chris Lee', age: 17, group: "St. Mary's", role: 'participant', waiverSigned: true, checkedIn: false, nameTagPrinted: false },
  { id: 'p6', name: 'Maria Thompson', age: 42, group: "St. Mary's", role: 'chaperone', waiverSigned: true, checkedIn: true, nameTagPrinted: true },
  { id: 'p7', name: 'Grace Kim', age: 16, group: 'St. John Paul II', role: 'participant', waiverSigned: true, checkedIn: true, nameTagPrinted: true },
  { id: 'p8', name: 'Luke Anderson', age: 17, group: 'St. John Paul II', role: 'participant', waiverSigned: true, checkedIn: false, nameTagPrinted: false },
  { id: 'p9', name: 'Fr. Michael Kowalski', age: 45, group: 'St. John Paul II', role: 'chaperone', waiverSigned: true, checkedIn: true, nameTagPrinted: true },
  { id: 'p10', name: 'Sarah Martinez', age: 38, group: 'Holy Family', role: 'chaperone', waiverSigned: true, checkedIn: false, nameTagPrinted: false },
]

export default function SalveDedicatedPortal() {
  const params = useParams()
  const eventId = params?.eventId as string
  const eventName = DEMO_EVENTS[eventId]
  const [participants, setParticipants] = useState<Participant[]>(INITIAL)
  const [query, setQuery] = useState('')

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
  const totalWithSignedWaivers = participants.filter((p) => p.waiverSigned).length

  return (
    <div className="min-h-[calc(100vh-36px)] bg-[#F5F1E8]">
      <header className="bg-emerald-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/80">Salve Check-In Portal</p>
              <h1 className="text-2xl font-bold">{eventName}</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-white/80">Checked in</p>
                <p className="text-2xl font-bold">
                  {totalCheckedIn} <span className="text-sm text-white/70">/ {participants.length}</span>
                </p>
              </div>
              <Link href="/demo" className="text-sm text-white/80 hover:text-white underline flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" />
                Demo home
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat icon={Users} label="Expected" value={participants.length} color="text-navy" />
          <Stat icon={CheckCircle} label="Checked in" value={totalCheckedIn} color="text-emerald-700" />
          <Stat icon={Clock} label="Waiting" value={participants.length - totalCheckedIn} color="text-amber-700" />
          <Stat icon={UserCheck} label="Waivers signed" value={`${totalWithSignedWaivers}/${participants.length}`} color="text-navy" />
        </div>

        {/* Search + QR */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or group..."
              className="pl-10 text-lg h-12"
            />
          </div>
          <Button
            onClick={() => alert('Demo: Would activate device camera to scan QR code from confirmation email.')}
            className="bg-emerald-700 hover:bg-emerald-800 text-white h-12 px-5"
          >
            <QrCode className="w-5 h-5 mr-2" />
            Scan QR
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Participants ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-200">
              {filtered.map((p) => (
                <div key={p.id} className={`p-4 flex items-center justify-between gap-4 ${p.checkedIn ? 'bg-emerald-50/40' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold flex-shrink-0">
                      {p.name[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-navy text-lg">{p.name}</h3>
                        <Badge variant="secondary" className="capitalize text-xs">{p.role}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {p.group} · Age {p.age}
                      </p>
                      <div className="flex items-center gap-3 text-xs mt-1">
                        {p.waiverSigned ? (
                          <span className="text-emerald-700 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Waiver signed
                          </span>
                        ) : (
                          <span className="text-red-700 flex items-center gap-1">
                            ⚠ Waiver missing
                          </span>
                        )}
                        {p.nameTagPrinted && (
                          <span className="text-emerald-700 flex items-center gap-1">
                            <Printer className="w-3 h-3" />
                            Name tag printed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {p.checkedIn ? (
                      <Badge className="bg-emerald-600 text-white text-sm px-3 py-1">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Checked in
                      </Badge>
                    ) : (
                      <Button
                        onClick={() => checkIn(p.id)}
                        disabled={!p.waiverSigned}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white"
                        size="lg"
                      >
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Check In
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card
            className="hover:border-emerald-600 hover:shadow-md transition cursor-pointer"
            onClick={() => alert('Demo: Would open the bulk name-tag print flow.')}
          >
            <CardContent className="p-5 flex items-center gap-3">
              <Printer className="w-8 h-8 text-emerald-700" />
              <div>
                <p className="font-semibold text-navy">Bulk print name tags</p>
                <p className="text-sm text-muted-foreground">Print all unprinted tags at once</p>
              </div>
            </CardContent>
          </Card>
          <Card
            className="hover:border-emerald-600 hover:shadow-md transition cursor-pointer"
            onClick={() => alert('Demo: Would open welcome packet handoff tracker.')}
          >
            <CardContent className="p-5 flex items-center gap-3">
              <Package className="w-8 h-8 text-emerald-700" />
              <div>
                <p className="font-semibold text-navy">Welcome packets</p>
                <p className="text-sm text-muted-foreground">Track packet handoff by group</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  color: string
}) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <Icon className={`w-5 h-5 ${color}`} />
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`text-xl font-bold ${color}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
