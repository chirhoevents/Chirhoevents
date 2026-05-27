import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'

export async function GET(request: NextRequest) {
  try {
    const userId = await getClerkUserIdFromRequest(request)

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
            // Include chaperones AND all clergy/religious types — seminarians,
            // deacons, etc. all require Safe Environment certificates.
            participantType: {
              in: ['chaperone', 'priest', 'deacon', 'seminarian', 'religious_sister', 'religious_brother'],
            },
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
      // Use actual participant count so clergy/religious are included in totals
      chaperoneCount: certificates.length,
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
