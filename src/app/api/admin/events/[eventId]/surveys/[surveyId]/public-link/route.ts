import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEventAccess } from '@/lib/api-auth'

// Non-personalized link anyone can use to respond (vendors, flyers, QR
// codes, "just grab a link"). Submissions through it aren't tied to a
// SurveyRecipient, so they're always anonymous and never remindable.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; surveyId: string }> }
) {
  try {
    const { eventId, surveyId } = await params

    const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[POST Survey Public Link]',
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
        { error: 'Add at least one question before creating a public link' },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const regenerate: boolean = !!body?.regenerate

    let publicToken = survey.publicToken
    if (!publicToken || regenerate) {
      publicToken = randomUUID()
      await prisma.survey.update({ where: { id: surveyId }, data: { publicToken } })
    }

    if (survey.status === 'draft') {
      await prisma.survey.update({ where: { id: surveyId }, data: { status: 'active' } })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'
    return NextResponse.json({ url: `${appUrl}/survey/${publicToken}` })
  } catch (error) {
    console.error('Error creating survey public link:', error)
    return NextResponse.json({ error: 'Failed to create public link' }, { status: 500 })
  }
}

// Revoke the public link (old copies stop working).
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; surveyId: string }> }
) {
  try {
    const { eventId, surveyId } = await params

    const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[DELETE Survey Public Link]',
    })

    if (error) return error
    if (!user || !effectiveOrgId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const survey = await prisma.survey.findFirst({ where: { id: surveyId, eventId } })
    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
    }

    await prisma.survey.update({ where: { id: surveyId }, data: { publicToken: null } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error revoking survey public link:', error)
    return NextResponse.json({ error: 'Failed to revoke public link' }, { status: 500 })
  }
}
