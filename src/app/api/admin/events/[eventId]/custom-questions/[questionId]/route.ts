import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEventAccess } from '@/lib/api-auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; questionId: string }> }
) {
  try {
    const { eventId, questionId } = await params

    const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[PUT Custom Question]',
    })

    if (error) return error
    if (!user || !effectiveOrgId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const existing = await prisma.customRegistrationQuestion.findFirst({
      where: { id: questionId, eventId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    const body = await request.json()
    const { questionText, questionType, options, required, appliesTo, displayOrder } = body

    const data: Record<string, unknown> = {}
    if (questionText !== undefined) data.questionText = questionText
    if (questionType !== undefined) data.questionType = questionType
    if (options !== undefined) data.options = options
    if (required !== undefined) data.required = required
    if (appliesTo !== undefined) data.appliesTo = appliesTo
    if (displayOrder !== undefined) data.displayOrder = displayOrder

    const question = await prisma.customRegistrationQuestion.update({
      where: { id: questionId },
      data,
    })

    return NextResponse.json({ question })
  } catch (error) {
    console.error('Error updating custom question:', error)
    return NextResponse.json(
      { error: 'Failed to update custom question' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; questionId: string }> }
) {
  try {
    const { eventId, questionId } = await params

    const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[DELETE Custom Question]',
    })

    if (error) return error
    if (!user || !effectiveOrgId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const existing = await prisma.customRegistrationQuestion.findFirst({
      where: { id: questionId, eventId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    await prisma.customRegistrationQuestion.delete({
      where: { id: questionId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting custom question:', error)
    return NextResponse.json(
      { error: 'Failed to delete custom question' },
      { status: 500 }
    )
  }
}
