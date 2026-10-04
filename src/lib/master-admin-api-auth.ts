import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'

/**
 * Same check the other master-admin email routes do inline: resolve the Clerk
 * user and require the master_admin role. Returns the user, or a response to
 * send back as-is.
 */
export async function requireMasterAdminApi(
  request: NextRequest
): Promise<{ user: { id: string; email: string } } | { response: NextResponse }> {
  const clerkUserId = await getClerkUserIdFromRequest(request)
  if (!clerkUserId) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const user = await prisma.user.findFirst({
    where: { clerkUserId },
    select: { id: true, email: true, role: true },
  })
  if (!user || user.role !== 'master_admin') {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { user: { id: user.id, email: user.email } }
}

const EMAIL_PATTERN = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/

/**
 * Parse a recipient list from a request body: a string ("a@x.com, b@y.com")
 * or an array. Returns null if empty, malformed, or more than `max`.
 */
export function parseRecipients(value: unknown, max = 10): string[] | null {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[,;\s]+/) : []
  const list = Array.from(
    new Set(raw.map((v) => (typeof v === 'string' ? v.trim().toLowerCase() : '')).filter(Boolean))
  )
  if (list.length === 0 || list.length > max) return null
  return list.every((a) => EMAIL_PATTERN.test(a)) ? list : null
}
