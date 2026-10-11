import { NextRequest, NextResponse } from 'next/server'
import { verifyReportAccess } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { getEventChaperoneRatio } from '@/lib/chaperone-ratio'
import { countsAsChaperone, getClergyRole, getClergyRoleLabel, getRatioGender } from '@/lib/clergy-roles'

interface ChaperoneInfo {
  name: string
  role: string
  groupName: string
  email: string | null
  phone: string | null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    // Verify report access (requires reports.view permission)
    const { error, user, event, effectiveOrgId } = await verifyReportAccess(
      request,
      eventId,
      '[Chaperone Report]'
    )
    if (error) return error

    // Get URL params for filters
    const { searchParams } = new URL(request.url)
    const groupFilter = searchParams.get('groupId')
    const housingFilter = searchParams.get('housingType')

    // Build where clause for filters
    const whereClause: Record<string, unknown> = {
      eventId,
      completed: true,
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
        clergyTitle: true,
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
    type LiabilityFormRecord = typeof liabilityForms[number]
    let filteredForms = liabilityForms
    if (housingFilter) {
      filteredForms = liabilityForms.filter(
        (form: LiabilityFormRecord) => form.groupRegistration?.housingType === housingFilter
      )
    }

    // Count youth by gender
    const maleYouth = filteredForms.filter(
      (f: LiabilityFormRecord) =>
        (f.participantType === 'youth_u18' || f.participantType === 'youth_o18') &&
        f.participantGender === 'male'
    ).length

    const femaleYouth = filteredForms.filter(
      (f: LiabilityFormRecord) =>
        (f.participantType === 'youth_u18' || f.participantType === 'youth_o18') &&
        f.participantGender === 'female'
    ).length

    const totalYouth = maleYouth + femaleYouth

    // Chaperones include deacons, seminarians, sisters and brothers (who fill
    // out the Clergy & Religious form); priests are not counted.
    const toChaperoneInfo = (f: LiabilityFormRecord): ChaperoneInfo => ({
      name: `${f.participantFirstName} ${f.participantLastName}`,
      role: getClergyRoleLabel(f.participantType, f.clergyTitle) || 'Chaperone',
      groupName: f.groupRegistration?.parishName || f.groupRegistration?.groupName || 'Unknown',
      email: f.participantEmail,
      phone: f.participantPhone,
    })
    const chaperoneForms = filteredForms.filter((f: LiabilityFormRecord) =>
      countsAsChaperone(f.participantType, f.clergyTitle)
    )
    const maleChaperones: ChaperoneInfo[] = chaperoneForms
      .filter((f: LiabilityFormRecord) => getRatioGender(f.participantType, f.clergyTitle, f.participantGender) === 'male')
      .map(toChaperoneInfo)
    const femaleChaperones: ChaperoneInfo[] = chaperoneForms
      .filter((f: LiabilityFormRecord) => getRatioGender(f.participantType, f.clergyTitle, f.participantGender) === 'female')
      .map(toChaperoneInfo)

    // Calculate ratios
    const maleRatio = maleChaperones.length > 0 ? maleYouth / maleChaperones.length : null
    const femaleRatio = femaleChaperones.length > 0 ? femaleYouth / femaleChaperones.length : null

    // Check compliance against this event's ratio (set per event — dioceses differ)
    const REQUIRED_RATIO = await getEventChaperoneRatio(eventId)
    // Youth with no same-gender chaperone at all is out of ratio, not "N/A".
    const maleCompliant = maleYouth === 0 || (maleRatio !== null && maleRatio <= REQUIRED_RATIO)
    const femaleCompliant = femaleYouth === 0 || (femaleRatio !== null && femaleRatio <= REQUIRED_RATIO)
    const overallCompliant = maleCompliant && femaleCompliant

    // Get priests count
    // Priests and bishops are not counted as chaperones
    const priests = filteredForms.filter((f: LiabilityFormRecord) => {
      const role = getClergyRole(f.participantType, f.clergyTitle)
      return role === 'priest' || role === 'bishop'
    }).length

    // Get groups for filter dropdown
    const groups = await prisma.groupRegistration.findMany({
      where: { eventId },
      select: { id: true, groupName: true, parishName: true },
      orderBy: { groupName: 'asc' },
    })

    return NextResponse.json({
      eventName: event!.name,
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
        groups: groups.map((g: { id: string; groupName: string | null; parishName: string | null }) => ({
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
