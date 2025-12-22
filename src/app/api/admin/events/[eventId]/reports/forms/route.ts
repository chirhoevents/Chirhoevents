import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { eventId } = params
    const isPreview = request.nextUrl.searchParams.get('preview') === 'true'
    const eventFilter = eventId === 'all' ? {} : { eventId }

    // Get all participants with form data
    const participants = await prisma.participant.findMany({
      where: {
        groupRegistration: eventFilter,
      },
      include: {
        groupRegistration: { select: { groupName: true, parishName: true } },
        liabilityForms: true,
      },
    })

    // Get safe environment certificates
    const certificates = await prisma.safeEnvironmentCertificate.findMany({
      where: {
        participant: {
          groupRegistration: eventFilter,
        },
      },
    })

    const formsRequired = participants.length
    const formsCompleted = participants.filter((p: any) => p.liabilityFormCompleted).length
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
