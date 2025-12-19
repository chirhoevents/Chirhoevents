import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'
import { format } from 'date-fns'

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { eventId } = params
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
    })

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
    })

    const required = chaperones.length
    const uploaded = certificates.length
    const verified = certificates.filter(c => c.verifiedAt !== null).length
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
      .filter(c => c.verifiedAt === null && c.rejectedAt === null)
      .map(c => ({
        name: `${c.participant?.firstName} ${c.participant?.lastName}`,
        uploadedDate: c.uploadedAt ? format(new Date(c.uploadedAt), 'M/d') : 'Unknown',
      }))

    // Missing certs - chaperones with no certificate
    const chaperoneIds = chaperones.map(c => c.id)
    const certParticipantIds = certificates.map(c => c.participantId)
    const missingChaperones = chaperones.filter(c => !certParticipantIds.includes(c.id))

    const missingList = missingChaperones.map(c => ({
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
