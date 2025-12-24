import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const user = await requireAdmin()
    const { eventId } = params
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

    // Get unassigned participants
    const participants = await prisma.participant.findMany({
      where: {
        groupRegistration: { eventId },
        accommodationType: { in: ['on_campus', 'ON_CAMPUS'] },
        roomAssignment: onlyUnassigned ? null : undefined,
        ...(genderFilter !== 'all' ? { gender: genderFilter } : {}),
        ...(typeFilter === 'youth' ? { isMinor: true } : {}),
        ...(typeFilter === 'chaperone' ? { isMinor: false } : {}),
      },
      include: {
        groupRegistration: true,
      },
      orderBy: [
        { groupRegistrationId: 'asc' },
        { lastName: 'asc' },
      ],
    })

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
      male_youth: participants.filter(p => p.gender?.toLowerCase() === 'male' && p.isMinor),
      male_adult: participants.filter(p => p.gender?.toLowerCase() === 'male' && !p.isMinor),
      female_youth: participants.filter(p => p.gender?.toLowerCase() === 'female' && p.isMinor),
      female_adult: participants.filter(p => p.gender?.toLowerCase() === 'female' && !p.isMinor),
    }

    // Filter rooms by gender/type
    const groupedRooms = {
      male_youth: rooms.filter(r =>
        (r.gender === 'male' || !r.gender) &&
        (r.housingType === 'youth_u18' || !r.housingType)
      ),
      male_adult: rooms.filter(r =>
        (r.gender === 'male' || !r.gender) &&
        (r.housingType !== 'youth_u18' || !r.housingType)
      ),
      female_youth: rooms.filter(r =>
        (r.gender === 'female' || !r.gender) &&
        (r.housingType === 'youth_u18' || !r.housingType)
      ),
      female_adult: rooms.filter(r =>
        (r.gender === 'female' || !r.gender) &&
        (r.housingType !== 'youth_u18' || !r.housingType)
      ),
    }

    // Assignment function
    async function assignParticipants(
      participants: typeof groupedParticipants.male_youth,
      availableRooms: typeof rooms
    ) {
      if (strategy === 'parish_together') {
        // Group by parish
        const byParish: Record<string, typeof participants> = {}
        for (const p of participants) {
          const parish = p.groupRegistration?.parishName || 'Unknown'
          if (!byParish[parish]) byParish[parish] = []
          byParish[parish].push(p)
        }

        for (const [parish, parishParticipants] of Object.entries(byParish)) {
          for (const p of parishParticipants) {
            const room = availableRooms.find(r => r.currentOccupancy < r.capacity)
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
        for (const p of participants) {
          let room
          if (strategy === 'fill_rooms') {
            room = availableRooms.find(r => r.currentOccupancy < r.capacity)
          } else {
            // Balance: find room with lowest occupancy
            room = availableRooms
              .filter(r => r.currentOccupancy < r.capacity)
              .sort((a, b) => a.currentOccupancy - b.currentOccupancy)[0]
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
