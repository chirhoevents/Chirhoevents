import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

// Helper to fetch room assignments for participants
async function getHousingAssignmentsMap(participantIds: string[]) {
  if (participantIds.length === 0) return new Map()

  const roomAssignments = await prisma.roomAssignment.findMany({
    where: {
      participantId: { in: participantIds },
    },
    include: {
      room: {
        include: {
          building: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  })

  return new Map<string, { buildingName: string; roomNumber: string; bedNumber: number | null }>(
    roomAssignments.map((ra: any) => [
      ra.participantId,
      {
        buildingName: ra.room.building.name,
        roomNumber: ra.room.roomNumber,
        bedNumber: ra.bedNumber,
      },
    ])
  )
}

// Format individual registration as a "group" for consistent frontend handling
function formatIndividualRegistrationAsGroup(individual: any): any {
  const liabilityForm = individual.liabilityForms?.[0]

  return {
    id: individual.id,
    type: 'individual', // Mark as individual registration
    groupName: `${individual.firstName} ${individual.lastName}`,
    parishName: null,
    accessCode: individual.accessCode || individual.id.slice(0, 8).toUpperCase(),
    groupLeaderName: `${individual.firstName} ${individual.lastName}`,
    groupLeaderEmail: individual.email,
    diocese: null,
    contactEmail: individual.email,
    contactPhone: individual.phone,
    totalParticipants: 1,
    registrationStatus: individual.registrationStatus || 'confirmed',
    payment: {
      status: individual.paymentStatus || 'pending',
      totalAmount: individual.totalAmount || 0,
      paidAmount: individual.paidAmount || 0,
      balanceRemaining: (individual.totalAmount || 0) - (individual.paidAmount || 0),
    },
    forms: {
      completed: liabilityForm?.completed ? 1 : 0,
      pending: liabilityForm?.completed ? 0 : 1,
    },
    housing: {
      assigned: false, // TODO: Check if individual has housing
    },
    checkedInCount: individual.checkedIn ? 1 : 0,
    isFullyCheckedIn: individual.checkedIn,
    participants: [
      {
        id: individual.id,
        firstName: individual.firstName,
        lastName: individual.lastName,
        email: individual.email,
        age: liabilityForm?.participantAge || null,
        participantType: individual.participantType || 'individual',
        isChaperone: false,
        isClergy: individual.participantType === 'priest',
        gender: liabilityForm?.participantGender || null,
        liabilityFormCompleted: liabilityForm?.completed || false,
        checkedIn: individual.checkedIn || false,
        checkedInAt: individual.checkedInAt,
        checkInNotes: individual.checkInNotes,
        housing: null,
        isIndividual: true, // Flag for frontend
      },
    ],
    allocatedRooms: [],
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    await requireAdmin()
    const { eventId } = await params
    const { searchParams } = new URL(request.url)

    const accessCode = searchParams.get('accessCode')
    const search = searchParams.get('search') || searchParams.get('q')
    const groupId = searchParams.get('groupId')

    // If groupId is provided, fetch that specific group
    if (groupId) {
      const group = await prisma.groupRegistration.findFirst({
        where: {
          id: groupId,
          eventId,
        },
        include: {
          participants: {
            orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
          },
          allocatedRooms: {
            include: {
              building: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      })

      if (!group) {
        return NextResponse.json(
          { message: 'Group not found' },
          { status: 404 }
        )
      }

      const housingMap = await getHousingAssignmentsMap(
        group.participants.map((p: any) => p.id)
      )
      return NextResponse.json(formatGroupResponse(group, housingMap))
    }

    // If accessCode is provided, search by access code
    if (accessCode) {
      const group = await prisma.groupRegistration.findFirst({
        where: {
          accessCode,
          eventId,
        },
        include: {
          participants: {
            orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
          },
          allocatedRooms: {
            include: {
              building: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      })

      if (!group) {
        return NextResponse.json(
          { message: 'Group not found with this access code' },
          { status: 404 }
        )
      }

      const housingMap = await getHousingAssignmentsMap(
        group.participants.map((p: any) => p.id)
      )
      return NextResponse.json(formatGroupResponse(group, housingMap))
    }

    // If search query is provided, search groups, participants, AND individual registrations
    if (search && search.length >= 2) {
      // Search groups by multiple fields
      const groups = await prisma.groupRegistration.findMany({
        where: {
          eventId,
          OR: [
            // Group info
            { groupName: { contains: search, mode: 'insensitive' } },
            { confirmationCode: { contains: search, mode: 'insensitive' } },
            { parishName: { contains: search, mode: 'insensitive' } },
            { dioceseName: { contains: search, mode: 'insensitive' } },
            // Group leader info
            { groupLeaderName: { contains: search, mode: 'insensitive' } },
            { groupLeaderEmail: { contains: search, mode: 'insensitive' } },
            { groupLeaderPhone: { contains: search, mode: 'insensitive' } },
            // Participant info
            {
              participants: {
                some: {
                  OR: [
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { lastName: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                  ],
                },
              },
            },
          ],
        },
        include: {
          participants: {
            orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
          },
          allocatedRooms: {
            include: {
              building: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        take: 10,
      })

      // Also search individual registrations
      const individuals = await prisma.individualRegistration.findMany({
        where: {
          eventId,
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { confirmationCode: { contains: search, mode: 'insensitive' } },
          ],
        },
        include: {
          liabilityForms: {
            take: 1,
          },
        },
        take: 10,
      })

      // Get housing for all participants across all groups
      const allParticipantIds = groups.flatMap((g: any) =>
        g.participants.map((p: any) => p.id)
      )
      const housingMap = await getHousingAssignmentsMap(allParticipantIds)

      // Combine group and individual results
      const groupResults = groups.map((g: any) => formatGroupResponse(g, housingMap))
      const individualResults = individuals.map((i: any) => formatIndividualRegistrationAsGroup(i))

      const allResults = [...groupResults, ...individualResults]

      return NextResponse.json({
        results: allResults,
        count: allResults.length,
      })
    }

    return NextResponse.json(
      { message: 'Please provide accessCode, search, or groupId parameter' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Failed to lookup group:', error)
    return NextResponse.json(
      { message: 'Failed to lookup group' },
      { status: 500 }
    )
  }
}

interface HousingInfo {
  buildingName: string
  roomNumber: string
  bedNumber: number | null
}

function formatGroupResponse(
  group: any,
  housingMap: Map<string | null, HousingInfo>
) {
  const checkedInCount = group.participants.filter(
    (p: any) => p.checkedIn
  ).length
  const totalParticipants = group.participants.length
  const formsCompleted = group.participants.filter(
    (p: any) => p.liabilityFormCompleted
  ).length
  const hasHousingAssigned =
    group.allocatedRooms && group.allocatedRooms.length > 0

  return {
    id: group.id,
    groupName: group.groupName,
    parishName: group.parishName || null,
    accessCode: group.accessCode,
    groupLeaderName:
      group.groupLeaderName ||
      group.groupLeaderEmail?.split('@')[0] ||
      'Group Leader',
    groupLeaderEmail: group.groupLeaderEmail,
    diocese: group.dioceseName,
    contactEmail: group.groupLeaderEmail,
    contactPhone: group.groupLeaderPhone,
    totalParticipants,
    registrationStatus: group.registrationStatus || 'confirmed',
    payment: {
      status: group.paymentStatus || 'pending',
      totalAmount: group.totalAmount || 0,
      paidAmount: group.paidAmount || 0,
      balanceRemaining: (group.totalAmount || 0) - (group.paidAmount || 0),
    },
    forms: {
      completed: formsCompleted,
      pending: totalParticipants - formsCompleted,
    },
    housing: {
      assigned: hasHousingAssigned,
    },
    checkedInCount,
    isFullyCheckedIn:
      checkedInCount === totalParticipants && totalParticipants > 0,
    participants: group.participants.map((p: any) => {
      const housingInfo = housingMap.get(p.id)
      return {
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.email,
        age: p.age,
        participantType: p.participantType,
        isChaperone: p.participantType === 'chaperone',
        isClergy: p.participantType === 'priest',
        gender: p.gender,
        liabilityFormCompleted: p.liabilityFormCompleted || false,
        checkedIn: p.checkedIn,
        checkedInAt: p.checkedInAt,
        checkInNotes: p.checkInNotes,
        housing: housingInfo
          ? {
              buildingName: housingInfo.buildingName,
              roomNumber: housingInfo.roomNumber,
              bedLetter: housingInfo.bedNumber
                ? String.fromCharCode(64 + housingInfo.bedNumber)
                : null,
            }
          : null,
      }
    }),
    allocatedRooms:
      group.allocatedRooms?.map((r: any) => ({
        id: r.id,
        roomNumber: r.roomNumber,
        buildingName: r.building.name,
        capacity: r.capacity,
        currentOccupancy: r.currentOccupancy,
        gender: r.gender,
        housingType: r.housingType,
        floor: r.floor,
      })) || [],
  }
}
