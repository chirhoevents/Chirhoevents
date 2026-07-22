'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
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
  CreditCard,
  Mail,
  LucideIcon,
} from 'lucide-react'

interface NavItem {
  name: string
  href: string
  icon: LucideIcon
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/demo/dashboard/master-admin', icon: LayoutDashboard },
  { name: 'Organizations', href: '/demo/dashboard/master-admin/organizations', icon: Building2 },
  { name: 'Billing', href: '/demo/dashboard/master-admin/billing', icon: CreditCard },
  { name: 'Pending Requests', href: '/demo/dashboard/master-admin/pending-requests', icon: FileText },
  { name: 'Support Tickets', href: '/demo/dashboard/master-admin/support-tickets', icon: Ticket },
  { name: 'Emails', href: '/demo/dashboard/master-admin/emails', icon: Mail },
  { name: 'Revenue & Analytics', href: '/demo/dashboard/master-admin/revenue', icon: DollarSign },
  { name: 'Platform Settings', href: '/demo/dashboard/master-admin/settings', icon: Settings },
]

const primaryColor = '#0C1726'
const secondaryColor = '#9C8466'

export default function MasterAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: primaryColor, top: '36px' }}
      >
        <div className="flex flex-col h-[calc(100%-36px)]">
          <div className="flex items-center justify-center h-20 lg:h-24 px-4 border-b border-white/10 relative">
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white absolute top-4 right-4"
            >
              <X className="h-6 w-6" />
            </button>
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

          <div className="px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2 text-sm text-white">
              <Shield className="h-4 w-4" style={{ color: secondaryColor }} />
              <span className="font-medium">Master Admin</span>
            </div>
            <p className="text-xs text-white/60 mt-1">ChiRho Platform</p>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-3 text-white rounded-lg transition-colors group ${
                    active ? 'bg-white/15' : 'hover:bg-white/10'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon
                    className="h-5 w-5 mr-3"
                    style={{ color: secondaryColor }}
                  />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>

          <div className="px-6 py-4 border-t border-white/10">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-[#9C8466] text-white flex items-center justify-center text-sm font-semibold">
                M
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Master Admin</p>
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

      <div className="lg:pl-64">
        <header className="bg-white border-b border-[#E5E7EB] sticky top-[36px] z-30">
          <div className="flex items-center justify-between h-16 px-4 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-navy"
            >
              <Menu className="h-6 w-6" />
            </button>

            <div className="hidden lg:block">
              <h2 className="text-lg font-semibold text-navy">Master Admin Portal</h2>
              <p className="text-sm text-[#6B7280]">ChiRho Events Platform</p>
            </div>

            <div className="ml-auto flex items-center gap-4">
              <div className="h-8 w-8 rounded-full bg-[#9C8466] text-white flex items-center justify-center text-sm font-semibold">
                M
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
