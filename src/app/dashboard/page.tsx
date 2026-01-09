'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

/**
 * Smart Dashboard Redirect
 * Routes users to the correct dashboard based on their role.
 * Uses Next.js router for client-side navigation (avoids Clerk reinitialization).
 */
export default function DashboardRedirect() {
  const router = useRouter()
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('Checking authentication...')
  const hasRedirected = useRef(false)

  useEffect(() => {
    // Prevent multiple redirects
    if (hasRedirected.current) return
    if (!isLoaded) return

    // NOTE: We intentionally do NOT check isSignedIn here early!
    // In production, isSignedIn can be false during hydration even when
    // the user IS signed in. Checking it too early causes infinite redirect loops.
    // Instead, we rely on getToken() with retries which properly waits for
    // the session to be established.

    const redirectBasedOnRole = async () => {
      try {
        setStatus('Getting authentication token...')

        // Get token - may need to wait for it after page reload (Clerk still initializing)
        let token = await getToken()
        let attempts = 0
        const maxAttempts = 5

        // Keep trying with increasing delays until we get a token
        while (!token && attempts < maxAttempts) {
          attempts++
          const delay = attempts * 500 // 500ms, 1000ms, 1500ms, 2000ms, 2500ms
          setStatus(`Waiting for session (attempt ${attempts}/${maxAttempts})...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          token = await getToken()
        }

        // If still no token after all retries, user is not signed in
        if (!token) {
          console.log('No token after retries, redirecting to sign-in')
          setStatus('Redirecting to sign in...')
          hasRedirected.current = true
          router.replace('/sign-in')
          return
        }

        setStatus('Determining your role...')

        let response = await fetch('/api/user/role', {
          headers: { 'Authorization': `Bearer ${token}` },
        })

        // If we get a 401, wait and retry once (timing issue)
        if (response.status === 401) {
          console.log('Got 401 from /api/user/role, retrying...')
          setStatus('Retrying authentication...')
          await new Promise(resolve => setTimeout(resolve, 1000))
          const retryToken = await getToken()
          response = await fetch('/api/user/role', {
            headers: retryToken ? { 'Authorization': `Bearer ${retryToken}` } : {},
          })
        }

        if (!response.ok) {
          console.log('API response not ok, defaulting to group-leader')
          setStatus('Redirecting to group leader portal...')
          hasRedirected.current = true
          router.replace('/dashboard/group-leader')
          return
        }

        const data = await response.json()
        const role = data.role

        const routes: Record<string, string> = {
          'master_admin': '/dashboard/master-admin',
          'org_admin': '/dashboard/admin',
          'event_manager': '/dashboard/admin',
          'finance_manager': '/dashboard/admin',
          'staff': '/dashboard/admin',
          'poros_coordinator': '/dashboard/admin/poros',
          'salve_coordinator': '/dashboard/admin/salve',
          'rapha_coordinator': '/dashboard/admin/rapha',
        }

        const destination = routes[role] || '/dashboard/group-leader'
        setStatus(`Redirecting to ${role ? role.replace('_', ' ') : 'group leader'} dashboard...`)
        hasRedirected.current = true
        router.replace(destination)
      } catch (err) {
        console.error('Dashboard redirect error:', err)
        setError('Unable to determine your account type.')
        setTimeout(() => {
          hasRedirected.current = true
          router.replace('/dashboard/group-leader')
        }, 1500)
      }
    }

    redirectBasedOnRole()
  }, [isLoaded, getToken, router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1E3A5F] via-[#2A4A6F] to-[#1E3A5F]">
        <div className="text-center">
          <p className="text-white mb-2">{error}</p>
          <p className="text-[#E8DCC8] text-sm">Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1E3A5F] via-[#2A4A6F] to-[#1E3A5F]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-white">{status}</p>
      </div>
    </div>
  )
}
