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

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')

    // Find the group registration linked to this Clerk user
    const groupRegistration = await prisma.groupRegistration.findFirst({
      where: { clerkUserId: userId, ...(eventId ? { eventId } : {}) },
      include: {
        participants: {
          include: {
            liabilityForms: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
        // Youth-u18 forms where step 1 (the teen's part) is done but the
        // parent hasn't finished step 2 yet never get a Participant record —
        // that's only created on completion — so without this they were
        // completely invisible here: not shown as pending, not shown as
        // anything, just silently absorbed into the "empty slots" count.
        // That's exactly why a group leader could only see completed forms
        // and had no way to spot or delete a stale duplicate.
        liabilityForms: {
          where: {
            participantId: null,
            completed: false,
            formType: 'youth_u18',
            parentToken: { not: null },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!groupRegistration) {
      return NextResponse.json(
        { error: 'No group registration found' },
        { status: 404 }
      )
    }

    // Create slots for all expected participants based on registration counts
    // This shows group leaders how many forms are expected (e.g., "0/7 completed")
    const forms: any[] = []

    // Add actual participants who have started/completed forms
    groupRegistration.participants.forEach((participant: any) => {
      const latestForm = participant.liabilityForms[0]

      // Distinguish "never started" from "step 1 done, waiting on parent to finish step 2"
      let formStatus: 'not_started' | 'pending_parent' | 'completed'
      if (participant.liabilityFormCompleted) {
        formStatus = 'completed'
      } else if (latestForm && !latestForm.completed && latestForm.parentToken) {
        formStatus = 'pending_parent'
      } else {
        formStatus = 'not_started'
      }

      forms.push({
        id: participant.id,
        firstName: participant.firstName,
        lastName: participant.lastName,
        age: participant.age,
        gender: participant.gender,
        participantType: participant.participantType,
        formStatus,
        formId: latestForm?.id,
        pdfUrl: latestForm?.pdfUrl,
        parentEmail: latestForm?.parentEmail || participant.parentEmail,
        completedAt: latestForm?.completedAt,
        possibleDuplicate: false,
      })
    })

    // Completed-name lookup for flagging duplicates below — a pending form
    // whose name matches someone who has ALREADY completed is very likely a
    // stale duplicate from a re-started registration, not a real 2nd person.
    const completedNames = new Set(
      groupRegistration.participants
        .filter((p: any) => p.liabilityFormCompleted)
        .map((p: any) => `${p.firstName} ${p.lastName}`.trim().toLowerCase())
    )

    // Add teens who finished their part but have no Participant yet because
    // the parent hasn't completed step 2 — id is the LiabilityForm's own id
    // (a different ID space than Participant, so no collision) and the same
    // DELETE endpoint below handles either kind.
    groupRegistration.liabilityForms.forEach((form: any) => {
      const name = `${form.participantFirstName} ${form.participantLastName}`.trim().toLowerCase()
      forms.push({
        id: form.id,
        firstName: form.participantFirstName,
        lastName: form.participantLastName,
        age: form.participantAge,
        gender: form.participantGender,
        participantType: 'youth_u18',
        formStatus: 'pending_parent',
        formId: form.id,
        pdfUrl: null,
        parentEmail: form.parentEmail,
        completedAt: null,
        possibleDuplicate: completedNames.has(name),
      })
    })

    // Calculate how many slots are still truly empty (nobody has started yet)
    const expectedTotal = groupRegistration.totalParticipants
    const actualCount = groupRegistration.participants.length + groupRegistration.liabilityForms.length
    const emptySlots = Math.max(0, expectedTotal - actualCount)

    // Add placeholder entries for forms that haven't been started yet
    // This helps group leaders see "You have 5 more forms that need to be completed"
    for (let i = 0; i < emptySlots; i++) {
      forms.push({
        id: `pending-${i}`,
        firstName: null,
        lastName: null,
        age: null,
        gender: null,
        participantType: null,
        formStatus: 'not_started',
        formId: null,
        pdfUrl: null,
        parentEmail: null,
        completedAt: null,
        possibleDuplicate: false,
      })
    }

    return NextResponse.json({ forms, totalExpected: expectedTotal, actualFilled: actualCount })
  } catch (error) {
    console.error('Error fetching forms:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
