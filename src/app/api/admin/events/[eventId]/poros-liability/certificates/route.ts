import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyFormsViewAccess } from '@/lib/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'
    const certificateType = searchParams.get('type') || 'all'

    // Verify user has forms.view permission and event access
    const { error, effectiveOrgId } = await verifyFormsViewAccess(
      request,
      eventId,
      '[Poros Liability Certificates]'
    )
    if (error) return error

    // Build where clause - filter by organization and participants in this event
    const whereClause: any = {
      organizationId: effectiveOrgId,
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
    type CertificateResult = typeof certificates[number]
    const formattedCertificates = certificates.map((cert: CertificateResult) => ({
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
