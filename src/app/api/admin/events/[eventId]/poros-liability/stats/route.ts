import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const { eventId } = await Promise.resolve(params)

    // Verify event belongs to user's organization
    const event = await prisma.event.findUnique({
      where: {
        id: eventId,
        organizationId: user.organizationId,
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

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

    // Get safe environment certificates stats
    const totalCertificates = await prisma.safeEnvironmentCertificate.count({
      where: {
        eventId,
      },
    })

    const verifiedCertificates = await prisma.safeEnvironmentCertificate.count({
      where: {
        eventId,
        status: 'verified',
      },
    })

    const pendingCertificates = await prisma.safeEnvironmentCertificate.count({
      where: {
        eventId,
        status: 'pending',
      },
    })

    return NextResponse.json({
      totalForms,
      approvedForms,
      pendingForms,
      deniedForms,
      totalCertificates,
      verifiedCertificates,
      pendingCertificates,
    })
  } catch (error) {
    console.error('Stats fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
