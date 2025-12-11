import { requireAdmin } from '@/lib/auth-utils'
import EventsListClient from './EventsListClient'

export default async function EventsPage() {
  const user = await requireAdmin()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">Events</h1>
          <p className="text-[#6B7280]">
            Manage all events for {user.organization.name}
          </p>
        </div>
      </div>

      <EventsListClient organizationId={user.organizationId} />
    </div>
  )
}
