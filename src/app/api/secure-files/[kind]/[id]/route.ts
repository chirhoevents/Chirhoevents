import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEventAccess } from '@/lib/api-auth'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'
import { viewableUrl, type SecureFileKind } from '@/lib/r2/private-files'

/**
 * GET /api/secure-files/[kind]/[id]
 *
 * Opens a sensitive file (Safe Environment certificate, letter of good
 * standing) after checking who's asking. Allowed:
 *   - admins of the organization that owns the event (and master admins)
 *   - the group leader whose group the file belongs to
 * The response redirects to a link that works for a few minutes; clicking
 * "View" again makes a new one.
 */

interface FileRecord {
  stored: string | null
  eventId: string | null
  groupRegistrationId: string | null
}

async function findFile(kind: SecureFileKind, id: string): Promise<FileRecord | null> {
  switch (kind) {
    case 'safe-env-cert': {
      const cert = await prisma.safeEnvironmentCertificate.findUnique({
        where: { id },
        select: {
          fileUrl: true,
          participant: { select: { groupRegistrationId: true, groupRegistration: { select: { eventId: true } } } },
        },
      })
      if (!cert) return null
      return {
        stored: cert.fileUrl,
        eventId: cert.participant.groupRegistration.eventId,
        groupRegistrationId: cert.participant.groupRegistrationId,
      }
    }
    case 'participant-cert': {
      const participant = await prisma.participant.findUnique({
        where: { id },
        select: { safeEnvironmentCertUrl: true, groupRegistrationId: true, groupRegistration: { select: { eventId: true } } },
      })
      if (!participant) return null
      return {
        stored: participant.safeEnvironmentCertUrl,
        eventId: participant.groupRegistration.eventId,
        groupRegistrationId: participant.groupRegistrationId,
      }
    }
    case 'letter': {
      const letter = await prisma.letterOfGoodStanding.findUnique({
        where: { id },
        select: { fileUrl: true, eventId: true, participant: { select: { groupRegistrationId: true } } },
      })
      if (!letter) return null
      return {
        stored: letter.fileUrl,
        eventId: letter.eventId,
        groupRegistrationId: letter.participant?.groupRegistrationId ?? null,
      }
    }
    case 'staff-cert': {
      const staff = await prisma.staffRegistration.findUnique({
        where: { id },
        select: { safeEnvironmentCertUrl: true, eventId: true },
      })
      if (!staff) return null
      return { stored: staff.safeEnvironmentCertUrl, eventId: staff.eventId, groupRegistrationId: null }
    }
    case 'vendor-cert': {
      const vendor = await prisma.vendorRegistration.findUnique({
        where: { id },
        select: { safeEnvironmentCertUrl: true, eventId: true },
      })
      if (!vendor) return null
      return { stored: vendor.safeEnvironmentCertUrl, eventId: vendor.eventId, groupRegistrationId: null }
    }
  }
}

const KINDS: SecureFileKind[] = ['safe-env-cert', 'participant-cert', 'letter', 'staff-cert', 'vendor-cert']
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function notFound() {
  return new NextResponse('File not found', { status: 404, headers: { 'Cache-Control': 'no-store' } })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kind: string; id: string }> }
) {
  const { kind, id } = await params
  if (!KINDS.includes(kind as SecureFileKind) || !UUID_RE.test(id)) return notFound()

  try {
    const file = await findFile(kind as SecureFileKind, id)
    // Same response whether the record is missing or has no file, so IDs
    // can't be probed
    if (!file?.stored || !file.eventId) return notFound()

    let allowed = false

    // The group leader who owns this group
    if (file.groupRegistrationId) {
      const clerkUserId = await getClerkUserIdFromRequest(request)
      if (clerkUserId) {
        const ownGroup = await prisma.groupRegistration.findFirst({
          where: { id: file.groupRegistrationId, clerkUserId },
          select: { id: true },
        })
        allowed = !!ownGroup
      }
    }

    // Otherwise, admins of the organization that owns the event
    if (!allowed) {
      const { error } = await verifyEventAccess(request, file.eventId, {
        requireAdmin: true,
        logPrefix: '[secure-files]',
      })
      if (error) return error
    }

    const url = await viewableUrl(file.stored)
    return NextResponse.redirect(url, {
      status: 302,
      headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
    })
  } catch (error) {
    console.error('[secure-files] Failed to open file:', error)
    return new NextResponse('Could not open this file. Please try again.', { status: 500 })
  }
}
