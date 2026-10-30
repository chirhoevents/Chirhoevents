import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from '@/lib/resend'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'
import { canAccessOrganization } from '@/lib/auth-utils'
import { buildGroupUpdateEmailChanges, sendGroupUpdateEmail } from '@/lib/group-update-email'

const resend = new Resend(process.env.RESEND_API_KEY!)

/**
 * Email the group leader about an update that was already saved (an entry in
 * the registration's Updates tab), e.g. when the admin forgot to tick
 * "Email the group leader" or the original email didn't go out.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: registrationId } = await params
    const userId = await getClerkUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findFirst({
      where: { clerkUserId: userId },
      include: { organization: true },
    })

    if (!user || (user.role !== 'org_admin' && user.role !== 'master_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { editId } = await request.json()
    if (!editId || typeof editId !== 'string') {
      return NextResponse.json({ error: 'editId is required' }, { status: 400 })
    }

    const registration = await prisma.groupRegistration.findUnique({
      where: { id: registrationId },
      include: {
        event: {
          include: {
            organization: true,
            settings: true,
          },
        },
      },
    })

    if (!registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    }

    // Cast user to any since Prisma types differ slightly from AuthUser
    if (!canAccessOrganization(user as any, registration.organizationId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const edit = await prisma.registrationEdit.findFirst({
      where: { id: editId, registrationId, registrationType: 'group' },
    })

    if (!edit) {
      return NextResponse.json({ error: 'Update not found' }, { status: 404 })
    }

    const changes = buildGroupUpdateEmailChanges({
      changesMade: edit.changesMade as Record<string, unknown> | null,
      oldTotal: edit.oldTotal !== null ? Number(edit.oldTotal) : null,
      newTotal: edit.newTotal !== null ? Number(edit.newTotal) : null,
    })

    if (changes.length === 0) {
      return NextResponse.json(
        { error: 'This update has no changes the group leader is notified about' },
        { status: 400 }
      )
    }

    if (!registration.groupLeaderEmail) {
      return NextResponse.json({ error: 'No group leader email on file' }, { status: 400 })
    }

    await sendGroupUpdateEmail(resend, {
      to: registration.groupLeaderEmail,
      groupLeaderName: registration.groupLeaderName,
      event: registration.event,
      changes,
      adminNotes: edit.adminNotes,
    })

    await prisma.registrationEdit.update({
      where: { id: edit.id },
      data: { emailSent: true },
    })

    return NextResponse.json({ success: true, sentTo: registration.groupLeaderEmail })
  } catch (error) {
    console.error('Error sending group update email:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send email' },
      { status: 500 }
    )
  }
}
