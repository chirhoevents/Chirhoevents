import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'

export async function GET(request: NextRequest) {
  try {
    const userId = await getClerkUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Find the group registration
    const groupRegistration = await prisma.groupRegistration.findFirst({
      where: { clerkUserId: userId },
      include: {
        event: {
          select: {
            id: true,
            name: true,
          },
        },
        participants: {
          include: {
            liabilityForms: true,
          },
        },
      },
    })

    if (!groupRegistration) {
      return NextResponse.json({
        error: 'No group registration found for this user',
        clerkUserId: userId,
      })
    }

    // Also check if there are liability forms directly linked to the group
    const directLiabilityForms = await prisma.liabilityForm.findMany({
      where: {
        groupRegistrationId: groupRegistration.id,
      },
    })

    return NextResponse.json({
      clerkUserId: userId,
      groupRegistration: {
        id: groupRegistration.id,
        groupName: groupRegistration.groupName,
        eventId: groupRegistration.eventId,
        eventName: groupRegistration.event.name,
        accessCode: groupRegistration.accessCode,
        totalParticipants: groupRegistration.totalParticipants,
        youthCount: groupRegistration.youthCount,
        chaperoneCount: groupRegistration.chaperoneCount,
        priestCount: groupRegistration.priestCount,
      },
      participantsInDatabase: groupRegistration.participants.length,
      participants: groupRegistration.participants.map((p: any) => ({
        id: p.id,
        name: `${p.firstName} ${p.lastName}`,
        age: p.age,
        type: p.participantType,
        liabilityFormCompleted: p.liabilityFormCompleted,
        formsCount: p.liabilityForms.length,
      })),
      directLiabilityForms: directLiabilityForms.length,
      liabilityForms: directLiabilityForms.map((f: any) => ({
        id: f.id,
        participantName: `${f.participantFirstName} ${f.participantLastName}`,
        type: f.formType,
        completed: f.completed,
        participantId: f.participantId,
      })),
    })
  } catch (error) {
    console.error('Error fetching group data:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
