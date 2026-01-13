import { NextRequest, NextResponse } from 'next/server'
import { checkRegistrationQueue, type QueueRegistrationType } from '@/lib/queue-utils'
import { cookies } from 'next/headers'

const QUEUE_SESSION_COOKIE = 'queue_session_id'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { eventId, registrationType } = body

    if (!eventId || !registrationType) {
      return NextResponse.json(
        { error: 'Missing eventId or registrationType' },
        { status: 400 }
      )
    }

    if (!['group', 'individual'].includes(registrationType)) {
      return NextResponse.json(
        { error: 'Invalid registrationType. Must be "group" or "individual"' },
        { status: 400 }
      )
    }

    // Get or create session ID from cookie
    const cookieStore = await cookies()
    let sessionId = cookieStore.get(QUEUE_SESSION_COOKIE)?.value

    if (!sessionId) {
      sessionId = crypto.randomUUID()
    }

    // Get user info from headers
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                      request.headers.get('x-real-ip') ||
                      undefined
    const userAgent = request.headers.get('user-agent') || undefined

    const result = await checkRegistrationQueue(
      eventId,
      sessionId,
      registrationType as QueueRegistrationType,
      undefined, // userId - could be populated from Clerk if needed
      ipAddress,
      userAgent
    )

    const response = NextResponse.json(result)

    // Set the session cookie if we created a new one
    if (!cookieStore.get(QUEUE_SESSION_COOKIE)?.value) {
      response.cookies.set(QUEUE_SESSION_COOKIE, sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
      })
    }

    return response
  } catch (error) {
    console.error('Error checking queue:', error)
    return NextResponse.json(
      { error: 'Failed to check queue status' },
      { status: 500 }
    )
  }
}
