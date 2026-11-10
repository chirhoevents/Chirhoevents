import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'
import { secureFileLink } from '@/lib/r2/private-files'
import { lettersRequiredFor } from '@/lib/letters-of-good-standing'

// GET /api/group-leader/letters?eventId=
//
// Letters of good standing for the signed-in group leader's group: one row
// per participant whose type needs a letter (per the event's settings), with
// their most recent letter if there is one, plus the event's instructions.
export async function GET(request: NextRequest) {
  try {
    const userId = await getClerkUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const eventId = request.nextUrl.searchParams.get('eventId')

    const group = await prisma.groupRegistration.findFirst({
      where: { clerkUserId: userId, ...(eventId ? { eventId } : {}) },
      select: {
        id: true,
        groupName: true,
        eventId: true,
        event: {
          select: {
            settings: {
              select: {
                letterOfGoodStandingMethod: true,
                letterOfGoodStandingContactName: true,
                letterOfGoodStandingContactEmail: true,
                letterOfGoodStandingInstructions: true,
                letterOfGoodStandingRequiredFor: true,
              },
            },
          },
        },
      },
    })

    if (!group) {
      return NextResponse.json(
        { error: 'No group registration found for this user' },
        { status: 404 }
      )
    }

    const settings = group.event.settings
    const requiredFor = lettersRequiredFor(settings?.letterOfGoodStandingRequiredFor)

    const participants = await prisma.participant.findMany({
      where: {
        groupRegistrationId: group.id,
        participantType: { in: requiredFor as any },
      },
      select: { id: true, firstName: true, lastName: true, email: true, participantType: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })
    const participantIds = participants.map((p) => p.id)

    const letters = await prisma.letterOfGoodStanding.findMany({
      where: {
        eventId: group.eventId,
        OR: [
          { participantId: { in: participantIds } },
          { liabilityForm: { groupRegistrationId: group.id } },
        ],
      },
      select: {
        id: true,
        participantId: true,
        participantName: true,
        participantType: true,
        submissionMethod: true,
        status: true,
        fileUrl: true,
        originalFilename: true,
        uploadedAt: true,
        externalSubmissionNotes: true,
        rejectionReason: true,
        verifiedAt: true,
        createdAt: true,
        liabilityForm: { select: { participantId: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const shapeLetter = (l: (typeof letters)[number]) => ({
      id: l.id,
      submissionMethod: l.submissionMethod,
      status: l.status,
      fileUrl: secureFileLink('letter', l.id, l.fileUrl),
      originalFilename: l.originalFilename,
      uploadedAt: l.uploadedAt,
      externalSubmissionNotes: l.externalSubmissionNotes,
      rejectionReason: l.rejectionReason,
      verifiedAt: l.verifiedAt,
    })

    // Latest letter per participant (letters are newest first)
    const used = new Set<string>()
    const rows: {
      participantId: string | null
      participantName: string
      participantEmail: string | null
      participantType: string
      letter: ReturnType<typeof shapeLetter> | null
    }[] = participants.map((p) => {
      const letter = letters.find(
        (l) => (l.participantId ?? l.liabilityForm?.participantId) === p.id
      )
      if (letter) used.add(letter.id)
      return {
        participantId: p.id,
        participantName: `${p.firstName} ${p.lastName}`,
        participantEmail: p.email,
        participantType: p.participantType,
        letter: letter ? shapeLetter(letter) : null,
      }
    })

    // Letters from this group's forms that aren't tied to a participant
    // record yet still belong on the list
    const seenNames = new Set<string>()
    for (const l of letters) {
      if (used.has(l.id)) continue
      if (l.participantId ?? l.liabilityForm?.participantId) continue
      if (!requiredFor.includes(l.participantType)) continue
      const key = l.participantName.trim().toLowerCase()
      if (seenNames.has(key)) continue
      seenNames.add(key)
      rows.push({
        participantId: null,
        participantName: l.participantName,
        participantEmail: null,
        participantType: l.participantType,
        letter: shapeLetter(l),
      })
    }

    return NextResponse.json({
      groupId: group.id,
      groupName: group.groupName,
      settings: {
        method: settings?.letterOfGoodStandingMethod ?? 'both',
        contactName: settings?.letterOfGoodStandingContactName ?? null,
        contactEmail: settings?.letterOfGoodStandingContactEmail ?? null,
        instructions: settings?.letterOfGoodStandingInstructions ?? null,
        requiredFor,
      },
      letters: rows,
    })
  } catch (error) {
    console.error('[GroupLeader letters GET] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
