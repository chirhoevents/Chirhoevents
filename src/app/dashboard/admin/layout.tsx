'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { UserButton, useClerk } from '@clerk/nextjs'
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
  LucideIcon
} from 'lucide-react'
import { hasPermission, getRoleName, type Permission, type UserRole } from '@/lib/permissions'
import ImpersonationBanner from '@/components/admin/ImpersonationBanner'

interface UserInfo {
  organizationName: string
  userRole: UserRole
  permissions?: string[]
  logoUrl?: string | null
  modulesEnabled?: {
    poros: boolean
    salve: boolean
    rapha: boolean
  }
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
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const response = await fetch('/api/admin/check-access')

        if (response.status === 403) {
          // Not an admin - redirect appropriately
          router.push('/dashboard/group-leader')
          return
        }

        if (!response.ok) {
          throw new Error('Failed to verify admin access')
        }

        const data = await response.json()
        setUserInfo({
          organizationName: data.organizationName,
          userRole: data.userRole as UserRole,
          permissions: data.permissions,
          logoUrl: data.logoUrl,
          modulesEnabled: data.modulesEnabled,
          isImpersonating: data.isImpersonating || false,
          impersonatedOrgId: data.impersonatedOrgId || null,
        })
      } catch (error) {
        console.error('Error:', error)
        router.push('/')
      } finally {
        setLoading(false)
      }
    }

    checkAccess()
  }, [router])

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

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
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
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#1E3A5F] transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-20 lg:h-24 px-6 border-b border-[#2A4A6F]">
            <Link href="/dashboard/admin" className="flex items-center gap-3">
              {/* Organization Logo (if available) */}
              {userInfo?.logoUrl && (
                <img
                  src={userInfo.logoUrl}
                  alt={userInfo.organizationName}
                  className="h-10 lg:h-12 w-10 lg:w-12 rounded-lg object-cover bg-white"
                />
              )}
              {/* ChiRho Logo */}
              <Image
                src="/light-logo-horizontal.png"
                alt="ChiRho Events"
                width={200}
                height={50}
                className={`${userInfo?.logoUrl ? 'h-8 lg:h-10' : 'h-10 lg:h-14'} w-auto hover:opacity-90 transition-opacity cursor-pointer`}
              />
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Organization Info */}
          {userInfo && (
            <div className="px-6 py-4 border-b border-[#2A4A6F]">
              <p className="text-xs text-[#E8DCC8] mb-1">Organization</p>
              <p className="text-sm font-medium text-white truncate">
                {userInfo.organizationName}
              </p>
              <p className="text-xs text-[#9C8466] mt-1">
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
                <item.icon className="h-5 w-5 mr-3 text-[#9C8466]" />
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>

          {/* User info */}
          <div className="px-6 py-4 border-t border-[#2A4A6F]">
            <div className="flex items-center space-x-3">
              <UserButton afterSignOutUrl="/" />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Account</p>
                <button
                  onClick={() => signOut()}
                  className="text-xs text-[#E8DCC8] hover:text-white cursor-pointer flex items-center gap-1"
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
              className="lg:hidden text-[#1E3A5F]"
            >
              <Menu className="h-6 w-6" />
            </button>

            {userInfo && (
              <div className="hidden lg:block">
                <h2 className="text-lg font-semibold text-[#1E3A5F]">
                  {userInfo.organizationName}
                </h2>
                <p className="text-sm text-[#6B7280]">
                  {getRoleName(userInfo.userRole)} Portal
                </p>
              </div>
            )}

            <div className="ml-auto">
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
