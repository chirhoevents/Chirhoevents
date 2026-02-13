import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEventAccess } from '@/lib/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[GET Custom Questions]',
    })

    if (error) return error
    if (!user || !effectiveOrgId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const appliesTo = searchParams.get('appliesTo')

    const where: Record<string, unknown> = { eventId }
    if (appliesTo) {
      where.appliesTo = { in: [appliesTo, 'all'] }
    }

    const questions = await prisma.customRegistrationQuestion.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
    })

    return NextResponse.json({ questions })
  } catch (error) {
    console.error('Error fetching custom questions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch custom questions' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[POST Custom Question]',
    })

    if (error) return error
    if (!user || !effectiveOrgId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const body = await request.json()
    const { questionText, questionType, options, required, appliesTo, displayOrder } = body

    if (!questionText || !questionType || !appliesTo) {
      return NextResponse.json(
        { error: 'Missing required fields: questionText, questionType, appliesTo' },
        { status: 400 }
      )
    }

    const validTypes = ['text', 'yes_no', 'multiple_choice', 'dropdown']
    if (!validTypes.includes(questionType)) {
      return NextResponse.json(
        { error: `Invalid questionType. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const validAppliesTo = ['group', 'individual', 'both', 'staff', 'vendor', 'all']
    if (!validAppliesTo.includes(appliesTo)) {
      return NextResponse.json(
        { error: `Invalid appliesTo. Must be one of: ${validAppliesTo.join(', ')}` },
        { status: 400 }
      )
    }

    // Get max display order if not provided
    let order = displayOrder
    if (order === undefined || order === null) {
      const maxOrder = await prisma.customRegistrationQuestion.findFirst({
        where: { eventId },
        orderBy: { displayOrder: 'desc' },
        select: { displayOrder: true },
      })
      order = (maxOrder?.displayOrder ?? -1) + 1
    }

    const question = await prisma.customRegistrationQuestion.create({
      data: {
        eventId,
        questionText,
        questionType,
        options: options || null,
        required: required || false,
        appliesTo,
        displayOrder: order,
      },
    })

    return NextResponse.json({ question }, { status: 201 })
  } catch (error) {
    console.error('Error creating custom question:', error)
    return NextResponse.json(
      { error: 'Failed to create custom question' },
      { status: 500 }
    )
  }
}
