import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

// POST /api/admin/events/[eventId]/recalculate-housing-counts
// Recalculates housing-specific counts (onCampusYouth, offCampusYouth, etc.)
// based on participant data and group housing type
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[Recalculate Housing Counts]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    // Get all groups with their participants
    const groups = await prisma.groupRegistration.findMany({
      where: { eventId },
      include: {
        participants: {
          select: { participantType: true }
        }
      }
    })

    let updatedCount = 0

    for (const group of groups) {
      const youthCount = group.participants.filter(
        p => p.participantType === 'youth_u18' || p.participantType === 'youth_o18'
      ).length
      const chaperoneCount = group.participants.filter(
        p => p.participantType === 'chaperone'
      ).length
      const priestCount = group.participants.filter(
        p => p.participantType === 'priest'
      ).length
      const totalParticipants = youthCount + chaperoneCount + priestCount

      // Calculate housing-specific counts based on the group's housing type
      const housingType = group.housingType || 'on_campus'
      const housingCounts = {
        onCampusYouth: housingType === 'on_campus' ? youthCount : 0,
        onCampusChaperones: housingType === 'on_campus' ? chaperoneCount : 0,
        offCampusYouth: housingType === 'off_campus' ? youthCount : 0,
        offCampusChaperones: housingType === 'off_campus' ? chaperoneCount : 0,
        dayPassYouth: housingType === 'day_pass' ? youthCount : 0,
        dayPassChaperones: housingType === 'day_pass' ? chaperoneCount : 0,
        onCampusCount: housingType === 'on_campus' ? totalParticipants : 0,
        offCampusCount: housingType === 'off_campus' ? totalParticipants : 0,
        dayPassCount: housingType === 'day_pass' ? totalParticipants : 0,
      }

      await prisma.groupRegistration.update({
        where: { id: group.id },
        data: {
          youthCount,
          chaperoneCount,
          priestCount,
          totalParticipants,
          ...housingCounts
        }
      })
      updatedCount++
    }

    return NextResponse.json({
      success: true,
      message: `Recalculated housing counts for ${updatedCount} groups`,
      updatedCount
    })

  } catch (error: any) {
    console.error('Error recalculating housing counts:', error)
    return NextResponse.json(
      { error: 'Failed to recalculate housing counts', details: error.message },
      { status: 500 }
    )
  }
}

// GET - Get summary of current housing counts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[GET Housing Counts Summary]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    // Get summary of housing types
    const groups = await prisma.groupRegistration.findMany({
      where: { eventId },
      select: {
        id: true,
        groupName: true,
        parishName: true,
        housingType: true,
        youthCount: true,
        chaperoneCount: true,
        totalParticipants: true,
        onCampusYouth: true,
        onCampusChaperones: true,
        offCampusYouth: true,
        offCampusChaperones: true,
        dayPassYouth: true,
        dayPassChaperones: true,
      }
    })

    const summary = {
      totalGroups: groups.length,
      byHousingType: {
        on_campus: groups.filter(g => g.housingType === 'on_campus').length,
        off_campus: groups.filter(g => g.housingType === 'off_campus').length,
        day_pass: groups.filter(g => g.housingType === 'day_pass').length,
        null_or_empty: groups.filter(g => !g.housingType).length,
      },
      counts: {
        onCampusYouth: groups.reduce((sum, g) => sum + (g.onCampusYouth || 0), 0),
        onCampusChaperones: groups.reduce((sum, g) => sum + (g.onCampusChaperones || 0), 0),
        offCampusYouth: groups.reduce((sum, g) => sum + (g.offCampusYouth || 0), 0),
        offCampusChaperones: groups.reduce((sum, g) => sum + (g.offCampusChaperones || 0), 0),
        dayPassYouth: groups.reduce((sum, g) => sum + (g.dayPassYouth || 0), 0),
        dayPassChaperones: groups.reduce((sum, g) => sum + (g.dayPassChaperones || 0), 0),
      },
      groups: groups.map(g => ({
        id: g.id,
        name: g.parishName || g.groupName,
        housingType: g.housingType,
        youthCount: g.youthCount,
        chaperoneCount: g.chaperoneCount,
        onCampusYouth: g.onCampusYouth,
        offCampusYouth: g.offCampusYouth,
      }))
    }

    return NextResponse.json(summary)

  } catch (error: any) {
    console.error('Error fetching housing counts summary:', error)
    return NextResponse.json(
      { error: 'Failed to fetch housing counts summary' },
      { status: 500 }
    )
  }
}
