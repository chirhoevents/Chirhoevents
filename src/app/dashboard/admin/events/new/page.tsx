import { requireAdmin } from '@/lib/auth-utils'
import CreateEventClient from './CreateEventClient'

export default async function CreateEventPage() {
  const user = await requireAdmin()

  return <CreateEventClient organizationId={user.organizationId} />
}
