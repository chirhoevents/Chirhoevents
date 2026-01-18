import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'

// M2K specific event IDs
const M2K_EVENT_ID = 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1'
const M2K_ORG_ID = '675c8b23-70aa-4d26-b3f7-c4afdf39ebff'

interface M2KRoom {
  building: string
  roomId: string
  type: 'housing' | 'smallGroup'
  gender: 'male' | 'female' | 'mixed'
  capacity: number
  accessibility?: string
  features?: string
}

interface M2KYouthGroup {
  id: string
  parish: string
  leader: string
  phone: string
  maleTeens: number
  femaleTeens: number
  maleChaperones: number
  femaleChaperones: number
  seminarianSgl?: string
  religious?: string
  stayingOffCampus?: boolean
  specialAccommodations?: string
}

interface M2KScheduleEvent {
  startTime: string
  endTime?: string
  event: string
  location?: string
}

interface M2KResource {
  emoji: string
  name: string
  url: string
}

interface M2KMealTimes {
  satBreakfast?: string
  satLunch?: string
  satDinner?: string
  sunBreakfast?: string
}

interface M2KData {
  youthGroups: M2KYouthGroup[]
  rooms: M2KRoom[]
  housingAssignments?: {
    male: Record<string, string[]>
    female: Record<string, string[]>
  }
  smallGroupAssignments?: Record<string, string[]>
  mealColorAssignments?: Record<string, string>
  mealTimes?: Record<string, M2KMealTimes>
  activeColors?: string[]
  schedule?: {
    friday?: M2KScheduleEvent[]
    saturday?: M2KScheduleEvent[]
    sunday?: M2KScheduleEvent[]
  }
  resources?: M2KResource[]
  conferenceStartDate?: string
}

// Generate access code
function generateAccessCode(prefix: string): string {
  const code = nanoid(8).toUpperCase()
  return `${prefix}-${code}`
}

// Color mapping for meal groups
const MEAL_COLOR_HEX: Record<string, string> = {
  'Red': '#e74c3c',
  'Blue': '#3498db',
  'Green': '#27ae60',
  'Yellow': '#f1c40f',
  'Orange': '#e67e22',
  'Purple': '#9b59b6',
  'Pink': '#e83e8c',
  'Brown': '#8b4513',
  'Grey': '#95a5a6',
}

