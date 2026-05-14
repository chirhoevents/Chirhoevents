import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { uploadLetter } from '@/lib/r2/upload-letter'
import { incrementOrgStorage } from '@/lib/storage/track-storage'
import { ParticipantType } from '@prisma/client'

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
])
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

// POST /api/poros/letters-of-good-standing
//
// Authenticated via access_code (same pattern as all poros registrant routes).
// If a liability_form_id is provided it is linked; participant info is taken
// from that form so the caller doesn't have to repeat it.
// If no liability_form_id, participant_name + participant_type are required.
//
// submission_method: 'file_upload' | 'external_submission'
//
// For file_upload — send as multipart/form-data with a `file` field.
// For external_submission — send as JSON or multipart without a file.
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') ?? ''
    const isMultipart = contentType.includes('multipart/form-data')

    // ── Parse request ────────────────────────────────────────────────────────
    let accessCode: string
    let submissionMethod: string
    let liabilityFormId: string | null = null
    let participantName: string | null = null
    let participantType: string | null = null
    let externalNotes: string | null = null
    let submittedToContact: string | null = null
    let submittedToEmail: string | null = null
    let file: File | null = null

    if (isMultipart) {
      const formData = await request.formData()
      accessCode = (formData.get('access_code') as string) ?? ''
      submissionMethod = (formData.get('submission_method') as string) ?? ''
      liabilityFormId = (formData.get('liability_form_id') as string) || null
      participantName = (formData.get('participant_name') as string) || null
      participantType = (formData.get('participant_type') as string) || null
      externalNotes = (formData.get('external_notes') as string) || null
      submittedToContact = (formData.get('submitted_to_contact') as string) || null
      submittedToEmail = (formData.get('submitted_to_email') as string) || null
      file = (formData.get('file') as File) || null
    } else {
      const body = await request.json()
      accessCode = body.access_code ?? ''
      submissionMethod = body.submission_method ?? ''
      liabilityFormId = body.liability_form_id ?? null
      participantName = body.participant_name ?? null
      participantType = body.participant_type ?? null
      externalNotes = body.external_notes ?? null
      submittedToContact = body.submitted_to_contact ?? null
      submittedToEmail = body.submitted_to_email ?? null
    }

    // ── Validate required fields ─────────────────────────────────────────────
    if (!accessCode) {
      return NextResponse.json({ error: 'access_code is required' }, { status: 400 })
    }
    if (!['file_upload', 'external_submission'].includes(submissionMethod)) {
      return NextResponse.json(
        { error: 'submission_method must be "file_upload" or "external_submission"' },
        { status: 400 }
      )
    }
    if (submissionMethod === 'file_upload' && !file) {
      return NextResponse.json(
        { error: 'file is required for file_upload' },
        { status: 400 }
      )
    }

    // ── Resolve registration from access code ────────────────────────────────
    let eventId: string
    let organizationId: string
    let resolvedParticipantId: string | null = null

    if (accessCode.startsWith('IND-')) {
      const reg = await prisma.individualRegistration.findUnique({
        where: { confirmationCode: accessCode },
        select: {
          id: true,
          eventId: true,
          firstName: true,
          lastName: true,
          event: { select: { organizationId: true } },
        },
      })
      if (!reg) {
        return NextResponse.json({ error: 'Invalid access code' }, { status: 404 })
      }
      eventId = reg.eventId
      organizationId = reg.event.organizationId

      // If no liability_form_id given, try to resolve participant info from the
      // most recent form for this individual registration
      if (!liabilityFormId) {
        const form = await prisma.liabilityForm.findFirst({
          where: { individualRegistrationId: reg.id, eventId },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            participantType: true,
            participantFirstName: true,
            participantLastName: true,
            participantId: true,
          },
        })
        if (form) {
          liabilityFormId = form.id
          participantName = participantName ?? `${form.participantFirstName} ${form.participantLastName}`
          participantType = participantType ?? form.participantType
          resolvedParticipantId = form.participantId ?? null
        } else {
          participantName = participantName ?? `${reg.firstName} ${reg.lastName}`
        }
      }
    } else {
      const reg = await prisma.groupRegistration.findUnique({
        where: { accessCode },
        select: {
          id: true,
          eventId: true,
          event: { select: { organizationId: true } },
        },
      })
      if (!reg) {
        return NextResponse.json({ error: 'Invalid access code' }, { status: 404 })
      }
      eventId = reg.eventId
      organizationId = reg.event.organizationId

      if (!liabilityFormId) {
        const form = await prisma.liabilityForm.findFirst({
          where: { groupRegistrationId: reg.id, eventId },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            participantType: true,
            participantFirstName: true,
            participantLastName: true,
            participantId: true,
          },
        })
        if (form) {
          liabilityFormId = form.id
          participantName = participantName ?? `${form.participantFirstName} ${form.participantLastName}`
          participantType = participantType ?? form.participantType
          resolvedParticipantId = form.participantId ?? null
        }
      }
    }

    // ── If liability_form_id was explicitly provided, validate + pull info ────
    if (liabilityFormId && !resolvedParticipantId) {
      const form = await prisma.liabilityForm.findUnique({
        where: { id: liabilityFormId },
        select: {
          id: true,
          eventId: true,
          participantType: true,
          participantFirstName: true,
          participantLastName: true,
          participantId: true,
        },
      })
      if (!form || form.eventId !== eventId) {
        return NextResponse.json({ error: 'liability_form_id not found for this event' }, { status: 404 })
      }
      participantName = participantName ?? `${form.participantFirstName} ${form.participantLastName}`
      participantType = participantType ?? form.participantType
      resolvedParticipantId = form.participantId ?? null
    }

    // ── Ensure we have participant identity ──────────────────────────────────
    if (!participantName?.trim()) {
      return NextResponse.json(
        { error: 'participant_name is required when no liability_form_id is provided' },
        { status: 400 }
      )
    }
    if (!participantType) {
      return NextResponse.json(
        { error: 'participant_type is required when no liability_form_id is provided' },
        { status: 400 }
      )
    }
    const validTypes = new Set<string>(Object.values(ParticipantType))
    if (!validTypes.has(participantType)) {
      return NextResponse.json(
        { error: `Invalid participant_type: ${participantType}` },
        { status: 400 }
      )
    }

    // ── Guard: no duplicate non-rejected submission for the same form ─────────
    if (liabilityFormId) {
      const existing = await prisma.letterOfGoodStanding.findFirst({
        where: { liabilityFormId, status: { notIn: ['rejected'] } },
        select: { id: true, status: true },
      })
      if (existing) {
        return NextResponse.json(
          {
            error: 'A letter submission already exists for this form',
            existingId: existing.id,
            existingStatus: existing.status,
          },
          { status: 409 }
        )
      }
    }

    // ── Handle file upload ────────────────────────────────────────────────────
    let fileUrl: string | null = null
    let originalFilename: string | null = null
    let fileSizeBytes: bigint | null = null
    let uploadedAt: Date | null = null

    if (submissionMethod === 'file_upload' && file) {
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        return NextResponse.json(
          { error: 'Only PDF, JPEG, and PNG files are accepted' },
          { status: 400 }
        )
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: 'File size must be less than 10 MB' },
          { status: 400 }
        )
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      fileUrl = await uploadLetter(buffer, file.name, organizationId, eventId)
      await incrementOrgStorage(organizationId, file.size)

      originalFilename = file.name
      fileSizeBytes = BigInt(file.size)
      uploadedAt = new Date()
    }

    // ── Derive status from method ─────────────────────────────────────────────
    const newStatus =
      submissionMethod === 'file_upload'
        ? 'uploaded'
        : 'submitted_externally'

    // ── Create record ─────────────────────────────────────────────────────────
    const letter = await prisma.letterOfGoodStanding.create({
      data: {
        organizationId,
        eventId,
        liabilityFormId,
        participantId: resolvedParticipantId,
        participantName: participantName.trim(),
        participantType: participantType as ParticipantType,
        submissionMethod,
        fileUrl,
        originalFilename,
        fileSizeBytes,
        uploadedAt,
        submittedToContact: submittedToContact?.trim() ?? null,
        submittedToEmail: submittedToEmail?.trim() ?? null,
        externalSubmissionNotes: externalNotes?.trim() ?? null,
        status: newStatus,
      },
      select: { id: true, status: true, submissionMethod: true },
    })

    return NextResponse.json({ success: true, letter })
  } catch (err) {
    console.error('[PorosLettersOfGoodStanding POST] error:', err)
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 })
  }
}
