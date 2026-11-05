import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { uploadCertificate } from '@/lib/r2/upload-certificate'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'
import { rejectIfGroupEventEnded } from '@/lib/group-leader-read-only'
import { incrementOrgStorage } from '@/lib/storage/track-storage'
import { secureFileLink } from '@/lib/r2/private-files'

export async function POST(request: NextRequest) {
  try {
    const userId = await getClerkUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const participantId = formData.get('participantId') as string
    const file = formData.get('file') as File
    const programName = formData.get('programName') as string | null
    const completionDate = formData.get('completionDate') as string | null
    const expirationDate = formData.get('expirationDate') as string | null

    if (!participantId || !file) {
      return NextResponse.json(
        { error: 'Missing required fields: participantId and file' },
        { status: 400 }
      )
    }

    // Verify the participant belongs to a group owned by this user. Looking up
    // via the participant (rather than findFirst on the user's registrations)
    // keeps uploads working for leaders with registrations in multiple events.
    const participant = await prisma.participant.findFirst({
      where: {
        id: participantId,
        groupRegistration: { clerkUserId: userId },
        participantType: {
          in: ['chaperone', 'priest', 'deacon', 'seminarian', 'religious_sister', 'religious_brother'],
        },
      },
      include: {
        groupRegistration: {
          select: { id: true, organizationId: true, eventId: true },
        },
      },
    })

    if (!participant || !participant.groupRegistration) {
      return NextResponse.json(
        { error: 'Participant not found or is not a chaperone in this group' },
        { status: 404 }
      )
    }

    const groupRegistration = participant.groupRegistration

    const readOnly = await rejectIfGroupEventEnded(groupRegistration.id)
    if (readOnly) return readOnly

    // Validate file type (PDF only for now)
    if (!file.type.includes('pdf')) {
      return NextResponse.json(
        { error: 'Only PDF files are accepted' },
        { status: 400 }
      )
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to R2
    const fileUrl = await uploadCertificate(
      buffer,
      file.name,
      participantId,
      groupRegistration.organizationId,
      groupRegistration.eventId
    )

    // Track storage usage
    await incrementOrgStorage(groupRegistration.organizationId, file.size)

    // Create certificate record in database
    const certificate = await prisma.safeEnvironmentCertificate.create({
      data: {
        participantId,
        organizationId: groupRegistration.organizationId,
        fileUrl,
        originalFilename: file.name,
        fileSizeBytes: BigInt(file.size),
        programName: programName || null,
        completionDate: completionDate ? new Date(completionDate) : null,
        expirationDate: expirationDate ? new Date(expirationDate) : null,
        status: 'pending',
        uploadedByUserId: null, // Could link to Clerk user if needed
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
      },
    })

    // Update participant's certificate status
    await prisma.participant.update({
      where: { id: participantId },
      data: {
        safeEnvironmentCertStatus: 'uploaded',
        safeEnvironmentCertUrl: fileUrl,
      },
    })

    return NextResponse.json({
      success: true,
      certificate: { ...certificate, fileUrl: secureFileLink('safe-env-cert', certificate.id, certificate.fileUrl) },
    })
  } catch (error) {
    console.error('Error uploading certificate:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