// POST - Import M2K JSON data into database tables
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[M2K Import]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    // Verify this is the M2K event
    if (eventId !== M2K_EVENT_ID) {
      return NextResponse.json({
        error: 'This import is only available for the M2K event'
      }, { status: 400 })
    }

    const body = await request.json()
    const { importTypes = ['all'] } = body // ['groups', 'rooms', 'mealGroups', 'schedule', 'resources', 'staff', 'assignments']

    // Load the JSON data from the import table
    const importData = await prisma.$queryRaw<any[]>`
      SELECT json_data as "jsonData"
      FROM poros_event_data_imports
      WHERE event_id = ${eventId}::uuid
      LIMIT 1
    `

    if (!importData.length || !importData[0].jsonData) {
      return NextResponse.json({
        error: 'No M2K JSON data found. Please upload the JSON data first.'
      }, { status: 400 })
    }

    const data: M2KData = importData[0].jsonData
    const organizationId = event!.organizationId

    const results = {
      groupsCreated: 0,
      buildingsCreated: 0,
      roomsCreated: 0,
      smallGroupsCreated: 0,
      mealGroupsCreated: 0,
      mealAssignmentsCreated: 0,
      smallGroupAssignmentsCreated: 0,
      housingAssignmentsCreated: 0,
      scheduleEntriesCreated: 0,
      resourcesCreated: 0,
      staffCreated: 0,
      errors: [] as string[],
    }

    const shouldImport = (type: string) => importTypes.includes('all') || importTypes.includes(type)

    // 1. Import Groups
    if (shouldImport('groups') && data.youthGroups) {
      for (const group of data.youthGroups) {
        try {
          // Check if group exists
          const existingGroup = await prisma.groupRegistration.findFirst({
            where: {
              eventId,
              groupName: { contains: `[${group.id}]` }
            }
          })

          if (!existingGroup) {
            const totalYouth = (group.maleTeens || 0) + (group.femaleTeens || 0)
            const totalChaperones = (group.maleChaperones || 0) + (group.femaleChaperones || 0)

            await prisma.groupRegistration.create({
              data: {
                eventId,
                organizationId,
                groupName: `${group.parish} [${group.id}]`,
                parishName: group.parish,
                groupLeaderName: group.leader,
                groupLeaderEmail: `group${group.id}@m2k.temp`,
                groupLeaderPhone: group.phone || '000-000-0000',
                accessCode: generateAccessCode('M2K'),
                youthCount: totalYouth,
                chaperoneCount: totalChaperones,
                priestCount: 0,
                totalParticipants: totalYouth + totalChaperones,
                housingType: group.stayingOffCampus ? 'off_campus' : 'on_campus',
                specialRequests: group.specialAccommodations || null,
                registrationStatus: 'completed',
              }
            })
            results.groupsCreated++
          }
        } catch (err: any) {
          results.errors.push(`Error importing group ${group.id}: ${err.message}`)
        }
      }
    }

    // 2. Import Rooms (Housing and Small Group)
    if (shouldImport('rooms') && data.rooms) {
      // Group rooms by building
      const buildingsMap = new Map<string, {
        name: string
        gender: 'male' | 'female' | 'mixed'
        type: 'housing' | 'smallGroup'
        rooms: M2KRoom[]
      }>()

      for (const room of data.rooms) {
        const key = `${room.building}-${room.type}-${room.gender}`
        if (!buildingsMap.has(key)) {
          buildingsMap.set(key, {
            name: room.building,
            gender: room.gender,
            type: room.type,
            rooms: []
          })
        }
        buildingsMap.get(key)!.rooms.push(room)
      }

      // Create buildings and rooms
      for (const [key, buildingData] of buildingsMap) {
        try {
          // Check if building exists
          let building = await prisma.building.findFirst({
            where: {
              eventId,
              name: buildingData.name,
              gender: buildingData.gender as any,
            }
          })

          if (!building) {
            building = await prisma.building.create({
              data: {
                eventId,
                name: buildingData.name,
                gender: buildingData.gender as any,
                housingType: buildingData.type === 'housing' ? 'general' : 'general',
                totalFloors: 1,
                totalRooms: buildingData.rooms.length,
                totalBeds: buildingData.rooms.reduce((sum, r) => sum + r.capacity, 0),
              }
            })
            results.buildingsCreated++
          }

          // Create rooms
          for (const room of buildingData.rooms) {
            const existingRoom = await prisma.room.findFirst({
              where: {
                buildingId: building.id,
                roomNumber: room.roomId,
              }
            })

            if (!existingRoom) {
              await prisma.room.create({
                data: {
                  buildingId: building.id,
                  roomNumber: room.roomId,
                  floor: 1,
                  capacity: room.capacity,
                  bedCount: room.capacity,
                  gender: room.gender as any,
                  housingType: 'general',
                  notes: room.features || room.accessibility || null,
                  isAdaAccessible: !!room.accessibility,
                  adaFeatures: room.accessibility || null,
                }
              })
              results.roomsCreated++
            }
          }
        } catch (err: any) {
          results.errors.push(`Error importing building ${buildingData.name}: ${err.message}`)
        }
      }
    }

    // 3. Import Meal Groups
    if (shouldImport('mealGroups') && data.mealTimes && data.activeColors) {
      let displayOrder = 0
      for (const color of data.activeColors) {
        try {
          const times = data.mealTimes[color]
          if (!times) continue

          const existingMealGroup = await prisma.mealGroup.findFirst({
            where: { eventId, name: color }
          })

          if (!existingMealGroup) {
            await prisma.mealGroup.create({
              data: {
                eventId,
                name: color,
                color: color.toLowerCase(),
                colorHex: MEAL_COLOR_HEX[color] || '#6b7280',
                breakfastTime: times.satBreakfast || null,
                lunchTime: times.satLunch || null,
                dinnerTime: times.satDinner || null,
                displayOrder: displayOrder++,
                isActive: true,
              }
            })
            results.mealGroupsCreated++
          }
        } catch (err: any) {
          results.errors.push(`Error importing meal group ${color}: ${err.message}`)
        }
      }
    }

    // 4. Import Staff (SGLs and Religious)
    if (shouldImport('staff') && data.youthGroups) {
      const staffNames = new Set<string>()

      for (const group of data.youthGroups) {
        if (group.seminarianSgl && !staffNames.has(group.seminarianSgl)) {
          try {
            const existingStaff = await prisma.porosStaff.findFirst({
              where: {
                eventId,
                firstName: group.seminarianSgl.split(' ')[0] || group.seminarianSgl,
                lastName: group.seminarianSgl.split(' ').slice(1).join(' ') || '',
                staffType: 'sgl',
              }
            })

            if (!existingStaff) {
              await prisma.porosStaff.create({
                data: {
                  eventId,
                  firstName: group.seminarianSgl.split(' ')[0] || group.seminarianSgl,
                  lastName: group.seminarianSgl.split(' ').slice(1).join(' ') || '',
                  staffType: 'seminarian',
                }
              })
              results.staffCreated++
            }
            staffNames.add(group.seminarianSgl)
          } catch (err: any) {
            results.errors.push(`Error importing staff ${group.seminarianSgl}: ${err.message}`)
          }
        }

        if (group.religious && !staffNames.has(group.religious)) {
          try {
            const existingStaff = await prisma.porosStaff.findFirst({
              where: {
                eventId,
                firstName: group.religious.split(' ')[0] || group.religious,
                lastName: group.religious.split(' ').slice(1).join(' ') || '',
                staffType: 'religious',
              }
            })

            if (!existingStaff) {
              await prisma.porosStaff.create({
                data: {
                  eventId,
                  firstName: group.religious.split(' ')[0] || group.religious,
                  lastName: group.religious.split(' ').slice(1).join(' ') || '',
                  staffType: 'religious',
                }
              })
              results.staffCreated++
            }
            staffNames.add(group.religious)
          } catch (err: any) {
            results.errors.push(`Error importing staff ${group.religious}: ${err.message}`)
          }
        }
      }
    }

    // 5. Import Schedule
    if (shouldImport('schedule') && data.schedule) {
      const days = ['friday', 'saturday', 'sunday'] as const

      for (const day of days) {
        const events = data.schedule[day]
        if (!events) continue

        for (const scheduleEvent of events) {
          try {
            const existingEntry = await prisma.porosScheduleEntry.findFirst({
              where: {
                eventId,
                day,
                startTime: scheduleEvent.startTime,
                title: scheduleEvent.event,
              }
            })

            if (!existingEntry) {
              await prisma.porosScheduleEntry.create({
                data: {
                  eventId,
                  day,
                  startTime: scheduleEvent.startTime,
                  endTime: scheduleEvent.endTime || null,
                  title: scheduleEvent.event,
                  location: scheduleEvent.location || null,
                }
              })
              results.scheduleEntriesCreated++
            }
          } catch (err: any) {
            results.errors.push(`Error importing schedule entry: ${err.message}`)
          }
        }
      }
    }

    // 6. Import Resources
    if (shouldImport('resources') && data.resources) {
      let order = 0
      for (const resource of data.resources) {
        if (!resource.url) continue

        try {
          const existingResource = await prisma.porosResource.findFirst({
            where: {
              eventId,
              name: resource.name,
            }
          })

          if (!existingResource) {
            await prisma.porosResource.create({
              data: {
                eventId,
                name: resource.name,
                type: resource.name.toLowerCase().includes('map') ? 'map' : 'link',
                url: resource.url,
                order: order++,
                isActive: true,
              }
            })
            results.resourcesCreated++
          }
        } catch (err: any) {
          results.errors.push(`Error importing resource ${resource.name}: ${err.message}`)
        }
      }
    }

    // 7. Import Assignments (requires groups and meal groups to exist)
    if (shouldImport('assignments')) {
      // Get all groups
      const groups = await prisma.groupRegistration.findMany({
        where: { eventId },
        select: { id: true, groupName: true }
      })
      const groupMap = new Map<string, string>()
      for (const group of groups) {
        const match = group.groupName.match(/\[([^\]]+)\]$/)
        if (match) groupMap.set(match[1], group.id)
      }

      // Get all meal groups
      const mealGroups = await prisma.mealGroup.findMany({
        where: { eventId },
        select: { id: true, name: true }
      })
      const mealGroupMap = new Map<string, string>()
      for (const mg of mealGroups) mealGroupMap.set(mg.name, mg.id)

      // Import meal color assignments
      if (data.mealColorAssignments) {
        for (const [groupId, color] of Object.entries(data.mealColorAssignments)) {
          const dbGroupId = groupMap.get(groupId)
          const dbMealGroupId = mealGroupMap.get(color)

          if (dbGroupId && dbMealGroupId) {
            try {
              const existingAssignment = await prisma.mealGroupAssignment.findFirst({
                where: { mealGroupId: dbMealGroupId, groupRegistrationId: dbGroupId }
              })

              if (!existingAssignment) {
                await prisma.mealGroupAssignment.create({
                  data: {
                    mealGroupId: dbMealGroupId,
                    groupRegistrationId: dbGroupId,
                  }
                })
                results.mealAssignmentsCreated++
              }
            } catch (err: any) {
              results.errors.push(`Error importing meal assignment for group ${groupId}: ${err.message}`)
            }
          }
        }
      }

      // Import small group assignments
      if (data.smallGroupAssignments) {
        // Get all rooms
        const rooms = await prisma.room.findMany({
          where: { building: { eventId } },
          include: { building: { select: { name: true } } }
        })
        const roomMap = new Map<string, string>()
        for (const room of rooms) {
          roomMap.set(`${room.building.name}-${room.roomNumber}`, room.id)
        }

        for (const [groupId, roomKeys] of Object.entries(data.smallGroupAssignments)) {
          const dbGroupId = groupMap.get(groupId)
          if (!dbGroupId) continue

          for (const roomKey of roomKeys) {
            // Create small group with meeting place
            try {
              const existingSmallGroup = await prisma.smallGroup.findFirst({
                where: { eventId, meetingPlace: roomKey }
              })

              let smallGroupId: string
              if (existingSmallGroup) {
                smallGroupId = existingSmallGroup.id
              } else {
                const smallGroup = await prisma.smallGroup.create({
                  data: {
                    eventId,
                    name: `Small Group - ${roomKey}`,
                    meetingPlace: roomKey,
                    capacity: 50,
                  }
                })
                smallGroupId = smallGroup.id
                results.smallGroupsCreated++
              }

              // Create assignment
              const existingAssignment = await prisma.smallGroupAssignment.findFirst({
                where: { smallGroupId, groupRegistrationId: dbGroupId }
              })

              if (!existingAssignment) {
                await prisma.smallGroupAssignment.create({
                  data: {
                    smallGroupId,
                    groupRegistrationId: dbGroupId,
                  }
                })
                results.smallGroupAssignmentsCreated++
              }
            } catch (err: any) {
              results.errors.push(`Error importing small group assignment for group ${groupId}: ${err.message}`)
            }
          }
        }
      }

      // Import housing assignments
      if (data.housingAssignments) {
        // Get all rooms
        const rooms = await prisma.room.findMany({
          where: { building: { eventId } },
          include: { building: { select: { name: true } } }
        })
        const roomMap = new Map<string, string>()
        for (const room of rooms) {
          roomMap.set(`${room.building.name}-${room.roomNumber}`, room.id)
        }

        const processHousingAssignments = async (assignments: Record<string, string[]>, gender: 'male' | 'female') => {
          for (const [groupId, roomKeys] of Object.entries(assignments)) {
            const dbGroupId = groupMap.get(groupId)
            if (!dbGroupId) continue

            for (const roomKey of roomKeys) {
              const roomId = roomMap.get(roomKey)
              if (!roomId) continue

              try {
                const existingAssignment = await prisma.roomAssignment.findFirst({
                  where: { roomId, groupRegistrationId: dbGroupId }
                })

                if (!existingAssignment) {
                  await prisma.roomAssignment.create({
                    data: {
                      roomId,
                      groupRegistrationId: dbGroupId,
                    }
                  })
                  results.housingAssignmentsCreated++
                }
              } catch (err: any) {
                results.errors.push(`Error importing housing assignment for group ${groupId}: ${err.message}`)
              }
            }
          }
        }

        if (data.housingAssignments.male) {
          await processHousingAssignments(data.housingAssignments.male, 'male')
        }
        if (data.housingAssignments.female) {
          await processHousingAssignments(data.housingAssignments.female, 'female')
        }
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: 'M2K data import completed successfully'
    })

  } catch (error: any) {
    console.error('M2K Import error:', error)
    return NextResponse.json({
      error: 'Import failed',
      details: error.message
    }, { status: 500 })
  }
}

