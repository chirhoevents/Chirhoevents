'use client'

import DashboardClient from './DashboardClient'

// NOTE: Auth is handled by the layout with proper retry logic.
// Server Components using requireAdmin() cause redirect loops in production
// because Clerk's auth() can fail during initial session hydration.
export default function AdminDashboardPage() {
  return <DashboardClient />
}
