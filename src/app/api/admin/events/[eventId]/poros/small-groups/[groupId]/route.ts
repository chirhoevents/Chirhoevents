import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; groupId: string }> }
) {
  try {
    const { eventId, groupId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[PUT /api/admin/events/[eventId]/poros/small-groups/[groupId]]',
    })
    if (error) return error
    const body = await request.json()

    const group = await prisma.smallGroup.update({
      where: { id: groupId },
      data: {
        name: body.name,
        groupNumber: body.groupNumber,
        sglId: body.sglId || null,
        coSglId: body.coSglId || null,
        meetingTime: body.meetingTime,
        meetingPlace: body.meetingPlace,
        capacity: body.capacity,
        notes: body.notes,
      },
    })

    return NextResponse.json(group)
  } catch (error) {
    console.error('Failed to update small group:', error)
    return NextResponse.json(
      { message: 'Failed to update small group' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; groupId: string }> }
) {
  try {
    const { eventId, groupId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[DELETE /api/admin/events/[eventId]/poros/small-groups/[groupId]]',
    })
    if (error) return error

    await prisma.smallGroup.delete({
      where: { id: groupId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete small group:', error)
    return NextResponse.json(
      { message: 'Failed to delete small group' },
      { status: 500 }
    )
  }
}
