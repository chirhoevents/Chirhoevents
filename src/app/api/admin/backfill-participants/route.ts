import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// This endpoint backfills Participant records for liability forms that don't have them
// This is a one-time fix for forms submitted before the Participant creation was added
export async function POST() {
  try {
    // Find all completed liability forms that don't have a participant linked
    const formsWithoutParticipants = await prisma.liabilityForm.findMany({
      where: {
        completed: true,
        participantId: null,
        groupRegistrationId: { not: null },
      },
    })

    console.log(`Found ${formsWithoutParticipants.length} forms without participants`)

    let created = 0
    let errors = 0

    for (const form of formsWithoutParticipants) {
      try {
        // Create the participant
        const participant = await prisma.participant.create({
          data: {
            groupRegistrationId: form.groupRegistrationId!,
            organizationId: form.organizationId,
            firstName: form.participantFirstName,
            lastName: form.participantLastName,
            preferredName: form.participantPreferredName,
            email: form.participantEmail,
            age: form.participantAge || 18, // Default if missing
            gender: form.participantGender || 'other', // Default if missing
            participantType: form.participantType || 'youth_u18', // Default if missing
            clergyTitle: form.clergyTitle,
            tShirtSize: form.tShirtSize,
            liabilityFormCompleted: true,
            parentEmail: form.parentEmail,
          },
        })

        // Link the form to the participant
        await prisma.liabilityForm.update({
          where: { id: form.id },
          data: { participantId: participant.id },
        })

        created++
        console.log(`Created participant for form ${form.id}`)
      } catch (error) {
        console.error(`Error creating participant for form ${form.id}:`, error)
        errors++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Backfilled ${created} participants. ${errors} errors.`,
      created,
      errors,
    })
  } catch (error) {
    console.error('Backfill error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
