'use client'

import { createContext, useCallback, useContext, ReactNode } from 'react'
import { useAuth } from '@clerk/nextjs'
import { type ModuleAccess } from '@/lib/subscription-tiers'

export interface LuxInfo {
  organizationId: string
  organizationName: string
  logoUrl: string | null
  primaryColor: string
  secondaryColor: string
  userRole: string
  actualRole: string
  userName: string
  email: string
  canManage: boolean
  isImpersonating: boolean
  impersonatedOrgId: string | null
  modulesEnabled: ModuleAccess
  subscriptionTier: string
  tierName: string
  publicSlug: string
  paymentsReady: boolean
  simpleEvents: { limit: number | null; used: number; remaining: number | null; resetsOn: string }
  subscriptionStatus: string
  pauseReason: string | null
  pauseReasonNote: string | null
  pausedAt: string | null
}

interface LuxContextValue {
  info: LuxInfo
  refresh: () => Promise<void>
}

const LuxContext = createContext<LuxContextValue | null>(null)

export function LuxProvider({ value, children }: { value: LuxContextValue; children: ReactNode }) {
  return <LuxContext.Provider value={value}>{children}</LuxContext.Provider>
}

export function useLux(): LuxContextValue {
  const context = useContext(LuxContext)
  if (!context) throw new Error('useLux must be used inside the Lux dashboard')
  return context
}

/**
 * fetch() for Lux staff APIs: attaches the Clerk session token (cookies
 * aren't always ready right after sign-in) and turns error responses into
 * thrown Errors with the API's message.
 */
export function useLuxApi() {
  const { getToken } = useAuth()

  return useCallback(
    async <T = any>(url: string, init: RequestInit & { json?: unknown } = {}): Promise<T> => {
      const token = await getToken()
      const headers: Record<string, string> = { ...(init.headers as Record<string, string> | undefined) }
      if (token) headers.Authorization = `Bearer ${token}`
      let body = init.body
      if (init.json !== undefined) {
        headers['Content-Type'] = 'application/json'
        body = JSON.stringify(init.json)
      }
      const response = await fetch(url, { ...init, headers, body })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error((data as { error?: string }).error || `Request failed (${response.status})`)
      }
      return data as T
    },
    [getToken]
  )
}
