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
      logPrefix: '[GET Surveys]',
    })

    if (error) return error
    if (!user || !effectiveOrgId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const surveys = await prisma.survey.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            questions: true,
            recipients: { where: { isTest: false } },
            responses: { where: { OR: [{ recipientId: null }, { recipient: { isTest: false } }] } },
          },
        },
      },
    })

    return NextResponse.json({ surveys })
  } catch (error) {
    console.error('Error fetching surveys:', error)
    return NextResponse.json({ error: 'Failed to fetch surveys' }, { status: 500 })
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
      logPrefix: '[POST Survey]',
    })

    if (error) return error
    if (!user || !effectiveOrgId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      description,
      sendToParticipants = true,
      sendToGroupLeaders = true,
      sendToStaff = false,
      isAnonymous = false,
      closesAt,
    } = body

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Missing required field: title' }, { status: 400 })
    }

    if (!sendToParticipants && !sendToGroupLeaders && !sendToStaff) {
      return NextResponse.json(
        { error: 'At least one audience must be enabled' },
        { status: 400 }
      )
    }

    const survey = await prisma.survey.create({
      data: {
        eventId,
        title: title.trim(),
        description: description || null,
        sendToParticipants,
        sendToGroupLeaders,
        sendToStaff,
        isAnonymous,
        closesAt: closesAt ? new Date(closesAt) : null,
        createdBy: user.id,
      },
    })

    return NextResponse.json({ survey }, { status: 201 })
  } catch (error) {
    console.error('Error creating survey:', error)
    return NextResponse.json({ error: 'Failed to create survey' }, { status: 500 })
  }
}
