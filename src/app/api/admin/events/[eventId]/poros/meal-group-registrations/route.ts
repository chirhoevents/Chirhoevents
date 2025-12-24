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

    // Get group registrations with meal group assignments
    const groupRegs = await prisma.groupRegistration.findMany({
      where: { eventId },
      include: {
        mealGroupAssignment: {
          include: { mealGroup: true },
        },
        _count: { select: { participants: true } },
      },
    })

    // Get individual registrations with meal group assignments
    const individualRegs = await prisma.individualRegistration.findMany({
      where: { eventId },
      include: {
        mealGroupAssignment: {
          include: { mealGroup: true },
        },
      },
    })

    const registrations = [
      ...groupRegs.map(r => ({
        id: r.id,
        type: 'group' as const,
        name: r.parishName,
        participantCount: r._count.participants,
        mealGroupAssignment: r.mealGroupAssignment
          ? {
              groupId: r.mealGroupAssignment.mealGroupId,
              groupName: r.mealGroupAssignment.mealGroup.name,
              colorHex: r.mealGroupAssignment.mealGroup.colorHex,
            }
          : null,
      })),
      ...individualRegs.map(r => ({
        id: r.id,
        type: 'individual' as const,
        name: `${r.firstName} ${r.lastName}`,
        participantCount: 1,
        mealGroupAssignment: r.mealGroupAssignment
          ? {
              groupId: r.mealGroupAssignment.mealGroupId,
              groupName: r.mealGroupAssignment.mealGroup.name,
              colorHex: r.mealGroupAssignment.mealGroup.colorHex,
            }
          : null,
      })),
    ]

    return NextResponse.json(registrations)
  } catch (error) {
    console.error('Failed to fetch meal group registrations:', error)
    return NextResponse.json(
      { message: 'Failed to fetch meal group registrations' },
      { status: 500 }
    )
  }
}
