'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { UserButton, useAuth } from '@clerk/nextjs'
import Link from 'next/link'
import Image from 'next/image'
import { LogOut, Home } from 'lucide-react'
import { useClerk } from '@clerk/nextjs'

/**
 * Simple layout for coordinator pages (Rapha/SALVE)
 * No admin sidebar - just a clean header and content area
 */
export default function CoordinatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { signOut } = useClerk()
  const { isLoaded, getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const hasChecked = useRef(false)

  useEffect(() => {
    if (hasChecked.current || !isLoaded) return
    hasChecked.current = true

    const checkAuth = async () => {
      try {
        let token = await getToken()
        let attempts = 0
        const maxAttempts = 5

        // Keep trying with increasing delays until we get a token
        while (!token && attempts < maxAttempts) {
          attempts++
          const delay = attempts * 500
          await new Promise(resolve => setTimeout(resolve, delay))
          token = await getToken()
        }

        if (!token) {
          router.replace('/sign-in')
          return
        }

        // User is authenticated
        setAuthorized(true)
      } catch (error) {
        console.error('Auth check error:', error)
        router.replace('/sign-in')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [isLoaded, router, getToken])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1E3A5F] via-[#2A4A6F] to-[#1E3A5F]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }

  if (!authorized) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      {/* Simple Header */}
      <header className="bg-[#1E3A5F] text-white py-3 px-4 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center hover:opacity-90 transition-opacity">
              <Image
                src="/light-logo-horizontal.png"
                alt="ChiRho Events"
                width={140}
                height={35}
                className="h-8 w-auto object-contain"
              />
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-white/80 hover:text-white text-sm transition-colors"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>
            <div className="flex items-center gap-3">
              <UserButton afterSignOutUrl="/" />
              <button
                onClick={() => signOut()}
                className="text-white/70 hover:text-white text-sm flex items-center gap-1"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="max-w-7xl mx-auto p-4 lg:p-8">
        {children}
      </main>
    </div>
  )
}
