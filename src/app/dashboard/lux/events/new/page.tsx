'use client'

import SimpleEventForm from '@/components/lux/SimpleEventForm'
import { PageHeader } from '@/components/lux/ui'

export default function NewSimpleEventPage() {
  return (
    <>
      <PageHeader
        title="New event or sign-up"
        description="Fill in what you need. Everything else is handled for you."
        back={{ href: '/dashboard/lux/new', label: 'Back' }}
      />
      <SimpleEventForm />
    </>
  )
}
