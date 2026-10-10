import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { clientIp, luxAudit } from '@/lib/lux/access'
import { findLuxOrgBySlug } from '@/lib/lux/public-org'
import { createMagicLink, magicLinkUrl, REQUESTED_LINK_MINUTES } from '@/lib/lux/family-session'
import { appUrl, familyLinkEmail, sendLuxEmail } from '@/lib/lux/email'

const PER_IP_PER_HOUR = 10
const PER_FAMILY_PER_HOUR = 3
const MIN_RESPONSE_MS = 900

const MESSAGE = 'If that email is on file with the parish, we just sent it a link to your family page. It expires in 30 minutes.'

/**
 * POST /api/lux/public/family/link  { slug, email }
 *
 * A returning family asks for a sign-in link. The answer (and how long it
 * takes) is the same whether or not the email is on file, so this can't be
 * used to find out who's registered. Limited per network address and per
 * family, counted in the database so it holds across server instances.
 */
export async function POST(request: NextRequest) {
  const started = Date.now()
  const ip = clientIp(request)
  const respond = async (status = 200, body: Record<string, unknown> = { success: true, message: MESSAGE }) => {
    const wait = MIN_RESPONSE_MS + Math.floor(Math.random() * 300) - (Date.now() - started)
    if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait))
    return NextResponse.json(body, { status })
  }

  const { slug, email } = await request.json().catch(() => ({}))
  if (typeof slug !== 'string' || typeof email !== 'string' || !email.includes('@') || email.length > 255) {
    return respond(400, { error: 'Please enter the email address you registered with.' })
  }
  const org = await findLuxOrgBySlug(slug)
  if (!org) return respond(404, { error: 'Not found' })

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const recentFromIp = await prisma.luxAuditLog.count({
    where: { action: 'family_link.requested', ip, createdAt: { gte: hourAgo } },
  })
  await luxAudit({ organizationId: org.id, action: 'family_link.requested', ip })
  if (recentFromIp >= PER_IP_PER_HOUR) {
    return respond(429, { error: 'Too many requests. Please wait a while and try again.' })
  }

  const household = await prisma.luxHousehold.findUnique({
    where: { lux_household_org_email: { organizationId: org.id, emailNormalized: email.trim().toLowerCase() } },
    select: { id: true, email: true, guardian1FirstName: true, guardian1LastName: true },
  })
  if (household) {
    const recentLinks = await prisma.luxMagicLink.count({ where: { householdId: household.id, createdAt: { gte: hourAgo } } })
    if (recentLinks < PER_FAMILY_PER_HOUR) {
      const token = await createMagicLink({ organizationId: org.id, householdId: household.id, minutes: REQUESTED_LINK_MINUTES, ip })
      const message = familyLinkEmail({
        organizationName: org.name,
        guardianFirstName: household.guardian1FirstName,
        link: magicLinkUrl(appUrl(), token),
        expiresMinutes: REQUESTED_LINK_MINUTES,
      })
      await sendLuxEmail({
        organizationId: org.id,
        organizationName: org.name,
        to: household.email,
        recipientName: `${household.guardian1FirstName} ${household.guardian1LastName}`,
        replyTo: org.contactEmail,
        emailType: 'lux_family_link',
        redactFromLog: true,
        ...message,
      })
    }
  }
  return respond()
}
