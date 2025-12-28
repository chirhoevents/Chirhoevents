import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { eventId } = body

    if (!eventId) {
      return NextResponse.json(
        { message: 'Event ID is required' },
        { status: 400 }
      )
    }

    // Verify the group registration belongs to this user
    const groupRegistration = await prisma.groupRegistration.findFirst({
      where: {
        clerkUserId: userId,
        id: eventId,
      },
    })

    if (!groupRegistration) {
      return NextResponse.json(
        { message: 'Group registration not found' },
        { status: 404 }
      )
    }

    // Check if already locked
    if (groupRegistration.housingAssignmentsLocked) {
      return NextResponse.json(
        { message: 'Housing assignments are already submitted' },
        { status: 400 }
      )
    }

    // Lock the assignments
    await prisma.groupRegistration.update({
      where: { id: groupRegistration.id },
      data: {
        housingAssignmentsLocked: true,
        housingAssignmentsSubmittedAt: new Date(),
      },
    })

    // TODO: Send confirmation email to group leader
    // TODO: Notify org admin

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error submitting housing assignments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
