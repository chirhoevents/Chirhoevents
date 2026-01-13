import { NextRequest, NextResponse } from 'next/server'
import { extendQueueSession } from '@/lib/queue-utils'
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

    const result = await extendQueueSession(sessionId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      newExpiresAt: result.newExpiresAt,
    })
  } catch (error) {
    console.error('Error extending queue session:', error)
    return NextResponse.json(
      { error: 'Failed to extend session' },
      { status: 500 }
    )
  }
}
