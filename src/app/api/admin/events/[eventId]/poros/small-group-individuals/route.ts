import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface IndividualRegistrationRecord {
  id: string
  firstName: string
  lastName: string
  gender: string | null
}

interface SmallGroupAssignmentRecord {
  individualRegistrationId: string | null
  smallGroup: {
    id: string
    name: string
  }
}

// GET - List all individual registrations for small group assignment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all individual registrations for this event
    const individuals = await prisma.individualRegistration.findMany({
      where: { eventId: eventId },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
    })

    // Get small group assignments for individual registrations
    const assignments = await prisma.smallGroupAssignment.findMany({
      where: {
        smallGroup: { eventId: eventId },
        individualRegistrationId: { not: null }
      },
      include: {
        smallGroup: {
          select: { id: true, name: true }
        }
      }
    })

    // Create a lookup map
    const assignmentMap = new Map<string, { groupId: string; groupName: string }>()
    assignments.forEach((a: SmallGroupAssignmentRecord) => {
      if (a.individualRegistrationId) {
        assignmentMap.set(a.individualRegistrationId, {
          groupId: a.smallGroup.id,
          groupName: a.smallGroup.name
        })
      }
    })

    // Format response
    const result = individuals.map((ind: IndividualRegistrationRecord) => ({
      id: ind.id,
      firstName: ind.firstName,
      lastName: ind.lastName,
      gender: ind.gender || 'unknown',
      smallGroupAssignment: assignmentMap.get(ind.id) || null
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to fetch individuals:', error)
    return NextResponse.json({ error: 'Failed to fetch individuals' }, { status: 500 })
  }
}
