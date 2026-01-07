import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const user = await requireAdmin()
    const { userId } = await auth()
    const { eventId } = await params
    const body = await request.json()

    const { participantIds, action, stationId, notes, groupId, registrationType } = body

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json(
        { message: 'Participant IDs are required' },
        { status: 400 }
      )
    }

    if (!action || !['check_in', 'check_out'].includes(action)) {
      return NextResponse.json(
        { message: 'Valid action is required (check_in, check_out)' },
        { status: 400 }
      )
    }

    const now = new Date()
    const isCheckingIn = action === 'check_in'

    // Check if this is an individual registration check-in
    if (registrationType === 'individual') {
      // Handle individual registration check-in
      const individuals = await prisma.individualRegistration.findMany({
        where: {
          id: { in: participantIds },
          eventId,
        },
      })

      if (individuals.length !== participantIds.length) {
        return NextResponse.json(
          { message: 'One or more registrations not found in this event' },
          { status: 404 }
        )
      }

      // Update individual registrations
      await prisma.individualRegistration.updateMany({
        where: {
          id: { in: participantIds },
        },
        data: {
          checkedIn: isCheckingIn,
          checkedInAt: isCheckingIn ? now : null,
          checkedInBy: isCheckingIn ? userId : null,
          checkInStation: isCheckingIn ? stationId : null,
          checkInNotes: notes || null,
        },
      })

      // Create check-in logs
      await prisma.checkInLog.createMany({
        data: participantIds.map((individualId: string) => ({
          eventId,
          individualRegistrationId: individualId,
          action: action as 'check_in' | 'check_out',
          userId: userId!,
          station: stationId || null,
          notes: notes || null,
        })),
      })

      // Get updated individuals
      const updatedIndividuals = await prisma.individualRegistration.findMany({
        where: {
          id: { in: participantIds },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          checkedIn: true,
          checkedInAt: true,
        },
      })

      return NextResponse.json({
        success: true,
        action,
        count: participantIds.length,
        registrationType: 'individual',
        participants: updatedIndividuals,
      })
    }

    // Handle group participant check-in (original logic)
    const participants = await prisma.participant.findMany({
      where: {
        id: { in: participantIds },
        groupRegistration: {
          eventId,
        },
      },
      include: {
        groupRegistration: {
          select: {
            id: true,
            groupName: true,
          },
        },
      },
    })

    if (participants.length !== participantIds.length) {
      return NextResponse.json(
        { message: 'One or more participants not found in this event' },
        { status: 404 }
      )
    }

    // Update participants
    await prisma.participant.updateMany({
      where: {
        id: { in: participantIds },
      },
      data: {
        checkedIn: isCheckingIn,
        checkedInAt: isCheckingIn ? now : null,
        checkedInBy: isCheckingIn ? userId : null,
        checkInStation: isCheckingIn ? stationId : null,
        checkInNotes: notes || null,
      },
    })

    // Create check-in logs for each participant
    const logs = await prisma.checkInLog.createMany({
      data: participantIds.map((participantId: string) => ({
        eventId,
        participantId,
        groupRegistrationId: participants.find((p: any) => p.id === participantId)?.groupRegistration.id || groupId,
        action: action as 'check_in' | 'check_out',
        userId: userId!,
        station: stationId || null,
        notes: notes || null,
      })),
    })

    // Get updated participants
    const updatedParticipants = await prisma.participant.findMany({
      where: {
        id: { in: participantIds },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        checkedIn: true,
        checkedInAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      action,
      count: participantIds.length,
      participants: updatedParticipants,
    })
  } catch (error) {
    console.error('Failed to process check-in:', error)
    return NextResponse.json(
      { message: 'Failed to process check-in' },
      { status: 500 }
    )
  }
}

// Bulk check-in for entire group
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const user = await requireAdmin()
    const { userId } = await auth()
    const { eventId } = await params
    const body = await request.json()

    const { groupId, action, stationId, notes } = body

    if (!groupId) {
      return NextResponse.json(
        { message: 'Group ID is required' },
        { status: 400 }
      )
    }

    // Verify group belongs to this event
    const group = await prisma.groupRegistration.findFirst({
      where: {
        id: groupId,
        eventId,
      },
      include: {
        participants: {
          select: {
            id: true,
            checkedIn: true,
          },
        },
      },
    })

    if (!group) {
      return NextResponse.json(
        { message: 'Group not found in this event' },
        { status: 404 }
      )
    }

    const now = new Date()
    const isCheckingIn = action === 'check_in'

    // Get participants to update based on action
    const participantIds = isCheckingIn
      ? group.participants.filter((p: any) => !p.checkedIn).map((p: any) => p.id)
      : group.participants.filter((p: any) => p.checkedIn).map((p: any) => p.id)

    if (participantIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: isCheckingIn
          ? 'All participants already checked in'
          : 'No participants to check out',
        count: 0,
      })
    }

    // Update participants
    await prisma.participant.updateMany({
      where: {
        id: { in: participantIds },
      },
      data: {
        checkedIn: isCheckingIn,
        checkedInAt: isCheckingIn ? now : null,
        checkedInBy: isCheckingIn ? userId : null,
        checkInStation: isCheckingIn ? stationId : null,
        checkInNotes: notes || null,
      },
    })

    // Create check-in logs
    await prisma.checkInLog.createMany({
      data: participantIds.map((participantId: any) => ({
        eventId,
        participantId,
        groupRegistrationId: groupId,
        action: (action || 'check_in') as 'check_in' | 'check_out',
        userId: userId!,
        station: stationId || null,
        notes: notes || null,
      })),
    })

    return NextResponse.json({
      success: true,
      action: action || 'check_in',
      count: participantIds.length,
      groupId,
    })
  } catch (error) {
    console.error('Failed to process bulk check-in:', error)
    return NextResponse.json(
      { message: 'Failed to process bulk check-in' },
      { status: 500 }
    )
  }
}
