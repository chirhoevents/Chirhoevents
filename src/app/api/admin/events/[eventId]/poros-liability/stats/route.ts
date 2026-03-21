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

    // FIX 4.14: Also count individual registrant safe environment certs
    // (tracked via IndividualRegistration.safeEnvironmentCertStatus)
    const indivTotalCerts = await prisma.individualRegistration.count({
      where: { eventId, safeEnvironmentCertStatus: { not: null } },
    })
    const indivVerifiedCerts = await prisma.individualRegistration.count({
      where: { eventId, safeEnvironmentCertStatus: 'verified' },
    })
    const indivPendingCerts = await prisma.individualRegistration.count({
      where: { eventId, safeEnvironmentCertStatus: 'pending' },
    })

    return NextResponse.json({
      totalForms,
      approvedForms,
      pendingForms,
      deniedForms,
      totalCertificates: groupTotalCerts + indivTotalCerts,
      verifiedCertificates: groupVerifiedCerts + indivVerifiedCerts,
      pendingCertificates: groupPendingCerts + indivPendingCerts,
    })
  } catch (error) {
    console.error('Stats fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
