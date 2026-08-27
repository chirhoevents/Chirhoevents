'use client'

import { useState } from 'react'
import { useParams, notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  CheckSquare,
  Users,
  Package,
  Printer,
  Search,
  Clock,
  CheckCircle,
  UserCheck,
  ExternalLink,
  ArrowRight,
} from 'lucide-react'

const DEMO_EVENTS: Record<string, string> = {
  'evt-summer-retreat': 'Summer Youth Retreat 2026',
  'evt-diocesan-conference': 'Diocesan Youth Conference',
  'evt-mens-retreat': "Men's Silent Retreat",
}

interface DemoGroup {
  id: string
  name: string
  leader: string
  totalParticipants: number
  checkedIn: number
  packetPrinted: boolean
}

const DEMO_GROUPS: DemoGroup[] = [
  { id: 'g1', name: "St. Mary's Youth Group", leader: 'Sample Leader', totalParticipants: 10, checkedIn: 10, packetPrinted: true },
  { id: 'g2', name: 'St. John Paul II Parish', leader: 'Fr. Michael Kowalski', totalParticipants: 4, checkedIn: 3, packetPrinted: true },
  { id: 'g3', name: 'Holy Family Community', leader: 'Sarah Martinez', totalParticipants: 8, checkedIn: 0, packetPrinted: false },
  { id: 'g4', name: 'St. Andrew Youth', leader: 'Deacon Ryan', totalParticipants: 12, checkedIn: 6, packetPrinted: true },
  { id: 'g5', name: 'Our Lady of Guadalupe', leader: 'Maria Lopez', totalParticipants: 15, checkedIn: 15, packetPrinted: true },
  { id: 'g6', name: 'Sacred Heart Parish', leader: 'John Simmons', totalParticipants: 7, checkedIn: 4, packetPrinted: true },
]

export default function SalveEventPage() {
  const params = useParams()
  const eventId = params?.eventId as string
  const eventName = DEMO_EVENTS[eventId]
  const [query, setQuery] = useState('')

  if (!eventName) notFound()

  const filtered = query
    ? DEMO_GROUPS.filter(
        (g) =>
          g.name.toLowerCase().includes(query.toLowerCase()) ||
          g.leader.toLowerCase().includes(query.toLowerCase()),
      )
    : DEMO_GROUPS

  const totalExpected = DEMO_GROUPS.reduce((n, g) => n + g.totalParticipants, 0)
  const totalCheckedIn = DEMO_GROUPS.reduce((n, g) => n + g.checkedIn, 0)
  const totalPacketsPrinted = DEMO_GROUPS.filter((g) => g.packetPrinted).length

  const notImpl = (what: string) => () =>
    alert(`Demo: ${what} — would run in the real product but is disabled in demo mode.`)

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/demo/dashboard/admin" className="hover:text-navy">Dashboard</Link>
          <span>/</span>
          <Link href="/demo/dashboard/admin/events" className="hover:text-navy">Events</Link>
          <span>/</span>
          <Link href={`/demo/dashboard/admin/events/${eventId}`} className="hover:text-navy">{eventName}</Link>
          <span>/</span>
          <span className="text-navy font-medium">SALVE Check-In</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <CheckSquare className="w-7 h-7 text-emerald-600" />
              <h1 className="text-3xl font-bold text-navy">SALVE Check-In</h1>
            </div>
            <p className="text-muted-foreground mt-1">
              Check groups in, print welcome packets and name tags for {eventName}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/demo/dashboard/admin/events/${eventId}/salve/welcome-packets`}>
              <Button variant="outline" className="border-emerald-600 text-emerald-700 hover:bg-emerald-50">
                <Package className="w-4 h-4 mr-2" />
                Welcome Packets
              </Button>
            </Link>
            <Link href={`/demo/dashboard/admin/events/${eventId}/salve/name-tags`}>
              <Button variant="outline" className="border-emerald-600 text-emerald-700 hover:bg-emerald-50">
                <Printer className="w-4 h-4 mr-2" />
                Name Tags
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat icon={Users} label="Total expected" value={totalExpected} color="text-navy" />
        <Stat icon={CheckCircle} label="Checked in" value={`${totalCheckedIn} / ${totalExpected}`} color="text-emerald-700" />
        <Stat icon={Clock} label="Still expected" value={totalExpected - totalCheckedIn} color="text-amber-700" />
        <Stat icon={Package} label="Packets printed" value={`${totalPacketsPrinted} / ${DEMO_GROUPS.length}`} color="text-navy" />
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search groups or leaders..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Group list */}
      <Card>
        <CardHeader>
          <CardTitle>Groups Expected Today</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-200">
            {filtered.map((g) => {
              const pct = g.totalParticipants > 0 ? Math.round((g.checkedIn / g.totalParticipants) * 100) : 0
              const fullyIn = g.checkedIn >= g.totalParticipants
              return (
                <div key={g.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-navy truncate">{g.name}</h3>
                      {fullyIn && (
                        <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          All checked in
                        </Badge>
                      )}
                      {g.packetPrinted && (
                        <Badge variant="secondary">
                          <Package className="w-3 h-3 mr-1" />
                          Packet printed
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Leader: {g.leader}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex-1 max-w-md">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        {g.checkedIn} / {g.totalParticipants}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      onClick={notImpl(`Open ${g.name} check-in`)}
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <UserCheck className="w-4 h-4 mr-1" />
                      Check In
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Public portal link */}
      <div className="mt-6 flex justify-end">
        <Link href={`/demo/portal/salve/${eventId}`} className="text-sm text-emerald-700 hover:underline flex items-center gap-1">
          <ExternalLink className="w-4 h-4" />
          Open dedicated SALVE portal (for on-site tablets)
        </Link>
      </div>
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
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Icon className={`h-5 w-5 ${color}`} />
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
