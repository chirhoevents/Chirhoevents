import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import PorosPublicClient from './PorosPublicClient'
import M2KPublicView from '@/components/poros/M2KPublicView'

// M2K specific event - hardcoded for custom portal
const M2K_EVENT_ID = 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1'
const M2K_ORG_ID = '675c8b23-70aa-4d26-b3f7-c4afdf39ebff'

// Fetch M2K data from database (live data)
async function fetchM2KDataFromDatabase(eventId: string) {
  try {
    // Check if we have groups in the database
    const groupCount = await prisma.groupRegistration.count({ where: { eventId } })
    if (groupCount === 0) return null

    // Fetch all data from database in parallel
    const [
      groups,
      mealGroups,
      mealAssignments,
      smallGroups,
      smallGroupAssignments,
      rooms,
      roomAssignments,
      schedule,
      resources,
      adaIndividuals,
    ] = await Promise.all([
      prisma.groupRegistration.findMany({
        where: { eventId },
        select: {
          id: true,
          groupName: true,
          groupCode: true, // Check-in table code like "53B"
          parishName: true,
          groupLeaderName: true,
          groupLeaderPhone: true,
          youthCount: true,
          chaperoneCount: true,
          housingType: true,
          specialRequests: true,
          adaAccommodationsSummary: true,
          participants: {
            select: { id: true, gender: true, participantType: true }
          }
        },
        orderBy: { groupName: 'asc' }
      }),
      prisma.mealGroup.findMany({
        where: { eventId, isActive: true },
        select: { id: true, name: true, colorHex: true, breakfastTime: true, lunchTime: true, dinnerTime: true },
        orderBy: { displayOrder: 'asc' }
      }),
      prisma.mealGroupAssignment.findMany({
        where: { mealGroup: { eventId } },
        select: { groupRegistrationId: true, mealGroup: { select: { name: true } } }
      }),
      prisma.smallGroup.findMany({
        where: { eventId },
        select: {
          id: true, name: true, meetingPlace: true,
          sgl: { select: { firstName: true, lastName: true } },
          coSgl: { select: { firstName: true, lastName: true } },
        }
      }),
      prisma.smallGroupAssignment.findMany({
        where: { smallGroup: { eventId } },
        select: { groupRegistrationId: true, smallGroup: { select: { id: true, meetingPlace: true } } }
      }),
      prisma.room.findMany({
        where: { building: { eventId } },
        select: { id: true, roomNumber: true, capacity: true, gender: true, notes: true, isAdaAccessible: true, building: { select: { name: true } } }
      }),
      prisma.roomAssignment.findMany({
        where: { room: { building: { eventId } } },
        select: { groupRegistrationId: true, room: { select: { roomNumber: true, gender: true, building: { select: { name: true } } } } }
      }),
      prisma.porosScheduleEntry.findMany({
        where: { eventId },
        select: { day: true, startTime: true, endTime: true, title: true, location: true },
        orderBy: [{ day: 'asc' }, { startTime: 'asc' }]
      }),
      prisma.porosResource.findMany({
        where: { eventId, isActive: true },
        select: { name: true, type: true, url: true },
        orderBy: { order: 'asc' }
      }),
      prisma.adaIndividual.findMany({
        where: { eventId },
        select: { id: true, name: true, gender: true, accessibilityNeed: true, room: { select: { roomNumber: true, building: { select: { name: true } } } } }
      }),
    ])

    // Transform to M2K format
    const youthGroups = groups.map(group => {
      const match = group.groupName.match(/\[([^\]]+)\]$/)
      const groupId = match ? match[1] : group.id
      const maleTeens = group.participants.filter(p => p.gender === 'male' && (p.participantType === 'youth_u18' || p.participantType === 'youth_o18')).length
      const femaleTeens = group.participants.filter(p => p.gender === 'female' && (p.participantType === 'youth_u18' || p.participantType === 'youth_o18')).length
      const maleChaperones = group.participants.filter(p => p.gender === 'male' && p.participantType === 'chaperone').length
      const femaleChaperones = group.participants.filter(p => p.gender === 'female' && p.participantType === 'chaperone').length

      const groupSmallGroupAssignment = smallGroupAssignments.find(a => a.groupRegistrationId === group.id)
      const smallGroup = groupSmallGroupAssignment ? smallGroups.find(sg => sg.id === groupSmallGroupAssignment.smallGroup.id) : null

      return {
        id: groupId,
        groupCode: group.groupCode || undefined, // Check-in table code like "53B"
        dbId: group.id,
        parish: group.parishName || group.groupName.replace(/\s*\[[^\]]+\]$/, ''),
        leader: group.groupLeaderName,
        phone: group.groupLeaderPhone,
        maleTeens: maleTeens || Math.floor((group.youthCount || 0) / 2),
        femaleTeens: femaleTeens || Math.ceil((group.youthCount || 0) / 2),
        maleChaperones: maleChaperones || Math.floor((group.chaperoneCount || 0) / 2),
        femaleChaperones: femaleChaperones || Math.ceil((group.chaperoneCount || 0) / 2),
        stayingOffCampus: group.housingType === 'off_campus',
        specialAccommodations: group.specialRequests || group.adaAccommodationsSummary || undefined,
        seminarianSgl: smallGroup?.sgl ? `${smallGroup.sgl.firstName} ${smallGroup.sgl.lastName}` : undefined,
        religious: smallGroup?.coSgl ? `${smallGroup.coSgl.firstName} ${smallGroup.coSgl.lastName}` : undefined,
      }
    })

    // Build maps
    const mealColorAssignments: Record<string, string> = {}
    for (const assignment of mealAssignments) {
      if (assignment.groupRegistrationId) {
        const group = groups.find(g => g.id === assignment.groupRegistrationId)
        if (group) {
          const match = group.groupName.match(/\[([^\]]+)\]$/)
          const groupId = match ? match[1] : group.id
          mealColorAssignments[groupId] = assignment.mealGroup.name
        }
      }
    }

    const mealTimes: Record<string, any> = {}
    for (const mg of mealGroups) {
      mealTimes[mg.name] = {
        satBreakfast: mg.breakfastTime || '',
        satLunch: mg.lunchTime || '',
        satDinner: mg.dinnerTime || '',
        sunBreakfast: mg.breakfastTime || '',
      }
    }

    const housingAssignments = { male: {} as Record<string, string[]>, female: {} as Record<string, string[]> }
    for (const assignment of roomAssignments) {
      if (!assignment.groupRegistrationId) continue
      const group = groups.find(g => g.id === assignment.groupRegistrationId)
      if (!group) continue
      const match = group.groupName.match(/\[([^\]]+)\]$/)
      const groupId = match ? match[1] : group.id
      const roomKey = `${assignment.room.building.name}-${assignment.room.roomNumber}`
      const gender = assignment.room.gender === 'male' ? 'male' : 'female'
      if (!housingAssignments[gender][groupId]) housingAssignments[gender][groupId] = []
      if (!housingAssignments[gender][groupId].includes(roomKey)) housingAssignments[gender][groupId].push(roomKey)
    }

    const smallGroupAssignmentsMap: Record<string, string[]> = {}
    for (const assignment of smallGroupAssignments) {
      if (!assignment.groupRegistrationId) continue
      const group = groups.find(g => g.id === assignment.groupRegistrationId)
      if (!group) continue
      const match = group.groupName.match(/\[([^\]]+)\]$/)
      const groupId = match ? match[1] : group.id
      const meetingPlace = assignment.smallGroup.meetingPlace || 'TBD'
      if (!smallGroupAssignmentsMap[groupId]) smallGroupAssignmentsMap[groupId] = []
      if (!smallGroupAssignmentsMap[groupId].includes(meetingPlace)) smallGroupAssignmentsMap[groupId].push(meetingPlace)
    }

    const roomsData = rooms.map(room => ({
      building: room.building.name,
      roomId: room.roomNumber,
      type: 'housing' as const,
      gender: room.gender || 'mixed',
      capacity: room.capacity,
      features: room.notes || '',
    }))

    const scheduleData: Record<string, any[]> = {}
    for (const entry of schedule) {
      const day = entry.day.toLowerCase()
      if (!scheduleData[day]) scheduleData[day] = []
      scheduleData[day].push({ startTime: entry.startTime, endTime: entry.endTime || '', event: entry.title, location: entry.location || '' })
    }

    const resourcesData = resources.map(r => ({ emoji: r.type === 'map' ? '🗺️' : '📚', name: r.name, url: r.url }))

    const adaData = adaIndividuals.map(ada => ({
      id: ada.id, name: ada.name, gender: ada.gender || 'unknown', groupId: '',
      accessibility: ada.accessibilityNeed, roomAssignment: ada.room ? `${ada.room.building.name}-${ada.room.roomNumber}` : '',
    }))

    return {
      youthGroups, rooms: roomsData, housingAssignments, smallGroupAssignments: smallGroupAssignmentsMap,
      mealColorAssignments, mealTimes, activeColors: mealGroups.map(mg => mg.name),
      schedule: scheduleData, resources: resourcesData, adaIndividuals: adaData,
      _source: 'database',
    }
  } catch (error) {
    console.error('Error fetching M2K data from database:', error)
    return null
  }
}

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
    // First try to load from database (live data)
    let m2kData = await fetchM2KDataFromDatabase(eventId)

    // If no database data, fall back to JSON blob
    if (!m2kData) {
      try {
        const results = await prisma.$queryRaw<any[]>`
          SELECT json_data as "jsonData"
          FROM poros_event_data_imports
          WHERE event_id = ${eventId}::uuid
          LIMIT 1
        `
        if (results.length > 0 && results[0].jsonData) {
          m2kData = results[0].jsonData
        }
      } catch (error) {
        console.error('Error loading M2K data import:', error)
      }
    }

    if (m2kData) {
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
          data={m2kData}
        />
      )
    }
    // If no data at all, fall through to regular view
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
