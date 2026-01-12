'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { UserButton, useClerk, useAuth } from '@clerk/nextjs'
import Link from 'next/link'
import Image from 'next/image'
import {
  LayoutDashboard,
  Calendar,
  Users,
  Home,
  CheckSquare,
  Activity,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
  CreditCard,
  HelpCircle,
  FileText,
  LucideIcon,
  Plus,
  Ticket,
} from 'lucide-react'
import { hasPermission, getRoleName, type Permission, type UserRole } from '@/lib/permissions'
import ImpersonationBanner from '@/components/admin/ImpersonationBanner'
import { AdminProvider } from '@/contexts/AdminContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface UserInfo {
  organizationId: string
  organizationName: string
  userRole: UserRole
  permissions?: string[]
  logoUrl?: string | null
  modulesEnabled?: {
    poros: boolean
    salve: boolean
    rapha: boolean
  }
  primaryColor?: string
  secondaryColor?: string
  isImpersonating?: boolean
  impersonatedOrgId?: string | null
}

interface NavItem {
  name: string
  href: string
  icon: LucideIcon
  permission?: Permission
  module?: 'poros' | 'salve' | 'rapha'
}

// Define all navigation items with their required permissions and modules
const allNavigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard/admin', icon: LayoutDashboard },
  { name: 'Events', href: '/dashboard/admin/events', icon: Calendar, permission: 'events.view' },
  { name: 'Registrations', href: '/dashboard/admin/registrations', icon: Users, permission: 'registrations.view' },
  { name: 'Virtual Terminal', href: '/dashboard/admin/virtual-terminal', icon: CreditCard, permission: 'payments.process' },
  { name: 'Poros Portal', href: '/dashboard/admin/poros', icon: Home, permission: 'portals.poros.view', module: 'poros' },
  { name: 'SALVE Check-In', href: '/dashboard/admin/salve', icon: CheckSquare, permission: 'portals.salve.view', module: 'salve' },
  { name: 'Rapha Medical', href: '/dashboard/admin/rapha', icon: Activity, permission: 'portals.rapha.view', module: 'rapha' },
  { name: 'Liability Forms', href: '/dashboard/admin/liability-forms', icon: FileText, permission: 'forms.view' },
  { name: 'Reports', href: '/dashboard/admin/reports', icon: BarChart3, permission: 'reports.view' },
  { name: 'Support', href: '/dashboard/admin/support', icon: HelpCircle },
  { name: 'Settings', href: '/dashboard/admin/settings', icon: Settings, permission: 'settings.view' },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { signOut } = useClerk()
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const hasRedirected = useRef(false)

  useEffect(() => {
    console.log('🔍 [Admin Layout] useEffect triggered')
    console.log('🔍 [Admin Layout] hasRedirected:', hasRedirected.current)
    console.log('🔍 [Admin Layout] authChecked:', authChecked)
    console.log('🔍 [Admin Layout] isLoaded:', isLoaded)

    // Prevent multiple redirect attempts
    if (hasRedirected.current) {
      console.log('⚠️ [Admin Layout] Already redirected, skipping')
      return
    }
    // Prevent infinite loop - only check auth once
    if (authChecked) {
      console.log('⚠️ [Admin Layout] Auth already checked, skipping')
      return
    }
    if (!isLoaded) {
      console.log('⚠️ [Admin Layout] Clerk not loaded yet, waiting...')
      return
    }

    const checkAccess = async () => {
      console.log('🔐 [Admin Layout] Starting auth check...')
      try {
        // Get token - may need to wait for it after page reload or during navigation
        let token = await getToken()
        console.log('🔐 [Admin Layout] Initial token:', token ? 'YES' : 'NO')
        let attempts = 0
        const maxAttempts = 5

        // Keep trying with increasing delays until we get a token
        while (!token && attempts < maxAttempts) {
          attempts++
          const delay = attempts * 500
          console.log(`🔐 [Admin Layout] Token retry ${attempts}/${maxAttempts}...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          token = await getToken()
        }

        if (!token) {
          console.log('❌ [Admin Layout] No token after retries, redirecting to sign-in')
          hasRedirected.current = true
          router.replace('/sign-in')
          return
        }

        console.log('🔐 [Admin Layout] Calling /api/admin/check-access...')
        const response = await fetch('/api/admin/check-access', {
          headers: { 'Authorization': `Bearer ${token}` },
        })
        console.log('🔐 [Admin Layout] API response status:', response.status)

        if (response.status === 403) {
          // Not an admin - redirect appropriately
          console.log('❌ [Admin Layout] 403 Forbidden - redirecting to group-leader')
          hasRedirected.current = true
          router.replace('/dashboard/group-leader')
          return
        }

        if (response.status === 401) {
          // Unauthorized - might be a timing issue, wait and retry once
          console.log('⚠️ [Admin Layout] Got 401, waiting and retrying...')
          await new Promise(resolve => setTimeout(resolve, 1000))
          const retryToken = await getToken()
          const retryResponse = await fetch('/api/admin/check-access', {
            headers: retryToken ? { 'Authorization': `Bearer ${retryToken}` } : {},
          })

          if (retryResponse.status === 403) {
            hasRedirected.current = true
            router.replace('/dashboard/group-leader')
            return
          }

          if (!retryResponse.ok) {
            throw new Error('Failed to verify admin access after retry')
          }

          const retryData = await retryResponse.json()
          setUserInfo({
            organizationId: retryData.organizationId,
            organizationName: retryData.organizationName,
            userRole: retryData.userRole as UserRole,
            permissions: retryData.permissions,
            logoUrl: retryData.logoUrl,
            modulesEnabled: retryData.modulesEnabled,
            primaryColor: retryData.primaryColor || '#1E3A5F',
            secondaryColor: retryData.secondaryColor || '#9C8466',
            isImpersonating: retryData.isImpersonating || false,
            impersonatedOrgId: retryData.impersonatedOrgId || null,
          })
          setLoading(false)
          return
        }

        if (!response.ok) {
          console.log('❌ [Admin Layout] Response not OK:', response.status)
          throw new Error(`Failed to verify admin access: ${response.status}`)
        }

        const data = await response.json()
        console.log('✅ [Admin Layout] Auth successful!')
        console.log('✅ [Admin Layout] User:', data.email, '| Role:', data.userRole)
        console.log('✅ [Admin Layout] Org:', data.organizationName)
        setUserInfo({
          organizationId: data.organizationId,
          organizationName: data.organizationName,
          userRole: data.userRole as UserRole,
          permissions: data.permissions,
          logoUrl: data.logoUrl,
          modulesEnabled: data.modulesEnabled,
          primaryColor: data.primaryColor || '#1E3A5F',
          secondaryColor: data.secondaryColor || '#9C8466',
          isImpersonating: data.isImpersonating || false,
          impersonatedOrgId: data.impersonatedOrgId || null,
        })
      } catch (error) {
        console.error('💥 [Admin Layout] Error in checkAccess:', error)
        // Don't redirect to home on network/transient errors - stay on page and let user retry
        // Only redirect if we know for sure the user shouldn't be here (403, 401 handled above)
        console.log('⚠️ [Admin Layout] Error occurred, showing error state for retry')
        setAuthError(true)
        setUserInfo(null)
      } finally {
        setLoading(false)
        setAuthChecked(true)  // Mark as checked to prevent infinite loop
      }
    }

    checkAccess()
  }, [isLoaded, authChecked, router])  // Removed getToken to prevent infinite re-renders

  // Filter navigation based on user permissions and enabled modules
  const navigation = useMemo(() => {
    if (!userInfo) return []

    return allNavigation.filter(item => {
      // Check if module is enabled (if module is specified)
      if (item.module && userInfo.modulesEnabled) {
        if (!userInfo.modulesEnabled[item.module]) {
          return false
        }
      }

      // Dashboard and non-permission items are always visible
      if (!item.permission) return true

      // Check if user has the required permission
      return hasPermission(userInfo.userRole, item.permission, userInfo.permissions as Permission[] | undefined)
    })
  }, [userInfo])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F1E8]">
        <div className="text-[#1E3A5F]">Loading admin portal...</div>
      </div>
    )
  }

  // Show error state with retry option instead of redirecting to home
  if (authError && !userInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F1E8]">
        <div className="text-center">
          <p className="text-[#1E3A5F] mb-4">Unable to load admin portal. Please try again.</p>
          <button
            onClick={() => {
              setAuthError(false)
              setAuthChecked(false)
              setLoading(true)
            }}
            className="px-4 py-2 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#1E3A5F]/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Get brand colors with fallbacks
  const primaryColor = userInfo?.primaryColor || '#1E3A5F'
  const secondaryColor = userInfo?.secondaryColor || '#9C8466'

  return (
    <div
      className="min-h-screen bg-[#F5F1E8]"
      style={{
        '--org-primary': primaryColor,
        '--org-secondary': secondaryColor,
      } as React.CSSProperties}
    >
      {/* Impersonation Banner */}
      {userInfo?.isImpersonating && userInfo?.impersonatedOrgId && (
        <ImpersonationBanner
          organizationName={userInfo.organizationName}
          organizationId={userInfo.impersonatedOrgId}
        />
      )}

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: primaryColor }}
      >
        <div className="flex flex-col h-full">
          {/* Logo Header - Side by Side, Centered */}
          <div
            className="flex items-center justify-center h-20 lg:h-24 px-4 border-b relative"
            style={{ borderColor: `${primaryColor}40` }}
          >
            {/* Mobile close button - absolute positioned */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white absolute top-4 right-4"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Logos centered together */}
            <div className="flex items-center gap-4">
              {/* ChiRho Logo */}
              <Link href="/" className="flex items-center hover:opacity-90 transition-opacity">
                <Image
                  src="/light-logo-horizontal.png"
                  alt="ChiRho Events"
                  width={120}
                  height={30}
                  className="h-8 lg:h-9 w-auto object-contain"
                />
              </Link>

              {/* Vertical Divider + Organization Logo */}
              {userInfo?.logoUrl && (
                <>
                  <div className="w-px h-10 bg-white/30" />
                  <Link href="/dashboard/admin">
                    <div className="w-12 h-12 lg:w-14 lg:h-14 bg-white rounded-lg flex items-center justify-center p-1 hover:shadow-lg transition-shadow">
                      <img
                        src={userInfo.logoUrl}
                        alt={userInfo.organizationName}
                        className="w-full h-full object-contain rounded"
                      />
                    </div>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Organization Name & Role */}
          {userInfo && (
            <div
              className="px-4 py-3 border-b"
              style={{ borderColor: `${primaryColor}40` }}
            >
              <p className="text-sm font-medium text-white truncate">
                {userInfo.organizationName}
              </p>
              <p className="text-xs" style={{ color: secondaryColor }}>
                {getRoleName(userInfo.userRole)}
              </p>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center px-4 py-3 text-white hover:bg-white/10 rounded-lg transition-colors group"
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon
                  className="h-5 w-5 mr-3"
                  style={{ color: secondaryColor }}
                />
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>

          {/* User info */}
          <div
            className="px-6 py-4 border-t"
            style={{ borderColor: `${primaryColor}40` }}
          >
            <div className="flex items-center space-x-3">
              <UserButton afterSignOutUrl="/" />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Account</p>
                <button
                  onClick={() => signOut()}
                  className="text-xs text-white/70 hover:text-white cursor-pointer flex items-center gap-1"
                >
                  <LogOut className="h-3 w-3" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-30">
          <div className="flex items-center justify-between h-16 px-4 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden"
              style={{ color: primaryColor }}
            >
              <Menu className="h-6 w-6" />
            </button>

            {userInfo && (
              <div className="hidden lg:block">
                <h2 className="text-lg font-semibold" style={{ color: primaryColor }}>
                  {userInfo.organizationName}
                </h2>
                <p className="text-sm text-[#6B7280]">
                  {getRoleName(userInfo.userRole)} Portal
                </p>
              </div>
            )}

            <div className="ml-auto flex items-center gap-4">
              {/* Quick Actions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center justify-center h-9 w-9 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    style={{ borderColor: `${primaryColor}30` }}
                    title="Quick Actions"
                  >
                    <Plus className="h-5 w-5" style={{ color: primaryColor }} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link
                      href="/dashboard/admin/support?new=true"
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Ticket className="h-4 w-4" />
                      <div>
                        <p className="font-medium">Open Support Ticket</p>
                        <p className="text-xs text-gray-500">Get help from our team</p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Show org logo in top bar on desktop if they have one */}
              {userInfo?.logoUrl && (
                <img
                  src={userInfo.logoUrl}
                  alt={userInfo.organizationName}
                  className="hidden lg:block h-8 w-8 rounded-lg object-cover"
                />
              )}
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          <AdminProvider
            value={{
              userRole: userInfo?.userRole || null,
              organizationId: userInfo?.organizationId || null,
              organizationName: userInfo?.organizationName || null,
              isImpersonating: userInfo?.isImpersonating || false,
              impersonatedOrgId: userInfo?.impersonatedOrgId || null,
            }}
          >
            {children}
          </AdminProvider>
        </main>
      </div>
    </div>
  )
}
