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
          { parishName: { contains: query, mode: 'insensitive' } },
          { groupLeaderName: { contains: query, mode: 'insensitive' } },
          { groupLeaderEmail: { contains: query, mode: 'insensitive' } },
          { groupLeaderPhone: { contains: query, mode: 'insensitive' } },
          { dioceseName: { contains: query, mode: 'insensitive' } },
        ]
      },
      include: {
        participants: {
          select: { id: true, firstName: true, lastName: true, gender: true }
        }
      },
      take: 10,
      orderBy: { groupName: 'asc' }
    })

    const groupIds = groupRegistrations.map((g: { id: string }) => g.id)

    // Get room assignments for these groups
    const roomAssignments = await prisma.roomAssignment.findMany({
      where: {
        groupRegistrationId: { in: groupIds }
      },
      include: {
        room: {
          include: { building: true }
        }
      }
    })

    // Get seating assignments
    const seatingAssignments = await prisma.seatingAssignment.findMany({
      where: {
        groupRegistrationId: { in: groupIds }
      },
      include: {
        section: true
      }
    })

    // Get small group assignments
    const smallGroupAssignments = await prisma.smallGroupAssignment.findMany({
      where: {
        groupRegistrationId: { in: groupIds }
      },
      include: {
        smallGroup: { select: { id: true, name: true } }
      }
    })

    // Get meal color assignments
    let mealColorAssignments: any[] = []
    try {
      mealColorAssignments = await prisma.mealColorAssignment.findMany({
        where: {
          groupRegistrationId: { in: groupIds }
        }
      })
    } catch {
      // Table might not exist yet
    }

    // Create lookup maps
    const roomMap = new Map<string, any[]>()
    roomAssignments.forEach((ra: any) => {
      const grId = ra.groupRegistrationId
      if (grId) {
        if (!roomMap.has(grId)) roomMap.set(grId, [])
        roomMap.get(grId)!.push({
          building: ra.room.building.name,
          room: ra.room.roomNumber
        })
      }
    })

    const seatingMap = new Map<string, any>()
    seatingAssignments.forEach((sa: any) => {
      if (sa.groupRegistrationId) {
        seatingMap.set(sa.groupRegistrationId, {
          section: sa.section.name
        })
      }
    })

    const smallGroupMap = new Map(
      smallGroupAssignments
        .filter((a: any) => a.groupRegistrationId)
        .map((a: any) => [a.groupRegistrationId, a.smallGroup])
    )

    const mealColorMap = new Map(
      mealColorAssignments
        .filter((a: any) => a.groupRegistrationId)
        .map((a: any) => [a.groupRegistrationId, a.color])
    )

    // Format response
    const results = groupRegistrations.map((gr: any) => ({
      id: gr.id,
      type: 'group' as const,
      groupName: gr.groupName,
      leaderName: gr.groupLeaderName,
      leaderEmail: gr.groupLeaderEmail,
      leaderPhone: gr.groupLeaderPhone,
      diocese: gr.dioceseName || gr.parishName,
      housingType: gr.housingType,
      participantCount: gr.participants.length,
      maleCount: gr.participants.filter((p: any) => p.gender?.toLowerCase() === 'male').length,
      femaleCount: gr.participants.filter((p: any) => p.gender?.toLowerCase() === 'female').length,
      roomAssignments: roomMap.get(gr.id) || [],
      seating: seatingMap.get(gr.id) || null,
      smallGroup: smallGroupMap.get(gr.id) || null,
      mealColor: mealColorMap.get(gr.id) || null
    }))

    return NextResponse.json(results)
  } catch (error) {
    console.error('Failed to search:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
