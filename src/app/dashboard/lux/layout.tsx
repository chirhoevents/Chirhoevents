'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { UserButton, useAuth, useClerk } from '@clerk/nextjs'
import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  Users,
  FolderLock,
  CreditCard,
  Download,
  Settings,
  HelpCircle,
  LifeBuoy,
  Menu,
  X,
  LogOut,
  Plus,
  type LucideIcon,
} from 'lucide-react'
import LuxLogo from '@/components/lux/LuxLogo'
import DashboardSwitcher from '@/components/lux/DashboardSwitcher'
import ImpersonationBanner from '@/components/admin/ImpersonationBanner'
import SubscriptionPausedBanner from '@/components/admin/SubscriptionPausedBanner'
import OverdueInvoicesModal from '@/components/admin/OverdueInvoicesModal'
import { AdminProvider } from '@/contexts/AdminContext'
import { LuxProvider, type LuxInfo } from '@/contexts/LuxContext'
import { getRoleName, type UserRole } from '@/lib/permissions'

interface NavItem {
  name: string
  href: string
  icon: LucideIcon
  external?: boolean
}

const navigation: NavItem[] = [
  { name: 'Home', href: '/dashboard/lux', icon: LayoutDashboard },
  { name: 'Programs & Events', href: '/dashboard/lux/programs', icon: Calendar },
  { name: 'Registrations', href: '/dashboard/lux/registrations', icon: ClipboardList },
  { name: 'Households', href: '/dashboard/lux/households', icon: Users },
  { name: 'Documents', href: '/dashboard/lux/documents', icon: FolderLock },
  { name: 'Payments', href: '/dashboard/lux/payments', icon: CreditCard },
  { name: 'Exports', href: '/dashboard/lux/exports', icon: Download },
  { name: 'Settings', href: '/dashboard/lux/settings', icon: Settings },
]

const helpNavigation: NavItem[] = [
  { name: 'How to use Lux', href: '/docs?section=lux-overview', icon: HelpCircle, external: true },
  { name: 'Support', href: '/dashboard/lux/support', icon: LifeBuoy },
]

