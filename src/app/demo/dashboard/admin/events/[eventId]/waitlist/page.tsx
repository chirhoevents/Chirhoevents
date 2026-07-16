'use client'

import { useState } from 'react'
import { useParams, notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ListOrdered, ArrowLeft, Mail, UserPlus, Clock } from 'lucide-react'

const DEMO_EVENTS: Record<string, string> = {
  'evt-summer-retreat': 'Summer Youth Retreat 2026',
  'evt-diocesan-conference': 'Diocesan Youth Conference',
  'evt-mens-retreat': "Men's Silent Retreat",
}

interface WaitlistEntry {
  id: string
  position: number
  name: string
  email: string
  phone: string
  spotsRequested: number
  addedAt: string
  status: 'waiting' | 'invited' | 'converted' | 'expired'
}

const INITIAL_ENTRIES: WaitlistEntry[] = [
  { id: 'w1', position: 1, name: 'Emma Johnson', email: 'emma@example.com', phone: '555-0401', spotsRequested: 1, addedAt: '2026-06-15T09:22:00Z', status: 'waiting' },
  { id: 'w2', position: 2, name: 'Carlos Mendez', email: 'carlos@example.com', phone: '555-0402', spotsRequested: 3, addedAt: '2026-06-18T14:10:00Z', status: 'invited' },
  { id: 'w3', position: 3, name: 'Priya Patel', email: 'priya@example.com', phone: '555-0403', spotsRequested: 1, addedAt: '2026-06-20T11:33:00Z', status: 'waiting' },
  { id: 'w4', position: 4, name: 'Marcus Williams', email: 'marcus@example.com', phone: '555-0404', spotsRequested: 5, addedAt: '2026-06-22T08:44:00Z', status: 'waiting' },
]

const statusColors: Record<string, string> = {
  waiting: 'bg-amber-100 text-amber-800',
  invited: 'bg-blue-100 text-blue-800',
  converted: 'bg-emerald-100 text-emerald-800',
  expired: 'bg-gray-100 text-gray-600',
}

export default function WaitlistPage() {
  const params = useParams()
  const eventId = params?.eventId as string
  const eventName = DEMO_EVENTS[eventId]
  const [entries, setEntries] = useState<WaitlistEntry[]>(INITIAL_ENTRIES)

  if (!eventName) notFound()

  const invite = (id: string) => setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, status: 'invited' as const } : e)))

  const waiting = entries.filter((e) => e.status === 'waiting').length
  const invited = entries.filter((e) => e.status === 'invited').length
  const spotsRequested = entries.reduce((n, e) => n + e.spotsRequested, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/demo/dashboard/admin" className="hover:text-navy">Dashboard</Link>
        <span>/</span>
        <Link href="/demo/dashboard/admin/events" className="hover:text-navy">Events</Link>
        <span>/</span>
        <Link href={`/demo/dashboard/admin/events/${eventId}`} className="hover:text-navy">{eventName}</Link>
        <span>/</span>
        <span className="text-navy font-medium">Waitlist</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <ListOrdered className="w-7 h-7 text-navy" />
            <h1 className="text-2xl font-bold text-navy">Waitlist</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            {entries.length} entries · {spotsRequested} spots requested
          </p>
        </div>
        <Link href={`/demo/dashboard/admin/events/${eventId}`}>
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-sm text-muted-foreground">Waiting</p>
              <p className="text-2xl font-bold text-navy">{waiting}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Mail className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm text-muted-foreground">Invited</p>
              <p className="text-2xl font-bold text-navy">{invited}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <UserPlus className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-sm text-muted-foreground">Total spots requested</p>
              <p className="text-2xl font-bold text-navy">{spotsRequested}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Waitlist Queue</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-200">
            {entries.map((e) => (
              <div key={e.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-navy text-white flex items-center justify-center font-bold">
                    #{e.position}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-navy">{e.name}</h3>
                      <Badge className={statusColors[e.status]}>{e.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {e.email} · {e.phone}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {e.spotsRequested} spot{e.spotsRequested !== 1 ? 's' : ''} · Added {new Date(e.addedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {e.status === 'waiting' && (
                  <Button
                    onClick={() => invite(e.id)}
                    size="sm"
                    className="bg-navy hover:bg-navy/90 text-white"
                  >
                    <Mail className="w-4 h-4 mr-1" />
                    Send Invite
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
