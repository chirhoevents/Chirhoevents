import Link from 'next/link'
import type { ReactNode } from 'react'

/** Frame for public Lux pages: the parish's name and logo, then the content */
export default function LuxPublicShell({ organizationName, logoUrl, parishSlug, children }: {
  organizationName: string
  logoUrl?: string | null
  parishSlug?: string | null
  children: ReactNode
}) {
  const brand = (
    <span className="flex items-center gap-3">
      {logoUrl && <img src={logoUrl} alt="" className="h-10 w-10 rounded-lg object-contain bg-white border border-gray-100" />}
      <span className="font-semibold text-[#1E3A5F] text-lg" style={{ fontFamily: 'Georgia, serif' }}>{organizationName}</span>
    </span>
  )
  return (
    <div className="min-h-screen bg-[#FAF8F3] flex flex-col">
      <header className="bg-white border-b border-[#E8E2D4]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {parishSlug ? <Link href={`/lux/${parishSlug}`}>{brand}</Link> : brand}
          {parishSlug && (
            <Link href={`/lux/${parishSlug}`} className="text-sm text-[#9C8466] hover:text-[#1E3A5F]">All events &amp; programs</Link>
          )}
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10">{children}</main>
      <footer className="py-6 text-center text-xs text-gray-500">
        <span style={{ color: '#C8A24A' }}>&#9728;</span> Registration by Lux · <Link href="/" className="underline">ChiRho Events</Link>
      </footer>
    </div>
  )
}
