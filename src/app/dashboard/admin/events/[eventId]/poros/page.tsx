import { requireAdmin } from '@/lib/auth-utils'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import PorosPortalClient from './PorosPortalClient'

interface PageProps {
  params: Promise<{
    eventId: string
  }>
}

export default async function PorosPortalPage({ params }: PageProps) {
  const user = await requireAdmin()
  const organizationId = await getEffectiveOrgId(user)
  const { eventId } = await params

  // Fetch event with settings - with defensive error handling
  let event: any = null
  try {
    event = await prisma.event.findUnique({
      where: {
        id: eventId,
        organizationId: organizationId,
      },
      include: {
        settings: true,
      },
    })
  } catch (error) {
    console.error('Error fetching event with settings:', error)
    // Try without includes
    event = await prisma.event.findUnique({
      where: {
        id: eventId,
        organizationId: organizationId,
      },
    })
    if (event) {
      event.settings = null
    }
  }

  if (!event) {
    notFound()
  }

  return (
    <PorosPortalClient
      eventId={eventId}
      eventName={event.name}
      settings={event.settings || {}}
    />
  )
}
