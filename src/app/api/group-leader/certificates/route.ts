import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const { userId } = auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Find the group registration linked to this Clerk user
    const groupRegistration = await prisma.groupRegistration.findFirst({
      where: { clerkUserId: userId },
      include: {
        participants: {
          where: {
            participantType: 'chaperone',
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            safeEnvironmentCertStatus: true,
            safeEnvironmentCertificates: {
              orderBy: {
                uploadedAt: 'desc',
              },
              select: {
                id: true,
                fileUrl: true,
                originalFilename: true,
                programName: true,
                completionDate: true,
                expirationDate: true,
                status: true,
                uploadedAt: true,
                verifiedAt: true,
              },
            },
          },
        },
      },
    })

    if (!groupRegistration) {
      return NextResponse.json(
        { error: 'No group registration found for this user' },
        { status: 404 }
      )
    }

    // Transform the data for easier consumption
    const certificates = groupRegistration.participants.map((participant: any) => ({
      participantId: participant.id,
      participantName: `${participant.firstName} ${participant.lastName}`,
      participantEmail: participant.email,
      status: participant.safeEnvironmentCertStatus,
      certificates: participant.safeEnvironmentCertificates,
    }))

    return NextResponse.json({
      groupId: groupRegistration.id,
      groupName: groupRegistration.groupName,
      chaperoneCount: groupRegistration.chaperoneCount,
      certificates,
    })
  } catch (error) {
    console.error('Error fetching certificates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
