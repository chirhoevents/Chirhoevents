import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    await requireAdmin()
    const { eventId } = params
    const body = await request.json()

    const { participantIds, groupId, templateId } = body

    // Get the name tag template
    let template = null
    if (templateId) {
      template = await prisma.nameTagTemplate.findFirst({
        where: {
          id: templateId,
          eventId,
        },
      })
    }

    // If no template specified, get the event's template (eventId is unique)
    if (!template) {
      template = await prisma.nameTagTemplate.findUnique({
        where: {
          eventId,
        },
      })
    }

    // If still no template, create a basic one
    const templateConfig = template || {
      size: 'standard',
      showName: true,
      showGroup: true,
      showParticipantType: true,
      showHousing: true,
      backgroundColor: '#FFFFFF',
      textColor: '#1E3A5F',
      accentColor: '#9C8466',
    }

    // Get participants to generate name tags for
    let participants
    if (participantIds && participantIds.length > 0) {
      participants = await prisma.participant.findMany({
        where: {
          id: { in: participantIds },
          groupRegistration: {
            eventId,
          },
        },
        include: {
          groupRegistration: {
            select: {
              groupName: true,
              dioceseName: true,
            },
          },
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      })
    } else if (groupId) {
      participants = await prisma.participant.findMany({
        where: {
          groupRegistrationId: groupId,
          groupRegistration: {
            eventId,
          },
        },
        include: {
          groupRegistration: {
            select: {
              groupName: true,
              dioceseName: true,
            },
          },
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      })
    } else {
      return NextResponse.json(
        { message: 'Either participantIds or groupId is required' },
        { status: 400 }
      )
    }

    if (participants.length === 0) {
      return NextResponse.json(
        { message: 'No participants found' },
        { status: 404 }
      )
    }

    // Get room assignments for these participants
    const participantIdList = participants.map((p) => p.id)
    const roomAssignments = await prisma.roomAssignment.findMany({
      where: {
        participantId: { in: participantIdList },
      },
      include: {
        room: {
          include: {
            building: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    })

    // Create a map of participantId -> room assignment with building info
    const assignmentMap = new Map(
      roomAssignments.map((ra) => [
        ra.participantId,
        {
          buildingName: ra.room.building.name,
          roomNumber: ra.room.roomNumber,
          bedNumber: ra.bedNumber,
        },
      ])
    )

    // Generate name tag data for each participant
    const nameTags = participants.map((p) => {
      const assignment = assignmentMap.get(p.id)
      const bedLetter = assignment?.bedNumber
        ? String.fromCharCode(64 + assignment.bedNumber)
        : null

      return {
        participantId: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        fullName: `${p.firstName} ${p.lastName}`,
        groupName: p.groupRegistration.groupName,
        diocese: p.groupRegistration.dioceseName,
        participantType: p.participantType,
        isChaperone: p.participantType === 'chaperone',
        isClergy: p.participantType === 'priest',
        housing: assignment
          ? {
              building: assignment.buildingName,
              room: assignment.roomNumber,
              bed: bedLetter,
              fullLocation: `${assignment.buildingName} ${assignment.roomNumber}${bedLetter ? ` - Bed ${bedLetter}` : ''}`,
            }
          : null,
        template: templateConfig,
      }
    })

    // Get event details for header
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        name: true,
        startDate: true,
        endDate: true,
        organization: {
          select: {
            name: true,
            logoUrl: true,
          },
        },
      },
    })

    return NextResponse.json({
      event: {
        name: event?.name,
        organizationName: event?.organization?.name,
        logoUrl: event?.organization?.logoUrl,
        dates: event
          ? `${event.startDate.toLocaleDateString()} - ${event.endDate.toLocaleDateString()}`
          : null,
      },
      template: templateConfig,
      nameTags,
      count: nameTags.length,
    })
  } catch (error) {
    console.error('Failed to generate name tags:', error)
    return NextResponse.json(
      { message: 'Failed to generate name tags' },
      { status: 500 }
    )
  }
}
