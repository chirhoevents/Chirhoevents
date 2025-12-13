import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import EventDetailClient from './EventDetailClient'

interface PageProps {
  params: {
    eventId: string
  }
}

export default async function EventDetailPage({ params }: PageProps) {
  const user = await requireAdmin()
  const { eventId } = params

  // Fetch event with all related data
  const event = await prisma.event.findUnique({
    where: {
      id: eventId,
      organizationId: user.organizationId, // Ensure user can only see their org's events
    },
    include: {
      settings: true,
      pricing: true,
      groupRegistrations: {
        include: {
          participants: true,
        },
      },
      individualRegistrations: {
        include: {
          participant: true,
        },
      },
    },
  })

  if (!event) {
    notFound()
  }

  // Calculate stats
  const totalRegistrations =
    event.groupRegistrations.length + event.individualRegistrations.length

  const totalParticipants =
    event.groupRegistrations.reduce(
      (sum, reg) => sum + reg.participants.length,
      0
    ) + event.individualRegistrations.length

  // Calculate revenue (simplified - just sum up totals)
  const totalRevenue = event.groupRegistrations.reduce(
    (sum, reg) => sum + Number(reg.totalAmount || 0),
    0
  )

  const totalPaid = event.groupRegistrations.reduce(
    (sum, reg) => sum + Number(reg.amountPaid || 0),
    0
  )

  const balance = totalRevenue - totalPaid

  return (
    <EventDetailClient
      event={{
        id: event.id,
        name: event.name,
        slug: event.slug,
        description: event.description,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        status: event.status,
        locationName: event.locationName,
        locationAddress: event.locationAddress,
        capacityTotal: event.capacityTotal,
        capacityRemaining: event.capacityRemaining,
      }}
      stats={{
        totalRegistrations,
        totalParticipants,
        totalRevenue,
        totalPaid,
        balance,
      }}
      settings={event.settings}
    />
  )
}
