import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin, canAccessOrganization } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import { Resend } from 'resend'
import { generateWaitlistInvitationEmail } from '@/lib/email-templates'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'
import { resolveReplyTo } from '@/lib/email-reply-to'
import crypto from 'crypto'

const resend = new Resend(process.env.RESEND_API_KEY!)

// Generate a secure random token
function generateRegistrationToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

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

    // Optional body: override capacity check with a reason.
    // Body may be empty (backwards compat with existing UI calls that don't POST JSON).
    let override = false
    let overrideReason: string | null = null
    try {
      const body = await request.json()
      override = body?.override === true
      overrideReason = typeof body?.overrideReason === 'string' ? body.overrideReason.trim() : null
    } catch {
      // No JSON body — treat as no override.
    }

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
                contactEmail: true,
              },
            },
            settings: {
              select: {
                contactEmail: true,
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

    // FIX 2.10: Check event capacity before sending invitation.
    // An admin can force-invite past this with { override: true, overrideReason: "..." };
    // the override is recorded on the entry for audit.
    const eventCapacity = await prisma.event.findUnique({
      where: { id: entry.event.id },
      select: { capacityTotal: true, capacityRemaining: true },
    })

    const spotsNeeded = entry.partySize || 1
    const capacityShort =
      eventCapacity !== null &&
      eventCapacity.capacityTotal !== null &&
      eventCapacity.capacityRemaining !== null &&
      eventCapacity.capacityRemaining < spotsNeeded

    if (capacityShort && !override) {
      return NextResponse.json(
        {
          error: `Not enough capacity to invite this waitlist entry. Only ${eventCapacity!.capacityRemaining} spot(s) remaining, but ${spotsNeeded} needed.`,
          capacityRemaining: eventCapacity!.capacityRemaining,
          spotsNeeded,
          canOverride: true,
        },
        { status: 409 }
      )
    }

    if (capacityShort && override && (!overrideReason || overrideReason.length === 0)) {
      return NextResponse.json(
        { error: 'A reason is required when overriding capacity.' },
        { status: 400 }
      )
    }

    // Generate token and set expiration (48 hours from now)
    const registrationToken = generateRegistrationToken()
    const invitationExpires = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours

    // Reserve the seats: atomically decrement event.capacityRemaining so a
    // walk-in can't eat the promised spot while the invitee has the token.
    // If this entry already has a reservation (re-invite / re-send), keep it.
    // The reservation is restored on expiry / move-back-to-pending / delete.
    const trackCapacity =
      eventCapacity !== null &&
      eventCapacity.capacityTotal !== null &&
      eventCapacity.capacityRemaining !== null
    const alreadyReserved = (entry.reservedSpots ?? 0) > 0
    let reservationCreated = false

    if (trackCapacity && !alreadyReserved) {
      if (capacityShort && override) {
        // Override path — decrement unconditionally, honest oversubscription.
        await prisma.$executeRaw`
          UPDATE events
          SET capacity_remaining = capacity_remaining - ${spotsNeeded}
          WHERE id = ${entry.event.id}::uuid
        `
        reservationCreated = true
      } else {
        // Normal path — atomic conditional decrement; a concurrent registration
        // between the soft check above and here could still lose the race.
        const result = await prisma.$executeRaw`
          UPDATE events
          SET capacity_remaining = capacity_remaining - ${spotsNeeded}
          WHERE id = ${entry.event.id}::uuid
            AND capacity_remaining >= ${spotsNeeded}
        `
        if (result === 0) {
          const fresh = await prisma.event.findUnique({
            where: { id: entry.event.id },
            select: { capacityRemaining: true },
          })
          return NextResponse.json(
            {
              error: `Not enough capacity to invite this waitlist entry. Only ${fresh?.capacityRemaining ?? 0} spot(s) remaining, but ${spotsNeeded} needed.`,
              capacityRemaining: fresh?.capacityRemaining ?? 0,
              spotsNeeded,
              canOverride: true,
            },
            { status: 409 }
          )
        }
        reservationCreated = true
      }
    }

    // Update entry status to contacted with token.
    // Only stamp override fields when the override actually mattered — an invite
    // that fit within capacity shouldn't look like a forced one, even if override:true was sent.
    const updatedEntry = await prisma.waitlistEntry.update({
      where: { id: entryId },
      data: {
        status: 'contacted',
        notifiedAt: new Date(),
        registrationToken,
        invitationExpires,
        ...(reservationCreated ? { reservedSpots: spotsNeeded } : {}),
        ...(capacityShort && override
          ? {
              overriddenBy: user.id,
              overriddenAt: new Date(),
              overrideReason,
            }
          : {}),
      },
    })

    if (capacityShort && override) {
      console.log(
        `[Waitlist] Capacity override used: entry=${entryId} by=${user.id} spotsNeeded=${spotsNeeded} remaining=${eventCapacity!.capacityRemaining} reason="${overrideReason}"`
      )
    }

    // Send invitation email with token URL
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'
    const registrationUrl = `${APP_URL}/waitlist/register/${registrationToken}`
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
        from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
        reply_to: resolveReplyTo(entry.event.settings, entry.event.organization),
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
