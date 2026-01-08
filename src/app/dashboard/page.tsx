'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useUser } from '@clerk/nextjs'

/**
 * Smart Dashboard Redirect
 *
 * This page handles routing users to the correct dashboard based on their role.
 * It's the default redirect after sign-in when using Clerk's environment variables.
 */
export default function DashboardRedirect() {
  const router = useRouter()
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const { user } = useUser()
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    if (!isLoaded) return

    if (!isSignedIn) {
      router.push('/sign-in')
      return
    }

    const redirectBasedOnRole = async () => {
      try {
        // Wait for Clerk session to be fully established by getting a token
        // This ensures the server-side auth() will also recognize the user
        const token = await getToken()

        if (!token) {
          // Session not ready yet, retry after a short delay
          if (retryCount < 5) {
            setTimeout(() => setRetryCount(prev => prev + 1), 500)
            return
          }
          // After 5 retries, default to group leader
          router.push('/dashboard/group-leader')
          return
        }

        // Now call the API with the token to verify auth is working
        const response = await fetch('/api/user/role', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.status === 401) {
          // Still not authenticated on server, retry
          if (retryCount < 5) {
            setTimeout(() => setRetryCount(prev => prev + 1), 500)
            return
          }
          router.push('/dashboard/group-leader')
          return
        }

        if (!response.ok) {
          // User might not exist in database yet - default to group leader
          router.push('/dashboard/group-leader')
          return
        }

        const data = await response.json()
        const role = data.role

        // Route based on role
        switch (role) {
          case 'master_admin':
            router.push('/dashboard/master-admin')
            break
          case 'org_admin':
          case 'event_manager':
          case 'finance_manager':
          case 'staff':
            router.push('/dashboard/admin')
            break
          case 'poros_coordinator':
            router.push('/dashboard/admin/poros')
            break
          case 'salve_coordinator':
            router.push('/dashboard/admin/salve')
            break
          case 'rapha_coordinator':
            router.push('/dashboard/admin/rapha')
            break
          case 'group_leader':
          default:
            router.push('/dashboard/group-leader')
            break
        }
      } catch (err) {
        console.error('Error determining user role:', err)
        setError('Unable to determine your account type. Please try again.')
        // Default to group leader dashboard after error
        setTimeout(() => {
          router.push('/dashboard/group-leader')
        }, 2000)
      }
    }

    redirectBasedOnRole()
  }, [isLoaded, isSignedIn, router, getToken, retryCount, user])

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
        {retryCount > 0 && (
          <p className="text-[#E8DCC8] text-sm mt-2">Establishing session...</p>
        )}
      </div>
    </div>
  )
}
