import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEventAccess } from '@/lib/api-auth'
import { getEventEndInstant, zonedWallTimeToUtc } from '@/lib/survey-schedule'

/**
 * PUT: schedule the survey to send automatically.
 *   { mode: 'event_end', customMessage? }            -- when the event ends
 *   { mode: 'custom', date, time, customMessage? }   -- 'YYYY-MM-DD' + 'HH:MM'
 *                                                       in the event's timezone
 * The cron at /api/cron/send-scheduled-surveys does the actual send.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; surveyId: string }> }
) {
  try {
    const { eventId, surveyId } = await params

    const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[PUT Survey Schedule]',
    })

    if (error) return error
    if (!user || !effectiveOrgId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const survey = await prisma.survey.findFirst({
      where: { id: surveyId, eventId },
      include: {
        _count: { select: { questions: true } },
        event: { select: { endDate: true, endTime: true, timezone: true } },
      },
    })
    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
    }
    if (survey._count.questions === 0) {
      return NextResponse.json(
        { error: 'Add at least one question before scheduling this survey' },
        { status: 400 }
      )
    }
    if (survey.status === 'closed') {
      return NextResponse.json(
        { error: 'This survey is closed. Reopen it before scheduling a send.' },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { mode, date, time } = body
    const customMessage: string | null =
      typeof body.customMessage === 'string' && body.customMessage.trim() ? body.customMessage : null

    let sendAt: Date | null
    if (mode === 'event_end') {
      sendAt = getEventEndInstant(survey.event)
      if (!sendAt) {
        return NextResponse.json({ error: "Couldn't work out when this event ends" }, { status: 400 })
      }
      if (sendAt <= new Date()) {
        return NextResponse.json(
          { error: 'This event has already ended. Use Send Survey to send it now.' },
          { status: 400 }
        )
      }
    } else if (mode === 'custom') {
      sendAt =
        typeof date === 'string' && typeof time === 'string'
          ? zonedWallTimeToUtc(date, time, survey.event.timezone)
          : null
      if (!sendAt) {
        return NextResponse.json({ error: 'Pick a date and time to send' }, { status: 400 })
      }
      if (sendAt <= new Date()) {
        return NextResponse.json({ error: 'Pick a time in the future' }, { status: 400 })
      }
    } else {
      return NextResponse.json({ error: 'Invalid schedule' }, { status: 400 })
    }

    if (survey.closesAt && sendAt >= survey.closesAt) {
      return NextResponse.json(
        { error: 'That send time is after the survey closes. Move the close date or send earlier.' },
        { status: 400 }
      )
    }

    const updated = await prisma.survey.update({
      where: { id: surveyId },
      data: {
        scheduledSendMode: mode,
        // For 'event_end' the cron works the time out again from the event,
        // so moving the event moves the send; this copy is for display.
        scheduledSendAt: sendAt,
        scheduledSendMessage: customMessage,
        scheduledSendClaimedAt: null,
      },
    })

    return NextResponse.json({ survey: updated })
  } catch (error) {
    console.error('Error scheduling survey:', error)
    return NextResponse.json({ error: 'Failed to schedule survey' }, { status: 500 })
  }
}

/** DELETE: cancel a scheduled send. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; surveyId: string }> }
) {
  try {
    const { eventId, surveyId } = await params

    const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[DELETE Survey Schedule]',
    })

    if (error) return error
    if (!user || !effectiveOrgId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const existing = await prisma.survey.findFirst({ where: { id: surveyId, eventId } })
    if (!existing) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
    }

    await prisma.survey.update({
      where: { id: surveyId },
      data: {
        scheduledSendMode: null,
        scheduledSendAt: null,
        scheduledSendMessage: null,
        scheduledSendClaimedAt: null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error cancelling scheduled survey send:', error)
    return NextResponse.json({ error: 'Failed to cancel scheduled send' }, { status: 500 })
  }
}
