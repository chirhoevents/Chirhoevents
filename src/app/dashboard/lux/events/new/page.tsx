'use client'

import { use } from 'react'
import SimpleEventForm from '@/components/lux/SimpleEventForm'
import { PageHeader } from '@/components/lux/ui'

export default function NewSimpleEventPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const volunteer = use(searchParams).type === 'volunteer'
  return (
    <>
      <PageHeader
        title={volunteer ? 'New volunteer sign-up' : 'New event or sign-up'}
        description={volunteer
          ? 'Add the shifts or roles you need help with. People pick where they can serve.'
          : 'Fill in what you need. Everything else is handled for you.'}
        back={{ href: '/dashboard/lux/new', label: 'Back' }}
      />
      <SimpleEventForm startAsVolunteer={volunteer} />
    </>
  )
}
