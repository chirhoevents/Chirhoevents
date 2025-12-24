import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import PorosPortalClient from './PorosPortalClient'

interface PageProps {
  params: {
    eventId: string
  }
}

export default async function PorosPortalPage({ params }: PageProps) {
  const user = await requireAdmin()
  const { eventId } = params

  // Fetch event with settings
  const event = await prisma.event.findUnique({
    where: {
      id: eventId,
      organizationId: user.organizationId,
    },
    include: {
      settings: true,
    },
  })

  if (!event) {
    notFound()
  }

  return (
    <PorosPortalClient
      eventId={eventId}
      eventName={event.name}
      settings={event.settings}
    />
  )
}
