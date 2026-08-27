'use client'

import { useState } from 'react'
import { useParams, notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Package, Printer, CheckCircle, Users, Home, Utensils } from 'lucide-react'

const DEMO_EVENTS: Record<string, string> = {
  'evt-summer-retreat': 'Summer Youth Retreat 2026',
  'evt-diocesan-conference': 'Diocesan Youth Conference',
  'evt-mens-retreat': "Men's Silent Retreat",
}

interface Group {
  id: string
  name: string
  leader: string
  participants: number
  housing: string
  mealColor: string
  packetPrinted: boolean
  packetHandedOff: boolean
}

const INITIAL: Group[] = [
  { id: 'g1', name: "St. Mary's Youth Group", leader: 'Sample Leader', participants: 10, housing: 'Franciscan Hall 101, 201-202', mealColor: 'Blue / Red', packetPrinted: true, packetHandedOff: false },
  { id: 'g2', name: 'St. John Paul II Parish', leader: 'Fr. Michael Kowalski', participants: 4, housing: 'Franciscan Hall 102', mealColor: 'Green', packetPrinted: true, packetHandedOff: true },
  { id: 'g3', name: 'Holy Family Community', leader: 'Sarah Martinez', participants: 8, housing: 'Franciscan Hall 203, 204', mealColor: 'Yellow', packetPrinted: false, packetHandedOff: false },
  { id: 'g4', name: 'St. Andrew Youth', leader: 'Deacon Ryan', participants: 12, housing: 'Franciscan Hall 301-303', mealColor: 'Blue', packetPrinted: true, packetHandedOff: false },
  { id: 'g5', name: 'Our Lady of Guadalupe', leader: 'Maria Lopez', participants: 15, housing: 'Franciscan Hall 401-404', mealColor: 'Red / Yellow', packetPrinted: false, packetHandedOff: false },
]

export default function WelcomePacketsPage() {
  const params = useParams()
  const eventId = params?.eventId as string
  const eventName = DEMO_EVENTS[eventId]
  const [groups, setGroups] = useState<Group[]>(INITIAL)

  if (!eventName) notFound()

  const printPacket = (id: string) => {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, packetPrinted: true } : g)))
    alert('Demo: Would open a print-ready PDF with roster, housing, meal groups, schedule, and emergency info.')
  }
  const printAll = () => {
    setGroups((prev) => prev.map((g) => ({ ...g, packetPrinted: true })))
    alert(`Demo: Would print ${groups.length} welcome packets, one per group.`)
  }
  const markHandedOff = (id: string) => {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, packetHandedOff: true } : g)))
  }

  const totalPrinted = groups.filter((g) => g.packetPrinted).length
  const totalHandedOff = groups.filter((g) => g.packetHandedOff).length

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/demo/dashboard/admin" className="hover:text-navy">Dashboard</Link>
        <span>/</span>
        <Link href="/demo/dashboard/admin/events" className="hover:text-navy">Events</Link>
        <span>/</span>
        <Link href={`/demo/dashboard/admin/events/${eventId}`} className="hover:text-navy">{eventName}</Link>
        <span>/</span>
        <Link href={`/demo/dashboard/admin/events/${eventId}/salve`} className="hover:text-navy">Salve</Link>
        <span>/</span>
        <span className="text-navy font-medium">Welcome Packets</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Package className="w-7 h-7 text-emerald-700" />
            <h1 className="text-2xl font-bold text-navy">Welcome Packets</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            One packet per group with roster, housing, meal colors, and schedule
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={printAll} className="bg-emerald-700 hover:bg-emerald-800 text-white">
            <Printer className="w-4 h-4 mr-1" />
            Print All ({groups.length})
          </Button>
          <Link href={`/demo/dashboard/admin/events/${eventId}/salve`}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Groups</p><p className="text-2xl font-bold text-navy">{groups.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Packets printed</p><p className="text-2xl font-bold text-emerald-700">{totalPrinted} / {groups.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Handed off</p><p className="text-2xl font-bold text-navy">{totalHandedOff} / {groups.length}</p></CardContent></Card>
      </div>

      <div className="space-y-3">
        {groups.map((g) => (
          <Card key={g.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="text-lg font-semibold text-navy">{g.name}</h3>
                    {g.packetPrinted && (
                      <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                        <Printer className="w-3 h-3 mr-1" />
                        Printed
                      </Badge>
                    )}
                    {g.packetHandedOff && (
                      <Badge className="bg-navy text-white text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Handed off
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">Leader: {g.leader}</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#9C8466]" />
                      <span>{g.participants} participants</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4 text-[#9C8466]" />
                      <span>{g.housing}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Utensils className="w-4 h-4 text-[#9C8466]" />
                      <span>Meal: {g.mealColor}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {!g.packetPrinted && (
                    <Button
                      onClick={() => printPacket(g.id)}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white"
                      size="sm"
                    >
                      <Printer className="w-4 h-4 mr-1" />
                      Print
                    </Button>
                  )}
                  {g.packetPrinted && !g.packetHandedOff && (
                    <Button
                      onClick={() => markHandedOff(g.id)}
                      className="bg-navy hover:bg-navy/90 text-white"
                      size="sm"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Mark handed off
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
