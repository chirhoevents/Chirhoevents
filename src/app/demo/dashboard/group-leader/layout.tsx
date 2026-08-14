'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  CreditCard,
  FileText,
  Users,
  Shield,
  Settings,
  Menu,
  X,
  LogOut,
  Home,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// DEMO: fake linked events
const DEMO_LINKED_EVENTS = [
  {
    id: 'evt-summer-retreat',
    eventName: 'Summer Youth Retreat 2026',
    groupName: "St. Mary's Youth Group",
    eventDates: 'Jul 15 - 18, 2026',
  },
  {
    id: 'evt-diocesan-conference',
    eventName: 'Diocesan Youth Conference',
    groupName: "St. Mary's Youth Group",
    eventDates: 'Oct 3 - 5, 2026',
  },
]

const nav = [
  { name: 'Dashboard', href: '/demo/dashboard/group-leader', icon: LayoutDashboard },
  { name: 'Payments', href: '/demo/dashboard/group-leader/payments', icon: CreditCard },
  { name: 'Liability Forms', href: '/demo/dashboard/group-leader/forms', icon: FileText },
  { name: 'Participants', href: '/demo/dashboard/group-leader/participants', icon: Users },
  { name: 'Certificates', href: '/demo/dashboard/group-leader/certificates', icon: Shield },
  { name: 'Housing', href: '/demo/dashboard/group-leader/housing', icon: Home },
  { name: 'Settings', href: '/demo/dashboard/group-leader/settings', icon: Settings },
]

const primaryColor = '#1E3A5F'
const secondaryColor = '#9C8466'

export default function GroupLeaderLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState(DEMO_LINKED_EVENTS[0].id)
  const currentEvent = DEMO_LINKED_EVENTS.find((e) => e.id === selectedEventId)

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
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

          {/* Event Switcher */}
          <div className="px-4 py-4 border-b space-y-3" style={{ borderColor: `${primaryColor}40` }}>
            <div>
              <p className="text-xs text-[#E8DCC8] mb-2 px-2">Current Event</p>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger className="w-full bg-[#2A4A6F] border-[#3A5A7F] text-white hover:bg-[#3A5A7F]">
                  <SelectValue>
                    {currentEvent ? (
                      <div className="flex flex-col items-start text-left">
                        <span className="font-medium text-sm truncate w-full">
                          {currentEvent.eventName}
                        </span>
                        <span className="text-xs text-[#E8DCC8] truncate w-full">
                          {currentEvent.groupName}
                        </span>
                      </div>
                    ) : (
                      'Select event'
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-[#2A4A6F] border-[#3A5A7F]">
                  {DEMO_LINKED_EVENTS.map((event) => (
                    <SelectItem
                      key={event.id}
                      value={event.id}
                      className="text-white hover:bg-[#3A5A7F] focus:bg-[#3A5A7F] cursor-pointer"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{event.eventName}</span>
                        <span className="text-xs text-[#E8DCC8]">{event.groupName}</span>
                        <span className="text-xs text-[#E8DCC8]">{event.eventDates}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => alert('Demo: Would go to the public event page.')}
              className="w-full bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white text-sm border border-[#3A5A7F]"
              size="sm"
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Go to Event Page
            </Button>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {nav.map((item) => {
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

          <div className="px-6 py-4 border-t" style={{ borderColor: `${primaryColor}40` }}>
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-[#9C8466] text-white flex items-center justify-center text-sm font-semibold">
                D
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Demo Leader</p>
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
              className="lg:hidden"
              style={{ color: primaryColor }}
            >
              <Menu className="h-6 w-6" />
            </button>

            {currentEvent && (
              <div className="hidden lg:block">
                <h2 className="text-lg font-semibold" style={{ color: primaryColor }}>
                  {currentEvent.eventName}
                </h2>
                <p className="text-sm text-[#6B7280]">{currentEvent.groupName}</p>
              </div>
            )}

            <div className="ml-auto flex items-center gap-4">
              <div className="h-8 w-8 rounded-full bg-[#9C8466] text-white flex items-center justify-center text-sm font-semibold">
                D
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
