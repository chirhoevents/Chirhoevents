import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const user = await requireAdmin()
    const { eventId } = params

    // Get participants from group registrations (on_campus only)
    const groupParticipants = await prisma.participant.findMany({
      where: {
        groupRegistration: {
          eventId,
          housingType: 'on_campus',
        },
      },
      include: {
        groupRegistration: {
          select: { parishName: true },
        },
        roomAssignment: {
          include: {
            room: {
              include: { building: true },
            },
          },
        },
      },
    })

    // Get individual registrations (on_campus only)
    const individualRegistrations = await prisma.individualRegistration.findMany({
      where: {
        eventId,
        housingType: 'on_campus',
      },
      include: {
        roomAssignment: {
          include: {
            room: {
              include: { building: true },
            },
          },
        },
      },
    })

    // Format response
    const participants = [
      ...groupParticipants.map((p) => ({
        id: p.id,
        type: 'group' as const,
        firstName: p.firstName,
        lastName: p.lastName,
        gender: p.gender,
        isMinor: p.age !== null && p.age !== undefined ? p.age < 18 : false,
        parishName: p.groupRegistration?.parishName,
        groupRegistrationId: p.groupRegistrationId,
        roomAssignment: p.roomAssignment
          ? {
              roomId: p.roomAssignment.roomId,
              roomNumber: p.roomAssignment.room.roomNumber,
              buildingName: p.roomAssignment.room.building.name,
            }
          : null,
        roommatePreference: null,
      })),
      ...individualRegistrations.map((r) => ({
        id: r.id,
        type: 'individual' as const,
        firstName: r.firstName,
        lastName: r.lastName,
        gender: r.gender,
        isMinor: r.dateOfBirth
          ? new Date().getFullYear() - new Date(r.dateOfBirth).getFullYear() < 18
          : false,
        parishName: null,
        groupRegistrationId: null,
        roomAssignment: r.roomAssignment
          ? {
              roomId: r.roomAssignment.roomId,
              roomNumber: r.roomAssignment.room.roomNumber,
              buildingName: r.roomAssignment.room.building.name,
            }
          : null,
        roommatePreference: r.preferredRoommateName,
      })),
    ]

    return NextResponse.json(participants)
  } catch (error) {
    console.error('Failed to fetch participants:', error)
    return NextResponse.json(
      { message: 'Failed to fetch participants' },
      { status: 500 }
    )
  }
}
