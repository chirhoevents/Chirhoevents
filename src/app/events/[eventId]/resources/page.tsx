import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import ResourcePortalClient from './ResourcePortalClient'

interface PageProps {
  params: { eventId: string }
  searchParams: { [key: string]: string | string[] | undefined }
}

export default async function ResourcePortalPage({ params, searchParams }: PageProps) {
  const { eventId } = params

  // Fetch event with settings
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      settings: true,
      organization: {
        select: { name: true },
      },
    },
  })

  if (!event) {
    notFound()
  }

  // Check if portal is enabled
  const settings = event.settings
  if (!settings?.publicPortalEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Resource Portal Not Available
          </h1>
          <p className="text-gray-600">
            The resource portal for this event is not currently available.
          </p>
        </div>
      </div>
    )
  }

  return (
    <ResourcePortalClient
      eventId={eventId}
      eventName={event.name}
      organizationName={event.organization.name}
      settings={{
        showRoommateNames: true,
        showSmallGroupMembers: false,
        showSglContact: true,
      }}
    />
  )
}
