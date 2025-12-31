import { requireAdmin } from '@/lib/auth-utils'
import { getEffectiveOrgId, getImpersonationDetails } from '@/lib/get-effective-org'
import ReportsClient from '../events/[eventId]/reports/ReportsClient'

export default async function AllReportsPage() {
  const user = await requireAdmin()
  const organizationId = await getEffectiveOrgId(user)
  const impersonation = await getImpersonationDetails(user)
  const orgName = impersonation.isImpersonating ? impersonation.impersonatedOrgName : user.organization.name

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">
          All Events Reports
        </h1>
        <p className="text-[#6B7280]">
          Comprehensive reports and analytics across all events for{' '}
          {orgName}
        </p>
      </div>

      <ReportsClient
        eventId="all"
        eventName="All Events"
        organizationId={organizationId}
        startDate=""
        endDate=""
      />
    </div>
  )
}
