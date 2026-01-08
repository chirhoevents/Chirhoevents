'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'

/**
 * Smart Dashboard Redirect
 *
 * This page handles routing users to the correct dashboard based on their role.
 * It's the default redirect after sign-in when using Clerk's environment variables.
 */
export default function DashboardRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isLoaded, isSignedIn } = useAuth()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoaded) return

    if (!isSignedIn) {
      router.push('/sign-in')
      return
    }

    // Check for portal parameter in URL (from sign-in redirect)
    const portal = searchParams.get('portal')

    const redirectBasedOnRole = async () => {
      try {
        // First, check user role from the API
        const response = await fetch('/api/user/role')

        if (!response.ok) {
          // User might not exist in database yet - default to group leader
          router.push('/dashboard/group-leader')
          return
        }

        const data = await response.json()
        const role = data.role

        // Route based on role (or portal param if specified)
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
  }, [isLoaded, isSignedIn, router, searchParams])

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
