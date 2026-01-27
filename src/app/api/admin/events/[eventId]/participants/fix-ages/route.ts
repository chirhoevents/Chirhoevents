import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

// GET: View all participants with their current ages for this event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[Fix Ages View]',
    })
    if (error) return error

    if (!hasPermission(user!.role, 'poros.access')) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    // Get all participants with their liability form ages
    const participants = await prisma.participant.findMany({
      where: {
        groupRegistration: { eventId },
      },
      include: {
        groupRegistration: {
          select: { groupName: true, parishName: true },
        },
        liabilityForms: {
          orderBy: { completedAt: 'desc' },
          take: 1,
          select: { id: true, participantAge: true },
        },
      },
      orderBy: [
        { groupRegistration: { groupName: 'asc' } },
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    })

    const summary = {
      total: participants.length,
      zeroAge: participants.filter(p => p.age === 0).length,
      under18: participants.filter(p => p.age > 0 && p.age < 18).length,
      over18: participants.filter(p => p.age >= 18).length,
    }

    const participantList = participants.map(p => ({
      id: p.id,
      name: `${p.firstName} ${p.lastName}`,
      group: p.groupRegistration.parishName || p.groupRegistration.groupName,
      participantType: p.participantType,
      currentAge: p.age,
      liabilityFormAge: p.liabilityForms[0]?.participantAge || null,
      liabilityFormId: p.liabilityForms[0]?.id || null,
    }))

    return NextResponse.json({
      summary,
      participants: participantList,
    })
  } catch (error) {
    console.error('Error fetching ages:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// POST: Update ages for participants in bulk
// Body: { updates: [{ participantId: string, age: number }] }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[Fix Ages Update]',
    })
    if (error) return error

    if (!hasPermission(user!.role, 'poros.access')) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { updates } = body as { updates: Array<{ participantId: string; age: number }> }

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ error: 'Missing updates array' }, { status: 400 })
    }

    // Validate all participant IDs belong to this event
    const participantIds = updates.map(u => u.participantId)
    const validParticipants = await prisma.participant.findMany({
      where: {
        id: { in: participantIds },
        groupRegistration: { eventId },
      },
      select: { id: true },
    })

    const validIds = new Set(validParticipants.map(p => p.id))
    const invalidUpdates = updates.filter(u => !validIds.has(u.participantId))

    if (invalidUpdates.length > 0) {
      return NextResponse.json({
        error: `${invalidUpdates.length} participant(s) not found in this event`,
        invalidIds: invalidUpdates.map(u => u.participantId),
      }, { status: 400 })
    }

    // Perform updates
    let updatedCount = 0
    let liabilityUpdatedCount = 0

    for (const update of updates) {
      const age = Math.max(0, Math.min(150, Math.round(update.age)))

      // Get current participant to check their type
      const participant = await prisma.participant.findUnique({
        where: { id: update.participantId },
        select: { participantType: true },
      })

      // Only update participant type if they're currently a youth type
      const isYouth = participant?.participantType === 'youth_u18' || participant?.participantType === 'youth_o18'
      const newType = isYouth ? (age >= 18 ? 'youth_o18' : 'youth_u18') : participant?.participantType

      // Update participant
      await prisma.participant.update({
        where: { id: update.participantId },
        data: {
          age,
          ...(isYouth && { participantType: newType }),
        },
      })
      updatedCount++

      // Update liability forms for this participant
      const formsUpdated = await prisma.liabilityForm.updateMany({
        where: { participantId: update.participantId },
        data: { participantAge: age },
      })
      liabilityUpdatedCount += formsUpdated.count
    }

    return NextResponse.json({
      success: true,
      participantsUpdated: updatedCount,
      liabilityFormsUpdated: liabilityUpdatedCount,
    })
  } catch (error) {
    console.error('Error updating ages:', error)
    return NextResponse.json({ error: 'Failed to update ages' }, { status: 500 })
  }
}
