import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    await requireAdmin()
    const { eventId } = await params
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
    const participantIdList = participants.map((p: any) => p.id)
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

    // Get meal color assignments for these participants' groups
    const groupIds = Array.from(new Set(participants.map((p: any) => p.groupRegistrationId)))
    const mealColorAssignments = await prisma.mealColorAssignment.findMany({
      where: {
        groupRegistrationId: { in: groupIds },
      },
    })

    // Create a map of groupRegistrationId -> meal color
    const mealColorMap = new Map<string, string>(
      mealColorAssignments.map((mca: any) => [mca.groupRegistrationId, mca.color])
    )

    // Create a map of participantId -> room assignment with building info
    const assignmentMap = new Map<string, { buildingName: string; roomNumber: string; bedNumber: number | null }>(
      roomAssignments.map((ra: any) => [
        ra.participantId,
        {
          buildingName: ra.room.building.name,
          roomNumber: ra.room.roomNumber,
          bedNumber: ra.bedNumber,
        },
      ])
    )

    // Helper function for meal color hex values
    const getMealColorHex = (color: string): string => {
      const colors: Record<string, string> = {
        blue: '#3498db',
        red: '#e74c3c',
        orange: '#e67e22',
        yellow: '#f1c40f',
        green: '#27ae60',
        purple: '#9b59b6',
        brown: '#8b4513',
        grey: '#95a5a6',
        gray: '#95a5a6',
      }
      return colors[color.toLowerCase()] || '#6b7280'
    }

    // Generate name tag data for each participant
    const nameTags = participants.map((p: any) => {
      const assignment = assignmentMap.get(p.id)
      const bedLetter = assignment?.bedNumber
        ? String.fromCharCode(64 + assignment.bedNumber)
        : null
      const mealColor = mealColorMap.get(p.groupRegistrationId)

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
        mealColor: mealColor
          ? {
              name: mealColor,
              hex: getMealColorHex(mealColor),
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
