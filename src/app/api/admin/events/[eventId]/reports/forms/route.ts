import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyReportAccess } from '@/lib/api-auth'

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
      '[Forms Report]'
    )
    if (error) return error

    const isPreview = request.nextUrl.searchParams.get('preview') === 'true'
    const eventFilter = eventId === 'all' ? {} : { eventId }

    // Check if event requires liability forms for individuals
    const eventSettings = eventId !== 'all'
      ? await prisma.eventSettings.findUnique({
          where: { eventId },
          select: { liabilityFormsRequiredIndividual: true },
        })
      : null
    const individualFormsRequired = eventSettings?.liabilityFormsRequiredIndividual ?? false

    // Get all participants with form data (group registrations)
    const participants = await prisma.participant.findMany({
      where: {
        groupRegistration: eventFilter,
      },
      include: {
        groupRegistration: { select: { groupName: true, parishName: true } },
        liabilityForms: true,
      },
    })

    // Get individual registrations with their liability forms (if required)
    const individualRegistrations = individualFormsRequired
      ? await prisma.individualRegistration.findMany({
          where: eventFilter,
          include: {
            liabilityForms: {
              select: { id: true, completed: true },
            },
          },
        })
      : []

    // Get safe environment certificates
    const certificates = await prisma.safeEnvironmentCertificate.findMany({
      where: {
        participant: {
          groupRegistration: eventFilter,
        },
      },
    })

    // Calculate group participants forms
    const groupFormsRequired = participants.length
    const groupFormsCompleted = participants.filter((p: any) => p.liabilityFormCompleted).length

    // Calculate individual registration forms
    const individualFormsCount = individualRegistrations.length
    const individualFormsCompleted = individualRegistrations.filter(
      (reg: any) => reg.liabilityForms.some((f: any) => f.completed)
    ).length

    // Totals
    const formsRequired = groupFormsRequired + individualFormsCount
    const formsCompleted = groupFormsCompleted + individualFormsCompleted
    const formsPending = formsRequired - formsCompleted
    const completionRate = formsRequired > 0 ? Math.round((formsCompleted / formsRequired) * 100) : 0

    if (isPreview) {
      return NextResponse.json({
        formsRequired,
        formsCompleted,
        formsPending,
        completionRate,
      })
    }

    // By participant type
    const byParticipantType: any = {}
    for (const p of participants) {
      const type = p.participantType
      if (!byParticipantType[type]) {
        byParticipantType[type] = { total: 0, completed: 0 }
      }
      byParticipantType[type].total++
      if (p.liabilityFormCompleted) byParticipantType[type].completed++
    }

    // Add individual registrations to participant type breakdown
    if (individualFormsRequired && individualRegistrations.length > 0) {
      byParticipantType['individual_registration'] = {
        total: individualFormsCount,
        completed: individualFormsCompleted,
      }
    }

    // By group
    const groupStats: Record<string, any> = {}
    for (const p of participants) {
      const groupName = p.groupRegistration?.groupName || p.groupRegistration?.parishName || 'Unknown'
      if (!groupStats[groupName]) {
        groupStats[groupName] = { total: 0, completed: 0, pending: 0 }
      }
      groupStats[groupName].total++
      if (p.liabilityFormCompleted) {
        groupStats[groupName].completed++
      } else {
        groupStats[groupName].pending++
      }
    }

    // Add individual registrations as a separate group
    if (individualFormsRequired && individualFormsCount > 0) {
      const individualPending = individualFormsCount - individualFormsCompleted
      if (individualPending > 0) {
        groupStats['Individual Registrations'] = {
          total: individualFormsCount,
          completed: individualFormsCompleted,
          pending: individualPending,
        }
      }
    }

    const pendingByGroup = Object.entries(groupStats)
      .filter(([_, stats]) => stats.pending > 0)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.pending - a.pending)

    // Certificate stats
    const certsRequired = participants.filter((p: any) => p.participantType === 'chaperone').length
    const certsUploaded = certificates.length
    const certsVerified = certificates.filter((c: any) => c.verifiedAt !== null).length
    const certsMissing = certsRequired - certsUploaded

    return NextResponse.json({
      formsRequired,
      formsCompleted,
      formsPending,
      completionRate,
      byParticipantType,
      pendingByGroup,
      certificates: {
        required: certsRequired,
        uploaded: certsUploaded,
        verified: certsVerified,
        missing: certsMissing,
        uploadRate: certsRequired > 0 ? Math.round((certsUploaded / certsRequired) * 100) : 0,
        verifyRate: certsRequired > 0 ? Math.round((certsVerified / certsRequired) * 100) : 0,
      },
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
