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
  LogOut,
  Plus,
  ChevronDown,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

interface LinkedEvent {
  id: string
  accessCode: string
  eventName: string
  eventDates: string
  groupName: string
}

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
  const [linkedEvents, setLinkedEvents] = useState<LinkedEvent[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showAddCode, setShowAddCode] = useState(false)
  const [newAccessCode, setNewAccessCode] = useState('')
  const [addingCode, setAddingCode] = useState(false)
  const [addCodeError, setAddCodeError] = useState('')

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const response = await fetch('/api/group-leader/settings')

        if (response.status === 404) {
          // No linked registration - redirect to link page
          router.push('/dashboard/group-leader/link-access-code')
          return
        }

        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data')
        }

        const data = await response.json()
        setLinkedEvents(data.linkedEvents || [])

        // Set first event as selected if not already set
        if (data.linkedEvents && data.linkedEvents.length > 0) {
          const firstEvent = data.linkedEvents[0]
          setSelectedEventId(firstEvent.id)
          setGroupInfo({
            groupName: firstEvent.groupName,
            eventName: firstEvent.eventName,
          })
        }
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

  // Update groupInfo when selectedEventId changes
  useEffect(() => {
    const selectedEvent = linkedEvents.find((e) => e.id === selectedEventId)
    if (selectedEvent) {
      setGroupInfo({
        groupName: selectedEvent.groupName,
        eventName: selectedEvent.eventName,
      })
    }
  }, [selectedEventId, linkedEvents])

  const handleAddCode = async () => {
    if (!newAccessCode.trim()) {
      setAddCodeError('Please enter an access code')
      return
    }

    setAddingCode(true)
    setAddCodeError('')

    try {
      const response = await fetch('/api/group-leader/settings/link-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode: newAccessCode.trim() }),
      })

      const data = await response.json()

      if (response.ok) {
        // Refresh the linked events
        const refreshResponse = await fetch('/api/group-leader/settings')
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json()
          setLinkedEvents(refreshData.linkedEvents || [])

          // Select the newly added event
          if (data.registration) {
            setSelectedEventId(data.registration.id)
          }
        }

        setNewAccessCode('')
        setShowAddCode(false)
        alert('Access code linked successfully!')
      } else {
        setAddCodeError(data.error || 'Failed to link access code')
      }
    } catch (error) {
      console.error('Error linking code:', error)
      setAddCodeError('Failed to link access code')
    } finally {
      setAddingCode(false)
    }
  }

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
            <Link href="/dashboard/group-leader" className="flex items-center">
              <Image
                src="/light-logo-horizontal.png"
                alt="ChiRho Events"
                width={200}
                height={50}
                className="h-10 lg:h-14 w-auto hover:opacity-90 transition-opacity cursor-pointer"
              />
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Event Switcher & Add Code */}
          <div className="px-4 py-4 border-b border-[#2A4A6F] space-y-3">
            {linkedEvents.length > 0 && (
              <>
                <div>
                  <p className="text-xs text-[#E8DCC8] mb-2 px-2">Current Event</p>
                  <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                    <SelectTrigger className="w-full bg-[#2A4A6F] border-[#3A5A7F] text-white hover:bg-[#3A5A7F]">
                      <SelectValue>
                        {groupInfo ? (
                          <div className="flex flex-col items-start text-left">
                            <span className="font-medium text-sm truncate w-full">
                              {groupInfo.eventName}
                            </span>
                            <span className="text-xs text-[#E8DCC8] truncate w-full">
                              {groupInfo.groupName}
                            </span>
                          </div>
                        ) : (
                          'Select event'
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-[#2A4A6F] border-[#3A5A7F]">
                      {linkedEvents.map((event) => (
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
                  onClick={() => setShowAddCode(true)}
                  className="w-full bg-[#9C8466] hover:bg-[#8B7355] text-white text-sm"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Code
                </Button>

                {showAddCode && (
                  <div className="bg-[#2A4A6F] rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-white">Enter Access Code</p>
                      <button
                        onClick={() => {
                          setShowAddCode(false)
                          setNewAccessCode('')
                          setAddCodeError('')
                        }}
                        className="text-[#E8DCC8] hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <Input
                      value={newAccessCode}
                      onChange={(e) => {
                        setNewAccessCode(e.target.value.toUpperCase())
                        setAddCodeError('')
                      }}
                      placeholder="ABC-XYZ-123"
                      className="bg-[#1E3A5F] border-[#3A5A7F] text-white placeholder:text-[#6B7280]"
                      disabled={addingCode}
                    />
                    {addCodeError && (
                      <p className="text-xs text-red-400">{addCodeError}</p>
                    )}
                    <Button
                      onClick={handleAddCode}
                      disabled={addingCode}
                      className="w-full bg-[#9C8466] hover:bg-[#8B7355] text-white text-sm"
                      size="sm"
                    >
                      {addingCode ? 'Linking...' : 'Link Code'}
                    </Button>
                  </div>
                )}
              </>
            )}
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
