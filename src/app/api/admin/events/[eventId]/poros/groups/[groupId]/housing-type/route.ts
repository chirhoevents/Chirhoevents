import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

// PATCH /api/admin/events/[eventId]/poros/groups/[groupId]/housing-type
// Updates a group's housing type and recalculates counts
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; groupId: string }> }
) {
  try {
    const { eventId, groupId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[Update Group Housing Type]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { housingType } = body

    if (!housingType || !['on_campus', 'off_campus', 'day_pass', 'mixed'].includes(housingType)) {
      return NextResponse.json(
        { error: 'Invalid housing type. Must be: on_campus, off_campus, day_pass, or mixed' },
        { status: 400 }
      )
    }

    // Get the group with participants
    const group = await prisma.groupRegistration.findUnique({
      where: { id: groupId },
      include: {
        participants: {
          select: { participantType: true }
        }
      }
    })

    if (!group || group.eventId !== eventId) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      )
    }

    // Calculate counts
    type ParticipantType = { participantType: string | null }
    const youthCount = group.participants.filter(
      (p: ParticipantType) => p.participantType === 'youth_u18' || p.participantType === 'youth_o18'
    ).length
    const chaperoneCount = group.participants.filter(
      (p: ParticipantType) => p.participantType === 'chaperone'
    ).length
    const totalParticipants = group.participants.length

    // Calculate housing-specific counts based on new housing type
    const housingCounts = {
      onCampusYouth: housingType === 'on_campus' ? youthCount : 0,
      onCampusChaperones: housingType === 'on_campus' ? chaperoneCount : 0,
      offCampusYouth: housingType === 'off_campus' ? youthCount : 0,
      offCampusChaperones: housingType === 'off_campus' ? chaperoneCount : 0,
      dayPassYouth: housingType === 'day_pass' ? youthCount : 0,
      dayPassChaperones: housingType === 'day_pass' ? chaperoneCount : 0,
      onCampusCount: housingType === 'on_campus' ? totalParticipants : 0,
      offCampusCount: housingType === 'off_campus' ? totalParticipants : 0,
      dayPassCount: housingType === 'day_pass' ? totalParticipants : 0,
    }

    const updated = await prisma.groupRegistration.update({
      where: { id: groupId },
      data: {
        housingType,
        ...housingCounts
      },
      select: {
        id: true,
        groupName: true,
        parishName: true,
        housingType: true,
        youthCount: true,
        chaperoneCount: true,
        onCampusYouth: true,
        offCampusYouth: true,
        onCampusChaperones: true,
        offCampusChaperones: true,
      }
    })

    return NextResponse.json({
      success: true,
      group: updated
    })

  } catch (error: any) {
    console.error('Error updating housing type:', error)
    return NextResponse.json(
      { error: 'Failed to update housing type', details: error.message },
      { status: 500 }
    )
  }
}
