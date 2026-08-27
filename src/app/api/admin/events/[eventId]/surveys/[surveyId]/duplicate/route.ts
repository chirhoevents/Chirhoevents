import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEventAccess } from '@/lib/api-auth'

// Clone a survey's settings + questions into another event (or the same
// one) so a team doesn't have to rebuild a recurring survey by hand each
// time. The copy always starts fresh: draft status, no recipients/responses.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; surveyId: string }> }
) {
  try {
    const { eventId, surveyId } = await params

    const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[POST Duplicate Survey]',
    })

    if (error) return error
    if (!user || !effectiveOrgId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const survey = await prisma.survey.findFirst({
      where: { id: surveyId, eventId },
      include: { questions: { orderBy: { displayOrder: 'asc' } } },
    })
    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const targetEventId: string | undefined = body?.targetEventId

    if (!targetEventId) {
      return NextResponse.json({ error: 'Missing required field: targetEventId' }, { status: 400 })
    }

    const targetEvent = await prisma.event.findUnique({
      where: { id: targetEventId },
      select: { id: true, organizationId: true },
    })
    if (!targetEvent) {
      return NextResponse.json({ error: 'Target event not found' }, { status: 404 })
    }
    if (targetEvent.organizationId !== effectiveOrgId) {
      return NextResponse.json({ error: "You don't have access to that event" }, { status: 403 })
    }

    const copy = await prisma.survey.create({
      data: {
        eventId: targetEventId,
        title: targetEventId === eventId ? `${survey.title} (Copy)` : survey.title,
        description: survey.description,
        sendToParticipants: survey.sendToParticipants,
        sendToGroupLeaders: survey.sendToGroupLeaders,
        sendToStaff: survey.sendToStaff,
        isAnonymous: survey.isAnonymous,
        createdBy: user.id,
        questions: {
          create: survey.questions.map(q => ({
            questionText: q.questionText,
            questionType: q.questionType,
            options: q.options ?? undefined,
            scaleMin: q.scaleMin,
            scaleMax: q.scaleMax,
            scaleMinLabel: q.scaleMinLabel,
            scaleMaxLabel: q.scaleMaxLabel,
            required: q.required,
            displayOrder: q.displayOrder,
          })),
        },
      },
    })

    return NextResponse.json({ survey: copy }, { status: 201 })
  } catch (error) {
    console.error('Error duplicating survey:', error)
    return NextResponse.json({ error: 'Failed to duplicate survey' }, { status: 500 })
  }
}
