'use client'

import { useAdminContext } from '@/contexts/AdminContext'
import CreateEventClient from './CreateEventClient'
import { Loader2 } from 'lucide-react'

export default function CreateEventPage() {
  const { organizationId } = useAdminContext()

  // Show loading state while context is being populated
  if (!organizationId) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#1E3A5F]" />
      </div>
    )
  }

  return <CreateEventClient organizationId={organizationId} />
}
