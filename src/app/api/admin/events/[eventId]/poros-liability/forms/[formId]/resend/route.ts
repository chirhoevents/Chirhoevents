import { NextRequest, NextResponse } from 'next/server'
import { POROS_FROM, buildParentLiabilityFormEmail } from '@/lib/poros-email'
import { prisma } from '@/lib/prisma'
import { verifyFormsEditAccess } from '@/lib/api-auth'
import { Resend } from '@/lib/resend'
import { randomUUID } from 'crypto'
import { resolveReplyTo } from '@/lib/email-reply-to'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; formId: string }> }
) {
  try {
    const { eventId, formId } = await params

    // Verify user has forms.edit permission and event access
    const { error } = await verifyFormsEditAccess(
      request,
      eventId,
      '[Poros Liability Resend Parent Email]'
    )
    if (error) return error

    // Optional body: { parentEmail } to correct a typo'd parent address before resending
    let overrideParentEmail: string | null = null
    try {
      const body = await request.json()
      if (typeof body?.parentEmail === 'string' && body.parentEmail.trim()) {
        overrideParentEmail = body.parentEmail.trim()
      }
    } catch {
      // No JSON body sent — fine, just resend as-is
    }

    const form = await prisma.liabilityForm.findUnique({
      where: { id: formId },
      include: {
        event: {
          include: {
            settings: true,
            organization: { select: { contactEmail: true } },
          },
        },
      },
    })

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    if (form.eventId !== eventId) {
      return NextResponse.json({ error: 'Form does not belong to this event' }, { status: 400 })
    }

    if (form.completed) {
      return NextResponse.json({ error: 'This form has already been completed' }, { status: 400 })
    }

    if (form.formType !== 'youth_u18') {
      return NextResponse.json({ error: 'This form is not a youth under-18 form' }, { status: 400 })
    }

    const targetParentEmail = overrideParentEmail || form.parentEmail
    if (!targetParentEmail) {
      return NextResponse.json(
        { error: 'No parent email on file. Provide one to send the form.' },
        { status: 400 }
      )
    }

    const tokenExpired = !form.parentToken || (form.parentTokenExpiresAt !== null && form.parentTokenExpiresAt < new Date())
    const parentToken = tokenExpired ? randomUUID() : form.parentToken!
    const parentTokenExpiresAt = tokenExpired
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      : form.parentTokenExpiresAt

    await prisma.liabilityForm.update({
      where: { id: form.id },
      data: {
        parentEmail: targetParentEmail,
        ...(tokenExpired ? { parentToken, parentTokenExpiresAt } : {}),
      },
    })

    // Keep the group roster's parent email in sync, if this belongs to a group participant
    if (form.participantId) {
      await prisma.participant.update({
        where: { id: form.participantId },
        data: { parentEmail: targetParentEmail },
      }).catch(() => {})
    }

    const parentLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'}/poros/parent/${parentToken}`
    const replyToAddr = resolveReplyTo(form.event.settings, form.event.organization)

    const { subject, html } = buildParentLiabilityFormEmail({
      firstName: form.participantFirstName,
      lastName: form.participantLastName,
      eventName: form.event.name,
      parentLink,
      expiresAt: parentTokenExpiresAt,
    })

    await resend.emails.send({
      from: POROS_FROM,
      reply_to: replyToAddr,
      to: targetParentEmail,
      subject,
      html,
    })

    return NextResponse.json({
      success: true,
      message: `Reminder sent to parent (${targetParentEmail})`,
      parentEmail: targetParentEmail,
    })
  } catch (error) {
    console.error('Error resending parent email:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}
