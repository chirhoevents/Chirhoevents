import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string; formId: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const { eventId, formId } = await Promise.resolve(params)

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

    if (form.event.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Update to approved
    const updated = await prisma.liabilityForm.update({
      where: { id: formId },
      data: {
        formStatus: 'approved',
        approvedByUserId: user.id,
        approvedAt: new Date(),
        deniedReason: null,
      },
    })

    // TODO: Send approval email to participant/parent

    return NextResponse.json({ success: true, form: updated })
  } catch (error) {
    console.error('Approval error:', error)
    return NextResponse.json(
      { error: 'Failed to approve form' },
      { status: 500 }
    )
  }
}
