'use client'

import { useParams, notFound } from 'next/navigation'
import PorosPortalClient from './PorosPortalClient'

const DEMO_EVENTS: Record<string, string> = {
  'evt-summer-retreat': 'Summer Youth Retreat 2026',
  'evt-diocesan-conference': 'Diocesan Youth Conference',
  'evt-mens-retreat': "Men's Silent Retreat",
}

export default function PorosPortalPage() {
  const params = useParams()
  const eventId = params?.eventId as string
  const eventName = DEMO_EVENTS[eventId]

  if (!eventName) notFound()

  return (
    <PorosPortalClient
      eventId={eventId}
      eventName={eventName}
      settings={{
        porosHousingEnabled: true,
        porosSeatingEnabled: true,
        porosSmallGroupEnabled: true,
        porosMealColorsEnabled: true,
        porosAdaEnabled: true,
        porosConfessionsEnabled: true,
        porosInfoEnabled: true,
        porosAdorationEnabled: true,
      }}
    />
  )
}
