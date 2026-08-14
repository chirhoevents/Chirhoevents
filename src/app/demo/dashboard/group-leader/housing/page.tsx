'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Home, Users, Bed, ArrowRight } from 'lucide-react'

interface Room {
  id: string
  building: string
  roomNumber: string
  capacity: number
  gender: 'M' | 'F'
  occupants: string[]
}

const INITIAL_ROOMS: Room[] = [
  { id: 'r1', building: 'Franciscan Hall', roomNumber: '101', capacity: 4, gender: 'F', occupants: ['Ana Garcia', 'Isabella Martinez', 'Sofia Nguyen'] },
  { id: 'r2', building: 'Franciscan Hall', roomNumber: '201', capacity: 4, gender: 'M', occupants: ['Ben Smith', 'Chris Lee', 'David O\'Connor'] },
  { id: 'r3', building: 'Franciscan Hall', roomNumber: '202', capacity: 4, gender: 'M', occupants: ['Ethan Patel'] },
  { id: 'r4', building: 'Chaperone Wing', roomNumber: 'C-1', capacity: 2, gender: 'F', occupants: ['Maria Thompson'] },
  { id: 'r5', building: 'Chaperone Wing', roomNumber: 'C-2', capacity: 2, gender: 'M', occupants: ['James Rodriguez'] },
]

const UNASSIGNED = ['Sample Leader']

export default function HousingPage() {
  const [rooms] = useState<Room[]>(INITIAL_ROOMS)
  const totalAssigned = rooms.reduce((n, r) => n + r.occupants.length, 0)
  const totalCapacity = rooms.reduce((n, r) => n + r.capacity, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F] mb-1">Housing Assignments</h1>
        <p className="text-[#6B7280]">
          {totalAssigned} of {totalAssigned + UNASSIGNED.length} participants assigned to rooms
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat icon={Home} label="Rooms available" value={rooms.length} />
        <Stat icon={Bed} label="Total beds" value={totalCapacity} />
        <Stat icon={Users} label="Assigned" value={`${totalAssigned} / ${totalAssigned + UNASSIGNED.length}`} />
      </div>

      {UNASSIGNED.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-900">Unassigned ({UNASSIGNED.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {UNASSIGNED.map((name) => (
                <Badge key={name} className="bg-white border border-amber-300 text-amber-900">
                  {name}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-amber-800 mt-3">
              In the real product, drag unassigned participants into a room card below.
            </p>
          </CardContent>
        </Card>
      )}

      {Array.from(new Set(rooms.map((r) => r.building))).map((building) => (
        <Card key={building}>
          <CardHeader>
            <CardTitle className="text-navy">{building}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms
              .filter((r) => r.building === building)
              .map((room) => (
                <div
                  key={room.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-[#9C8466] transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4 text-[#9C8466]" />
                      <span className="font-semibold text-navy">Room {room.roomNumber}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {room.gender} · {room.occupants.length}/{room.capacity}
                    </Badge>
                  </div>
                  <ul className="text-sm space-y-1">
                    {room.occupants.map((o) => (
                      <li key={o} className="flex items-center gap-1">
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        {o}
                      </li>
                    ))}
                    {Array.from({ length: room.capacity - room.occupants.length }).map((_, i) => (
                      <li key={`empty-${i}`} className="text-xs text-muted-foreground italic">
                        (empty bed)
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Roommate Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Participants can request specific roommates during registration. Fulfilled where possible.
          </p>
          <div className="space-y-2 text-sm">
            <div>
              <strong>Ana Garcia</strong> requested{' '}
              <strong>Isabella Martinez</strong>{' '}
              <Badge className="bg-emerald-100 text-emerald-800 ml-1">Fulfilled</Badge>
            </div>
            <div>
              <strong>Ben Smith</strong> requested{' '}
              <strong>Ethan Patel</strong>{' '}
              <Badge className="bg-amber-100 text-amber-800 ml-1">Different room</Badge>
            </div>
          </div>
          <Button
            onClick={() => alert('Demo: Would open a form to submit a roommate request on behalf of a participant.')}
            variant="outline"
            className="mt-4"
          >
            Submit Request
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className="h-5 w-5 text-[#9C8466]" />
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-[#1E3A5F]">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
