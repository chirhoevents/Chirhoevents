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
          orderBy: [
            { participantType: 'asc' },
            { lastName: 'asc' },
            { firstName: 'asc' },
          ],
        },
        event: {
          select: {
            id: true,
            name: true,
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

    // Transform participants data
    const participants = groupRegistration.participants.map((participant: any) => {
      const latestForm = participant.liabilityForms[0]

      return {
        id: participant.id,
        firstName: participant.firstName,
        lastName: participant.lastName,
        preferredName: participant.preferredName,
        age: participant.age,
        gender: participant.gender,
        participantType: participant.participantType,
        email: participant.email,
        phone: latestForm?.participantPhone || null,
        parentEmail: participant.parentEmail,
        parentPhone: null, // Not stored in Participant model
        dietaryRestrictions: latestForm?.dietaryRestrictions || null,
        adaAccommodations: latestForm?.adaAccommodations || null,
        liabilityFormCompleted: participant.liabilityFormCompleted,
        liabilityFormId: latestForm?.id,
        liabilityFormPdfUrl: latestForm?.pdfUrl,
        liabilityFormCompletedAt: latestForm?.completedAt,
        medicalConditions: latestForm?.medicalConditions,
        allergies: latestForm?.allergies,
        medications: latestForm?.medications,
        emergencyContact1Name: latestForm?.emergencyContact1Name,
        emergencyContact1Phone: latestForm?.emergencyContact1Phone,
        emergencyContact1Relation: latestForm?.emergencyContact1Relation,
        emergencyContact2Name: latestForm?.emergencyContact2Name,
        emergencyContact2Phone: latestForm?.emergencyContact2Phone,
        emergencyContact2Relation: latestForm?.emergencyContact2Relation,
      }
    })

    return NextResponse.json({
      groupName: groupRegistration.groupName,
      eventName: groupRegistration.event.name,
      participants,
    })
  } catch (error) {
    console.error('Error fetching participants:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
