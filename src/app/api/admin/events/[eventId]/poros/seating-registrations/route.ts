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

    // Get group registrations with seating assignments
    const groupRegs = await prisma.groupRegistration.findMany({
      where: { eventId },
      include: {
        seatingAssignment: {
          include: { section: true },
        },
        _count: { select: { participants: true } },
      },
    })

    // Get individual registrations with seating assignments
    const individualRegs = await prisma.individualRegistration.findMany({
      where: { eventId },
      include: {
        seatingAssignment: {
          include: { section: true },
        },
      },
    })

    const registrations = [
      ...groupRegs.map(r => ({
        id: r.id,
        type: 'group' as const,
        name: r.parishName,
        participantCount: r._count.participants,
        seatingAssignment: r.seatingAssignment
          ? {
              sectionId: r.seatingAssignment.sectionId,
              sectionName: r.seatingAssignment.section.name,
            }
          : null,
      })),
      ...individualRegs.map(r => ({
        id: r.id,
        type: 'individual' as const,
        name: `${r.firstName} ${r.lastName}`,
        participantCount: 1,
        seatingAssignment: r.seatingAssignment
          ? {
              sectionId: r.seatingAssignment.sectionId,
              sectionName: r.seatingAssignment.section.name,
            }
          : null,
      })),
    ]

    return NextResponse.json(registrations)
  } catch (error) {
    console.error('Failed to fetch seating registrations:', error)
    return NextResponse.json(
      { message: 'Failed to fetch seating registrations' },
      { status: 500 }
    )
  }
}
