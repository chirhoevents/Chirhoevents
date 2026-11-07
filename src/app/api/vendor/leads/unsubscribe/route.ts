import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * POST /api/vendor/leads/unsubscribe  { token }
 *
 * Stops one vendor's follow-up emails to this address. Covers every lead of
 * that vendor that emails the same address, so a group leader who unsubscribes
 * from a vendor stops getting messages about any of their teens.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!checkRateLimit(`vendor-lead-unsub:${ip}`, RATE_LIMITS.publicLookup).allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json().catch(() => null)
    const token = typeof body?.token === 'string' ? body.token.trim() : ''
    if (!UUID_RE.test(token)) return NextResponse.json({ error: 'Invalid link' }, { status: 400 })

    const lead = await prisma.vendorLead.findUnique({
      where: { unsubscribeToken: token },
      include: { vendorRegistration: { select: { businessName: true } } },
    })
    if (!lead) return NextResponse.json({ error: 'This link is no longer valid' }, { status: 404 })

    const target = (lead.isMinor ? lead.contactEmail : lead.email)?.trim()
    const now = new Date()

    if (target) {
      await prisma.vendorLead.updateMany({
        where: {
          vendorRegistrationId: lead.vendorRegistrationId,
          unsubscribedAt: null,
          OR: [
            { isMinor: false, email: { equals: target, mode: 'insensitive' } },
            { isMinor: true, contactEmail: { equals: target, mode: 'insensitive' } },
          ],
        },
        data: { unsubscribedAt: now },
      })
    } else if (!lead.unsubscribedAt) {
      await prisma.vendorLead.update({ where: { id: lead.id }, data: { unsubscribedAt: now } })
    }

    return NextResponse.json({ success: true, businessName: lead.vendorRegistration.businessName })
  } catch (error) {
    console.error('[Vendor Lead Unsubscribe] Error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
