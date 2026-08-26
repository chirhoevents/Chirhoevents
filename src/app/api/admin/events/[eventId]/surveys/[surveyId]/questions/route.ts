import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEventAccess } from '@/lib/api-auth'

const VALID_TYPES = ['text', 'yes_no', 'multiple_choice', 'multi_select', 'scale']

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; surveyId: string }> }
) {
  try {
    const { eventId, surveyId } = await params

    const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[POST Survey Question]',
    })

    if (error) return error
    if (!user || !effectiveOrgId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const survey = await prisma.survey.findFirst({ where: { id: surveyId, eventId } })
    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
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

    if (!questionText || !questionType) {
      return NextResponse.json(
        { error: 'Missing required fields: questionText, questionType' },
        { status: 400 }
      )
    }

    if (!VALID_TYPES.includes(questionType)) {
      return NextResponse.json(
        { error: `Invalid questionType. Must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    if ((questionType === 'multiple_choice' || questionType === 'multi_select') &&
      (!Array.isArray(options) || options.length < 2)) {
      return NextResponse.json(
        { error: 'multiple_choice and multi_select questions need at least 2 options' },
        { status: 400 }
      )
    }

    let order = displayOrder
    if (order === undefined || order === null) {
      const maxOrder = await prisma.surveyQuestion.findFirst({
        where: { surveyId },
        orderBy: { displayOrder: 'desc' },
        select: { displayOrder: true },
      })
      order = (maxOrder?.displayOrder ?? -1) + 1
    }

    const question = await prisma.surveyQuestion.create({
      data: {
        surveyId,
        questionText,
        questionType,
        options: options || null,
        scaleMin: questionType === 'scale' ? (scaleMin ?? 1) : null,
        scaleMax: questionType === 'scale' ? (scaleMax ?? 5) : null,
        scaleMinLabel: questionType === 'scale' ? (scaleMinLabel || null) : null,
        scaleMaxLabel: questionType === 'scale' ? (scaleMaxLabel || null) : null,
        required: required || false,
        displayOrder: order,
      },
    })

    return NextResponse.json({ question }, { status: 201 })
  } catch (error) {
    console.error('Error creating survey question:', error)
    return NextResponse.json({ error: 'Failed to create survey question' }, { status: 500 })
  }
}
