import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyFormsEditAccess } from '@/lib/api-auth'
import { uploadCertificate } from '@/lib/r2/upload-certificate'
import { incrementOrgStorage } from '@/lib/storage/track-storage'

const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

// Lets an org admin upload a Safe Environment certificate on a participant's
// behalf (e.g. one that was emailed in), so they don't have to route it
// through their group leader.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; formId: string }> }
) {
  try {
    const { eventId, formId } = await params

    // Verify user has forms.edit permission and event access
    const { error, user } = await verifyFormsEditAccess(
      request,
      eventId,
      '[Poros Liability Admin Certificate Upload]'
    )
    if (error) return error

    const form = await prisma.liabilityForm.findUnique({
      where: { id: formId },
      select: { id: true, eventId: true, organizationId: true, participantId: true },
    })

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    if (form.eventId !== eventId) {
      return NextResponse.json(
        { error: 'Form does not belong to this event' },
        { status: 400 }
      )
    }

    if (!form.participantId) {
      return NextResponse.json(
        { error: 'This form has not been completed yet, so there is no participant to attach a certificate to.' },
        { status: 400 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const programName = (formData.get('programName') as string | null) || null
    const completionDate = (formData.get('completionDate') as string | null) || null
    const expirationDate = (formData.get('expirationDate') as string | null) || null
    const markVerified = formData.get('markVerified') === 'true'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only PDF, PNG, JPG, or WEBP files are accepted' },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    const fileUrl = await uploadCertificate(
      buffer,
      file.name,
      form.participantId,
      form.organizationId,
      eventId
    )

    await incrementOrgStorage(form.organizationId, file.size)

    const now = new Date()
    const certificate = await prisma.safeEnvironmentCertificate.create({
      data: {
        participantId: form.participantId,
        liabilityFormId: form.id,
        organizationId: form.organizationId,
        fileUrl,
        originalFilename: file.name,
        fileSizeBytes: BigInt(file.size),
        programName,
        completionDate: completionDate ? new Date(completionDate) : null,
        expirationDate: expirationDate ? new Date(expirationDate) : null,
        status: markVerified ? 'verified' : 'pending',
        uploadedByUserId: user!.id,
        ...(markVerified ? { verifiedByUserId: user!.id, verifiedAt: now } : {}),
      },
      select: { id: true, status: true, fileUrl: true },
    })

    await prisma.participant.update({
      where: { id: form.participantId },
      data: {
        safeEnvironmentCertStatus: markVerified ? 'verified' : 'uploaded',
        safeEnvironmentCertUrl: fileUrl,
      },
    })

    return NextResponse.json({ success: true, certificate })
  } catch (error) {
    console.error('Admin certificate upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload certificate' },
      { status: 500 }
    )
  }
}
