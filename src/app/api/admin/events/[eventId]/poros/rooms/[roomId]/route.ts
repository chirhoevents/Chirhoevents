import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

interface RoomRecord {
  id: string
  capacity: number
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; roomId: string }> }
) {
  try {
    const { eventId, roomId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[PUT /api/admin/events/[eventId]/poros/rooms/[roomId]]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[PUT Room] ❌ User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }
    const body = await request.json()

    const room = await prisma.room.update({
      where: { id: roomId },
      data: {
        buildingId: body.buildingId,
        roomNumber: body.roomNumber,
        floor: body.floor,
        bedCount: body.capacity,
        roomType: body.roomType,
        gender: body.gender,
        housingType: body.housingType,
        capacity: body.capacity,
        notes: body.notes,
        isAvailable: body.isAvailable,
        isAdaAccessible: body.isAdaAccessible,
      },
    })

    return NextResponse.json(room)
  } catch (error) {
    console.error('Failed to update room:', error)
    return NextResponse.json(
      { message: 'Failed to update room' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; roomId: string }> }
) {
  try {
    const { eventId, roomId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[DELETE /api/admin/events/[eventId]/poros/rooms/[roomId]]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[DELETE Room] ❌ User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
    })

    await prisma.room.delete({
      where: { id: roomId },
    })

    // Update building counts
    if (room) {
      const rooms = await prisma.room.findMany({
        where: { buildingId: room.buildingId },
      })
      await prisma.building.update({
        where: { id: room.buildingId },
        data: {
          totalRooms: rooms.length,
          totalBeds: rooms.reduce((sum: number, r: RoomRecord) => sum + r.capacity, 0),
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete room:', error)
    return NextResponse.json(
      { message: 'Failed to delete room' },
      { status: 500 }
    )
  }
}
