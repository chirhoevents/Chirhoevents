import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'
import { logger } from '@/lib/logger'

// One-time fix for youth-u18 liability forms submitted before participantType
// was set on the LiabilityForm record (see youth-u18/initiate and
// youth-u18/complete). Without it, the admin dashboard's "Youth submitted"
// count — which filters LiabilityForm.participantType — silently excludes
// every pre-existing youth-u18 submission, hiding the true youth-to-chaperone
// ratio for groups that registered before this fix shipped.
// REQUIRES: master_admin role
export async function POST(request: NextRequest) {
  try {
    const clerkUserId = await getClerkUserIdFromRequest(request)
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findFirst({
      where: { clerkUserId },
      select: { id: true, role: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'master_admin') {
      return NextResponse.json({ error: 'Forbidden - master_admin access required' }, { status: 403 })
    }

    const result = await prisma.liabilityForm.updateMany({
      where: {
        formType: 'youth_u18',
        participantType: null,
      },
      data: {
        participantType: 'youth_u18',
      },
    })

    logger.info({ userId: user.id, updated: result.count }, 'backfill-liability-form-youth-type: completed')

    return NextResponse.json({
      success: true,
      message: `Backfilled participantType on ${result.count} youth-u18 liability form(s).`,
      updated: result.count,
    })
  } catch (error) {
    logger.error({ error: String(error) }, 'backfill-liability-form-youth-type: unexpected error')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
