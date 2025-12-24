import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const user = await requireAdmin()
    const { eventId } = params
    const body = await request.json()
    const { type } = body

    switch (type) {
      case 'housing':
        // Delete all room assignments for this event
        await prisma.roomAssignment.deleteMany({
          where: {
            room: { building: { eventId } },
          },
        })
        // Reset room occupancy
        await prisma.room.updateMany({
          where: { building: { eventId } },
          data: { currentOccupancy: 0 },
        })
        return NextResponse.json({ message: 'Housing assignments reset' })

      case 'small_groups':
        // Delete all small group assignments
        await prisma.smallGroupAssignment.deleteMany({
          where: { smallGroup: { eventId } },
        })
        // Reset group sizes
        await prisma.smallGroup.updateMany({
          where: { eventId },
          data: { currentSize: 0 },
        })
        return NextResponse.json({ message: 'Small group assignments reset' })

      case 'seating':
        // Delete all seating assignments
        await prisma.seatingAssignment.deleteMany({
          where: { section: { eventId } },
        })
        // Reset section occupancy
        await prisma.seatingSection.updateMany({
          where: { eventId },
          data: { currentOccupancy: 0 },
        })
        return NextResponse.json({ message: 'Seating assignments reset' })

      case 'meal_groups':
        // Delete all meal group assignments
        await prisma.mealGroupAssignment.deleteMany({
          where: { mealGroup: { eventId } },
        })
        // Reset group sizes
        await prisma.mealGroup.updateMany({
          where: { eventId },
          data: { currentSize: 0 },
        })
        return NextResponse.json({ message: 'Meal group assignments reset' })

      case 'all':
        // Delete all Poros data for this event
        // Order matters due to foreign keys
        await prisma.roomAssignment.deleteMany({
          where: { room: { building: { eventId } } },
        })
        await prisma.room.deleteMany({
          where: { building: { eventId } },
        })
        await prisma.building.deleteMany({
          where: { eventId },
        })
        await prisma.smallGroupAssignment.deleteMany({
          where: { smallGroup: { eventId } },
        })
        await prisma.smallGroup.deleteMany({
          where: { eventId },
        })
        await prisma.seatingAssignment.deleteMany({
          where: { section: { eventId } },
        })
        await prisma.seatingSection.deleteMany({
          where: { eventId },
        })
        await prisma.mealGroupAssignment.deleteMany({
          where: { mealGroup: { eventId } },
        })
        await prisma.mealGroup.deleteMany({
          where: { eventId },
        })
        await prisma.porosStaff.deleteMany({
          where: { eventId },
        })
        await prisma.adaIndividual.deleteMany({
          where: { eventId },
        })
        return NextResponse.json({ message: 'All Poros data reset' })

      default:
        return NextResponse.json(
          { message: 'Invalid reset type' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Failed to reset:', error)
    return NextResponse.json(
      { message: 'Failed to reset' },
      { status: 500 }
    )
  }
}
