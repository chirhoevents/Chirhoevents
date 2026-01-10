import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

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
  '/dashboard(.*)',  // All dashboard routes - they handle their own auth
  '/api/user/role',  // Needed by dashboard redirect page
  '/api/master-admin(.*)',  // Master admin APIs - handle their own auth
  '/api/admin(.*)',  // Admin APIs - handle their own auth
  '/api/group-leader(.*)',  // Group leader APIs - handle their own auth
  '/api/registration(.*)',
  '/api/liability(.*)',
  '/api/portal(.*)',  // Portal APIs - handle their own auth
  '/api/webhooks(.*)',
  '/api/events(.*)',
  '/api/invites(.*)',
  '/api/invoices(.*)',  // Public invoice APIs for payment page
  '/api/stripe(.*)',  // Stripe APIs - handle their own auth
])

export default clerkMiddleware((auth, request) => {
  if (!isPublicRoute(request)) {
    auth().protect()
  }
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
