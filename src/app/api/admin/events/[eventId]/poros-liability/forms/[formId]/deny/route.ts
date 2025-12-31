import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; formId: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const organizationId = await getEffectiveOrgId(user)

    const { eventId, formId } = await Promise.resolve(params)
    const body = await request.json()
    const { reason } = body

    if (!reason) {
      return NextResponse.json(
        { error: 'Reason is required for denial' },
        { status: 400 }
      )
    }

    // Verify form belongs to this event and organization
    const form = await prisma.liabilityForm.findUnique({
      where: { id: formId },
      include: {
        event: {
          select: { organizationId: true },
        },
      },
    })

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    if (form.eventId !== eventId) {
      return NextResponse.json(
        { error: 'Form does not belong to this event' },
        { status: 400 }
      )
    }

    if (form.event.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Update to denied
    const updated = await prisma.liabilityForm.update({
      where: { id: formId },
      data: {
        formStatus: 'denied',
        approvedByUserId: user.id,
        approvedAt: new Date(),
        deniedReason: reason,
      },
    })

    // TODO: Send denial email with reason to participant/parent

    return NextResponse.json({ success: true, form: updated })
  } catch (error) {
    console.error('Denial error:', error)
    return NextResponse.json(
      { error: 'Failed to deny form' },
      { status: 500 }
    )
  }
}
