import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { getOrCreateQueueSettings, updateQueueSettings, type QueueSettings } from '@/lib/queue-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params
  const logPrefix = '[GET /api/admin/events/queue/settings]'

  const { error, user, event } = await verifyEventAccess(request, eventId, { logPrefix })
  if (error) return error

  try {
    const settings = await getOrCreateQueueSettings(eventId)
    return NextResponse.json(settings)
  } catch (err) {
    console.error(`${logPrefix} Error fetching queue settings:`, err)
    return NextResponse.json(
      { error: 'Failed to fetch queue settings' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params
  const logPrefix = '[PUT /api/admin/events/queue/settings]'

  const { error, user, event } = await verifyEventAccess(request, eventId, { logPrefix })
  if (error) return error

  try {
    const body = await request.json()

    // Validate and sanitize input
    const settingsUpdate: Partial<QueueSettings> = {}

    if (typeof body.queueEnabled === 'boolean') {
      settingsUpdate.queueEnabled = body.queueEnabled
    }

    if (typeof body.maxConcurrentGroup === 'number' && body.maxConcurrentGroup >= 1) {
      settingsUpdate.maxConcurrentGroup = Math.min(body.maxConcurrentGroup, 100)
    }

    if (typeof body.maxConcurrentIndividual === 'number' && body.maxConcurrentIndividual >= 1) {
      settingsUpdate.maxConcurrentIndividual = Math.min(body.maxConcurrentIndividual, 500)
    }

    if (typeof body.groupSessionTimeout === 'number' && body.groupSessionTimeout >= 60) {
      settingsUpdate.groupSessionTimeout = Math.min(body.groupSessionTimeout, 3600) // Max 1 hour
    }

    if (typeof body.individualSessionTimeout === 'number' && body.individualSessionTimeout >= 60) {
      settingsUpdate.individualSessionTimeout = Math.min(body.individualSessionTimeout, 3600)
    }

    if (typeof body.allowTimeExtension === 'boolean') {
      settingsUpdate.allowTimeExtension = body.allowTimeExtension
    }

    if (typeof body.extensionDuration === 'number' && body.extensionDuration >= 60) {
      settingsUpdate.extensionDuration = Math.min(body.extensionDuration, 1800) // Max 30 min
    }

    if (body.queueStartTime !== undefined) {
      settingsUpdate.queueStartTime = body.queueStartTime ? new Date(body.queueStartTime) : null
    }

    if (body.queueEndTime !== undefined) {
      settingsUpdate.queueEndTime = body.queueEndTime ? new Date(body.queueEndTime) : null
    }

    if (body.waitingRoomMessage !== undefined) {
      settingsUpdate.waitingRoomMessage = body.waitingRoomMessage || null
    }

    const settings = await updateQueueSettings(eventId, settingsUpdate)

    console.log(`${logPrefix} Queue settings updated for event ${eventId} by ${user?.email}`)

    return NextResponse.json(settings)
  } catch (err) {
    console.error(`${logPrefix} Error updating queue settings:`, err)
    return NextResponse.json(
      { error: 'Failed to update queue settings' },
      { status: 500 }
    )
  }
}
