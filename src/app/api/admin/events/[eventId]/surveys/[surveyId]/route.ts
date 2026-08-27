import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEventAccess } from '@/lib/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; surveyId: string }> }
) {
  try {
    const { eventId, surveyId } = await params

    const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[GET Survey]',
    })

    if (error) return error
    if (!user || !effectiveOrgId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const survey = await prisma.survey.findFirst({
      where: { id: surveyId, eventId },
      include: {
        questions: { orderBy: { displayOrder: 'asc' } },
        _count: {
          select: {
            recipients: { where: { isTest: false } },
            responses: { where: { OR: [{ recipientId: null }, { recipient: { isTest: false } }] } },
          },
        },
      },
    })

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
    }

    const respondedCount = await prisma.surveyRecipient.count({
      where: { surveyId, respondedAt: { not: null }, isTest: false },
    })

    return NextResponse.json({ survey, respondedCount })
  } catch (error) {
    console.error('Error fetching survey:', error)
    return NextResponse.json({ error: 'Failed to fetch survey' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; surveyId: string }> }
) {
  try {
    const { eventId, surveyId } = await params

    const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[PUT Survey]',
    })

    if (error) return error
    if (!user || !effectiveOrgId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const existing = await prisma.survey.findFirst({ where: { id: surveyId, eventId } })
    if (!existing) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
    }

    const body = await request.json()
    const {
      title,
      description,
      status,
      sendToParticipants,
      sendToGroupLeaders,
      sendToStaff,
      isAnonymous,
      closesAt,
    } = body

    const nextSendToParticipants = sendToParticipants ?? existing.sendToParticipants
    const nextSendToGroupLeaders = sendToGroupLeaders ?? existing.sendToGroupLeaders
    const nextSendToStaff = sendToStaff ?? existing.sendToStaff
    if (!nextSendToParticipants && !nextSendToGroupLeaders && !nextSendToStaff) {
      return NextResponse.json(
        { error: 'At least one audience must be enabled' },
        { status: 400 }
      )
    }

    const data: Record<string, unknown> = {}
    if (title !== undefined) data.title = title.trim()
    if (description !== undefined) data.description = description || null
    if (status !== undefined) data.status = status
    if (sendToParticipants !== undefined) data.sendToParticipants = sendToParticipants
    if (sendToGroupLeaders !== undefined) data.sendToGroupLeaders = sendToGroupLeaders
    if (sendToStaff !== undefined) data.sendToStaff = sendToStaff
    if (isAnonymous !== undefined) data.isAnonymous = isAnonymous
    if (closesAt !== undefined) data.closesAt = closesAt ? new Date(closesAt) : null

    const survey = await prisma.survey.update({ where: { id: surveyId }, data })

    return NextResponse.json({ survey })
  } catch (error) {
    console.error('Error updating survey:', error)
    return NextResponse.json({ error: 'Failed to update survey' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; surveyId: string }> }
) {
  try {
    const { eventId, surveyId } = await params

    const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[DELETE Survey]',
    })

    if (error) return error
    if (!user || !effectiveOrgId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const existing = await prisma.survey.findFirst({ where: { id: surveyId, eventId } })
    if (!existing) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
    }

    // Cascades to questions/recipients/responses/answers.
    await prisma.survey.delete({ where: { id: surveyId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting survey:', error)
    return NextResponse.json({ error: 'Failed to delete survey' }, { status: 500 })
  }
}
