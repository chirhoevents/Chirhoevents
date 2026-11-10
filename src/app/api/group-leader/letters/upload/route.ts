import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'
import { rejectIfGroupEventEnded } from '@/lib/group-leader-read-only'
import { secureFileLink } from '@/lib/r2/private-files'
import {
  lettersRequiredFor,
  storeLetterFile,
  validateLetterFile,
} from '@/lib/letters-of-good-standing'

// POST /api/group-leader/letters/upload
//
// A group leader uploads a letter of good standing for someone in their
// group. multipart/form-data:
//   file           — PDF, JPEG or PNG, up to 10 MB (required)
//   participantId  — the participant the letter is for, or
//   letterId       — an existing letter record of this group (for letters
//                    whose form isn't tied to a participant yet)
//
// The file is attached to the person's latest letter record (replacing an
// "I will submit externally" or rejected one), or a new record is made.
// Verified letters can't be replaced from the portal.
export async function POST(request: NextRequest) {
  try {
    const userId = await getClerkUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const participantId = (formData.get('participantId') as string) || null
    const letterId = (formData.get('letterId') as string) || null

    if (!participantId && !letterId) {
      return NextResponse.json(
        { error: 'participantId or letterId is required' },
        { status: 400 }
      )
    }
    const fileError = validateLetterFile(file)
    if (fileError) return NextResponse.json({ error: fileError }, { status: 400 })

    let groupRegistrationId: string
    let organizationId: string
    let eventId: string
    let existing: { id: string; status: string } | null = null
    let newLetter: {
      participantId: string
      participantName: string
      participantType: string
      liabilityFormId: string | null
    } | null = null

    if (participantId) {
      const participant = await prisma.participant.findFirst({
        where: { id: participantId, groupRegistration: { clerkUserId: userId } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          participantType: true,
          groupRegistration: {
            select: {
              id: true,
              organizationId: true,
              eventId: true,
              event: { select: { settings: { select: { letterOfGoodStandingRequiredFor: true } } } },
            },
          },
        },
      })
      if (!participant) {
        return NextResponse.json({ error: 'Participant not found in your group' }, { status: 404 })
      }
      const reg = participant.groupRegistration
      const requiredFor = lettersRequiredFor(reg.event.settings?.letterOfGoodStandingRequiredFor)
      if (!requiredFor.includes(participant.participantType)) {
        return NextResponse.json(
          { error: 'A letter of good standing is not required for this participant' },
          { status: 400 }
        )
      }
      groupRegistrationId = reg.id
      organizationId = reg.organizationId
      eventId = reg.eventId

      existing = await prisma.letterOfGoodStanding.findFirst({
        where: {
          eventId,
          OR: [{ participantId }, { liabilityForm: { participantId } }],
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, status: true },
      })

      if (!existing) {
        const form = await prisma.liabilityForm.findFirst({
          where: { participantId, eventId },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        })
        newLetter = {
          participantId,
          participantName: `${participant.firstName} ${participant.lastName}`,
          participantType: participant.participantType,
          liabilityFormId: form?.id ?? null,
        }
      }
    } else {
      const letter = await prisma.letterOfGoodStanding.findFirst({
        where: {
          id: letterId!,
          OR: [
            { participant: { groupRegistration: { clerkUserId: userId } } },
            { liabilityForm: { groupRegistration: { clerkUserId: userId } } },
          ],
        },
        select: {
          id: true,
          status: true,
          organizationId: true,
          eventId: true,
          participant: { select: { groupRegistrationId: true } },
          liabilityForm: { select: { groupRegistrationId: true } },
        },
      })
      const regId =
        letter?.participant?.groupRegistrationId ?? letter?.liabilityForm?.groupRegistrationId
      if (!letter || !regId) {
        return NextResponse.json({ error: 'Letter not found in your group' }, { status: 404 })
      }
      groupRegistrationId = regId
      organizationId = letter.organizationId
      eventId = letter.eventId
      existing = { id: letter.id, status: letter.status }
    }

    const readOnly = await rejectIfGroupEventEnded(groupRegistrationId)
    if (readOnly) return readOnly

    if (existing?.status === 'verified') {
      return NextResponse.json(
        {
          error:
            'This letter has already been verified. Please contact the event organizer if it needs to be changed.',
        },
        { status: 409 }
      )
    }

    const stored = await storeLetterFile(file!, organizationId, eventId)

    const select = {
      id: true,
      status: true,
      submissionMethod: true,
      fileUrl: true,
      originalFilename: true,
      uploadedAt: true,
    } as const

    const saved = existing
      ? await prisma.letterOfGoodStanding.update({
          where: { id: existing.id },
          data: {
            ...stored,
            submissionMethod: 'file_upload',
            status: 'uploaded',
            rejectionReason: null,
          },
          select,
        })
      : await prisma.letterOfGoodStanding.create({
          data: {
            organizationId,
            eventId,
            participantId: newLetter!.participantId,
            liabilityFormId: newLetter!.liabilityFormId,
            participantName: newLetter!.participantName,
            participantType: newLetter!.participantType as any,
            ...stored,
            submissionMethod: 'file_upload',
            status: 'uploaded',
          },
          select,
        })

    return NextResponse.json({
      success: true,
      letter: { ...saved, fileUrl: secureFileLink('letter', saved.id, saved.fileUrl) },
    })
  } catch (error) {
    console.error('[GroupLeader letters upload] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
