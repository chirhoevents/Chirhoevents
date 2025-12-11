import { requireAdmin } from '@/lib/auth-utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Plus } from 'lucide-react'
import Link from 'next/link'

export default async function EventsPage() {
  const user = await requireAdmin()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">
            Events
          </h1>
          <p className="text-[#6B7280]">
            Manage all events for {user.organization.name}
          </p>
        </div>
        <Link href="/dashboard/admin/events/new">
          <Button className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white">
            <Plus className="h-4 w-4 mr-2" />
            Create New Event
          </Button>
        </Link>
      </div>

      <Card className="p-12 text-center bg-white border-[#D1D5DB]">
        <Calendar className="h-16 w-16 text-[#9C8466] mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-[#1E3A5F] mb-2">
          No Events Yet
        </h2>
        <p className="text-[#6B7280] mb-6 max-w-md mx-auto">
          Create your first event to start accepting registrations and managing your conference.
        </p>
        <Link href="/dashboard/admin/events/new">
          <Button className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white">
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Event
          </Button>
        </Link>
      </Card>
    </div>
  )
}
