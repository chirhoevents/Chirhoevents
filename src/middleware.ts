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
  '/api/registration(.*)',
  '/api/liability(.*)',
  '/api/portal/login(.*)',
  '/api/webhooks(.*)',
  '/api/events(.*)',
  '/api/invites(.*)',
])

export default clerkMiddleware((auth, request) => {
  if (!isPublicRoute(request)) {
    auth().protect()
  }
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
