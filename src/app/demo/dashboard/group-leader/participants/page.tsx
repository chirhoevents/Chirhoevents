'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Search,
  CheckCircle,
  AlertCircle,
  Mail,
  Phone,
} from 'lucide-react'

interface Participant {
  id: string
  firstName: string
  lastName: string
  role: 'participant' | 'chaperone' | 'leader'
  age: number
  gender: 'M' | 'F'
  email?: string
  phone?: string
  liabilitySigned: boolean
}

const INITIAL: Participant[] = [
  { id: 'p1', firstName: 'Ana', lastName: 'Garcia', role: 'participant', age: 16, gender: 'F', email: 'ana.g@example.com', liabilitySigned: true },
  { id: 'p2', firstName: 'Isabella', lastName: 'Martinez', role: 'participant', age: 15, gender: 'F', email: 'isa.m@example.com', liabilitySigned: true },
  { id: 'p3', firstName: 'Sofia', lastName: 'Nguyen', role: 'participant', age: 17, gender: 'F', liabilitySigned: true },
  { id: 'p4', firstName: 'Ben', lastName: 'Smith', role: 'participant', age: 15, gender: 'M', liabilitySigned: false },
  { id: 'p5', firstName: 'Chris', lastName: 'Lee', role: 'participant', age: 17, gender: 'M', liabilitySigned: true },
  { id: 'p6', firstName: 'David', lastName: "O'Connor", role: 'participant', age: 16, gender: 'M', liabilitySigned: true },
  { id: 'p7', firstName: 'Ethan', lastName: 'Patel', role: 'participant', age: 14, gender: 'M', liabilitySigned: false },
  { id: 'p8', firstName: 'Maria', lastName: 'Thompson', role: 'chaperone', age: 42, gender: 'F', email: 'mthompson@stmarys.org', phone: '555-0142', liabilitySigned: true },
  { id: 'p9', firstName: 'James', lastName: 'Rodriguez', role: 'chaperone', age: 38, gender: 'M', email: 'jrod@stmarys.org', phone: '555-0138', liabilitySigned: true },
  { id: 'p10', firstName: 'Sample', lastName: 'Leader', role: 'leader', age: 35, gender: 'F', email: 'leader@example.com', phone: '555-0100', liabilitySigned: false },
]

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>(INITIAL)
  const [query, setQuery] = useState('')

  const filtered = participants.filter((p) =>
    `${p.firstName} ${p.lastName}`.toLowerCase().includes(query.toLowerCase()),
  )

  const remove = (id: string) => {
    if (!confirm('Remove this participant?')) return
    setParticipants((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F] mb-1">Participants</h1>
          <p className="text-[#6B7280]">{participants.length} in your group</p>
        </div>
        <Button
          onClick={() => alert('Demo: Would open a form to add a new participant to your group.')}
          className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Participant
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search participants..."
          className="pl-10"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-200">
            {filtered.map((p) => (
              <div key={p.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[#9C8466] text-white flex items-center justify-center font-semibold flex-shrink-0">
                    {p.firstName[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-[#1E3A5F]">
                        {p.firstName} {p.lastName}
                      </h3>
                      <Badge variant="secondary" className="capitalize text-xs">{p.role}</Badge>
                      {p.liabilitySigned ? (
                        <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Waiver signed
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800 text-xs">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Waiver pending
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Age {p.age} · {p.gender}
                    </div>
                    {(p.email || p.phone) && (
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        {p.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {p.email}
                          </span>
                        )}
                        {p.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {p.phone}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    onClick={() => alert(`Demo: Would open edit form for ${p.firstName} ${p.lastName}.`)}
                    variant="ghost"
                    size="sm"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button onClick={() => remove(p.id)} variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
