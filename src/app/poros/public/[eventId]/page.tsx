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
          // Direct small group assignments
          smallGroupRoom: {
            select: { roomNumber: true, building: { select: { name: true } } }
          },
          groupStaffAssignments: {
            select: {
              role: true,
              staff: { select: { firstName: true, lastName: true } }
            }
          },
          participants: {
            select: { id: true, gender: true, participantType: true }
          }
        },
        orderBy: { groupName: 'asc' }
      }),
      prisma.mealGroup.findMany({
        where: { eventId, isActive: true },
        select: { id: true, name: true, colorHex: true, breakfastTime: true, lunchTime: true, dinnerTime: true, sundayBreakfastTime: true },
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

      // Get direct staff assignments from group (new model)
      const directSgls = group.groupStaffAssignments
        ?.filter((a: { role: string }) => a.role === 'sgl')
        .map((a: { staff: { firstName: string; lastName: string } }) => `${a.staff.firstName} ${a.staff.lastName}`) || []
      const directReligious = group.groupStaffAssignments
        ?.filter((a: { role: string }) => a.role === 'religious')
        .map((a: { staff: { firstName: string; lastName: string } }) => `${a.staff.firstName} ${a.staff.lastName}`) || []

      // Fallback to old SmallGroup model if no direct assignments
      const groupSmallGroupAssignment = smallGroupAssignments.find(a => a.groupRegistrationId === group.id)
      const smallGroup = groupSmallGroupAssignment ? smallGroups.find(sg => sg.id === groupSmallGroupAssignment.smallGroup.id) : null

      // Get SGL and religious names (prefer direct assignments)
      const sglNames = directSgls.length > 0
        ? directSgls.join(', ')
        : (smallGroup?.sgl ? `${smallGroup.sgl.firstName} ${smallGroup.sgl.lastName}` : undefined)
      const religiousNames = directReligious.length > 0
        ? directReligious.join(', ')
        : (smallGroup?.coSgl ? `${smallGroup.coSgl.firstName} ${smallGroup.coSgl.lastName}` : undefined)

      return {
        id: groupId,
        groupCode: group.groupCode || undefined, // Check-in table code like "53B"
        dbId: group.id,
        parish: group.parishName || group.groupName.replace(/\s*\[[^\]]+\]$/, ''),
        leader: group.groupLeaderName,
        phone: group.groupLeaderPhone,
        maleTeens,
        femaleTeens,
        maleChaperones,
        femaleChaperones,
        stayingOffCampus: group.housingType === 'off_campus',
        specialAccommodations: group.specialRequests || group.adaAccommodationsSummary || undefined,
        seminarianSgl: sglNames,
        religious: religiousNames,
      }
    })

    // Debug: Log data for St. John Bosco (group ID "2") to investigate search issue
    const boscoGroup = youthGroups.find(g => g.id === '2' || g.parish?.toLowerCase().includes('bosco'))
    if (boscoGroup) {
      console.log('[M2K Debug] St. John Bosco data:', JSON.stringify(boscoGroup, null, 2))
    }
    // Check for duplicate group IDs
    const idCounts = youthGroups.reduce((acc, g) => {
      acc[g.id] = (acc[g.id] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    const duplicates = Object.entries(idCounts).filter(([, count]) => count > 1)
    if (duplicates.length > 0) {
      console.log('[M2K Debug] Duplicate group IDs found:', duplicates)
    }

    // Deduplicate groups by ID (keep first occurrence, use dbId as tiebreaker)
    const seenIds = new Set<string>()
    const deduplicatedGroups = youthGroups.filter(g => {
      if (seenIds.has(g.id)) {
        console.log(`[M2K Debug] Removing duplicate group: ${g.parish} (id: ${g.id}, dbId: ${g.dbId})`)
        return false
      }
      seenIds.add(g.id)
      return true
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
        sunBreakfast: mg.sundayBreakfastTime || mg.breakfastTime || '',
        colorHex: mg.colorHex || '',
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
    // First, add direct room assignments from groups (new model)
    for (const group of groups) {
      if (group.smallGroupRoom) {
        const match = group.groupName.match(/\[([^\]]+)\]$/)
        const groupId = match ? match[1] : group.id
        const meetingPlace = `${group.smallGroupRoom.building.name} - ${group.smallGroupRoom.roomNumber}`
        smallGroupAssignmentsMap[groupId] = [meetingPlace]
      }
    }
    // Fallback to old SmallGroupAssignment model for groups without direct assignment
    for (const assignment of smallGroupAssignments) {
      if (!assignment.groupRegistrationId) continue
      const group = groups.find(g => g.id === assignment.groupRegistrationId)
      if (!group) continue
      const match = group.groupName.match(/\[([^\]]+)\]$/)
      const groupId = match ? match[1] : group.id
      // Skip if already has direct assignment
      if (smallGroupAssignmentsMap[groupId]) continue
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
      youthGroups: deduplicatedGroups, rooms: roomsData, housingAssignments, smallGroupAssignments: smallGroupAssignmentsMap,
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
    if (group.sundayBreakfastTime) {
      times.push({
        id: `${group.id}-sunday-breakfast`,
        day: 'sunday',
        meal: 'breakfast',
        color: group.name,
        colorHex: group.colorHex,
        time: group.sundayBreakfastTime
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

  // Get active announcements (filtered by date if applicable)
  let announcements: any[] = []
  try {
    const now = new Date()
    announcements = await prisma.porosAnnouncement.findMany({
      where: {
        eventId,
        isActive: true,
        AND: [
          {
            OR: [
              { startDate: null },
              { startDate: { lte: now } }
            ]
          },
          {
            OR: [
              { endDate: null },
              { endDate: { gte: now } }
            ]
          }
        ]
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }]
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
          announcements={announcements}
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
      announcements={announcements}
      seatingEnabled={settings?.porosSeatingEnabled ?? false}
      schedulePdfUrl={schedulePdf?.url || null}
    />
  )
}
