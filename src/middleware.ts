import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/events(.*)',
  '/poros(.*)',
  '/registration(.*)',
  '/api/registration(.*)',
  '/api/liability(.*)',
  '/api/portal/login(.*)',
  '/api/webhooks(.*)',
  '/api/events(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    const { userId } = await auth()
    if (!userId) {
      return Response.redirect(new URL('/sign-in', request.url))
    }
  }
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
