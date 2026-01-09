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

    // Verify user has forms.edit permission and event access
    const { error, user } = await verifyFormsEditAccess(
      request,
      eventId,
      '[Poros Liability Certificate Verify]'
    )
    if (error) return error

    // Parse body safely - notes is optional
    let notes: string | null = null
    try {
      const body = await request.json()
      notes = body?.notes || null
    } catch {
      // Body might be empty or invalid, that's ok
    }

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

    // Update to verified
    const updated = await prisma.safeEnvironmentCertificate.update({
      where: { id: certificateId },
      data: {
        status: 'verified',
        verifiedByUserId: user!.id,
        verifiedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, certificate: updated })
  } catch (error) {
    console.error('Verification error:', error)
    return NextResponse.json(
      { error: 'Failed to verify certificate' },
      { status: 500 }
    )
  }
}
