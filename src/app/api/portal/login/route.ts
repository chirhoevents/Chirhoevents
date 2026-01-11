import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { access_code } = body

    if (!access_code) {
      return NextResponse.json(
        { error: 'Access code is required' },
        { status: 400 }
      )
    }

    // Check if this is an individual registration code (starts with "IND-")
    if (access_code.startsWith('IND-')) {
      // Look up individual registration by confirmation code
      const individualRegistration = await prisma.individualRegistration.findUnique({
        where: { confirmationCode: access_code },
        include: {
          event: {
            include: {
              settings: true,
            },
          },
          liabilityForms: {
            select: {
              id: true,
              completed: true,
              formType: true,
            },
          },
        },
      })

      if (!individualRegistration) {
        return NextResponse.json(
          { error: 'Invalid access code. Please check and try again.' },
          { status: 404 }
        )
      }

      // Check if liability forms are required for this event
      const liabilityRequired = individualRegistration.event.settings?.liabilityFormsRequiredIndividual ?? false

      if (!liabilityRequired) {
        return NextResponse.json(
          { error: 'Liability forms are not required for this event.' },
          { status: 400 }
        )
      }

      // Check if form is already completed
      const existingForm = individualRegistration.liabilityForms[0]
      const formCompleted = existingForm?.completed ?? false

      // Format event dates
      const startDate = new Date(individualRegistration.event.startDate)
      const endDate = new Date(individualRegistration.event.endDate)
      const eventDates = `${startDate.toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric'
      })} - ${endDate.toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric'
      })}`

      return NextResponse.json({
        success: true,
        registrationType: 'individual',
        individualId: individualRegistration.id,
        participantName: `${individualRegistration.firstName} ${individualRegistration.lastName}`,
        participantEmail: individualRegistration.email,
        participantAge: individualRegistration.age,
        participantGender: individualRegistration.gender,
        eventId: individualRegistration.event.id,
        eventName: individualRegistration.event.name,
        eventDates,
        formCompleted,
        existingFormId: existingForm?.id || null,
        // For individuals, we auto-determine form type based on age
        // No role selection needed
        autoFormType: individualRegistration.age && individualRegistration.age < 18 ? 'youth_u18' : 'youth_o18_chaperone',
      })
    }

    // Otherwise, treat as a group registration access code
    const groupRegistration = await prisma.groupRegistration.findUnique({
      where: { accessCode: access_code },
      include: {
        event: true,
        participants: {
          select: {
            id: true,
            liabilityFormCompleted: true,
          },
        },
      },
    })

    if (!groupRegistration) {
      return NextResponse.json(
        { error: 'Invalid access code. Please check and try again.' },
        { status: 404 }
      )
    }

    // Calculate forms completed
    const formsCompleted = groupRegistration.participants.filter(
      (p: { liabilityFormCompleted: boolean }) => p.liabilityFormCompleted
    ).length
    const formsPending = groupRegistration.totalParticipants - formsCompleted

    // Format event dates
    const startDate = new Date(groupRegistration.event.startDate)
    const endDate = new Date(groupRegistration.event.endDate)
    const eventDates = `${startDate.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    })} - ${endDate.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    })}`

    return NextResponse.json({
      success: true,
      registrationType: 'group',
      groupId: groupRegistration.id,
      groupName: groupRegistration.groupName,
      eventName: groupRegistration.event.name,
      eventDates,
      totalParticipants: groupRegistration.totalParticipants,
      priestCount: groupRegistration.priestCount,
      formsCompleted,
      formsPending,
    })
  } catch (error) {
    console.error('Portal login error:', error)
    return NextResponse.json(
      { error: 'Failed to validate access code. Please try again.' },
      { status: 500 }
    )
  }
}
