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

    const includeCheckInStats = searchParams.get('includeCheckInStats') === 'true'
    const includeParticipants = searchParams.get('includeParticipants') === 'true'

    const groups = await prisma.groupRegistration.findMany({
      where: { eventId },
      orderBy: { groupName: 'asc' },
      include: {
        participants: includeParticipants || includeCheckInStats
          ? {
              select: {
                id: true,
                firstName: includeParticipants,
                lastName: includeParticipants,
                checkedIn: true,
                checkedInAt: includeCheckInStats,
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
    const response = groups.map((group) => {
      const checkedInCount = includeCheckInStats && group.participants
        ? group.participants.filter((p) => p.checkedIn).length
        : 0

      const lastCheckIn = includeCheckInStats && group.participants
        ? group.participants
            .filter((p) => p.checkedIn && p.checkedInAt)
            .sort((a, b) => {
              const dateA = a.checkedInAt ? new Date(a.checkedInAt).getTime() : 0
              const dateB = b.checkedInAt ? new Date(b.checkedInAt).getTime() : 0
              return dateB - dateA
            })[0]?.checkedInAt || null
        : null

      return {
        id: group.id,
        groupName: group.groupName,
        diocese: group.diocese,
        accessCode: group.accessCode,
        contactEmail: group.contactEmail,
        participantCount: group._count.participants,
        checkedInCount: includeCheckInStats ? checkedInCount : undefined,
        lastCheckIn: includeCheckInStats ? lastCheckIn : undefined,
        participants: includeParticipants ? group.participants : undefined,
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
