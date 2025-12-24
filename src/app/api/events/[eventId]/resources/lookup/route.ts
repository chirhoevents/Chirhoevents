import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params
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

    if (!event?.settings?.porosPublicPortalEnabled || !event?.settings?.porosPublicPortalPublished) {
      return NextResponse.json({ message: 'Portal not available' }, { status: 403 })
    }

    const settings = event.settings

    // Parse name into first/last
    const nameParts = query.split(' ').filter(Boolean)
    if (nameParts.length < 2) {
      return NextResponse.json({ message: 'Please enter first and last name' }, { status: 400 })
    }

    const firstName = nameParts[0]
    const lastName = nameParts.slice(1).join(' ')

    // Search in participants (group registrations)
    let participant = await prisma.participant.findFirst({
      where: {
        groupRegistration: { eventId },
        firstName: { equals: firstName, mode: 'insensitive' },
        lastName: { equals: lastName, mode: 'insensitive' },
      },
      include: {
        groupRegistration: true,
        roomAssignment: {
          include: {
            room: {
              include: {
                building: true,
                assignments: {
                  include: { participant: true },
                },
              },
            },
          },
        },
        smallGroupAssignment: {
          include: {
            smallGroup: {
              include: {
                sgl: true,
                assignments: {
                  include: { participant: true },
                },
              },
            },
          },
        },
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
        include: {
          roomAssignment: {
            include: {
              room: {
                include: {
                  building: true,
                  assignments: {
                    include: { individualRegistration: true },
                  },
                },
              },
            },
          },
          smallGroupAssignment: {
            include: {
              smallGroup: {
                include: {
                  sgl: true,
                  assignments: {
                    include: { individualRegistration: true },
                  },
                },
              },
            },
          },
          seatingAssignment: {
            include: { section: true },
          },
          mealGroupAssignment: {
            include: { mealGroup: true },
          },
        },
      })
    }

    if (!participant && !individual) {
      return NextResponse.json({ message: 'Participant not found' }, { status: 404 })
    }

    // Get seating and meal group for participant via group registration
    let seating = null
    let mealGroup = null

    if (participant) {
      const groupSeating = await prisma.seatingAssignment.findFirst({
        where: { groupRegistrationId: participant.groupRegistrationId },
        include: { section: true },
      })
      if (groupSeating) {
        seating = {
          sectionName: groupSeating.section.name,
          sectionCode: groupSeating.section.sectionCode,
          color: groupSeating.section.color,
          locationDescription: groupSeating.section.locationDescription,
        }
      }

      const groupMeal = await prisma.mealGroupAssignment.findFirst({
        where: { groupRegistrationId: participant.groupRegistrationId },
        include: { mealGroup: true },
      })
      if (groupMeal) {
        mealGroup = {
          name: groupMeal.mealGroup.name,
          color: groupMeal.mealGroup.color,
          colorHex: groupMeal.mealGroup.colorHex,
          breakfastTime: groupMeal.mealGroup.breakfastTime,
          lunchTime: groupMeal.mealGroup.lunchTime,
          dinnerTime: groupMeal.mealGroup.dinnerTime,
        }
      }
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

    // Housing
    const roomAssignment = participant?.roomAssignment || individual?.roomAssignment
    if (roomAssignment) {
      const roommates = roomAssignment.room.assignments
        .filter((a: any) => {
          if (participant && a.participantId !== participant.id) return true
          if (individual && a.individualRegistrationId !== individual.id) return true
          return false
        })
        .map((a: any) => ({
          firstName: a.participant?.firstName || a.individualRegistration?.firstName,
          lastName: a.participant?.lastName || a.individualRegistration?.lastName,
        }))

      response.housing = {
        buildingName: roomAssignment.room.building.name,
        roomNumber: roomAssignment.room.roomNumber,
        floor: roomAssignment.room.floor,
        roommates: settings.porosShowRoommateNames ? roommates : [],
      }
    }

    // Small Group
    const sgAssignment = participant?.smallGroupAssignment || individual?.smallGroupAssignment
    if (sgAssignment) {
      const members = sgAssignment.smallGroup.assignments
        .filter((a: any) => {
          if (participant && a.participantId !== participant.id) return true
          if (individual && a.individualRegistrationId !== individual.id) return true
          return false
        })
        .map((a: any) => ({
          firstName: a.participant?.firstName || a.individualRegistration?.firstName,
          lastName: a.participant?.lastName || a.individualRegistration?.lastName,
        }))

      response.smallGroup = {
        name: sgAssignment.smallGroup.name,
        groupNumber: sgAssignment.smallGroup.groupNumber,
        meetingTime: sgAssignment.smallGroup.meetingTime,
        meetingPlace: sgAssignment.smallGroup.meetingPlace,
        sgl: sgAssignment.smallGroup.sgl && settings.porosShowSglContact
          ? {
              firstName: sgAssignment.smallGroup.sgl.firstName,
              lastName: sgAssignment.smallGroup.sgl.lastName,
              email: sgAssignment.smallGroup.sgl.email,
              phone: sgAssignment.smallGroup.sgl.phone,
            }
          : null,
        members: settings.porosShowSmallGroupMembers ? members : [],
      }
    }

    // Seating (from individual or computed for participant)
    if (individual?.seatingAssignment) {
      response.seating = {
        sectionName: individual.seatingAssignment.section.name,
        sectionCode: individual.seatingAssignment.section.sectionCode,
        color: individual.seatingAssignment.section.color,
        locationDescription: individual.seatingAssignment.section.locationDescription,
      }
    } else if (seating) {
      response.seating = seating
    }

    // Meal Group (from individual or computed for participant)
    if (individual?.mealGroupAssignment) {
      response.mealGroup = {
        name: individual.mealGroupAssignment.mealGroup.name,
        color: individual.mealGroupAssignment.mealGroup.color,
        colorHex: individual.mealGroupAssignment.mealGroup.colorHex,
        breakfastTime: individual.mealGroupAssignment.mealGroup.breakfastTime,
        lunchTime: individual.mealGroupAssignment.mealGroup.lunchTime,
        dinnerTime: individual.mealGroupAssignment.mealGroup.dinnerTime,
      }
    } else if (mealGroup) {
      response.mealGroup = mealGroup
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
