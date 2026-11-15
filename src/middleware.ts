import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// Fix #14: Route pattern → rate limit config
const RATE_LIMIT_RULES: Array<{ pattern: RegExp; configKey: keyof typeof RATE_LIMITS }> = [
  { pattern: /^\/api\/registration\//, configKey: 'registration' },
  { pattern: /^\/api\/lux\/public\//, configKey: 'publicLookup' },  // Lux family pages (uploads etc.); family links also have their own DB-backed limits
  { pattern: /^\/api\/group-leader\/payments\//, configKey: 'payment' },
  { pattern: /^\/api\/admin\/virtual-terminal\//, configKey: 'payment' },
  { pattern: /^\/api\/invoices\//, configKey: 'payment' },
  { pattern: /^\/api\/events\//, configKey: 'publicLookup' },
  { pattern: /^\/api\/survey\//, configKey: 'publicLookup' },
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
  '/maintenance',
  '/api/maintenance-status',
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
  '/survey(.*)',  // Survey links - anonymous, the token in the link is the access check
  '/portal(.*)',  // All portal routes (salve, rapha, youth-group) - they handle their own auth
  '/vendor-dashboard(.*)',  // Vendor dashboard - uses access code auth
  '/vendor-leads(.*)',  // Vendor lead unsubscribe links - the token in the link is the access check
  '/dashboard(.*)',  // All dashboard routes - they handle their own auth
  '/api/poros(.*)',  // Poros participant APIs - public, endpoints handle their own auth
  '/api/user/role',  // Needed by dashboard redirect page
  '/api/user/last-dashboard',  // Events/Lux switcher - handles its own auth
  '/lux(.*)',  // Public Lux parish pages, family registration and family links
  '/api/lux(.*)',  // Lux APIs - staff routes check auth themselves, /api/lux/public is for families
  '/api/master-admin(.*)',  // Master admin APIs - handle their own auth
  '/api/admin(.*)',  // Admin APIs - handle their own auth
  '/api/group-leader(.*)',  // Group leader APIs - handle their own auth
  '/api/registration(.*)',
  '/api/liability(.*)',
  '/api/secure-files(.*)',  // Sensitive file viewer - checks login and access itself
  '/api/portal(.*)',  // Portal APIs - handle their own auth
  '/api/vendor(.*)',  // Vendor portal APIs - use access code auth
  '/api/webhooks(.*)',
  '/api/events(.*)',
  '/api/survey(.*)',  // Survey load/submit - anonymous, checks the link token itself
  '/api/invites(.*)',
  '/api/invoices(.*)',  // Public invoice APIs for payment page
  '/api/stripe(.*)',  // Stripe APIs - handle their own auth
  '/api/onboarding-requests(.*)',  // Public onboarding form submission
  '/api/queue(.*)',  // Queue APIs - must be public for registration flow
  '/api/cron/release-abandoned-checkouts',  // Vercel Cron (no session) - checks CRON_SECRET itself
])

// Maintenance / safety mode — two ways to turn it on:
//  1. HARD switch: MAINTENANCE_MODE=true in Vercel env vars + redeploy.
//  2. SOFT cover: the "Maintenance Mode" toggle in master-admin settings
//     (stored in the database, takes effect within ~15s, no redeploy).
// Optional MAINTENANCE_ALLOWED_IPS (comma-separated) keeps specific IPs working.
// The soft cover still lets master admins sign in and reach their dashboard
// so the toggle can be turned off again; the hard switch blocks everything.
let softCache = { enabled: false, checkedAt: 0 }

async function isSoftMaintenanceOn(request: Request): Promise<boolean> {
  const now = Date.now()
  if (now - softCache.checkedAt < 15_000) return softCache.enabled
  try {
    const res = await fetch(new URL('/api/maintenance-status', request.url), {
      cache: 'no-store',
      signal: AbortSignal.timeout(2000),
    })
    const data = await res.json()
    softCache = { enabled: data.enabled === true, checkedAt: now }
  } catch {
    // Fail open: if the check fails, don't lock everyone out by accident
    softCache = { enabled: softCache.enabled, checkedAt: now - 10_000 }
  }
  return softCache.enabled
}

const SOFT_MODE_ALLOWED = [
  /^\/maintenance$/,
  /^\/api\/maintenance-status$/,
  /^\/sign-in/,
  /^\/sign-up/,
  /^\/dashboard$/,
  /^\/dashboard\/master-admin/,
  /^\/api\/master-admin/,
  /^\/api\/user\//,
]

async function maintenanceResponse(request: Request, pathname: string): Promise<NextResponse | null> {
  if (pathname === '/maintenance' || pathname === '/api/maintenance-status') return null

  const hard = process.env.MAINTENANCE_MODE === 'true'
  if (!hard) {
    if (SOFT_MODE_ALLOWED.some(r => r.test(pathname))) return null
    if (!(await isSoftMaintenanceOn(request))) return null
  }

  const allowed = (process.env.MAINTENANCE_ALLOWED_IPS || '')
    .split(',')
    .map(ip => ip.trim())
    .filter(Boolean)
  if (allowed.includes(getClientIp(request))) return null

  const headers = { 'Retry-After': '3600', 'X-Robots-Tag': 'noindex' }
  if (pathname.startsWith('/api/')) {
    // 503 so Stripe/webhook senders retry later instead of dropping events
    return NextResponse.json(
      { error: 'The service is temporarily unavailable for maintenance.' },
      { status: 503, headers }
    )
  }
  return NextResponse.rewrite(new URL('/maintenance', request.url), { status: 503, headers })
}

export default clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl

  const maintenance = await maintenanceResponse(request, pathname)
  if (maintenance) return maintenance

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

  // Vercel Cron calls /api/cron/* with no login session, so let it through
  // when it carries CRON_SECRET (Vercel sends it automatically once that env
  // var is set; each cron route checks it again)
  const cronSecret = process.env.CRON_SECRET
  if (
    pathname.startsWith('/api/cron/') &&
    cronSecret &&
    request.headers.get('authorization') === `Bearer ${cronSecret}`
  ) {
    return
  }

  if (!isPublicRoute(request)) {
    auth().protect()
  }
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
