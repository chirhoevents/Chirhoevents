'use client'

import { useParams, notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, ArrowLeft, Clock, Activity, RefreshCw } from 'lucide-react'

const DEMO_EVENTS: Record<string, string> = {
  'evt-summer-retreat': 'Summer Youth Retreat 2026',
  'evt-diocesan-conference': 'Diocesan Youth Conference',
  'evt-mens-retreat': "Men's Silent Retreat",
}

export default function QueuePage() {
  const params = useParams()
  const eventId = params?.eventId as string
  const eventName = DEMO_EVENTS[eventId]

  if (!eventName) notFound()

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/demo/dashboard/admin" className="hover:text-navy">Dashboard</Link>
        <span>/</span>
        <Link href="/demo/dashboard/admin/events" className="hover:text-navy">Events</Link>
        <span>/</span>
        <Link href={`/demo/dashboard/admin/events/${eventId}`} className="hover:text-navy">{eventName}</Link>
        <span>/</span>
        <span className="text-navy font-medium">Registration Queue</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Users className="w-7 h-7 text-navy" />
            <h1 className="text-2xl font-bold text-navy">Registration Queue</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Live view of active registration sessions on {eventName}
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
            <Activity className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-sm text-muted-foreground">Active sessions</p>
              <p className="text-2xl font-bold text-navy">7</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-sm text-muted-foreground">Avg. time to complete</p>
              <p className="text-2xl font-bold text-navy">4m 12s</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <RefreshCw className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm text-muted-foreground">Refreshed</p>
              <p className="text-2xl font-bold text-navy">now</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Registration Sessions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-200">
            {[
              { name: 'Anonymous · Chrome / Mac', step: 'Participant info (2 of 4)', time: '00:42' },
              { name: 'sarah@stmarys.org', step: 'Payment (4 of 4)', time: '03:14' },
              { name: 'Anonymous · Safari / iOS', step: 'Group details (1 of 4)', time: '00:08' },
              { name: 'Anonymous · Chrome / Windows', step: 'Custom questions (3 of 4)', time: '01:58' },
              { name: 'jrod@example.com', step: 'Waiver signature', time: '02:22' },
              { name: 'Anonymous · Chrome / Mac', step: 'Housing selection', time: '00:31' },
              { name: 'family@example.com', step: 'Payment (4 of 4)', time: '05:47' },
            ].map((session, i) => (
              <div key={i} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-navy">{session.name}</p>
                  <p className="text-sm text-muted-foreground">{session.step}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-emerald-100 text-emerald-800">Active</Badge>
                  <span className="text-sm font-mono text-muted-foreground">{session.time}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
