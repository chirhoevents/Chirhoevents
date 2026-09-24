import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'
import { deleteParticipantAndForms } from '@/lib/delete-participant'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ participantId: string }> }
) {
  try {
    const userId = await getClerkUserIdFromRequest(req)

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // This route's :participantId param doubles as either a Participant id
    // (a completed form) or a raw LiabilityForm id (a pending, not-yet-linked
    // youth-u18 form still waiting on a parent) — the two live in separate ID
    // spaces so there's no collision risk. Group leaders need to be able to
    // delete both: a stale pending duplicate has no Participant to hang off.
    const { participantId: id } = await params

    const participant = await prisma.participant.findUnique({
      where: { id },
      include: {
        groupRegistration: {
          select: {
            clerkUserId: true,
          },
        },
      },
    })

    if (participant) {
      if (participant.groupRegistration.clerkUserId !== userId) {
        return NextResponse.json(
          { error: 'Unauthorized - This participant does not belong to your group' },
          { status: 403 }
        )
      }

      await deleteParticipantAndForms(id)

      return NextResponse.json({
        success: true,
        message: 'Participant and associated forms deleted successfully',
      })
    }

    // Not a Participant — try a pending, participant-less LiabilityForm instead.
    const form = await prisma.liabilityForm.findUnique({
      where: { id },
      include: {
        groupRegistration: {
          select: {
            clerkUserId: true,
          },
        },
      },
    })

    if (!form) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      )
    }

    if (!form.groupRegistration || form.groupRegistration.clerkUserId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized - This form does not belong to your group' },
        { status: 403 }
      )
    }

    if (form.completed || form.participantId) {
      return NextResponse.json(
        { error: 'This form is already completed — delete the participant instead.' },
        { status: 400 }
      )
    }

    await prisma.liabilityForm.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Pending form deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting participant:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
