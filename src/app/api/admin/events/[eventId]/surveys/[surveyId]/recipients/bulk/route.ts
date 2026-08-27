import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEventAccess } from '@/lib/api-auth'
import { getEventForMailer, sendSurveyInviteToRecipient } from '@/lib/survey-mailer'

const TOKEN_VALID_DAYS = 60
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_BULK_RECIPIENTS = 500

// Bulk-import a pasted list of people who aren't tracked anywhere in ChiRho
// (informal volunteers, etc.) and email each a real tracked survey link.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; surveyId: string }> }
) {
  try {
    const { eventId, surveyId } = await params

    const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[POST Bulk Import Survey Recipients]',
    })

    if (error) return error
    if (!user || !effectiveOrgId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const survey = await prisma.survey.findFirst({
      where: { id: surveyId, eventId },
      include: { _count: { select: { questions: true } } },
    })
    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
    }
    if (survey._count.questions === 0) {
      return NextResponse.json(
        { error: 'Add at least one question before sending this survey' },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const rawRecipients: { name?: string; email?: string }[] = Array.isArray(body?.recipients)
      ? body.recipients
      : []
    const customMessage: string | undefined = body?.customMessage

    if (rawRecipients.length === 0) {
      return NextResponse.json({ error: 'No recipients provided' }, { status: 400 })
    }
    if (rawRecipients.length > MAX_BULK_RECIPIENTS) {
      return NextResponse.json(
        { error: `Import is limited to ${MAX_BULK_RECIPIENTS} recipients at a time` },
        { status: 400 }
      )
    }

    // Normalize + de-dupe the pasted list against itself (case-insensitive).
    const byEmail = new Map<string, { name?: string; email: string }>()
    const invalid: string[] = []
    for (const r of rawRecipients) {
      const email = r.email?.trim()
      if (!email || !EMAIL_REGEX.test(email)) {
        if (email) invalid.push(email)
        continue
      }
      byEmail.set(email.toLowerCase(), { name: r.name?.trim() || undefined, email })
    }

    // Skip anyone who already has a recipient row for this survey.
    const existing = await prisma.surveyRecipient.findMany({
      where: { surveyId },
      select: { email: true },
    })
    const existingEmails = new Set(existing.map(r => r.email.toLowerCase()))

    const toCreate = Array.from(byEmail.entries())
      .filter(([lower]) => !existingEmails.has(lower))
      .map(([, r]) => r)
    const skipped = byEmail.size - toCreate.length

    const event = await getEventForMailer(eventId)
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const tokenExpiresAt = new Date()
    tokenExpiresAt.setDate(tokenExpiresAt.getDate() + TOKEN_VALID_DAYS)

    const newRecipients = toCreate.map(r => ({
      id: randomUUID(),
      surveyId,
      recipientType: 'manual' as const,
      name: r.name || null,
      email: r.email,
      token: randomUUID(),
      tokenExpiresAt,
    }))

    if (newRecipients.length > 0) {
      await prisma.surveyRecipient.createMany({ data: newRecipients })
    }

    if (survey.status === 'draft' && newRecipients.length > 0) {
      await prisma.survey.update({ where: { id: surveyId }, data: { status: 'active' } })
    }

    const results = { sent: 0, failed: 0, errors: [] as string[] }

    for (const recipient of newRecipients) {
      const outcome = await sendSurveyInviteToRecipient({
        effectiveOrgId,
        eventId,
        event,
        survey,
        recipient,
        customMessage,
      })
      if (outcome.success) {
        results.sent++
      } else {
        results.failed++
        results.errors.push(`Failed to send to ${recipient.email}: ${outcome.error}`)
      }
    }

    return NextResponse.json({
      success: true,
      imported: newRecipients.length,
      skipped,
      invalid,
      ...results,
    })
  } catch (error) {
    console.error('Error bulk importing survey recipients:', error)
    return NextResponse.json({ error: 'Failed to import recipients' }, { status: 500 })
  }
}
