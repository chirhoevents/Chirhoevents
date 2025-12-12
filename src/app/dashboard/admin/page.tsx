import { requireAdmin } from '@/lib/auth-utils'
import DashboardClient from './DashboardClient'

export default async function AdminDashboardPage() {
  const user = await requireAdmin()

  return <DashboardClient userName={user.firstName} />
}
