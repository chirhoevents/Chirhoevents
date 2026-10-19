import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEventForMailer, sendSurveyToAudience } from '@/lib/survey-mailer'
import { getScheduledSendDueAt, SCHEDULE_CLAIM_STALE_MS } from '@/lib/survey-schedule'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * GET /api/cron/send-scheduled-surveys
 * Every 5 minutes (Vercel Cron). Sends any survey whose scheduled send time
 * (a set time, or when its event ends) has arrived, then clears the schedule.
 * It emails people, so it only runs with CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authorized = cronSecret
    ? request.headers.get('authorization') === `Bearer ${cronSecret}`
    : process.env.NODE_ENV !== 'production'
  if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const now = new Date()
    const scheduled = await prisma.survey.findMany({
      where: { scheduledSendMode: { not: null }, status: { not: 'closed' } },
      include: {
        _count: { select: { questions: true } },
        event: { select: { endDate: true, endTime: true, timezone: true, organizationId: true } },
      },
    })

    const summary = { checked: scheduled.length, sent: [] as { surveyId: string; sent: number; failed: number }[] }

    for (const survey of scheduled) {
      const dueAt = getScheduledSendDueAt(survey, survey.event)
      if (!dueAt || dueAt > now) continue

      // Claim it so an overlapping run doesn't send the same survey too. A
      // claim older than SCHEDULE_CLAIM_STALE_MS is from a run that died.
      const claim = await prisma.survey.updateMany({
        where: {
          id: survey.id,
          scheduledSendMode: { not: null },
          OR: [
            { scheduledSendClaimedAt: null },
            { scheduledSendClaimedAt: { lt: new Date(Date.now() - SCHEDULE_CLAIM_STALE_MS) } },
          ],
        },
        data: { scheduledSendClaimedAt: new Date() },
      })
      if (claim.count === 0) continue

      const clearSchedule = () =>
        prisma.survey.update({
          where: { id: survey.id },
          data: {
            scheduledSendMode: null,
            scheduledSendAt: null,
            scheduledSendMessage: null,
            scheduledSendClaimedAt: null,
          },
        })

      try {
        const event = await getEventForMailer(survey.eventId)
        if (!event || survey._count.questions === 0) {
          console.warn(`[Scheduled surveys] Skipping ${survey.id}: no event or no questions`)
          await clearSchedule()
          continue
        }

        const results = await sendSurveyToAudience({
          effectiveOrgId: survey.event.organizationId,
          eventId: survey.eventId,
          survey,
          event,
          customMessage: survey.scheduledSendMessage || undefined,
        })
        await clearSchedule()
        summary.sent.push({ surveyId: survey.id, sent: results.sent, failed: results.failed })
        console.log(`[Scheduled surveys] Sent ${survey.id}: ${results.sent} sent, ${results.failed} failed`)
      } catch (error) {
        // Leave the claim in place; the survey is retried once it goes stale,
        // and anyone already emailed is skipped.
        console.error(`[Scheduled surveys] Failed to send ${survey.id}:`, error)
      }
    }

    return NextResponse.json({ success: true, ...summary, timestamp: now.toISOString() })
  } catch (error) {
    console.error('[Scheduled surveys] Failed:', error)
    return NextResponse.json({ error: 'Scheduled survey send failed' }, { status: 500 })
  }
}
