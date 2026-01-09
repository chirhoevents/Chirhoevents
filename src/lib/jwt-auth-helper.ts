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

  // Fallback: try to get userId from Authorization header (JWT token)
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const payload = decodeJwtPayload(token)
    if (payload?.sub) {
      return payload.sub
    }
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
