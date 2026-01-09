import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

interface GroupRegistrationRecord {
  id: string
  groupName: string
  participants: { id: string }[]
}

interface SmallGroupAssignmentRecord {
  groupRegistrationId: string | null
  smallGroup: {
    id: string
    name: string
  }
}

// GET - List all group registrations for small group assignment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[GET Small Group Youth Groups]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[GET Small Group Youth Groups] ❌ User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    // Get all group registrations for this event
    const groupRegistrations = await prisma.groupRegistration.findMany({
      where: { eventId: eventId },
      include: {
        participants: {
          select: { id: true }
        }
      },
      orderBy: { groupName: 'asc' }
    })

    // Get small group assignments for group registrations
    const assignments = await prisma.smallGroupAssignment.findMany({
      where: {
        smallGroup: { eventId: eventId },
        groupRegistrationId: { not: null }
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
      if (a.groupRegistrationId) {
        assignmentMap.set(a.groupRegistrationId, {
          groupId: a.smallGroup.id,
          groupName: a.smallGroup.name
        })
      }
    })

    // Format response
    const result = groupRegistrations.map((gr: GroupRegistrationRecord) => ({
      id: gr.id,
      groupName: gr.groupName,
      participantCount: gr.participants.length,
      smallGroupAssignment: assignmentMap.get(gr.id) || null
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to fetch youth groups:', error)
    return NextResponse.json({ error: 'Failed to fetch youth groups' }, { status: 500 })
  }
}
