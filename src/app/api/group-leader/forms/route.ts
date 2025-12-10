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

    // Transform participants into forms data
    const forms = groupRegistration.participants.map((participant) => {
      const latestForm = participant.liabilityForms[0]

      return {
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
      }
    })

    return NextResponse.json({ forms })
  } catch (error) {
    console.error('Error fetching forms:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
