'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, Users, ArrowLeft } from 'lucide-react'

interface DemoEvent {
  id: string
  name: string
  slug: string
  startDate: string
  endDate: string
  location: string
  price: number
  capacity: number
  registered: number
  description: string
  status: 'open' | 'closing_soon' | 'waitlist'
}

const EVENTS: DemoEvent[] = [
  {
    id: 'evt-summer-retreat', name: 'Summer Youth Retreat 2026', slug: 'summer-retreat-2026',
    startDate: '2026-07-15', endDate: '2026-07-18',
    location: 'Steubenville, OH',
    price: 285, capacity: 400, registered: 247,
    description: 'Four days of prayer, worship, and formation for high-school youth. Includes lodging, meals, sacraments, and keynote speakers.',
    status: 'open',
  },
  {
    id: 'evt-diocesan-conference', name: 'Diocesan Youth Conference', slug: 'diocesan-conference',
    startDate: '2026-10-03', endDate: '2026-10-05',
    location: 'Denver, CO',
    price: 195, capacity: 250, registered: 89,
    description: 'Weekend conference for middle-school and high-school youth across the archdiocese.',
    status: 'open',
  },
  {
    id: 'evt-mens-retreat', name: "Men's Silent Retreat", slug: 'mens-retreat',
    startDate: '2026-09-11', endDate: '2026-09-13',
    location: 'Malvern, PA',
    price: 320, capacity: 120, registered: 108,
    description: 'A traditional Ignatian silent weekend for men. Includes all meals, private room, spiritual direction available.',
    status: 'closing_soon',
  },
]

export default function PublicEventsPage() {
  return (
    <div className="min-h-[calc(100vh-36px)] bg-white">
      <header className="bg-[#1E3A5F] text-white">
        <div className="max-w-6xl mx-auto px-4 py-8 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-[#E1D5BA]">Steubenville Ministries</p>
            <h1 className="text-3xl font-bold">Upcoming Events</h1>
          </div>
          <Link href="/demo" className="text-sm text-white/80 hover:text-white underline flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Demo home
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <p className="text-slate-700">
          Browse events and start a registration. Choose Individual to register one person, or Group to reserve seats for a parish or ministry.
        </p>

        <div className="grid gap-6">
          {EVENTS.map((event) => (
            <Card key={event.id} className="hover:shadow-md transition">
              <CardContent className="p-6">
                <div className="flex flex-wrap justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="text-2xl font-bold text-[#1E3A5F]">{event.name}</h2>
                      {event.status === 'closing_soon' && (
                        <Badge className="bg-amber-100 text-amber-800">Closing soon</Badge>
                      )}
                      {event.status === 'waitlist' && (
                        <Badge className="bg-blue-100 text-blue-800">Waitlist only</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {event.startDate} → {event.endDate}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {event.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {event.registered} / {event.capacity} registered
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-[#1E3A5F]">${event.price}</div>
                    <div className="text-xs text-slate-500">per person</div>
                  </div>
                </div>
                <p className="text-slate-700 mb-4">{event.description}</p>
                <div className="flex flex-wrap gap-3">
                  <Link href={`/demo/register/individual?event=${event.id}`}>
                    <Button className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white">
                      Register as Individual
                    </Button>
                  </Link>
                  <Link href={`/demo/register/group?event=${event.id}`}>
                    <Button
                      variant="outline"
                      className="border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white"
                    >
                      Register a Group
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
