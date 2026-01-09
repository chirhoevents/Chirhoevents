import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyFormsEditAccess } from '@/lib/api-auth'
import { canAccessOrganization } from '@/lib/auth-utils'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; certificateId: string }> }
) {
  try {
    const { eventId, certificateId } = await params
    const body = await request.json()
    const { reason } = body

    if (!reason) {
      return NextResponse.json(
        { error: 'Reason is required for rejection' },
        { status: 400 }
      )
    }

    // Verify user has forms.edit permission and event access
    const { error, user } = await verifyFormsEditAccess(
      request,
      eventId,
      '[Poros Liability Certificate Reject]'
    )
    if (error) return error

    // Verify certificate exists and belongs to user's organization
    const certificate = await prisma.safeEnvironmentCertificate.findUnique({
      where: { id: certificateId },
    })

    if (!certificate) {
      return NextResponse.json(
        { error: 'Certificate not found' },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(user, certificate.organizationId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Update to rejected
    const updated = await prisma.safeEnvironmentCertificate.update({
      where: { id: certificateId },
      data: {
        status: 'rejected',
        verifiedByUserId: user!.id,
        verifiedAt: new Date(),
      },
    })

    // TODO: Send rejection email with reason to group leader

    return NextResponse.json({ success: true, certificate: updated })
  } catch (error) {
    console.error('Rejection error:', error)
    return NextResponse.json(
      { error: 'Failed to reject certificate' },
      { status: 500 }
    )
  }
}
