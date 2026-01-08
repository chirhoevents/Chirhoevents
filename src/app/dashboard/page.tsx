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
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoaded) return

    if (!isSignedIn) {
      window.location.href = '/sign-in'
      return
    }

    const redirectBasedOnRole = async () => {
      try {
        // Get the session token - this should be available immediately after sign-in
        const token = await getToken()

        if (!token) {
          // No token available, default to group leader
          window.location.href = '/dashboard/group-leader'
          return
        }

        // Call the API with the session token in Authorization header
        // The server will decode the JWT to get the user ID
        const response = await fetch('/api/user/role', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          // User might not exist in database yet - default to group leader
          window.location.href = '/dashboard/group-leader'
          return
        }

        const data = await response.json()
        const role = data.role

        // Route based on role
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

        window.location.href = routes[role] || '/dashboard/group-leader'
      } catch (err) {
        console.error('Error determining user role:', err)
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
