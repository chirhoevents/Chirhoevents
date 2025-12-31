import { requireAdmin } from '@/lib/auth-utils'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import CreateEventClient from './CreateEventClient'

export const dynamic = 'force-dynamic'

export default async function CreateEventPage() {
  const user = await requireAdmin()
  const organizationId = await getEffectiveOrgId(user)

  return <CreateEventClient organizationId={organizationId} />
}
