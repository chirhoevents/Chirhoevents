import { NextRequest, NextResponse } from 'next/server'
import { abandonUnpaidCheckout } from '@/lib/abandoned-checkout'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Called by the registration review page when someone who was sent to Stripe
 * comes back without paying (cancelled, or pressed Back) and submits again.
 * Removes the unpaid registration so they don't end up registered twice.
 *
 * The registration id is only ever handed to the person's own browser, and
 * abandonUnpaidCheckout refuses anything that isn't an unpaid card checkout.
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!checkRateLimit(`abandon-checkout:${ip}`, RATE_LIMITS.registration).allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const { registrationId, type } = await request.json()
    if (typeof registrationId !== 'string' || !UUID_RE.test(registrationId)) {
      return NextResponse.json({ error: 'Invalid registration id' }, { status: 400 })
    }
    if (type !== 'group' && type !== 'individual') {
      return NextResponse.json({ error: 'Invalid registration type' }, { status: 400 })
    }

    const result = await abandonUnpaidCheckout(type, registrationId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Abandon checkout error:', error)
    return NextResponse.json({ error: 'Failed to release checkout' }, { status: 500 })
  }
}
