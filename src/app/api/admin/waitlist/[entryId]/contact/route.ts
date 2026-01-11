import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin, canAccessOrganization } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import { Resend } from 'resend'
import { generateWaitlistInvitationEmail } from '@/lib/email-templates'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    // Try to get userId from JWT token in Authorization header
    const overrideUserId = getClerkUserIdFromHeader(request)
    // Check admin access
    const user = await getCurrentUser(overrideUserId)
    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const organizationId = await getEffectiveOrgId(user as any)

    const { entryId } = await params

    // Fetch waitlist entry with event and organization
    const entry = await prisma.waitlistEntry.findUnique({
      where: { id: entryId },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            slug: true,
            organizationId: true,
            organization: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    })

    if (!entry) {
      return NextResponse.json(
        { error: 'Waitlist entry not found' },
        { status: 404 }
      )
    }

    // Verify event belongs to user's organization
    if (!canAccessOrganization(user, entry.event.organizationId)) {
      return NextResponse.json(
        { error: 'Unauthorized - Entry belongs to different organization' },
        { status: 403 }
      )
    }

    // Update entry status to contacted
    const updatedEntry = await prisma.waitlistEntry.update({
      where: { id: entryId },
      data: {
        status: 'contacted',
        notifiedAt: new Date(),
      },
    })

    // Send invitation email
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'
    const registrationUrl = `${APP_URL}/events/${entry.event.slug}`
    let emailSent = false

    try {
      const emailHtml = generateWaitlistInvitationEmail({
        name: entry.name,
        eventName: entry.event.name,
        partySize: entry.partySize,
        organizationName: entry.event.organization.name,
        registrationUrl,
        expiresIn: '48 hours',
      })

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'hello@chirhoevents.com',
        to: entry.email,
        subject: `A Spot is Available! - ${entry.event.name}`,
        html: emailHtml,
      })

      emailSent = true
      console.log(`[Waitlist] Invitation email sent to ${entry.email} for event ${entry.event.name}`)
    } catch (emailError) {
      console.error('Error sending waitlist invitation email:', emailError)
    }

    return NextResponse.json({
      success: true,
      message: emailSent
        ? 'Invitation email sent successfully'
        : 'Marked as contacted but email failed to send',
      emailSent,
      entry: {
        id: updatedEntry.id,
        name: updatedEntry.name,
        email: updatedEntry.email,
        status: updatedEntry.status,
        notifiedAt: updatedEntry.notifiedAt,
      },
    })
  } catch (error) {
    console.error('Error marking waitlist entry as contacted:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
