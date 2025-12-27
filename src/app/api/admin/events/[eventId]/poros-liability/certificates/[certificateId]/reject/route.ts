import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string; certificateId: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const { eventId, certificateId } = await Promise.resolve(params)
    const body = await request.json()
    const { reason } = body

    if (!reason) {
      return NextResponse.json(
        { error: 'Reason is required for rejection' },
        { status: 400 }
      )
    }

    // Verify certificate belongs to this event and organization
    const certificate = await prisma.safeEnvironmentCertificate.findUnique({
      where: { id: certificateId },
      include: {
        event: {
          select: { organizationId: true },
        },
      },
    })

    if (!certificate) {
      return NextResponse.json(
        { error: 'Certificate not found' },
        { status: 404 }
      )
    }

    if (certificate.eventId !== eventId) {
      return NextResponse.json(
        { error: 'Certificate does not belong to this event' },
        { status: 400 }
      )
    }

    if (certificate.event.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Update to rejected
    const updated = await prisma.safeEnvironmentCertificate.update({
      where: { id: certificateId },
      data: {
        status: 'rejected',
        verifiedById: user.id,
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
