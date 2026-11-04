import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyReportAccess } from '@/lib/api-auth'
import { getClergyRole, getClergyRoleLabel, getRatioGender } from '@/lib/clergy-roles'

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
      '[Registration Report]'
    )
    if (error) return error

    const isPreview = request.nextUrl.searchParams.get('preview') === 'true'
    // Fix #7: Always include organizationId filter to prevent cross-org data leakage
    const eventFilter = eventId === 'all'
      ? { organizationId: effectiveOrgId! }
      : { eventId, organizationId: effectiveOrgId! }

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

    // Demographics — map DB enum values to display buckets. Clergy & Religious
    // get one bucket per role (Sisters aren't clergy, and the Clergy & Religious
    // form stores every title as 'priest'), added only when someone has that role.
    const demographics: any = {
      youth_u18: { total: 0, male: 0, female: 0 },
      youth_o18: { total: 0, male: 0, female: 0 },
      chaperones: { total: 0, male: 0, female: 0 },
    }
    const CLERGY_ROLE_BUCKETS: Record<string, string> = {
      deacon: 'deacons',
      seminarian: 'seminarians',
      sister: 'sisters',
      brother: 'brothers',
      priest: 'priests',
      bishop: 'bishops',
    }
    for (const bucket of Object.values(CLERGY_ROLE_BUCKETS)) {
      demographics[bucket] = { total: 0, male: 0, female: 0 }
    }

    const bucketForParticipantType = (t: string | null | undefined, clergyTitle?: string | null): string | null => {
      if (!t) return null
      if (t === 'youth_u18' || t === 'youth_o18') return t
      if (t === 'chaperone') return 'chaperones'
      const role = getClergyRole(t, clergyTitle)
      return role ? CLERGY_ROLE_BUCKETS[role] : null
    }

    // Roster — flat list of every registered person for the full report
    const roster: any[] = []

    // Count from group participants
    for (const group of groupRegistrations) {
      const groupLabel = group.groupName || group.parishName || 'Unnamed Group'
      for (const p of group.participants) {
        const bucket = bucketForParticipantType(p.participantType, p.clergyTitle)
        const gender = getRatioGender(p.participantType, p.clergyTitle, p.gender)
        if (bucket && demographics[bucket]) {
          demographics[bucket].total++
          if (gender === 'male') demographics[bucket].male++
          if (gender === 'female') demographics[bucket].female++
        }
        roster.push({
          name: `${p.firstName} ${p.lastName}`.trim(),
          participantType: p.participantType,
          roleLabel: getClergyRoleLabel(p.participantType, p.clergyTitle),
          displayType: bucket || p.participantType || 'unknown',
          age: p.age,
          gender,
          group: groupLabel,
          registrationType: 'group',
          housingType: group.housingType || null,
        })
      }
    }

    // Count from individual registrations.
    // Individual registrations don't carry participantType — fall back to age.
    for (const ind of individualRegistrations) {
      const age = ind.age
      let bucket: string | null = null
      if (age !== null && age !== undefined) {
        bucket = age < 18 ? 'youth_u18' : 'youth_o18'
        demographics[bucket].total++
        if (ind.gender === 'male') demographics[bucket].male++
        if (ind.gender === 'female') demographics[bucket].female++
      }
      const displayName = `${ind.firstName} ${ind.lastName}`.trim()
      roster.push({
        name: displayName,
        participantType: null,
        displayType: bucket || 'unknown',
        age: ind.age,
        gender: ind.gender,
        group: 'Individual',
        registrationType: 'individual',
        housingType: ind.housingType || null,
      })
    }

    // Drop clergy/religious buckets nobody falls into
    for (const bucket of Object.values(CLERGY_ROLE_BUCKETS)) {
      if (demographics[bucket].total === 0) delete demographics[bucket]
    }

    // Sort roster: group name, then participant name
    roster.sort((a: any, b: any) => {
      const g = (a.group || '').localeCompare(b.group || '')
      if (g !== 0) return g
      return (a.name || '').localeCompare(b.name || '')
    })

    // Housing breakdown
    const housingBreakdown: any = {
      on_campus: 0,
      off_campus: 0,
      day_pass: 0,
    }

    for (const group of groupRegistrations) {
      if (group.housingType && housingBreakdown[group.housingType] !== undefined) {
        housingBreakdown[group.housingType] += group.participants.length
      }
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

    // Purchased vs. registered spots — per group. youthCount / chaperoneCount /
    // priestCount are the spots the group bought (what they're invoiced for);
    // participants are the people who have actually filled those spots.
    const emptyCounts = () => ({ youth: 0, chaperones: 0, clergy: 0, total: 0 })
    const purchasedTotals = emptyCounts()
    const registeredTotals = emptyCounts()
    const groupSpots = groupRegistrations
      .map((g: any) => {
        const purchasedYouth = g.youthCount || 0
        const purchasedChaperones = g.chaperoneCount || 0
        const purchasedClergy = g.priestCount || 0
        const purchasedSum = purchasedYouth + purchasedChaperones + purchasedClergy
        const purchased = {
          youth: purchasedYouth,
          chaperones: purchasedChaperones,
          clergy: purchasedClergy,
          total: purchasedSum > 0 ? purchasedSum : g.totalParticipants || 0,
        }
        const registered = emptyCounts()
        for (const p of g.participants) {
          const t = p.participantType
          if (t === 'youth_u18' || t === 'youth_o18') registered.youth++
          else if (t === 'chaperone') registered.chaperones++
          else if (getClergyRole(t, p.clergyTitle)) registered.clergy++
          registered.total++
        }
        for (const k of ['youth', 'chaperones', 'clergy', 'total'] as const) {
          purchasedTotals[k] += purchased[k]
          registeredTotals[k] += registered[k]
        }
        return {
          name: g.groupName || g.parishName || 'Unnamed Group',
          parishName: g.parishName || null,
          groupLeaderName: g.groupLeaderName || null,
          groupLeaderEmail: g.groupLeaderEmail || null,
          housingType: g.housingType || null,
          registrationStatus: g.registrationStatus || null,
          purchased,
          registered,
          remaining: Math.max(0, purchased.total - registered.total),
        }
      })
      .sort((a: any, b: any) => a.name.localeCompare(b.name))

    const spotsSummary = {
      purchased: purchasedTotals,
      registered: registeredTotals,
      remaining: Math.max(0, purchasedTotals.total - registeredTotals.total),
    }

    return NextResponse.json({
      totalRegistrations,
      groupCount,
      groupParticipants,
      individualCount,
      avgGroupSize,
      spotsSummary,
      groupSpots,
      demographics,
      housingBreakdown,
      topGroups,
      roster,
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
