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
  const { eventId } = await Promise.resolve(params)

  // Fetch event with all related data
  let event: any = null
  try {
    event = await prisma.event.findUnique({
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
        individualRegistrations: true,
      },
    })
  } catch (error) {
    console.error('Error fetching event with includes:', error)
    // Try without includes if there's a schema issue
    event = await prisma.event.findUnique({
      where: {
        id: eventId,
        organizationId: user.organizationId,
      },
    })
    if (event) {
      event.settings = null
      event.pricing = null
      event.groupRegistrations = []
      event.individualRegistrations = []
    }
  }

  if (!event) {
    notFound()
  }

  // Fetch payment balances for this event
  let paymentBalances: any[] = []
  try {
    paymentBalances = await prisma.paymentBalance.findMany({
      where: {
        eventId: eventId,
      },
    })
  } catch (error) {
    console.error('Error fetching payment balances:', error)
  }

  // Calculate stats
  const totalRegistrations =
    event.groupRegistrations.length + event.individualRegistrations.length

  const totalParticipants =
    event.groupRegistrations.reduce(
      (sum: number, reg: any) => sum + reg.participants.length,
      0
    ) + event.individualRegistrations.length

  // Calculate revenue from payment balances
  const totalRevenue = paymentBalances.reduce(
    (sum: number, balance: any) => sum + Number(balance.totalAmountDue || 0),
    0
  )

  const totalPaid = paymentBalances.reduce(
    (sum: number, balance: any) => sum + Number(balance.amountPaid || 0),
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
