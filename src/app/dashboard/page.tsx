'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'

/**
 * Smart Dashboard Redirect
 *
 * This page handles routing users to the correct dashboard based on their role.
 * It's the default redirect after sign-in when using Clerk's environment variables.
 */
export default function DashboardRedirect() {
  console.log('[Dashboard] Component rendering...')

  const { isLoaded, isSignedIn, getToken } = useAuth()
  const [error, setError] = useState<string | null>(null)

  console.log('[Dashboard] Auth state:', { isLoaded, isSignedIn })

  useEffect(() => {
    console.log('[Dashboard] useEffect - isLoaded:', isLoaded, 'isSignedIn:', isSignedIn)

    if (!isLoaded) {
      console.log('[Dashboard] Still loading auth...')
      return
    }

    if (!isSignedIn) {
      console.log('[Dashboard] Not signed in, redirecting to sign-in')
      window.location.href = '/sign-in'
      return
    }

    const redirectBasedOnRole = async () => {
      try {
        console.log('[Dashboard] Getting token...')
        const token = await getToken()
        console.log('[Dashboard] Token received:', token ? 'yes' : 'no')

        if (!token) {
          console.log('[Dashboard] No token, defaulting to group-leader')
          window.location.href = '/dashboard/group-leader'
          return
        }

        console.log('[Dashboard] Calling /api/user/role...')
        const response = await fetch('/api/user/role', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        console.log('[Dashboard] API response status:', response.status)

        if (!response.ok) {
          const errorText = await response.text()
          console.log('[Dashboard] API error:', errorText)
          window.location.href = '/dashboard/group-leader'
          return
        }

        const data = await response.json()
        console.log('[Dashboard] API data:', data)
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

        const targetRoute = routes[role] || '/dashboard/group-leader'
        console.log('[Dashboard] Redirecting to:', targetRoute)
        window.location.href = targetRoute
      } catch (err) {
        console.error('[Dashboard] Error:', err)
        setError('Unable to determine your account type.')
        setTimeout(() => {
          window.location.href = '/dashboard/group-leader'
        }, 1500)
      }
    }

    redirectBasedOnRole()
  }, [isLoaded, isSignedIn, getToken])

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
        <p className="text-white">Redirecting to your dashboard...</p>
      </div>
    </div>
  )
}
