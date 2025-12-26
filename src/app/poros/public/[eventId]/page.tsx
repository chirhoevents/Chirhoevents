import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import PorosPublicClient from './PorosPublicClient'

interface PageProps {
  params: { eventId: string }
}

export async function generateMetadata({ params }: PageProps) {
  const event = await prisma.event.findUnique({
    where: { id: params.eventId },
    select: { name: true }
  })

  return {
    title: event ? `${event.name} - Poros Portal` : 'Poros Portal',
    description: 'Event resources, schedules, and meal times',
    manifest: '/poros-manifest.json',
    themeColor: '#1E3A5F',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: event?.name || 'Poros Portal',
    },
  }
}

export default async function PorosPublicEventPage({ params }: PageProps) {
  const event = await prisma.event.findUnique({
    where: { id: params.eventId },
    include: {
      settings: true,
      organization: { select: { name: true } }
    }
  })

  if (!event || !event.settings?.porosPublicPortalEnabled) {
    notFound()
  }

  const settings = event.settings

  // Get portal resources (handle case where table doesn't exist yet)
  let resources: any[] = []
  try {
    resources = await prisma.porosResource.findMany({
      where: { eventId: params.eventId, isActive: true },
      orderBy: { order: 'asc' }
    })
  } catch {
    // Table might not exist yet
  }

  // Get meal times configuration
  let mealTimes: any[] = []
  try {
    mealTimes = await prisma.porosMealTime.findMany({
      where: { eventId: params.eventId },
      orderBy: [{ day: 'asc' }, { meal: 'asc' }]
    })
  } catch {
    // Table might not exist yet
  }

  // Get schedule entries
  let scheduleEntries: any[] = []
  try {
    scheduleEntries = await prisma.porosScheduleEntry.findMany({
      where: { eventId: params.eventId },
      orderBy: [{ day: 'asc' }, { startTime: 'asc' }]
    })
  } catch {
    // Table might not exist yet
  }

  // Get schedule PDF if exists
  let schedulePdf: any = null
  try {
    schedulePdf = await prisma.porosSchedulePdf.findUnique({
      where: { eventId: params.eventId }
    })
  } catch {
    // Table might not exist yet
  }

  // Organize schedule by day
  const scheduleByDay = scheduleEntries.reduce((acc: any, entry: any) => {
    if (!acc[entry.day]) acc[entry.day] = []
    acc[entry.day].push(entry)
    return acc
  }, {} as Record<string, any[]>)

  return (
    <PorosPublicClient
      event={{
        id: event.id,
        name: event.name,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate?.toISOString() || null,
        locationName: event.locationName
      }}
      scheduleByDay={scheduleByDay}
      mealTimes={mealTimes}
      resources={resources}
      seatingEnabled={settings?.porosSeatingEnabled ?? false}
      schedulePdfUrl={schedulePdf?.url || null}
    />
  )
}
