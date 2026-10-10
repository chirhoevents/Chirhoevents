import { NextRequest } from 'next/server'
import { auth, verifyToken } from '@clerk/nextjs/server'

// How far past its expiry a Clerk session token is still accepted, to absorb
// clock drift between the browser, Clerk and this server. Session tokens only
// live for about a minute, so without this a token fetched just before a slow
// request could be rejected.
const CLOCK_SKEW_MS = 2 * 60 * 1000

/**
 * Verify a Clerk session token (signature, expiry, issuer) and return the
 * Clerk user ID it was issued to, or null if Clerk didn't issue it.
 *
 * The fallbacks below exist because Clerk's auth() sometimes can't see the
 * session right after sign-in. They must never trust a token's contents
 * without verifying it first: an unverified token is just base64 that anyone
 * can write, so trusting its `sub` would let anyone act as any user whose
 * Clerk ID they know.
 */
export async function verifyClerkSessionToken(token: string): Promise<string | null> {
  const secretKey = process.env.CLERK_SECRET_KEY
  const jwtKey = process.env.CLERK_JWT_KEY
  if (!secretKey && !jwtKey) {
    console.error('[verifyClerkSessionToken] CLERK_SECRET_KEY is not set - cannot verify tokens')
    return null
  }

  try {
    // Throws if the signature, algorithm, expiry or format is wrong
    const payload: { sub?: unknown; sid?: unknown } = await verifyToken(token, {
      secretKey,
      jwtKey,
      clockSkewInMs: CLOCK_SKEW_MS,
    })
    // Session tokens carry a session id. Other JWTs signed by the same Clerk
    // instance (e.g. the dev-browser token) don't, and aren't proof of login.
    if (!payload.sid || typeof payload.sub !== 'string' || !payload.sub) return null
    return payload.sub
  } catch (error) {
    const reason = (error as { reason?: string })?.reason || (error as Error)?.message
    console.warn('[verifyClerkSessionToken] Rejected token:', reason)
    return null
  }
}

function bearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  return authHeader.substring(7)
}

/**
 * Try to get the Clerk user ID from any __session* or __clerk_db_jwt* cookie.
 * This is a workaround for when the publishable key suffix doesn't match
 * the cookies (e.g., after switching from dev to production keys). Each
 * cookie is verified before it's trusted.
 */
export async function getClerkUserIdFromCookies(request: NextRequest): Promise<string | null> {
  const cookieHeader = request.headers.get('cookie')
  if (!cookieHeader) return null

  const candidates = cookieHeader
    .split(';')
    .map(c => {
      const [name, ...valueParts] = c.trim().split('=')
      return { name, value: valueParts.join('=') }
    })
    .filter(c => c.value && (c.name.startsWith('__session') || c.name.startsWith('__clerk_db_jwt')))

  for (const cookie of candidates) {
    const userId = await verifyClerkSessionToken(cookie.value)
    if (userId) return userId
  }
  return null
}

/**
 * Get the Clerk user ID from Clerk's auth() session, falling back to a
 * verified token in the Authorization header, then to verified Clerk cookies.
 * The fallbacks handle the timing issue where cookies may not be available
 * immediately after login in production environments.
 */
export async function getClerkUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const authResult = await auth()
  if (authResult.userId) {
    return authResult.userId
  }

  const token = bearerToken(request)
  if (token) {
    const userId = await verifyClerkSessionToken(token)
    if (userId) return userId
  }

  return getClerkUserIdFromCookies(request)
}

/**
 * Get the Clerk user ID from a verified token in the Authorization header
 * (for use with getCurrentUser's override parameter).
 */
export async function getClerkUserIdFromHeader(request: NextRequest): Promise<string | undefined> {
  const token = bearerToken(request)
  if (!token) return undefined
  return (await verifyClerkSessionToken(token)) ?? undefined
}
