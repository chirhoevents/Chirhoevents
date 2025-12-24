import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const user = await requireAdmin()
    const { eventId } = params

    const groups = await prisma.smallGroup.findMany({
      where: { eventId },
      include: {
        sgl: true,
        coSgl: true,
        assignments: true,
      },
      orderBy: { groupNumber: 'asc' },
    })

    return NextResponse.json(groups)
  } catch (error) {
    console.error('Failed to fetch small groups:', error)
    return NextResponse.json(
      { message: 'Failed to fetch small groups' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const user = await requireAdmin()
    const { eventId } = params
    const body = await request.json()

    const group = await prisma.smallGroup.create({
      data: {
        eventId,
        name: body.name,
        groupNumber: body.groupNumber || null,
        sglId: body.sglId || null,
        coSglId: body.coSglId || null,
        meetingTime: body.meetingTime || null,
        meetingPlace: body.meetingPlace || null,
        capacity: body.capacity || 12,
        notes: body.notes || null,
      },
    })

    return NextResponse.json(group, { status: 201 })
  } catch (error) {
    console.error('Failed to create small group:', error)
    return NextResponse.json(
      { message: 'Failed to create small group' },
      { status: 500 }
    )
  }
}
