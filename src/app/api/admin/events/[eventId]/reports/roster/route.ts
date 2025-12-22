import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'
import { ParticipantType } from '@prisma/client'

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { eventId } = params
    const body = await request.json()
    const { filters = {} } = body

    // Verify user has access
    const user = await prisma.user.findFirst({
      where: { clerkUserId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        organizationId: user.organizationId,
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Build query filters
    const participantWhere: any = {
      groupRegistration: { eventId },
    }

    // Filter by participant type
    if (filters.participantTypes && filters.participantTypes.length > 0) {
      participantWhere.participantType = { in: filters.participantTypes }
    }

    // Filter by age range
    if (filters.minAge) {
      participantWhere.age = { ...participantWhere.age, gte: filters.minAge }
    }
    if (filters.maxAge) {
      participantWhere.age = { ...participantWhere.age, lte: filters.maxAge }
    }

    // Filter by t-shirt size
    if (filters.tShirtSizes && filters.tShirtSizes.length > 0) {
      participantWhere.tShirtSize = { in: filters.tShirtSizes }
    }

    // Fetch participants with all related data
    const participants = await prisma.participant.findMany({
      where: participantWhere,
      include: {
        groupRegistration: {
          select: {
            id: true,
            groupName: true,
            parishName: true,
            dioceseName: true,
            groupLeaderName: true,
            groupLeaderEmail: true,
            groupLeaderPhone: true,
            housingType: true,
            registrationStatus: true,
          },
        },
        liabilityForm: {
          select: {
            allergies: true,
            medications: true,
            medicalConditions: true,
            dietaryRestrictions: true,
            emergencyContactName: true,
            emergencyContactPhone: true,
            emergencyContactRelationship: true,
          },
        },
        housingAssignment: {
          select: {
            roomNumber: true,
            buildingName: true,
          },
        },
      },
      orderBy: filters.sortBy === 'firstName' ? { firstName: 'asc' } :
                filters.sortBy === 'age' ? { age: 'asc' } :
                { lastName: 'asc' }, // Default to lastName
    })

    // Apply group filter
    let filteredParticipants = participants
    if (filters.groupIds && filters.groupIds.length > 0) {
      filteredParticipants = participants.filter(p =>
        filters.groupIds.includes(p.groupRegistration?.id)
      )
    }

    // Apply parish filter
    if (filters.parishes && filters.parishes.length > 0) {
      filteredParticipants = filteredParticipants.filter(p =>
        filters.parishes.includes(p.groupRegistration?.parishName)
      )
    }

    // Apply housing type filter
    if (filters.housingTypes && filters.housingTypes.length > 0) {
      filteredParticipants = filteredParticipants.filter(p =>
        filters.housingTypes.includes(p.groupRegistration?.housingType)
      )
    }

    // Apply medical needs filter
    if (filters.onlyWithMedicalNeeds) {
      filteredParticipants = filteredParticipants.filter(p =>
        p.liabilityForm && (
          (p.liabilityForm.allergies && p.liabilityForm.allergies !== '') ||
          (p.liabilityForm.medications && p.liabilityForm.medications !== '') ||
          (p.liabilityForm.medicalConditions && p.liabilityForm.medicalConditions !== '')
        )
      )
    }

    // Group by group if requested
    let reportData: any

    if (filters.groupBy === 'group') {
      // Group participants by their group
      const groupedData = new Map<string, any>()

      filteredParticipants.forEach(p => {
        const groupId = p.groupRegistration?.id || 'no-group'
        const groupName = p.groupRegistration?.groupName || 'Individual Registrations'

        if (!groupedData.has(groupId)) {
          groupedData.set(groupId, {
            groupId,
            groupName,
            parishName: p.groupRegistration?.parishName,
            groupLeaderName: p.groupRegistration?.groupLeaderName,
            groupLeaderEmail: p.groupRegistration?.groupLeaderEmail,
            groupLeaderPhone: p.groupRegistration?.groupLeaderPhone,
            participants: [],
          })
        }

        groupedData.get(groupId).participants.push(p)
      })

      reportData = Array.from(groupedData.values())
    } else if (filters.groupBy === 'participantType') {
      // Group by participant type
      const typeGroups = new Map<string, any>()

      filteredParticipants.forEach(p => {
        const type = p.participantType || 'unknown'

        if (!typeGroups.has(type)) {
          typeGroups.set(type, {
            participantType: type,
            participants: [],
          })
        }

        typeGroups.get(type).participants.push(p)
      })

      reportData = Array.from(typeGroups.values())
    } else if (filters.groupBy === 'parish') {
      // Group by parish
      const parishGroups = new Map<string, any>()

      filteredParticipants.forEach(p => {
        const parish = p.groupRegistration?.parishName || 'Unknown Parish'

        if (!parishGroups.has(parish)) {
          parishGroups.set(parish, {
            parishName: parish,
            participants: [],
          })
        }

        parishGroups.get(parish).participants.push(p)
      })

      reportData = Array.from(parishGroups.values())
    } else {
      // No grouping - flat list
      reportData = filteredParticipants
    }

    return NextResponse.json({
      reportType: 'roster',
      data: reportData,
      totalCount: filteredParticipants.length,
      filters: filters,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error generating roster report:', error)
    return NextResponse.json(
      { error: 'Failed to generate roster report' },
      { status: 500 }
    )
  }
}
