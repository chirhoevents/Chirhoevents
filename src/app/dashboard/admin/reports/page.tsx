import { requireAdmin } from '@/lib/auth-utils'
import ReportsClient from '../events/[eventId]/reports/ReportsClient'

export default async function AllReportsPage() {
  const user = await requireAdmin()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">
          All Events Reports
        </h1>
        <p className="text-[#6B7280]">
          Comprehensive reports and analytics across all events for{' '}
          {user.organization.name}
        </p>
      </div>

      <ReportsClient
        eventId="all"
        eventName="All Events"
        startDate=""
        endDate=""
      />
    </div>
  )
}
