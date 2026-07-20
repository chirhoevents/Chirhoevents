'use client'

import { useState } from 'react'
import { useParams, notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Activity,
  Search,
  AlertTriangle,
  Heart,
  Phone,
  Plus,
  ArrowLeft,
  ClipboardList,
} from 'lucide-react'
import { MEDICAL_REPORT } from '../../../lib/report-data'

const DEMO_EVENTS: Record<string, string> = {
  'evt-summer-retreat': 'Summer Youth Retreat 2026',
  'evt-diocesan-conference': 'Diocesan Youth Conference',
  'evt-mens-retreat': "Men's Silent Retreat",
}

interface Incident {
  id: string
  participantName: string
  type: 'Medical' | 'Injury' | 'Behavioral' | 'Other'
  description: string
  actionTaken: string
  resolvedBy: string
  time: string
  status: 'open' | 'resolved'
}

const INITIAL_INCIDENTS: Incident[] = [
  {
    id: 'i1', participantName: 'Sofia Nguyen', type: 'Medical',
    description: 'Mild asthma flare during opening session. Used inhaler.',
    actionTaken: 'Rested 20 min in medical room, symptoms cleared.',
    resolvedBy: 'Nurse Kelly', time: '2026-07-15T20:15:00Z', status: 'resolved',
  },
  {
    id: 'i2', participantName: 'Grace Kim', type: 'Injury',
    description: 'Twisted ankle on stairs. Ice pack, elevated.',
    actionTaken: 'Rested 45 min, no swelling. Cleared to continue.',
    resolvedBy: 'Nurse Kelly', time: '2026-07-16T14:22:00Z', status: 'resolved',
  },
]

