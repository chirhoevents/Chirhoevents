import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/',
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
