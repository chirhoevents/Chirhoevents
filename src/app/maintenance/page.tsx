export const metadata = {
  title: 'Down for Maintenance',
  robots: { index: false, follow: false },
}

export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1E3A5F] px-6">
      <div className="max-w-md text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/ChiRho%20Event%20Logos/Chrirho%20Events%20Full%20white%20Logo.png"
          alt="ChiRho Events"
          className="mx-auto mb-10 w-64 max-w-full h-auto"
        />
        <h1 className="text-3xl font-bold text-white mb-4">
          We&apos;ll be right back
        </h1>
        <p className="text-blue-100 mb-2">
          ChiRho Events is temporarily offline for scheduled maintenance.
        </p>
        <p className="text-blue-100">
          Your information is safe. Please check back soon.
        </p>
      </div>
    </div>
  )
}
