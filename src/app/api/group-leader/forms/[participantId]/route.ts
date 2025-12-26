import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { participantId: string } }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { participantId } = params

    // Find the participant and verify it belongs to this user's group
    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      include: {
        groupRegistration: {
          select: {
            clerkUserId: true,
          },
        },
      },
    })

    if (!participant) {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      )
    }

    // Verify the participant belongs to this user's group
    if (participant.groupRegistration.clerkUserId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized - This participant does not belong to your group' },
        { status: 403 }
      )
    }

    // Delete the participant (this will cascade delete liability forms due to onDelete: Cascade)
    await prisma.participant.delete({
      where: { id: participantId },
    })

    return NextResponse.json({
      success: true,
      message: 'Participant and associated forms deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting participant:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
