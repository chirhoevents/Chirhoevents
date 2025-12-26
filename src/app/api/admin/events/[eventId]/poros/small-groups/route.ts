import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

interface SmallGroupWithAssignments {
  id: string
  eventId: string
  name: string
  groupNumber: number | null
  sglId: string | null
  coSglId: string | null
  meetingTime: string | null
  meetingPlace: string | null
  capacity: number
  currentSize: number
  notes: string | null
  sgl: { firstName: string; lastName: string } | null
  coSgl: { firstName: string; lastName: string } | null
  assignments: {
    groupRegistrationId: string | null
    individualRegistrationId: string | null
  }[]
}

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
        sgl: {
          select: { firstName: true, lastName: true }
        },
        coSgl: {
          select: { firstName: true, lastName: true }
        },
        assignments: {
          select: {
            groupRegistrationId: true,
            individualRegistrationId: true
          }
        },
      },
      orderBy: { groupNumber: 'asc' },
    })

    // Calculate counts for each group
    const result = groups.map((group: SmallGroupWithAssignments) => ({
      ...group,
      youthGroupCount: group.assignments.filter(a => a.groupRegistrationId !== null).length,
      individualCount: group.assignments.filter(a => a.individualRegistrationId !== null).length,
    }))

    return NextResponse.json(result)
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
