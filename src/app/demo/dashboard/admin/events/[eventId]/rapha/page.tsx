'use client'

import { useState } from 'react'
import { useParams, notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Activity,
  Users,
  AlertTriangle,
  Heart,
  Search,
  Plus,
  ClipboardList,
  Phone,
  FileText,
  ExternalLink,
} from 'lucide-react'

const DEMO_EVENTS: Record<string, string> = {
  'evt-summer-retreat': 'Summer Youth Retreat 2026',
  'evt-diocesan-conference': 'Diocesan Youth Conference',
  'evt-mens-retreat': "Men's Silent Retreat",
}

interface DemoParticipant {
  id: string
  name: string
  age: number
  gender: 'M' | 'F'
  group: string
  allergies: string
  medications: string
  emergencyContact: string
  emergencyPhone: string
  flags: string[]
}

interface DemoIncident {
  id: string
  participantName: string
  type: string
  time: string
  description: string
  resolvedBy: string
  status: 'open' | 'resolved'
}

const DEMO_PARTICIPANTS: DemoParticipant[] = [
  { id: 'p1', name: 'Ana Garcia', age: 16, gender: 'F', group: "St. Mary's Youth Group", allergies: 'Peanuts (severe)', medications: 'EpiPen', emergencyContact: 'Maria Garcia', emergencyPhone: '555-0101', flags: ['Allergies', 'EpiPen'] },
  { id: 'p2', name: 'Sofia Nguyen', age: 17, gender: 'F', group: "St. Mary's Youth Group", allergies: 'None', medications: 'Albuterol inhaler', emergencyContact: 'Kim Nguyen', emergencyPhone: '555-0107', flags: ['Asthma'] },
  { id: 'p3', name: 'Ben Smith', age: 15, gender: 'M', group: "St. Mary's Youth Group", allergies: 'Shellfish', medications: 'None', emergencyContact: 'Robert Smith', emergencyPhone: '555-0110', flags: ['Allergies'] },
  { id: 'p4', name: 'Grace Kim', age: 16, gender: 'F', group: 'St. John Paul II Parish', allergies: 'None', medications: 'None', emergencyContact: 'Jennifer Kim', emergencyPhone: '555-0221', flags: [] },
  { id: 'p5', name: 'Luke Anderson', age: 17, gender: 'M', group: 'St. John Paul II Parish', allergies: 'Bee stings', medications: 'EpiPen', emergencyContact: 'Michael Anderson', emergencyPhone: '555-0224', flags: ['Allergies', 'EpiPen'] },
]

const DEMO_INCIDENTS: DemoIncident[] = [
  {
    id: 'i1',
    participantName: 'Sofia Nguyen',
    type: 'Medical',
    time: '2026-07-15T20:15:00Z',
    description: 'Mild asthma flare during opening session. Used inhaler.',
    resolvedBy: 'Nurse Kelly',
    status: 'resolved',
  },
  {
    id: 'i2',
    participantName: 'Grace Kim',
    type: 'Injury',
    time: '2026-07-16T14:22:00Z',
    description: 'Twisted ankle on stairs. Ice pack, elevated. No swelling.',
    resolvedBy: 'Nurse Kelly',
    status: 'resolved',
  },
  {
    id: 'i3',
    participantName: 'Ben Smith',
    type: 'Medical',
    time: '2026-07-17T09:05:00Z',
    description: 'Headache, dehydration suspected. Given water and rest.',
    resolvedBy: 'Nurse Kelly',
    status: 'open',
  },
]

export default function RaphaEventPage() {
  const params = useParams()
  const eventId = params?.eventId as string
  const eventName = DEMO_EVENTS[eventId]
  const [query, setQuery] = useState('')

  if (!eventName) notFound()

  const filtered = query
    ? DEMO_PARTICIPANTS.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.group.toLowerCase().includes(query.toLowerCase()),
      )
    : DEMO_PARTICIPANTS

  const withMedical = DEMO_PARTICIPANTS.filter((p) => p.medications && p.medications !== 'None').length
  const withAllergies = DEMO_PARTICIPANTS.filter((p) => p.allergies && p.allergies !== 'None').length
  const openIncidents = DEMO_INCIDENTS.filter((i) => i.status === 'open').length

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
          <span className="text-navy font-medium">Rapha Medical</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Activity className="w-7 h-7 text-red-600" />
              <h1 className="text-3xl font-bold text-navy">Rapha Medical</h1>
            </div>
            <p className="text-muted-foreground mt-1">
              Medical information and incident tracking for {eventName}
            </p>
          </div>
          <Link href={`/demo/portal/rapha/${eventId}`} className="text-sm text-red-700 hover:underline flex items-center gap-1">
            <ExternalLink className="w-4 h-4" />
            Open dedicated portal
          </Link>
        </div>
      </div>

      {/* HIPAA Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 text-sm text-blue-800">
        <strong>HIPAA Privacy Notice:</strong> Medical information is protected health information (PHI). Only access what you need.
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat icon={Users} label="Total participants" value={DEMO_PARTICIPANTS.length} color="text-navy" />
        <Stat icon={Heart} label="With medications" value={withMedical} color="text-red-700" />
        <Stat icon={AlertTriangle} label="With allergies" value={withAllergies} color="text-amber-700" />
        <Stat icon={ClipboardList} label="Open incidents" value={openIncidents} color="text-red-700" />
      </div>

      <Tabs defaultValue="participants" className="space-y-4">
        <TabsList>
          <TabsTrigger value="participants" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Participants
          </TabsTrigger>
          <TabsTrigger value="incidents" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Incidents
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="participants">
          <div className="mb-4 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search participants..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-200">
                {filtered.map((p) => (
                  <div key={p.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-navy">{p.name}</h3>
                          {p.flags.map((f) => (
                            <Badge key={f} className="bg-amber-100 text-amber-800 border border-amber-200 text-xs">
                              {f}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {p.group} · Age {p.age} · {p.gender}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Allergies:</span>{' '}
                        <span className={p.allergies !== 'None' ? 'font-medium text-red-700' : ''}>{p.allergies}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Medications:</span>{' '}
                        <span className={p.medications !== 'None' ? 'font-medium text-red-700' : ''}>{p.medications}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Emergency:</span>{' '}
                        <span className="font-medium">{p.emergencyContact}</span>
                        <span className="text-muted-foreground">·</span>
                        <span>{p.emergencyPhone}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incidents">
          <div className="mb-4 flex justify-end">
            <Button onClick={notImpl('Log incident')} className="bg-red-600 hover:bg-red-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Log Incident
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-200">
                {DEMO_INCIDENTS.map((inc) => (
                  <div key={inc.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-navy">
                            {inc.participantName} · {inc.type}
                          </h3>
                          <Badge
                            className={
                              inc.status === 'open'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-green-100 text-green-800'
                            }
                          >
                            {inc.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(inc.time).toLocaleString()} · Resolved by {inc.resolvedBy}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">{inc.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>End-of-event Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {[
                  'Full incident report (PDF)',
                  'Medical roster export',
                  'Emergency contact list',
                  'Medication administration log',
                ].map((r) => (
                  <Button
                    key={r}
                    onClick={notImpl(`Generate ${r}`)}
                    variant="outline"
                    className="justify-between"
                  >
                    <span>{r}</span>
                    <FileText className="w-4 h-4" />
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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