export default function LuxLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isLoaded, getToken } = useAuth()
  const { signOut } = useClerk()
  const [info, setInfo] = useState<LuxInfo | null>(null)
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const redirected = useRef(false)

  const loadContext = useCallback(async () => {
    // The session token can lag right after sign-in; retry briefly
    let token = await getToken()
    for (let attempt = 1; !token && attempt <= 5; attempt++) {
      await new Promise(resolve => setTimeout(resolve, attempt * 500))
      token = await getToken()
    }
    if (!token) {
      redirected.current = true
      router.replace('/sign-in')
      return
    }

    let response = await fetch('/api/lux/context', { headers: { Authorization: `Bearer ${token}` } })
    if (response.status === 401) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      const retryToken = await getToken()
      response = await fetch('/api/lux/context', {
        headers: retryToken ? { Authorization: `Bearer ${retryToken}` } : {},
      })
    }

    if (response.status === 401) {
      redirected.current = true
      router.replace('/sign-in')
      return
    }
    if (response.status === 403) {
      const data = await response.json().catch(() => ({}))
      setBlockedMessage(data.error || "Lux isn't available for your account.")
      return
    }
    if (!response.ok) throw new Error(`Lux context failed: ${response.status}`)
    setInfo(await response.json())
    setLoadError(false)
  }, [getToken, router])

  useEffect(() => {
    if (!isLoaded || redirected.current || info) return
    loadContext().catch(err => {
      console.error('[Lux layout]', err)
      setLoadError(true)
    })
  }, [isLoaded, info, loadContext])

  if (blockedMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F3] px-4">
        <div className="max-w-md text-center bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
          <LuxLogo size="lg" />
          <p className="mt-6 text-[#1E3A5F]">{blockedMessage}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/dashboard" className="px-4 py-2 rounded-lg bg-[#1E3A5F] text-white text-sm">Go to my dashboard</Link>
            <button onClick={() => signOut()} className="px-4 py-2 rounded-lg border border-gray-300 text-sm">Sign out</button>
          </div>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F3]">
        <div className="text-center">
          <p className="text-[#1E3A5F] mb-4">We couldn&apos;t load Lux. Please try again.</p>
          <button
            onClick={() => { setLoadError(false); loadContext().catch(() => setLoadError(true)) }}
            className="px-4 py-2 bg-[#1E3A5F] text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!info) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF8F3] gap-4">
        <LuxLogo size="lg" />
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#1E3A5F]" />
      </div>
    )
  }

  const isActive = (href: string) =>
    href === '/dashboard/lux' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = !item.external && isActive(item.href)
    return (
      <Link
        href={item.href}
        target={item.external ? '_blank' : undefined}
        onClick={() => setSidebarOpen(false)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
          active
            ? 'bg-[#1E3A5F] text-white'
            : 'text-[#1E3A5F] hover:bg-[#F5F1E8]'
        }`}
      >
        <item.icon className={`h-5 w-5 ${active ? 'text-[#E8D9A8]' : 'text-[#9C8466]'}`} />
        <span>{item.name}</span>
      </Link>
    )
  }

  return (
    <LuxProvider value={{ info, refresh: loadContext }}>
      <AdminProvider
        value={{
          userRole: info.userRole as UserRole,
          organizationId: info.organizationId,
          organizationName: info.organizationName,
          isImpersonating: info.isImpersonating,
          impersonatedOrgId: info.impersonatedOrgId,
          modulesEnabled: info.modulesEnabled,
          subscriptionTier: info.subscriptionTier,
        }}
      >
        <div className="min-h-screen bg-[#FAF8F3]">
          {/* Always tell a master admin which org they're in */}
          {info.actualRole === 'master_admin' && (
            <ImpersonationBanner
              organizationName={info.organizationName}
              organizationId={info.impersonatedOrgId ?? info.organizationId}
              ownOrganization={!info.isImpersonating}
            />
          )}
          {info.subscriptionStatus === 'suspended' && info.pauseReason && (
            <SubscriptionPausedBanner
              pauseReason={info.pauseReason}
              pauseReasonNote={info.pauseReasonNote}
              pausedAt={info.pausedAt}
            />
          )}
          <OverdueInvoicesModal />

          {sidebarOpen && (
            <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
          )}

          <aside
            className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-[#E8E2D4] transform transition-transform duration-300 lg:translate-x-0 ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="flex flex-col h-full">
              <div className="relative flex items-center justify-center h-20 lg:h-24 px-5 border-b border-[#E8E2D4]">
                <Link href="/dashboard/lux" className="hover:opacity-90 transition-opacity"><LuxLogo size="md" subtitle center /></Link>
                <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-[#1E3A5F] absolute top-4 right-4" aria-label="Close menu">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="px-5 py-4 border-b border-[#E8E2D4] flex items-center gap-3">
                {info.logoUrl && (
                  <img src={info.logoUrl} alt="" className="h-10 w-10 rounded-lg object-contain bg-white border border-gray-100" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1E3A5F] truncate">{info.organizationName}</p>
                  <p className="text-xs text-[#9C8466]">{getRoleName((info.actualRole === 'master_admin' ? 'master_admin' : info.userRole) as UserRole)}</p>
                </div>
              </div>

              <div className="px-4 pt-4">
                {info.canManage && (
                  <Link
                    href="/dashboard/lux/new"
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-lg bg-[#C8A24A] hover:bg-[#B8923A] text-white text-sm font-medium transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Set something up
                  </Link>
                )}
              </div>

              <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                {navigation.map(item => <NavLink key={item.href} item={item} />)}
                <div className="pt-4 mt-4 border-t border-[#E8E2D4] space-y-1">
                  {helpNavigation.map(item => <NavLink key={item.href} item={item} />)}
                </div>
              </nav>

              <div className="px-5 py-4 border-t border-[#E8E2D4] flex items-center gap-3">
                <UserButton afterSignOutUrl="/" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1E3A5F] truncate">{info.userName || 'Account'}</p>
                  <button
                    onClick={() => signOut()}
                    className="text-xs text-gray-500 hover:text-[#1E3A5F] flex items-center gap-1"
                  >
                    <LogOut className="h-3 w-3" />
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </aside>

          <div className="lg:pl-64">
            <header className="bg-white/90 backdrop-blur border-b border-[#E8E2D4] sticky top-0 z-30">
              <div className="flex items-center justify-between h-16 px-4 lg:px-8">
                <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-[#1E3A5F]" aria-label="Open menu">
                  <Menu className="h-6 w-6" />
                </button>
                <div className="hidden lg:block">
                  <h2 className="text-lg font-semibold text-[#1E3A5F]">{info.organizationName}</h2>
                  <p className="text-xs text-gray-500">Lux · {info.tierName} plan</p>
                </div>
                <div className="ml-auto flex items-center gap-4">
                  {info.modulesEnabled.events && <DashboardSwitcher current="lux" />}
                  <UserButton afterSignOutUrl="/" />
                </div>
              </div>
            </header>

            <main className="p-4 lg:p-8 max-w-7xl">{children}</main>
          </div>
        </div>
      </AdminProvider>
    </LuxProvider>
  )
}
