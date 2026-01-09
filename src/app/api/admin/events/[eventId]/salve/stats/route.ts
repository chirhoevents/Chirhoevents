import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    // Verify user has access to this event (with organization check)
    const { error, event, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: false,
      logPrefix: '[SALVE Stats]',
    })

    if (error) {
      return error
    }

    // Check if user has salve.access permission
    const hasSalvePermission = hasPermission(user!.role, 'salve.access')
    const hasCustomSalveAccess = user!.permissions?.['salve.access'] === true ||
      user!.permissions?.['portals.salve.view'] === true

    if (!hasSalvePermission && !hasCustomSalveAccess) {
      console.error(`[SALVE Stats] ❌ User ${user!.email} (role: ${user!.role}) lacks salve.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - SALVE portal access required' },
        { status: 403 }
      )
    }

    console.log('[SALVE Stats] ✅ Access verified for event:', event?.name)

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
      (g: any) => g._count.participants > 0 && g.participants.length === g._count.participants
    ).length

    // Get check-in logs for today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const checkInsToday = await prisma.checkInLog.count({
      where: {
        eventId,
        action: 'check_in',
        createdAt: {
          gte: today,
        },
      },
    })

    // Get recent check-in activity (last 10)
    const recentLogs = await prisma.checkInLog.findMany({
      where: {
        eventId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    })

    // Fetch participant and group names for recent logs
    const participantIds = recentLogs
      .map((log: any) => log.participantId)
      .filter((id: any): id is string => id !== null)
    const groupIds = recentLogs
      .map((log: any) => log.groupRegistrationId)
      .filter((id: any): id is string => id !== null)

    const [participants, groups] = await Promise.all([
      participantIds.length > 0
        ? prisma.participant.findMany({
            where: { id: { in: participantIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : [],
      groupIds.length > 0
        ? prisma.groupRegistration.findMany({
            where: { id: { in: groupIds } },
            select: { id: true, groupName: true },
          })
        : [],
    ])

    const participantMap = new Map(
      participants.map((p: any) => [p.id, `${p.firstName} ${p.lastName}`])
    )
    const groupMap = new Map(groups.map((g: any) => [g.id, g.groupName]))

    const recentActivity = recentLogs.map((log: any) => ({
      id: log.id,
      action: log.action,
      timestamp: log.createdAt.toISOString(),
      participantName: log.participantId
        ? participantMap.get(log.participantId) || null
        : null,
      groupName: log.groupRegistrationId
        ? groupMap.get(log.groupRegistrationId) || null
        : null,
      stationId: log.station,
      notes: log.notes,
    }))

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
      recentActivity,
    })
  } catch (error) {
    console.error('Failed to fetch SALVE stats:', error)
    return NextResponse.json(
      { message: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
