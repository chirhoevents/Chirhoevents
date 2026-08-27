'use client'

import { useParams, notFound } from 'next/navigation'
import EventDetailClient from './EventDetailClient'

// DEMO: hardcoded event data matching the demo Events list.
const DEMO_EVENTS: Record<string, any> = {
  'evt-summer-retreat': {
    event: {
      id: 'evt-summer-retreat',
      name: 'Summer Youth Retreat 2026',
      slug: 'summer-retreat-2026',
      description: 'Four days of prayer, worship, and formation for high-school youth. Includes lodging, meals, sacraments, and keynote speakers.',
      startDate: '2026-07-15',
      endDate: '2026-07-18',
      status: 'registration_open',
      isPublished: true,
      locationName: 'Steubenville, OH',
      locationAddress: '1235 University Blvd, Steubenville, OH 43952',
      capacityTotal: 400,
      capacityRemaining: 153,
    },
    stats: {
      totalRegistrations: 32,
      totalParticipants: 247,
      totalRevenue: 70395,
      totalPaid: 45820,
      balance: 24575,
    },
    dayPassOptions: [],
    activity: {
      recentRegistrations: [
        { id: 'r1', type: 'group' as const, name: "St. Mary's Youth Group", participants: 10, date: '2026-06-28T10:15:00Z' },
        { id: 'r2', type: 'group' as const, name: 'St. John Paul II Parish', participants: 4, date: '2026-06-25T14:20:00Z' },
        { id: 'r3', type: 'individual' as const, name: 'Emma Johnson', participants: 1, date: '2026-06-20T08:30:00Z' },
      ],
      recentPayments: [
        { id: 'p1', amount: 855, method: 'card', date: '2026-06-28T10:20:00Z', name: "St. Mary's Youth Group" },
        { id: 'p2', amount: 1140, method: 'card', date: '2026-06-25T14:25:00Z', name: 'St. John Paul II Parish' },
      ],
      trends: { today: 2, thisWeek: 7, lastWeek: 4 },
    },
  },
  'evt-diocesan-conference': {
    event: {
      id: 'evt-diocesan-conference',
      name: 'Diocesan Youth Conference',
      slug: 'diocesan-conference',
      description: 'Weekend conference for middle-school and high-school youth across the archdiocese.',
      startDate: '2026-10-03',
      endDate: '2026-10-05',
      status: 'registration_open',
      isPublished: true,
      locationName: 'Denver, CO',
      locationAddress: '1300 Colfax Ave, Denver, CO 80204',
      capacityTotal: 250,
      capacityRemaining: 161,
    },
    stats: {
      totalRegistrations: 12,
      totalParticipants: 89,
      totalRevenue: 48750,
      totalPaid: 17355,
      balance: 31395,
    },
    dayPassOptions: [],
    activity: {
      recentRegistrations: [
        { id: 'r1', type: 'group' as const, name: 'Holy Family Community', participants: 8, date: '2026-06-22T09:45:00Z' },
      ],
      recentPayments: [],
      trends: { today: 0, thisWeek: 1, lastWeek: 2 },
    },
  },
  'evt-mens-retreat': {
    event: {
      id: 'evt-mens-retreat',
      name: "Men's Silent Retreat",
      slug: 'mens-retreat',
      description: 'A traditional Ignatian silent weekend for men. Includes all meals, private room, spiritual direction available.',
      startDate: '2026-09-11',
      endDate: '2026-09-13',
      status: 'published',
      isPublished: true,
      locationName: 'Malvern, PA',
      locationAddress: '315 S Warren Ave, Malvern, PA 19355',
      capacityTotal: 120,
      capacityRemaining: 78,
    },
    stats: {
      totalRegistrations: 3,
      totalParticipants: 42,
      totalRevenue: 38400,
      totalPaid: 5245,
      balance: 33155,
    },
    dayPassOptions: [],
    activity: {
      recentRegistrations: [
        { id: 'r1', type: 'individual' as const, name: 'Thomas Wright', participants: 1, date: '2026-06-18T18:44:00Z' },
      ],
      recentPayments: [
        { id: 'p1', amount: 320, method: 'card', date: '2026-06-18T18:45:00Z', name: 'Thomas Wright' },
      ],
      trends: { today: 0, thisWeek: 0, lastWeek: 1 },
    },
  },
}

export default function EventDetailPage() {
  const params = useParams()
  const eventId = params?.eventId as string

  const data = DEMO_EVENTS[eventId]

  if (!data) {
    notFound()
  }

  return (
    <EventDetailClient
      event={data.event}
      stats={data.stats}
      settings={null}
      dayPassOptions={data.dayPassOptions}
      activity={data.activity}
    />
  )
}
