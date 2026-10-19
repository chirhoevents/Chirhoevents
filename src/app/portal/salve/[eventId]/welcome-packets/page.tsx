import WelcomePacketsPage from '@/app/dashboard/admin/events/[eventId]/salve/welcome-packets/page'

// The SALVE welcome packet editor inside the check-in portal, so SALVE-only
// staff can use it without the admin dashboard
export default function PortalWelcomePacketsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <WelcomePacketsPage />
    </div>
  )
}
