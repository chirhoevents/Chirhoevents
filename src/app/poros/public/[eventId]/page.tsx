import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import PorosPublicClient from './PorosPublicClient'
import M2KPublicView from '@/components/poros/M2KPublicView'

// M2K specific event - hardcoded for custom portal
const M2K_EVENT_ID = 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1'
const M2K_ORG_ID = '675c8b23-70aa-4d26-b3f7-c4afdf39ebff'

interface PageProps {
  params: Promise<{ eventId: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { eventId } = await params
  let event: { name: string } | null = null
  try {
    event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { name: true }
    })
  } catch {
    // If there's an error, we'll use a default title
  }

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
  const { eventId } = await params

  let event: any = null
  try {
    event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        settings: true,
        organization: { select: { name: true } }
      }
    })
  } catch (error) {
    console.error('Error fetching event with settings:', error)
    // Try without includes
    event = await prisma.event.findUnique({
      where: { id: eventId }
    })
    if (event) {
      event.settings = null
      event.organization = { name: 'Event' }
    }
  }

  if (!event || !event.settings?.porosPublicPortalEnabled) {
    notFound()
  }

  const settings = event.settings

  // Get portal resources (handle case where table doesn't exist yet)
  let resources: any[] = []
  try {
    resources = await prisma.porosResource.findMany({
      where: { eventId, isActive: true },
      orderBy: { order: 'asc' }
    })
  } catch {
    // Table might not exist yet
  }

  // Get meal groups with times (meal times are per-color in MealGroups)
  let mealGroups: any[] = []
  try {
    mealGroups = await prisma.mealGroup.findMany({
      where: { eventId, isActive: true },
      orderBy: { displayOrder: 'asc' }
    })
  } catch {
    // Table might not exist yet
  }

  // Transform meal groups to mealTimes format for the client
  // Each color has breakfast, lunch, dinner times
  const mealTimes = mealGroups.flatMap(group => {
    const times: any[] = []
    if (group.breakfastTime) {
      times.push({
        id: `${group.id}-breakfast`,
        day: 'all', // times apply to all days
        meal: 'breakfast',
        color: group.name,
        colorHex: group.colorHex,
        time: group.breakfastTime
      })
    }
    if (group.lunchTime) {
      times.push({
        id: `${group.id}-lunch`,
        day: 'all',
        meal: 'lunch',
        color: group.name,
        colorHex: group.colorHex,
        time: group.lunchTime
      })
    }
    if (group.dinnerTime) {
      times.push({
        id: `${group.id}-dinner`,
        day: 'all',
        meal: 'dinner',
        color: group.name,
        colorHex: group.colorHex,
        time: group.dinnerTime
      })
    }
    return times
  })

  // Get schedule entries
  let scheduleEntries: any[] = []
  try {
    scheduleEntries = await prisma.porosScheduleEntry.findMany({
      where: { eventId },
      orderBy: [{ day: 'asc' }, { startTime: 'asc' }]
    })
  } catch {
    // Table might not exist yet
  }

  // Get schedule PDF if exists
  let schedulePdf: any = null
  try {
    schedulePdf = await prisma.porosSchedulePdf.findUnique({
      where: { eventId }
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

  // Check if this is the M2K event and load custom data
  const isM2KEvent = eventId === M2K_EVENT_ID && event.organizationId === M2K_ORG_ID

  if (isM2KEvent) {
    // Try to load the imported JSON data using raw SQL (Prisma model may not exist yet)
    let jsonData: any = null
    try {
      const results = await prisma.$queryRaw<any[]>`
        SELECT json_data as "jsonData"
        FROM poros_event_data_imports
        WHERE event_id = ${eventId}::uuid
        LIMIT 1
      `
      if (results.length > 0) {
        jsonData = results[0].jsonData
      }
    } catch (error) {
      console.error('Error loading M2K data import:', error)
    }

    if (jsonData) {
      // Render the custom M2K view
      return (
        <M2KPublicView
          event={{
            id: event.id,
            name: event.name,
            startDate: event.startDate.toISOString(),
            endDate: event.endDate?.toISOString() || null,
            locationName: event.locationName
          }}
          data={jsonData}
        />
      )
    }
    // If no imported data, fall through to regular view
  }

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
