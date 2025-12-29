import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim()

    if (!query) {
      return NextResponse.json({ message: 'Search query required' }, { status: 400 })
    }

    // Check if portal is enabled
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { settings: true },
    })

    if (!event?.settings?.publicPortalEnabled) {
      return NextResponse.json({ message: 'Portal not available' }, { status: 403 })
    }

    // Parse name into first/last
    const nameParts = query.split(' ').filter(Boolean)
    if (nameParts.length < 2) {
      return NextResponse.json({ message: 'Please enter first and last name' }, { status: 400 })
    }

    const firstName = nameParts[0]
    const lastName = nameParts.slice(1).join(' ')

    // Search in participants (group registrations)
    const participant = await prisma.participant.findFirst({
      where: {
        groupRegistration: { eventId },
        firstName: { equals: firstName, mode: 'insensitive' },
        lastName: { equals: lastName, mode: 'insensitive' },
      },
      include: {
        groupRegistration: true,
      },
    })

    // Search in individual registrations if not found
    let individual = null
    if (!participant) {
      individual = await prisma.individualRegistration.findFirst({
        where: {
          eventId,
          firstName: { equals: firstName, mode: 'insensitive' },
          lastName: { equals: lastName, mode: 'insensitive' },
        },
      })
    }

    if (!participant && !individual) {
      return NextResponse.json({ message: 'Participant not found' }, { status: 404 })
    }

    // Build response
    const response: any = {
      participant: {
        firstName: participant?.firstName || individual?.firstName,
        lastName: participant?.lastName || individual?.lastName,
        gender: participant?.gender || individual?.gender,
        parishName: participant?.groupRegistration?.parishName || null,
      },
    }

    // Get room assignment
    const roomAssignment = await prisma.roomAssignment.findFirst({
      where: participant
        ? { participantId: participant.id }
        : { individualRegistrationId: individual?.id },
      include: {
        room: {
          include: { building: true },
        },
      },
    })

    if (roomAssignment) {
      // Get roommates
      const allRoomAssignments = await prisma.roomAssignment.findMany({
        where: { roomId: roomAssignment.roomId },
      })

      const roommateIds = allRoomAssignments
        .filter((a: any) => {
          if (participant && a.participantId !== participant.id) return true
          if (individual && a.individualRegistrationId !== individual.id) return true
          return false
        })

      // Get roommate names
      const roommates: any[] = []
      for (const a of roommateIds) {
        if (a.participantId) {
          const p = await prisma.participant.findUnique({
            where: { id: a.participantId },
            select: { firstName: true, lastName: true },
          })
          if (p) roommates.push(p)
        } else if (a.individualRegistrationId) {
          const i = await prisma.individualRegistration.findUnique({
            where: { id: a.individualRegistrationId },
            select: { firstName: true, lastName: true },
          })
          if (i) roommates.push(i)
        }
      }

      response.housing = {
        buildingName: roomAssignment.room.building.name,
        roomNumber: roomAssignment.room.roomNumber,
        floor: roomAssignment.room.floor,
        roommates,
      }
    }

    // Get small group assignment
    const sgAssignment = await prisma.smallGroupAssignment.findFirst({
      where: participant
        ? { participantId: participant.id }
        : { individualRegistrationId: individual?.id },
      include: {
        smallGroup: {
          include: { sgl: true },
        },
      },
    })

    if (sgAssignment) {
      response.smallGroup = {
        name: sgAssignment.smallGroup.name,
        groupNumber: sgAssignment.smallGroup.groupNumber,
        meetingTime: sgAssignment.smallGroup.meetingTime,
        meetingPlace: sgAssignment.smallGroup.meetingPlace,
        sgl: sgAssignment.smallGroup.sgl
          ? {
              firstName: sgAssignment.smallGroup.sgl.firstName,
              lastName: sgAssignment.smallGroup.sgl.lastName,
            }
          : null,
      }
    }

    // Get seating assignment
    const seatingAssignment = await prisma.seatingAssignment.findFirst({
      where: participant
        ? { groupRegistrationId: participant.groupRegistrationId }
        : { individualRegistrationId: individual?.id },
      include: { section: true },
    })

    if (seatingAssignment) {
      response.seating = {
        sectionName: seatingAssignment.section.name,
        sectionCode: seatingAssignment.section.sectionCode,
        color: seatingAssignment.section.color,
        locationDescription: seatingAssignment.section.locationDescription,
      }
    }

    // Get meal group assignment
    const mealAssignment = await prisma.mealGroupAssignment.findFirst({
      where: participant
        ? { groupRegistrationId: participant.groupRegistrationId }
        : { individualRegistrationId: individual?.id },
      include: { mealGroup: true },
    })

    if (mealAssignment) {
      response.mealGroup = {
        name: mealAssignment.mealGroup.name,
        color: mealAssignment.mealGroup.color,
        colorHex: mealAssignment.mealGroup.colorHex,
        breakfastTime: mealAssignment.mealGroup.breakfastTime,
        lunchTime: mealAssignment.mealGroup.lunchTime,
        dinnerTime: mealAssignment.mealGroup.dinnerTime,
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Failed to lookup participant:', error)
    return NextResponse.json(
      { message: 'Failed to lookup participant' },
      { status: 500 }
    )
  }
}
