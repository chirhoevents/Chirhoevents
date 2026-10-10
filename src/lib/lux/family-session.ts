/**
 * How families get back to their information without accounts or passwords:
 *
 *  - Magic links: a single-use email link (random 32-byte token, only its
 *    sha256 stored) that signs the family in.
 *  - Family sessions: after opening a link (or registering), the browser
 *    gets an httpOnly cookie holding another random token; again only its
 *    hash is stored. A session can be limited to one order (see
 *    LuxFamilySession.orderId).
 */

import { createHash, randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const FAMILY_COOKIE = 'lux_family'
// Link requested from the parish page
export const REQUESTED_LINK_MINUTES = 30
// Link in a confirmation or reminder email
export const EMAILED_LINK_MINUTES = 7 * 24 * 60
const SESSION_HOURS = 4

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function newToken(): string {
  return randomBytes(32).toString('base64url')
}

// ---------------------------------------------------------------------------
// Magic links
// ---------------------------------------------------------------------------

export async function createMagicLink(params: {
  organizationId: string
  householdId: string
  minutes: number
  ip?: string
}): Promise<string> {
  const token = newToken()
  await prisma.luxMagicLink.create({
    data: {
      organizationId: params.organizationId,
      householdId: params.householdId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + params.minutes * 60 * 1000),
      requestedIp: params.ip ?? null,
    },
  })
  return token
}

/** The URL in emails: it goes through an API route so the cookie can be set */
export function magicLinkUrl(appUrl: string, token: string): string {
  return `${appUrl}/api/lux/public/family/enter?token=${encodeURIComponent(token)}`
}

/**
 * Use up a magic link. Returns the family it belongs to, or why it can't be
 * used. Marking it used is atomic, so the same link can't open two sessions.
 */
export async function consumeMagicLink(token: string): Promise<
  { ok: true; organizationId: string; householdId: string } | { ok: false; reason: 'invalid' | 'expired' | 'used' }
> {
  if (!token || token.length > 200) return { ok: false, reason: 'invalid' }
  const link = await prisma.luxMagicLink.findUnique({ where: { tokenHash: hashToken(token) } })
  if (!link) return { ok: false, reason: 'invalid' }
  if (link.usedAt) return { ok: false, reason: 'used' }
  if (link.expiresAt < new Date()) return { ok: false, reason: 'expired' }
  const claimed = await prisma.luxMagicLink.updateMany({
    where: { id: link.id, usedAt: null },
    data: { usedAt: new Date() },
  })
  if (claimed.count === 0) return { ok: false, reason: 'used' }
  return { ok: true, organizationId: link.organizationId, householdId: link.householdId }
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export interface FamilySession {
  id: string
  organizationId: string
  householdId: string
  // Set = this browser may only upload documents for this one order
  orderId: string | null
}

export async function createFamilySession(params: {
  organizationId: string
  householdId: string
  orderId?: string | null
}): Promise<{ token: string; expiresAt: Date }> {
  const token = newToken()
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000)
  await prisma.luxFamilySession.create({
    data: {
      organizationId: params.organizationId,
      householdId: params.householdId,
      orderId: params.orderId ?? null,
      tokenHash: hashToken(token),
      expiresAt,
    },
  })
  return { token, expiresAt }
}

export function setFamilyCookie(response: NextResponse, token: string, expiresAt: Date) {
  response.cookies.set(FAMILY_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  })
}

export function clearFamilyCookie(response: NextResponse) {
  response.cookies.set(FAMILY_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
}

async function sessionFromToken(token: string | undefined): Promise<FamilySession | null> {
  if (!token || token.length > 200) return null
  const session = await prisma.luxFamilySession.findUnique({ where: { tokenHash: hashToken(token) } })
  if (!session || session.expiresAt < new Date()) return null
  return { id: session.id, organizationId: session.organizationId, householdId: session.householdId, orderId: session.orderId }
}

/** The family session on this request, if any (for an API route) */
export async function getFamilySession(request: NextRequest): Promise<FamilySession | null> {
  return sessionFromToken(request.cookies.get(FAMILY_COOKIE)?.value)
}

/** The family session for a server component (reads the cookie store) */
export async function getFamilySessionFromCookies(): Promise<FamilySession | null> {
  const { cookies } = await import('next/headers')
  const store = await cookies()
  return sessionFromToken(store.get(FAMILY_COOKIE)?.value)
}

/** A full (not order-limited) session for this org, or null */
export function fullSessionFor(session: FamilySession | null, organizationId: string): FamilySession | null {
  return session && session.organizationId === organizationId && !session.orderId ? session : null
}

export async function endFamilySession(request: NextRequest): Promise<void> {
  const token = request.cookies.get(FAMILY_COOKIE)?.value
  if (token) await prisma.luxFamilySession.deleteMany({ where: { tokenHash: hashToken(token) } })
}
