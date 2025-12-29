import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; groupId: string }> }
) {
  try {
    const user = await requireAdmin()
    const { groupId } = await params
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
    const user = await requireAdmin()
    const { groupId } = await params

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
