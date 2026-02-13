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
      logPrefix: '[GET Event Vendors]',
    })

    if (error) return error
    if (!user || !effectiveOrgId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    // Fetch vendor registrations
    const vendors = await prisma.vendorRegistration.findMany({
      where: { eventId },
      include: {
        _count: {
          select: {
            boothStaff: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Fetch custom question answers for all vendor registrations
    const vendorIds = vendors.map((v) => v.id)
    const customAnswers = vendorIds.length > 0
      ? await prisma.customRegistrationAnswer.findMany({
          where: {
            registrationId: { in: vendorIds },
            registrationType: 'vendor',
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

    // Attach answers to vendor records
    const vendorsWithAnswers = vendors.map((v) => ({
      ...v,
      customAnswers: (answersByRegistration[v.id] || []).map((a) => ({
        questionText: a.question.questionText,
        answerText: a.answerText,
      })),
    }))

    return NextResponse.json({ vendors: vendorsWithAnswers })
  } catch (error) {
    console.error('Error fetching vendors:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vendor registrations' },
      { status: 500 }
    )
  }
}
