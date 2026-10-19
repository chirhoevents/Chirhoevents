import NameTagDesignerPage from '@/app/dashboard/admin/events/[eventId]/salve/name-tags/page'

// The SALVE name tag designer inside the check-in portal, so SALVE-only
// staff can use it without the admin dashboard
export default function PortalNameTagsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <NameTagDesignerPage />
    </div>
  )
}
