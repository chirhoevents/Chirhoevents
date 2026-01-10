'use client'

import { createContext, useContext, ReactNode } from 'react'
import { type UserRole } from '@/lib/permissions'

interface AdminContextValue {
  userRole: UserRole | null
  organizationId: string | null
  organizationName: string | null
  isImpersonating: boolean
  impersonatedOrgId: string | null
}

const AdminContext = createContext<AdminContextValue | null>(null)

interface AdminProviderProps {
  children: ReactNode
  value: AdminContextValue
}

export function AdminProvider({ children, value }: AdminProviderProps) {
  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdminContext(): AdminContextValue {
  const context = useContext(AdminContext)
  if (!context) {
    // Return safe defaults if used outside of AdminProvider
    return {
      userRole: null,
      organizationId: null,
      organizationName: null,
      isImpersonating: false,
      impersonatedOrgId: null,
    }
  }
  return context
}
