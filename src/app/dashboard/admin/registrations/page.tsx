import { requireAdmin } from '@/lib/auth-utils'
import AllRegistrationsClient from './AllRegistrationsClient'

export default async function RegistrationsPage() {
  await requireAdmin()

  return <AllRegistrationsClient />
}
