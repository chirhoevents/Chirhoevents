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

    // Get total participants for this event
    const totalParticipants = await prisma.participant.count({
      where: {
        groupRegistration: {
          eventId,
        },
      },
    })

    // Get checked in participants
    const checkedIn = await prisma.participant.count({
      where: {
        groupRegistration: {
          eventId,
        },
        checkedIn: true,
      },
    })

    // Get total groups
    const totalGroups = await prisma.groupRegistration.count({
      where: {
        eventId,
      },
    })

    // Get groups with at least one checked in participant
    const groupsWithCheckIns = await prisma.groupRegistration.count({
      where: {
        eventId,
        participants: {
          some: {
            checkedIn: true,
          },
        },
      },
    })

    // Get fully checked in groups (all participants checked in)
    const allGroups = await prisma.groupRegistration.findMany({
      where: { eventId },
      select: {
        id: true,
        _count: {
          select: {
            participants: true,
          },
        },
        participants: {
          where: { checkedIn: true },
          select: { id: true },
        },
      },
    })

    const fullyCheckedInGroups = allGroups.filter(
      (g) => g._count.participants > 0 && g.participants.length === g._count.participants
    ).length

    // Get check-in logs for today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const checkInsToday = await prisma.checkInLog.count({
      where: {
        eventId,
        action: 'check_in',
        timestamp: {
          gte: today,
        },
      },
    })

    // Get recent check-in activity (last 10)
    const recentActivity = await prisma.checkInLog.findMany({
      where: {
        eventId,
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: 10,
      include: {
        participant: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        group: {
          select: {
            groupName: true,
          },
        },
      },
    })

    return NextResponse.json({
      totalParticipants,
      checkedIn,
      remaining: totalParticipants - checkedIn,
      percentCheckedIn: totalParticipants > 0
        ? Math.round((checkedIn / totalParticipants) * 100)
        : 0,
      totalGroups,
      groupsWithCheckIns,
      fullyCheckedInGroups,
      checkInsToday,
      recentActivity: recentActivity.map((log) => ({
        id: log.id,
        action: log.action,
        timestamp: log.timestamp,
        participantName: log.participant
          ? `${log.participant.firstName} ${log.participant.lastName}`
          : null,
        groupName: log.group?.groupName || null,
        stationId: log.stationId,
        notes: log.notes,
      })),
    })
  } catch (error) {
    console.error('Failed to fetch SALVE stats:', error)
    return NextResponse.json(
      { message: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
