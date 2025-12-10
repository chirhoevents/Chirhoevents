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
          include: {
            liabilityForms: {
              where: { completed: true },
              orderBy: { completedAt: 'desc' },
              take: 1,
            },
          },
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
    const forms = []

    // Add actual participants who have started/completed forms
    groupRegistration.participants.forEach((participant) => {
      const latestForm = participant.liabilityForms[0]

      forms.push({
        id: participant.id,
        firstName: participant.firstName,
        lastName: participant.lastName,
        age: participant.age,
        gender: participant.gender,
        participantType: participant.participantType,
        formStatus: participant.liabilityFormCompleted ? 'completed' : 'pending',
        formId: latestForm?.id,
        pdfUrl: latestForm?.pdfUrl,
        parentEmail: participant.parentEmail,
        completedAt: latestForm?.completedAt,
      })
    })

    // Calculate how many slots are still empty (no participant record yet)
    const expectedTotal = groupRegistration.totalParticipants
    const actualCount = groupRegistration.participants.length
    const emptySlots = expectedTotal - actualCount

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
        formStatus: 'pending',
        formId: null,
        pdfUrl: null,
        parentEmail: null,
        completedAt: null,
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
