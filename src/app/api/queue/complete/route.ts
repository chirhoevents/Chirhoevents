import { NextRequest, NextResponse } from 'next/server'
import { markQueueSessionComplete } from '@/lib/queue-utils'
import { cookies } from 'next/headers'

const QUEUE_SESSION_COOKIE = 'queue_session_id'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get(QUEUE_SESSION_COOKIE)?.value

    if (!sessionId) {
      return NextResponse.json(
        { error: 'No queue session found' },
        { status: 400 }
      )
    }

    await markQueueSessionComplete(sessionId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error completing queue session:', error)
    return NextResponse.json(
      { error: 'Failed to complete session' },
      { status: 500 }
    )
  }
}
