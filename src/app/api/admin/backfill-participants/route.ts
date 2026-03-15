import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'
import { logger } from '@/lib/logger'

// This endpoint backfills Participant records for liability forms that don't have them
// This is a one-time fix for forms submitted before the Participant creation was added
// REQUIRES: master_admin role
export async function POST(request: NextRequest) {
  try {
    // Fix #2: Require authentication — master_admin only
    const clerkUserId = await getClerkUserIdFromRequest(request)
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findFirst({
      where: { clerkUserId },
      select: { id: true, role: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'master_admin') {
      return NextResponse.json({ error: 'Forbidden - master_admin access required' }, { status: 403 })
    }

    // Find all completed liability forms that don't have a participant linked
    const formsWithoutParticipants = await prisma.liabilityForm.findMany({
      where: {
        completed: true,
        participantId: null,
        groupRegistrationId: { not: null },
      },
    })

    logger.info({ userId: user.id, formCount: formsWithoutParticipants.length }, 'backfill-participants: starting backfill')

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
            gender: (form.participantGender || 'other') as any, // Default if missing
            participantType: (form.participantType || 'youth_u18') as any, // Default if missing
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
      } catch (error) {
        logger.error({ organizationId: form.organizationId, formId: form.id, error: String(error) }, 'backfill-participants: failed to create participant')
        errors++
      }
    }

    logger.info({ userId: user.id, created, errors }, 'backfill-participants: completed')

    return NextResponse.json({
      success: true,
      message: `Backfilled ${created} participants. ${errors} errors.`,
      created,
      errors,
    })
  } catch (error) {
    logger.error({ error: String(error) }, 'backfill-participants: unexpected error')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
