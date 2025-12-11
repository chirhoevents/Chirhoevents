import { requireAdmin } from '@/lib/auth-utils'
import { Card, CardContent } from '@/components/ui/card'
import { Users } from 'lucide-react'

export default async function RegistrationsPage() {
  const user = await requireAdmin()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">
          Registrations
        </h1>
        <p className="text-[#6B7280]">
          View and manage all registrations
        </p>
      </div>

      <Card className="p-12 text-center bg-white border-[#D1D5DB]">
        <Users className="h-16 w-16 text-[#9C8466] mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-[#1E3A5F] mb-2">
          No Registrations Yet
        </h2>
        <p className="text-[#6B7280] mb-6 max-w-md mx-auto">
          Registrations will appear here once people start signing up for your events.
        </p>
      </Card>
    </div>
  )
}
