'use client'

import { useState } from 'react'
import { useParams, notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UserCheck, ArrowLeft, Plus, Mail, Phone, Trash2 } from 'lucide-react'

const DEMO_EVENTS: Record<string, string> = {
  'evt-summer-retreat': 'Summer Youth Retreat 2026',
  'evt-diocesan-conference': 'Diocesan Youth Conference',
  'evt-mens-retreat': "Men's Silent Retreat",
}

interface StaffMember {
  id: string
  name: string
  email: string
  phone: string
  role: string
  shifts: string[]
  status: 'confirmed' | 'invited' | 'declined'
}

const INITIAL_STAFF: StaffMember[] = [
  { id: 's1', name: 'Kelly Rivera', email: 'kelly@example.com', phone: '555-0501', role: 'Head Nurse', shifts: ['All days'], status: 'confirmed' },
  { id: 's2', name: 'Fr. Anthony Mullen', email: 'fanthony@example.com', phone: '555-0502', role: 'Chaplain', shifts: ['All days'], status: 'confirmed' },
  { id: 's3', name: 'David Park', email: 'dpark@example.com', phone: '555-0503', role: 'Security', shifts: ['Day 1 · Day 2'], status: 'confirmed' },
  { id: 's4', name: 'Jennifer Wu', email: 'jwu@example.com', phone: '555-0504', role: 'Registration', shifts: ['Day 1 arrival'], status: 'confirmed' },
  { id: 's5', name: 'Miguel Santos', email: 'msantos@example.com', phone: '555-0505', role: 'AV / Tech', shifts: ['All days'], status: 'invited' },
  { id: 's6', name: 'Rachel Kim', email: 'rkim@example.com', phone: '555-0506', role: 'Hospitality', shifts: ['Day 2 · Day 3'], status: 'invited' },
]

const statusColors: Record<string, string> = {
  confirmed: 'bg-emerald-100 text-emerald-800',
  invited: 'bg-amber-100 text-amber-800',
  declined: 'bg-red-100 text-red-800',
}

export default function StaffPage() {
  const params = useParams()
  const eventId = params?.eventId as string
  const eventName = DEMO_EVENTS[eventId]
  const [staff, setStaff] = useState<StaffMember[]>(INITIAL_STAFF)

  if (!eventName) notFound()

  const remove = (id: string) => setStaff((prev) => prev.filter((s) => s.id !== id))

  const confirmed = staff.filter((s) => s.status === 'confirmed').length
  const invited = staff.filter((s) => s.status === 'invited').length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/demo/dashboard/admin" className="hover:text-navy">Dashboard</Link>
        <span>/</span>
        <Link href="/demo/dashboard/admin/events" className="hover:text-navy">Events</Link>
        <span>/</span>
        <Link href={`/demo/dashboard/admin/events/${eventId}`} className="hover:text-navy">{eventName}</Link>
        <span>/</span>
        <span className="text-navy font-medium">Staff</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <UserCheck className="w-7 h-7 text-navy" />
            <h1 className="text-2xl font-bold text-navy">Staff & Volunteers</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            {confirmed} confirmed · {invited} invited · {staff.length} total
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/demo/dashboard/admin/events/${eventId}`}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </Link>
          <Button
            onClick={() => alert('Demo: Would open a form to invite a staff member by email with a role.')}
            className="bg-navy hover:bg-navy/90 text-white"
          >
            <Plus className="w-4 h-4 mr-1" />
            Invite Staff
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Staff Roster</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-200">
            {staff.map((s) => (
              <div key={s.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#9C8466] text-white flex items-center justify-center font-semibold">
                    {s.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-navy">{s.name}</h3>
                      <Badge className={statusColors[s.status]}>{s.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {s.role} · {s.shifts.join(' · ')}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {s.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {s.phone}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => remove(s.id)}
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
