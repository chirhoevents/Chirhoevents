import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'
import { hasPermission } from '@/lib/permissions'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const overrideUserId = await getClerkUserIdFromHeader(request)
    const user = await getCurrentUser(overrideUserId)
    // Admins plus SALVE-only staff (the SALVE name tag and packet editors use this list)
    const hasSalveAccess = !!user && (hasPermission(user.role, 'salve.access') ||
      user.permissions?.['salve.access'] === true ||
      user.permissions?.['portals.salve.view'] === true)
    if (!user || (!isAdmin(user) && !hasSalveAccess)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    const { eventId } = await params

    // The event must belong to the user's organization (unless master_admin)
    if (user.role !== 'master_admin') {
      const event = await prisma.event.findFirst({
        where: { id: eventId, organizationId: user.organizationId },
        select: { id: true },
      })
      if (!event) {
        return NextResponse.json({ message: 'Event not found' }, { status: 404 })
      }
    }
    const { searchParams } = new URL(request.url)

    const includeCheckInStats = searchParams.get('includeCheckInStats') === 'true'
    const includeParticipants = searchParams.get('includeParticipants') === 'true'

    const groups = await prisma.groupRegistration.findMany({
      where: { eventId },
      orderBy: { groupName: 'asc' },
      select: {
        id: true,
        groupName: true,
        dioceseName: true,
        accessCode: true,
        groupLeaderEmail: true,
        participants: includeParticipants || includeCheckInStats
          ? {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                checkedIn: true,
                checkedInAt: true,
              },
            }
          : false,
        _count: {
          select: {
            participants: true,
          },
        },
      },
    })

    // Transform the response
    type GroupResult = typeof groups[number]
    type ParticipantType = { id: string; firstName: string; lastName: string; checkedIn: boolean | null; checkedInAt: Date | null }

    const response = groups.map((group: GroupResult) => {
      const participants = 'participants' in group ? group.participants as ParticipantType[] | null : null
      const checkedInCount = includeCheckInStats && participants
        ? participants.filter((p: ParticipantType) => p.checkedIn).length
        : 0

      const lastCheckIn = includeCheckInStats && participants
        ? participants
            .filter((p: ParticipantType) => p.checkedIn && p.checkedInAt)
            .sort((a: ParticipantType, b: ParticipantType) => {
              const dateA = a.checkedInAt ? new Date(a.checkedInAt).getTime() : 0
              const dateB = b.checkedInAt ? new Date(b.checkedInAt).getTime() : 0
              return dateB - dateA
            })[0]?.checkedInAt || null
        : null

      return {
        id: group.id,
        groupName: group.groupName,
        diocese: group.dioceseName,
        accessCode: group.accessCode,
        contactEmail: group.groupLeaderEmail,
        participantCount: group._count.participants,
        checkedInCount: includeCheckInStats ? checkedInCount : undefined,
        lastCheckIn: includeCheckInStats ? lastCheckIn : undefined,
        participants: includeParticipants && participants ? participants : undefined,
      }
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('Failed to fetch groups:', error)
    return NextResponse.json(
      { message: 'Failed to fetch groups' },
      { status: 500 }
    )
  }
}
