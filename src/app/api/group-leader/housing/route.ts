import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

// Utility function for bed number to letter conversion
function bedNumberToLetter(bedNumber: number): string {
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
  return letters[bedNumber - 1] || bedNumber.toString()
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const eventId = searchParams.get('eventId')

    if (!eventId) {
      return NextResponse.json({ message: 'Event ID is required' }, { status: 400 })
    }

    // Find the group registration linked to this Clerk user
    const groupRegistration = await prisma.groupRegistration.findFirst({
      where: {
        clerkUserId: userId,
        id: eventId,
        housingType: 'on_campus',
      },
      include: {
        participants: {
          where: {
            participantType: { not: 'priest' }, // Exclude clergy
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            age: true,
            gender: true,
            participantType: true,
          },
        },
        allocatedRooms: {
          include: {
            building: {
              select: {
                name: true,
              },
            },
            roomAssignments: {
              where: {
                participantId: { not: null },
              },
              select: {
                id: true,
                participantId: true,
                bedNumber: true,
              },
            },
          },
        },
      },
    })

    if (!groupRegistration) {
      return NextResponse.json(
        { message: 'No on-campus group registration found' },
        { status: 404 }
      )
    }

    // Get all room assignments for this group's participants
    const participantIds = groupRegistration.participants.map(p => p.id)
    const roomAssignments = await prisma.roomAssignment.findMany({
      where: {
        participantId: { in: participantIds },
      },
      select: {
        participantId: true,
        roomId: true,
        bedNumber: true,
      },
    })

    // Create a map of participantId -> assignment
    const assignmentMap = new Map(
      roomAssignments.map(ra => [ra.participantId, { roomId: ra.roomId, bedNumber: ra.bedNumber }])
    )

    // Transform participants with assignment info
    const participants = groupRegistration.participants.map(p => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      age: p.age,
      gender: p.gender,
      participantType: p.participantType,
      isAssigned: assignmentMap.has(p.id),
      roomId: assignmentMap.get(p.id)?.roomId || null,
      bedNumber: assignmentMap.get(p.id)?.bedNumber || null,
    }))

    // Transform rooms with bed info
    const rooms = groupRegistration.allocatedRooms.map(room => {
      // Create beds array with capacity
      const beds = []
      for (let i = 1; i <= room.capacity; i++) {
        const assignment = room.roomAssignments.find(ra => ra.bedNumber === i)
        const participant = assignment
          ? groupRegistration.participants.find(p => p.id === assignment.participantId)
          : null

        beds.push({
          bedNumber: i,
          bedLetter: bedNumberToLetter(i),
          participantId: assignment?.participantId || null,
          participantName: participant
            ? `${participant.firstName} ${participant.lastName}`
            : null,
        })
      }

      return {
        id: room.id,
        roomNumber: room.roomNumber,
        buildingName: room.building.name,
        floor: room.floor,
        capacity: room.capacity,
        currentOccupancy: room.roomAssignments.length,
        gender: room.gender,
        housingType: room.housingType,
        beds,
      }
    })

    // Calculate stats
    const stats = {
      totalParticipants: participants.length,
      assignedParticipants: participants.filter(p => p.isAssigned).length,
      maleU18: {
        total: participants.filter(p => p.gender === 'male' && (p.participantType === 'youth_u18' || p.age < 18)).length,
        assigned: participants.filter(p => p.gender === 'male' && (p.participantType === 'youth_u18' || p.age < 18) && p.isAssigned).length,
      },
      femaleU18: {
        total: participants.filter(p => p.gender === 'female' && (p.participantType === 'youth_u18' || p.age < 18)).length,
        assigned: participants.filter(p => p.gender === 'female' && (p.participantType === 'youth_u18' || p.age < 18) && p.isAssigned).length,
      },
      maleChaperone: {
        total: participants.filter(p => p.gender === 'male' && (p.participantType === 'chaperone' || p.participantType === 'youth_o18' || p.age >= 18)).length,
        assigned: participants.filter(p => p.gender === 'male' && (p.participantType === 'chaperone' || p.participantType === 'youth_o18' || p.age >= 18) && p.isAssigned).length,
      },
      femaleChaperone: {
        total: participants.filter(p => p.gender === 'female' && (p.participantType === 'chaperone' || p.participantType === 'youth_o18' || p.age >= 18)).length,
        assigned: participants.filter(p => p.gender === 'female' && (p.participantType === 'chaperone' || p.participantType === 'youth_o18' || p.age >= 18) && p.isAssigned).length,
      },
    }

    return NextResponse.json({
      isLocked: groupRegistration.housingAssignmentsLocked,
      submittedAt: groupRegistration.housingAssignmentsSubmittedAt,
      unlockRequested: groupRegistration.housingUnlockRequested,
      unlockRequestedAt: groupRegistration.housingUnlockRequestedAt,
      rooms,
      participants,
      stats,
    })
  } catch (error) {
    console.error('Error fetching housing data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
