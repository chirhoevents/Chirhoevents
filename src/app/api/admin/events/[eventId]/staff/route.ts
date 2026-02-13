import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEventAccess } from '@/lib/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    // Verify event access
    const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[GET Event Staff]',
    })

    if (error) return error
    if (!user || !effectiveOrgId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    // Fetch staff registrations
    const staff = await prisma.staffRegistration.findMany({
      where: { eventId },
      include: {
        vendorRegistration: {
          select: {
            businessName: true,
          },
        },
        liabilityForm: {
          select: {
            completed: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Fetch custom question answers for all staff registrations
    const staffIds = staff.map((s) => s.id)
    const customAnswers = staffIds.length > 0
      ? await prisma.customRegistrationAnswer.findMany({
          where: {
            registrationId: { in: staffIds },
            registrationType: 'staff',
          },
          include: {
            question: {
              select: {
                id: true,
                questionText: true,
                questionType: true,
                displayOrder: true,
              },
            },
          },
        })
      : []

    // Group answers by registration ID
    const answersByRegistration: Record<string, typeof customAnswers> = {}
    for (const answer of customAnswers) {
      if (!answersByRegistration[answer.registrationId]) {
        answersByRegistration[answer.registrationId] = []
      }
      answersByRegistration[answer.registrationId].push(answer)
    }

    // Attach answers to staff records
    const staffWithAnswers = staff.map((s) => ({
      ...s,
      customAnswers: (answersByRegistration[s.id] || []).map((a) => ({
        questionText: a.question.questionText,
        answerText: a.answerText,
      })),
    }))

    return NextResponse.json({ staff: staffWithAnswers })
  } catch (error) {
    console.error('Error fetching staff:', error)
    return NextResponse.json(
      { error: 'Failed to fetch staff registrations' },
      { status: 500 }
    )
  }
}
