import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

// GET /api/admin/events/[eventId]/poros/group-small-group-assignments
// Returns groups with their SGL, religious, and room assignments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[GET /api/admin/events/[eventId]/poros/group-small-group-assignments]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    // Get all groups with their staff assignments and room
    const groups = await prisma.groupRegistration.findMany({
      where: { eventId },
      select: {
        id: true,
        groupName: true,
        parishName: true,
        totalParticipants: true,
        smallGroupRoomId: true,
        smallGroupRoom: {
          select: {
            id: true,
            roomNumber: true,
            capacity: true,
            building: {
              select: {
                name: true,
              },
            },
          },
        },
        groupStaffAssignments: {
          select: {
            id: true,
            role: true,
            staff: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { groupName: 'asc' },
    })

    // Get available staff (SGL and religious types)
    const staff = await prisma.porosStaff.findMany({
      where: {
        eventId,
        staffType: { in: ['sgl', 'co_sgl', 'religious'] },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        staffType: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })

    // Get available rooms (small group purpose)
    const rooms = await prisma.room.findMany({
      where: {
        building: { eventId },
        roomPurpose: 'small_group',
        isAvailable: true,
      },
      select: {
        id: true,
        roomNumber: true,
        capacity: true,
        building: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ building: { name: 'asc' } }, { roomNumber: 'asc' }],
    })

    // Get which rooms are already assigned (for showing availability)
    const assignedRoomIds = groups
      .filter((g) => g.smallGroupRoomId)
      .map((g) => g.smallGroupRoomId)

    // Transform data
    const result = groups.map((group) => {
      const sglAssignments = group.groupStaffAssignments
        .filter((a) => a.role === 'sgl')
        .map((a) => ({
          id: a.staff.id,
          name: `${a.staff.firstName} ${a.staff.lastName}`,
          assignmentId: a.id,
        }))

      const religiousAssignments = group.groupStaffAssignments
        .filter((a) => a.role === 'religious')
        .map((a) => ({
          id: a.staff.id,
          name: `${a.staff.firstName} ${a.staff.lastName}`,
          assignmentId: a.id,
        }))

      return {
        id: group.id,
        groupName: group.groupName,
        parishName: group.parishName,
        totalParticipants: group.totalParticipants,
        sglList: sglAssignments,
        religiousList: religiousAssignments,
        room: group.smallGroupRoom
          ? {
              id: group.smallGroupRoom.id,
              name: `${group.smallGroupRoom.building.name} - ${group.smallGroupRoom.roomNumber}`,
              capacity: group.smallGroupRoom.capacity,
            }
          : null,
      }
    })

    return NextResponse.json({
      groups: result,
      staff: {
        sgl: staff.filter((s) => s.staffType === 'sgl' || s.staffType === 'co_sgl'),
        religious: staff.filter((s) => s.staffType === 'religious'),
      },
      rooms: rooms.map((r) => ({
        id: r.id,
        name: `${r.building.name} - ${r.roomNumber}`,
        capacity: r.capacity,
        buildingId: r.building.id,
        buildingName: r.building.name,
        isAssigned: assignedRoomIds.includes(r.id),
      })),
    })
  } catch (error) {
    console.error('Error fetching group small group assignments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assignments' },
      { status: 500 }
    )
  }
}

// POST /api/admin/events/[eventId]/poros/group-small-group-assignments
// Add a staff member to a group
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[POST /api/admin/events/[eventId]/poros/group-small-group-assignments]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    const { groupId, staffId, role } = await request.json()

    if (!groupId || !staffId || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!['sgl', 'religious'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "sgl" or "religious"' },
        { status: 400 }
      )
    }

    // Verify group exists and belongs to this event
    const group = await prisma.groupRegistration.findFirst({
      where: { id: groupId, eventId },
    })

    if (!group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      )
    }

    // Check if assignment already exists
    const existing = await prisma.groupStaffAssignment.findFirst({
      where: { groupRegistrationId: groupId, staffId, role },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Staff member already assigned to this group with this role' },
        { status: 400 }
      )
    }

    // Create the assignment
    const assignment = await prisma.groupStaffAssignment.create({
      data: {
        groupRegistrationId: groupId,
        staffId,
        role,
        assignedBy: user?.id,
      },
      include: {
        staff: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      assignment: {
        id: assignment.staff.id,
        name: `${assignment.staff.firstName} ${assignment.staff.lastName}`,
        assignmentId: assignment.id,
      },
    })
  } catch (error) {
    console.error('Error adding staff assignment:', error)
    return NextResponse.json(
      { error: 'Failed to add assignment' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/events/[eventId]/poros/group-small-group-assignments
// Remove a staff member from a group
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[DELETE /api/admin/events/[eventId]/poros/group-small-group-assignments]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    const { assignmentId } = await request.json()

    if (!assignmentId) {
      return NextResponse.json(
        { error: 'Missing assignment ID' },
        { status: 400 }
      )
    }

    // Delete the assignment
    await prisma.groupStaffAssignment.delete({
      where: { id: assignmentId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing staff assignment:', error)
    return NextResponse.json(
      { error: 'Failed to remove assignment' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/events/[eventId]/poros/group-small-group-assignments
// Update a group's room assignment
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[PATCH /api/admin/events/[eventId]/poros/group-small-group-assignments]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    const { groupId, roomId } = await request.json()

    if (!groupId) {
      return NextResponse.json(
        { error: 'Missing group ID' },
        { status: 400 }
      )
    }

    // Verify group exists and belongs to this event
    const group = await prisma.groupRegistration.findFirst({
      where: { id: groupId, eventId },
    })

    if (!group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      )
    }

    // If setting a room, check if it's already assigned to another group
    if (roomId) {
      const existingAssignment = await prisma.groupRegistration.findFirst({
        where: {
          smallGroupRoomId: roomId,
          id: { not: groupId },
        },
        select: { groupName: true, parishName: true },
      })

      if (existingAssignment) {
        return NextResponse.json(
          {
            error: `Room is already assigned to ${existingAssignment.parishName || existingAssignment.groupName}`,
          },
          { status: 400 }
        )
      }
    }

    // Update the group's room assignment
    const updatedGroup = await prisma.groupRegistration.update({
      where: { id: groupId },
      data: {
        smallGroupRoomId: roomId || null,
      },
      select: {
        smallGroupRoom: {
          select: {
            id: true,
            roomNumber: true,
            capacity: true,
            building: { select: { name: true } },
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      room: updatedGroup.smallGroupRoom
        ? {
            id: updatedGroup.smallGroupRoom.id,
            name: `${updatedGroup.smallGroupRoom.building.name} - ${updatedGroup.smallGroupRoom.roomNumber}`,
            capacity: updatedGroup.smallGroupRoom.capacity,
          }
        : null,
    })
  } catch (error) {
    console.error('Error updating room assignment:', error)
    return NextResponse.json(
      { error: 'Failed to update room assignment' },
      { status: 500 }
    )
  }
}
