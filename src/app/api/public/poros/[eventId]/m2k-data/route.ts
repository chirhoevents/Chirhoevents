import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// M2K specific event IDs
const M2K_EVENT_ID = 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1'

// Public API to get M2K data from database (no auth required)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    // Verify this is the M2K event
    if (eventId !== M2K_EVENT_ID) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Fetch all data from database in parallel
    const [
      groups,
      mealGroups,
      mealAssignments,
      smallGroups,
      smallGroupAssignments,
      buildings,
      rooms,
      roomAssignments,
      schedule,
      resources,
      staff,
      adaIndividuals,
    ] = await Promise.all([
      // Groups with basic info
      prisma.groupRegistration.findMany({
        where: { eventId },
        select: {
          id: true,
          groupName: true,
          parishName: true,
          groupLeaderName: true,
          groupLeaderPhone: true,
          youthCount: true,
          chaperoneCount: true,
          housingType: true,
          specialRequests: true,
          adaAccommodationsSummary: true,
          participants: {
            select: {
              id: true,
              gender: true,
              participantType: true,
            }
          }
        },
        orderBy: { groupName: 'asc' }
      }),

      // Meal groups with times
      prisma.mealGroup.findMany({
        where: { eventId, isActive: true },
        select: {
          id: true,
          name: true,
          colorHex: true,
          breakfastTime: true,
          lunchTime: true,
          dinnerTime: true,
        },
        orderBy: { displayOrder: 'asc' }
      }),

      // Meal group assignments
      prisma.mealGroupAssignment.findMany({
        where: { mealGroup: { eventId } },
        select: {
          groupRegistrationId: true,
          mealGroup: { select: { name: true } }
        }
      }),

      // Small groups with meeting places
      prisma.smallGroup.findMany({
        where: { eventId },
        select: {
          id: true,
          name: true,
          meetingPlace: true,
          meetingRoom: {
            select: {
              roomNumber: true,
              building: { select: { name: true } }
            }
          },
          sgl: { select: { firstName: true, lastName: true } },
          coSgl: { select: { firstName: true, lastName: true } },
        }
      }),

      // Small group assignments
      prisma.smallGroupAssignment.findMany({
        where: { smallGroup: { eventId } },
        select: {
          groupRegistrationId: true,
          smallGroup: { select: { id: true, meetingPlace: true } }
        }
      }),

      // Buildings
      prisma.building.findMany({
        where: { eventId },
        select: { id: true, name: true, gender: true }
      }),

      // Rooms
      prisma.room.findMany({
        where: { building: { eventId } },
        select: {
          id: true,
          roomNumber: true,
          capacity: true,
          gender: true,
          notes: true,
          isAdaAccessible: true,
          building: { select: { name: true } }
        }
      }),

      // Room assignments (housing)
      prisma.roomAssignment.findMany({
        where: { room: { building: { eventId } } },
        select: {
          groupRegistrationId: true,
          room: {
            select: {
              roomNumber: true,
              gender: true,
              building: { select: { name: true } }
            }
          }
        }
      }),

      // Schedule
      prisma.porosScheduleEntry.findMany({
        where: { eventId },
        select: {
          day: true,
          startTime: true,
          endTime: true,
          title: true,
          location: true,
        },
        orderBy: [{ day: 'asc' }, { startTime: 'asc' }]
      }),

      // Resources
      prisma.porosResource.findMany({
        where: { eventId, isActive: true },
        select: {
          name: true,
          type: true,
          url: true,
        },
        orderBy: { order: 'asc' }
      }),

      // Staff (SGLs and Religious)
      prisma.porosStaff.findMany({
        where: { eventId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          staffType: true,
        }
      }),

      // ADA individuals
      prisma.adaIndividual.findMany({
        where: { eventId },
        select: {
          id: true,
          name: true,
          gender: true,
          accessibilityNeed: true,
          participantId: true,
          room: {
            select: {
              roomNumber: true,
              building: { select: { name: true } }
            }
          }
        }
      }),
    ])

    // Transform data to M2K format
    const youthGroups = groups.map(group => {
      // Extract group ID from name like "Parish Name [123]"
      const match = group.groupName.match(/\[([^\]]+)\]$/)
      const groupId = match ? match[1] : group.id

      // Count participants by gender and type
      const maleTeens = group.participants.filter(p => p.gender === 'male' && p.participantType === 'youth').length
      const femaleTeens = group.participants.filter(p => p.gender === 'female' && p.participantType === 'youth').length
      const maleChaperones = group.participants.filter(p => p.gender === 'male' && p.participantType === 'chaperone').length
      const femaleChaperones = group.participants.filter(p => p.gender === 'female' && p.participantType === 'chaperone').length

      // Get SGL and religious from staff assignments (via small group assignments)
      const groupSmallGroupAssignment = smallGroupAssignments.find(a => a.groupRegistrationId === group.id)
      const smallGroup = groupSmallGroupAssignment
        ? smallGroups.find(sg => sg.id === groupSmallGroupAssignment.smallGroup.id)
        : null

      return {
        id: groupId,
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

    // Build meal color assignments map
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

    // Build meal times map
    const mealTimes: Record<string, any> = {}
    for (const mg of mealGroups) {
      mealTimes[mg.name] = {
        satBreakfast: mg.breakfastTime || '',
        satLunch: mg.lunchTime || '',
        satDinner: mg.dinnerTime || '',
        sunBreakfast: mg.breakfastTime || '', // Reuse breakfast time for Sunday
      }
    }

    // Build housing assignments
    const housingAssignments = {
      male: {} as Record<string, string[]>,
      female: {} as Record<string, string[]>,
    }
    for (const assignment of roomAssignments) {
      if (!assignment.groupRegistrationId) continue
      const group = groups.find(g => g.id === assignment.groupRegistrationId)
      if (!group) continue

      const match = group.groupName.match(/\[([^\]]+)\]$/)
      const groupId = match ? match[1] : group.id
      const roomKey = `${assignment.room.building.name}-${assignment.room.roomNumber}`
      const gender = assignment.room.gender === 'male' ? 'male' : 'female'

      if (!housingAssignments[gender][groupId]) {
        housingAssignments[gender][groupId] = []
      }
      if (!housingAssignments[gender][groupId].includes(roomKey)) {
        housingAssignments[gender][groupId].push(roomKey)
      }
    }

    // Build small group assignments
    const smallGroupAssignmentsMap: Record<string, string[]> = {}
    for (const assignment of smallGroupAssignments) {
      if (!assignment.groupRegistrationId) continue
      const group = groups.find(g => g.id === assignment.groupRegistrationId)
      if (!group) continue

      const match = group.groupName.match(/\[([^\]]+)\]$/)
      const groupId = match ? match[1] : group.id
      const meetingPlace = assignment.smallGroup.meetingPlace || 'TBD'

      if (!smallGroupAssignmentsMap[groupId]) {
        smallGroupAssignmentsMap[groupId] = []
      }
      if (!smallGroupAssignmentsMap[groupId].includes(meetingPlace)) {
        smallGroupAssignmentsMap[groupId].push(meetingPlace)
      }
    }

    // Build rooms array
    const roomsData = rooms.map(room => ({
      building: room.building.name,
      roomId: room.roomNumber,
      type: 'housing' as const,
      gender: room.gender || 'mixed',
      capacity: room.capacity,
      features: room.notes || '',
      accessibility: room.isAdaAccessible ? 'ADA Accessible' : undefined,
    }))

    // Build schedule
    const scheduleData: Record<string, any[]> = {}
    for (const entry of schedule) {
      const day = entry.day.toLowerCase()
      if (!scheduleData[day]) scheduleData[day] = []
      scheduleData[day].push({
        startTime: entry.startTime,
        endTime: entry.endTime || '',
        event: entry.title,
        location: entry.location || '',
      })
    }

    // Build resources
    const resourcesData = resources.map(r => ({
      emoji: r.type === 'map' ? '🗺️' : '📚',
      name: r.name,
      url: r.url,
    }))

    // Build ADA individuals
    const adaData = adaIndividuals.map(ada => ({
      id: ada.id,
      name: ada.name,
      gender: ada.gender || 'unknown',
      groupId: '', // Would need to link through participant
      accessibility: ada.accessibilityNeed,
      roomAssignment: ada.room ? `${ada.room.building.name}-${ada.room.roomNumber}` : '',
    }))

    const data = {
      youthGroups,
      rooms: roomsData,
      housingAssignments,
      smallGroupAssignments: smallGroupAssignmentsMap,
      mealColorAssignments,
      mealTimes,
      activeColors: mealGroups.map(mg => mg.name),
      schedule: scheduleData,
      resources: resourcesData,
      adaIndividuals: adaData,
      // Metadata
      _source: 'database',
      _generatedAt: new Date().toISOString(),
    }

    return NextResponse.json(data)

  } catch (error: any) {
    console.error('M2K data fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
