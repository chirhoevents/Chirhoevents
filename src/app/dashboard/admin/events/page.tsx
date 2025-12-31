import { requireAdmin } from '@/lib/auth-utils'
import { getEffectiveOrgId, getImpersonationDetails } from '@/lib/get-effective-org'
import EventsListClient from './EventsListClient'

export default async function EventsPage() {
  const user = await requireAdmin()
  const organizationId = await getEffectiveOrgId(user)
  const impersonation = await getImpersonationDetails(user)
  const orgName = impersonation.isImpersonating ? impersonation.impersonatedOrgName : user.organization.name

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">Events</h1>
          <p className="text-[#6B7280]">
            Manage all events for {orgName}
          </p>
        </div>
      </div>

      <EventsListClient organizationId={organizationId} />
    </div>
  )
}
