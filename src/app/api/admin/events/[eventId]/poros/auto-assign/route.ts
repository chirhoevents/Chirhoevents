import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

interface ParticipantWithGroup {
  id: string
  firstName: string
  lastName: string
  gender: string | null
  age: number
  groupRegistrationId: string
  groupRegistration: {
    id: string
    groupName: string
    parishName?: string | null
  } | null
}

interface RoomRecord {
  id: string
  buildingId: string
  floor: number | null
  roomNumber: string
  capacity: number
  currentOccupancy: number
  gender: string | null
  housingType: string | null
  isAvailable: boolean
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[Poros Auto-Assign]',
    })
    if (error) return error
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[Poros Auto-Assign] ❌ User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }
    const body = await request.json()

    const {
      strategy = 'parish_together',
      respectRoommatePrefs = true,
      onlyUnassigned = true,
      genderFilter = 'all',
      typeFilter = 'all',
      buildingIds = [],
    } = body

    let assigned = 0
    let skipped = 0
    const errors: string[] = []

    // Get all participants (only on_campus housing)
    const allParticipants = await prisma.participant.findMany({
      where: {
        groupRegistration: {
          eventId,
          housingType: 'on_campus',
        },
        ...(genderFilter !== 'all' ? { gender: genderFilter as any } : {}),
        ...(typeFilter === 'youth' ? { age: { lt: 18 } } : {}),
        ...(typeFilter === 'chaperone' ? { age: { gte: 18 } } : {}),
      },
      include: {
        groupRegistration: true,
      },
      orderBy: [
        { groupRegistrationId: 'asc' },
        { lastName: 'asc' },
      ],
    })

    // Get existing room assignments to filter out already assigned participants
    const existingAssignments = await prisma.roomAssignment.findMany({
      where: {
        participantId: { in: allParticipants.map((p: ParticipantWithGroup) => p.id) },
      },
      select: { participantId: true },
    })
    const assignedParticipantIds = new Set(
      existingAssignments.map((a: { participantId: string | null }) => a.participantId).filter(Boolean)
    )

    // Filter participants based on onlyUnassigned option
    const participants = onlyUnassigned
      ? allParticipants.filter((p: ParticipantWithGroup) => !assignedParticipantIds.has(p.id))
      : allParticipants

    // Get available rooms
    const rooms = await prisma.room.findMany({
      where: {
        building: {
          eventId,
          ...(buildingIds.length > 0 ? { id: { in: buildingIds } } : {}),
        },
        isAvailable: true,
      },
      orderBy: [{ buildingId: 'asc' }, { floor: 'asc' }, { roomNumber: 'asc' }],
    })

    // Group participants by gender and type for matching
    const groupedParticipants = {
      male_youth: participants.filter((p: ParticipantWithGroup) => p.gender === 'male' && p.age < 18),
      male_adult: participants.filter((p: ParticipantWithGroup) => p.gender === 'male' && p.age >= 18),
      female_youth: participants.filter((p: ParticipantWithGroup) => p.gender === 'female' && p.age < 18),
      female_adult: participants.filter((p: ParticipantWithGroup) => p.gender === 'female' && p.age >= 18),
    }

    // Filter rooms by gender/type
    const groupedRooms = {
      male_youth: rooms.filter((r: RoomRecord) =>
        (r.gender === 'male' || !r.gender) &&
        (r.housingType === 'youth_u18' || !r.housingType)
      ),
      male_adult: rooms.filter((r: RoomRecord) =>
        (r.gender === 'male' || !r.gender) &&
        (r.housingType !== 'youth_u18' || !r.housingType)
      ),
      female_youth: rooms.filter((r: RoomRecord) =>
        (r.gender === 'female' || !r.gender) &&
        (r.housingType === 'youth_u18' || !r.housingType)
      ),
      female_adult: rooms.filter((r: RoomRecord) =>
        (r.gender === 'female' || !r.gender) &&
        (r.housingType !== 'youth_u18' || !r.housingType)
      ),
    }

    // Assignment function
    const assignParticipants = async (
      participantsList: ParticipantWithGroup[],
      availableRooms: RoomRecord[]
    ) => {
      if (strategy === 'parish_together') {
        // Group by parish
        const byParish: Record<string, ParticipantWithGroup[]> = {}
        for (const p of participantsList) {
          const parish = p.groupRegistration?.parishName || 'Unknown'
          if (!byParish[parish]) byParish[parish] = []
          byParish[parish].push(p)
        }

        for (const [parish, parishParticipants] of Object.entries(byParish)) {
          for (const p of parishParticipants) {
            const room = availableRooms.find((r: RoomRecord) => r.currentOccupancy < r.capacity)
            if (room) {
              try {
                await prisma.roomAssignment.create({
                  data: {
                    roomId: room.id,
                    participantId: p.id,
                    assignedBy: user.id,
                  },
                })
                room.currentOccupancy++
                await prisma.room.update({
                  where: { id: room.id },
                  data: { currentOccupancy: room.currentOccupancy },
                })
                assigned++
              } catch (e) {
                errors.push(`Failed to assign ${p.firstName} ${p.lastName}`)
                skipped++
              }
            } else {
              skipped++
            }
          }
        }
      } else {
        // Simple fill or balance
        for (const p of participantsList) {
          let room
          if (strategy === 'fill_rooms') {
            room = availableRooms.find((r: RoomRecord) => r.currentOccupancy < r.capacity)
          } else {
            // Balance: find room with lowest occupancy
            room = availableRooms
              .filter((r: RoomRecord) => r.currentOccupancy < r.capacity)
              .sort((a: RoomRecord, b: RoomRecord) => a.currentOccupancy - b.currentOccupancy)[0]
          }

          if (room) {
            try {
              await prisma.roomAssignment.create({
                data: {
                  roomId: room.id,
                  participantId: p.id,
                  assignedBy: user.id,
                },
              })
              room.currentOccupancy++
              await prisma.room.update({
                where: { id: room.id },
                data: { currentOccupancy: room.currentOccupancy },
              })
              assigned++
            } catch (e) {
              errors.push(`Failed to assign ${p.firstName} ${p.lastName}`)
              skipped++
            }
          } else {
            skipped++
          }
        }
      }
    }

    // Run assignments for each group
    await assignParticipants(groupedParticipants.male_youth, groupedRooms.male_youth)
    await assignParticipants(groupedParticipants.male_adult, groupedRooms.male_adult)
    await assignParticipants(groupedParticipants.female_youth, groupedRooms.female_youth)
    await assignParticipants(groupedParticipants.female_adult, groupedRooms.female_adult)

    return NextResponse.json({ assigned, skipped, errors })
  } catch (error) {
    console.error('Failed to auto-assign:', error)
    return NextResponse.json(
      { message: 'Failed to auto-assign' },
      { status: 500 }
    )
  }
}
