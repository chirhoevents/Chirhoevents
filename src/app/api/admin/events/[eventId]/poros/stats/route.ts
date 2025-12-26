import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Fetch all Poros statistics for the dashboard
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const eventId = params.eventId

    // Fetch all data in parallel for performance
    const [
      groupRegistrations,
      individualRegistrations,
      buildings,
      rooms,
      roomAssignments,
      seatingSections,
      seatingAssignments,
      smallGroups,
      smallGroupAssignments,
      mealGroups,
      mealGroupAssignments,
      adaIndividuals,
      staff
    ] = await Promise.all([
      // Group registrations with participants
      prisma.groupRegistration.findMany({
        where: { eventId },
        include: {
          participants: true
        }
      }),
      // Individual registrations
      prisma.individualRegistration.findMany({
        where: { eventId }
      }),
      // Buildings
      prisma.building.findMany({
        where: { eventId }
      }),
      // Rooms with assignments
      prisma.room.findMany({
        where: { building: { eventId } },
        include: {
          building: { select: { gender: true } }
        }
      }),
      // Room assignments
      prisma.roomAssignment.findMany({
        where: {
          room: { building: { eventId } }
        }
      }),
      // Seating sections
      prisma.seatingSection.findMany({
        where: { eventId }
      }),
      // Seating assignments
      prisma.seatingAssignment.findMany({
        where: { seatingSection: { eventId } }
      }),
      // Small groups
      prisma.smallGroup.findMany({
        where: { eventId },
        include: {
          sgl: true,
          coSgl: true
        }
      }),
      // Small group assignments
      prisma.smallGroupAssignment.findMany({
        where: { smallGroup: { eventId } }
      }),
      // Meal groups
      prisma.mealGroup.findMany({
        where: { eventId }
      }),
      // Meal group assignments
      prisma.mealGroupAssignment.findMany({
        where: { mealGroup: { eventId } }
      }),
      // ADA individuals
      prisma.adaIndividual.findMany({
        where: { eventId }
      }),
      // Staff
      prisma.staff.findMany({
        where: { eventId }
      })
    ])

    // Calculate participant counts
    const allParticipants = groupRegistrations.flatMap((gr: { participants: unknown[] }) => gr.participants)
    const totalParticipants = allParticipants.length + individualRegistrations.length

    // Count by housing type from group registrations
    const onCampusGroups = groupRegistrations.filter((gr: { housingType: string }) => gr.housingType === 'on_campus')
    const offCampusGroups = groupRegistrations.filter((gr: { housingType: string }) => gr.housingType === 'off_campus')
    const dayPassGroups = groupRegistrations.filter((gr: { housingType: string }) => gr.housingType === 'day_pass')

    const onCampusCount = onCampusGroups.reduce((sum: number, gr: { participants: unknown[] }) => sum + gr.participants.length, 0) +
      individualRegistrations.filter((ir: { housingType: string }) => ir.housingType === 'on_campus').length
    const offCampusCount = offCampusGroups.reduce((sum: number, gr: { participants: unknown[] }) => sum + gr.participants.length, 0) +
      individualRegistrations.filter((ir: { housingType: string }) => ir.housingType === 'off_campus').length
    const dayPassCount = dayPassGroups.reduce((sum: number, gr: { participants: unknown[] }) => sum + gr.participants.length, 0) +
      individualRegistrations.filter((ir: { housingType: string }) => ir.housingType === 'day_pass').length

    // Housing stats
    const totalBuildings = buildings.length
    const totalRooms = rooms.length
    const totalBeds = rooms.reduce((sum: number, r: { capacity: number }) => sum + r.capacity, 0)
    const assignedToRooms = roomAssignments.length
    const unassignedHousing = onCampusCount - assignedToRooms

    // Gender-based capacity
    const maleRooms = rooms.filter((r: { building: { gender: string } }) => r.building.gender === 'male')
    const femaleRooms = rooms.filter((r: { building: { gender: string } }) => r.building.gender === 'female')
    const maleCapacity = maleRooms.reduce((sum: number, r: { capacity: number }) => sum + r.capacity, 0)
    const femaleCapacity = femaleRooms.reduce((sum: number, r: { capacity: number }) => sum + r.capacity, 0)
    const maleUsed = maleRooms.reduce((sum: number, r: { currentOccupancy: number }) => sum + r.currentOccupancy, 0)
    const femaleUsed = femaleRooms.reduce((sum: number, r: { currentOccupancy: number }) => sum + r.currentOccupancy, 0)

    // Seating stats
    const totalSections = seatingSections.length
    const totalSeatingCapacity = seatingSections.reduce((sum: number, s: { capacity: number | null }) => sum + (s.capacity || 0), 0)
    const assignedSeating = seatingAssignments.length
    // Count unique group registrations that have seating assignments
    const seatedGroupIds = new Set(seatingAssignments.map((a: { groupRegistrationId: string | null }) => a.groupRegistrationId).filter(Boolean))
    const unassignedSeating = groupRegistrations.length - seatedGroupIds.size

    // Small groups stats
    const totalSmallGroups = smallGroups.length
    const assignedToSmallGroups = smallGroupAssignments.length
    const unassignedSmallGroups = totalParticipants - assignedToSmallGroups
    const avgSmallGroupSize = totalSmallGroups > 0
      ? Math.round(assignedToSmallGroups / totalSmallGroups)
      : 0
    const sglsAssigned = smallGroups.filter((sg: { sglId: string | null }) => sg.sglId).length

    // Meal groups stats
    const totalMealGroups = mealGroups.length
    const assignedToMealGroups = mealGroupAssignments.length

    // ADA stats
    const totalAdaIndividuals = adaIndividuals.length
    // Check which ADA individuals have room assignments
    const adaParticipantIds = adaIndividuals
      .filter((a: { participantId: string | null }) => a.participantId)
      .map((a: { participantId: string }) => a.participantId)
    const adaIndividualRegIds = adaIndividuals
      .filter((a: { individualRegistrationId: string | null }) => a.individualRegistrationId)
      .map((a: { individualRegistrationId: string }) => a.individualRegistrationId)

    const adaAssignedCount = roomAssignments.filter((ra: { participantId: string | null; individualRegistrationId: string | null }) =>
      (ra.participantId && adaParticipantIds.includes(ra.participantId)) ||
      (ra.individualRegistrationId && adaIndividualRegIds.includes(ra.individualRegistrationId))
    ).length

    return NextResponse.json({
      totalParticipants,
      onCampusCount,
      offCampusCount,
      dayPassCount,
      housing: {
        totalBuildings,
        totalRooms,
        totalBeds,
        assigned: assignedToRooms,
        unassigned: Math.max(0, unassignedHousing),
        maleCapacity,
        maleUsed,
        femaleCapacity,
        femaleUsed
      },
      seating: {
        totalSections,
        totalCapacity: totalSeatingCapacity,
        assigned: seatedGroupIds.size,
        unassigned: Math.max(0, unassignedSeating)
      },
      smallGroups: {
        totalGroups: totalSmallGroups,
        avgSize: avgSmallGroupSize,
        assigned: assignedToSmallGroups,
        unassigned: Math.max(0, unassignedSmallGroups),
        sglsAssigned,
        sglsNeeded: totalSmallGroups - sglsAssigned
      },
      mealGroups: {
        totalGroups: totalMealGroups,
        assigned: assignedToMealGroups
      },
      ada: {
        totalIndividuals: totalAdaIndividuals,
        assigned: adaAssignedCount,
        unassigned: totalAdaIndividuals - adaAssignedCount
      }
    })
  } catch (error) {
    console.error('Failed to fetch Poros stats:', error)
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 })
  }
}
