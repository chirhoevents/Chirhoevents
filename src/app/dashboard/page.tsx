'use client'

import { useEffect, useState } from 'react'
import { useAuth, useUser } from '@clerk/nextjs'

/**
 * Smart Dashboard Redirect
 *
 * This page handles routing users to the correct dashboard based on their role.
 * It's the default redirect after sign-in when using Clerk's environment variables.
 *
 * We use window.location.href for redirects (instead of router.push) to ensure
 * a full page navigation that properly includes Clerk's session cookies.
 */
export default function DashboardRedirect() {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const { user } = useUser()
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [status, setStatus] = useState('Loading...')

  useEffect(() => {
    if (!isLoaded) return

    if (!isSignedIn) {
      window.location.href = '/sign-in'
      return
    }

    const redirectBasedOnRole = async () => {
      try {
        setStatus('Establishing session...')

        // Wait for Clerk session to be fully established by getting a token
        const token = await getToken()

        if (!token) {
          // Session not ready yet, retry after a short delay
          if (retryCount < 10) {
            setTimeout(() => setRetryCount(prev => prev + 1), 300)
            return
          }
          // After retries, default to group leader
          window.location.href = '/dashboard/group-leader'
          return
        }

        setStatus('Checking your account...')

        // Call the API - Clerk cookies should now be established
        const response = await fetch('/api/user/role')

        if (response.status === 401) {
          // Still not authenticated on server, retry
          if (retryCount < 10) {
            setTimeout(() => setRetryCount(prev => prev + 1), 300)
            return
          }
          window.location.href = '/dashboard/group-leader'
          return
        }

        if (!response.ok) {
          // User might not exist in database yet - default to group leader
          window.location.href = '/dashboard/group-leader'
          return
        }

        const data = await response.json()
        const role = data.role

        setStatus('Redirecting to your dashboard...')

        // Route based on role using full page navigation
        // This ensures cookies are properly sent with the request
        let targetUrl = '/dashboard/group-leader'

        switch (role) {
          case 'master_admin':
            targetUrl = '/dashboard/master-admin'
            break
          case 'org_admin':
          case 'event_manager':
          case 'finance_manager':
          case 'staff':
            targetUrl = '/dashboard/admin'
            break
          case 'poros_coordinator':
            targetUrl = '/dashboard/admin/poros'
            break
          case 'salve_coordinator':
            targetUrl = '/dashboard/admin/salve'
            break
          case 'rapha_coordinator':
            targetUrl = '/dashboard/admin/rapha'
            break
        }

        window.location.href = targetUrl
      } catch (err) {
        console.error('Error determining user role:', err)
        setError('Unable to determine your account type. Please try again.')
        // Default to group leader dashboard after error
        setTimeout(() => {
          window.location.href = '/dashboard/group-leader'
        }, 2000)
      }
    }

    redirectBasedOnRole()
  }, [isLoaded, isSignedIn, getToken, retryCount, user])

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
        {retryCount > 0 && (
          <p className="text-[#E8DCC8] text-sm mt-2">Please wait...</p>
        )}
      </div>
    </div>
  )
}
