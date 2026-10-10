import Link from 'next/link'

export const metadata = { title: 'Link expired' }

const REASONS: Record<string, string> = {
  used: 'This link was already used. For your family’s privacy, each link works only once.',
  expired: 'This link has expired.',
  invalid: 'This link isn’t valid.',
}

/** Where a used, expired or broken family link lands */
export default async function LinkExpiredPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams
  return (
    <div className="min-h-screen bg-[#FAF8F3] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-[#E8E2D4] p-8 text-center shadow-sm">
        <p className="text-3xl" style={{ color: '#C8A24A' }}>&#9728;</p>
        <h1 className="text-xl font-semibold text-[#1E3A5F] mt-2">Let’s get you a new link</h1>
        <p className="text-gray-600 mt-2">{REASONS[reason ?? ''] ?? REASONS.invalid}</p>
        <p className="text-gray-600 mt-2">Go back to your parish’s registration page and choose <strong>“Email me a link”</strong> to get a fresh one.</p>
        <Link href="/" className="inline-block mt-6 text-sm text-[#9C8466] underline">ChiRho Events home</Link>
      </div>
    </div>
  )
}
