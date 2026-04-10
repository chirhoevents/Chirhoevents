import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyFormsViewAccess } from '@/lib/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    // Verify user has forms.view permission and event access
    const { error, effectiveOrgId } = await verifyFormsViewAccess(
      request,
      eventId,
      '[Poros Liability Stats]'
    )
    if (error) return error

    // Get liability forms stats - from completed liability forms
    const totalForms = await prisma.liabilityForm.count({
      where: {
        eventId,
        completed: true,
      },
    })

    const approvedForms = await prisma.liabilityForm.count({
      where: {
        eventId,
        completed: true,
        formStatus: 'approved',
      },
    })

    const pendingForms = await prisma.liabilityForm.count({
      where: {
        eventId,
        completed: true,
        formStatus: 'pending',
      },
    })

    const deniedForms = await prisma.liabilityForm.count({
      where: {
        eventId,
        completed: true,
        formStatus: 'denied',
      },
    })

    // Get safe environment certificates stats - group participants
    const groupTotalCerts = await prisma.safeEnvironmentCertificate.count({
      where: {
        organizationId: effectiveOrgId!,
        participant: { groupRegistration: { eventId } },
      },
    })
    const groupVerifiedCerts = await prisma.safeEnvironmentCertificate.count({
      where: {
        organizationId: effectiveOrgId!,
        participant: { groupRegistration: { eventId } },
        status: 'verified',
      },
    })
    const groupPendingCerts = await prisma.safeEnvironmentCertificate.count({
      where: {
        organizationId: effectiveOrgId!,
        participant: { groupRegistration: { eventId } },
        status: 'pending',
      },
    })

    // ── Letter of Good Standing stats ─────────────────────────────────────────
    const logsAll = await prisma.letterOfGoodStanding.findMany({
      where: { eventId },
      select: { status: true },
    })
    const letterOfGoodStandingStats = {
      total: logsAll.length,
      pending: logsAll.filter((l) => l.status === 'pending').length,
      submittedExternally: logsAll.filter((l) => l.status === 'submitted_externally').length,
      uploaded: logsAll.filter((l) => l.status === 'uploaded').length,
      verified: logsAll.filter((l) => l.status === 'verified').length,
      rejected: logsAll.filter((l) => l.status === 'rejected').length,
    }

    // ── Breakdown by participant type ─────────────────────────────────────────
    // Counts completed forms grouped by participantType, including approval status.
    const formsByType = await prisma.liabilityForm.findMany({
      where: { eventId, completed: true },
      select: { participantType: true, formStatus: true },
    })

    type TypeBucket = { total: number; completed: number; pending: number; approved: number }
    const typeMap: Record<string, TypeBucket> = {}
    for (const f of formsByType) {
      const key = f.participantType ?? 'unknown'
      if (!typeMap[key]) typeMap[key] = { total: 0, completed: 0, pending: 0, approved: 0 }
      typeMap[key].total++
      typeMap[key].completed++
      if (f.formStatus === 'pending') typeMap[key].pending++
      if (f.formStatus === 'approved') typeMap[key].approved++
    }
    const breakdownByParticipantType = Object.entries(typeMap).map(([participantType, counts]) => ({
      participantType,
      ...counts,
    }))

    return NextResponse.json({
      totalForms,
      approvedForms,
      pendingForms,
      deniedForms,
      totalCertificates: groupTotalCerts,
      verifiedCertificates: groupVerifiedCerts,
      pendingCertificates: groupPendingCerts,
      letterOfGoodStandingStats,
      breakdownByParticipantType,
    })
  } catch (error) {
    console.error('Stats fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
