import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

// POST /api/admin/events/[eventId]/poros/fix-room-occupancy
// One-time fix to recalculate room occupancy based on existing assignments
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[POST /api/admin/events/[eventId]/poros/fix-room-occupancy]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    // Get all rooms for this event
    const rooms = await prisma.room.findMany({
      where: {
        building: { eventId },
      },
      select: {
        id: true,
        roomNumber: true,
        currentOccupancy: true,
      },
    })

    // Get all room assignments with group participant counts
    const assignments = await prisma.roomAssignment.findMany({
      where: {
        room: {
          building: { eventId },
        },
      },
      select: {
        roomId: true,
        groupRegistrationId: true,
        notes: true,
        room: {
          select: {
            gender: true,
          },
        },
      },
    })

    // Get participant counts for each group
    const groupIds = [...new Set(assignments.filter(a => a.groupRegistrationId).map(a => a.groupRegistrationId!))]
    const groups = await prisma.groupRegistration.findMany({
      where: {
        id: { in: groupIds },
      },
      select: {
        id: true,
        participants: {
          select: {
            gender: true,
          },
        },
      },
    })

    // Create a map of group ID to participant counts
    const groupParticipantCounts = new Map<string, { male: number; female: number; total: number }>()
    for (const group of groups) {
      const maleCount = group.participants.filter(p => p.gender?.toLowerCase() === 'male').length
      const femaleCount = group.participants.filter(p => p.gender?.toLowerCase() === 'female').length
      groupParticipantCounts.set(group.id, {
        male: maleCount,
        female: femaleCount,
        total: maleCount + femaleCount,
      })
    }

    // Calculate occupancy for each room
    const roomOccupancy = new Map<string, number>()
    for (const assignment of assignments) {
      if (!assignment.groupRegistrationId) continue

      const counts = groupParticipantCounts.get(assignment.groupRegistrationId)
      if (!counts) continue

      const currentOccupancy = roomOccupancy.get(assignment.roomId) || 0

      // Determine which count to use based on room gender or assignment notes
      let occupancyToAdd = counts.total
      const roomGender = assignment.room?.gender
      const notes = assignment.notes?.toLowerCase() || ''

      if (roomGender === 'male' || notes.includes('male')) {
        occupancyToAdd = counts.male
      } else if (roomGender === 'female' || notes.includes('female')) {
        occupancyToAdd = counts.female
      }

      roomOccupancy.set(assignment.roomId, currentOccupancy + occupancyToAdd)
    }

    // Update all rooms with calculated occupancy
    const updates: { roomId: string; oldOccupancy: number; newOccupancy: number; roomNumber: string }[] = []

    for (const room of rooms) {
      const newOccupancy = roomOccupancy.get(room.id) || 0

      if (room.currentOccupancy !== newOccupancy) {
        await prisma.room.update({
          where: { id: room.id },
          data: { currentOccupancy: newOccupancy },
        })

        updates.push({
          roomId: room.id,
          roomNumber: room.roomNumber,
          oldOccupancy: room.currentOccupancy,
          newOccupancy,
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updates.length} rooms`,
      updates,
    })
  } catch (error) {
    console.error('Error fixing room occupancy:', error)
    return NextResponse.json(
      { error: 'Failed to fix room occupancy' },
      { status: 500 }
    )
  }
}
