import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import PorosLiabilityClient from './PorosLiabilityClient'

interface PageProps {
  params: Promise<{
    eventId: string
  }>
}

export default async function PorosLiabilityPage({ params }: PageProps) {
  const user = await requireAdmin()
  const { eventId } = await params

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
    <PorosLiabilityClient
      eventId={eventId}
      eventName={event.name}
      organizationId={user.organizationId}
    />
  )
}
