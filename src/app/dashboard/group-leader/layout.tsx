'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, UserButton, useClerk } from '@clerk/nextjs'
import Link from 'next/link'
import Image from 'next/image'
import {
  LayoutDashboard,
  CreditCard,
  FileText,
  Users,
  Shield,
  Settings,
  Menu,
  X,
  LogOut
} from 'lucide-react'

interface GroupInfo {
  groupName: string
  eventName: string
}

export default function GroupLeaderLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { userId } = useAuth()
  const { signOut } = useClerk()
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const response = await fetch('/api/group-leader/dashboard')

        if (response.status === 404) {
          // No linked registration - redirect to link page
          router.push('/dashboard/group-leader/link-access-code')
          return
        }

        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data')
        }

        const data = await response.json()
        setGroupInfo({
          groupName: data.groupName,
          eventName: data.eventName,
        })
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
      checkAccess()
    }
  }, [userId, router])

  const navigation = [
    { name: 'Dashboard', href: '/dashboard/group-leader', icon: LayoutDashboard },
    { name: 'Payments', href: '/dashboard/group-leader/payments', icon: CreditCard },
    { name: 'Liability Forms', href: '/dashboard/group-leader/forms', icon: FileText },
    { name: 'Participants', href: '/dashboard/group-leader/participants', icon: Users },
    { name: 'Certificates', href: '/dashboard/group-leader/certificates', icon: Shield },
    { name: 'Settings', href: '/dashboard/group-leader/settings', icon: Settings },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F1E8]">
        <div className="text-[#1E3A5F]">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
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
            <Link href="/" className="flex items-center">
              <Image
                src="/light-logo-horizontal.png"
                alt="ChiRho Events"
                width={200}
                height={50}
                className="h-10 lg:h-14 w-auto"
              />
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Event & Group Info */}
          {groupInfo && (
            <div className="px-6 py-4 border-b border-[#2A4A6F]">
              <p className="text-xs text-[#E8DCC8] mb-1">Event</p>
              <p className="text-sm font-medium text-white truncate">
                {groupInfo.eventName}
              </p>
              <p className="text-xs text-[#E8DCC8] mt-2 mb-1">Group</p>
              <p className="text-sm font-medium text-white truncate">
                {groupInfo.groupName}
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
                  className="text-xs text-[#E8DCC8] hover:text-white cursor-pointer"
                >
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

            {groupInfo && (
              <div className="hidden lg:block">
                <h2 className="text-lg font-semibold text-[#1E3A5F]">
                  {groupInfo.eventName}
                </h2>
                <p className="text-sm text-[#6B7280]">{groupInfo.groupName}</p>
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
