import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

interface ChaperoneInfo {
  name: string
  groupName: string
  email: string | null
  phone: string | null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { eventId } = await params

    // Verify event belongs to user's organization
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, name: true, organizationId: true },
    })

    if (!event || event.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Get URL params for filters
    const { searchParams } = new URL(request.url)
    const groupFilter = searchParams.get('groupId')
    const housingFilter = searchParams.get('housingType')

    // Build where clause for filters
    const whereClause: Record<string, unknown> = {
      eventId,
      status: { in: ['complete', 'parent_signed', 'verified'] },
    }

    if (groupFilter) {
      whereClause.groupRegistrationId = groupFilter
    }

    // Get all liability forms for this event
    const liabilityForms = await prisma.liabilityForm.findMany({
      where: whereClause,
      select: {
        id: true,
        participantType: true,
        participantFirstName: true,
        participantLastName: true,
        participantGender: true,
        participantEmail: true,
        participantPhone: true,
        groupRegistration: {
          select: {
            id: true,
            groupName: true,
            parishName: true,
            housingType: true,
          },
        },
      },
    })

    // Apply housing filter if specified
    let filteredForms = liabilityForms
    if (housingFilter) {
      filteredForms = liabilityForms.filter(
        (form) => form.groupRegistration?.housingType === housingFilter
      )
    }

    // Count youth by gender
    const maleYouth = filteredForms.filter(
      (f) =>
        (f.participantType === 'youth_u18' || f.participantType === 'youth_o18') &&
        f.participantGender === 'male'
    ).length

    const femaleYouth = filteredForms.filter(
      (f) =>
        (f.participantType === 'youth_u18' || f.participantType === 'youth_o18') &&
        f.participantGender === 'female'
    ).length

    const totalYouth = maleYouth + femaleYouth

    // Get male chaperones with details
    const maleChaperones: ChaperoneInfo[] = filteredForms
      .filter((f) => f.participantType === 'chaperone' && f.participantGender === 'male')
      .map((f) => ({
        name: `${f.participantFirstName} ${f.participantLastName}`,
        groupName: f.groupRegistration?.parishName || f.groupRegistration?.groupName || 'Unknown',
        email: f.participantEmail,
        phone: f.participantPhone,
      }))

    // Get female chaperones with details
    const femaleChaperones: ChaperoneInfo[] = filteredForms
      .filter((f) => f.participantType === 'chaperone' && f.participantGender === 'female')
      .map((f) => ({
        name: `${f.participantFirstName} ${f.participantLastName}`,
        groupName: f.groupRegistration?.parishName || f.groupRegistration?.groupName || 'Unknown',
        email: f.participantEmail,
        phone: f.participantPhone,
      }))

    // Calculate ratios
    const maleRatio = maleChaperones.length > 0 ? maleYouth / maleChaperones.length : null
    const femaleRatio = femaleChaperones.length > 0 ? femaleYouth / femaleChaperones.length : null

    // Check compliance (10:1 ratio requirement)
    const REQUIRED_RATIO = 10
    const maleCompliant = maleRatio === null || maleRatio <= REQUIRED_RATIO
    const femaleCompliant = femaleRatio === null || femaleRatio <= REQUIRED_RATIO
    const overallCompliant = maleCompliant && femaleCompliant

    // Get priests count
    const priests = filteredForms.filter((f) => f.participantType === 'priest').length

    // Get groups for filter dropdown
    const groups = await prisma.groupRegistration.findMany({
      where: { eventId },
      select: { id: true, groupName: true, parishName: true },
      orderBy: { groupName: 'asc' },
    })

    return NextResponse.json({
      eventName: event.name,
      youth: {
        male: maleYouth,
        female: femaleYouth,
        total: totalYouth,
      },
      chaperones: {
        male: {
          count: maleChaperones.length,
          list: maleChaperones,
        },
        female: {
          count: femaleChaperones.length,
          list: femaleChaperones,
        },
        total: maleChaperones.length + femaleChaperones.length,
      },
      priests,
      ratios: {
        male: maleRatio ? parseFloat(maleRatio.toFixed(1)) : null,
        female: femaleRatio ? parseFloat(femaleRatio.toFixed(1)) : null,
        requiredRatio: REQUIRED_RATIO,
      },
      compliance: {
        maleCompliant,
        femaleCompliant,
        overallCompliant,
        message: overallCompliant
          ? `Meets ${REQUIRED_RATIO}:1 ratio requirement`
          : `Does not meet ${REQUIRED_RATIO}:1 ratio requirement`,
      },
      filters: {
        groups: groups.map((g) => ({
          id: g.id,
          name: g.parishName || g.groupName,
        })),
        housingTypes: ['on_campus', 'off_campus', 'day_pass'],
      },
    })
  } catch (error) {
    console.error('Chaperone report error:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
