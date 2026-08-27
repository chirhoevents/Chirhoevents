import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// Fix #14: Route pattern → rate limit config
const RATE_LIMIT_RULES: Array<{ pattern: RegExp; configKey: keyof typeof RATE_LIMITS }> = [
  { pattern: /^\/api\/registration\//, configKey: 'registration' },
  { pattern: /^\/api\/group-leader\/payments\//, configKey: 'payment' },
  { pattern: /^\/api\/admin\/virtual-terminal\//, configKey: 'payment' },
  { pattern: /^\/api\/invoices\//, configKey: 'payment' },
  { pattern: /^\/api\/events\//, configKey: 'publicLookup' },
  { pattern: /^\/api\/auth\//, configKey: 'auth' },
  { pattern: /^\/sign-in/, configKey: 'auth' },
  { pattern: /^\/sign-up/, configKey: 'auth' },
]

function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

const isPublicRoute = createRouteMatcher([
  '/',
  '/demo(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/about(.*)',
  '/features(.*)',
  '/docs(.*)',
  '/support(.*)',
  '/get-started(.*)',
  '/events(.*)',
  '/poros(.*)',
  '/registration(.*)',
  '/privacy(.*)',
  '/terms(.*)',
  '/cookies(.*)',
  '/invite(.*)',
  '/pay(.*)',  // Public invoice payment pages
  '/portal(.*)',  // All portal routes (salve, rapha, youth-group) - they handle their own auth
  '/vendor-dashboard(.*)',  // Vendor dashboard - uses access code auth
  '/dashboard(.*)',  // All dashboard routes - they handle their own auth
  '/api/poros(.*)',  // Poros participant APIs - public, endpoints handle their own auth
  '/api/user/role',  // Needed by dashboard redirect page
  '/api/master-admin(.*)',  // Master admin APIs - handle their own auth
  '/api/admin(.*)',  // Admin APIs - handle their own auth
  '/api/group-leader(.*)',  // Group leader APIs - handle their own auth
  '/api/registration(.*)',
  '/api/liability(.*)',
  '/api/portal(.*)',  // Portal APIs - handle their own auth
  '/api/vendor(.*)',  // Vendor portal APIs - use access code auth
  '/api/webhooks(.*)',
  '/api/events(.*)',
  '/api/invites(.*)',
  '/api/invoices(.*)',  // Public invoice APIs for payment page
  '/api/stripe(.*)',  // Stripe APIs - handle their own auth
  '/api/onboarding-requests(.*)',  // Public onboarding form submission
  '/api/queue(.*)',  // Queue APIs - must be public for registration flow
])

export default clerkMiddleware((auth, request) => {
  const { pathname } = request.nextUrl

  // Fix #14: Apply rate limiting before any other logic
  const matchedRule = RATE_LIMIT_RULES.find(r => r.pattern.test(pathname))
  if (matchedRule) {
    const ip = getClientIp(request)
    const key = `${matchedRule.configKey}:${ip}`
    const config = RATE_LIMITS[matchedRule.configKey]
    const result = checkRateLimit(key, config)

    if (!result.allowed) {
      const retryAfterSecs = Math.ceil((result.resetAt - Date.now()) / 1000)
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfterSecs.toString(),
            'X-RateLimit-Limit': config.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil(result.resetAt / 1000).toString(),
          },
        }
      )
    }
  }

  // Handle Clerk verification redirects for invite pages
  // Clerk appends /verify-email-address, /continue, etc. to the invite URL
  // Redirect these back to the base invite page
  const inviteVerifyMatch = pathname.match(/^\/invite\/([^/]+)\/.+$/)
  if (inviteVerifyMatch) {
    const inviteId = inviteVerifyMatch[1]
    const url = request.nextUrl.clone()
    url.pathname = `/invite/${inviteId}`
    return NextResponse.redirect(url)
  }

  if (!isPublicRoute(request)) {
    auth().protect()
  }
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