// GET - Get import status/preview
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[M2K Import Status]',
    })
    if (error) return error

    // Get current database counts
    const [
      groupsCount,
      participantsCount,
      buildingsCount,
      roomsCount,
      mealGroupsCount,
      smallGroupsCount,
      scheduleCount,
      resourcesCount,
      staffCount,
    ] = await Promise.all([
      prisma.groupRegistration.count({ where: { eventId } }),
      prisma.participant.count({ where: { groupRegistration: { eventId } } }),
      prisma.building.count({ where: { eventId } }),
      prisma.room.count({ where: { building: { eventId } } }),
      prisma.mealGroup.count({ where: { eventId } }),
      prisma.smallGroup.count({ where: { eventId } }),
      prisma.porosScheduleEntry.count({ where: { eventId } }),
      prisma.porosResource.count({ where: { eventId } }),
      prisma.porosStaff.count({ where: { eventId } }),
    ])

    // Get JSON data stats
    let jsonStats = null
    try {
      const importData = await prisma.$queryRaw<any[]>`
        SELECT json_data as "jsonData"
        FROM poros_event_data_imports
        WHERE event_id = ${eventId}::uuid
        LIMIT 1
      `
      if (importData.length > 0 && importData[0].jsonData) {
        const data = importData[0].jsonData as M2KData
        jsonStats = {
          youthGroups: data.youthGroups?.length || 0,
          rooms: data.rooms?.length || 0,
          activeColors: data.activeColors?.length || 0,
          scheduleEvents: (data.schedule?.friday?.length || 0) +
                          (data.schedule?.saturday?.length || 0) +
                          (data.schedule?.sunday?.length || 0),
          resources: data.resources?.length || 0,
        }
      }
    } catch {
      // Table may not exist
    }

    return NextResponse.json({
      database: {
        groups: groupsCount,
        participants: participantsCount,
        buildings: buildingsCount,
        rooms: roomsCount,
        mealGroups: mealGroupsCount,
        smallGroups: smallGroupsCount,
        scheduleEntries: scheduleCount,
        resources: resourcesCount,
        staff: staffCount,
      },
      jsonData: jsonStats,
    })

  } catch (error: any) {
    console.error('M2K Import status error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
