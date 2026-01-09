import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyReportAccess } from '@/lib/api-auth'
import { format } from 'date-fns'

// Type for certificate data
interface CertificateData {
  id: string
  verifiedAt: Date | null
  status: string
  programName: string | null
  uploadedAt: Date | null
  participantId: string
  participant: {
    firstName: string | null
    lastName: string | null
    groupRegistration: { groupName: string | null; parishName: string | null } | null
  } | null
}

// Type for chaperone data
interface ChaperoneData {
  id: string
  firstName: string | null
  lastName: string | null
  groupRegistration: { groupName: string | null; parishName: string | null } | null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    // Verify report access (requires reports.view permission)
    const { error, user, event, effectiveOrgId } = await verifyReportAccess(
      request,
      eventId,
      '[Certificates Report]'
    )
    if (error) return error

    const isPreview = request.nextUrl.searchParams.get('preview') === 'true'
    const eventFilter = eventId === 'all' ? {} : { eventId }

    // Get chaperones
    const chaperones = await prisma.participant.findMany({
      where: {
        participantType: 'chaperone',
        groupRegistration: eventFilter,
      },
      include: {
        groupRegistration: { select: { groupName: true, parishName: true } },
      },
    }) as ChaperoneData[]

    // Get certificates
    const certificates = await prisma.safeEnvironmentCertificate.findMany({
      where: {
        participant: {
          participantType: 'chaperone',
          groupRegistration: eventFilter,
        },
      },
      include: {
        participant: {
          select: {
            firstName: true,
            lastName: true,
            groupRegistration: { select: { groupName: true, parishName: true } },
          },
        },
      },
    }) as CertificateData[]

    const required = chaperones.length
    const uploaded = certificates.length
    const verified = certificates.filter((c: CertificateData) => c.verifiedAt !== null).length
    const missing = required - uploaded
    const uploadRate = required > 0 ? Math.round((uploaded / required) * 100) : 0
    const verifyRate = required > 0 ? Math.round((verified / required) * 100) : 0

    if (isPreview) {
      return NextResponse.json({ required, uploaded, verified, uploadRate, verifyRate })
    }

    // Programs
    const programs: Record<string, number> = {}
    for (const cert of certificates) {
      const program = cert.programName || 'Unknown'
      programs[program] = (programs[program] || 0) + 1
    }

    // Pending verification
    const pending = certificates
      .filter((c: CertificateData) => c.status === 'pending')
      .map((c: CertificateData) => ({
        name: `${c.participant?.firstName} ${c.participant?.lastName}`,
        uploadedDate: c.uploadedAt ? format(new Date(c.uploadedAt), 'M/d') : 'Unknown',
      }))

    // Missing certs - chaperones with no certificate
    const chaperoneIds = chaperones.map((c: ChaperoneData) => c.id)
    const certParticipantIds = certificates.map((c: CertificateData) => c.participantId)
    const missingChaperones = chaperones.filter((c: ChaperoneData) => !certParticipantIds.includes(c.id))

    const missingList = missingChaperones.map((c: ChaperoneData) => ({
      name: `${c.firstName} ${c.lastName}`,
      group: c.groupRegistration?.groupName || c.groupRegistration?.parishName || 'Unknown',
    }))

    return NextResponse.json({
      required,
      uploaded,
      verified,
      missing,
      uploadRate,
      verifyRate,
      programs,
      pending,
      missingList,
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
