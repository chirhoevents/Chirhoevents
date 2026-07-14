'use client'

import { useState, useMemo } from 'react'
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
import { AdminProvider } from '@/contexts/AdminContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// DEMO: Fake user info — no Clerk, no API, no database.
const DEMO_USER = {
  organizationId: 'demo-org',
  organizationName: 'Steubenville Ministries',
  userRole: 'org_admin' as UserRole,
  permissions: undefined as string[] | undefined,
  logoUrl: null as string | null,
  modulesEnabled: { poros: true, salve: true, rapha: true },
  primaryColor: '#1E3A5F',
  secondaryColor: '#9C8466',
  isImpersonating: false,
  impersonatedOrgId: null as string | null,
}

interface NavItem {
  name: string
  href: string
  icon: LucideIcon
  permission?: Permission
  module?: 'poros' | 'salve' | 'rapha'
}

const allNavigation: NavItem[] = [
  { name: 'Dashboard', href: '/demo/dashboard/admin', icon: LayoutDashboard },
  { name: 'Events', href: '/demo/dashboard/admin/events', icon: Calendar, permission: 'events.view' },
  { name: 'Registrations', href: '/demo/dashboard/admin/registrations', icon: Users, permission: 'registrations.view' },
  { name: 'Virtual Terminal', href: '/demo/dashboard/admin/virtual-terminal', icon: CreditCard, permission: 'payments.process' },
  { name: 'Poros Portal', href: '/demo/dashboard/admin/poros', icon: Home, permission: 'portals.poros.view', module: 'poros' },
  { name: 'SALVE Check-In', href: '/demo/dashboard/admin/salve', icon: CheckSquare, permission: 'portals.salve.view', module: 'salve' },
  { name: 'Rapha Medical', href: '/demo/dashboard/admin/rapha', icon: Activity, permission: 'portals.rapha.view', module: 'rapha' },
  { name: 'Liability Forms', href: '/demo/dashboard/admin/liability-forms', icon: FileText, permission: 'forms.view' },
  { name: 'Reports', href: '/demo/dashboard/admin/reports', icon: BarChart3, permission: 'reports.view' },
  { name: 'Support', href: '/demo/dashboard/admin/support', icon: HelpCircle },
  { name: 'Settings', href: '/demo/dashboard/admin/settings', icon: Settings, permission: 'settings.view' },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const userInfo = DEMO_USER

  const navigation = useMemo(() => {
    return allNavigation.filter(item => {
      if (item.module && userInfo.modulesEnabled) {
        if (!userInfo.modulesEnabled[item.module]) {
          return false
        }
      }
      if (!item.permission) return true
      return hasPermission(userInfo.userRole, item.permission, userInfo.permissions as Permission[] | undefined)
    })
  }, [userInfo])

  const primaryColor = userInfo.primaryColor
  const secondaryColor = userInfo.secondaryColor

  return (
    <div
      className="min-h-screen bg-[#F5F1E8]"
      style={{
        '--org-primary': primaryColor,
        '--org-secondary': secondaryColor,
      } as React.CSSProperties}
    >
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
        style={{ backgroundColor: primaryColor, top: '36px' }}
      >
        <div className="flex flex-col h-[calc(100%-36px)]">
          {/* Logo Header */}
          <div
            className="flex items-center justify-center h-20 lg:h-24 px-4 border-b relative"
            style={{ borderColor: `${primaryColor}40` }}
          >
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white absolute top-4 right-4"
            >
              <X className="h-6 w-6" />
            </button>

            <div className="flex items-center gap-4">
              <Link href="/demo" className="flex items-center hover:opacity-90 transition-opacity">
                <Image
                  src="/light-logo-horizontal.png"
                  alt="ChiRho Events"
                  width={120}
                  height={30}
                  className="h-8 lg:h-9 w-auto object-contain"
                />
              </Link>
            </div>
          </div>

          {/* Organization Name & Role */}
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
              <div className="h-8 w-8 rounded-full bg-[#9C8466] text-white flex items-center justify-center text-sm font-semibold">
                D
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Demo Account</p>
                <Link
                  href="/demo"
                  className="text-xs text-white/70 hover:text-white cursor-pointer flex items-center gap-1"
                >
                  <LogOut className="h-3 w-3" />
                  Exit demo
                </Link>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="bg-white border-b border-[#E5E7EB] sticky top-[36px] z-30">
          <div className="flex items-center justify-between h-16 px-4 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden"
              style={{ color: primaryColor }}
            >
              <Menu className="h-6 w-6" />
            </button>

            <div className="hidden lg:block">
              <h2 className="text-lg font-semibold" style={{ color: primaryColor }}>
                {userInfo.organizationName}
              </h2>
              <p className="text-sm text-[#6B7280]">
                {getRoleName(userInfo.userRole)} Portal
              </p>
            </div>

            <div className="ml-auto flex items-center gap-4">
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
                      href="/demo/dashboard/admin/support"
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

              <div className="h-8 w-8 rounded-full bg-[#9C8466] text-white flex items-center justify-center text-sm font-semibold">
                D
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          <AdminProvider
            value={{
              userRole: userInfo.userRole,
              organizationId: userInfo.organizationId,
              organizationName: userInfo.organizationName,
              isImpersonating: false,
              impersonatedOrgId: null,
            }}
          >
            {children}
          </AdminProvider>
        </main>
      </div>
    </div>
  )
}
