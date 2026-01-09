import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[Seating Assignments POST]',
    })
    if (error) return error
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json()

    const { sectionId, groupRegistrationId, individualRegistrationId } = body

    // Check if already assigned
    if (groupRegistrationId) {
      const existing = await prisma.seatingAssignment.findFirst({
        where: { groupRegistrationId },
      })
      if (existing) {
        // Update existing
        await prisma.seatingAssignment.update({
          where: { id: existing.id },
          data: { sectionId },
        })
        return NextResponse.json({ updated: true })
      }
    }

    if (individualRegistrationId) {
      const existing = await prisma.seatingAssignment.findFirst({
        where: { individualRegistrationId },
      })
      if (existing) {
        await prisma.seatingAssignment.update({
          where: { id: existing.id },
          data: { sectionId },
        })
        return NextResponse.json({ updated: true })
      }
    }

    // Create assignment
    const assignment = await prisma.seatingAssignment.create({
      data: {
        sectionId,
        groupRegistrationId: groupRegistrationId || null,
        individualRegistrationId: individualRegistrationId || null,
        assignedBy: user.id,
      },
    })

    // Update section occupancy
    const count = await prisma.seatingAssignment.count({
      where: { sectionId },
    })
    await prisma.seatingSection.update({
      where: { id: sectionId },
      data: { currentOccupancy: count },
    })

    return NextResponse.json(assignment, { status: 201 })
  } catch (error) {
    console.error('Failed to create seating assignment:', error)
    return NextResponse.json(
      { message: 'Failed to create seating assignment' },
      { status: 500 }
    )
  }
}
