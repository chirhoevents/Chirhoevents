'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import {
  type Permission,
  type UserRole,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canViewPayments,
  canViewFinancial,
  canManageTeam,
  canEditSettings,
  isAdminRole,
  getRoleName,
  getRoleDescription
} from '@/lib/permissions'

interface UserInfo {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  organizationId: string
  organization?: {
    id: string
    name: string
    type: string
  }
}

interface UsePermissionsReturn {
  // User info
  user: UserInfo | null
  userRole: UserRole | null
  loading: boolean
  error: string | null

  // Permission checks
  can: (permission: Permission) => boolean
  canAny: (permissions: Permission[]) => boolean
  canAll: (permissions: Permission[]) => boolean

  // Helper functions
  canViewPayments: () => boolean
  canViewFinancial: () => boolean
  canManageTeam: () => boolean
  canEditSettings: () => boolean
  isAdmin: () => boolean

  // Role info
  getRoleName: () => string
  getRoleDescription: () => string

  // Refresh function
  refresh: () => Promise<void>
}

export function usePermissions(): UsePermissionsReturn {
  const { getToken, isLoaded } = useAuth()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUserInfo = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Get auth token for the request
      const token = await getToken()
      const headers: HeadersInit = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch('/api/auth/me', { headers })

      if (!response.ok) {
        if (response.status === 401) {
          setUser(null)
          return
        }
        throw new Error('Failed to fetch user info')
      }

      const data = await response.json()
      setUser(data)
    } catch (err) {
      console.error('Error fetching user info:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    // Wait for Clerk to be loaded before fetching user info
    if (isLoaded) {
      fetchUserInfo()
    }
  }, [isLoaded, fetchUserInfo])

  const userRole = user?.role || null

  const can = useCallback(
    (permission: Permission): boolean => {
      if (!userRole) return false
      return hasPermission(userRole, permission)
    },
    [userRole]
  )

  const canAny = useCallback(
    (permissions: Permission[]): boolean => {
      if (!userRole) return false
      return hasAnyPermission(userRole, permissions)
    },
    [userRole]
  )

  const canAll = useCallback(
    (permissions: Permission[]): boolean => {
      if (!userRole) return false
      return hasAllPermissions(userRole, permissions)
    },
    [userRole]
  )

  return {
    user,
    userRole,
    loading,
    error,

    can,
    canAny,
    canAll,

    canViewPayments: () => (userRole ? canViewPayments(userRole) : false),
    canViewFinancial: () => (userRole ? canViewFinancial(userRole) : false),
    canManageTeam: () => (userRole ? canManageTeam(userRole) : false),
    canEditSettings: () => (userRole ? canEditSettings(userRole) : false),
    isAdmin: () => (userRole ? isAdminRole(userRole) : false),

    getRoleName: () => (userRole ? getRoleName(userRole) : ''),
    getRoleDescription: () => (userRole ? getRoleDescription(userRole) : ''),

    refresh: fetchUserInfo
  }
}

// Export a simpler hook just for role checking
export function useUserRole(): { role: UserRole | null; loading: boolean } {
  const { userRole, loading } = usePermissions()
  return { role: userRole, loading }
}
