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
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'
    const certificateType = searchParams.get('type') || 'all'

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

    // Build where clause - filter by organization and participants in this event
    const whereClause: any = {
      organizationId: user.organizationId,
      participant: {
        groupRegistration: {
          eventId: eventId,
        },
      },
    }

    if (status !== 'all') {
      whereClause.status = status
    }

    if (certificateType !== 'all') {
      whereClause.programName = {
        contains: certificateType === 'virtus_training' ? 'virtus' : certificateType,
        mode: 'insensitive',
      }
    }

    // Get certificates
    const certificates = await prisma.safeEnvironmentCertificate.findMany({
      where: whereClause,
      include: {
        verifiedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        uploadedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        participant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            groupRegistration: {
              select: {
                groupName: true,
                parishName: true,
              },
            },
          },
        },
      },
      orderBy: [{ status: 'asc' }, { uploadedAt: 'desc' }],
    })

    // Format response
    const formattedCertificates = certificates.map((cert) => ({
      id: cert.id,
      certificateHolderName: cert.participant
        ? `${cert.participant.firstName} ${cert.participant.lastName}`
        : 'Unknown',
      participantName: cert.participant
        ? `${cert.participant.firstName} ${cert.participant.lastName}`
        : 'Unknown',
      groupName: cert.participant?.groupRegistration?.groupName || 'Unknown Group',
      parishName: cert.participant?.groupRegistration?.parishName || null,
      certificateType: cert.programName?.toLowerCase().includes('virtus')
        ? 'virtus_training'
        : cert.programName?.toLowerCase().includes('background')
        ? 'background_check'
        : 'other',
      programName: cert.programName,
      issueDate: cert.completionDate?.toISOString() || null,
      expirationDate: cert.expirationDate?.toISOString() || null,
      certificateNumber: null,
      issuingOrganization: null,
      fileUrl: cert.fileUrl,
      originalFilename: cert.originalFilename,
      verificationStatus: cert.status,
      verifiedAt: cert.verifiedAt?.toISOString() || null,
      verifiedByName: cert.verifiedBy
        ? `${cert.verifiedBy.firstName} ${cert.verifiedBy.lastName}`
        : null,
      verificationNotes: null,
      uploadedAt: cert.uploadedAt.toISOString(),
      uploadedByName: cert.uploadedBy
        ? `${cert.uploadedBy.firstName} ${cert.uploadedBy.lastName}`
        : null,
    }))

    return NextResponse.json(formattedCertificates)
  } catch (error) {
    console.error('Certificates fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch certificates' },
      { status: 500 }
    )
  }
}
