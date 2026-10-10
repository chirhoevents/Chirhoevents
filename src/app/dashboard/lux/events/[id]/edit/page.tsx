'use client'

import { use, useEffect, useState } from 'react'
import SimpleEventForm, { type SimpleEventFormValue } from '@/components/lux/SimpleEventForm'
import { ErrorNote, PageHeader, Spinner } from '@/components/lux/ui'
import { useLuxApi } from '@/contexts/LuxContext'

export default function EditSimpleEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const api = useLuxApi()
  const [event, setEvent] = useState<(SimpleEventFormValue & { sold: { byOption: Record<string, number> } }) | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api(`/api/lux/events/${id}`).then(d => setEvent(d.event)).catch(e => setError(e.message))
  }, [api, id])

  return (
    <>
      <PageHeader title="Edit event" back={{ href: `/dashboard/lux/events/${id}`, label: 'Back to event' }} />
      <ErrorNote message={error} />
      {!event && !error && <Spinner />}
      {event && <SimpleEventForm initial={event} soldByOption={event.sold.byOption} />}
    </>
  )
}
