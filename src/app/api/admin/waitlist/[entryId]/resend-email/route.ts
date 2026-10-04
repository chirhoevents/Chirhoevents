import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin, canAccessOrganization } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { Resend } from '@/lib/resend'
import { generateWaitlistConfirmationEmail } from '@/lib/email-templates'
import { buildWaitlistInvitationEmailHtml } from '@/lib/waitlist-invitation-email'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'
import { resolveReplyTo } from '@/lib/email-reply-to'
import type { HousingType } from '@/lib/option-capacity'

const resend = new Resend(process.env.RESEND_API_KEY!)

const FRESH_INVITATION_MS = 48 * 60 * 60 * 1000

function describeTimeLeft(expires: Date): string {
  const hours = Math.max(1, Math.round((expires.getTime() - Date.now()) / 3600000))
  return hours >= 48 && hours % 24 === 0
    ? `${hours / 24} days`
    : `${hours} hour${hours === 1 ? '' : 's'}`
}

/**
 * Resend a waitlist email without changing the person's place or held seats.
 *   pending   → "You're on the waitlist" with their current position
 *   contacted → the same invitation link they already have. Pass
 *               { extendExpiry: true } to also give them a fresh 48 hours.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const user = await getCurrentUser(getClerkUserIdFromHeader(request))
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 })
    }

    const { entryId } = await params
    const body = await request.json().catch(() => ({}))
    const extendExpiry = body?.extendExpiry === true

    const entry = await prisma.waitlistEntry.findUnique({
      where: { id: entryId },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            slug: true,
            organizationId: true,
            organization: { select: { name: true, contactEmail: true } },
            settings: { select: { contactEmail: true } },
          },
        },
      },
    })

    if (!entry) {
      return NextResponse.json({ error: 'Waitlist entry not found' }, { status: 404 })
    }
    if (!canAccessOrganization(user, entry.event.organizationId)) {
      return NextResponse.json(
        { error: 'Unauthorized - Entry belongs to different organization' },
        { status: 403 }
      )
    }

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'
    const replyTo = resolveReplyTo(entry.event.settings, entry.event.organization)
    let subject: string
    let html: string
    let newExpiry: Date | null = null

    if (entry.status === 'pending') {
      const ahead = await prisma.waitlistEntry.count({
        where: { eventId: entry.eventId, status: 'pending', createdAt: { lt: entry.createdAt } },
      })
      subject = `You're on the Waitlist - ${entry.event.name}`
      html = generateWaitlistConfirmationEmail({
        name: entry.name,
        eventName: entry.event.name,
        position: ahead + 1,
        partySize: entry.partySize,
        organizationName: entry.event.organization.name,
        eventUrl: `${APP_URL}/events/${entry.event.slug}`,
        supportEmail: replyTo,
      })
    } else if (entry.status === 'contacted') {
      if (!entry.registrationToken) {
        return NextResponse.json(
          { error: 'This invitation has no registration link. Put them back on the waitlist and invite them again.' },
          { status: 409 }
        )
      }

      let expires = entry.invitationExpires
      if (extendExpiry) {
        newExpiry = new Date(Date.now() + FRESH_INVITATION_MS)
        expires = newExpiry
      } else if (expires && expires.getTime() <= Date.now()) {
        return NextResponse.json(
          { error: 'This invitation has expired. Resend it with a fresh 48 hours instead.', expired: true },
          { status: 409 }
        )
      }

      const isGroup = entry.registrationType === 'group'
      const hasReservedMix =
        entry.reservedYouthCount !== null ||
        entry.reservedChaperoneCount !== null ||
        entry.reservedPriestCount !== null
      const offeredPartySize =
        entry.reservedSpots ??
        (isGroup && hasReservedMix
          ? (entry.reservedYouthCount ?? 0) + (entry.reservedChaperoneCount ?? 0) + (entry.reservedPriestCount ?? 0)
          : entry.partySize)

      subject = `A Spot is Available! - ${entry.event.name}`
      html = await buildWaitlistInvitationEmailHtml({
        entry,
        eventName: entry.event.name,
        organizationName: entry.event.organization.name,
        supportEmail: replyTo,
        registrationUrl: `${APP_URL}/waitlist/register/${entry.registrationToken}`,
        expiresIn: expires ? describeTimeLeft(expires) : '48 hours',
        offered: {
          partySize: offeredPartySize,
          youth: isGroup && hasReservedMix ? entry.reservedYouthCount : entry.youthCount,
          chaperones: isGroup && hasReservedMix ? entry.reservedChaperoneCount : entry.chaperoneCount,
          priests: isGroup && hasReservedMix ? entry.reservedPriestCount : entry.priestCount,
          housingType: (entry.reservedHousingType as HousingType | null) ?? null,
          dayPassOptionId: entry.reservedDayPassOptionId ?? null,
        },
      })
    } else {
      return NextResponse.json(
        { error: `There's no waitlist email to resend for a ${entry.status} entry.` },
        { status: 400 }
      )
    }

    const { error } = await resend.emails.send({
      from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
      reply_to: replyTo,
      to: entry.email,
      subject,
      html,
    })
    if (error) {
      console.error('[Waitlist] Resend email failed:', error)
      return NextResponse.json({ error: 'The email failed to send. Please try again.' }, { status: 502 })
    }

    // Only push the deadline out once they actually have the email.
    if (newExpiry) {
      await prisma.waitlistEntry.update({
        where: { id: entry.id },
        data: { invitationExpires: newExpiry },
      })
    }

    return NextResponse.json({
      success: true,
      sentTo: entry.email,
      invitationExpires: newExpiry ?? entry.invitationExpires,
    })
  } catch (error) {
    console.error('Error resending waitlist email:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
