import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const userId = await getClerkUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { eventId } = await params
    const isPreview = request.nextUrl.searchParams.get('preview') === 'true'
    const eventFilter = eventId === 'all' ? {} : { eventId }

    // Get registrations
    const groupRegistrations = await prisma.groupRegistration.findMany({
      where: eventFilter,
      include: { participants: true },
    })

    const individualRegistrations = await prisma.individualRegistration.findMany({
      where: eventFilter,
    })

    const groupCount = groupRegistrations.length
    const groupParticipants = groupRegistrations.reduce(
      (sum: number, g: any) => sum + g.participants.length,
      0
    )
    const individualCount = individualRegistrations.length
    const totalRegistrations = groupParticipants + individualCount
    const avgGroupSize = groupCount > 0 ? groupParticipants / groupCount : 0

    if (isPreview) {
      return NextResponse.json({
        totalRegistrations,
        groupCount,
        groupParticipants,
        individualCount,
      })
    }

    // Demographics
    const demographics: any = {
      youth_u18: { total: 0, male: 0, female: 0 },
      youth_o18: { total: 0, male: 0, female: 0 },
      chaperones: { total: 0, male: 0, female: 0 },
      clergy: { total: 0, male: 0, female: 0 },
    }

    // Count from group participants
    for (const group of groupRegistrations) {
      for (const p of group.participants) {
        const type = p.participantType
        if (demographics[type]) {
          demographics[type].total++
          if (p.gender === 'male') demographics[type].male++
          if (p.gender === 'female') demographics[type].female++
        }
      }
    }

    // Count from individual registrations
    for (const ind of individualRegistrations) {
      const age = ind.age
      if (age !== null) {
        const type = age < 18 ? 'youth_u18' : 'youth_o18'
        demographics[type].total++
        if (ind.gender === 'male') demographics[type].male++
        if (ind.gender === 'female') demographics[type].female++
      }
    }

    // Housing breakdown
    const housingBreakdown: any = {
      on_campus: 0,
      off_campus: 0,
      day_pass: 0,
    }

    for (const group of groupRegistrations) {
      housingBreakdown[group.housingType] += group.participants.length
    }
    for (const ind of individualRegistrations) {
      if (ind.housingType && housingBreakdown[ind.housingType] !== undefined) {
        housingBreakdown[ind.housingType]++
      }
    }

    // Top groups
    const topGroups = groupRegistrations
      .map((g: any) => ({
        name: g.groupName || g.parishName,
        count: g.participants.length,
      }))
      .sort((a: { count: number }, b: { count: number }) => b.count - a.count)

    return NextResponse.json({
      totalRegistrations,
      groupCount,
      groupParticipants,
      individualCount,
      avgGroupSize,
      demographics,
      housingBreakdown,
      topGroups,
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
