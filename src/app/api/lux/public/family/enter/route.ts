import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { clientIp, luxAudit } from '@/lib/lux/access'
import { consumeMagicLink, createFamilySession, setFamilyCookie } from '@/lib/lux/family-session'

/**
 * GET /api/lux/public/family/enter?token=...
 * Where family links point: uses up the link, signs the browser in to that
 * family (httpOnly cookie) and sends them to their family page.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') || ''
  const base = request.nextUrl.origin
  const result = await consumeMagicLink(token)

  if (!result.ok) {
    return NextResponse.redirect(`${base}/lux/link-expired?reason=${result.reason}`, { status: 303 })
  }

  const org = await prisma.organization.findUnique({ where: { id: result.organizationId }, select: { publicSlug: true } })
  if (!org?.publicSlug) return NextResponse.redirect(`${base}/lux/link-expired?reason=invalid`, { status: 303 })

  const { token: sessionToken, expiresAt } = await createFamilySession({
    organizationId: result.organizationId,
    householdId: result.householdId,
  })
  await luxAudit({
    organizationId: result.organizationId,
    actorHouseholdId: result.householdId,
    action: 'family_link.used',
    ip: clientIp(request),
  })
  const response = NextResponse.redirect(`${base}/lux/${org.publicSlug}/family`, { status: 303 })
  response.headers.set('Referrer-Policy', 'no-referrer')
  setFamilyCookie(response, sessionToken, expiresAt)
  return response
}
