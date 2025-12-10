import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { parent_token } = body

    if (!parent_token) {
      return NextResponse.json(
        { error: 'Parent token is required' },
        { status: 400 }
      )
    }

    // Find the liability form by parent token
    const liabilityForm = await prisma.liabilityForm.findUnique({
      where: { parentToken: parent_token },
      include: {
        event: true,
        organization: true,
      },
    })

    if (!liabilityForm) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      )
    }

    // Check if form has been completed
    if (!liabilityForm.completed) {
      return NextResponse.json(
        { error: 'Form has not been completed yet' },
        { status: 400 }
      )
    }

    // Get group registration to get group name
    const groupRegistration = await prisma.groupRegistration.findFirst({
      where: {
        eventId: liabilityForm.eventId,
        organizationId: liabilityForm.organizationId,
      },
    })

    // Return form data for review
    return NextResponse.json({
      success: true,
      form_data: {
        participantFirstName: liabilityForm.participantFirstName,
        participantLastName: liabilityForm.participantLastName,
        participantPreferredName: liabilityForm.participantEmail, // Note: We don't have preferred name in schema yet
        participantAge: liabilityForm.participantAge,
        participantGender: liabilityForm.participantGender,
        tShirtSize: 'M', // TODO: Add to schema
        medicalConditions: liabilityForm.medicalConditions,
        medications: liabilityForm.medications,
        allergies: liabilityForm.allergies,
        dietaryRestrictions: liabilityForm.dietaryRestrictions,
        adaAccommodations: liabilityForm.adaAccommodations,
        emergencyContact1Name: liabilityForm.emergencyContact1Name,
        emergencyContact1Phone: liabilityForm.emergencyContact1Phone,
        emergencyContact1Relation: liabilityForm.emergencyContact1Relation,
        emergencyContact2Name: liabilityForm.emergencyContact2Name,
        emergencyContact2Phone: liabilityForm.emergencyContact2Phone,
        emergencyContact2Relation: liabilityForm.emergencyContact2Relation,
        insuranceProvider: liabilityForm.insuranceProvider,
        insurancePolicyNumber: liabilityForm.insurancePolicyNumber,
        insuranceGroupNumber: liabilityForm.insuranceGroupNumber,
        signatureData: liabilityForm.signatureData,
        completedAt: liabilityForm.completedAt?.toISOString(),
        eventName: liabilityForm.event.name,
        groupName: groupRegistration?.groupName || 'Unknown Group',
      },
    })
  } catch (error) {
    console.error('Error loading form for review:', error)
    return NextResponse.json(
      { error: 'Failed to load form' },
      { status: 500 }
    )
  }
}
