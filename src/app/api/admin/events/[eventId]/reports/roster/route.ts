import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'
import { getEffectiveOrgId } from '@/lib/get-effective-org'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { eventId } = await params
    const body = await request.json()
    const { filters = {} } = body

    // Verify user has access
    const user = await prisma.user.findFirst({
      where: { clerkUserId: userId },
      include: { organization: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organizationId = await getEffectiveOrgId(user as any)

    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        organizationId: organizationId,
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

    // Fetch group participants with all related data
    const participantsRaw = await prisma.participant.findMany({
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
        liabilityForms: {
          select: {
            allergies: true,
            medications: true,
            medicalConditions: true,
            dietaryRestrictions: true,
            emergencyContact1Name: true,
            emergencyContact1Phone: true,
            emergencyContact1Relation: true,
          },
          take: 1,
        },
      },
      orderBy: filters.sortBy === 'firstName' ? { firstName: 'asc' } :
                filters.sortBy === 'age' ? { age: 'asc' } :
                { lastName: 'asc' }, // Default to lastName
    })

    // Build individual registration query filters
    const individualWhere: any = { eventId }

    if (filters.minAge) {
      individualWhere.age = { ...individualWhere.age, gte: filters.minAge }
    }
    if (filters.maxAge) {
      individualWhere.age = { ...individualWhere.age, lte: filters.maxAge }
    }

    if (filters.tShirtSizes && filters.tShirtSizes.length > 0) {
      individualWhere.tShirtSize = { in: filters.tShirtSizes }
    }

    // Fetch individual registrations
    const individualRegs = await prisma.individualRegistration.findMany({
      where: individualWhere,
      include: {
        liabilityForms: {
          select: {
            allergies: true,
            medications: true,
            medicalConditions: true,
            dietaryRestrictions: true,
          },
          take: 1,
        },
      },
      orderBy: filters.sortBy === 'firstName' ? { firstName: 'asc' } :
                filters.sortBy === 'age' ? { age: 'asc' } :
                { lastName: 'asc' },
    })

    // Transform group participants - liabilityForms array to single liabilityForm object
    const groupParticipants = participantsRaw.map((p: any) => ({
      ...p,
      liabilityForm: p.liabilityForms?.[0] || null,
    }))

    // Transform individual registrations to match participant structure
    const individualParticipants = individualRegs.map((ind: any) => ({
      id: ind.id,
      firstName: ind.firstName,
      lastName: ind.lastName,
      preferredName: ind.preferredName,
      age: ind.age,
      gender: ind.gender,
      tShirtSize: ind.tShirtSize,
      participantType: null, // Individual registrations don't have participantType
      groupRegistration: null, // No group for individual registrations
      liabilityForm: {
        // Emergency contacts are on IndividualRegistration model directly
        emergencyContact1Name: ind.emergencyContact1Name,
        emergencyContact1Phone: ind.emergencyContact1Phone,
        emergencyContact1Relation: ind.emergencyContact1Relation,
        // Medical info comes from their liability form if exists
        allergies: ind.liabilityForms?.[0]?.allergies || null,
        medications: ind.liabilityForms?.[0]?.medications || null,
        medicalConditions: ind.liabilityForms?.[0]?.medicalConditions || null,
        dietaryRestrictions: ind.liabilityForms?.[0]?.dietaryRestrictions || null,
      },
      _isIndividual: true, // Flag to identify individual registrations
    }))

    // Combine both arrays
    const participants = [...groupParticipants, ...individualParticipants]

    // Apply group filter
    let filteredParticipants = participants
    if (filters.groupIds && filters.groupIds.length > 0) {
      filteredParticipants = participants.filter((p: any) =>
        filters.groupIds.includes(p.groupRegistration?.id)
      )
    }

    // Apply parish filter
    if (filters.parishes && filters.parishes.length > 0) {
      filteredParticipants = filteredParticipants.filter((p: any) =>
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
