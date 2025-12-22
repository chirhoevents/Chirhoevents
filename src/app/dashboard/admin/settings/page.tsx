import { requireAdmin } from '@/lib/auth-utils'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const user = await requireAdmin()

  return <SettingsClient organizationName={user.organization.name} />
}
