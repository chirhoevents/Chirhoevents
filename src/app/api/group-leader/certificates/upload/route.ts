import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { uploadCertificate } from '@/lib/r2/upload-certificate'

export async function POST(request: NextRequest) {
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
      select: {
        id: true,
        organizationId: true,
        eventId: true,
      },
    })

    if (!groupRegistration) {
      return NextResponse.json(
        { error: 'No group registration found for this user' },
        { status: 404 }
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

    // Verify the participant belongs to this group
    const participant = await prisma.participant.findFirst({
      where: {
        id: participantId,
        groupRegistrationId: groupRegistration.id,
        participantType: 'chaperone',
      },
    })

    if (!participant) {
      return NextResponse.json(
        { error: 'Participant not found or is not a chaperone in this group' },
        { status: 404 }
      )
    }

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
      certificate,
    })
  } catch (error) {
    console.error('Error uploading certificate:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
