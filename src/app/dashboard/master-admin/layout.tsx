'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserButton, useClerk } from '@clerk/nextjs'
import Link from 'next/link'
import Image from 'next/image'
import {
  LayoutDashboard,
  Building2,
  FileText,
  Ticket,
  DollarSign,
  Settings,
  Menu,
  X,
  LogOut,
  Shield,
  AlertTriangle,
  LucideIcon,
  CreditCard,
  Tag
} from 'lucide-react'

interface UserInfo {
  userName: string
  userEmail: string
}

interface NavItem {
  name: string
  href: string
  icon: LucideIcon
}

// Master Admin navigation items
const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard/master-admin', icon: LayoutDashboard },
  { name: 'Organizations', href: '/dashboard/master-admin/organizations', icon: Building2 },
  { name: 'Billing', href: '/dashboard/master-admin/billing', icon: CreditCard },
  { name: 'Pending Requests', href: '/dashboard/master-admin/pending-requests', icon: FileText },
  { name: 'Support Tickets', href: '/dashboard/master-admin/support-tickets', icon: Ticket },
  { name: 'Revenue & Analytics', href: '/dashboard/master-admin/revenue', icon: DollarSign },
  { name: 'Pricing Management', href: '/dashboard/master-admin/pricing', icon: Tag },
  { name: 'Platform Settings', href: '/dashboard/master-admin/settings', icon: Settings },
]

export default function MasterAdminLayout({
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
        const response = await fetch('/api/master-admin/check-access')

        if (response.status === 403) {
          // Not a master admin - redirect to org admin dashboard
          router.push('/dashboard/admin')
          return
        }

        if (!response.ok) {
          throw new Error('Failed to verify master admin access')
        }

        const data = await response.json()
        setUserInfo({
          userName: data.userName,
          userEmail: data.userEmail,
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-purple-500 animate-pulse" />
          <span className="text-white">Loading Master Admin Portal...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Master Admin Warning Banner */}
      <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-2">
        <div className="flex items-center justify-center gap-2 text-sm font-medium">
          <AlertTriangle className="h-4 w-4" />
          <span>Master Admin Mode - Platform-Wide Access</span>
          <AlertTriangle className="h-4 w-4" />
        </div>
      </div>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          style={{ top: '40px' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-purple-900 to-purple-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ top: '40px' }}
      >
        <div className="flex flex-col h-[calc(100vh-40px)]">
          {/* Logo */}
          <div className="flex items-center justify-between h-20 lg:h-24 px-6 border-b border-purple-700">
            <Link href="/dashboard/master-admin" className="flex items-center">
              <div className="flex items-center gap-2">
                <Shield className="h-8 w-8 text-cyan-400" />
                <div>
                  <span className="text-white font-bold text-lg">ChiRho Events</span>
                  <span className="block text-cyan-400 text-xs font-medium">Master Admin</span>
                </div>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* User Info */}
          {userInfo && (
            <div className="px-6 py-4 border-b border-purple-700">
              <p className="text-xs text-purple-300 mb-1">Logged in as</p>
              <p className="text-sm font-medium text-white truncate">
                {userInfo.userName}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Shield className="h-3 w-3 text-cyan-400" />
                <p className="text-xs text-cyan-400">
                  Platform Owner
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center px-4 py-3 text-white hover:bg-purple-700/50 rounded-lg transition-colors group"
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="h-5 w-5 mr-3 text-cyan-400" />
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>

          {/* User info */}
          <div className="px-6 py-4 border-t border-purple-700">
            <div className="flex items-center space-x-3">
              <UserButton afterSignOutUrl="/" />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Account</p>
                <button
                  onClick={() => signOut()}
                  className="text-xs text-purple-300 hover:text-white cursor-pointer flex items-center gap-1"
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
      <div className="lg:pl-64" style={{ paddingTop: '40px' }}>
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 sticky top-10 z-30">
          <div className="flex items-center justify-between h-16 px-4 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-purple-900"
            >
              <Menu className="h-6 w-6" />
            </button>

            <div className="hidden lg:flex items-center gap-3">
              <Shield className="h-6 w-6 text-purple-600" />
              <div>
                <h2 className="text-lg font-semibold text-purple-900">
                  ChiRho Events - Master Admin
                </h2>
                <p className="text-sm text-gray-600">
                  Platform Management Console
                </p>
              </div>
            </div>

            <div className="ml-auto flex items-center gap-4">
              <Link
                href="/dashboard/admin"
                className="text-sm text-purple-600 hover:text-purple-800 font-medium"
              >
                View as Org Admin
              </Link>
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
