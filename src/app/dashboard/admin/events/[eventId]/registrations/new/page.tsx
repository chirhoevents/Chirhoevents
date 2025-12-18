import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import ManualRegistrationForm from './ManualRegistrationForm'

interface PageProps {
  params: {
    eventId: string
  }
}

export default async function NewManualRegistrationPage({ params }: PageProps) {
  const user = await requireAdmin()
  const { eventId } = params

  // Verify event exists and belongs to user's organization
  const event = await prisma.event.findUnique({
    where: {
      id: eventId,
      organizationId: user.organizationId,
    },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      pricing: {
        select: {
          youthRegularPrice: true,
          chaperoneRegularPrice: true,
          onCampusYouthPrice: true,
          offCampusYouthPrice: true,
          dayPassYouthPrice: true,
          onCampusChaperonePrice: true,
          offCampusChaperonePrice: true,
          dayPassChaperonePrice: true,
        },
      },
    },
  })

  if (!event) {
    notFound()
  }

  return (
    <ManualRegistrationForm
      event={{
        ...event,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        pricing: event.pricing ? {
          youthRegularPrice: Number(event.pricing.youthRegularPrice),
          chaperoneRegularPrice: Number(event.pricing.chaperoneRegularPrice),
          onCampusYouthPrice: event.pricing.onCampusYouthPrice ? Number(event.pricing.onCampusYouthPrice) : null,
          offCampusYouthPrice: event.pricing.offCampusYouthPrice ? Number(event.pricing.offCampusYouthPrice) : null,
          dayPassYouthPrice: event.pricing.dayPassYouthPrice ? Number(event.pricing.dayPassYouthPrice) : null,
          onCampusChaperonePrice: event.pricing.onCampusChaperonePrice ? Number(event.pricing.onCampusChaperonePrice) : null,
          offCampusChaperonePrice: event.pricing.offCampusChaperonePrice ? Number(event.pricing.offCampusChaperonePrice) : null,
          dayPassChaperonePrice: event.pricing.dayPassChaperonePrice ? Number(event.pricing.dayPassChaperonePrice) : null,
        } : null,
      }}
      organizationId={user.organizationId}
    />
  )
}
