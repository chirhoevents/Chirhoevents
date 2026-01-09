import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'

/**
 * Decode JWT payload to extract user ID when cookies aren't available.
 * This is used as a fallback when Clerk's auth() doesn't work due to timing issues
 * with production cookie settings.
 */
export function decodeJwtPayload(token: string): { sub?: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = Buffer.from(parts[1], 'base64').toString('utf-8')
    return JSON.parse(payload)
  } catch {
    return null
  }
}

/**
 * Try to extract Clerk user ID from any __clerk_db_jwt_* or __session_* cookie.
 * This is a workaround for when the publishable key suffix doesn't match
 * the cookies (e.g., after switching from dev to production keys).
 */
export function getClerkUserIdFromCookies(request: NextRequest): string | null {
  const cookieHeader = request.headers.get('cookie')
  if (!cookieHeader) {
    console.log('[getClerkUserIdFromCookies] No cookie header')
    return null
  }

  const cookies = cookieHeader.split(';').map(c => {
    const [name, ...valueParts] = c.trim().split('=')
    return { name, value: valueParts.join('=') }
  })

  // Try __clerk_db_jwt_* cookies first (these contain JWTs with user ID)
  const jwtCookies = cookies.filter(c => c.name.startsWith('__clerk_db_jwt'))
  console.log('[getClerkUserIdFromCookies] Found JWT cookies:', jwtCookies.map(c => c.name))

  for (const cookie of jwtCookies) {
    try {
      const decoded = decodeJwtPayload(cookie.value)
      if (decoded?.sub) {
        console.log('[getClerkUserIdFromCookies] ✅ Found userId in', cookie.name, ':', decoded.sub)
        return decoded.sub
      }
    } catch (e) {
      console.log('[getClerkUserIdFromCookies] Failed to decode', cookie.name)
    }
  }

  // Try __session_* cookies (these might also be JWTs)
  const sessionCookies = cookies.filter(c => c.name.startsWith('__session'))
  console.log('[getClerkUserIdFromCookies] Found session cookies:', sessionCookies.map(c => c.name))

  for (const cookie of sessionCookies) {
    try {
      const decoded = decodeJwtPayload(cookie.value)
      if (decoded?.sub) {
        console.log('[getClerkUserIdFromCookies] ✅ Found userId in', cookie.name, ':', decoded.sub)
        return decoded.sub
      }
    } catch (e) {
      // Session cookies might not be JWTs, that's OK
    }
  }

  console.log('[getClerkUserIdFromCookies] ❌ No userId found in any cookies')
  return null
}

/**
 * Get clerk user ID from either Clerk's auth() cookies or JWT token from Authorization header.
 * This handles the timing issue where cookies may not be available immediately after login
 * in production environments.
 */
export async function getClerkUserIdFromRequest(request: NextRequest): Promise<string | null> {
  // Try to get userId from Clerk's auth (works when cookies are established)
  const authResult = await auth()
  if (authResult.userId) {
    return authResult.userId
  }

  // Fallback 1: try to get userId from Authorization header (JWT token)
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const payload = decodeJwtPayload(token)
    if (payload?.sub) {
      return payload.sub
    }
  }

  // Fallback 2: try to get userId from any Clerk cookies (workaround for key mismatch)
  const cookieUserId = getClerkUserIdFromCookies(request)
  if (cookieUserId) {
    return cookieUserId
  }

  return null
}

/**
 * Extract clerk user ID from Authorization header only (for use with getCurrentUser override).
 * This is used for endpoints that use auth-utils getCurrentUser() which already supports
 * an override parameter.
 */
export function getClerkUserIdFromHeader(request: NextRequest): string | undefined {
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const payload = decodeJwtPayload(token)
    if (payload?.sub) {
      return payload.sub
    }
  }
  return undefined
}
