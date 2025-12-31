import { requireAdmin } from '@/lib/auth-utils'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import ReportsClient from './ReportsClient'

interface PageProps {
  params: Promise<{
    eventId: string
  }>
}

export default async function EventReportsPage({ params }: PageProps) {
  const user = await requireAdmin()
  const organizationId = await getEffectiveOrgId(user)
  const { eventId } = await params

  // Verify event exists and belongs to user's organization
  const event = await prisma.event.findUnique({
    where: {
      id: eventId,
      organizationId: organizationId,
    },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      organizationId: true,
    },
  })

  if (!event) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">
          Event Reports - {event.name}
        </h1>
        <p className="text-[#6B7280]">
          Comprehensive reports and analytics for this event
        </p>
      </div>

      <ReportsClient
        eventId={eventId}
        eventName={event.name}
        organizationId={event.organizationId}
        startDate={event.startDate.toISOString()}
        endDate={event.endDate.toISOString()}
      />
    </div>
  )
}
