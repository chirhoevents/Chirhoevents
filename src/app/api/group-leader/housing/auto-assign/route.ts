import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'

type HousingCategory = 'male_u18' | 'female_u18' | 'male_chaperone' | 'female_chaperone'

function getParticipantCategory(p: { gender: string; age: number; participantType: string }): HousingCategory | null {
  const isMale = p.gender === 'male'
  const isUnder18 = p.age < 18 || p.participantType === 'youth_u18'
  const isChaperone = p.participantType === 'chaperone' || p.participantType === 'youth_o18'

  if (p.participantType === 'priest') return null // Clergy excluded

  if (isMale && isUnder18) return 'male_u18'
  if (!isMale && isUnder18) return 'female_u18'
  if (isMale && (isChaperone || p.age >= 18)) return 'male_chaperone'
  if (!isMale && (isChaperone || p.age >= 18)) return 'female_chaperone'

  return null
}

function getRoomCategory(room: { gender: string | null; housingType: string | null }): HousingCategory | null {
  const gender = room.gender?.toLowerCase()
  const type = room.housingType?.toLowerCase()

  if (type === 'clergy') return null
  if (gender === 'male' && type === 'youth_u18') return 'male_u18'
  if (gender === 'female' && type === 'youth_u18') return 'female_u18'
  if (gender === 'male' && (type === 'chaperone_18plus' || type === 'general')) return 'male_chaperone'
  if (gender === 'female' && (type === 'chaperone_18plus' || type === 'general')) return 'female_chaperone'
  return null
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getClerkUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { eventId, category } = body

    if (!eventId || !category) {
      return NextResponse.json(
        { message: 'Event ID and category are required' },
        { status: 400 }
      )
    }

    // Verify the group registration belongs to this user
    const groupRegistration = await prisma.groupRegistration.findFirst({
      where: {
        clerkUserId: userId,
        id: eventId,
      },
      include: {
        participants: {
          where: {
            participantType: { not: 'priest' },
          },
        },
        allocatedRooms: {
          include: {
            roomAssignments: true,
          },
        },
      },
    })

    if (!groupRegistration) {
      return NextResponse.json(
        { message: 'Group registration not found' },
        { status: 404 }
      )
    }

    // Check if locked
    if (groupRegistration.housingAssignmentsLocked) {
      return NextResponse.json(
        { message: 'Housing assignments are locked. Request an unlock first.' },
        { status: 400 }
      )
    }

    // Get existing assignments for this group's participants
    const participantIds = groupRegistration.participants.map((p: any) => p.id)
    const existingAssignments = await prisma.roomAssignment.findMany({
      where: {
        participantId: { in: participantIds },
      },
    })
    const assignedParticipantIds = new Set(existingAssignments.map((a: any) => a.participantId))

    // Get unassigned participants for the category
    const unassignedParticipants = groupRegistration.participants.filter((p: any) => {
      const pCategory = getParticipantCategory(p)
      return pCategory === category && !assignedParticipantIds.has(p.id)
    })

    if (unassignedParticipants.length === 0) {
      return NextResponse.json({
        assigned: 0,
        message: 'No unassigned participants in this category',
      })
    }

    // Get rooms for the category with available beds
    const roomsForCategory = groupRegistration.allocatedRooms.filter((room: any) => {
      const rCategory = getRoomCategory(room)
      return rCategory === category
    })

    // Sort rooms by most beds available (to fill rooms efficiently)
    roomsForCategory.sort((a: any, b: any) => {
      const aAvailable = a.capacity - a.roomAssignments.length
      const bAvailable = b.capacity - b.roomAssignments.length
      return bAvailable - aAvailable
    })

    // Build a map of room -> taken bed numbers
    const roomBedsTaken = new Map<string, Set<number>>()
    for (const room of roomsForCategory) {
      const takenBeds = new Set((room as any).roomAssignments.map((a: any) => a.bedNumber).filter((b: any) => b !== null) as number[])
      roomBedsTaken.set((room as any).id, takenBeds)
    }

    // Assign participants to available beds
    let assigned = 0
    const assignments: { roomId: string; participantId: string; bedNumber: number }[] = []

    for (const participant of unassignedParticipants) {
      let assignedToRoom = false

      for (const room of roomsForCategory) {
        const takenBeds = roomBedsTaken.get(room.id) || new Set()

        // Find first available bed
        for (let bedNum = 1; bedNum <= room.capacity; bedNum++) {
          if (!takenBeds.has(bedNum)) {
            // Assign this participant to this bed
            assignments.push({
              roomId: room.id,
              participantId: participant.id,
              bedNumber: bedNum,
            })
            takenBeds.add(bedNum)
            roomBedsTaken.set(room.id, takenBeds)
            assigned++
            assignedToRoom = true
            break
          }
        }

        if (assignedToRoom) break
      }

      // If we couldn't assign this participant, we're out of beds
      if (!assignedToRoom) break
    }

    // Create all assignments in a transaction
    if (assignments.length > 0) {
      await prisma.$transaction(async (tx: any) => {
        for (const assignment of assignments) {
          await tx.roomAssignment.create({
            data: {
              roomId: assignment.roomId,
              participantId: assignment.participantId,
              groupRegistrationId: groupRegistration.id,
              bedNumber: assignment.bedNumber,
            },
          })

          await tx.room.update({
            where: { id: assignment.roomId },
            data: { currentOccupancy: { increment: 1 } },
          })
        }
      })
    }

    return NextResponse.json({
      assigned,
      message: `${assigned} participants auto-assigned`,
    })
  } catch (error) {
    console.error('Error auto-assigning participants:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
