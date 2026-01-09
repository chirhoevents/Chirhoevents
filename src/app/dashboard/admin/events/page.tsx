'use client'

import EventsListClient from './EventsListClient'

// NOTE: Auth is handled by the layout with proper retry logic.
// Server Components using requireAdmin() cause redirect loops in production.
export default function EventsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">Events</h1>
          <p className="text-[#6B7280]">
            Manage all events for your organization
          </p>
        </div>
      </div>

      <EventsListClient />
    </div>
  )
}
