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

    // Get all groups with their staff and room assignments
    const groups = await prisma.groupRegistration.findMany({
      where: { eventId },
      select: {
        id: true,
        groupName: true,
        parishName: true,
        totalParticipants: true,
        sglStaffId: true,
        religiousStaffId: true,
        smallGroupRoomId: true,
        sglStaff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        religiousStaff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        smallGroupRoom: {
          select: {
            id: true,
            roomNumber: true,
            building: {
              select: {
                name: true,
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
        building: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ building: { name: 'asc' } }, { roomNumber: 'asc' }],
    })

    // Transform data
    const result = groups.map((group) => ({
      id: group.id,
      groupName: group.groupName,
      parishName: group.parishName,
      totalParticipants: group.totalParticipants,
      sgl: group.sglStaff
        ? {
            id: group.sglStaff.id,
            name: `${group.sglStaff.firstName} ${group.sglStaff.lastName}`,
          }
        : null,
      religious: group.religiousStaff
        ? {
            id: group.religiousStaff.id,
            name: `${group.religiousStaff.firstName} ${group.religiousStaff.lastName}`,
          }
        : null,
      room: group.smallGroupRoom
        ? {
            id: group.smallGroupRoom.id,
            name: `${group.smallGroupRoom.building.name} - ${group.smallGroupRoom.roomNumber}`,
          }
        : null,
    }))

    return NextResponse.json({
      groups: result,
      staff: {
        sgl: staff.filter((s) => s.staffType === 'sgl' || s.staffType === 'co_sgl'),
        religious: staff.filter((s) => s.staffType === 'religious'),
      },
      rooms: rooms.map((r) => ({
        id: r.id,
        name: `${r.building.name} - ${r.roomNumber}`,
        buildingId: r.building.id,
        buildingName: r.building.name,
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

// PATCH /api/admin/events/[eventId]/poros/group-small-group-assignments
// Update a group's SGL, religious, or room assignment
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

    const { groupId, field, value } = await request.json()

    if (!groupId || !field) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate field name
    const allowedFields = ['sglStaffId', 'religiousStaffId', 'smallGroupRoomId']
    if (!allowedFields.includes(field)) {
      return NextResponse.json(
        { error: 'Invalid field' },
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

    // Update the group
    const updatedGroup = await prisma.groupRegistration.update({
      where: { id: groupId },
      data: {
        [field]: value || null, // null if empty/clearing
      },
      select: {
        id: true,
        sglStaff: {
          select: { id: true, firstName: true, lastName: true },
        },
        religiousStaff: {
          select: { id: true, firstName: true, lastName: true },
        },
        smallGroupRoom: {
          select: {
            id: true,
            roomNumber: true,
            building: { select: { name: true } },
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      sgl: updatedGroup.sglStaff
        ? {
            id: updatedGroup.sglStaff.id,
            name: `${updatedGroup.sglStaff.firstName} ${updatedGroup.sglStaff.lastName}`,
          }
        : null,
      religious: updatedGroup.religiousStaff
        ? {
            id: updatedGroup.religiousStaff.id,
            name: `${updatedGroup.religiousStaff.firstName} ${updatedGroup.religiousStaff.lastName}`,
          }
        : null,
      room: updatedGroup.smallGroupRoom
        ? {
            id: updatedGroup.smallGroupRoom.id,
            name: `${updatedGroup.smallGroupRoom.building.name} - ${updatedGroup.smallGroupRoom.roomNumber}`,
          }
        : null,
    })
  } catch (error) {
    console.error('Error updating group assignment:', error)
    return NextResponse.json(
      { error: 'Failed to update assignment' },
      { status: 500 }
    )
  }
}