export default function RaphaDedicatedPortal() {
  const params = useParams()
  const eventId = params?.eventId as string
  const eventName = DEMO_EVENTS[eventId]
  const [participants] = useState(MEDICAL_REPORT)
  const [incidents, setIncidents] = useState<Incident[]>(INITIAL_INCIDENTS)
  const [query, setQuery] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({
    participantName: '',
    type: 'Medical' as Incident['type'],
    description: '',
    actionTaken: '',
    resolvedBy: 'Nurse on duty',
  })

  if (!eventName) notFound()

  const filtered = query
    ? participants.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    : participants

  const withAllergies = participants.filter((p) => p.allergies !== 'None').length
  const withMeds = participants.filter((p) => p.medications !== 'None').length
  const openInc = incidents.filter((i) => i.status === 'open').length

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setIncidents((prev) => [
      {
        id: `i-${Math.random().toString(36).slice(2, 8)}`,
        ...newForm,
        time: new Date().toISOString(),
        status: 'resolved',
      },
      ...prev,
    ])
    setShowNew(false)
    setNewForm({ participantName: '', type: 'Medical', description: '', actionTaken: '', resolvedBy: 'Nurse on duty' })
  }

  return (
    <div className="min-h-[calc(100vh-36px)] bg-[#F5F1E8]">
      <header className="bg-red-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/80">Rapha Medical Portal</p>
              <h1 className="text-2xl font-bold">{eventName}</h1>
            </div>
            <Link href="/demo" className="text-sm text-white/80 hover:text-white underline flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              Demo home
            </Link>
          </div>
        </div>
        <div className="bg-blue-100 text-blue-900 text-xs px-4 py-2 border-t border-blue-200">
          <strong>HIPAA:</strong> Protected health information. Access only what you need for care.
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Participants" value={participants.length} color="text-navy" />
          <Stat label="With allergies" value={withAllergies} color="text-red-700" />
          <Stat label="On medications" value={withMeds} color="text-red-700" />
          <Stat label="Open incidents" value={openInc} color="text-amber-700" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Participant lookup */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy">Participant Lookup</h2>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name..."
                className="pl-10"
              />
            </div>
            <div className="space-y-3">
              {filtered.map((p) => (
                <Card key={p.name}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-navy">{p.name}</h3>
                        <p className="text-xs text-muted-foreground">{p.group}</p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {p.allergies !== 'None' && (
                          <Badge className="bg-red-100 text-red-800 text-xs">Allergy</Badge>
                        )}
                        {p.medications !== 'None' && (
                          <Badge className="bg-amber-100 text-amber-800 text-xs">Meds</Badge>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-1 text-sm mt-3">
                      <div>
                        <span className="text-muted-foreground">Allergies:</span>{' '}
                        <span className={p.allergies !== 'None' ? 'font-medium text-red-700' : ''}>{p.allergies}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Medications:</span>{' '}
                        <span className={p.medications !== 'None' ? 'font-medium text-red-700' : ''}>{p.medications}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Dietary:</span> {p.dietary}
                      </div>
                      {p.notes && (
                        <div className="text-xs text-muted-foreground italic mt-1">{p.notes}</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Incidents */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy">Incident Log</h2>
              <Button
                onClick={() => setShowNew(true)}
                className="bg-red-700 hover:bg-red-800 text-white"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                Log Incident
              </Button>
            </div>

            {showNew && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-navy">New Incident</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={submit} className="space-y-3">
                    <div>
                      <Label>Participant</Label>
                      <select
                        value={newForm.participantName}
                        onChange={(e) => setNewForm({ ...newForm, participantName: e.target.value })}
                        required
                        className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
                      >
                        <option value="">Select participant…</option>
                        {participants.map((p) => (
                          <option key={p.name} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Type</Label>
                      <select
                        value={newForm.type}
                        onChange={(e) => setNewForm({ ...newForm, type: e.target.value as Incident['type'] })}
                        className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
                      >
                        <option>Medical</option>
                        <option>Injury</option>
                        <option>Behavioral</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea value={newForm.description} onChange={(e) => setNewForm({ ...newForm, description: e.target.value })} required rows={2} className="mt-1" />
                    </div>
                    <div>
                      <Label>Action taken</Label>
                      <Textarea value={newForm.actionTaken} onChange={(e) => setNewForm({ ...newForm, actionTaken: e.target.value })} required rows={2} className="mt-1" />
                    </div>
                    <div>
                      <Label>Resolved by</Label>
                      <Input value={newForm.resolvedBy} onChange={(e) => setNewForm({ ...newForm, resolvedBy: e.target.value })} className="mt-1" />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="bg-red-700 hover:bg-red-800 text-white">Save</Button>
                      <Button type="button" onClick={() => setShowNew(false)} variant="outline">Cancel</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              {incidents.map((inc) => (
                <Card key={inc.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-navy">{inc.participantName}</h3>
                          <Badge variant="secondary">{inc.type}</Badge>
                          <Badge className={inc.status === 'open' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}>
                            {inc.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{new Date(inc.time).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="text-sm space-y-1">
                      <p><strong>What happened:</strong> {inc.description}</p>
                      <p><strong>Action taken:</strong> {inc.actionTaken}</p>
                      <p className="text-xs text-muted-foreground">Resolved by {inc.resolvedBy}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Emergency contacts quick card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-navy flex items-center gap-2">
              <Phone className="w-5 h-5 text-red-700" />
              Emergency Contacts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="p-3 bg-red-50 rounded border border-red-200">
                <p className="font-semibold text-red-900">911 · Emergency</p>
                <p className="text-red-800">Fire, EMS, Police</p>
              </div>
              <div className="p-3 bg-gray-50 rounded border border-gray-200">
                <p className="font-semibold">Trinity Health System</p>
                <p className="text-muted-foreground">(740) 264-8000</p>
              </div>
              <div className="p-3 bg-gray-50 rounded border border-gray-200">
                <p className="font-semibold">Event Director</p>
                <p className="text-muted-foreground">Sample Director · (555) 555-1234</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-xl font-bold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  )
}
