import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyFormsEditAccess } from '@/lib/api-auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; formId: string }> }
) {
  try {
    const { eventId, formId } = await params
    const body = await request.json()
    const { reason } = body

    if (!reason) {
      return NextResponse.json(
        { error: 'Reason is required for denial' },
        { status: 400 }
      )
    }

    // Verify user has forms.edit permission and event access
    const { error, user } = await verifyFormsEditAccess(
      request,
      eventId,
      '[Poros Liability Deny]'
    )
    if (error) return error

    // Verify form belongs to this event
    const form = await prisma.liabilityForm.findUnique({
      where: { id: formId },
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

    // Update to denied
    const updated = await prisma.liabilityForm.update({
      where: { id: formId },
      data: {
        formStatus: 'denied',
        approvedByUserId: user!.id,
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
