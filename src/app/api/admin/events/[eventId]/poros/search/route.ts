import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Search group registrations for quick lookup
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')?.toLowerCase() || ''

    if (!query || query.length < 2) {
      return NextResponse.json([])
    }

    // Search group registrations
    const groupRegistrations = await prisma.groupRegistration.findMany({
      where: {
        eventId: params.eventId,
        OR: [
          { groupName: { contains: query, mode: 'insensitive' } },
          { groupLeaderName: { contains: query, mode: 'insensitive' } },
          { groupLeaderEmail: { contains: query, mode: 'insensitive' } },
          { groupLeaderPhone: { contains: query, mode: 'insensitive' } },
          { diocese: { contains: query, mode: 'insensitive' } },
        ]
      },
      include: {
        participants: {
          select: { id: true, firstName: true, lastName: true, gender: true }
        },
        roomAssignments: {
          include: {
            room: {
              include: { building: true }
            }
          }
        },
        seatingAssignment: {
          include: { section: true }
        }
      },
      take: 10,
      orderBy: { groupName: 'asc' }
    })

    // Get small group and meal color assignments
    const groupIds = groupRegistrations.map(g => g.id)

    const smallGroupAssignments = await prisma.smallGroupAssignment.findMany({
      where: {
        groupRegistrationId: { in: groupIds }
      },
      include: {
        smallGroup: { select: { id: true, name: true } }
      }
    })

    const mealColorAssignments = await prisma.mealColorAssignment.findMany({
      where: {
        groupRegistrationId: { in: groupIds }
      }
    })

    // Create lookup maps
    const smallGroupMap = new Map(
      smallGroupAssignments.map(a => [a.groupRegistrationId, a.smallGroup])
    )
    const mealColorMap = new Map(
      mealColorAssignments.map(a => [a.groupRegistrationId, a.color])
    )

    // Format response
    const results = groupRegistrations.map(gr => ({
      id: gr.id,
      type: 'group' as const,
      groupName: gr.groupName,
      leaderName: gr.groupLeaderName,
      leaderEmail: gr.groupLeaderEmail,
      leaderPhone: gr.groupLeaderPhone,
      diocese: gr.diocese,
      housingType: gr.housingType,
      participantCount: gr.participants.length,
      maleCount: gr.participants.filter(p => p.gender?.toLowerCase() === 'male').length,
      femaleCount: gr.participants.filter(p => p.gender?.toLowerCase() === 'female').length,
      roomAssignments: gr.roomAssignments.map(ra => ({
        building: ra.room.building.name,
        room: ra.room.roomNumber,
        gender: ra.gender
      })),
      seating: gr.seatingAssignment ? {
        section: gr.seatingAssignment.section.name,
        row: gr.seatingAssignment.rowNumber
      } : null,
      smallGroup: smallGroupMap.get(gr.id) || null,
      mealColor: mealColorMap.get(gr.id) || null
    }))

    return NextResponse.json(results)
  } catch (error) {
    console.error('Failed to search:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
