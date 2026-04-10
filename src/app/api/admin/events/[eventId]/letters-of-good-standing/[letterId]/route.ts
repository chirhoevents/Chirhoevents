import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyFormsEditAccess } from '@/lib/api-auth'

// PUT /api/admin/events/[eventId]/letters-of-good-standing/[letterId]
// Body: { status: 'verified' | 'rejected', rejection_reason?: string }
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; letterId: string }> }
) {
  try {
    const { eventId, letterId } = await params

    const { error, user } = await verifyFormsEditAccess(
      request,
      eventId,
      '[LetterOfGoodStanding PUT]'
    )
    if (error) return error

    const body = await request.json()
    const { status, rejection_reason } = body as {
      status: string
      rejection_reason?: string
    }

    if (status !== 'verified' && status !== 'rejected') {
      return NextResponse.json(
        { error: 'status must be "verified" or "rejected"' },
        { status: 400 }
      )
    }
    if (status === 'rejected' && !rejection_reason?.trim()) {
      return NextResponse.json(
        { error: 'rejection_reason is required when rejecting' },
        { status: 400 }
      )
    }

    const letter = await prisma.letterOfGoodStanding.findUnique({
      where: { id: letterId },
      select: { id: true, eventId: true, status: true },
    })
    if (!letter || letter.eventId !== eventId) {
      return NextResponse.json({ error: 'Letter not found' }, { status: 404 })
    }

    const updated = await prisma.letterOfGoodStanding.update({
      where: { id: letterId },
      data: {
        status,
        verifiedAt: status === 'verified' ? new Date() : null,
        verifiedByUserId: status === 'verified' ? user!.id : null,
        rejectionReason: status === 'rejected' ? rejection_reason!.trim() : null,
      },
      select: {
        id: true,
        status: true,
        verifiedAt: true,
        rejectionReason: true,
        verifiedBy: { select: { firstName: true, lastName: true } },
      },
    })

    return NextResponse.json({ letter: updated })
  } catch (err) {
    console.error('[LetterOfGoodStanding PUT] error:', err)
    return NextResponse.json({ error: 'Failed to update letter' }, { status: 500 })
  }
}
