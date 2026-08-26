import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEventAccess } from '@/lib/api-auth'

const VALID_TYPES = ['text', 'yes_no', 'multiple_choice', 'multi_select', 'scale']

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; surveyId: string; questionId: string }> }
) {
  try {
    const { eventId, surveyId, questionId } = await params

    const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[PUT Survey Question]',
    })

    if (error) return error
    if (!user || !effectiveOrgId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const existing = await prisma.surveyQuestion.findFirst({
      where: { id: questionId, surveyId, survey: { eventId } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    const body = await request.json()
    const {
      questionText,
      questionType,
      options,
      scaleMin,
      scaleMax,
      scaleMinLabel,
      scaleMaxLabel,
      required,
      displayOrder,
    } = body

    if (questionType !== undefined && !VALID_TYPES.includes(questionType)) {
      return NextResponse.json(
        { error: `Invalid questionType. Must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    const data: Record<string, unknown> = {}
    if (questionText !== undefined) data.questionText = questionText
    if (questionType !== undefined) data.questionType = questionType
    if (options !== undefined) data.options = options
    if (scaleMin !== undefined) data.scaleMin = scaleMin
    if (scaleMax !== undefined) data.scaleMax = scaleMax
    if (scaleMinLabel !== undefined) data.scaleMinLabel = scaleMinLabel
    if (scaleMaxLabel !== undefined) data.scaleMaxLabel = scaleMaxLabel
    if (required !== undefined) data.required = required
    if (displayOrder !== undefined) data.displayOrder = displayOrder

    const question = await prisma.surveyQuestion.update({
      where: { id: questionId },
      data,
    })

    return NextResponse.json({ question })
  } catch (error) {
    console.error('Error updating survey question:', error)
    return NextResponse.json({ error: 'Failed to update survey question' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; surveyId: string; questionId: string }> }
) {
  try {
    const { eventId, surveyId, questionId } = await params

    const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[DELETE Survey Question]',
    })

    if (error) return error
    if (!user || !effectiveOrgId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const existing = await prisma.surveyQuestion.findFirst({
      where: { id: questionId, surveyId, survey: { eventId } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    await prisma.surveyQuestion.delete({ where: { id: questionId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting survey question:', error)
    return NextResponse.json({ error: 'Failed to delete survey question' }, { status: 500 })
  }
}
