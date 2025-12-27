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

    const resolvedParams = await Promise.resolve(params)
    const { certificateId } = resolvedParams

    // Parse body safely - notes is optional
    let notes: string | null = null
    try {
      const body = await request.json()
      notes = body?.notes || null
    } catch {
      // Body might be empty or invalid, that's ok
    }

    // Verify certificate belongs to user's organization
    const certificate = await prisma.safeEnvironmentCertificate.findUnique({
      where: { id: certificateId },
    })

    if (!certificate) {
      return NextResponse.json(
        { error: 'Certificate not found' },
        { status: 404 }
      )
    }

    if (certificate.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Update to verified
    const updated = await prisma.safeEnvironmentCertificate.update({
      where: { id: certificateId },
      data: {
        status: 'verified',
        verifiedByUserId: user.id,
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
