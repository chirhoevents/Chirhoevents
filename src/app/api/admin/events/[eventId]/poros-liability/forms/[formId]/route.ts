import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyFormsEditAccess } from '@/lib/api-auth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; formId: string }> }
) {
  try {
    const { eventId, formId } = await params

    // Verify user has forms.edit permission and event access
    const { error } = await verifyFormsEditAccess(
      request,
      eventId,
      '[Poros Liability Delete Form]'
    )
    if (error) return error

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

    await prisma.liabilityForm.delete({ where: { id: formId } })

    // Keep the roster's completed flag in sync if this was a group participant's form
    if (form.participantId) {
      await prisma.participant.update({
        where: { id: form.participantId },
        data: { liabilityFormCompleted: false, liabilityFormUrl: null },
      }).catch(() => {})
    }

    return NextResponse.json({ success: true, message: 'Form deleted. Participant can start over.' })
  } catch (error) {
    console.error('Error deleting form:', error)
    return NextResponse.json(
      { error: 'Failed to delete form' },
      { status: 500 }
    )
  }
}
