import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPorosAccess } from '@/lib/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    // Verify Poros access
    const { error } = await verifyPorosAccess(
      request,
      eventId,
      '[Room Allocations Report]'
    )
    if (error) return error

    const isPreview = request.nextUrl.searchParams.get('preview') === 'true'
    const purposeFilter = request.nextUrl.searchParams.get('purpose') // 'housing', 'small_group', 'both', or null for all

    // Get all buildings for this event with their rooms
    const buildings = await prisma.building.findMany({
      where: { eventId },
      include: {
        rooms: {
          where: purposeFilter ? { roomPurpose: purposeFilter as any } : undefined,
          include: {
            allocatedToGroup: {
              include: {
                participants: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    gender: true,
                    participantType: true,
                  },
                },
              },
            },
            roomAssignments: {
              select: {
                id: true,
                bedNumber: true,
                participantId: true,
                individualRegistrationId: true,
                groupRegistrationId: true,
              },
            },
            smallGroups: {
              select: {
                id: true,
                name: true,
                groupNumber: true,
                currentSize: true,
                capacity: true,
                sgl: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
          orderBy: [
            { floor: 'asc' },
            { roomNumber: 'asc' },
          ],
        },
      },
      orderBy: { displayOrder: 'asc' },
    })

    // For preview, return summary stats
    if (isPreview) {
      let totalRooms = 0
      let totalCapacity = 0
      let totalOccupied = 0
      let roomsWithGroups = 0

      for (const building of buildings) {
        for (const room of building.rooms) {
          totalRooms++
          totalCapacity += room.capacity
          totalOccupied += room.currentOccupancy
          if (room.allocatedToGroupId || room.smallGroups.length > 0) {
            roomsWithGroups++
          }
        }
      }

      return NextResponse.json({
        totalRooms,
        totalCapacity,
        totalOccupied,
        roomsWithGroups,
        availableCapacity: totalCapacity - totalOccupied,
        occupancyRate: totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0,
      })
    }

    // Get participant details for room assignments
    const participantIds = new Set<string>()
    const individualRegIds = new Set<string>()

    for (const building of buildings) {
      for (const room of building.rooms) {
        for (const assignment of room.roomAssignments) {
          if (assignment.participantId) participantIds.add(assignment.participantId)
          if (assignment.individualRegistrationId) individualRegIds.add(assignment.individualRegistrationId)
        }
      }
    }

    // Fetch participant and individual registration details
    const [participants, individualRegs] = await Promise.all([
      participantIds.size > 0
        ? prisma.participant.findMany({
            where: { id: { in: Array.from(participantIds) } },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              gender: true,
              participantType: true,
              groupRegistration: {
                select: {
                  groupName: true,
                  parishName: true,
                },
              },
            },
          })
        : [],
      individualRegIds.size > 0
        ? prisma.individualRegistration.findMany({
            where: { id: { in: Array.from(individualRegIds) } },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              gender: true,
            },
          })
        : [],
    ])

    const participantMap = new Map(participants.map(p => [p.id, p]))
    const individualMap = new Map(individualRegs.map(i => [i.id, i]))

    // Format the response
    const roomAllocations = []

    let summaryStats = {
      totalRooms: 0,
      totalCapacity: 0,
      totalOccupied: 0,
      roomsWithGroups: 0,
      housingRooms: 0,
      smallGroupRooms: 0,
      bothPurposeRooms: 0,
      byBuilding: [] as any[],
    }

    for (const building of buildings) {
      const buildingStats = {
        buildingName: building.name,
        gender: building.gender,
        housingType: building.housingType,
        totalRooms: building.rooms.length,
        totalCapacity: 0,
        totalOccupied: 0,
      }

      for (const room of building.rooms) {
        summaryStats.totalRooms++
        summaryStats.totalCapacity += room.capacity
        summaryStats.totalOccupied += room.currentOccupancy
        buildingStats.totalCapacity += room.capacity
        buildingStats.totalOccupied += room.currentOccupancy

        if (room.roomPurpose === 'housing') summaryStats.housingRooms++
        else if (room.roomPurpose === 'small_group') summaryStats.smallGroupRooms++
        else if (room.roomPurpose === 'both') summaryStats.bothPurposeRooms++

        if (room.allocatedToGroupId || room.smallGroups.length > 0) {
          summaryStats.roomsWithGroups++
        }

        // Get assigned people details
        const assignedPeople = room.roomAssignments.map(assignment => {
          if (assignment.participantId) {
            const participant = participantMap.get(assignment.participantId)
            if (participant) {
              return {
                id: participant.id,
                name: `${participant.firstName} ${participant.lastName}`,
                gender: participant.gender,
                type: participant.participantType,
                groupName: participant.groupRegistration?.groupName,
                parishName: participant.groupRegistration?.parishName,
                bedNumber: assignment.bedNumber,
                source: 'participant',
              }
            }
          }
          if (assignment.individualRegistrationId) {
            const individual = individualMap.get(assignment.individualRegistrationId)
            if (individual) {
              return {
                id: individual.id,
                name: `${individual.firstName} ${individual.lastName}`,
                gender: individual.gender,
                type: 'individual',
                bedNumber: assignment.bedNumber,
                source: 'individual',
              }
            }
          }
          return null
        }).filter(Boolean)

        roomAllocations.push({
          roomId: room.id,
          buildingName: building.name,
          buildingGender: building.gender,
          buildingHousingType: building.housingType,
          roomNumber: room.roomNumber,
          floor: room.floor,
          roomType: room.roomType,
          roomPurpose: room.roomPurpose,
          gender: room.gender,
          housingType: room.housingType,
          capacity: room.capacity,
          bedCount: room.bedCount,
          currentOccupancy: room.currentOccupancy,
          availableBeds: room.capacity - room.currentOccupancy,
          isAvailable: room.isAvailable,
          isAdaAccessible: room.isAdaAccessible,
          notes: room.notes,
          // Allocated group info (for housing)
          allocatedGroup: room.allocatedToGroup
            ? {
                id: room.allocatedToGroup.id,
                groupName: room.allocatedToGroup.groupName,
                parishName: room.allocatedToGroup.parishName,
                participantCount: room.allocatedToGroup.participants.length,
                participants: room.allocatedToGroup.participants.map(p => ({
                  id: p.id,
                  name: `${p.firstName} ${p.lastName}`,
                  gender: p.gender,
                  type: p.participantType,
                })),
              }
            : null,
          // Small groups using this room for meetings
          smallGroups: room.smallGroups.map(sg => ({
            id: sg.id,
            name: sg.name,
            groupNumber: sg.groupNumber,
            currentSize: sg.currentSize,
            capacity: sg.capacity,
            sglName: sg.sgl ? `${sg.sgl.firstName} ${sg.sgl.lastName}` : null,
          })),
          // Individual bed assignments
          assignedPeople,
        })
      }

      summaryStats.byBuilding.push(buildingStats)
    }

    return NextResponse.json({
      summary: summaryStats,
      rooms: roomAllocations,
    })
  } catch (error) {
    console.error('Error fetching room allocations report:', error)
    return NextResponse.json({ error: 'Failed to fetch room allocations report' }, { status: 500 })
  }
}
