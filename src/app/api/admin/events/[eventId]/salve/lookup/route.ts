import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    await requireAdmin()
    const { eventId } = params
    const { searchParams } = new URL(request.url)

    const accessCode = searchParams.get('accessCode')
    const search = searchParams.get('search') || searchParams.get('q')
    const groupId = searchParams.get('groupId')

    // If groupId is provided, fetch that specific group
    if (groupId) {
      const group = await prisma.groupRegistration.findFirst({
        where: {
          id: groupId,
          eventId,
        },
        include: {
          participants: {
            orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
            include: {
              housingAssignment: {
                include: {
                  building: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
          allocatedRooms: {
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

      if (!group) {
        return NextResponse.json(
          { message: 'Group not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(formatGroupResponse(group))
    }

    // If accessCode is provided, search by access code
    if (accessCode) {
      const group = await prisma.groupRegistration.findFirst({
        where: {
          accessCode,
          eventId,
        },
        include: {
          participants: {
            orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
            include: {
              housingAssignment: {
                include: {
                  building: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
          allocatedRooms: {
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

      if (!group) {
        return NextResponse.json(
          { message: 'Group not found with this access code' },
          { status: 404 }
        )
      }

      return NextResponse.json(formatGroupResponse(group))
    }

    // If search query is provided, search groups and participants
    if (search && search.length >= 2) {
      const searchLower = search.toLowerCase()

      // Search groups by name
      const groups = await prisma.groupRegistration.findMany({
        where: {
          eventId,
          OR: [
            { groupName: { contains: search, mode: 'insensitive' } },
            { accessCode: { contains: search, mode: 'insensitive' } },
            {
              participants: {
                some: {
                  OR: [
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { lastName: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                  ],
                },
              },
            },
          ],
        },
        include: {
          participants: {
            orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
            include: {
              housingAssignment: {
                include: {
                  building: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
          allocatedRooms: {
            include: {
              building: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        take: 10,
      })

      return NextResponse.json({
        results: groups.map(formatGroupResponse),
        count: groups.length,
      })
    }

    return NextResponse.json(
      { message: 'Please provide accessCode, search, or groupId parameter' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Failed to lookup group:', error)
    return NextResponse.json(
      { message: 'Failed to lookup group' },
      { status: 500 }
    )
  }
}

function formatGroupResponse(group: any) {
  const checkedInCount = group.participants.filter((p: any) => p.checkedIn).length
  const totalParticipants = group.participants.length
  const formsCompleted = group.participants.filter((p: any) => p.liabilityFormCompleted).length
  const hasHousingAssigned = group.allocatedRooms && group.allocatedRooms.length > 0

  // Calculate age from date of birth
  function calculateAge(dateOfBirth: Date | string | null): number {
    if (!dateOfBirth) return 0
    const dob = new Date(dateOfBirth)
    const today = new Date()
    let age = today.getFullYear() - dob.getFullYear()
    const monthDiff = today.getMonth() - dob.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--
    }
    return age
  }

  return {
    id: group.id,
    groupName: group.groupName,
    parishName: group.parishName || null,
    accessCode: group.accessCode,
    groupLeaderName: group.groupLeaderName || group.groupLeaderEmail?.split('@')[0] || 'Group Leader',
    groupLeaderEmail: group.groupLeaderEmail,
    diocese: group.dioceseName,
    contactEmail: group.groupLeaderEmail,
    contactPhone: group.groupLeaderPhone,
    totalParticipants,
    registrationStatus: group.registrationStatus || 'confirmed',
    payment: {
      status: group.paymentStatus || 'pending',
      totalAmount: group.totalAmount || 0,
      paidAmount: group.paidAmount || 0,
      balanceRemaining: (group.totalAmount || 0) - (group.paidAmount || 0),
    },
    forms: {
      completed: formsCompleted,
      pending: totalParticipants - formsCompleted,
    },
    housing: {
      assigned: hasHousingAssigned,
    },
    checkedInCount,
    isFullyCheckedIn: checkedInCount === totalParticipants && totalParticipants > 0,
    participants: group.participants.map((p: any) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      email: p.email,
      dateOfBirth: p.dateOfBirth,
      age: calculateAge(p.dateOfBirth),
      participantType: p.participantType,
      isChaperone: p.isChaperone,
      isClergy: p.isClergy,
      gender: p.gender,
      liabilityFormCompleted: p.liabilityFormCompleted || false,
      checkedIn: p.checkedIn,
      checkedInAt: p.checkedInAt,
      checkInNotes: p.checkInNotes,
      housing: p.housingAssignment
        ? {
            buildingName: p.housingAssignment.building.name,
            roomNumber: p.housingAssignment.roomNumber,
            bedLetter: p.bedNumber ? String.fromCharCode(64 + p.bedNumber) : null,
          }
        : null,
      mealColor: p.mealColor || null,
      smallGroup: p.smallGroup || null,
    })),
    allocatedRooms: group.allocatedRooms?.map((r: any) => ({
      id: r.id,
      roomNumber: r.roomNumber,
      buildingName: r.building.name,
      capacity: r.capacity,
      currentOccupancy: r.currentOccupancy,
      gender: r.gender,
      housingType: r.housingType,
      floor: r.floor,
    })) || [],
  }
}
