'use client'

import { useState } from 'react'
import { useParams, useRouter, notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Save, Plus, Trash2, User, Users } from 'lucide-react'

const DEMO_EVENTS: Record<string, string> = {
  'evt-summer-retreat': 'Summer Youth Retreat 2026',
  'evt-diocesan-conference': 'Diocesan Youth Conference',
  'evt-mens-retreat': "Men's Silent Retreat",
}

interface Participant {
  id: string
  firstName: string
  lastName: string
  age: string
  role: 'participant' | 'chaperone' | 'leader'
}

export default function NewManualRegistrationPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params?.eventId as string
  const eventName = DEMO_EVENTS[eventId]
  const [type, setType] = useState<'group' | 'individual'>('group')
  const [groupName, setGroupName] = useState('')
  const [leaderName, setLeaderName] = useState('')
  const [leaderEmail, setLeaderEmail] = useState('')
  const [leaderPhone, setLeaderPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [participants, setParticipants] = useState<Participant[]>([
    { id: 'p1', firstName: '', lastName: '', age: '', role: 'participant' },
  ])
  const [markPaid, setMarkPaid] = useState(false)
  const [saving, setSaving] = useState(false)

  if (!eventName) notFound()

  const setP = (id: string, field: keyof Participant, value: string) => {
    setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)))
  }

  const addParticipant = () => {
    setParticipants((prev) => [...prev, { id: `p-${Math.random().toString(36).slice(2, 6)}`, firstName: '', lastName: '', age: '', role: 'participant' }])
  }

  const removeParticipant = (id: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== id))
  }

  const submit = () => {
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      alert(`Demo: Would create a manual registration for ${type === 'group' ? groupName : `${participants[0].firstName} ${participants[0].lastName}`}${markPaid ? ' and mark it paid' : ''}. Redirecting…`)
      router.push(`/demo/dashboard/admin/events/${eventId}/registrations`)
    }, 500)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/demo/dashboard/admin" className="hover:text-navy">Dashboard</Link>
        <span>/</span>
        <Link href="/demo/dashboard/admin/events" className="hover:text-navy">Events</Link>
        <span>/</span>
        <Link href={`/demo/dashboard/admin/events/${eventId}`} className="hover:text-navy">{eventName}</Link>
        <span>/</span>
        <Link href={`/demo/dashboard/admin/events/${eventId}/registrations`} className="hover:text-navy">Registrations</Link>
        <span>/</span>
        <span className="text-navy font-medium">New Manual Registration</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-navy">Add Manual Registration</h1>
        <p className="text-muted-foreground">
          Add a registration on someone&apos;s behalf (walk-ins, transfers, mail-in signups)
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-navy">Registration Type</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <label className={`p-4 border-2 rounded-lg cursor-pointer ${type === 'group' ? 'border-navy bg-navy/5' : 'border-gray-200'}`}>
              <input type="radio" checked={type === 'group'} onChange={() => setType('group')} className="mr-2" />
              <Users className="w-4 h-4 inline mr-1 text-navy" />
              <span className="font-medium text-navy">Group</span>
              <p className="text-xs text-muted-foreground mt-1 ml-1">Multiple participants under a group leader</p>
            </label>
            <label className={`p-4 border-2 rounded-lg cursor-pointer ${type === 'individual' ? 'border-navy bg-navy/5' : 'border-gray-200'}`}>
              <input type="radio" checked={type === 'individual'} onChange={() => setType('individual')} className="mr-2" />
              <User className="w-4 h-4 inline mr-1 text-navy" />
              <span className="font-medium text-navy">Individual</span>
              <p className="text-xs text-muted-foreground mt-1 ml-1">One participant registering themselves</p>
            </label>
          </div>
        </CardContent>
      </Card>

      {type === 'group' && (
        <Card>
          <CardHeader><CardTitle className="text-navy">Group Info</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Group / Parish name</Label>
              <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Leader name</Label>
                <Input value={leaderName} onChange={(e) => setLeaderName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Leader email</Label>
                <Input type="email" value={leaderEmail} onChange={(e) => setLeaderEmail(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Leader phone</Label>
              <Input value={leaderPhone} onChange={(e) => setLeaderPhone(e.target.value)} className="mt-1 max-w-xs" />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-navy">Participants</CardTitle>
            {type === 'group' && (
              <Button onClick={addParticipant} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Participant
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {(type === 'individual' ? participants.slice(0, 1) : participants).map((p, i) => (
            <div key={p.id} className="p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-navy">Participant {i + 1}</p>
                {type === 'group' && participants.length > 1 && (
                  <Button onClick={() => removeParticipant(p.id)} variant="ghost" size="sm" className="text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Input value={p.firstName} onChange={(e) => setP(p.id, 'firstName', e.target.value)} placeholder="First name" />
                <Input value={p.lastName} onChange={(e) => setP(p.id, 'lastName', e.target.value)} placeholder="Last name" />
                <Input type="number" value={p.age} onChange={(e) => setP(p.id, 'age', e.target.value)} placeholder="Age" />
                <select
                  value={p.role}
                  onChange={(e) => setP(p.id, 'role', e.target.value)}
                  className="rounded border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="participant">Participant</option>
                  <option value="chaperone">Chaperone</option>
                  <option value="leader">Leader</option>
                </select>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-navy">Payment</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={markPaid} onChange={(e) => setMarkPaid(e.target.checked)} />
            <span>Mark as paid immediately (paid by check, cash, or comp)</span>
          </label>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Check #12345 · Received in mail · etc." className="mt-1" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Link href={`/demo/dashboard/admin/events/${eventId}/registrations`}>
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Cancel
          </Button>
        </Link>
        <Button onClick={submit} disabled={saving} className="bg-navy hover:bg-navy/90 text-white">
          <Save className="w-4 h-4 mr-1" />
          {saving ? 'Saving…' : 'Create Registration'}
        </Button>
      </div>
    </div>
  )
}
