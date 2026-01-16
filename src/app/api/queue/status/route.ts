import { NextRequest, NextResponse } from 'next/server'
import { getQueueStatus, type QueueRegistrationType } from '@/lib/queue-utils'
import { cookies } from 'next/headers'

const QUEUE_SESSION_COOKIE = 'queue_session_id'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const eventId = searchParams.get('eventId')
    const registrationType = searchParams.get('type') as QueueRegistrationType

    if (!eventId || !registrationType) {
      return NextResponse.json(
        { error: 'Missing eventId or type parameter' },
        { status: 400 }
      )
    }

    if (!['group', 'individual'].includes(registrationType)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be "group" or "individual"' },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    const sessionId = cookieStore.get(QUEUE_SESSION_COOKIE)?.value

    if (!sessionId) {
      return NextResponse.json(
        { error: 'No queue session found' },
        { status: 400 }
      )
    }

    const status = await getQueueStatus(eventId, sessionId, registrationType)

    if (!status) {
      return NextResponse.json(
        { error: 'Not in queue for this event' },
        { status: 404 }
      )
    }

    return NextResponse.json(status)
  } catch (error) {
    console.error('Error getting queue status:', error)
    return NextResponse.json(
      { error: 'Failed to get queue status' },
      { status: 500 }
    )
  }
}
