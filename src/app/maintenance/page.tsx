export const metadata = {
  title: 'Down for Maintenance | ChiRho Events',
  robots: { index: false, follow: false },
}

export default function MaintenancePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          We&apos;ll be right back
        </h1>
        <p className="text-gray-600 mb-2">
          ChiRho Events is temporarily offline for maintenance.
        </p>
        <p className="text-gray-600">
          Your information is safe. Please check back soon.
        </p>
      </div>
    </main>
  )
}
